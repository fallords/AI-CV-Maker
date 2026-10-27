"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabSpec<T extends string> {
  key: T;
  label: ReactNode;
  /** Element id of the tab button. */
  tabId: string;
  /** Element id of the panel it controls. */
  panelId: string;
}

/**
 * Folder tabs (ARIA tabs pattern with a roving tabindex: arrow keys, Home and End move
 * between tabs and select them). The selected tab is white paper with a stamp-red edge and
 * joins the white panel below it; the others are the darker folder board. Put the tab list
 * directly on top of a `bg-surface` panel so the selected tab connects to it.
 */
export function Tabs<T extends string>({
  label,
  tabs,
  selected,
  onSelect,
  className = "",
}: {
  label: string;
  tabs: TabSpec<T>[];
  selected: T;
  onSelect: (key: T) => void;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.key === selected);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    onSelect(tabs[next].key);
    const id = tabs[next].tabId;
    Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])
      .find((el) => el.id === id)
      ?.focus();
  };

  return (
    <div ref={listRef} role="tablist" aria-label={label} className={`flex items-end gap-1 ${className}`} onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const active = tab.key === selected;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={tab.tabId}
            aria-selected={active}
            aria-controls={tab.panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(tab.key)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-t-[6px] px-4 text-sm font-medium transition-colors duration-150 ${
              active
                ? "bg-surface text-fg shadow-[inset_0_3px_0_var(--color-stamp)]"
                : "bg-kraft-deep text-white hover:bg-[#7d5938]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
