/**
 * Multi-document storage (CVs and cover letters) in localStorage. Browser only;
 * nothing here leaves the device.
 *
 * Keys:
 *   DOCS_INDEX_KEY        – DocMeta[] (names and timestamps, used for listing)
 *   DOC_KEY(id)           – { schemaVersion, savedAt, kind, name, createdAt, data } for one
 *                           document (name and createdAt mirror the index so a rebuilt
 *                           index keeps them)
 *   ACTIVE_DOC_KEY        – id of the document the builder opens
 *   CORRUPT_DOC_KEY(id)   – raw contents of a document that could not be read, kept so
 *                           it is not silently destroyed
 *
 * Every access is wrapped: storage can be disabled, full or contain corrupted data.
 * The index heals itself: a corrupted index is rebuilt from the stored documents, and
 * documents missing from the index (e.g. after a race between two tabs) are added back.
 */

import { CV_SCHEMA_VERSION, createId, isCVEmpty, isValidId, type CVData, type Language } from "./cv-schema";
import { parseDocumentValue } from "./cv-validation";
import { LETTER_SCHEMA_VERSION, letterIsEmpty, type LetterData } from "./letter-schema";
import { fileSafeName, pdfFileName } from "./pdf";
import {
  BACKUP_KEY,
  CORRUPT_KEY,
  DRAFT_KEY,
  STORAGE_PREFIX,
  UI_LANG_KEY,
  getStorage,
  isQuotaError,
  readStoredCV,
  type SaveResult,
} from "./storage";

export type DocKind = "cv" | "letter";
export type AnyDoc = { kind: "cv"; data: CVData } | { kind: "letter"; data: LetterData };

export interface DocMeta {
  id: string;
  kind: DocKind;
  name: string;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/** What DOC_KEY(id) holds. */
export interface StoredDoc {
  schemaVersion: number;
  savedAt: string;
  kind: DocKind;
  /**
   * Copies of the index entry's name and creation time, so a rebuilt index keeps them.
   * Optional: documents written before they were added lack them.
   */
  name?: string;
  createdAt?: string;
  data: CVData | LetterData;
}

export type CreateDocResult = { ok: true; meta: DocMeta } | { ok: false; reason: "unavailable" | "quota" };

export type LoadDocResult =
  | {
      status: "ok";
      doc: AnyDoc;
      meta: DocMeta;
      /**
       * When the stored copy was written (null when it doesn't say). The builder keeps it
       * to notice when another tab or window has saved the document since.
       */
      savedAt: string | null;
    }
  | { status: "missing" }
  | { status: "corrupted" }
  | { status: "unavailable" };

export const DOCS_INDEX_KEY = `${STORAGE_PREFIX}docs`;
const DOC_KEY_PREFIX = `${STORAGE_PREFIX}doc:`;
export const DOC_KEY = (id: string) => `${DOC_KEY_PREFIX}${id}`;
export const ACTIVE_DOC_KEY = `${STORAGE_PREFIX}active`;
export const CORRUPT_DOC_KEY = (id: string) => `${CORRUPT_KEY}:${id}`;
/** Where a corrupted legacy draft goes when CORRUPT_KEY already holds older corrupted data. */
export const CORRUPT_DRAFT_KEY = `${CORRUPT_KEY}:draft`;
/** Where a corrupted legacy backup goes when CORRUPT_KEY is already taken. */
export const CORRUPT_BACKUP_KEY = `${CORRUPT_KEY}:backup`;
export const MAX_DOC_NAME = 120;

const DOC_KINDS: readonly DocKind[] = ["cv", "letter"];

/* ---------------- naming ---------------- */

/** The language a document is written in (CV language or letter language). */
export function docLanguage(doc: AnyDoc): Language {
  return doc.kind === "cv" ? doc.data.meta.cvLanguage : doc.data.meta.language;
}

export function isDocEmpty(doc: AnyDoc): boolean {
  return doc.kind === "cv" ? isCVEmpty(doc.data) : letterIsEmpty(doc.data);
}

/**
 * CV: the full name, or "Untitled CV" / "CV tanpa judul".
 * Letter: "Cover letter" / "Surat lamaran", plus " – Company" when a recipient company is set.
 */
export function defaultDocName(doc: AnyDoc, lang: Language): string {
  if (doc.kind === "cv") {
    const name = doc.data.personal.fullName.trim();
    return clean(name) || (lang === "id" ? "CV tanpa judul" : "Untitled CV");
  }
  const base = lang === "id" ? "Surat lamaran" : "Cover letter";
  const company = doc.data.recipient.company.trim();
  return clean(company ? `${base} – ${company}` : base);
}

/** File name without extension: "Jane_Doe_CV" / "Jane_Doe_Cover_Letter" ("CV" / "Cover_Letter" without a name). */
export function docFileBase(doc: AnyDoc): string {
  if (doc.kind === "cv") return pdfFileName(doc.data);
  const name = fileSafeName(doc.data.sender.fullName);
  return name ? `${name}_Cover_Letter` : "Cover_Letter";
}

function clean(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_DOC_NAME).trim();
}

