/**
 * Building blocks shared by every CV template. All of them return null when their
 * data is empty, so empty sections are omitted from the CV automatically.
 */

import type { ReactNode } from "react";
import { CV_LABELS, formatMonth, formatRange, joinNonEmpty, toBlocks, type CVLabels } from "@/lib/cv-format";
import { filledItems, type CVData, type SkillItem } from "@/lib/cv-schema";
import { displayUrl, safeHref } from "@/lib/cv-validation";

export type SectionKey = "summary" | "experience" | "education" | "projects" | "skills" | "certifications";

export interface TemplateProps {
  cv: CVData;
}

export function labelsFor(cv: CVData): CVLabels {
  return CV_LABELS[cv.meta.cvLanguage];
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = toBlocks(text);
  if (blocks.length === 0) return null;
  return (
    <div className={className ? `cv-rich ${className}` : "cv-rich"}>
      {blocks.map((b, i) =>
        b.kind === "p" ? (
          <p key={i}>{b.text}</p>
        ) : (
          <ul key={i}>
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

export function MaybeLink({ value, children }: { value: string; children?: ReactNode }) {
  const href = safeHref(value);
  const content = children ?? displayUrl(value);
  return href ? <a href={href}>{content}</a> : <>{content}</>;
}

/** Contact details in a fixed order; the caller decides layout via className. */
export function ContactItems({ cv, className }: { cv: CVData; className?: string }) {
  const p = cv.personal;
  const items: ReactNode[] = [];
  const location = joinNonEmpty([p.city, p.country]);
  if (p.email.trim())
    items.push(
      <a key="email" href={`mailto:${p.email.trim()}`}>
        {p.email.trim()}
      </a>,
    );
  if (p.phone.trim()) items.push(<span key="phone">{p.phone.trim()}</span>);
  if (location) items.push(<span key="loc">{location}</span>);
  if (p.linkedin.trim()) items.push(<MaybeLink key="li" value={p.linkedin} />);
  if (p.website.trim()) items.push(<MaybeLink key="web" value={p.website} />);
  if (items.length === 0) return null;
  return (
    <ul className={`cv-contact ${className ?? ""}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * A section whose heading is kept on the same page as its first entry
 * (headings never end up alone at the bottom of a page).
 */
export function Section({ id, title, children }: { id: SectionKey; title: string; children: ReactNode[] }) {
  if (children.length === 0) return null;
  const [first, ...rest] = children;
  return (
    <section className={`cv-section cv-section-${id}`} aria-label={title}>
      <div className="cv-keep">
        <h2 className="cv-heading">{title}</h2>
        {first}
      </div>
      {rest}
    </section>
  );
}

function EntryHead({ title, sub, date }: { title: string; sub?: string; date?: string }) {
  return (
    <div className="cv-entry-head">
      <div className="cv-entry-titles">
        {title && <h3 className="cv-entry-title">{title}</h3>}
        {sub && <p className="cv-entry-sub">{sub}</p>}
      </div>
      {date && <p className="cv-entry-date">{date}</p>}
    </div>
  );
}

export function SummarySection({ cv }: TemplateProps) {
  if (!cv.summary.trim()) return null;
  return (
    <Section id="summary" title={labelsFor(cv).summary}>
      {[<RichText key="s" text={cv.summary} />]}
    </Section>
  );
}

export function ExperienceSection({ cv }: TemplateProps) {
  const l = labelsFor(cv);
  const lang = cv.meta.cvLanguage;
  const items = filledItems(cv, "experience").map((e) => (
    <article key={e.id} className="cv-entry">
      <EntryHead
        title={e.jobTitle || e.company}
        sub={joinNonEmpty([e.jobTitle ? e.company : "", e.location], " · ")}
        date={formatRange(e.startDate, e.endDate, lang, e.current)}
      />
      <RichText text={e.description} />
    </article>
  ));
  return (
    <Section id="experience" title={l.experience}>
      {items}
    </Section>
  );
}

export function EducationSection({ cv }: TemplateProps) {
  const l = labelsFor(cv);
  const lang = cv.meta.cvLanguage;
  const items = filledItems(cv, "education").map((e) => {
    const degree = joinNonEmpty([e.degree, e.field]);
    return (
      <article key={e.id} className="cv-entry">
        <EntryHead
          title={degree || e.institution}
          sub={degree ? e.institution : ""}
          date={formatRange(e.startDate, e.endDate, lang)}
        />
        <RichText text={e.description} />
      </article>
    );
  });
  return (
    <Section id="education" title={l.education}>
      {items}
    </Section>
  );
}

export function ProjectsSection({ cv }: TemplateProps) {
  const l = labelsFor(cv);
  const items = filledItems(cv, "projects").map((p) => (
    <article key={p.id} className="cv-entry">
      <EntryHead title={p.name} sub={p.role ? `${l.role}: ${p.role}` : ""} />
      <RichText text={p.description} />
      {(p.technologies.trim() || p.url.trim()) && (
        <p className="cv-meta-line">
          {p.technologies.trim() && (
            <span>
              <span className="cv-meta-label">{l.technologies}:</span> {p.technologies.trim()}
            </span>
          )}
          {p.technologies.trim() && p.url.trim() && <span className="cv-sep"> · </span>}
          {p.url.trim() && <MaybeLink value={p.url} />}
        </p>
      )}
    </article>
  ));
  return (
    <Section id="projects" title={l.projects}>
      {items}
    </Section>
  );
}

function skillText(s: SkillItem, l: CVLabels): string {
  return s.level ? `${s.name.trim()} (${l.levels[s.level]})` : s.name.trim();
}

/** "list": label + comma-separated line (ATS friendly). "chips": scannable tags. */
export function SkillsSection({ cv, variant = "list" }: TemplateProps & { variant?: "list" | "chips" }) {
  const l = labelsFor(cv);
  const groups = [
    { key: "tech", label: l.technicalSkills, items: filledItems(cv, "technicalSkills").filter((s) => s.name.trim()) },
    { key: "soft", label: l.softSkills, items: filledItems(cv, "softSkills").filter((s) => s.name.trim()) },
  ].filter((g) => g.items.length > 0);

  const rows = groups.map((g) =>
    variant === "chips" ? (
      <div key={g.key} className="cv-skill-group">
        <h3 className="cv-skill-label">{g.label}</h3>
        <ul className="cv-chips">
          {g.items.map((s) => (
            <li key={s.id}>{skillText(s, l)}</li>
          ))}
        </ul>
      </div>
    ) : (
      <p key={g.key} className="cv-skill-line">
        <span className="cv-meta-label">{g.label}:</span> {g.items.map((s) => skillText(s, l)).join(", ")}
      </p>
    ),
  );
  return (
    <Section id="skills" title={l.skills}>
      {rows}
    </Section>
  );
}

export function CertificationsSection({ cv, compact = false }: TemplateProps & { compact?: boolean }) {
  const l = labelsFor(cv);
  const lang = cv.meta.cvLanguage;
  const items = filledItems(cv, "certifications").map((c) => {
    const credential = c.credential.trim();
    const credentialNode = credential ? (
      safeHref(credential) && /[./]/.test(credential) ? (
        <MaybeLink value={credential} />
      ) : (
        <span>
          {l.credential}: {credential}
        </span>
      )
    ) : null;
    return compact ? (
      <article key={c.id} className="cv-entry cv-entry-compact">
        <p>
          <strong className="cv-entry-title-inline">{c.name}</strong>
          {c.issuer.trim() && <span> · {c.issuer.trim()}</span>}
          {c.issueDate && <span> · {formatMonth(c.issueDate, lang)}</span>}
          {credentialNode && <span className="cv-sep"> · </span>}
          {credentialNode}
        </p>
      </article>
    ) : (
      <article key={c.id} className="cv-entry">
        <EntryHead title={c.name || c.issuer} sub={c.name ? c.issuer : ""} date={formatMonth(c.issueDate, lang)} />
        {credentialNode && <p className="cv-meta-line">{credentialNode}</p>}
      </article>
    );
  });
  return (
    <Section id="certifications" title={l.certifications}>
      {items}
    </Section>
  );
}

export const SECTION_RENDERERS: Record<SectionKey, (props: TemplateProps) => ReactNode> = {
  summary: SummarySection,
  experience: ExperienceSection,
  education: EducationSection,
  projects: ProjectsSection,
  skills: SkillsSection,
  certifications: CertificationsSection,
};
