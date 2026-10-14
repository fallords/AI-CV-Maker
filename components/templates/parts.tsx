/**
 * Building blocks shared by every CV template (and the cover letter, which reuses the
 * template headers). All of them return null when their data is empty, so empty
 * sections are omitted from the document automatically.
 */

import { Fragment, type ReactNode } from "react";
import { CV_LABELS, formatMonth, formatRange, joinNonEmpty, toBlocks, type CVLabels } from "@/lib/cv-format";
import {
  filledCustomItems,
  filledItems,
  type CVData,
  type CustomSection,
  type LanguageItem,
  type PersonalInfo,
  type SkillItem,
} from "@/lib/cv-schema";
import {
  customSectionKey,
  findCustomSection,
  isBuiltinSection,
  visibleSectionsInOrder,
  type BuiltinSectionKey,
  type SectionKey,
} from "@/lib/cv-sections";
import { displayUrl, safeHref } from "@/lib/cv-validation";
import type { DocStyle } from "@/lib/doc-style";
import { docRootProps } from "./style";

export type { SectionKey } from "@/lib/cv-sections";

export interface TemplateProps {
  cv: CVData;
}

/** How a template lists short items (skills, languages, interests) and certifications. */
export interface TemplateOptions {
  /** "list": label + comma-separated line (ATS friendly). "chips": scannable tags. */
  tags: "list" | "chips";
  /** One-line certification entries. */
  compactCertifications: boolean;
}

/** Contact fields shared by a CV's personal section and a letter's sender. */
export type ContactInfo = Pick<PersonalInfo, "email" | "phone" | "city" | "country" | "linkedin" | "website">;

/** What a template header shows. CVs pass their personal section, letters their sender. */
export interface HeaderProps {
  name: string;
  title: string;
  contact: ContactInfo;
  /** data: URL; only templates that show photos use it. */
  photo?: string;
}

export function labelsFor(cv: CVData): CVLabels {
  return CV_LABELS[cv.meta.cvLanguage] ?? CV_LABELS.en;
}

/** The `.cv-doc` root element with the template class and the document's appearance settings. */
export function DocRoot({
  templateClass,
  style,
  extraClass,
  children,
}: {
  templateClass: string;
  style: DocStyle | undefined;
  extraClass?: string;
  children: ReactNode;
}) {
  const props = docRootProps(templateClass, style, extraClass);
  return (
    <div className={props.className} style={props.style}>
      {children}
    </div>
  );
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

function MailLink({ email }: { email: string }) {
  const value = email.trim();
  return <a href={`mailto:${value}`}>{value}</a>;
}

/** Contact details in a fixed order; the caller decides layout via className. */
export function ContactItems({ contact, className }: { contact: ContactInfo; className?: string }) {
  const p = contact;
  const items: ReactNode[] = [];
  const location = joinNonEmpty([p.city, p.country]);
  if (p.email.trim()) items.push(<MailLink key="email" email={p.email} />);
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
export function Section({
  id,
  sectionKey,
  title,
  children,
}: {
  /** Class suffix: the built-in key, or "custom". */
  id: string;
  sectionKey: SectionKey;
  title: string;
  children: ReactNode[];
}) {
  if (children.length === 0) return null;
  const [first, ...rest] = children;
  return (
    <section className={`cv-section cv-section-${id}`} aria-label={title} data-section={sectionKey}>
      <div className="cv-keep">
        <h2 className="cv-heading">{title}</h2>
        {first}
      </div>
      {rest}
    </section>
  );
}

function EntryHead({ title, sub, date }: { title: string; sub?: string; date?: string }) {
  const t = title.trim();
  const s = sub?.trim() ?? "";
  const d = date?.trim() ?? "";
  if (!t && !s && !d) return null;
  return (
    <div className="cv-entry-head">
      <div className="cv-entry-titles">
        {t && <h3 className="cv-entry-title">{t}</h3>}
        {s && <p className="cv-entry-sub">{s}</p>}
      </div>
      {d && <p className="cv-entry-date">{d}</p>}
    </div>
  );
}

/** First non-blank value, trimmed. */
function firstOf(...values: string[]): string {
  for (const v of values) if (v.trim()) return v.trim();
  return "";
}

export function SummarySection({ cv }: TemplateProps) {
  if (!cv.summary.trim()) return null;
  return (
    <Section id="summary" sectionKey="summary" title={labelsFor(cv).summary}>
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
        title={firstOf(e.jobTitle, e.company)}
        sub={joinNonEmpty([e.jobTitle.trim() ? e.company : "", e.location], " · ")}
        date={formatRange(e.startDate, e.endDate, lang, e.current)}
      />
      <RichText text={e.description} />
    </article>
  ));
  return (
    <Section id="experience" sectionKey="experience" title={l.experience}>
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
    <Section id="education" sectionKey="education" title={l.education}>
      {items}
    </Section>
  );
}

export function ProjectsSection({ cv }: TemplateProps) {
  const l = labelsFor(cv);
  const items = filledItems(cv, "projects").map((p) => (
    <article key={p.id} className="cv-entry">
      <EntryHead title={p.name} sub={p.role.trim() ? `${l.role}: ${p.role.trim()}` : ""} />
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
    <Section id="projects" sectionKey="projects" title={l.projects}>
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
    <Section id="skills" sectionKey="skills" title={l.skills}>
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
        <EntryHead
          title={firstOf(c.name, c.issuer)}
          sub={c.name.trim() ? c.issuer : ""}
          date={formatMonth(c.issueDate, lang)}
        />
        {credentialNode && <p className="cv-meta-line">{credentialNode}</p>}
      </article>
    );
  });
  return (
    <Section id="certifications" sectionKey="certifications" title={l.certifications}>
      {items}
    </Section>
  );
}

