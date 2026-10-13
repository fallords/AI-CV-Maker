/**
 * Cover letter data model. A letter is a separate document kind with its own schema
 * version; it shares templates (header look) and appearance settings with CVs.
 */

import { CV_LABELS } from "./cv-format";
import { LANGUAGES, TEMPLATE_IDS, type CVData, type Language, type TemplateId } from "./cv-schema";
import { DEFAULT_STYLE, sanitizeStyle, type DocStyle } from "./doc-style";

export const LETTER_SCHEMA_VERSION = 1 as const;

export interface LetterMeta {
  template: TemplateId;
  /** Language of the letter's own labels and date format (independent of the UI language). */
  language: Language;
  style: DocStyle;
}

export interface LetterSender {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  linkedin: string;
  website: string;
}

export interface LetterRecipient {
  name: string;
  title: string;
  company: string;
  /** May span several lines. */
  address: string;
}

export interface LetterData {
  schemaVersion: typeof LETTER_SCHEMA_VERSION;
  kind: "letter";
  meta: LetterMeta;
  sender: LetterSender;
  recipient: LetterRecipient;
  /** "YYYY-MM-DD" or "" (rendered localized, see formatLetterDate). */
  date: string;
  subject: string;
  greeting: string;
  /** Paragraphs separated by blank lines. */
  body: string;
  closing: string;
  signature: string;
}

export const LETTER_DEFAULTS: Record<Language, { greeting: string; closing: string }> = {
  en: { greeting: "Dear Hiring Manager,", closing: "Kind regards," },
  id: { greeting: "Yth. Bapak/Ibu HRD,", closing: "Hormat saya," },
};

export const LETTER_SENDER_FIELDS = [
  "fullName",
  "title",
  "email",
  "phone",
  "city",
  "country",
  "linkedin",
  "website",
] as const satisfies readonly (keyof LetterSender)[];

export const LETTER_RECIPIENT_FIELDS = ["name", "title", "company", "address"] as const satisfies readonly (keyof LetterRecipient)[];

const MAX_SHORT = 300;
const MAX_ADDRESS = 1000;
const MAX_BODY = 10_000;

/** Today's date in the browser's time zone as "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptySender(): LetterSender {
  return { fullName: "", title: "", email: "", phone: "", city: "", country: "", linkedin: "", website: "" };
}

/** Sender details taken from a CV's personal section (the photo is not copied). */
export function senderFromCV(cv: CVData): LetterSender {
  const p = cv.personal;
  return {
    fullName: p.fullName,
    title: p.title,
    email: p.email,
    phone: p.phone,
    city: p.city,
    country: p.country,
    linkedin: p.linkedin,
    website: p.website,
  };
}

/**
 * A new letter dated today, with localized greeting and closing. When a CV is given,
 * the sender details, signature, template and appearance are copied from it.
 */
export function createEmptyLetter(language: Language, fromCV?: CVData): LetterData {
  const defaults = LETTER_DEFAULTS[language] ?? LETTER_DEFAULTS.en;
  return {
    schemaVersion: LETTER_SCHEMA_VERSION,
    kind: "letter",
    meta: {
      template: fromCV?.meta.template ?? "ats-minimal",
      language,
      style: fromCV ? sanitizeStyle(fromCV.meta.style) : { ...DEFAULT_STYLE },
    },
    sender: fromCV ? senderFromCV(fromCV) : emptySender(),
    recipient: { name: "", title: "", company: "", address: "" },
    date: todayIso(),
    subject: "",
    greeting: defaults.greeting,
    body: "",
    closing: defaults.closing,
    signature: fromCV ? fromCV.personal.fullName : "",
  };
}

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

function str(v: unknown, max = MAX_SHORT): string {
  if (typeof v === "string") return v.slice(0, max);
  if (typeof v === "number" && Number.isFinite(v)) return String(v).slice(0, max);
  return "";
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written as "YYYY-MM-DD". */
export function isValidIsoDate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m = DATE_RE.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return false;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return d <= daysInMonth;
}

/** Accepts "YYYY-MM-DD" (or a longer ISO timestamp, whose date part is kept); anything else becomes "". */
function normalizeDate(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim().slice(0, 10);
  return isValidIsoDate(s) ? s : "";
}

/** Coerce an arbitrary object into a valid LetterData, dropping unknown keys. */
export function sanitizeLetter(raw: Record<string, unknown>): LetterData {
  const r = isObject(raw) ? raw : {};
  const meta = isObject(r.meta) ? r.meta : {};
  const s = isObject(r.sender) ? r.sender : {};
  const to = isObject(r.recipient) ? r.recipient : {};
  return {
    schemaVersion: LETTER_SCHEMA_VERSION,
    kind: "letter",
    meta: {
      template: oneOf<TemplateId>(meta.template, TEMPLATE_IDS, "ats-minimal"),
      language: oneOf<Language>(meta.language, LANGUAGES, "en"),
      style: sanitizeStyle(meta.style),
    },
    sender: {
      fullName: str(s.fullName),
      title: str(s.title),
      email: str(s.email),
      phone: str(s.phone),
      city: str(s.city),
      country: str(s.country),
      linkedin: str(s.linkedin),
      website: str(s.website),
    },
    recipient: {
      name: str(to.name),
      title: str(to.title),
      company: str(to.company),
      address: str(to.address, MAX_ADDRESS),
    },
    date: normalizeDate(r.date),
    subject: str(r.subject),
    greeting: str(r.greeting),
    body: str(r.body, MAX_BODY),
    closing: str(r.closing),
    signature: str(r.signature),
  };
}

const blank = (v: string) => v.trim().length === 0;

/**
 * True when the letter has no content of its own: no sender, recipient, subject,
 * body or signature. The date, greeting and closing are ignored because new letters
 * get them pre-filled.
 */
export function letterIsEmpty(l: LetterData): boolean {
  return (
    LETTER_SENDER_FIELDS.every((k) => blank(l.sender[k])) &&
    LETTER_RECIPIENT_FIELDS.every((k) => blank(l.recipient[k])) &&
    blank(l.subject) &&
    blank(l.body) &&
    blank(l.signature)
  );
}

/** "2026-10-13" -> "13 October 2026" (en) / "13 Oktober 2026" (id); "" for invalid input. Deterministic. */
export function formatLetterDate(iso: string, lang: Language): string {
  if (!isValidIsoDate(iso)) return "";
  const m = DATE_RE.exec(iso)!;
  const labels = CV_LABELS[lang] ?? CV_LABELS.en;
  return `${Number(m[3])} ${labels.monthsLong[Number(m[2]) - 1]} ${m[1]}`;
}

/** Splits the body into paragraphs (separated by blank lines); single line breaks are kept inside a paragraph. */
export function letterParagraphs(body: string): string[] {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\r\n/g, "\n").trim())
    .filter(Boolean);
}

export type { LetterAction, LetterField } from "./letter-reducer";