/* ---------------- index ---------------- */

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isTimestamp = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));

/**
 * A valid index entry, or null. Entries without a usable name are dropped too; when their
 * document is still stored, readIndex lists it again from the stored copy.
 */
function sanitizeMeta(v: unknown): DocMeta | null {
  if (!isObject(v)) return null;
  if (!isValidId(v.id)) return null;
  if (typeof v.kind !== "string" || !(DOC_KINDS as readonly string[]).includes(v.kind)) return null;
  const name = typeof v.name === "string" ? clean(v.name) : "";
  if (!name) return null;
  return {
    id: v.id,
    kind: v.kind as DocKind,
    name,
    createdAt: typeof v.createdAt === "string" ? v.createdAt : "",
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : "",
  };
}

interface ParsedStored {
  doc: AnyDoc;
  savedAt: string | null;
  /** Name and creation time stored with the document ("" / null when absent or invalid). */
  name?: string;
  createdAt?: string | null;
}

/** Parses a stored document payload; null when it cannot be read. */
function parseStored(raw: string): ParsedStored | null {
  try {
    const value: unknown = JSON.parse(raw);
    const result = parseDocumentValue(value);
    if (!result.ok || !isObject(value)) return null;
    return {
      doc: result.doc,
      savedAt: typeof value.savedAt === "string" ? value.savedAt : null,
      name: typeof value.name === "string" ? clean(value.name) : "",
      createdAt: isTimestamp(value.createdAt) ? value.createdAt : null,
    };
  } catch {
    return null;
  }
}

/** Index entry for a stored document: its stored name and creation time when valid, else defaults. */
function metaFromStored(id: string, stored: ParsedStored): DocMeta {
  const { doc } = stored;
  const at = stored.savedAt ?? new Date().toISOString();
  return {
    id,
    kind: doc.kind,
    name: stored.name || defaultDocName(doc, docLanguage(doc)),
    createdAt: stored.createdAt ?? at,
    updatedAt: at,
  };
}

function writeIndex(storage: Storage, metas: DocMeta[]): void {
  storage.setItem(DOCS_INDEX_KEY, JSON.stringify(metas));
}

/**
 * Reads the index. A corrupted index is rebuilt from the stored documents, and readable
 * documents that are missing from the index are added back (best effort write-back).
 * May throw when storage access itself fails.
 */
function readIndex(storage: Storage, ignoreId?: string): DocMeta[] {
  const raw = storage.getItem(DOCS_INDEX_KEY);
  let metas: DocMeta[] = [];
  let dirty = false;
  if (raw !== null) {
    try {
      const value: unknown = JSON.parse(raw);
      if (!Array.isArray(value)) throw new Error("index is not a list");
      const seen = new Set<string>();
      for (const entry of value) {
        const meta = sanitizeMeta(entry);
        if (meta && !seen.has(meta.id)) {
          seen.add(meta.id);
          metas.push(meta);
        }
      }
    } catch {
      metas = [];
      dirty = true;
    }
  }

  const known = new Set(metas.map((m) => m.id));
  const orphans: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith(DOC_KEY_PREFIX)) continue;
    const id = key.slice(DOC_KEY_PREFIX.length);
    if (isValidId(id) && id !== ignoreId && !known.has(id)) orphans.push(id);
  }
  for (const id of orphans) {
    const stored = storage.getItem(DOC_KEY(id));
    if (stored === null) continue;
    const parsed = parseStored(stored);
    if (!parsed) {
      // Unreadable and unlisted: set it aside like any corrupted document.
      try {
        storage.setItem(CORRUPT_DOC_KEY(id), stored);
        storage.removeItem(DOC_KEY(id));
      } catch {
        /* ignore */
      }
      continue;
    }
    metas.push(metaFromStored(id, parsed));
    dirty = true;
  }

  if (dirty) {
    try {
      writeIndex(storage, metas);
    } catch {
      /* best effort; the next read tries again */
    }
  }
  return metas;
}

function byNewest(a: DocMeta, b: DocMeta): number {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.name.localeCompare(b.name);
}

