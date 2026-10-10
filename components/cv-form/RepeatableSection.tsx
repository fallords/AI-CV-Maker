"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createId, isItemFilled, type ListItem, type ListSection } from "@/lib/cv-schema";
import { useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "../ui/Dialog";
import { ArrowDown, ArrowUp, Plus, Trash } from "../ui/Icons";
import { btn } from "../ui/styles";
import type { SectionProps } from "./types";

/**
 * Generic editor for a list of entries: add, edit, remove (with confirmation
 * when the entry has content) and reorder with keyboard-accessible buttons.
 */
export function RepeatableSection<S extends ListSection>({
  cv,
  dispatch,
  section,
  addLabel,
  emptyText,
  itemLabel,
  getTitle,
  renderFields,
  compact = false,
}: SectionProps & {
  section: S;
  addLabel: string;
  emptyText: string;
  itemLabel: string;
  getTitle: (item: ListItem<S>) => string;
  renderFields: (item: ListItem<S>, update: (patch: Partial<ListItem<S>>) => void) => ReactNode;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const items = cv[section] as ListItem<S>[];
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // Move focus into a newly added entry so keyboard and screen reader users land there.
  useEffect(() => {
    if (!focusId) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-item-id="${focusId}"] input, [data-item-id="${focusId}"] select`,
    );
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId, items.length]);

  const add = () => {
    const id = createId();
    dispatch({ type: "addItem", section, id });
    setFocusId(id);
  };

  const remove = (item: ListItem<S>) => {
    if (isItemFilled(item)) setPendingRemove(item.id);
    else dispatch({ type: "removeItem", section, id: item.id });
  };

  const c = t.form.itemControls;

  return (
    <div>
      {items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-strong px-4 py-3 text-sm text-fg-muted">
          {emptyText}
        </p>
      ) : (
        <ol ref={listRef} className={compact ? "space-y-2" : "space-y-3"}>
          {items.map((item, index) => {
            const rawTitle = getTitle(item).trim();
            const title = rawTitle || c.untitled;
            const name = `${itemLabel} ${index + 1}: ${title}`;
            const controls = (
              <div className="flex shrink-0 items-center" role="group" aria-label={name}>
                <button
                  type="button"
                  className={btn.icon}
                  onClick={() => dispatch({ type: "moveItem", section, id: item.id, direction: -1 })}
                  disabled={index === 0}
                  aria-label={`${c.moveUp}: ${title}`}
                  title={c.moveUp}
                >
                  <ArrowUp />
                </button>
                <button
                  type="button"
                  className={btn.icon}
                  onClick={() => dispatch({ type: "moveItem", section, id: item.id, direction: 1 })}
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
            const update = (patch: Partial<ListItem<S>>) =>
              dispatch({ type: "updateItem", section, id: item.id, patch: patch as Record<string, unknown> });

            return compact ? (
              <li key={item.id} data-item-id={item.id} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">{renderFields(item, update)}</div>
                {controls}
              </li>
            ) : (
              <li key={item.id} data-item-id={item.id} className="rounded-sm border border-line">
                <div className="flex items-center justify-between gap-2 border-b border-line py-1 pr-1 pl-4">
                  <h4 className="min-w-0 truncate text-sm font-medium text-fg">
                    <span aria-hidden="true" className="mr-2 font-mono text-xs text-fg-subtle tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="sr-only">{index + 1}. </span>
                    <span className={rawTitle ? undefined : "text-fg-muted"}>{title}</span>
                  </h4>
                  {controls}
                </div>
                <div className="p-4">{renderFields(item, update)}</div>
              </li>
            );
          })}
        </ol>
      )}
      <button type="button" className={`${btn.secondary} mt-4`} onClick={add}>
        <Plus /> {addLabel}
      </button>
      <ConfirmDialog
        open={pendingRemove !== null}
        title={c.removeTitle}
        body={c.removeBody}
        confirmLabel={c.remove}
        cancelLabel={c.cancel}
        danger
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) dispatch({ type: "removeItem", section, id: pendingRemove });
          setPendingRemove(null);
        }}
      />
    </div>
  );
}
