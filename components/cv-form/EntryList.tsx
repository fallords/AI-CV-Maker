"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmt, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "../ui/Dialog";
import { ArrowDown, ArrowUp, Plus, Trash } from "../ui/Icons";
import { btn } from "../ui/styles";

/** Entries per list. sanitizeCV keeps at most 100 entries per list, so more would be lost on reload. */
export const MAX_LIST_ITEMS = 100;

export interface EntryListProps<T extends { id: string }> {
  items: readonly T[];
  addLabel: string;
  emptyText: string;
  /** Singular noun used in accessible names, e.g. "Experience" → "Experience 2: Designer". */
  itemLabel: string;
  getTitle: (item: T) => string;
  /** Entries with content ask for confirmation before they are removed. */
  isFilled: (item: T) => boolean;
  renderFields: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  /** Adds an empty entry and returns its id, so focus can move into it. */
  onAdd: () => string;
  onUpdate: (id: string, patch: Partial<T>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  maxItems?: number;
  /** One-line rows without a header (skills, languages, interests). */
  compact?: boolean;
}

/**
 * Generic editor for a list of entries: add, edit, remove (with confirmation
 * when the entry has content) and reorder with keyboard-accessible buttons.
 * State lives with the caller; this component only renders and reports intents.
 */
export function EntryList<T extends { id: string }>({
  items,
  addLabel,
  emptyText,
  itemLabel,
  getTitle,
  isFilled,
  renderFields,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  maxItems = MAX_LIST_ITEMS,
  compact = false,
}: EntryListProps<T>) {
  const { t } = useI18n();
  const c = t.form.itemControls;
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  // Id of an entry that was just added; focus moves into it once it has rendered.
  const pendingFocus = useRef<string | null>(null);
  // Position of an entry that was just removed; focus moves to its neighbour (or the add button).
  const removedIndex = useRef<number | null>(null);

  useEffect(() => {
    const firstField = (id: string) =>
      listRef.current?.querySelector<HTMLElement>(
        `[data-item-id="${id}"] input, [data-item-id="${id}"] select, [data-item-id="${id}"] textarea`,
      );
    const id = pendingFocus.current;
    if (id) {
      const el = firstField(id);
      if (!el) return;
      pendingFocus.current = null;
      el.focus();
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const removed = removedIndex.current;
    if (removed === null) return;
    removedIndex.current = null;
    const neighbour = items[Math.min(removed, items.length - 1)];
    (neighbour ? firstField(neighbour.id) : addRef.current)?.focus();
  }, [items]);

  const atLimit = items.length >= maxItems;

  const add = () => {
    if (atLimit) return;
    pendingFocus.current = onAdd();
  };

  const removeNow = (id: string) => {
    const index = items.findIndex((i) => i.id === id);
    if (index < 0) return;
    removedIndex.current = index;
    onRemove(id);
  };

  const remove = (item: T) => {
    if (isFilled(item)) setPendingRemove(item.id);
    else removeNow(item.id);
  };

  return (
    <div>
      {items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-strong px-4 py-3 text-sm text-fg-muted">
          {emptyText}
        </p>
      ) : (
        <ol ref={listRef} className={compact ? "space-y-4 sm:space-y-2" : "space-y-3"}>
          {items.map((item, index) => {
            const rawTitle = getTitle(item).trim();
            const title = rawTitle || c.untitled;
            const name = `${itemLabel} ${index + 1}: ${title}`;
            const update = (patch: Partial<T>) => onUpdate(item.id, patch);
            const controls = (
              <div className="flex shrink-0 items-center" role="group" aria-label={name}>
                <button
                  type="button"
                  className={btn.icon}
                  onClick={() => onMove(item.id, -1)}
                  disabled={index === 0}
                  aria-label={`${c.moveUp}: ${title}`}
                  title={c.moveUp}
                >
                  <ArrowUp />
                </button>
                <button
                  type="button"
                  className={btn.icon}
                  onClick={() => onMove(item.id, 1)}
                  disabled={index === items.length - 1}
                  aria-label={`${c.moveDown}: ${title}`}
                  title={c.moveDown}
                >
                  <ArrowDown />
                </button>
                <button
                  type="button"
                  className={`${btn.icon} hover:!bg-danger-soft hover:!text-danger-text`}
                  onClick={() => remove(item)}
                  aria-label={`${c.remove}: ${title}`}
                  title={c.remove}
                >
                  <Trash />
                </button>
              </div>
            );

            return compact ? (
              <li key={item.id} data-item-id={item.id} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">{renderFields(item, update)}</div>
                {controls}
              </li>
            ) : (
              <li key={item.id} data-item-id={item.id} className="rounded-sm border border-line">
                <div className="flex items-center justify-between gap-2 border-b border-line py-1 pr-1 pl-4">
                  <h3 className="min-w-0 truncate text-sm font-medium text-fg">
                    <span aria-hidden="true" className="mr-2 font-mono text-xs text-fg-subtle tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="sr-only">{index + 1}. </span>
                    <span className={rawTitle ? undefined : "text-fg-muted"}>{title}</span>
                  </h3>
                  {controls}
                </div>
                <div className="p-4">{renderFields(item, update)}</div>
              </li>
            );
          })}
        </ol>
      )}
      <button ref={addRef} type="button" className={`${btn.secondary} mt-4`} onClick={add} disabled={atLimit}>
        <Plus /> {addLabel}
      </button>
      {atLimit && <p className="mt-2 text-xs text-fg-muted">{fmt(t.sections.listLimit, { max: maxItems })}</p>}
      <ConfirmDialog
        open={pendingRemove !== null}
        title={c.removeTitle}
        body={c.removeBody}
        confirmLabel={c.remove}
        cancelLabel={c.cancel}
        danger
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) removeNow(pendingRemove);
          setPendingRemove(null);
        }}
      />
    </div>
  );
}
