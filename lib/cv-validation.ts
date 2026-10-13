/**
 * Validation, sanitisation and schema migration for CV data.
 *
 * Anything that comes from outside the running app (localStorage, imported JSON)
 * goes through `parseCVValue` / `parseCVJson` (CVs only) or `parseDocumentValue` /
 * `parseDocumentJson` (CVs and cover letters), which:
 *   1. unwrap the export envelope or storage payload if present,
 *   2. migrate older CV schema versions step by step (v1 -> v2),
 *   3. coerce every field to the expected type, dropping unknown keys and
 *      unsafe values (e.g. non-image data URLs for the photo).
 */

import {
  CV_SCHEMA_VERSION,
  LANGUAGES,
  LANGUAGE_LEVELS,
  MAX_CUSTOM_ITEMS,
  MAX_CUSTOM_SECTIONS,
  SKILL_LEVELS,
  TEMPLATE_IDS,
  createEmptyCV,
  createId,
  isValidId,
  type AwardItem,
  type CVData,
  type CertificationItem,
  type CustomItem,
  type CustomSection,
  type EducationItem,
  type ExperienceItem,
  type InterestItem,
  type Language,
  type LanguageItem,
  type LanguageLevel,
  type OrganizationItem,
  type ProjectItem,
  type ReferenceItem,
  type SkillItem,
  type SkillLevel,
  type TemplateId,
} from "./cv-schema";
import { customSectionKey, isBuiltinSection, type SectionKey } from "./cv-sections";
import type { AnyDoc } from "./documents";
import { DEFAULT_STYLE, sanitizeStyle } from "./doc-style";
import { LETTER_SCHEMA_VERSION, sanitizeLetter } from "./letter-schema";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_TEXT = 5000;
const MAX_SHORT = 300;
const MAX_ITEMS = 100;
/** ~1.5 MB of base64; photos are resized well below this on upload. */
const MAX_PHOTO_CHARS = 2_000_000;

export type ParseResult =
  | { ok: true; data: CVData; migratedFrom?: number }
  | { ok: false; error: ParseError };

export type ParseError = "invalid_json" | "not_object" | "unsupported_version" | "too_large";

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

