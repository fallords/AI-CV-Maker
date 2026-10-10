"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CVForm } from "@/components/cv-form/CVForm";
import { CVPreview } from "@/components/cv-preview/CVPreview";
import { CVDocument } from "@/components/templates";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Check, Chevron, Download } from "@/components/ui/Icons";
import { btn } from "@/components/ui/styles";
import { cvReducer } from "@/lib/cv-reducer";
import { LANGUAGES, TEMPLATE_IDS, createEmptyCV, isCVEmpty, type CVData, type Language, type TemplateId } from "@/lib/cv-schema";
import { parseCVJson, serializeCV, type ParseError } from "@/lib/cv-validation";
import { useI18n } from "@/lib/i18n";
import { PRINT_HINT_KEY, pdfFileName, printCV } from "@/lib/pdf";
import {
  deleteDraft,
  hasBackup,
  loadBackup,
  loadDraft,
  readPreference,
  saveBackup,
  saveDraft,
  writePreference,
} from "@/lib/storage";

const AUTOSAVE_MS = 600;

type SaveState = "saved" | "dirty" | "unavailable" | "quota";
type Notice = { kind: "success" | "error" | "info"; text: string } | null;
type Confirm = "new" | "delete" | "restore" | "import" | null;

export function BuilderApp() {
  const { t } = useI18n();
  const b = t.builder;
  const [cv, dispatch] = useReducer(cvReducer, undefined, () => createEmptyCV());
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [notice, setNotice] = useState<Notice>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pendingImport, setPendingImport] = useState<{ data: CVData; migrated: boolean } | null>(null);
  const [backupExists, setBackupExists] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [printHintOpen, setPrintHintOpen] = useState(false);
  const [hidePrintHint, setHidePrintHint] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const cvRef = useRef(cv);
  // True while there are edits that have not been written to storage yet.
  const dirtyRef = useRef(false);
  const skipNextSave = useRef(true);

  useEffect(() => {
    cvRef.current = cv;
  }, [cv]);

  // Recover the draft after a refresh. Runs once, client-side only.
  useEffect(() => {
    const result = loadDraft();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    if (result.status === "ok") {
      dispatch({ type: "replace", data: result.data });
      if (!isCVEmpty(result.data)) setNotice({ kind: "info", text: b.messages.recovered });
    } else if (result.status === "corrupted") {
      setNotice({ kind: "error", text: b.messages.corrupted });
    } else if (result.status === "unavailable") {
      setSaveState("unavailable");
    }
    setBackupExists(hasBackup());
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const persist = useCallback((data: CVData): boolean => {
    const res = saveDraft(data);
    if (res.ok) dirtyRef.current = false;
    setSaveState(res.ok ? "saved" : res.reason);
    return res.ok;
  }, []);

  // Debounced autosave on every change after the initial load.
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    dirtyRef.current = true;
    setSaveState((s) => (s === "unavailable" ? s : "dirty"));
    const timer = window.setTimeout(() => persist(cv), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [cv, loaded, persist]);

  // Flush pending edits when the tab is hidden or closed. Only unsaved edits are
  // written, so an idle second tab never overwrites newer work from another tab.
  useEffect(() => {
    if (!loaded) return;
    const flush = () => {
      if (dirtyRef.current && saveDraft(cvRef.current).ok) dirtyRef.current = false;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [loaded]);

  // Success/info notices disappear on their own; errors stay until dismissed.
  useEffect(() => {
    if (!notice || notice.kind === "error") return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const closeMenu = () => menuRef.current?.removeAttribute("open");

  /* ---------------- actions ---------------- */

  const replaceWith = (data: CVData, text: string) => {
    dispatch({ type: "replace", data });
    persist(data);
    skipNextSave.current = true;
    setNotice({ kind: "success", text });
  };

  const onSaveNow = () => {
    if (persist(cv)) setNotice({ kind: "success", text: b.messages.saved });
  };

  const onNew = () => {
    saveBackup(cv);
    setBackupExists(true);
    replaceWith(createEmptyCV(cv.meta.cvLanguage), b.messages.newCv);
  };

  const onRestore = () => {
    const backup = loadBackup();
    if (backup.status !== "ok") {
      setBackupExists(false);
      setNotice({ kind: "error", text: b.messages.noBackup });
      return;
    }
    saveBackup(cv);
    replaceWith(backup.data, b.messages.restored);
  };

  const onDelete = () => {
    deleteDraft();
    setBackupExists(false);
    dispatch({ type: "replace", data: createEmptyCV(cv.meta.cvLanguage) });
    skipNextSave.current = true;
    dirtyRef.current = false;
    setSaveState("saved");
    setNotice({ kind: "success", text: b.messages.deleted });
  };

  const onExport = () => {
    const blob = new Blob([serializeCV(cv)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pdfFileName(cv)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({ kind: "success", text: b.messages.exported });
  };

  const importErrors = b.messages.importErrors;
  const onImportFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setNotice({ kind: "error", text: importErrors.read_failed });
      return;
    }
    const result = parseCVJson(text);
    if (!result.ok) {
      setNotice({ kind: "error", text: importErrors[result.error as ParseError] });
      return;
    }
    const migrated = result.migratedFrom !== undefined;
    if (isCVEmpty(cv)) applyImport(result.data, migrated);
    else {
      setPendingImport({ data: result.data, migrated });
      setConfirm("import");
    }
  };

  const applyImport = (data: CVData, migrated = false) => {
    if (!isCVEmpty(cv)) {
      saveBackup(cv);
      setBackupExists(true);
    }
    setPendingImport(null);
    replaceWith(data, migrated ? b.messages.importedMigrated : b.messages.imported);
  };

  const startPrint = () => {
    persist(cv);
    if (!printCV(cv)) setNotice({ kind: "error", text: b.print.unavailable });
  };

  const onDownload = () => {
    if (isCVEmpty(cv)) {
      setNotice({ kind: "error", text: b.print.empty });
      return;
    }
    if (readPreference(PRINT_HINT_KEY) === "1") startPrint();
    else setPrintHintOpen(true);
  };

  /* ---------------- render ---------------- */

  const statusText = {
    saved: b.status.saved,
    dirty: b.status.unsaved,
    unavailable: b.status.unavailable,
    quota: b.status.quota,
  }[saveState];

  // Colour lives outside the base so the delete item's danger colours never compete with the default ones.
  const menuItemBase = "block w-full rounded-md px-3 py-2 text-left text-sm transition-colors disabled:opacity-50";
  const menuItem = `${menuItemBase} text-fg hover:bg-overlay disabled:hover:bg-transparent`;

  return (
    <>
      <div className="no-print flex min-h-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="z-20 border-b border-line bg-surface shadow-sm shadow-black/40 lg:sticky lg:top-0">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-end gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
              <label className="flex flex-col text-xs font-medium tracking-wide text-fg-muted">
                {b.template}
                <select
                  className="mt-1 min-h-10 rounded-md border border-control-line bg-raised px-2 text-sm text-fg transition-colors hover:border-steel"
                  value={cv.meta.template}
                  onChange={(e) => dispatch({ type: "setMeta", patch: { template: e.target.value as TemplateId } })}
                >
                  {TEMPLATE_IDS.map((id) => (
                    <option key={id} value={id}>
                      {t.templates[id].name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs font-medium tracking-wide text-fg-muted" title={b.cvLanguageHint}>
                {b.cvLanguage}
                <select
                  className="mt-1 min-h-10 rounded-md border border-control-line bg-raised px-2 text-sm text-fg transition-colors hover:border-steel"
                  value={cv.meta.cvLanguage}
                  onChange={(e) => dispatch({ type: "setMeta", patch: { cvLanguage: e.target.value as Language } })}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {b.languageNames[l]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={`hidden items-center gap-1 text-xs md:flex ${
                  saveState === "unavailable" || saveState === "quota" ? "text-danger-text" : "text-fg-muted"
                }`}
                role="status"
                data-testid="save-status"
              >
                {saveState === "saved" && <Check className="text-accent-text" width={14} height={14} />}
                {loaded ? statusText : b.loading}
              </p>
              <button type="button" className={btn.secondary} onClick={onSaveNow}>
                {b.saveNow}
              </button>
              <details ref={menuRef} className="relative">
                <summary className={`${btn.secondary} list-none [&::-webkit-details-marker]:hidden`}>
                  {b.more} <Chevron width={16} height={16} />
                </summary>
                <div
                  className="absolute right-0 z-30 mt-2 w-60 rounded-lg border border-line-strong bg-raised p-1 shadow-xl shadow-black/50"
                  role="group"
                  aria-label={b.actions}
                >
                  <button type="button" className={menuItem} onClick={() => { closeMenu(); setConfirm("new"); }}>
                    {b.newCv}
                  </button>
                  <button
                    type="button"
                    className={menuItem}
                    disabled={!backupExists}
                    onClick={() => { closeMenu(); setConfirm("restore"); }}
                  >
                    {b.restore}
                  </button>
                  <button type="button" className={menuItem} onClick={() => { closeMenu(); fileRef.current?.click(); }}>
                    {b.importJson}
                  </button>
                  <button type="button" className={menuItem} onClick={() => { closeMenu(); onExport(); }}>
                    {b.exportJson}
                  </button>
                  <hr className="my-1 border-line" />
                  <button
                    type="button"
                    className={`${menuItemBase} text-danger-text hover:bg-danger-soft`}
                    onClick={() => { closeMenu(); setConfirm("delete"); }}
                  >
                    {b.deleteDraft}
                  </button>
                </div>
              </details>
              <button type="button" className={btn.primary} onClick={onDownload}>
                <Download /> {b.downloadPdf}
              </button>
            </div>
          </div>
          {(saveState === "unavailable" || saveState === "quota") && (
            <p className="border-t border-danger-line bg-danger-soft px-4 py-2 text-sm text-danger-text md:hidden" role="alert">
              {statusText}
            </p>
          )}
        </div>

        {/* Mobile: switch between editor and preview instead of a cramped split screen. */}
        <div className="sticky top-0 z-20 grid grid-cols-2 border-b border-line bg-surface lg:hidden" role="tablist">
          {(["edit", "preview"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              aria-controls={`panel-${key}`}
              id={`tab-${key}`}
              onClick={() => setTab(key)}
              className={`min-h-11 text-sm font-medium transition-colors ${
                tab === key ? "border-b-2 border-accent-text text-accent-text" : "text-fg-muted hover:text-fg"
              }`}
            >
              {b.tabs[key]}
            </button>
          ))}
        </div>

        {notice && (
          <div
            role={notice.kind === "error" ? "alert" : "status"}
            className={`mx-auto mt-3 flex w-[min(100%-2rem,1600px)] items-start justify-between gap-3 rounded-md border px-4 py-2 text-sm ${
              notice.kind === "error"
                ? "border-danger-line bg-danger-soft text-danger-text"
                : "border-accent-line bg-accent-soft text-fg"
            }`}
          >
            <span>{notice.text}</span>
            <button type="button" className="shrink-0 underline" onClick={() => setNotice(null)}>
              {b.dismiss}
            </button>
          </div>
        )}

        <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-6 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div
            id="panel-edit"
            role="tabpanel"
            aria-labelledby="tab-edit"
            className={`${tab === "edit" ? "block" : "hidden"} min-w-0 lg:block`}
          >
            <h1 className="sr-only">{b.title}</h1>
            {loaded ? <CVForm cv={cv} dispatch={dispatch} /> : <p className="text-fg-muted">{b.loading}</p>}
          </div>
          <div
            id="panel-preview"
            role="tabpanel"
            aria-labelledby="tab-preview"
            className={`${tab === "preview" ? "block" : "hidden"} min-w-0 lg:block`}
          >
            <div className="lg:sticky lg:top-24">
              <CVPreview cv={cv} />
            </div>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => void onImportFile(e.target.files?.[0])}
        />
      </div>

      {/* Print-only copy of the CV: the only thing that appears in the PDF. */}
      <div id="cv-print-root" className="hidden">
        <CVDocument cv={cv} />
      </div>

      <ConfirmDialog
        open={confirm === "new"}
        title={b.confirm.newTitle}
        body={b.confirm.newBody}
        confirmLabel={b.confirm.newConfirm}
        cancelLabel={b.confirm.cancel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          onNew();
        }}
      />
      <ConfirmDialog
        open={confirm === "restore"}
        title={b.confirm.restoreTitle}
        body={b.confirm.restoreBody}
        confirmLabel={b.confirm.restoreConfirm}
        cancelLabel={b.confirm.cancel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          onRestore();
        }}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title={b.confirm.deleteTitle}
        body={b.confirm.deleteBody}
        confirmLabel={b.confirm.deleteConfirm}
        cancelLabel={b.confirm.cancel}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          onDelete();
        }}
      />
      <ConfirmDialog
        open={confirm === "import"}
        title={b.confirm.importTitle}
        body={b.confirm.importBody}
        confirmLabel={b.confirm.importConfirm}
        cancelLabel={b.confirm.cancel}
        onCancel={() => {
          setConfirm(null);
          setPendingImport(null);
        }}
        onConfirm={() => {
          setConfirm(null);
          if (pendingImport) applyImport(pendingImport.data, pendingImport.migrated);
        }}
      />
      <Dialog
        open={printHintOpen}
        onClose={() => setPrintHintOpen(false)}
        title={b.print.title}
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setPrintHintOpen(false)}>
              {b.print.cancel}
            </button>
            <button
              type="button"
              className={btn.primary}
              autoFocus
              onClick={() => {
                if (hidePrintHint) writePreference(PRINT_HINT_KEY, "1");
                setPrintHintOpen(false);
                // Let the dialog close before the print dialog snapshots the page.
                window.setTimeout(startPrint, 50);
              }}
            >
              {b.print.continue}
            </button>
          </>
        }
      >
        <p>{b.print.intro}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {b.print.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-3 text-fg-muted">{b.print.note}</p>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            className="size-5 accent-accent-control"
            checked={hidePrintHint}
            onChange={(e) => setHidePrintHint(e.target.checked)}
          />
          {b.print.dontShow}
        </label>
      </Dialog>
    </>
  );
}
