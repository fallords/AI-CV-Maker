/**
 * Section keys, per-template default order and the rules for resolving the order
 * and visibility a user chose. Templates, the form, exports and the checker all use
 * these helpers so every view lists sections the same way.
 */

import {
  filledItems,
  isCustomSectionFilled,
  type CVData,
  type CustomSection,
  type ListSection,
  type TemplateId,
} from "./cv-schema";

export const BUILTIN_SECTIONS = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "organizations",
  "awards",
  "languages",
  "references",
  "interests",
] as const;
export type BuiltinSectionKey = (typeof BUILTIN_SECTIONS)[number];
/** Built-in section, or `custom:<CustomSection.id>`. */
export type SectionKey = BuiltinSectionKey | `custom:${string}`;

export const TEMPLATE_SECTION_ORDER: Record<TemplateId, BuiltinSectionKey[]> = {
  "ats-minimal": [
    "summary",
    "experience",
    "education",
    "projects",
    "skills",
    "certifications",
    "organizations",
    "awards",
    "languages",
    "references",
    "interests",
  ],
  "modern-professional": [
    "summary",
    "experience",
    "projects",
    "education",
    "skills",
    "certifications",
    "organizations",
    "awards",
    "languages",
    "references",
    "interests",
  ],
  graduate: [
    "summary",
    "education",
    "projects",
    "organizations",
    "skills",
    "certifications",
    "awards",
    "experience",
    "languages",
    "references",
    "interests",
  ],
};

/** The list fields (ListSection) whose entries make up each built-in section. "summary" has none. */
export const SECTION_LISTS: Record<BuiltinSectionKey, readonly ListSection[]> = {
  summary: [],
  experience: ["experience"],
  education: ["education"],
  projects: ["projects"],
  skills: ["technicalSkills", "softSkills"],
  certifications: ["certifications"],
  organizations: ["organizations"],
  awards: ["awards"],
  languages: ["languages"],
  references: ["references"],
  interests: ["interests"],
};

const CUSTOM_PREFIX = "custom:";
const CUSTOM_ID_RE = /^[\w-]{1,64}$/;

export function isBuiltinSection(v: unknown): v is BuiltinSectionKey {
  return typeof v === "string" && (BUILTIN_SECTIONS as readonly string[]).includes(v);
}

export function customSectionKey(id: string): SectionKey {
  return `${CUSTOM_PREFIX}${id}`;
}

/** The custom section id inside a `custom:<id>` key, or null for built-in/invalid keys. */
export function parseCustomKey(key: string): string | null {
  if (!key.startsWith(CUSTOM_PREFIX)) return null;
  const id = key.slice(CUSTOM_PREFIX.length);
  return CUSTOM_ID_RE.test(id) ? id : null;
}

/** Syntactically valid section key (built-in or `custom:<id>`); does not check the section exists. */
export function isSectionKey(v: unknown): v is SectionKey {
  return isBuiltinSection(v) || (typeof v === "string" && parseCustomKey(v) !== null);
}

/** The custom section a key points to, if it still exists. */
export function findCustomSection(cv: CVData, key: SectionKey): CustomSection | undefined {
  const id = parseCustomKey(key);
  return id === null ? undefined : cv.customSections.find((s) => s.id === id);
}

/** True when the key names a built-in section or an existing custom section of this CV. */
export function sectionExists(cv: CVData, key: string): key is SectionKey {
  return isBuiltinSection(key) || (isSectionKey(key) && findCustomSection(cv, key) !== undefined);
}

/**
 * DOM id of the section's editor card (and jump target): the key itself for built-in
 * sections, `custom-<id>` for custom sections.
 */
export function sectionDomId(key: SectionKey): string {
  const id = parseCustomKey(key);
  return id === null ? key : `custom-${id}`;
}

/**
 * Every section in display order, including hidden ones and every custom section.
 *
 * With an empty `meta.sectionOrder` this is the template default followed by custom
 * sections in creation order. Otherwise the stored order is used, minus unknown keys,
 * duplicates and keys of deleted custom sections; missing built-in sections are then
 * appended in template order, followed by missing custom sections in creation order.
 */
export function allSectionsInOrder(cv: CVData): SectionKey[] {
  const templateOrder = TEMPLATE_SECTION_ORDER[cv.meta.template] ?? TEMPLATE_SECTION_ORDER["ats-minimal"];
  const customKeys = cv.customSections.map((s) => customSectionKey(s.id));
  const stored = Array.isArray(cv.meta.sectionOrder) ? cv.meta.sectionOrder : [];
  if (stored.length === 0) return [...templateOrder, ...customKeys];

  const result: SectionKey[] = [];
  const seen = new Set<string>();
  const add = (key: SectionKey) => {
    if (seen.has(key)) return;
    seen.add(key);
    result.push(key);
  };
  const customSet = new Set<string>(customKeys);
  for (const key of stored) {
    if (isBuiltinSection(key) || customSet.has(key)) add(key);
  }
  templateOrder.forEach(add);
  customKeys.forEach(add);
  return result;
}

/** allSectionsInOrder minus `meta.hiddenSections`. */
export function visibleSectionsInOrder(cv: CVData): SectionKey[] {
  const hidden = new Set<string>(Array.isArray(cv.meta.hiddenSections) ? cv.meta.hiddenSections : []);
  return allSectionsInOrder(cv).filter((key) => !hidden.has(key));
}

export function isSectionHidden(cv: CVData, key: SectionKey): boolean {
  return Array.isArray(cv.meta.hiddenSections) && cv.meta.hiddenSections.includes(key);
}

/**
 * True when the section has content to render. A custom section counts as filled
 * when any of its entries is filled; its title alone does not count.
 */
export function isSectionFilled(cv: CVData, key: SectionKey): boolean {
  if (key === "summary") return cv.summary.trim().length > 0;
  if (isBuiltinSection(key)) return SECTION_LISTS[key].some((list) => filledItems(cv, list).length > 0);
  const section = findCustomSection(cv, key);
  return section ? isCustomSectionFilled(section) : false;
}
