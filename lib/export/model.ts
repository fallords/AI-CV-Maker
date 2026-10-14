/**
 * What a CV or cover letter says, in display order, without formatting. The Word and
 * plain text exports both render this model, so they always agree with each other and
 * with the templates (components/templates/parts.tsx and LetterDocument.tsx):
 *
 * - CV sections follow the user's order and visibility (visibleSectionsInOrder), empty
 *   sections and entries are left out, and headings, levels and dates use the CV's own
 *   language (cv.meta.cvLanguage), not the interface language.
 * - Letters follow business-letter order: sender, date, recipient, subject, greeting,
 *   body, closing and signature.
 *
 * Every string in the model is trimmed and stripped of characters that are not allowed
 * in XML (control characters, lone surrogates), so pasted text can never produce a Word
 * file that refuses to open.
 */

import { CV_LABELS, formatMonth, formatRange, joinNonEmpty, toBlocks, type CVLabels, type TextBlock } from "../cv-format";
import {
  TEMPLATE_IDS,
  filledCustomItems,
  filledItems,
  type CVData,
  type CustomSection,
  type Language,
  type PersonalInfo,
  type SkillItem,
  type TemplateId,
} from "../cv-schema";
import { findCustomSection, isBuiltinSection, visibleSectionsInOrder, type BuiltinSectionKey, type SectionKey } from "../cv-sections";
import { displayUrl, isValidEmail, safeHref } from "../cv-validation";
import { sanitizeStyle, type DocStyle } from "../doc-style";
import type { AnyDoc } from "../documents";
import { letterDateLine, letterParagraphs, type LetterData } from "../letter-schema";

export type { TextBlock } from "../cv-format";

/** Templates that show the CV photo (the others never include it). */
const PHOTO_TEMPLATES: ReadonlySet<TemplateId> = new Set<TemplateId>(["modern-professional", "graduate"]);

/** A piece of text, optionally linked. `label` is shown before the text in bold ("Technologies: …"). */
export interface Part {
  text: string;
  href?: string;
  label?: string;
}

export interface HeaderModel {
  name: string;
  title: string;
  /** Email, phone, location, LinkedIn and website, in that order; blanks left out. */
  contact: Part[];
  /** data:image URL, only for templates that show a photo; "" otherwise. */
  photo: string;
}

export interface EntryModel {
  /** Main line (job title, degree, project name…). */
  title: string;
  /** Details shown under the title (company, location…). Non-empty strings. */
  sub: string[];
  /** Formatted date or date range, or "". */
  date: string;
  /** Description as paragraphs and bullet lists. */
  body: TextBlock[];
  /** Extra lines after the body; each line is a list of parts. */
  meta: Part[][];
}

export type SectionContent =
  /** Free text (the summary). */
  | { kind: "blocks"; blocks: TextBlock[] }
  /** Repeatable entries. `compact` = one line per entry (the Graduate template's certifications). */
  | { kind: "entries"; entries: EntryModel[]; compact: boolean }
  /** Labelled lists ("Technical Skills: SQL, Python"). */
  | { kind: "groups"; groups: { label: string; items: string[] }[] }
  /** A plain list of short items (languages, interests). */
  | { kind: "tags"; items: string[] };

export interface SectionModel {
  key: SectionKey;
  title: string;
  content: SectionContent;
}

interface ModelBase {
  template: TemplateId;
  language: Language;
  style: DocStyle;
  header: HeaderModel;
}

export interface CVModel extends ModelBase {
  kind: "cv";
  /** Visible sections with content, in the user's order. */
  sections: SectionModel[];
}

export interface LetterModel extends ModelBase {
  kind: "letter";
  /** Formatted date ("13 October 2026"; Indonesian letters: "Bandung, 13 Oktober 2026"), or "". */
  date: string;
  /** Recipient name, title, company and address lines. */
  recipient: string[];
  subject: { label: string; text: string } | null;
  greeting: string;
  /** Body paragraphs; a paragraph may contain single line breaks ("\n"). */
  paragraphs: string[];
  closing: string;
  signature: string;
}

export type DocModel = CVModel | LetterModel;

/* ---------------- text clean-up ---------------- */

const NEEDS_CLEANING = /[^\t\n\r -퟿-�]/;

/**
 * Removes characters that are not allowed in XML 1.0 (control characters other than tab
 * and line breaks, U+FFFE/U+FFFF and unpaired surrogates) and normalises line breaks to
 * "\n". Emoji and other astral characters (valid surrogate pairs) are kept.
 */
export function cleanText(value: string): string {
  const s = value.replace(/\r\n?/g, "\n");
  if (!NEEDS_CLEANING.test(s)) return s;
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += s[i] + s[i + 1];
        i++;
      }
      continue;
    }
    if (c >= 0xdc00 && c <= 0xdfff) continue;
    if (c < 0x20 && c !== 0x09 && c !== 0x0a) continue;
    if (c === 0xfffe || c === 0xffff) continue;
    out += s[i];
  }
  return out;
}

/** Cleaned and trimmed. */
const tidy = (value: string): string => cleanText(value).trim();