/** Organisations, student bodies and volunteering: laid out like work experience. */
export function OrganizationsSection({ cv }: TemplateProps) {
  const l = labelsFor(cv);
  const lang = cv.meta.cvLanguage;
  const items = filledItems(cv, "organizations").map((o) => (
    <article key={o.id} className="cv-entry">
      <EntryHead
        title={firstOf(o.role, o.organization)}
        sub={joinNonEmpty([o.role.trim() ? o.organization : "", o.location], " · ")}
        date={formatRange(o.startDate, o.endDate, lang, o.current)}
      />
      <RichText text={o.description} />
    </article>
  ));
  return (
    <Section id="organizations" sectionKey="organizations" title={l.organizations}>
      {items}
    </Section>
  );
}

export function AwardsSection({ cv }: TemplateProps) {
  const l = labelsFor(cv);
  const lang = cv.meta.cvLanguage;
  const items = filledItems(cv, "awards").map((a) => (
    <article key={a.id} className="cv-entry">
      <EntryHead
        title={firstOf(a.title, a.issuer)}
        sub={a.title.trim() ? a.issuer : ""}
        date={formatMonth(a.date, lang)}
      />
      <RichText text={a.description} />
    </article>
  ));
  return (
    <Section id="awards" sectionKey="awards" title={l.awards}>
      {items}
    </Section>
  );
}

export function ReferencesSection({ cv }: TemplateProps) {
  const l = labelsFor(cv);
  const items = filledItems(cv, "references").map((r) => {
    const position = joinNonEmpty([r.position, r.organization]);
    const details: ReactNode[] = [];
    if (r.relationship.trim()) details.push(<span key="rel">{r.relationship.trim()}</span>);
    if (r.email.trim()) details.push(<MailLink key="email" email={r.email} />);
    if (r.phone.trim()) details.push(<span key="phone">{r.phone.trim()}</span>);
    return (
      <article key={r.id} className="cv-entry cv-entry-reference">
        <EntryHead title={firstOf(r.name, position)} sub={r.name.trim() ? position : ""} />
        {details.length > 0 && (
          <p className="cv-meta-line">
            {details.map((d, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="cv-sep"> · </span>}
                {d}
              </Fragment>
            ))}
          </p>
        )}
      </article>
    );
  });
  return (
    <Section id="references" sectionKey="references" title={l.references}>
      {items}
    </Section>
  );
}

