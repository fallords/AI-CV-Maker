"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/Field";
import { Plus } from "@/components/ui/Icons";
import { btn, inputClass } from "@/components/ui/styles";
import type { Language } from "@/lib/cv-schema";
import { MAX_DOC_NAME, type CreateDocResult, type DocMeta } from "@/lib/documents";
import { fmt, useI18n } from "@/lib/i18n";
import { copyName } from "./doc-names";

export type DeleteDocResult =
  | {
      ok: true;
      /** Name of the document that is open afterwards, when the open one was deleted. */
      opened?: string;
    }
  | { ok: false };

export interface DocumentsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Stored documents, newest first (listDocs()). */
  docs: DocMeta[];
  /** The document open in the editor (null while it isn't saved yet). */
  activeId: string | null;
  onOpen: (id: string) => void;
  /** Returns false when the name couldn't be saved. */
  onRename: (id: string, name: string) => boolean;
  /** Stores a copy (kept in the list; the open document doesn't change). */
  onDuplicate: (id: string, name: string) => CreateDocResult;
  /** Deletes after the dialog's own confirmation. */
  onDelete: (id: string) => DeleteDocResult;
  onNewCV: () => void;
  /** `fromCvId`: the CV whose personal details fill in the sender, or null. */
  onNewLetter: (fromCvId: string | null) => void;
  /** A JSON file chosen with "Import file"; imported as a new document. */
  onImport: (file: File) => void;
  /**
   * False when browser storage can't be used: nothing can be listed or saved, but new
   * and imported documents still open (unsaved) in the editor.
   */
  storageAvailable?: boolean;
  /** Opens with the new cover letter setup already shown (the toolbar's "New cover letter…"). */
  startWithLetter?: boolean;
}

/** Plain-text row action button (secondary actions inside the list). */
const rowAction =
  "inline-flex min-h-10 items-center rounded-[4px] px-2.5 text-sm text-fg-muted transition-colors duration-150 hover:bg-overlay hover:text-fg";
const rowDanger =
  "inline-flex min-h-10 items-center rounded-[4px] px-2.5 text-sm text-danger-text transition-colors duration-150 hover:bg-danger-soft";

function formatEdited(iso: string, lang: Language): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type Status = { kind: "success" | "error"; text: string } | null;

/**
 * The list of saved CVs and cover letters: open, rename (inline), duplicate and delete
 * (with confirmation), plus "New CV", "New cover letter" (optionally filled in from a
 * CV) and "Import file" (always a new document, never a replacement).
 *
 * Mount it with a new `key` each time it opens, so its state starts fresh.
 */