function nonEmpty(values: string[]): string[] {
  return values.map(tidy).filter(Boolean);
}

/** First non-blank value, cleaned and trimmed. */
function firstOf(...values: string[]): string {
  for (const v of values) {
    const t = tidy(v);
    if (t) return t;
  }
  return "";
}

function blocks(text: string): TextBlock[] {
  return toBlocks(cleanText(text));
}

/* ---------------- shared helpers ---------------- */

function templateOf(id: string): TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(id) ? (id as TemplateId) : "ats-minimal";
}

function languageOf(lang: string): Language {
  return lang === "id" ? "id" : "en";
}

/** A normalised absolute http(s) URL for a link, or undefined when the value is not a usable web address. */
function webHref(value: string): string | undefined {
  const href = safeHref(value);
  if (!href) return undefined;
  try {
    return new URL(href).href;
  } catch {
    return undefined;
  }
}

function urlPart(value: string): Part {
  const part: Part = { text: tidy(displayUrl(value)) };
  const href = webHref(value);
  if (href) part.href = href;
  return part;
}

function emailPart(value: string): Part {
  const email = tidy(value);
  return isValidEmail(email) ? { text: email, href: `mailto:${encodeURI(email)}` } : { text: email };
}

type ContactInfo = Pick<PersonalInfo, "email" | "phone" | "city" | "country" | "linkedin" | "website">;

/** Contact details in the templates' order: email, phone, location, LinkedIn, website. */
export function contactParts(p: ContactInfo): Part[] {
  const parts: Part[] = [];
  if (p.email.trim()) parts.push(emailPart(p.email));
  if (p.phone.trim()) parts.push({ text: tidy(p.phone) });
  const location = tidy(joinNonEmpty([p.city, p.country]));
  if (location) parts.push({ text: location });
  if (p.linkedin.trim()) parts.push(urlPart(p.linkedin));
  if (p.website.trim()) parts.push(urlPart(p.website));
  return parts.filter((part) => part.text);
}

/* ---------------- CV ---------------- */

const hasContent = (e: EntryModel): boolean =>
  Boolean(e.title || e.date || e.sub.length > 0 || e.body.length > 0 || e.meta.length > 0);

/** Entries with something left to show after clean-up; null when there are none. */
function entries(list: EntryModel[], compact = false): SectionContent | null {
  const kept = list.filter(hasContent);
  return kept.length > 0 ? { kind: "entries", entries: kept, compact } : null;
}

type SectionBuilder = (cv: CVData, l: CVLabels, template: TemplateId) => SectionContent | null;

const SECTION_BUILDERS: Record<BuiltinSectionKey, SectionBuilder> = {
  summary: (cv) => {
    const b = blocks(cv.summary);
    return b.length > 0 ? { kind: "blocks", blocks: b } : null;
  },

  experience: (cv) => {
    const lang = cv.meta.cvLanguage;
    return entries(
      filledItems(cv, "experience").map((e) => ({
        title: firstOf(e.jobTitle, e.company),
        sub: nonEmpty([e.jobTitle.trim() ? e.company : "", e.location]),
        date: formatRange(e.startDate, e.endDate, lang, e.current),
        body: blocks(e.description),
        meta: [],
      })),
    );
  },

  education: (cv) => {
    const lang = cv.meta.cvLanguage;
    return entries(
      filledItems(cv, "education").map((e) => {
        const degree = tidy(joinNonEmpty([e.degree, e.field]));
        return {
          title: degree || tidy(e.institution),
          sub: degree ? nonEmpty([e.institution]) : [],
          date: formatRange(e.startDate, e.endDate, lang),
          body: blocks(e.description),
          meta: [],
        };
      }),
    );
  },

  projects: (cv, l) =>
    entries(
      filledItems(cv, "projects").map((p) => {
        const role = tidy(p.role);
        const technologies = tidy(p.technologies);
        const line: Part[] = [];
        if (technologies) line.push({ label: l.technologies, text: technologies });
        if (p.url.trim()) line.push(urlPart(p.url));
        return {
          title: tidy(p.name),
          sub: role ? [`${l.role}: ${role}`] : [],
          date: "",
          body: blocks(p.description),
          meta: line.length > 0 ? [line] : [],
        };
      }),
    ),

  skills: (cv, l) => {
    const skill = (s: SkillItem) => (s.level ? `${tidy(s.name)} (${l.levels[s.level]})` : tidy(s.name));
    const groups = [
      { label: l.technicalSkills, items: filledItems(cv, "technicalSkills").filter((s) => tidy(s.name)).map(skill) },
      { label: l.softSkills, items: filledItems(cv, "softSkills").filter((s) => tidy(s.name)).map(skill) },
    ].filter((g) => g.items.length > 0);
    return groups.length > 0 ? { kind: "groups", groups } : null;
  },

  certifications: (cv, l, template) => {
    const lang = cv.meta.cvLanguage;
    return entries(
      filledItems(cv, "certifications").map((c) => {
        const credential = tidy(c.credential);
        const meta: Part[][] = [];
        if (credential) {
          // Same rule as the templates: link it when it looks like a web address, else show it as an ID.
          meta.push([safeHref(credential) && /[./]/.test(credential) ? urlPart(credential) : { label: l.credential, text: credential }]);
        }
        return {
          title: firstOf(c.name, c.issuer),
          sub: c.name.trim() ? nonEmpty([c.issuer]) : [],
          date: formatMonth(c.issueDate, lang),
          body: [],
          meta,
        };
      }),
      template === "graduate",
    );
  },

  organizations: (cv) => {
    const lang = cv.meta.cvLanguage;
    return entries(
      filledItems(cv, "organizations").map((o) => ({
        title: firstOf(o.role, o.organization),
        sub: nonEmpty([o.role.trim() ? o.organization : "", o.location]),
        date: formatRange(o.startDate, o.endDate, lang, o.current),
        body: blocks(o.description),
        meta: [],
      })),
    );
  },

  awards: (cv) => {
    const lang = cv.meta.cvLanguage;
    return entries(
      filledItems(cv, "awards").map((a) => ({
        title: firstOf(a.title, a.issuer),
        sub: a.title.trim() ? nonEmpty([a.issuer]) : [],
        date: formatMonth(a.date, lang),
        body: blocks(a.description),
        meta: [],
      })),
    );
  },

  references: (cv) =>
    entries(
      filledItems(cv, "references").map((r) => {
        const position = tidy(joinNonEmpty([r.position, r.organization]));
        const details: Part[] = [];
        if (r.relationship.trim()) details.push({ text: tidy(r.relationship) });
        if (r.email.trim()) details.push(emailPart(r.email));
        if (r.phone.trim()) details.push({ text: tidy(r.phone) });
        return {
          title: firstOf(r.name, position),
          sub: r.name.trim() && position ? [position] : [],
          date: "",
          body: [],
          meta: details.length > 0 ? [details] : [],
        };
      }),
    ),

  languages: (cv, l) => {
    const items = filledItems(cv, "languages")
      .filter((x) => tidy(x.name))
      .map((x) => (x.level ? `${tidy(x.name)} (${l.languageLevels[x.level]})` : tidy(x.name)));
    return items.length > 0 ? { kind: "tags", items } : null;
  },

  interests: (cv) => {
    const items = nonEmpty(filledItems(cv, "interests").map((x) => x.name));
    return items.length > 0 ? { kind: "tags", items } : null;
  },
};

