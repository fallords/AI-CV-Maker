/**
 * Validation, sanitisation and schema migration for CV data.
 *
 * Anything that comes from outside the running app (localStorage, imported JSON)
 * goes through `parseCV`, which:
 *   1. unwraps the export envelope if present,
 *   2. migrates older schema versions step by step,
 *   3. coerces every field to the expected type, dropping unknown keys and
 *      unsafe values (e.g. non-image data URLs for the photo).
 */

import {
  CV_SCHEMA_VERSION,
  LANGUAGES,
  SKILL_LEVELS,
  TEMPLATE_IDS,
  createEmptyCV,
  createId,
  type CVData,
  type CertificationItem,
  type EducationItem,
  type ExperienceItem,
  type Language,
  type ProjectItem,
  type SkillItem,
  type SkillLevel,
  type TemplateId,
} from "./cv-schema";

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
  return typeof v === "string" && /^[\w-]{1,64}$/.test(v) ? v : createId();
}

function list<T>(v: unknown, map: (r: Raw) => T): T[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isObject).slice(0, MAX_ITEMS).map(map);
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

  // Make sure every id is unique, otherwise React keys and item updates would collide.
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

  return {
    schemaVersion: CV_SCHEMA_VERSION,
    meta: {
      template: oneOf<TemplateId>(meta.template, TEMPLATE_IDS, base.meta.template),
      cvLanguage: oneOf<Language>(meta.cvLanguage, LANGUAGES, base.meta.cvLanguage),
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
    experience: list<ExperienceItem>(raw.experience, (r) => ({
      id: uid(r.id),
      jobTitle: str(r.jobTitle),
      company: str(r.company),
      location: str(r.location),
      startDate: normalizeMonth(r.startDate),
      endDate: normalizeMonth(r.endDate),
      current: r.current === true,
      description: str(r.description, MAX_TEXT),
    })),
    education: list<EducationItem>(raw.education, (r) => ({
      id: uid(r.id),
      institution: str(r.institution),
      degree: str(r.degree),
      field: str(r.field),
      startDate: normalizeMonth(r.startDate),
      endDate: normalizeMonth(r.endDate),
      description: str(r.description, MAX_TEXT),
    })),
    projects: list<ProjectItem>(raw.projects, (r) => ({
      id: uid(r.id),
      name: str(r.name),
      role: str(r.role),
      description: str(r.description, MAX_TEXT),
      technologies: str(r.technologies),
      url: str(r.url),
    })),
    technicalSkills: list(raw.technicalSkills, skill),
    softSkills: list(raw.softSkills, skill),
    certifications: list<CertificationItem>(raw.certifications, (r) => ({
      id: uid(r.id),
      name: str(r.name),
      issuer: str(r.issuer),
      issueDate: normalizeMonth(r.issueDate),
      credential: str(r.credential),
    })),
  };
}

/**
 * Migration steps, keyed by the version they upgrade FROM.
 * Each step receives the raw object at version N and must return it at N + 1.
 *
 * Example for a future v2:
 *   1: (raw) => ({ ...raw, schemaVersion: 2, languages: [] }),
 */
export const migrations: Record<number, (raw: Raw) => Raw> = {};

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

/** Parse an already-decoded value (envelope or bare CV object). */
export function parseCVValue(value: unknown): ParseResult {
  if (!isObject(value)) return { ok: false, error: "not_object" };
  // Export envelope: { app, exportedAt, data: {...} }
  const inner = isObject(value.data) && !("personal" in value) ? value.data : value;
  if (!isObject(inner)) return { ok: false, error: "not_object" };
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