/** All documents, most recently updated first; [] when storage is unavailable. */
export function listDocs(): DocMeta[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    return readIndex(storage).sort(byNewest);
  } catch {
    return [];
  }
}

/* ---------------- documents ---------------- */

/** What DOC_KEY(id) stores; `meta` (when known) supplies the name and creation time kept with it. */
function payload(doc: AnyDoc, savedAt: string, meta?: Pick<DocMeta, "name" | "createdAt">): string {
  const stored: StoredDoc = {
    schemaVersion: doc.kind === "cv" ? CV_SCHEMA_VERSION : LETTER_SCHEMA_VERSION,
    savedAt,
    kind: doc.kind,
    ...(meta?.name ? { name: meta.name } : {}),
    ...(meta && isTimestamp(meta.createdAt) ? { createdAt: meta.createdAt } : {}),
    data: doc.data,
  };
  return JSON.stringify(stored);
}

function failure(e: unknown): { ok: false; reason: "unavailable" | "quota" } {
  return { ok: false, reason: isQuotaError(e) ? "quota" : "unavailable" };
}

export function loadDoc(id: string): LoadDocResult {
  const storage = getStorage();
  if (!storage) return { status: "unavailable" };
  if (!isValidId(id)) return { status: "missing" };
  let raw: string | null;
  let index: DocMeta[];
  try {
    raw = storage.getItem(DOC_KEY(id));
    index = readIndex(storage);
  } catch {
    return { status: "unavailable" };
  }

  if (raw === null) {
    // Drop a stale index entry so the document stops showing up in the list.
    if (index.some((m) => m.id === id)) {
      try {
        writeIndex(storage, index.filter((m) => m.id !== id));
      } catch {
        /* ignore */
      }
    }
    return { status: "missing" };
  }

  const parsed = parseStored(raw);
  if (!parsed) {
    // Keep the unreadable data aside instead of overwriting it on the next autosave.
    try {
      storage.setItem(CORRUPT_DOC_KEY(id), raw);
      storage.removeItem(DOC_KEY(id));
      writeIndex(storage, index.filter((m) => m.id !== id));
      if (storage.getItem(ACTIVE_DOC_KEY) === id) storage.removeItem(ACTIVE_DOC_KEY);
    } catch {
      /* ignore */
    }
    return { status: "corrupted" };
  }

  let meta = index.find((m) => m.id === id);
  if (!meta || meta.kind !== parsed.doc.kind) {
    meta = meta ? { ...meta, kind: parsed.doc.kind } : metaFromStored(id, parsed);
    const next = [...index.filter((m) => m.id !== id), meta];
    try {
      writeIndex(storage, next);
    } catch {
      /* ignore */
    }
  }
  return { status: "ok", doc: parsed.doc, meta, savedAt: parsed.savedAt };
}

/**
 * The `savedAt` of a document's stored copy, read without checking the rest of it: null
 * when the copy doesn't have one, undefined when nothing is stored under the id (or
 * storage can't be read). Comparing it with the value from the last load or save tells
 * whether another tab or window has saved the document in the meantime.
 */
export function storedSavedAt(id: string): string | null | undefined {
  const storage = getStorage();
  if (!storage || !isValidId(id)) return undefined;
  let raw: string | null;
  try {
    raw = storage.getItem(DOC_KEY(id));
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    return isObject(value) && typeof value.savedAt === "string" ? value.savedAt : null;
  } catch {
    return null;
  }
}

/**
 * Saves the document and updates `updatedAt` in the index. If the document is not in the
 * index (e.g. it was deleted in another tab), it is added back rather than lost, so cancel
 * pending autosaves before calling deleteDoc.
 */
export function saveDoc(id: string, doc: AnyDoc): SaveResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: "unavailable" };
  if (!isValidId(id)) return { ok: false, reason: "unavailable" };
  const savedAt = new Date().toISOString();
  // Read the index first so the stored copy keeps the document's name and creation time.
  let index: DocMeta[] | null;
  try {
    index = readIndex(storage);
  } catch {
    index = null;
  }
  const i = index ? index.findIndex((m) => m.id === id) : -1;
  const meta: DocMeta =
    index && i >= 0 ? { ...index[i], kind: doc.kind, updatedAt: savedAt } : metaFromStored(id, { doc, savedAt });
  try {
    storage.setItem(DOC_KEY(id), payload(doc, savedAt, index ? meta : undefined));
  } catch (e) {
    return failure(e);
  }
  if (index) {
    try {
      if (i >= 0) index[i] = meta;
      else index.push(meta);
      writeIndex(storage, index);
    } catch {
      /* the document itself is saved; a missing index entry is restored on the next read */
    }
  }
  return { ok: true, savedAt };
}

