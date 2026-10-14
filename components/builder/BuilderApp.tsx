"use client";

import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { CVForm } from "@/components/cv-form/CVForm";
import { DocumentPreview } from "@/components/cv-preview/DocumentPreview";
import { LetterForm } from "@/components/letter/LetterForm";
import { PrintRoot } from "@/components/templates/PrintRoot";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Check, Chevron } from "@/components/ui/Icons";
import { btn } from "@/components/ui/styles";
import { DESIGN_TARGET, runChecks, scoreBand, type ScoreBand } from "@/lib/cv-checks";
import { cvReducer, type CVAction } from "@/lib/cv-reducer";
import { LANGUAGES, TEMPLATE_IDS, createEmptyCV, isCVEmpty, type CVData, type Language, type TemplateId } from "@/lib/cv-schema";
import { MAX_IMPORT_BYTES, parseDocumentJson } from "@/lib/cv-validation";
import {
  DOCS_INDEX_KEY,
  DOC_KEY,
  createDoc,
  defaultDocName,
  deleteDoc,
  discardLegacyDraft,
  docLanguage,
  duplicateDoc,
  getActiveDocId,
  isDocEmpty,
  listDocs,
  loadDoc,
  migrateLegacyStorage,
  renameDoc,
  saveDoc,
  setActiveDocId,
  storedSavedAt,
  type AnyDoc,
  type CreateDocResult,
  type DocMeta,
} from "@/lib/documents";
import { fmt, useI18n } from "@/lib/i18n";
import { letterReducer, type LetterAction } from "@/lib/letter-reducer";
import { createEmptyLetter } from "@/lib/letter-schema";
import { isStorageAvailable } from "@/lib/storage";
import { ChecksPanel } from "./ChecksPanel";
import { DesignPanel } from "./DesignPanel";
import { copyName, followingName } from "./doc-names";
import { DocumentsDialog, RenameDialog, type DeleteDocResult } from "./DocumentsDialog";
import { DownloadMenu } from "./DownloadMenu";
import { MenuButton, menuItem, menuItemDanger } from "./MenuButton";
import type { Notice } from "./notice";
import { Tabs, type TabSpec } from "./Tabs";

const AUTOSAVE_MS = 600;

type SaveState = "saved" | "dirty" | "unavailable" | "quota" | "conflict";
/** "conflict": another tab or window saved the document since this tab last loaded or wrote it. */
type SaveOutcome = "ok" | "unavailable" | "quota" | "conflict";
type EditorTab = "content" | "design" | "check";
type MobileTab = "edit" | "preview";

/* ---------------- document state ---------------- */

export type DocAction =
  | { type: "load"; doc: AnyDoc }
  | { type: "cv"; action: CVAction }
  | { type: "letter"; action: LetterAction };

/** The open document: CV actions apply to CVs and letter actions to letters; anything else is ignored. */
export function docReducer(doc: AnyDoc, a: DocAction): AnyDoc {
  switch (a.type) {
    case "load":
      return a.doc;
    case "cv": {
      if (doc.kind !== "cv") return doc;
      const data = cvReducer(doc.data, a.action);
      return data === doc.data ? doc : { kind: "cv", data };
    }
    case "letter": {
      if (doc.kind !== "letter") return doc;
      const data = letterReducer(doc.data, a.action);
      return data === doc.data ? doc : { kind: "letter", data };
    }
    default:
      return doc;
  }
}

const freshCV = (language: Language = "en"): AnyDoc => ({ kind: "cv", data: createEmptyCV(language) });

/** Form fields a jump can land on (the photo's file input and hidden inputs are skipped). */
const JUMP_FIELDS =
  "input:not([type=hidden]):not([type=file]):not([disabled]), select:not([disabled]), textarea:not([disabled])";

