/**
 * Multi-document storage (CVs and cover letters) in localStorage. Browser only;
 * nothing here leaves the device.
 *
 * Keys:
 *   DOCS_INDEX_KEY        – DocMeta[] (names and timestamps, used for listing)
 *   DOC_KEY(id)           – { schemaVersion, savedAt, kind, data } for one document
 *   ACTIVE_DOC_KEY        – id of the document the builder opens
 *   CORRUPT_DOC_KEY(id)   – raw contents of a document that could not be read, kept so
 *                           it is not silently destroyed
 *
 * Every access is wrapped: storage can be disabled, full or contain corrupted data.
 * The index heals itself: a corrupted index is rebuilt from the stored documents, and
 * documents missing from the index (e.g. after a race between two tabs) are added back.
 */

import { CV_SCHEMA_VERSION, createId, isCVEmpty, type CVData, type Language } from "./cv-schema";
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
  data: CVData | LetterData;
}

export type CreateDocResult = { ok: true; meta: DocMeta } | { ok: false; reason: "unavailable" | "quota" };

export type LoadDocResult =
  | { status: "ok"; doc: AnyDoc; meta: DocMeta }
  | { status: "missing" }
  | { status: "corrupted" }
  | { status: "unavailable" };

export const DOCS_INDEX_KEY = `${STORAGE_PREFIX}docs`;
const DOC_KEY_PREFIX = `${STORAGE_PREFIX}doc:`;
export const DOC_KEY = (id: string) => `${DOC_KEY_PREFIX}${id}`;
export const ACTIVE_DOC_KEY = `${STORAGE_PREFIX}active`;
export const CORRUPT_DOC_KEY = (id: string) => `${CORRUPT_KEY}:${id}`;
/** Where a corrupted legacy backup goes when CORRUPT_KEY is already taken. */
export const CORRUPT_BACKUP_KEY = `${CORRUPT_KEY}:backup`;
export const MAX_DOC_NAME = 120;

const DOC_ID_RE = /^[\w-]{1,64}$/;
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

function sanitizeMeta(v: unknown): DocMeta | null {
  if (!isObject(v)) return null;
  if (typeof v.id !== "string" || !DOC_ID_RE.test(v.id)) return null;
  if (typeof v.kind !== "string" || !(DOC_KINDS as readonly string[]).includes(v.kind)) return null;
  return {
    id: v.id,
    kind: v.kind as DocKind,
    name: typeof v.name === "string" ? clean(v.name) : "",
    createdAt: typeof v.createdAt === "string" ? v.createdAt : "",
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : "",
  };
}

/** Parses a stored document payload; null when it cannot be read. */
function parseStored(raw: string): { doc: AnyDoc; savedAt: string | null } | null {
  try {
    const value: unknown = JSON.parse(raw);
    const result = parseDocumentValue(value);
    if (!result.ok) return null;
    const savedAt = isObject(value) && typeof value.savedAt === "string" ? value.savedAt : null;
    return { doc: result.doc, savedAt };
  } catch {
    return null;
  }
}