function insertDoc(
  storage: Storage,
  doc: AnyDoc,
  name: string,
  timestamps?: { createdAt: string; updatedAt: string },
): CreateDocResult {
  let id = createId();
  try {
    while (storage.getItem(DOC_KEY(id)) !== null) id = createId();
  } catch (e) {
    return failure(e);
  }
  const now = new Date().toISOString();
  const createdAt = timestamps?.createdAt ?? now;
  const updatedAt = timestamps?.updatedAt ?? now;
  const meta: DocMeta = {
    id,
    kind: doc.kind,
    name: clean(name) || defaultDocName(doc, docLanguage(doc)),
    createdAt,
    updatedAt,
  };
  try {
    storage.setItem(DOC_KEY(id), payload(doc, updatedAt, meta));
  } catch (e) {
    return failure(e);
  }
  try {
    const index = readIndex(storage, id).filter((m) => m.id !== id);
    writeIndex(storage, [...index, meta]);
  } catch (e) {
    try {
      storage.removeItem(DOC_KEY(id));
    } catch {
      /* ignore */
    }
    return failure(e);
  }
  return { ok: true, meta };
}

/** Stores a new document under a fresh id. A blank name falls back to defaultDocName. */
export function createDoc(doc: AnyDoc, name: string): CreateDocResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: "unavailable" };
  return insertDoc(storage, doc, name);
}

/** Copies a stored document under a new id and name. A missing or unreadable source reports "unavailable". */
export function duplicateDoc(id: string, name: string): CreateDocResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: "unavailable" };
  const source = loadDoc(id);
  if (source.status !== "ok") return { ok: false, reason: "unavailable" };
  return insertDoc(storage, source.doc, name);
}

/**
 * Renames a document in the index (and, best effort, in its stored copy, so a rebuilt
 * index keeps the name). Returns false for blank names, unknown ids or unavailable storage.
 */
export function renameDoc(id: string, name: string): boolean {
  const next = clean(name);
  if (!next) return false;
  const storage = getStorage();
  if (!storage) return false;
  let meta: DocMeta;
  try {
    const index = readIndex(storage);
    const i = index.findIndex((m) => m.id === id);
    if (i < 0) return false;
    meta = { ...index[i], name: next };
    index[i] = meta;
    writeIndex(storage, index);
  } catch {
    return false;
  }
  try {
    const raw = storage.getItem(DOC_KEY(id));
    const value: unknown = raw === null ? null : JSON.parse(raw);
    if (isObject(value)) {
      const stored = { ...value, name: next, ...(isTimestamp(meta.createdAt) ? { createdAt: meta.createdAt } : {}) };
      storage.setItem(DOC_KEY(id), JSON.stringify(stored));
    }
  } catch {
    /* the index holds the new name; the stored copy catches up on the next save */
  }
  return true;
}

