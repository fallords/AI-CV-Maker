"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/** Shared look of the buttons inside a MenuButton panel. Colour lives outside the base so danger items never compete. */
export const menuItemBase =
  "flex min-h-10 w-full flex-col items-start justify-center px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const menuItem = `${menuItemBase} text-fg hover:bg-overlay focus-visible:bg-overlay disabled:hover:bg-transparent`;
export const menuItemDanger = `${menuItemBase} text-danger-text hover:bg-danger-soft focus-visible:bg-danger-soft`;

const ITEMS = "button:not([disabled])";
/** Distance kept between the panel and the edges of the screen, in px. */
const EDGE = 8;

/**
 * A button that shows a small panel of actions (disclosure pattern: the trigger reports
 * `aria-expanded`, the panel is a labelled group of ordinary buttons). Escape, a click
 * outside or moving focus away closes it; arrow keys, Home and End move between items.
 *
 * `children` receives `run(action)`: it closes the panel, returns focus to the trigger
 * and then runs the action, so a dialog opened by the action restores focus to the trigger.
 */
export function MenuButton({
  triggerContent,
  triggerLabel,
  triggerClassName,
  panelLabel,
  children,
}: {
  triggerContent: ReactNode;
  /** Accessible name (and tooltip) when the trigger has no visible text. */
  triggerLabel?: string;
  triggerClassName: string;
  /** Accessible name of the panel. */
  panelLabel: string;
  children: (run: (action: () => void) => () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Items hidden at some screen widths (e.g. "Save" outside phones) are skipped. Without
  // checkVisibility (older browsers, jsdom) every item counts.
  const items = () =>
    Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? []).filter(
      (el) => typeof el.checkVisibility !== "function" || el.checkVisibility(),
    );

  // The panel lines up with the trigger's end edge and shifts sideways when that would
  // push it past either edge of a narrow screen. It is a fresh element on every open,
  // so the position is written straight onto it before the browser paints.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const root = rootRef.current;
    if (!open || !panel || !root) return;
    const width = panel.offsetWidth;
    if (!width) return;
    const box = root.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth || window.innerWidth;
    const left = Math.max(EDGE, Math.min(box.right - width, viewport - EDGE - width));
    panel.style.left = `${left - box.left}px`;
    panel.style.right = "auto";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onPointerDown = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = (focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const run = (action: () => void) => () => {
    close(true);
    action();
  };

  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    if (list.length === 0) return;
    const index = list.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (e.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % list.length;
    else if (e.key === "ArrowUp") next = index <= 0 ? list.length - 1 : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = list.length - 1;
    if (next === null) return;
    e.preventDefault();
    list[next].focus();
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          e.stopPropagation();
          close(true);
        }
      }}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (open && next && !e.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {triggerContent}
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-label={panelLabel}
          onKeyDown={onPanelKeyDown}
          className="absolute top-full right-0 z-30 mt-1 w-[min(19rem,calc(100vw-2rem))] motion-enter rounded-[3px] border border-line-strong bg-raised py-1 shadow-[0_10px_24px_-10px_rgb(30_34_41/0.45)]"
        >
          {children(run)}
        </div>
      )}
    </div>
  );
}
