import { CV_LABELS } from "@/lib/cv-format";
import type { CVData } from "@/lib/cv-schema";
import { BUILTIN_SECTIONS, findCustomSection, type BuiltinSectionKey, type SectionKey } from "@/lib/cv-sections";
import type { Dictionary } from "@/lib/i18n/en";

/** Form heading (UI language) of a built-in section. */
export function builtinSectionTitle(key: BuiltinSectionKey, t: Dictionary): string {
  switch (key) {
    case "summary":
      return t.form.summary.title;
    case "experience":
      return t.form.experience.title;
    case "education":
      return t.form.education.title;
    case "projects":
      return t.form.projects.title;
    case "skills":
      return t.form.skills.title;
    case "certifications":
      return t.form.certifications.title;
    case "organizations":
      return t.sections.organizations.title;
    case "awards":
      return t.sections.awards.title;
    case "languages":
      return t.sections.languages.title;
    case "references":
      return t.sections.references.title;
    case "interests":
      return t.sections.interests.title;
  }
}

/** The title a custom section shows in the form, or "" when it has none. */
export function customSectionTitle(cv: CVData, key: SectionKey): string {
  return findCustomSection(cv, key)?.title.trim() ?? "";
}

const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleLowerCase();

/**
 * True when a proposed custom section title repeats an existing section: a custom
 * section's title, or a built-in section's heading in the form or on the CV.
 */
export function titleExists(cv: CVData, title: string, t: Dictionary): boolean {
  const wanted = normalize(title);
  if (!wanted) return false;
  const labels = CV_LABELS[cv.meta.cvLanguage] ?? CV_LABELS.en;
  const taken = new Set<string>();
  for (const key of BUILTIN_SECTIONS) {
    taken.add(normalize(builtinSectionTitle(key, t)));
    taken.add(normalize(labels[key]));
  }
  for (const s of cv.customSections) taken.add(normalize(s.title));
  return taken.has(wanted);
}