function metaFromStored(id: string, doc: AnyDoc, savedAt: string | null): DocMeta {
  const at = savedAt ?? new Date().toISOString();
  return { id, kind: doc.kind, name: defaultDocName(doc, docLanguage(doc)), createdAt: at, updatedAt: at };
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
    if (DOC_ID_RE.test(id) && id !== ignoreId && !known.has(id)) orphans.push(id);
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
    metas.push(metaFromStored(id, parsed.doc, parsed.savedAt));
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

function payload(doc: AnyDoc, savedAt: string): string {
  const stored: StoredDoc = {
    schemaVersion: doc.kind === "cv" ? CV_SCHEMA_VERSION : LETTER_SCHEMA_VERSION,
    savedAt,
    kind: doc.kind,
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
  if (!DOC_ID_RE.test(id)) return { status: "missing" };
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
    meta = meta ? { ...meta, kind: parsed.doc.kind } : metaFromStored(id, parsed.doc, parsed.savedAt);
    const next = [...index.filter((m) => m.id !== id), meta];
    try {
      writeIndex(storage, next);
    } catch {
      /* ignore */
    }
  }
  return { status: "ok", doc: parsed.doc, meta };
}

/**
 * Saves the document and updates `updatedAt` in the index. If the document is not in the
 * index (e.g. it was deleted in another tab), it is added back rather than lost, so cancel
 * pending autosaves before calling deleteDoc.
 */
export function saveDoc(id: string, doc: AnyDoc): SaveResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: "unavailable" };
  if (!DOC_ID_RE.test(id)) return { ok: false, reason: "unavailable" };
  const savedAt = new Date().toISOString();
  try {
    storage.setItem(DOC_KEY(id), payload(doc, savedAt));
  } catch (e) {
    return failure(e);
  }
  try {
    const index = readIndex(storage);
    const i = index.findIndex((m) => m.id === id);
    if (i >= 0) index[i] = { ...index[i], kind: doc.kind, updatedAt: savedAt };
    else index.push({ ...metaFromStored(id, doc, savedAt) });
    writeIndex(storage, index);
  } catch {
    /* the document itself is saved; a missing index entry is restored on the next read */
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
    storage.setItem(DOC_KEY(id), payload(doc, updatedAt));
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

/** Renames a document in the index. Returns false for blank names, unknown ids or unavailable storage. */
export function renameDoc(id: string, name: string): boolean {
  const next = clean(name);
  if (!next) return false;
  const storage = getStorage();
  if (!storage) return false;
  try {
    const index = readIndex(storage);
    const i = index.findIndex((m) => m.id === id);
    if (i < 0) return false;
    index[i] = { ...index[i], name: next };
    writeIndex(storage, index);
    return true;
  } catch {
    return false;
  }
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
    return id !== null && DOC_ID_RE.test(id) ? id : null;
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

export interface LegacyMigrationResult {
  /** Documents created from the legacy draft (first) and backup. */
  migrated: DocMeta[];
  /** True when legacy data could not be read; its raw contents were kept under CORRUPT_KEY. */
  corrupted: boolean;
}

/**
 * Moves the v1 app's single draft (`free-cv-maker:draft`) and backup (`:backup`) into
 * documents, once: only when one of them exists and the documents index does not.
 * The draft becomes the active document; the backup is named after its content or
 * "Previous draft". Migrated legacy keys are removed. Unreadable legacy data is kept
 * under `free-cv-maker:corrupted` (as before) and the migration continues.
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
    if (storage.getItem(DOCS_INDEX_KEY) !== null) return result;
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

  const draft = readStoredCV(DRAFT_KEY, CORRUPT_KEY);
  if (draft.status === "unavailable") return result;
  if (draft.status === "corrupted") result.corrupted = true;
  if (draft.status === "ok") {
    const doc: AnyDoc = { kind: "cv", data: draft.data };
    const created = insertDoc(storage, doc, defaultDocName(doc, uiLang ?? draft.data.meta.cvLanguage), stamps(draft.savedAt));
    // Without room for the draft, stop here and leave the legacy keys for the next attempt.
    if (!created.ok) return result;
    result.migrated.push(created.meta);
    setActiveDocId(created.meta.id);
    try {
      storage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  let backupCorruptKey = CORRUPT_KEY;
  try {
    if (storage.getItem(CORRUPT_KEY) !== null) backupCorruptKey = CORRUPT_BACKUP_KEY;
  } catch {
    /* ignore */
  }
  const backup = readStoredCV(BACKUP_KEY, backupCorruptKey);
  if (backup.status === "corrupted") result.corrupted = true;
  if (backup.status === "ok") {
    const doc: AnyDoc = { kind: "cv", data: backup.data };
    const l = uiLang ?? backup.data.meta.cvLanguage;
    const fullName = backup.data.personal.fullName.trim();
    const name = fullName || (l === "id" ? "Draf sebelumnya" : "Previous draft");
    const created = insertDoc(storage, doc, name, stamps(backup.savedAt));
    if (created.ok) {
      result.migrated.push(created.meta);
      if (result.migrated.length === 1) setActiveDocId(created.meta.id);
      try {
        storage.removeItem(BACKUP_KEY);
      } catch {
        /* ignore */
      }
    }
  }
  return result;
}