/** Removes the document and its index entry; clears the active id if it pointed there. */
export function deleteDoc(id: string): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(DOC_KEY(id));
    const index = readIndex(storage);
    if (index.some((m) => m.id === id)) writeIndex(storage, index.filter((m) => m.id !== id));
    if (storage.getItem(ACTIVE_DOC_KEY) === id) storage.removeItem(ACTIVE_DOC_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getActiveDocId(): string | null {
  try {
    const id = getStorage()?.getItem(ACTIVE_DOC_KEY) ?? null;
    return id !== null && isValidId(id) ? id : null;
  } catch {
    return null;
  }
}

export function setActiveDocId(id: string): void {
  try {
    getStorage()?.setItem(ACTIVE_DOC_KEY, id);
  } catch {
    /* best effort */
  }
}

/* ---------------- legacy single-draft storage ---------------- */

/**
 * The first of `keys` that holds nothing (else a numbered variant of the last one), so
 * raw data kept from an earlier corruption is never overwritten.
 */
function freeCorruptKey(storage: Storage, keys: string[]): string {
  const last = keys[keys.length - 1];
  try {
    for (const key of keys) if (storage.getItem(key) === null) return key;
    for (let n = 2; n < 100; n++) if (storage.getItem(`${last}:${n}`) === null) return `${last}:${n}`;
  } catch {
    /* fall through */
  }
  return last;
}

/** True when the active id points at a stored document. */
function hasStoredActiveDoc(storage: Storage): boolean {
  try {
    const id = storage.getItem(ACTIVE_DOC_KEY);
    return id !== null && isValidId(id) && storage.getItem(DOC_KEY(id)) !== null;
  } catch {
    return false;
  }
}

export interface LegacyMigrationResult {
  /** Documents created from the legacy draft (first) and backup. */
  migrated: DocMeta[];
  /**
   * True when legacy data could not be read; its raw contents were kept under CORRUPT_KEY,
   * or CORRUPT_DRAFT_KEY / CORRUPT_BACKUP_KEY when that already held older data (then
   * `<that key>:2`, `:3`, … so nothing kept earlier is overwritten).
   */
  corrupted: boolean;
  /**
   * Set when the legacy draft could be read but not stored as a document (usually because
   * storage is full). The draft stays under its legacy key, so a later attempt can still
   * move it; `data` lets the builder open it in the meantime without saving it.
   */
  blocked?: { reason: "unavailable" | "quota"; data: CVData; savedAt: string | null };
}

/**
 * Moves the v1 app's single draft (`free-cv-maker:draft`) and backup (`:backup`) into
 * documents whenever one of them exists, even when documents already exist: a legacy key
 * left behind (e.g. because storage was full) is migrated on a later attempt instead of
 * being hidden for good. Each legacy key is removed as soon as its document is stored, so
 * running this again is a no-op.
 *
 * The draft becomes the active document. The backup is named after its content or
 * "Previous draft", and becomes active only when no draft was migrated and no stored
 * document is active. Unreadable legacy data is kept under `free-cv-maker:corrupted`
 * (as before; `:draft` / `:backup` when that key already holds older data) and the
 * migration continues.
 *
 * `lang` picks the language of fallback names; it defaults to the stored interface
 * language, then the CV's language.
 */
export function migrateLegacyStorage(lang?: Language): LegacyMigrationResult {
  const result: LegacyMigrationResult = { migrated: [], corrupted: false };
  const storage = getStorage();
  if (!storage) return result;

  let uiLang: Language | undefined = lang;
  try {
    if (storage.getItem(DRAFT_KEY) === null && storage.getItem(BACKUP_KEY) === null) return result;
    if (!uiLang) {
      const pref = storage.getItem(UI_LANG_KEY);
      if (pref === "en" || pref === "id") uiLang = pref;
    }
  } catch {
    return result;
  }

  const stamps = (savedAt: string | null) => {
    const at = savedAt && !Number.isNaN(Date.parse(savedAt)) ? savedAt : new Date().toISOString();
    return { createdAt: at, updatedAt: at };
  };

  const draft = readStoredCV(DRAFT_KEY, freeCorruptKey(storage, [CORRUPT_KEY, CORRUPT_DRAFT_KEY]));
  if (draft.status === "unavailable") return result;
  if (draft.status === "corrupted") result.corrupted = true;
  if (draft.status === "ok") {
    const doc: AnyDoc = { kind: "cv", data: draft.data };
    const created = insertDoc(storage, doc, defaultDocName(doc, uiLang ?? draft.data.meta.cvLanguage), stamps(draft.savedAt));
    // Without room for the draft, stop here and leave the legacy keys for the next attempt.
    if (!created.ok) {
      result.blocked = { reason: created.reason, data: draft.data, savedAt: draft.savedAt };
      return result;
    }
    result.migrated.push(created.meta);
    setActiveDocId(created.meta.id);
    try {
      storage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  const backup = readStoredCV(BACKUP_KEY, freeCorruptKey(storage, [CORRUPT_KEY, CORRUPT_BACKUP_KEY]));
  if (backup.status === "corrupted") result.corrupted = true;
  if (backup.status === "ok") {
    const doc: AnyDoc = { kind: "cv", data: backup.data };
    const l = uiLang ?? backup.data.meta.cvLanguage;
    const fullName = backup.data.personal.fullName.trim();
    const name = fullName || (l === "id" ? "Draf sebelumnya" : "Previous draft");
    const created = insertDoc(storage, doc, name, stamps(backup.savedAt));
    if (created.ok) {
      result.migrated.push(created.meta);
      if (result.migrated.length === 1 && !hasStoredActiveDoc(storage)) setActiveDocId(created.meta.id);
      try {
        storage.removeItem(BACKUP_KEY);
      } catch {
        /* ignore */
      }
    }
  }
  return result;
}

/**
 * Removes the legacy draft once its content has been stored as a document by other means
 * (the builder saving a draft it opened while migration was blocked), so it isn't moved
 * into documents a second time.
 */
export function discardLegacyDraft(): void {
  try {
    getStorage()?.removeItem(DRAFT_KEY);
  } catch {
    /* best effort: a draft left behind is migrated again later, never lost */
  }
}