export function DocumentsDialog({
  open,
  onClose,
  docs,
  activeId,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onNewCV,
  onNewLetter,
  onImport,
  storageAvailable = true,
  startWithLetter = false,
}: DocumentsDialogProps) {
  const { t, lang } = useI18n();
  const d = t.docs.dialog;
  const ids = useId();
  const [renaming, setRenaming] = useState<{ id: string; value: string; error: boolean } | null>(null);
  const [deleting, setDeleting] = useState<DocMeta | null>(null);
  const cvs = docs.filter((m) => m.kind === "cv");
  // Opened from the toolbar's "New cover letter…": start in the letter setup (it needs a CV to offer).
  const openInLetterSetup = startWithLetter && cvs.length > 0;
  const [letterSetup, setLetterSetup] = useState(openInLetterSetup);
  const defaultCv = (activeId && cvs.find((m) => m.id === activeId)?.id) || cvs[0]?.id || "";
  const [letterFrom, setLetterFrom] = useState(defaultCv);
  const [status, setStatus] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const newCvRef = useRef<HTMLButtonElement>(null);
  const newLetterRef = useRef<HTMLButtonElement>(null);
  // Element to focus once the list has re-rendered after an action.
  const pendingFocus = useRef<(() => HTMLElement | null | undefined) | null>(null);

  useEffect(() => {
    const find = pendingFocus.current;
    if (!find) return;
    pendingFocus.current = null;
    find()?.focus();
  }, [docs, renaming, deleting]);

  const rowButton = (id: string, action: string) =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>(`[data-action="${action}"]`) ?? []).find(
      (el) => el.closest("li")?.dataset.docId === id,
    );

  const kindLabel = (m: DocMeta) => t.docs.kinds[m.kind];

  /* ---------- rename ---------- */

  const startRename = (m: DocMeta) => {
    setStatus(null);
    setRenaming({ id: m.id, value: m.name, error: false });
  };

  const cancelRename = () => {
    const id = renaming?.id;
    setRenaming(null);
    if (id) pendingFocus.current = () => rowButton(id, "rename");
  };

  const submitRename = (e: FormEvent) => {
    e.preventDefault();
    if (!renaming) return;
    const name = renaming.value.replace(/\s+/g, " ").trim();
    if (!name) {
      setRenaming({ ...renaming, error: true });
      return;
    }
    const id = renaming.id;
    if (onRename(id, name)) {
      setStatus({ kind: "success", text: fmt(d.renamed, { name }) });
      setRenaming(null);
      pendingFocus.current = () => rowButton(id, "rename");
    } else {
      setStatus({ kind: "error", text: t.docs.messages.renameFailed });
    }
  };

  /* ---------- duplicate and delete ---------- */

  const duplicate = (m: DocMeta) => {
    const name = copyName(m.name, d.copyName);
    const result = onDuplicate(m.id, name);
    if (result.ok) {
      setStatus({ kind: "success", text: fmt(d.duplicated, { name: result.meta.name }) });
      pendingFocus.current = () => rowButton(result.meta.id, "open") ?? rowButton(result.meta.id, "rename");
    } else {
      setStatus({ kind: "error", text: t.docs.messages.createFailed[result.reason] });
    }
  };

  const confirmDelete = () => {
    const target = deleting;
    setDeleting(null);
    if (!target) return;
    const index = docs.findIndex((m) => m.id === target.id);
    const result = onDelete(target.id);
    if (!result.ok) {
      setStatus({ kind: "error", text: t.docs.messages.deleteFailed });
      pendingFocus.current = () => rowButton(target.id, "delete");
      return;
    }
    setStatus({
      kind: "success",
      text: result.opened
        ? fmt(d.deletedOpened, { name: target.name, next: result.opened })
        : fmt(d.deleted, { name: target.name }),
    });
    // Focus the entry that took the deleted one's place, or "New CV" when the list is empty.
    pendingFocus.current = () => {
      const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("li[data-doc-id]") ?? []);
      const row = rows[Math.min(index, rows.length - 1)];
      return row?.querySelector<HTMLElement>("button") ?? newCvRef.current;
    };
  };

  /* ---------- new documents ---------- */

  const startLetter = () => {
    if (cvs.length === 0) {
      onNewLetter(null);
      return;
    }
    setStatus(null);
    setLetterFrom(defaultCv);
    setLetterSetup(true);
  };

  // The Cancel button disappears with the setup, so focus goes back to the button that opened it.
  const cancelLetter = () => {
    setLetterSetup(false);
    newLetterRef.current?.focus();
  };

  const listTitleId = `${ids}-list`;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={t.docs.title}
        footer={
          <button type="button" className={btn.secondary} onClick={onClose}>
            {d.close}
          </button>
        }
      >
        <p className="text-fg-body">{d.intro}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button ref={newCvRef} type="button" className={btn.secondary} onClick={onNewCV}>
            <Plus width={16} height={16} /> {d.newCv}
          </button>
          <button
            ref={newLetterRef}
            type="button"
            className={btn.secondary}
            aria-expanded={cvs.length > 0 ? letterSetup : undefined}
            onClick={startLetter}
          >
            <Plus width={16} height={16} /> {d.newLetter}
          </button>
          <button
            type="button"
            className={btn.ghost}
            aria-describedby={`${ids}-import-hint`}
            onClick={() => fileRef.current?.click()}
          >
            {d.importFile}
          </button>
        </div>
        <p id={`${ids}-import-hint`} className="mt-2 text-sm text-fg-muted">
          {d.importHint}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onImport(file);
          }}
        />

        {letterSetup && (
          <section
            aria-labelledby={`${ids}-letter`}
            className="mt-4 rounded-[3px] border border-line-strong px-4 py-4"
            data-testid="new-letter-setup"
          >
            <h3 id={`${ids}-letter`} className="text-sm font-semibold text-fg">
              {d.letterTitle}
            </h3>
            <SelectField
              className="mt-3"
              autoFocusInDialog={openInLetterSetup}
              label={d.letterFrom}
              hint={d.letterFromHint}
              value={letterFrom}
              onChange={setLetterFrom}
              options={[
                ...cvs.map((m) => ({ value: m.id, label: m.name })),
                { value: "", label: d.letterFromNone },
              ]}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={btn.primary} onClick={() => onNewLetter(letterFrom || null)}>
                {d.createLetter}
              </button>
              <button type="button" className={btn.secondary} onClick={cancelLetter}>
                {d.cancel}
              </button>
            </div>
          </section>
        )}

        {/* Always rendered, so screen readers announce the messages put into it. */}
        <div role="status">
          {status && (
            <p className={`mt-4 ${status.kind === "error" ? "text-danger-text" : "text-fg-body"}`}>{status.text}</p>
          )}
        </div>

        {/*
          The dialog opens with focus here rather than on "New CV", so an accidental Enter
          doesn't create a document; Tab then reaches the list.
        */}
        <h3
          id={listTitleId}
          tabIndex={-1}
          data-autofocus={openInLetterSetup ? undefined : true}
          className="mt-5 text-sm font-semibold text-fg"
        >
          {d.listLabel}
        </h3>
        {docs.length === 0 ? (
          <p className="mt-2 text-fg-muted">{storageAvailable ? d.empty : d.emptyUnavailable}</p>
        ) : (
          <ul ref={listRef} aria-labelledby={listTitleId} className="mt-2 divide-y divide-line">
            {docs.map((m) => {
              const current = m.id === activeId;
              const edited = formatEdited(m.updatedAt, lang);
              return (
                <li
                  key={m.id}
                  data-doc-id={m.id}
                  aria-current={current ? "true" : undefined}
                  className={`-mx-3 px-3 py-3 ${current ? "rounded-[2px] bg-accent-soft" : ""}`}
                >
                  {renaming?.id === m.id ? (
                    <RenameForm
                      label={d.nameLabel}
                      value={renaming.value}
                      error={renaming.error ? d.nameRequired : null}
                      saveLabel={d.save}
                      cancelLabel={d.cancel}
                      onChange={(value) => setRenaming({ id: m.id, value, error: false })}
                      onSubmit={submitRename}
                      onCancel={cancelRename}
                    />
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="min-w-0 font-medium break-words text-fg">{m.name}</p>
                        {current && <span className="shrink-0 text-sm font-medium text-fg">{d.current}</span>}
                      </div>
                      {/* Kind and date as two pieces of text, not a dotted meta string. */}
                      <p className="flex flex-wrap gap-x-3 text-sm text-fg-muted">
                        <span className="font-medium text-fg-body">{kindLabel(m)}</span>
                        {edited && (
                          <span>
                            <span className="sr-only">, </span>
                            {fmt(d.edited, { date: edited })}
                          </span>
                        )}
                      </p>
                      <div className="mt-1 -ml-2.5 flex flex-wrap">
                        {!current && (
                          <RowButton action="open" label={d.open} name={m.name} onClick={() => onOpen(m.id)} />
                        )}
                        <RowButton action="rename" label={d.rename} name={m.name} onClick={() => startRename(m)} />
                        <RowButton action="duplicate" label={d.duplicate} name={m.name} onClick={() => duplicate(m)} />
                        <RowButton
                          action="delete"
                          label={d.delete}
                          name={m.name}
                          danger
                          onClick={() => {
                            setStatus(null);
                            setDeleting(m);
                          }}
                        />
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title={fmt(t.docs.confirmDelete.title, { name: deleting?.name ?? "" })}
        body={t.docs.confirmDelete.body}
        confirmLabel={t.docs.confirmDelete.confirm}
        cancelLabel={t.docs.confirmDelete.cancel}
        danger
        onCancel={() => {
          const id = deleting?.id;
          setDeleting(null);
          if (id) pendingFocus.current = () => rowButton(id, "delete");
        }}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function RowButton({
  action,
  label,
  name,
  danger = false,
  onClick,
}: {
  action: string;
  label: string;
  name: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-action={action}
      className={danger ? rowDanger : rowAction}
      aria-label={`${label}: ${name}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** Inline name field with Save and Cancel; Escape cancels without closing the dialog. */
export function RenameForm({
  label,
  value,
  error,
  saveLabel,
  cancelLabel,
  onChange,
  onSubmit,
  onCancel,
  formId,
  actions = true,
}: {
  label: string;
  value: string;
  error: string | null;
  saveLabel: string;
  cancelLabel: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  /** Lets a submit button outside the form (e.g. in a dialog footer) submit it. */
  formId?: string;
  /** False when the Save/Cancel buttons live elsewhere (e.g. in a dialog footer). */
  actions?: boolean;
}) {
  const id = useId();
  return (
    <form id={formId} onSubmit={onSubmit} noValidate>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className={inputClass}
        value={value}
        maxLength={MAX_DOC_NAME}
        autoComplete="off"
        // autoFocus covers the inline form (shown inside an open dialog); data-autofocus
        // covers RenameDialog, where showModal() runs after mount.
        autoFocus
        data-autofocus
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            // Keep the surrounding dialog open; only the edit is cancelled.
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-danger-text" role="alert">
          {error}
        </p>
      )}
      {actions && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="submit" className={btn.primary}>
            {saveLabel}
          </button>
          <button type="button" className={btn.secondary} onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      )}
    </form>
  );
}

/**
 * Renames one document (used by the toolbar's "Rename" action). Mount it with a new
 * `key` each time it opens, so the field starts with the current name.
 */
export function RenameDialog({
  open,
  name,
  onClose,
  onRename,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  /** Returns false when the name couldn't be saved. */
  onRename: (name: string) => boolean;
}) {
  const { t } = useI18n();
  const r = t.docs.rename;
  const formId = useId();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = value.replace(/\s+/g, " ").trim();
    if (!next) {
      setError(t.docs.dialog.nameRequired);
      return;
    }
    if (next === name || onRename(next)) onClose();
    else setError(t.docs.messages.renameFailed);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={r.title}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            {r.cancel}
          </button>
          <button type="submit" form={formId} className={btn.primary}>
            {r.save}
          </button>
        </>
      }
    >
      <RenameForm
        formId={formId}
        actions={false}
        label={t.docs.dialog.nameLabel}
        value={value}
        error={error}
        saveLabel={r.save}
        cancelLabel={r.cancel}
        onChange={(v) => {
          setValue(v);
          setError(null);
        }}
        onSubmit={submit}
        onCancel={onClose}
      />
    </Dialog>
  );
}
