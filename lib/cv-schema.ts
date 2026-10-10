/**
 * Typed, versioned CV data model.
 *
 * Every template renders from this single schema, so switching templates never
 * changes user content. When the shape changes, bump CV_SCHEMA_VERSION and add a
 * step to `migrations` in lib/cv-validation.ts (see README "Schema migrations").
 */

export const CV_SCHEMA_VERSION = 1 as const;

export const TEMPLATE_IDS = ["ats-minimal", "modern-professional", "graduate"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const LANGUAGES = ["en", "id"] as const;
export type Language = (typeof LANGUAGES)[number];

export const SKILL_LEVELS = ["", "beginner", "intermediate", "advanced", "expert"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

/** Dates are stored as "YYYY-MM", "YYYY" (year only) or "" when unknown. */
export type MonthString = string;

export interface PersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  linkedin: string;
  website: string;
  /** Optional data:image/* URL, kept small (resized client-side). */
  photo: string;
}

export interface ExperienceItem {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: MonthString;
  endDate: MonthString;
  current: boolean;
  /** One responsibility/achievement per line. */
  description: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: MonthString;
  endDate: MonthString;
  description: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  role: string;
  description: string;
  technologies: string;
  url: string;
}

export interface SkillItem {
  id: string;
  name: string;
  level: SkillLevel;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: MonthString;
  credential: string;
}

export interface CVMeta {
  template: TemplateId;
  /** Language of the CV's own headings and date labels (independent of the UI language). */
  cvLanguage: Language;
}

export interface CVData {
  schemaVersion: typeof CV_SCHEMA_VERSION;
  meta: CVMeta;
  personal: PersonalInfo;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  technicalSkills: SkillItem[];
  softSkills: SkillItem[];
  certifications: CertificationItem[];
}

/** Sections that hold repeatable entries. */
export type ListSection =
  | "experience"
  | "education"
  | "projects"
  | "technicalSkills"
  | "softSkills"
  | "certifications";

export const LIST_SECTIONS: readonly ListSection[] = [
  "experience",
  "education",
  "projects",
  "technicalSkills",
  "softSkills",
  "certifications",
];

export type ListItem<S extends ListSection> = CVData[S][number];

let idCounter = 0;
export function createId(): string {
  idCounter += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${rand}${idCounter.toString(36)}`;
}

export function emptyPersonal(): PersonalInfo {
  return {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    city: "",
    country: "",
    linkedin: "",
    website: "",
    photo: "",
  };
}

export function emptyItem<S extends ListSection>(section: S): ListItem<S> {
  const id = createId();
  const items: { [K in ListSection]: ListItem<K> } = {
    experience: {
      id,
      jobTitle: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
    },
    education: { id, institution: "", degree: "", field: "", startDate: "", endDate: "", description: "" },
    projects: { id, name: "", role: "", description: "", technologies: "", url: "" },
    technicalSkills: { id, name: "", level: "" },
    softSkills: { id, name: "", level: "" },
    certifications: { id, name: "", issuer: "", issueDate: "", credential: "" },
  };
  return items[section] as ListItem<S>;
}

export function createEmptyCV(cvLanguage: Language = "en"): CVData {
  return {
    schemaVersion: CV_SCHEMA_VERSION,
    meta: { template: "ats-minimal", cvLanguage },
    personal: emptyPersonal(),
    summary: "",
    experience: [],
    education: [],
    projects: [],
    technicalSkills: [],
    softSkills: [],
    certifications: [],
  };
}

const has = (s: string) => s.trim().length > 0;

/** True when an entry has any user-entered content (empty entries are omitted from the CV). */
export function isItemFilled(item: ListItem<ListSection>): boolean {
  return Object.entries(item).some(
    ([key, value]) => key !== "id" && key !== "level" && typeof value === "string" && has(value),
  );
}

export function filledItems<S extends ListSection>(cv: CVData, section: S): ListItem<S>[] {
  return (cv[section] as ListItem<S>[]).filter(isItemFilled);
}

export function hasContactInfo(p: PersonalInfo): boolean {
  return [p.email, p.phone, p.city, p.country, p.linkedin, p.website].some(has);
}

/** True when the CV contains nothing worth rendering. */
export function isCVEmpty(cv: CVData): boolean {
  return (
    !has(cv.personal.fullName) &&
    !has(cv.personal.title) &&
    !hasContactInfo(cv.personal) &&
    !has(cv.summary) &&
    LIST_SECTIONS.every((s) => filledItems(cv, s).length === 0)
  );
}