/** Tailwind's lg breakpoint: from here the editor and preview sit side by side. */
const WIDE_QUERY = "(min-width: 64rem)";
function subscribeWide(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
// Without matchMedia (tests, very old browsers) the side-by-side layout is assumed.
const isWide = () => typeof window.matchMedia !== "function" || window.matchMedia(WIDE_QUERY).matches;
const wideOnServer = () => true;

const BADGE: Record<ScoreBand, string> = {
  high: "border-line-strong text-fg-muted",
  medium: "border-warn-line text-warn-text",
  low: "border-danger-line text-danger-text",
};

/**
 * The builder: several CVs and cover letters stored in this browser (lib/documents.ts),
 * one open at a time. Each document autosaves shortly after every edit; edits that have
 * not been written yet are flushed when the tab is hidden or closed, before another
 * document opens, and before any download.
 *
 * Several tabs can have the same document open. A tab never overwrites a copy that
 * another tab saved after it last loaded or wrote the document: it reloads that copy
 * when it has no unsaved changes, and otherwise asks which version to keep. Without
 * browser storage, documents still open, are created and imported in memory (unsaved).
 */
export function BuilderApp() {
  const { t, lang } = useI18n();
  const b = t.builder;
  const dt = t.docs;
  const ids = useId();
  const wide = useSyncExternalStore(subscribeWide, isWide, wideOnServer);

  const [doc, dispatch] = useReducer(docReducer, undefined, () => freshCV());
  // Stored id and index entry of the open document; null while a new, untouched CV isn't saved yet
  // (and for documents opened in memory because they can't be stored).
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [meta, setMetaState] = useState<DocMeta | null>(null);
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [notice, setNotice] = useState<Notice | null>(null);
  // Another tab saved the open document while this one had unsaved changes.
  const [conflict, setConflict] = useState(false);
  // Asked before another document replaces one whose latest changes couldn't be saved.
  const [discard, setDiscard] = useState<{
    reason: Exclude<SaveOutcome, "ok">;
    name: string;
    run: () => void;
  } | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit");
  const [editorTab, setEditorTab] = useState<EditorTab>("content");
  const [pages, setPages] = useState(0);
  // Dialogs get a new key each time they open, so their state starts fresh.
  const [docsDialog, setDocsDialog] = useState({ open: false, key: 0, letter: false });
  const [renameDialog, setRenameDialog] = useState({ open: false, key: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Remounts the editor when another document opens, so per-form state never leaks across documents.
  const [editorKey, setEditorKey] = useState(0);
  // Where the last check finding asked to go: a section (and entry) of the form, or a panel
  // (the Design tab), plus the control (`data-field`) to focus there.
  const [jump, setJump] = useState<{ target: string; itemId?: string; field?: string; wholePanel?: boolean } | null>(
    null,
  );

  // Mirrors for timers and page lifecycle handlers.
  const docRef = useRef(doc);
  /** The version of the open document that storage holds (or that was read from it). */
  const savedRef = useRef<AnyDoc>(doc);
  /** `savedAt` of the stored copy this tab last loaded or wrote (see lib/documents storedSavedAt). */
  const baseRef = useRef<string | null>(null);
  /** True while the open document is a legacy draft that didn't fit into documents (still under its old key). */
  const legacyRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  const metaRef = useRef<DocMeta | null>(null);
  const langRef = useRef<Language>(lang);
  const pendingSave = useRef<number | null>(null);
  const switcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  /* ---------------- storage plumbing ---------------- */

  const setActive = useCallback((id: string | null, m: DocMeta | null) => {
    activeIdRef.current = id;
    metaRef.current = m;
    setActiveIdState(id);
    setMetaState(m);
  }, []);

  const refreshDocs = useCallback(() => setDocs(listDocs()), []);

  const cancelPendingSave = useCallback(() => {
    if (pendingSave.current !== null) window.clearTimeout(pendingSave.current);
    pendingSave.current = null;
  }, []);

  /**
   * Writes `next` as the open document. A new document is created in storage on its
   * first save. While a document still has its automatic name, the name follows the
   * content ("Untitled CV" becomes the person's name once it is typed). Unless `force`
   * is set, a copy saved by another tab since this tab last loaded or wrote the document
   * is never overwritten ("conflict").
   */
  const persist = useCallback(
    (next: AnyDoc, force = false): SaveOutcome => {
      const id = activeIdRef.current;
      if (!id) {
        const created = createDoc(next, defaultDocName(next, langRef.current));
        if (!created.ok) {
          setSaveState(created.reason);
          return created.reason;
        }
        setActive(created.meta.id, created.meta);
        setActiveDocId(created.meta.id);
        savedRef.current = next;
        baseRef.current = created.meta.updatedAt;
        // A legacy draft opened while it didn't fit is a document now; don't migrate it again.
        if (legacyRef.current) {
          legacyRef.current = false;
          discardLegacyDraft();
        }
        setSaveState("saved");
        refreshDocs();
        return "ok";
      }
      if (!force) {
        const stored = storedSavedAt(id);
        if (stored !== undefined && stored !== baseRef.current) {
          setConflict(true);
          setSaveState("conflict");
          return "conflict";
        }
      }
      const result = saveDoc(id, next);
      if (!result.ok) {
        setSaveState(result.reason);
        return result.reason;
      }
      const previous = savedRef.current;
      savedRef.current = next;
      baseRef.current = result.savedAt;
      setConflict(false);
      setSaveState("saved");
      const current = metaRef.current;
      if (current) {
        const name = followingName(current.name, previous, next, langRef.current);
        if (name && renameDoc(id, name)) {
          setActive(id, { ...current, name, updatedAt: result.savedAt });
          refreshDocs();
        }
      }
      return "ok";
    },
    [refreshDocs, setActive],
  );

  /** Saves edits that haven't been written yet ("ok" when nothing is left unsaved). */
  const flushOutcome = useCallback((): SaveOutcome => {
    cancelPendingSave();
    if (docRef.current === savedRef.current) return "ok";
    return persist(docRef.current);
  }, [cancelPendingSave, persist]);

  const flush = useCallback((): boolean => flushOutcome() === "ok", [flushOutcome]);

  /**
   * Shows `next` in the editor as the open document: stored under `id` (written at
   * `savedAt`), or new / in memory when id is null.
   */
  const activate = useCallback(
    (id: string | null, next: AnyDoc, m: DocMeta | null, savedAt: string | null = null) => {
      cancelPendingSave();
      savedRef.current = next;
      docRef.current = next;
      baseRef.current = savedAt;
      legacyRef.current = false;
      setActive(id, m);
      if (id) setActiveDocId(id);
      dispatch({ type: "load", doc: next });
      setConflict(false);
      setSaveState(isStorageAvailable() ? "saved" : "unavailable");
      setEditorKey((k) => k + 1);
      if (next.kind === "letter") setEditorTab((tab) => (tab === "check" ? "content" : tab));
    },
    [cancelPendingSave, setActive],
  );

  /** Opens the most recently edited stored document; returns its name, or null when there is none. */
  const openNewest = useCallback((): string | null => {
    for (const m of listDocs()) {
      const result = loadDoc(m.id);
      if (result.status === "ok") {
        activate(m.id, result.doc, result.meta, result.savedAt);
        return result.meta.name;
      }
    }
    return null;
  }, [activate]);

  // Open the active document (or the newest one) once, client-side only. Drafts from the
  // single-draft version of the app are moved into documents first.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    const legacy = migrateLegacyStorage();
    let corrupted = legacy.corrupted;
    let opened: { id: string; doc: AnyDoc; meta: DocMeta; savedAt: string | null } | null = null;
    const storageOk = isStorageAvailable();
    if (storageOk && !legacy.blocked) {
      const candidates = [getActiveDocId(), ...listDocs().map((m) => m.id)].filter(
        (id, i, all): id is string => id !== null && all.indexOf(id) === i,
      );
      for (const id of candidates) {
        const result = loadDoc(id);
        if (result.status === "ok") {
          opened = { id, doc: result.doc, meta: result.meta, savedAt: result.savedAt };
          break;
        }
        if (result.status === "corrupted") corrupted = true;
      }
    }
    if (legacy.blocked) {
      // The old draft didn't fit into documents. Show it anyway, unsaved: it stays under its
      // old key and is moved on a later visit, or stored as soon as there's room for it.
      activate(null, { kind: "cv", data: legacy.blocked.data }, null);
      legacyRef.current = true;
      setSaveState(legacy.blocked.reason);
      if (legacy.blocked.reason === "quota") setNotice({ kind: "error", text: (d) => d.docs.messages.legacyBlocked });
    } else if (opened) {
      activate(opened.id, opened.doc, opened.meta, opened.savedAt);
      const name = opened.meta.name;
      if (!isDocEmpty(opened.doc)) setNotice({ kind: "info", text: (d) => fmt(d.builder.messages.recovered, { name }) });
    } else {
      activate(null, freshCV(), null);
    }
    if (corrupted) setNotice({ kind: "error", text: (d) => d.docs.messages.corrupted });
    if (!storageOk) setSaveState("unavailable");
    refreshDocs();
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Debounced autosave after every edit. Opening a document sets savedRef to it first,
  // so loading never counts as an edit.
  useEffect(() => {
    if (!loaded || doc === savedRef.current) return;
    setSaveState((s) => (s === "unavailable" || s === "conflict" ? s : "dirty"));
    cancelPendingSave();
    pendingSave.current = window.setTimeout(() => {
      pendingSave.current = null;
      persist(doc);
    }, AUTOSAVE_MS);
  }, [doc, loaded, cancelPendingSave, persist]);

  // Flush pending edits when the tab is hidden or closed. Only unsaved edits are
  // written, and never over a newer copy from another tab.
  useEffect(() => {
    if (!loaded) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onPageHide = () => {
      flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [loaded, flush]);

  // Another tab or window changed storage. The documents list follows; a newer copy of the
  // open document replaces it here when this tab has no unsaved changes, and otherwise
  // the conflict notice asks which version to keep.
  useEffect(() => {
    if (!loaded) return;
    let local: Storage | null = null;
    try {
      local = window.localStorage;
    } catch {
      /* blocked: there are no other tabs' saves to follow */
    }
    const onStorage = (e: StorageEvent) => {
      // sessionStorage changes are not other tabs' saves.
      if (e.storageArea && e.storageArea !== local) return;
      if (e.key === null || e.key === DOCS_INDEX_KEY) refreshDocs();
      const id = activeIdRef.current;
      // A document deleted elsewhere stays open here; its next save stores it again.
      if (!id || e.key !== DOC_KEY(id) || e.newValue === null) return;
      const stored = storedSavedAt(id);
      // Same content (e.g. only renamed elsewhere): keep the name in step.
      if (stored === undefined || stored === baseRef.current) {
        const renamed = listDocs().find((m) => m.id === id);
        if (renamed && metaRef.current && renamed.name !== metaRef.current.name) {
          setActive(id, { ...metaRef.current, name: renamed.name });
          refreshDocs();
        }
        return;
      }
      if (docRef.current !== savedRef.current) {
        setConflict(true);
        setSaveState("conflict");
        return;
      }
      const result = loadDoc(id);
      if (result.status !== "ok") return;
      // No remount: whatever the person is focused on stays focused.
      cancelPendingSave();
      savedRef.current = result.doc;
      docRef.current = result.doc;
      baseRef.current = result.savedAt;
      setActive(id, result.meta);
      dispatch({ type: "load", doc: result.doc });
      setConflict(false);
      setSaveState("saved");
      refreshDocs();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loaded, cancelPendingSave, refreshDocs, setActive]);

  // Leaving the builder inside the app (e.g. to the help page) keeps pending edits too.
  useEffect(
    () => () => {
      flush();
    },
    [flush],
  );

  // Success/info notices disappear on their own; errors stay until dismissed.
  useEffect(() => {
    if (!notice || notice.kind === "error") return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Jump to a section (and entry), or a Design tab control, after its tab has been shown.
  useEffect(() => {
    if (!jump) return;
    const section = document.getElementById(jump.target);
    if (!section) return;
    let scope: HTMLElement = section;
    if (jump.itemId) {
      const item = Array.from(section.querySelectorAll<HTMLElement>("[data-item-id]")).find(
        (el) => el.dataset.itemId === jump.itemId,
      );
      if (item) scope = item;
    }
    // The field the finding is about, else the first field of the entry or section; an
    // empty section offers its "Add" button instead. A panel without the named control
    // gets focus itself.
    const named = jump.field
      ? Array.from(scope.querySelectorAll<HTMLElement>("[data-field]")).find(
          (el) => el.dataset.field === jump.field && el.matches(JUMP_FIELDS) && !el.closest("fieldset:disabled"),
        )
      : undefined;
    const target = jump.wholePanel
      ? (named ?? scope)
      : (named ??
        scope.querySelector<HTMLElement>(JUMP_FIELDS) ??
        scope.querySelector<HTMLElement>("button:not([disabled])") ??
        scope);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true;
    // In a panel, bring the control's group into view; in the form, the section or entry.
    const view = jump.wholePanel && named ? (named.closest("fieldset") ?? named) : scope;
    view.scrollIntoView({
      block: view === section ? "start" : "center",
      behavior: reduceMotion ? "auto" : "smooth",
    });
    if (target === scope && !scope.hasAttribute("tabindex")) scope.setAttribute("tabindex", "-1");
    // Ringed even after a mouse click (app/globals.css), so it's clear where focus went.
    target.setAttribute("data-jumped", "");
    target.addEventListener("blur", () => target.removeAttribute("data-jumped"), { once: true });
    target.focus({ preventScroll: true });
  }, [jump]);

  /* ---------------- dispatchers ---------------- */

  const cvDispatch = useCallback((action: CVAction) => dispatch({ type: "cv", action }), []);
  const letterDispatch = useCallback((action: LetterAction) => dispatch({ type: "letter", action }), []);

  const cvOptions = useMemo(
    () => docs.filter((m) => m.kind === "cv").map(({ id, name }) => ({ id, name })),
    [docs],
  );
  const loadCV = useCallback((id: string): CVData | null => {
    const result = loadDoc(id);
    return result.status === "ok" && result.doc.kind === "cv" ? result.doc.data : null;
  }, []);

  /* ---------------- document actions ---------------- */

  const error = (text: Notice["text"]) => setNotice({ kind: "error", text });
  const success = (text: Notice["text"]) => setNotice({ kind: "success", text });

  const currentName = () => metaRef.current?.name ?? defaultDocName(docRef.current, langRef.current);

  /**
   * Makes sure the open document can be replaced without losing work: pending edits are
   * saved, and a document shown only in memory is stored if possible. Anything but "ok"
   * means the latest changes would be lost.
   */
  const secureCurrent = (): SaveOutcome => {
    const outcome = flushOutcome();
    // An empty document has nothing worth keeping.
    if (isDocEmpty(docRef.current)) return "ok";
    if (outcome !== "ok") return outcome;
    // Stored, or a legacy draft that is still kept under its old key.
    if (activeIdRef.current !== null || legacyRef.current) return "ok";
    return persist(docRef.current);
  };

  /** Runs `open` once the open document is safe to replace, or after the person agrees to lose its changes. */
  const leaveThen = (open: () => void) => {
    const outcome = secureCurrent();
    if (outcome === "ok") {
      open();
      return;
    }
    setDiscard({ reason: outcome, name: currentName(), run: open });
  };

  const confirmDiscard = () => {
    const pending = discard;
    setDiscard(null);
    if (!pending) return;
    cancelPendingSave();
    pending.run();
  };

  const openDocsDialog = (letter = false) => {
    flush();
    refreshDocs();
    setDocsDialog((s) => ({ open: true, key: s.key + 1, letter }));
  };
  const closeDocsDialog = () => setDocsDialog((s) => ({ ...s, open: false }));

  const openDoc = (id: string) => {
    closeDocsDialog();
    if (id === activeIdRef.current) return;
    leaveThen(() => {
      const result = loadDoc(id);
      refreshDocs();
      if (result.status !== "ok") {
        const status = result.status;
        error((d) => d.docs.messages.openFailed[status]);
        return;
      }
      activate(id, result.doc, result.meta, result.savedAt);
      const name = result.meta.name;
      success((d) => fmt(d.docs.messages.opened, { name }));
    });
  };

  /**
   * Stores `next` as a new document and opens it, then calls `done` with its name. Without
   * browser storage it opens in memory (unsaved; the status line says so).
   */
  const createAndOpen = (next: AnyDoc, done: (name: string) => void) => {
    closeDocsDialog();
    leaveThen(() => {
      const name = defaultDocName(next, langRef.current);
      if (!isStorageAvailable()) {
        activate(null, next, null);
        done(name);
        return;
      }
      const created = createDoc(next, name);
      if (!created.ok) {
        const reason = created.reason;
        error((d) => d.docs.messages.createFailed[reason]);
        return;
      }
      activate(created.meta.id, next, created.meta, created.meta.updatedAt);
      refreshDocs();
      done(created.meta.name);
    });
  };

  const onNewCV = () => {
    createAndOpen(freshCV(docLanguage(docRef.current)), () => success((d) => d.docs.messages.created.cv));
  };

  const onNewLetter = (fromCvId: string | null) => {
    let cv: CVData | undefined;
    if (fromCvId) {
      const current = docRef.current;
      if (fromCvId === activeIdRef.current && current.kind === "cv") cv = current.data;
      else cv = loadCV(fromCvId) ?? undefined;
    }
    const cvName = cv ? (docs.find((m) => m.id === fromCvId)?.name ?? "") : "";
    const language = cv?.meta.cvLanguage ?? docLanguage(docRef.current);
    createAndOpen({ kind: "letter", data: createEmptyLetter(language, cv) }, () =>
      success((d) => (cv ? fmt(d.docs.messages.createdFrom, { name: cvName }) : d.docs.messages.created.letter)),
    );
  };

  /** Toolbar "New cover letter…": the documents dialog with the letter setup, or straight away without CVs to copy from. */
  const onNewLetterFromMenu = () => {
    if (cvOptions.length === 0) onNewLetter(null);
    else openDocsDialog(true);
  };

  const onImport = async (file: File) => {
    closeDocsDialog();
    if (file.size > MAX_IMPORT_BYTES) {
      error((d) => d.docs.messages.importErrors.too_large);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      error((d) => d.docs.messages.importErrors.read_failed);
      return;
    }
    const result = parseDocumentJson(text);
    if (!result.ok) {
      const code = result.error;
      error((d) => d.docs.messages.importErrors[code]);
      return;
    }
    const migrated = result.migratedFrom !== undefined;
    createAndOpen(result.doc, (name) =>
      success((d) => fmt(migrated ? d.docs.messages.importedMigrated : d.docs.messages.imported, { name })),
    );
  };

  const renameById = (id: string, name: string): boolean => {
    if (!renameDoc(id, name)) return false;
    const current = metaRef.current;
    if (id === activeIdRef.current && current) setActive(id, { ...current, name: name.replace(/\s+/g, " ").trim() });
    refreshDocs();
    return true;
  };

  const duplicateById = (id: string, name: string): CreateDocResult => {
    let result: CreateDocResult;
    if (id === activeIdRef.current) {
      // The open document is copied as shown here, including edits that aren't saved yet
      // (pending ones are written first; a conflict with another tab doesn't block the copy).
      flushOutcome();
      result = createDoc(docRef.current, name);
    } else {
      result = duplicateDoc(id, name);
    }
    refreshDocs();
    return result;
  };

  const deleteById = (id: string): DeleteDocResult => {
    const isCurrent = id === activeIdRef.current;
    // saveDoc re-adds a document that is missing from the index, so a pending save must not run afterwards.
    if (isCurrent) cancelPendingSave();
    if (!deleteDoc(id)) {
      if (isCurrent) flush();
      refreshDocs();
      return { ok: false };
    }
    let opened: string | undefined;
    if (isCurrent) {
      opened = openNewest() ?? undefined;
      if (!opened) activate(null, freshCV(docLanguage(docRef.current)), null);
    } else if (docRef.current !== savedRef.current) {
      // Deleting may have made the room the open document's latest changes were waiting for.
      flush();
    }
    refreshDocs();
    return { ok: true, opened };
  };

  /** Toolbar: duplicate the open document and continue in the copy. */
  const onDuplicateCurrent = () => {
    const id = activeIdRef.current;
    if (!id) return;
    const result = duplicateById(id, copyName(metaRef.current?.name ?? defaultDocName(doc, lang), dt.dialog.copyName));
    if (!result.ok) {
      const reason = result.reason;
      error((d) => d.docs.messages.createFailed[reason]);
      return;
    }
    const loadedCopy = loadDoc(result.meta.id);
    if (loadedCopy.status !== "ok") {
      const status = loadedCopy.status;
      error((d) => d.docs.messages.openFailed[status]);
      return;
    }
    activate(result.meta.id, loadedCopy.doc, loadedCopy.meta, loadedCopy.savedAt);
    const name = loadedCopy.meta.name;
    success((d) => fmt(d.docs.messages.duplicatedOpened, { name }));
  };

  const onRenameCurrent = () => {
    // A new document is stored first, so it has something to rename.
    if (!activeIdRef.current) {
      const outcome = persist(docRef.current);
      // (A document without an id is created, never compared with another tab's copy.)
      if (outcome !== "ok") {
        const reason = outcome === "conflict" ? "unavailable" : outcome;
        error((d) => d.docs.messages.createFailed[reason]);
        return;
      }
    }
    setRenameDialog((s) => ({ open: true, key: s.key + 1 }));
  };

  const onDeleteCurrent = () => {
    setConfirmDelete(false);
    const id = activeIdRef.current;
    if (!id) return;
    const name = metaRef.current?.name ?? "";
    const result = deleteById(id);
    if (!result.ok) {
      error((d) => d.docs.messages.deleteFailed);
      return;
    }
    const next = result.opened;
    success((d) =>
      next ? fmt(d.docs.messages.deletedOpened, { name, next }) : fmt(d.docs.messages.deleted, { name }),
    );
  };

  const onSaveNow = () => {
    cancelPendingSave();
    if (persist(docRef.current) === "ok") success((d) => d.builder.messages.saved);
  };

  /* ---------------- conflicts between tabs ---------------- */

  /** Replaces this tab's unsaved changes with the copy another tab saved. */
  const onLoadNewer = () => {
    const id = activeIdRef.current;
    if (!id) return;
    const result = loadDoc(id);
    refreshDocs();
    if (result.status !== "ok") {
      // Nothing newer to load after all (deleted or unreadable): this tab's version is kept.
      onKeepMine();
      return;
    }
    activate(id, result.doc, result.meta, result.savedAt);
    const name = result.meta.name;
    success((d) => fmt(d.docs.conflict.loaded, { name }));
    switcherRef.current?.focus();
  };

  /** Saves this tab's version over the copy another tab saved. */
  const onKeepMine = () => {
    cancelPendingSave();
    const name = currentName();
    if (persist(docRef.current, true) === "ok") success((d) => fmt(d.docs.conflict.kept, { name }));
    switcherRef.current?.focus();
  };

  /* ---------------- check jumps ---------------- */

  const onJump = (target: string, itemId?: string, field?: string) => {
    setMobileTab("edit");
    if (target === DESIGN_TARGET) {
      setEditorTab("design");
      setJump({ target: `${ids}-panel-design`, field, wholePanel: true });
      return;
    }
    setEditorTab("content");
    setJump({ target, itemId, field });
  };

  /* ---------------- render ---------------- */

  const isCV = doc.kind === "cv";
  const docName = meta?.name ?? defaultDocName(doc, lang);
  const kindLabel = dt.kinds[doc.kind];
  const template = doc.data.meta.template;
  const docLang = docLanguage(doc);
  const empty = isDocEmpty(doc);

  const checkResult = useMemo(
    () => (doc.kind === "cv" && !isCVEmpty(doc.data) ? runChecks(doc.data, pages > 0 ? { pages } : {}) : null),
    [doc, pages],
  );

  const statusText = {
    saved: b.status.saved,
    dirty: b.status.unsaved,
    unavailable: dt.status.unavailable,
    quota: dt.status.quota,
    conflict: dt.status.conflict,
  }[saveState];
  const storageProblem = saveState === "unavailable" || saveState === "quota" || saveState === "conflict";

  const toolbarSelectClass =
    "mt-1 min-h-10 rounded-sm border border-control-line bg-raised px-2 text-sm text-fg transition-colors hover:border-steel";

  const editorTabs: TabSpec<EditorTab>[] = [
    { key: "content", label: dt.editorTabs.content, tabId: `${ids}-tab-content`, panelId: `${ids}-panel-content` },
    { key: "design", label: t.design.title, tabId: `${ids}-tab-design`, panelId: `${ids}-panel-design` },
  ];
  if (isCV) {
    editorTabs.push({
      key: "check",
      tabId: `${ids}-tab-check`,
      panelId: `${ids}-panel-check`,
      label: (
        <>
          {t.checks.title}
          {checkResult && (
            <>
              <span
                aria-hidden="true"
                className={`rounded-sm border px-1.5 text-xs leading-5 tabular-nums ${BADGE[scoreBand(checkResult.score)]}`}
                data-testid="check-score-badge"
              >
                {checkResult.score}
              </span>
              <span className="sr-only">, {fmt(t.checks.score.badge, { score: checkResult.score })}</span>
            </>
          )}
        </>
      ),
    });
  }

  const switcherLabelId = `${ids}-switcher-label`;
  const switcherId = `${ids}-switcher`;
  const languageHintId = `${ids}-language-hint`;
  const languageHint = isCV ? b.cvLanguageHint : dt.letterLanguageHint;
  // Below lg the preview is a tab. While the Edit tab is shown it stays laid out (invisible,
  // inert, hidden from assistive technology), so its page count, which the Check tab uses,
  // stays measured.
  const previewOffscreen = mobileTab !== "preview" && !wide;

  return (
    <>
      <div className="no-print flex min-h-0 flex-1 flex-col">
        {/*
          Toolbar. Its z-index must beat the sticky Edit/Preview bar below it, or the menus
          that open from here (download formats, More) slide under that bar on phones.
        */}
        <div className="relative z-30 border-b border-line bg-surface lg:sticky lg:top-0">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-end gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-auto flex-wrap items-end gap-3">
              <div className="flex w-full min-w-0 flex-col text-xs text-fg-muted sm:w-auto sm:max-w-[20rem]">
                <span id={switcherLabelId}>{dt.switcher.label}</span>
                <button
                  ref={switcherRef}
                  id={switcherId}
                  type="button"
                  aria-haspopup="dialog"
                  aria-labelledby={`${switcherLabelId} ${switcherId}`}
                  title={dt.switcher.hint}
                  className="mt-1 flex min-h-10 min-w-0 items-center gap-2 rounded-sm border border-control-line bg-raised px-2 text-left text-sm text-fg transition-colors hover:border-steel"
                  onClick={() => openDocsDialog()}
                  data-testid="document-switcher"
                >
                  <span className="min-w-0 truncate">{docName}</span>
                  <span className="shrink-0 text-xs text-fg-muted">{kindLabel}</span>
                  <Chevron width={16} height={16} className="ml-auto shrink-0 text-fg-muted" />
                </button>
              </div>
              <label className="flex flex-col text-xs text-fg-muted">
                {b.template}
                <select
                  className={toolbarSelectClass}
                  value={template}
                  onChange={(e) => {
                    const patch = { template: e.target.value as TemplateId };
                    if (doc.kind === "cv") cvDispatch({ type: "setMeta", patch });
                    else letterDispatch({ type: "setMeta", patch });
                  }}
                >
                  {TEMPLATE_IDS.map((id) => (
                    <option key={id} value={id}>
                      {t.templates[id].name}
                    </option>
                  ))}
                </select>
              </label>
              {/* The hint is the select's description, so touch, keyboard and screen reader users get it too. */}
              <label className="flex flex-col text-xs text-fg-muted" title={languageHint}>
                {isCV ? b.cvLanguage : dt.letterLanguage}
                <select
                  className={toolbarSelectClass}
                  value={docLang}
                  aria-describedby={languageHintId}
                  onChange={(e) => {
                    const value = e.target.value as Language;
                    if (doc.kind === "cv") cvDispatch({ type: "setMeta", patch: { cvLanguage: value } });
                    else letterDispatch({ type: "setMeta", patch: { language: value } });
                  }}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {b.languageNames[l]}
                    </option>
                  ))}
                </select>
              </label>
              <span id={languageHintId} className="sr-only">
                {languageHint}
              </span>
            </div>
            <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-2 sm:ml-auto sm:w-auto">
              {/* The one save status, at every width (its own line on phones). */}
              <p
                className={`flex items-center gap-1.5 text-xs max-sm:w-full max-sm:empty:hidden sm:mr-2 ${
                  storageProblem ? "text-danger-text sm:max-w-[22rem]" : "text-fg-muted"
                }`}
                role="status"
                data-testid="save-status"
              >
                {!loaded ? (
                  b.loading
                ) : empty && saveState === "saved" ? null : (
                  <>
                    {saveState === "saved" && <Check width={14} height={14} className="shrink-0" />}
                    {statusText}
                  </>
                )}
              </p>
              {/* Autosave makes this a reassurance; on phones it moves into "More" to save a row. */}
              <button type="button" className={`${btn.secondary} max-sm:hidden`} onClick={onSaveNow}>
                {b.saveNow}
              </button>
              <MenuButton
                triggerClassName={`${btn.secondary} shrink-0`}
                triggerContent={
                  <>
                    {b.more} <Chevron width={16} height={16} />
                  </>
                }
                panelLabel={dt.actions.label}
              >
                {(run) => (
                  <>
                    <button type="button" className={menuItem} onClick={run(onNewCV)}>
                      {dt.actions.newCv}
                    </button>
                    <button type="button" className={menuItem} onClick={run(onNewLetterFromMenu)}>
                      {dt.actions.newLetter}
                    </button>
                    <hr className="my-1 border-line" />
                    <button type="button" className={`${menuItem} sm:hidden`} onClick={run(onSaveNow)}>
                      {b.saveNow}
                    </button>
                    <button
                      type="button"
                      className={menuItem}
                      disabled={!activeId && saveState === "unavailable"}
                      onClick={run(onRenameCurrent)}
                    >
                      {dt.actions.rename}
                    </button>
                    <button type="button" className={menuItem} disabled={!activeId} onClick={run(onDuplicateCurrent)}>
                      {dt.actions.duplicate}
                    </button>
                    <button type="button" className={menuItem} onClick={run(() => openDocsDialog())}>
                      {dt.actions.allDocs}
                    </button>
                    <hr className="my-1 border-line" />
                    <button
                      type="button"
                      className={menuItemDanger}
                      disabled={!activeId}
                      onClick={run(() => setConfirmDelete(true))}
                    >
                      {dt.actions.delete}
                    </button>
                  </>
                )}
              </MenuButton>
              <DownloadMenu doc={doc} onBeforeExport={flush} onNotice={setNotice} />
            </div>
          </div>
        </div>

        {/* Mobile: switch between editor and preview instead of a cramped split screen. */}
        <Tabs
          label={b.title}
          tabs={(["edit", "preview"] as const).map((key) => ({
            key,
            label: b.tabs[key],
            tabId: `tab-${key}`,
            panelId: `panel-${key}`,
          }))}
          selected={mobileTab}
          onSelect={setMobileTab}
          className="sticky top-0 z-20 border-b border-line bg-surface px-4 lg:hidden"
        />

        {conflict && (
          <div className="mx-auto w-full max-w-[1600px] px-4 pt-3">
            <div
              role="alert"
              className="rounded-sm border border-l-2 border-line border-l-danger-text bg-surface px-4 py-2.5 text-sm text-fg"
              data-testid="conflict-notice"
            >
              <p className="break-words">{fmt(dt.conflict.text, { name: docName })}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={btn.secondary} onClick={onLoadNewer}>
                  {dt.conflict.loadNewer}
                </button>
                <button type="button" className={btn.secondary} onClick={onKeepMine}>
                  {dt.conflict.keepMine}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Errors keep a danger bar; info and success are a plain line, since the toolbar already shows save state. */}
        {notice && (
          <div className="mx-auto w-full max-w-[1600px] px-4 pt-3">
            <div
              role={notice.kind === "error" ? "alert" : "status"}
              className={`flex items-baseline justify-between gap-4 text-sm ${
                notice.kind === "error"
                  ? "rounded-sm border border-l-2 border-line border-l-danger-text bg-surface px-4 py-2.5 text-fg"
                  : "text-fg-muted"
              }`}
            >
              <span className="min-w-0 break-words">{notice.text(t)}</span>
              <button
                type="button"
                className="shrink-0 text-fg-muted underline underline-offset-2 hover:text-fg"
                onClick={() => setNotice(null)}
              >
                {b.dismiss}
              </button>
            </div>
          </div>
        )}

        <div className="relative mx-auto grid w-full max-w-[1600px] flex-1 gap-6 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div
            id="panel-edit"
            role="tabpanel"
            aria-labelledby="tab-edit"
            className={`${mobileTab === "edit" ? "block" : "hidden"} min-w-0 lg:block`}
          >
            <h1 className="sr-only">{b.title}</h1>
            {loaded ? (
              <>
                <Tabs
                  label={dt.editorTabs.label}
                  tabs={editorTabs}
                  selected={editorTab}
                  onSelect={setEditorTab}
                  className="mb-2 border-b border-line"
                />
                <div
                  id={`${ids}-panel-content`}
                  role="tabpanel"
                  aria-labelledby={`${ids}-tab-content`}
                  hidden={editorTab !== "content"}
                >
                  {doc.kind === "cv" ? (
                    <CVForm key={editorKey} cv={doc.data} dispatch={cvDispatch} />
                  ) : (
                    <LetterForm
                      key={editorKey}
                      letter={doc.data}
                      dispatch={letterDispatch}
                      cvOptions={cvOptions}
                      loadCV={loadCV}
                    />
                  )}
                </div>
                <div
                  id={`${ids}-panel-design`}
                  role="tabpanel"
                  aria-labelledby={`${ids}-tab-design`}
                  hidden={editorTab !== "design"}
                  tabIndex={-1}
                  className="pt-4"
                >
                  {editorTab === "design" &&
                    (doc.kind === "cv" ? (
                      <DesignPanel
                        key={editorKey}
                        style={doc.data.meta.style}
                        template={doc.data.meta.template}
                        onStyleChange={(patch) => cvDispatch({ type: "setStyle", patch })}
                        cv={doc.data}
                        dispatch={cvDispatch}
                      />
                    ) : (
                      <DesignPanel
                        key={editorKey}
                        style={doc.data.meta.style}
                        template={doc.data.meta.template}
                        onStyleChange={(patch) => letterDispatch({ type: "setStyle", patch })}
                      />
                    ))}
                </div>
                {isCV && (
                  <div
                    id={`${ids}-panel-check`}
                    role="tabpanel"
                    aria-labelledby={`${ids}-tab-check`}
                    hidden={editorTab !== "check"}
                    className="pt-4"
                  >
                    {editorTab === "check" && doc.kind === "cv" && (
                      <ChecksPanel cv={doc.data} pages={pages} onJump={onJump} />
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-fg-muted">{b.loading}</p>
            )}
          </div>
          <div
            id="panel-preview"
            role="tabpanel"
            aria-labelledby="tab-preview"
            aria-hidden={previewOffscreen || undefined}
            inert={previewOffscreen || undefined}
            className={`min-w-0 ${
              mobileTab === "preview" ? "" : "invisible absolute inset-x-0 top-0 h-0 overflow-hidden"
            } lg:visible lg:static lg:h-auto lg:overflow-visible`}
            data-testid="preview-panel"
          >
            <div className="lg:sticky lg:top-24">
              <DocumentPreview doc={doc} onPagesChange={setPages} />
            </div>
          </div>
        </div>
      </div>

      {/* Print-only copy of the open document: the only thing that appears in the PDF. */}
      <PrintRoot doc={doc} />

      <DocumentsDialog
        key={docsDialog.key}
        open={docsDialog.open}
        onClose={closeDocsDialog}
        docs={docs}
        activeId={activeId}
        onOpen={openDoc}
        onRename={renameById}
        onDuplicate={duplicateById}
        onDelete={deleteById}
        onNewCV={onNewCV}
        onNewLetter={onNewLetter}
        onImport={(file) => void onImport(file)}
        storageAvailable={saveState !== "unavailable"}
        startWithLetter={docsDialog.letter}
      />
      <RenameDialog
        key={`rename-${renameDialog.key}`}
        open={renameDialog.open}
        name={docName}
        onClose={() => setRenameDialog((s) => ({ ...s, open: false }))}
        onRename={(name) => {
          const id = activeIdRef.current;
          if (!id || !renameById(id, name)) return false;
          success((d) => fmt(d.docs.messages.renamed, { name }));
          return true;
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={fmt(dt.confirmDelete.title, { name: docName })}
        body={dt.confirmDelete.body}
        confirmLabel={dt.confirmDelete.confirm}
        cancelLabel={dt.confirmDelete.cancel}
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDeleteCurrent}
      />
      <ConfirmDialog
        open={discard !== null}
        title={dt.discard.title}
        body={discard ? fmt(dt.discard[discard.reason], { name: discard.name }) : ""}
        confirmLabel={dt.discard.confirm}
        cancelLabel={dt.discard.cancel}
        danger
        onCancel={() => setDiscard(null)}
        onConfirm={confirmDiscard}
      />
    </>
  );
}
