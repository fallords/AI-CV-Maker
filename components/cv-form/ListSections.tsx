"use client";

import { joinNonEmpty } from "@/lib/cv-format";
import { SKILL_LEVELS, type ListSection, type SkillLevel } from "@/lib/cv-schema";
import { isValidMonthRange, isValidUrl } from "@/lib/cv-validation";
import { useI18n } from "@/lib/i18n";
import { CheckboxField, SelectField, TextAreaField, TextField } from "../ui/Field";
import { MonthField } from "../ui/MonthField";
import { RepeatableSection } from "./RepeatableSection";
import type { SectionProps } from "./types";

export function ExperienceSection(props: SectionProps) {
  const { t } = useI18n();
  const f = t.form.experience;
  return (
    <RepeatableSection
      {...props}
      section="experience"
      addLabel={f.add}
      emptyText={f.empty}
      itemLabel={f.item}
      getTitle={(e) => joinNonEmpty([e.jobTitle, e.company], " · ")}
      renderFields={(e, update) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={f.jobTitle} value={e.jobTitle} onChange={(v) => update({ jobTitle: v })} />
          <TextField label={f.company} value={e.company} onChange={(v) => update({ company: v })} />
          <TextField
            className="sm:col-span-2"
            label={f.location}
            value={e.location}
            onChange={(v) => update({ location: v })}
          />
          <MonthField label={f.startDate} value={e.startDate} onChange={(v) => update({ startDate: v })} />
          <MonthField
            label={f.endDate}
            value={e.current ? "" : e.endDate}
            disabled={e.current}
            onChange={(v) => update({ endDate: v })}
            error={!e.current && !isValidMonthRange(e.startDate, e.endDate) ? t.form.errors.dateOrder : null}
          />
          <CheckboxField
            className="sm:col-span-2"
            label={f.current}
            checked={e.current}
            onChange={(v) => update({ current: v })}
          />
          <TextAreaField
            className="sm:col-span-2"
            label={f.description}
            hint={f.descriptionHint}
            rows={5}
            value={e.description}
            onChange={(v) => update({ description: v })}
          />
        </div>
      )}
    />
  );
}

export function EducationSection(props: SectionProps) {
  const { t } = useI18n();
  const f = t.form.education;
  return (
    <RepeatableSection
      {...props}
      section="education"
      addLabel={f.add}
      emptyText={f.empty}
      itemLabel={f.item}
      getTitle={(e) => joinNonEmpty([e.institution, e.degree], " · ")}
      renderFields={(e, update) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            label={f.institution}
            value={e.institution}
            onChange={(v) => update({ institution: v })}
          />
          <TextField label={f.degree} value={e.degree} onChange={(v) => update({ degree: v })} />
          <TextField label={f.field} value={e.field} onChange={(v) => update({ field: v })} />
          <MonthField label={f.startDate} value={e.startDate} onChange={(v) => update({ startDate: v })} />
          <MonthField
            label={f.endDate}
            value={e.endDate}
            onChange={(v) => update({ endDate: v })}
            error={!isValidMonthRange(e.startDate, e.endDate) ? t.form.errors.dateOrder : null}
          />
          <TextAreaField
            className="sm:col-span-2"
            label={f.description}
            hint={f.descriptionHint}
            rows={3}
            value={e.description}
            onChange={(v) => update({ description: v })}
          />
        </div>
      )}
    />
  );
}

export function ProjectsSection(props: SectionProps) {
  const { t } = useI18n();
  const f = t.form.projects;
  return (
    <RepeatableSection
      {...props}
      section="projects"
      addLabel={f.add}
      emptyText={f.empty}
      itemLabel={f.item}
      getTitle={(p) => p.name}
      renderFields={(p, update) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={f.name} value={p.name} onChange={(v) => update({ name: v })} />
          <TextField label={f.role} value={p.role} onChange={(v) => update({ role: v })} />
          <TextAreaField
            className="sm:col-span-2"
            label={f.description}
            hint={f.descriptionHint}
            rows={4}
            value={p.description}
            onChange={(v) => update({ description: v })}
          />
          <TextField
            label={f.technologies}
            placeholder={f.technologiesPlaceholder}
            value={p.technologies}
            onChange={(v) => update({ technologies: v })}
          />
          <TextField
            label={f.url}
            type="url"
            inputMode="url"
            value={p.url}
            onChange={(v) => update({ url: v })}
            error={p.url.trim() && !isValidUrl(p.url) ? t.form.errors.url : null}
          />
        </div>
      )}
    />
  );
}

function SkillList(props: SectionProps & { section: Extract<ListSection, "technicalSkills" | "softSkills"> }) {
  const { t } = useI18n();
  const f = t.form.skills;
  const technical = props.section === "technicalSkills";
  return (
    <RepeatableSection
      {...props}
      compact
      addLabel={technical ? f.addTechnical : f.addSoft}
      emptyText={technical ? f.emptyTechnical : f.emptySoft}
      itemLabel={f.item}
      getTitle={(s) => s.name}
      renderFields={(s, update) => (
        <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_11rem]">
          <TextField label={f.name} value={s.name} onChange={(v) => update({ name: v })} />
          <SelectField<SkillLevel>
            label={f.level}
            value={s.level}
            onChange={(v) => update({ level: v })}
            options={SKILL_LEVELS.map((l) => ({ value: l, label: f.levels[l] }))}
          />
        </div>
      )}
    />
  );
}

export function SkillsSection(props: SectionProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-stone-800">{t.form.skills.technical}</h3>
        <SkillList {...props} section="technicalSkills" />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-stone-800">{t.form.skills.soft}</h3>
        <SkillList {...props} section="softSkills" />
      </div>
    </div>
  );
}

export function CertificationsSection(props: SectionProps) {
  const { t } = useI18n();
  const f = t.form.certifications;
  return (
    <RepeatableSection
      {...props}
      section="certifications"
      addLabel={f.add}
      emptyText={f.empty}
      itemLabel={f.item}
      getTitle={(c) => c.name}
      renderFields={(c, update) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            label={f.name}
            value={c.name}
            onChange={(v) => update({ name: v })}
          />
          <TextField label={f.issuer} value={c.issuer} onChange={(v) => update({ issuer: v })} />
          <MonthField label={f.issueDate} value={c.issueDate} onChange={(v) => update({ issueDate: v })} />
          <TextField
            className="sm:col-span-2"
            label={f.credential}
            value={c.credential}
            onChange={(v) => update({ credential: v })}
          />
        </div>
      )}
    />
  );
}
