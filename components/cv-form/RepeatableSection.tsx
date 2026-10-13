"use client";

import type { ReactNode } from "react";
import { createId, isItemFilled, type ListItem, type ListSection } from "@/lib/cv-schema";
import { EntryList } from "./EntryList";
import type { SectionProps } from "./types";

/**
 * Editor for one of the CV's built-in lists (experience, languages, …): EntryList
 * wired to the CV reducer's generic list actions.
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
  return (
    <EntryList<ListItem<S>>
      items={cv[section] as ListItem<S>[]}
      addLabel={addLabel}
      emptyText={emptyText}
      itemLabel={itemLabel}
      getTitle={getTitle}
      isFilled={isItemFilled}
      renderFields={renderFields}
      compact={compact}
      onAdd={() => {
        const id = createId();
        dispatch({ type: "addItem", section, id });
        return id;
      }}
      onUpdate={(id, patch) => dispatch({ type: "updateItem", section, id, patch: patch as Record<string, unknown> })}
      onRemove={(id) => dispatch({ type: "removeItem", section, id })}
      onMove={(id, direction) => dispatch({ type: "moveItem", section, id, direction })}
    />
  );
}