function str(v: unknown, max = MAX_SHORT): string {
  if (typeof v === "string") return v.slice(0, max);
  if (typeof v === "number" && Number.isFinite(v)) return String(v).slice(0, max);
  return "";
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
/** Accepts "YYYY-MM", "YYYY" (year only) or "YYYY-MM-DD" (day dropped); anything else becomes "". */
export function normalizeMonth(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (MONTH_RE.test(s) || /^\d{4}$/.test(s)) return s;
  const full = /^(\d{4})-(0[1-9]|1[0-2])-\d{2}/.exec(s);
  if (full) return `${full[1]}-${full[2]}`;
  return "";
}

function id(v: unknown): string {
  return isValidId(v) ? v : createId();
}

function list<T>(v: unknown, map: (r: Raw) => T, max = MAX_ITEMS): T[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isObject).slice(0, max).map(map);
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

const SAFE_PHOTO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
export function sanitizePhoto(v: unknown): string {
  return typeof v === "string" && v.length <= MAX_PHOTO_CHARS && SAFE_PHOTO_RE.test(v) ? v : "";
}

/** Coerce an arbitrary object (already at the current schema version) into valid CVData. */
export function sanitizeCV(raw: Raw): CVData {
  const base = createEmptyCV();
  const meta = isObject(raw.meta) ? raw.meta : {};
  const p = isObject(raw.personal) ? raw.personal : {};

  // Make sure every entry id is unique across ALL lists (custom section entries included),
  // otherwise React keys, jump targets and item updates would collide. Lists are processed
  // in schema order, so earlier lists keep their ids when there is a clash.
  const seen = new Set<string>();
  const uid = (v: unknown) => {
    let next = id(v);
    while (seen.has(next)) next = createId();
    seen.add(next);
    return next;
  };

  const skill = (r: Raw): SkillItem => ({
    id: uid(r.id),
    name: str(r.name),
    level: oneOf<SkillLevel>(r.level, SKILL_LEVELS, ""),
  });

  const experience = list<ExperienceItem>(raw.experience, (r) => ({
    id: uid(r.id),
    jobTitle: str(r.jobTitle),
    company: str(r.company),
    location: str(r.location),
    startDate: normalizeMonth(r.startDate),
    endDate: normalizeMonth(r.endDate),
    current: r.current === true,
    description: str(r.description, MAX_TEXT),
  }));
  const education = list<EducationItem>(raw.education, (r) => ({
    id: uid(r.id),
    institution: str(r.institution),
    degree: str(r.degree),
    field: str(r.field),
    startDate: normalizeMonth(r.startDate),
    endDate: normalizeMonth(r.endDate),
    description: str(r.description, MAX_TEXT),
  }));
  const projects = list<ProjectItem>(raw.projects, (r) => ({
    id: uid(r.id),
    name: str(r.name),
    role: str(r.role),
    description: str(r.description, MAX_TEXT),
    technologies: str(r.technologies),
    url: str(r.url),
  }));
  const technicalSkills = list(raw.technicalSkills, skill);
  const softSkills = list(raw.softSkills, skill);
  const certifications = list<CertificationItem>(raw.certifications, (r) => ({
    id: uid(r.id),
    name: str(r.name),
    issuer: str(r.issuer),
    issueDate: normalizeMonth(r.issueDate),
    credential: str(r.credential),
  }));
  const languages = list<LanguageItem>(raw.languages, (r) => ({
    id: uid(r.id),
    name: str(r.name),
    level: oneOf<LanguageLevel>(r.level, LANGUAGE_LEVELS, ""),
  }));
  const organizations = list<OrganizationItem>(raw.organizations, (r) => ({
    id: uid(r.id),
    role: str(r.role),
    organization: str(r.organization),
    location: str(r.location),
    startDate: normalizeMonth(r.startDate),
    endDate: normalizeMonth(r.endDate),
    current: r.current === true,
    description: str(r.description, MAX_TEXT),
  }));
  const awards = list<AwardItem>(raw.awards, (r) => ({
    id: uid(r.id),
    title: str(r.title),
    issuer: str(r.issuer),
    date: normalizeMonth(r.date),
    description: str(r.description, MAX_TEXT),
  }));
  const references = list<ReferenceItem>(raw.references, (r) => ({
    id: uid(r.id),
    name: str(r.name),
    position: str(r.position),
    organization: str(r.organization),
    email: str(r.email),
    phone: str(r.phone),
    relationship: str(r.relationship),
  }));
  const interests = list<InterestItem>(raw.interests, (r) => ({
    id: uid(r.id),
    name: str(r.name),
  }));

  // Custom section ids only need to be unique among custom sections (they form `custom:<id>` keys).
  const seenSections = new Set<string>();
  const sectionUid = (v: unknown) => {
    let next = id(v);
    while (seenSections.has(next)) next = createId();
    seenSections.add(next);
    return next;
  };
  const customSections = list<CustomSection>(
    raw.customSections,
    (r) => ({
      id: sectionUid(r.id),
      title: str(r.title),
      items: list<CustomItem>(
        r.items,
        (i) => ({
          id: uid(i.id),
          title: str(i.title),
          subtitle: str(i.subtitle),
          startDate: normalizeMonth(i.startDate),
          endDate: normalizeMonth(i.endDate),
          description: str(i.description, MAX_TEXT),
        }),
        MAX_CUSTOM_ITEMS,
      ),
    }),
    MAX_CUSTOM_SECTIONS,
  );

  // Section keys must name a built-in section or an existing custom section; duplicates are dropped.
  const customKeys = new Set<string>(customSections.map((cs) => customSectionKey(cs.id)));
  const sectionKeys = (v: unknown): SectionKey[] => {
    if (!Array.isArray(v)) return [];
    const out: SectionKey[] = [];
    for (const k of v) {
      if (typeof k !== "string" || out.includes(k as SectionKey)) continue;
      if (isBuiltinSection(k) || customKeys.has(k)) out.push(k as SectionKey);
    }
    return out;
  };

  return {
    schemaVersion: CV_SCHEMA_VERSION,
    meta: {
      template: oneOf<TemplateId>(meta.template, TEMPLATE_IDS, base.meta.template),
      cvLanguage: oneOf<Language>(meta.cvLanguage, LANGUAGES, base.meta.cvLanguage),
      sectionOrder: sectionKeys(meta.sectionOrder),
      hiddenSections: sectionKeys(meta.hiddenSections),
      style: sanitizeStyle(meta.style),
    },
    personal: {
      fullName: str(p.fullName),
      title: str(p.title),
      email: str(p.email),
      phone: str(p.phone),
      city: str(p.city),
      country: str(p.country),
      linkedin: str(p.linkedin),
      website: str(p.website),
      photo: sanitizePhoto(p.photo),
    },
    summary: str(raw.summary, MAX_TEXT),
    experience,
    education,
    projects,
    technicalSkills,
    softSkills,
    certifications,
    languages,
    organizations,
    awards,
    references,
    interests,
    customSections,
  };
}

/**
 * Migration steps, keyed by the version they upgrade FROM.
 * Each step receives the raw object at version N and must return it at N + 1.
 */
export const migrations: Record<number, (raw: Raw) => Raw> = {
  // v2: new sections, custom sections, section order/visibility and appearance settings.
  // Real v1 data has none of these fields, so they start empty. Unversioned input that
  // already carries them (e.g. hand-edited or third-party JSON) keeps them; sanitizeCV
  // validates whatever is kept.
  1: (raw) => {
    const meta = isObject(raw.meta) ? raw.meta : {};
    const arr = (v: unknown) => (Array.isArray(v) ? v : []);
    return {
      ...raw,
      schemaVersion: 2,
      languages: arr(raw.languages),
      organizations: arr(raw.organizations),
      awards: arr(raw.awards),
      references: arr(raw.references),
      interests: arr(raw.interests),
      customSections: arr(raw.customSections),
      meta: {
        ...meta,
        sectionOrder: meta.sectionOrder ?? [],
        hiddenSections: meta.hiddenSections ?? [],
        style: meta.style ?? { ...DEFAULT_STYLE },
      },
    };
  },
};

export function migrate(raw: Raw): { raw: Raw; from: number } | null {
  const declared = raw.schemaVersion;
  // Data without a version is treated as v1 (the first released format).
  let version = typeof declared === "number" && Number.isInteger(declared) ? declared : 1;
  const from = version;
  if (version > CV_SCHEMA_VERSION || version < 0) return null;
  let current = raw;
  while (version < CV_SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) return null;
    current = step(current);
    version += 1;
  }
  return { raw: current, from };
}