function languageText(item: LanguageItem, l: CVLabels): string {
  return item.level ? `${item.name.trim()} (${l.languageLevels[item.level]})` : item.name.trim();
}

/** Short items as one comma-separated line ("list") or as tags ("chips"). */
function TagList({ items, variant }: { items: { id: string; text: string }[]; variant: "list" | "chips" }) {
  return variant === "chips" ? (
    <ul className="cv-chips">
      {items.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  ) : (
    <p className="cv-skill-line cv-tag-line">{items.map((item) => item.text).join(", ")}</p>
  );
}

export function LanguagesSection({ cv, variant = "list" }: TemplateProps & { variant?: "list" | "chips" }) {
  const l = labelsFor(cv);
  const items = filledItems(cv, "languages")
    .filter((x) => x.name.trim())
    .map((x) => ({ id: x.id, text: languageText(x, l) }));
  return (
    <Section id="languages" sectionKey="languages" title={l.languages}>
      {items.length > 0 ? [<TagList key="list" items={items} variant={variant} />] : []}
    </Section>
  );
}

export function InterestsSection({ cv, variant = "list" }: TemplateProps & { variant?: "list" | "chips" }) {
  const l = labelsFor(cv);
  const items = filledItems(cv, "interests")
    .filter((x) => x.name.trim())
    .map((x) => ({ id: x.id, text: x.name.trim() }));
  return (
    <Section id="interests" sectionKey="interests" title={l.interests}>
      {items.length > 0 ? [<TagList key="list" items={items} variant={variant} />] : []}
    </Section>
  );
}

/** A user-defined section: entries with a title, subtitle, dates and a description. */
export function CustomSectionBlock({ cv, section }: TemplateProps & { section: CustomSection }) {
  const lang = cv.meta.cvLanguage;
  const items = filledCustomItems(section).map((item) => (
    <article key={item.id} className="cv-entry">
      <EntryHead
        title={firstOf(item.title, item.subtitle)}
        sub={item.title.trim() ? item.subtitle : ""}
        date={formatRange(item.startDate, item.endDate, lang)}
      />
      <RichText text={item.description} />
    </article>
  ));
  const title = section.title.trim() || labelsFor(cv).untitledSection;
  return (
    <Section id="custom" sectionKey={customSectionKey(section.id)} title={title}>
      {items}
    </Section>
  );
}

type SectionRenderer = (cv: CVData, options: TemplateOptions) => ReactNode;

export const SECTION_RENDERERS: Record<BuiltinSectionKey, SectionRenderer> = {
  summary: (cv) => <SummarySection cv={cv} />,
  experience: (cv) => <ExperienceSection cv={cv} />,
  education: (cv) => <EducationSection cv={cv} />,
  projects: (cv) => <ProjectsSection cv={cv} />,
  skills: (cv, o) => <SkillsSection cv={cv} variant={o.tags} />,
  certifications: (cv, o) => <CertificationsSection cv={cv} compact={o.compactCertifications} />,
  organizations: (cv) => <OrganizationsSection cv={cv} />,
  awards: (cv) => <AwardsSection cv={cv} />,
  languages: (cv, o) => <LanguagesSection cv={cv} variant={o.tags} />,
  references: (cv) => <ReferencesSection cv={cv} />,
  interests: (cv, o) => <InterestsSection cv={cv} variant={o.tags} />,
};

/**
 * Every visible section in the user's order (lib/cv-sections.ts): built-in sections
 * and custom sections alike. Empty sections render nothing.
 */
export function CVSections({ cv, options }: TemplateProps & { options: TemplateOptions }) {
  return (
    <>
      {visibleSectionsInOrder(cv).map((key) => {
        if (isBuiltinSection(key)) return <Fragment key={key}>{SECTION_RENDERERS[key](cv, options)}</Fragment>;
        const section = findCustomSection(cv, key);
        return section ? <CustomSectionBlock key={key} cv={cv} section={section} /> : null;
      })}
    </>
  );
}
