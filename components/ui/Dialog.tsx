"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { btn } from "./styles";

/**
 * Modal dialog built on the native <dialog> element: focus is trapped and
 * restored by the browser, and Escape closes it.
 *
 * On opening, focus goes to the element marked `data-autofocus`, else (the browser's
 * default) to the first focusable element. React's `autoFocus` doesn't work here:
 * it focuses on mount, and `showModal()` runs afterwards and moves focus again.
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
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
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
      className="app-dialog no-print m-auto w-[min(92vw,32rem)] rounded-[2px] border-0 bg-raised p-0 text-fg shadow-[0_2px_0_var(--color-kraft-deep),0_18px_40px_-12px_rgb(30_34_41/0.45)]"
    >
      {open && (
        <>
          <div className="px-6 pt-5 pb-6">
            <h2 id={titleId} className="font-display text-lg leading-snug font-semibold text-fg">
              {title}
            </h2>
            <div className="mt-2 text-sm leading-relaxed text-fg-muted">{children}</div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        </>
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
          <button type="button" className={btn.secondary} onClick={onCancel} data-autofocus>
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
