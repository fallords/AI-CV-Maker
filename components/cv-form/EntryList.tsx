"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmt, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "../ui/Dialog";
import { ArrowDown, ArrowUp, Plus, Trash } from "../ui/Icons";
import { prefersReducedMotion, useFlipList } from "../ui/motion";
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

/** How long an added entry keeps its entrance class (longer than the --motion-base transition). */
const ENTER_MS = 400;

/**
 * Generic editor for a list of entries: add, edit, remove (with confirmation
 * when the entry has content) and reorder with keyboard-accessible buttons.
 * State lives with the caller; this component only renders and reports intents.
 *
 * Motion answers the person's own actions only: an entry added with "Add" comes in
 * (entries already there when the list mounts never do), moved entries slide to their
 * new place, and removal is instant.
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
  // Entry whose move button was just pressed; focus stays on that button (or the other one
  // once the entry reaches the top or bottom), even when the browser moves its element.
  const pendingMove = useRef<{ id: string; direction: -1 | 1 } | null>(null);
  // Entry that was just added with "Add" and is coming in.
  const [entering, setEntering] = useState<string | null>(null);

  useFlipList(
    listRef,
    items.map((item) => item.id),
  );

  useEffect(() => {
    if (entering === null) return;
    const timer = window.setTimeout(() => setEntering(null), ENTER_MS);
    return () => window.clearTimeout(timer);
  }, [entering]);

  useEffect(() => {
    const firstField = (id: string) =>
      listRef.current?.querySelector<HTMLElement>(
        `[data-item-id="${id}"] input, [data-item-id="${id}"] select, [data-item-id="${id}"] textarea`,
      );
    const moved = pendingMove.current;
    if (moved) {
      pendingMove.current = null;
      const row = listRef.current?.querySelector<HTMLElement>(`[data-item-id="${moved.id}"]`);
      const same = row?.querySelector<HTMLButtonElement>(`[data-move="${moved.direction}"]`);
      const other = row?.querySelector<HTMLButtonElement>(`[data-move="${-moved.direction}"]`);
      const target = same && !same.disabled ? same : other && !other.disabled ? other : null;
      if (target && document.activeElement !== target) target.focus();
      return;
    }
    const id = pendingFocus.current;
    if (id) {
      const el = firstField(id);
      if (!el) return;
      pendingFocus.current = null;
      el.focus();
      el.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
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
    const id = onAdd();
    pendingFocus.current = id;
    setEntering(id);
  };

  const move = (id: string, direction: -1 | 1) => {
    pendingMove.current = { id, direction };
    onMove(id, direction);
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
        <p className="max-w-[65ch] text-sm text-fg-muted">{emptyText}</p>
      ) : (
        <ol ref={listRef} className={compact ? "space-y-4 sm:space-y-2" : "space-y-4"}>
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
                  onClick={() => move(item.id, -1)}
                  data-move="-1"
                  disabled={index === 0}
                  aria-label={`${c.moveUp}: ${title}`}
                  title={c.moveUp}
                >
                  <ArrowUp />
                </button>
                <button
                  type="button"
                  className={btn.icon}
                  onClick={() => move(item.id, 1)}
                  data-move="1"
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

            const enter = item.id === entering ? "motion-enter" : "";
            return compact ? (
              <li key={item.id} data-item-id={item.id} data-flip-key={item.id} className={`flex items-end gap-2 ${enter}`}>
                <div className="min-w-0 flex-1">{renderFields(item, update)}</div>
                {controls}
              </li>
            ) : (
              // One light outline per entry, no inner rule: the title row and the fields share the box.
              <li
                key={item.id}
                data-item-id={item.id}
                data-flip-key={item.id}
                className={`rounded-[3px] border border-line-strong bg-surface ${enter}`}
              >
                <div className="flex items-center justify-between gap-2 py-1 pr-1 pl-4">
                  <h3 className="min-w-0 truncate text-sm font-semibold text-fg">
                    <span className="sr-only">{index + 1}. </span>
                    <span className={rawTitle ? undefined : "font-normal text-fg-muted"}>{title}</span>
                  </h3>
                  {controls}
                </div>
                <div className="px-4 pt-1 pb-4">{renderFields(item, update)}</div>
              </li>
            );
          })}
        </ol>
      )}
      <button ref={addRef} type="button" className={`${btn.secondary} mt-4`} onClick={add} disabled={atLimit}>
        <Plus /> {addLabel}
      </button>
      {atLimit && <p className="mt-2 text-sm text-fg-muted">{fmt(t.sections.listLimit, { max: maxItems })}</p>}
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
