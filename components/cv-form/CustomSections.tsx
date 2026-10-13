"use client";

import { useId, useRef, useState, type Dispatch, type FormEvent, type Ref } from "react";
import type { CVAction } from "@/lib/cv-reducer";
import { joinNonEmpty } from "@/lib/cv-format";
import {
  MAX_CUSTOM_ITEMS,
  MAX_CUSTOM_SECTIONS,
  createId,
  isItemFilled,
  type CustomItem,
  type CustomSection,
} from "@/lib/cv-schema";
import { isValidMonthRange } from "@/lib/cv-validation";
import { fmt, useI18n } from "@/lib/i18n";
import { Dialog } from "../ui/Dialog";
import { TextAreaField, TextField } from "../ui/Field";
import { Plus } from "../ui/Icons";
import { MonthField } from "../ui/MonthField";
import { btn } from "../ui/styles";
import { EntryList } from "./EntryList";
import { titleExists } from "./section-titles";
import type { SectionProps } from "./types";

/** Section titles are headings, so keep them short (sanitizeCV allows up to 300 characters). */
export const MAX_SECTION_TITLE = 80;

/** Editor for one user-defined section: its title and its entries. */
export function CustomSectionEditor({
  section,
  dispatch,
}: {
  section: CustomSection;
  dispatch: Dispatch<CVAction>;
}) {
  const { t } = useI18n();
  const f = t.sections.custom;
  const sectionId = section.id;
  return (
    <div className="space-y-5">
      <TextField
        label={f.sectionTitle}
        hint={f.sectionTitleHint}
        value={section.title}
        maxLength={MAX_SECTION_TITLE}
        onChange={(title) => dispatch({ type: "renameCustomSection", id: sectionId, title })}
        error={section.title.trim() ? null : f.titleRequired}
      />
      <EntryList<CustomItem>
        items={section.items}
        addLabel={f.add}
        emptyText={f.empty}
        itemLabel={f.item}
        maxItems={MAX_CUSTOM_ITEMS}
        getTitle={(item) => joinNonEmpty([item.title, item.subtitle], " · ")}
        isFilled={isItemFilled}
        onAdd={() => {
          const id = createId();
          dispatch({ type: "addCustomItem", sectionId, id });
          return id;
        }}
        onUpdate={(id, patch) => dispatch({ type: "updateCustomItem", sectionId, id, patch })}
        onRemove={(id) => dispatch({ type: "removeCustomItem", sectionId, id })}
        onMove={(id, direction) => dispatch({ type: "moveCustomItem", sectionId, id, direction })}
        renderFields={(item, update) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={f.title} value={item.title} onChange={(v) => update({ title: v })} />
            <TextField
              label={f.subtitle}
              hint={f.subtitleHint}
              value={item.subtitle}
              onChange={(v) => update({ subtitle: v })}
            />
            <MonthField label={f.startDate} value={item.startDate} onChange={(v) => update({ startDate: v })} />
            <MonthField
              label={f.endDate}
              value={item.endDate}
              onChange={(v) => update({ endDate: v })}
              error={!isValidMonthRange(item.startDate, item.endDate) ? t.form.errors.dateOrder : null}
            />
            <TextAreaField
              className="sm:col-span-2"
              label={f.description}
              hint={f.descriptionHint}
              rows={3}
              value={item.description}
              onChange={(v) => update({ description: v })}
            />
          </div>
        )}
      />
    </div>
  );
}

/**
 * "Add custom section" block: a button that opens a dialog asking for the title.
 * The new section starts with one empty entry; `onAdded` receives both ids so the
 * caller can move focus into it.
 */
export function AddCustomSection({
  cv,
  dispatch,
  onAdded,
  buttonRef,
}: SectionProps & {
  onAdded: (sectionId: string, itemId: string) => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const { t } = useI18n();
  const f = t.sections.addCustom;
  const formId = useId();
  const inputWrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [showError, setShowError] = useState(false);
  const atLimit = cv.customSections.length >= MAX_CUSTOM_SECTIONS;

  const start = () => {
    setTitle("");
    setShowError(false);
    setOpen(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) {
      setShowError(true);
      inputWrap.current?.querySelector("input")?.focus();
      return;
    }
    if (atLimit) return;
    const sectionId = createId();
    const itemId = createId();
    dispatch({ type: "addCustomSection", id: sectionId, title: clean });
    dispatch({ type: "addCustomItem", sectionId, id: itemId });
    setOpen(false);
    onAdded(sectionId, itemId);
  };

  const duplicate = titleExists(cv, title, t);

  return (
    <div className="border-t border-line pt-6 pb-8">
      <h2 className="font-display text-lg font-semibold text-fg">{f.title}</h2>
      <p className="mt-1 max-w-[65ch] text-sm text-fg-muted">{f.body}</p>
      <button ref={buttonRef} type="button" className={`${btn.secondary} mt-4`} onClick={start} disabled={atLimit}>
        <Plus /> {f.button}
      </button>
      {atLimit && <p className="mt-2 text-xs text-fg-muted">{fmt(f.limit, { max: MAX_CUSTOM_SECTIONS })}</p>}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={f.dialogTitle}
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setOpen(false)}>
              {f.cancel}
            </button>
            <button type="submit" form={formId} className={btn.primary}>
              {f.confirm}
            </button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} noValidate>
          <div ref={inputWrap}>
            <TextField
              label={f.label}
              placeholder={f.placeholder}
              value={title}
              maxLength={MAX_SECTION_TITLE}
              onChange={(v) => {
                setTitle(v);
                if (v.trim()) setShowError(false);
              }}
              hint={duplicate ? fmt(f.existing, { title: title.trim() }) : undefined}
              error={showError ? f.required : null}
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
