"use client";

import { joinNonEmpty } from "@/lib/cv-format";
import { LANGUAGE_LEVELS, type LanguageLevel } from "@/lib/cv-schema";
import { isValidEmail, isValidMonthRange } from "@/lib/cv-validation";
import { useI18n } from "@/lib/i18n";
import { CheckboxField, SelectField, TextAreaField, TextField } from "../ui/Field";
import { MonthField } from "../ui/MonthField";
import { RepeatableSection } from "./RepeatableSection";
import type { SectionProps } from "./types";

/* Editors for the sections added in schema v2: languages, organizations, awards, references, interests. */

function Intro({ children }: { children: string }) {
  return <p className="mb-4 max-w-[65ch] text-sm text-fg-muted">{children}</p>;
}

export function LanguagesSection(props: SectionProps) {
  const { t } = useI18n();
  const f = t.sections.languages;
  return (
    <RepeatableSection
      {...props}
      compact
      section="languages"
      addLabel={f.add}
      emptyText={f.empty}
      itemLabel={f.item}
      getTitle={(l) => l.name}
      renderFields={(l, update) => (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <TextField
            field="name"
            label={f.name}
            placeholder={f.namePlaceholder}
            value={l.name}
            onChange={(v) => update({ name: v })}
          />
          <SelectField<LanguageLevel>
            label={f.level}
            value={l.level}
            onChange={(v) => update({ level: v })}
            options={LANGUAGE_LEVELS.map((level) => ({ value: level, label: f.levels[level] }))}
          />
        </div>
      )}
    />
  );
}

export function OrganizationsSection(props: SectionProps) {
  const { t } = useI18n();
  const f = t.sections.organizations;
  return (
    <div>
      <Intro>{f.intro}</Intro>
      <RepeatableSection
        {...props}
        section="organizations"
        addLabel={f.add}
        emptyText={f.empty}
        itemLabel={f.item}
        getTitle={(o) => joinNonEmpty([o.role, o.organization], ", ")}
        renderFields={(o, update) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              field="role"
              label={f.role}
              placeholder={f.rolePlaceholder}
              value={o.role}
              onChange={(v) => update({ role: v })}
            />
            <TextField
              field="organization"
              label={f.organization}
              value={o.organization}
              onChange={(v) => update({ organization: v })}
            />
            <TextField
              field="location"
              className="sm:col-span-2"
              label={f.location}
              value={o.location}
              onChange={(v) => update({ location: v })}
            />
            <MonthField
              field="startDate"
              label={f.startDate}
              value={o.startDate}
              onChange={(v) => update({ startDate: v })}
            />
            <MonthField
              field="endDate"
              label={f.endDate}
              value={o.current ? "" : o.endDate}
              disabled={o.current}
              onChange={(v) => update({ endDate: v })}
              error={!o.current && !isValidMonthRange(o.startDate, o.endDate) ? t.form.errors.dateOrder : null}
            />
            <CheckboxField
              className="sm:col-span-2"
              label={f.current}
              checked={o.current}
              onChange={(v) => update({ current: v })}
            />
            <TextAreaField
              field="description"
              className="sm:col-span-2"
              label={f.description}
              hint={f.descriptionHint}
              rows={4}
              value={o.description}
              onChange={(v) => update({ description: v })}
            />
          </div>
        )}
      />
    </div>
  );
}

export function AwardsSection(props: SectionProps) {
  const { t } = useI18n();
  const f = t.sections.awards;
  return (
    <RepeatableSection
      {...props}
      section="awards"
      addLabel={f.add}
      emptyText={f.empty}
      itemLabel={f.item}
      getTitle={(a) => a.title}
      renderFields={(a, update) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            field="title"
            className="sm:col-span-2"
            label={f.name}
            placeholder={f.namePlaceholder}
            value={a.title}
            onChange={(v) => update({ title: v })}
          />
          <TextField field="issuer" label={f.issuer} value={a.issuer} onChange={(v) => update({ issuer: v })} />
          <MonthField field="date" label={f.date} value={a.date} onChange={(v) => update({ date: v })} />
          <TextAreaField
            field="description"
            className="sm:col-span-2"
            label={f.description}
            hint={f.descriptionHint}
            rows={2}
            value={a.description}
            onChange={(v) => update({ description: v })}
          />
        </div>
      )}
    />
  );
}

export function ReferencesSection(props: SectionProps) {
  const { t } = useI18n();
  const f = t.sections.references;
  return (
    <div>
      <Intro>{f.intro}</Intro>
      <RepeatableSection
        {...props}
        section="references"
        addLabel={f.add}
        emptyText={f.empty}
        itemLabel={f.item}
        getTitle={(r) => joinNonEmpty([r.name, r.organization], ", ")}
        renderFields={(r, update) => (
          // autoComplete="off": these are someone else's details, not the user's own.
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              field="name"
              label={f.name}
              value={r.name}
              onChange={(v) => update({ name: v })}
              autoComplete="off"
            />
            <TextField
              field="relationship"
              label={f.relationship}
              placeholder={f.relationshipPlaceholder}
              value={r.relationship}
              onChange={(v) => update({ relationship: v })}
            />
            <TextField
              field="position"
              label={f.position}
              value={r.position}
              onChange={(v) => update({ position: v })}
            />
            <TextField
              field="organization"
              label={f.organization}
              value={r.organization}
              onChange={(v) => update({ organization: v })}
            />
            <TextField
              field="email"
              label={f.email}
              type="email"
              inputMode="email"
              autoComplete="off"
              value={r.email}
              onChange={(v) => update({ email: v })}
              error={r.email.trim() && !isValidEmail(r.email) ? t.form.errors.email : null}
            />
            <TextField
              field="phone"
              label={f.phone}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={r.phone}
              onChange={(v) => update({ phone: v })}
            />
          </div>
        )}
      />
    </div>
  );
}

export function InterestsSection(props: SectionProps) {
  const { t } = useI18n();
  const f = t.sections.interests;
  return (
    <div>
      <Intro>{f.intro}</Intro>
      <RepeatableSection
        {...props}
        compact
        section="interests"
        addLabel={f.add}
        emptyText={f.empty}
        itemLabel={f.item}
        getTitle={(i) => i.name}
        renderFields={(i, update) => (
          <TextField
            field="name"
            label={f.name}
            placeholder={f.namePlaceholder}
            value={i.name}
            maxLength={120}
            onChange={(v) => update({ name: v })}
          />
        )}
      />
    </div>
  );
}