/** Unwraps an export envelope ({ app, kind?, exportedAt, data }) or a stored payload ({ schemaVersion, savedAt, kind?, data }). */
function unwrap(value: Raw): { inner: Raw; kind: unknown } {
  const enveloped = isObject(value.data) && !("personal" in value) && !("sender" in value);
  const inner = enveloped ? (value.data as Raw) : value;
  return { inner, kind: enveloped && value.kind !== undefined ? value.kind : inner.kind };
}

/** Parse an already-decoded value (envelope or bare CV object). Letters are rejected as "not_object". */
export function parseCVValue(value: unknown): ParseResult {
  if (!isObject(value)) return { ok: false, error: "not_object" };
  const { inner, kind } = unwrap(value);
  if (kind === "letter") return { ok: false, error: "not_object" };
  const migrated = migrate(inner);
  if (!migrated) return { ok: false, error: "unsupported_version" };
  const data = sanitizeCV(migrated.raw);
  return migrated.from !== CV_SCHEMA_VERSION
    ? { ok: true, data, migratedFrom: migrated.from }
    : { ok: true, data };
}

/** Parse JSON text from an imported file. */
export function parseCVJson(text: string): ParseResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: "too_large" };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  return parseCVValue(value);
}

export const EXPORT_APP_ID = "free-ai-cv-maker";

export function serializeCV(cv: CVData): string {
  return JSON.stringify(
    { app: EXPORT_APP_ID, exportedAt: new Date().toISOString(), data: cv },
    null,
    2,
  );
}

/* ---------- Documents of any kind (CVs and cover letters) ---------- */

export type DocParseResult =
  | { ok: true; doc: AnyDoc; migratedFrom?: number }
  | { ok: false; error: ParseError };

/**
 * Parse an already-decoded document: a CV (v1 or v2, bare or in an envelope) or a
 * cover letter (`kind: "letter"`, bare or in an envelope).
 */
export function parseDocumentValue(value: unknown): DocParseResult {
  if (!isObject(value)) return { ok: false, error: "not_object" };
  const { inner, kind } = unwrap(value);
  if (kind === "letter") {
    const declared = inner.schemaVersion;
    const version = typeof declared === "number" && Number.isInteger(declared) ? declared : LETTER_SCHEMA_VERSION;
    if (version !== LETTER_SCHEMA_VERSION) return { ok: false, error: "unsupported_version" };
    return { ok: true, doc: { kind: "letter", data: sanitizeLetter(inner) } };
  }
  if (kind !== undefined && kind !== "cv") return { ok: false, error: "not_object" };
  const result = parseCVValue(inner);
  if (!result.ok) return result;
  const doc: AnyDoc = { kind: "cv", data: result.data };
  return result.migratedFrom !== undefined ? { ok: true, doc, migratedFrom: result.migratedFrom } : { ok: true, doc };
}

/** Parse JSON text from an imported file (CV or cover letter). */
export function parseDocumentJson(text: string): DocParseResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: "too_large" };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  return parseDocumentValue(value);
}

/** Export envelope for any document: { app, kind, exportedAt, data }. */
export function serializeDocument(doc: AnyDoc): string {
  return JSON.stringify(
    { app: EXPORT_APP_ID, kind: doc.kind, exportedAt: new Date().toISOString(), data: doc.data },
    null,
    2,
  );
}

/* ---------- Field-level validation (non-blocking hints shown in the form) ---------- */

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** Accepts URLs with or without a scheme, e.g. "linkedin.com/in/jane". */
export function isValidUrl(v: string): boolean {
  const s = v.trim();
  if (!s) return true;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Returns a safe http(s) href for rendering links, or null. */
export function safeHref(v: string): string | null {
  const s = v.trim();
  if (!s || !isValidUrl(s)) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

/** Strip the scheme for compact display in the CV. */
export function displayUrl(v: string): string {
  return v.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function isValidMonthRange(start: string, end: string): boolean {
  return !start || !end || start <= end;
}
