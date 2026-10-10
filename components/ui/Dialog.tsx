"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { btn } from "./styles";

/**
 * Modal dialog built on the native <dialog> element: focus is trapped and
 * restored by the browser, and Escape closes it.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // The native "close" event also fires when we close the dialog ourselves;
  // only report closes that happen while the dialog is meant to be open.
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        if (openRef.current) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="no-print m-auto w-[min(92vw,32rem)] rounded-xl border border-line-strong bg-raised p-0 text-fg shadow-2xl shadow-black/60"
    >
      {open && (
        <div className="p-6">
          <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <div className="mt-3 text-sm leading-relaxed text-fg-muted">{children}</div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className={danger ? btn.dangerSolid : btn.primary} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {body}
    </Dialog>
  );
}