function customSection(cv: CVData, section: CustomSection): SectionContent | null {
  const lang = cv.meta.cvLanguage;
  return entries(
    filledCustomItems(section).map((item) => ({
      title: firstOf(item.title, item.subtitle),
      sub: item.title.trim() ? nonEmpty([item.subtitle]) : [],
      date: formatRange(item.startDate, item.endDate, lang),
      body: blocks(item.description),
      meta: [],
    })),
  );
}

export function buildCVModel(cv: CVData): CVModel {
  const language = languageOf(cv.meta.cvLanguage);
  const template = templateOf(cv.meta.template);
  const l = CV_LABELS[language];
  const p = cv.personal;
  const sections: SectionModel[] = [];

  for (const key of visibleSectionsInOrder(cv)) {
    if (isBuiltinSection(key)) {
      const content = SECTION_BUILDERS[key](cv, l, template);
      if (content) sections.push({ key, title: l[key], content });
      continue;
    }
    const section = findCustomSection(cv, key);
    if (!section) continue;
    const content = customSection(cv, section);
    if (content) sections.push({ key, title: tidy(section.title) || l.untitledSection, content });
  }

  return {
    kind: "cv",
    template,
    language,
    style: sanitizeStyle(cv.meta.style),
    header: {
      name: tidy(p.fullName),
      title: tidy(p.title),
      contact: contactParts(p),
      photo: PHOTO_TEMPLATES.has(template) ? p.photo : "",
    },
    sections,
  };
}

/* ---------------- letter ---------------- */

export function buildLetterModel(letter: LetterData): LetterModel {
  const language = languageOf(letter.meta.language);
  const labels = CV_LABELS[language];
  const s = letter.sender;
  const r = letter.recipient;
  const subject = tidy(letter.subject);
  return {
    kind: "letter",
    template: templateOf(letter.meta.template),
    language,
    style: sanitizeStyle(letter.meta.style),
    header: { name: tidy(s.fullName), title: tidy(s.title), contact: contactParts(s), photo: "" },
    date: tidy(letterDateLine(letter)),
    recipient: nonEmpty([r.name, r.title, r.company, ...cleanText(r.address).split("\n")]),
    subject: subject ? { label: labels.subjectPrefix, text: subject } : null,
    greeting: tidy(letter.greeting),
    paragraphs: letterParagraphs(cleanText(letter.body)).map((para) =>
      para
        .split("\n")
        .map((line) => line.trim())
        .join("\n"),
    ),
    closing: tidy(letter.closing),
    signature: tidy(letter.signature),
  };
}

export function buildDocModel(doc: AnyDoc): DocModel {
  return doc.kind === "cv" ? buildCVModel(doc.data) : buildLetterModel(doc.data);
}
