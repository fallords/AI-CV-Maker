/**
 * Frames for the landing page's folder demo: the CV on the sheet fills itself in, from an
 * empty page to the whole document. Pure functions, so the sequence can be unit-tested
 * without timers or a DOM.
 *
 * A demo is a list of steps. Step 0 is an empty sheet; each later step reveals one more
 * thing: a character of the name, a character of the job title, the contact line, the
 * summary, then each entry in the order the CV's template shows them. The last step is
 * the CV itself. The number of steps and their timing don't depend on the template, so
 * switching templates mid-sequence keeps the place.
 */

import { filledCustomItems, filledItems, type CVData, type ListSection } from "@/lib/cv-schema";
import { SECTION_LISTS, findCustomSection, isBuiltinSection, visibleSectionsInOrder } from "@/lib/cv-sections";

/** Milliseconds. `slide` is the sheet rising out of the folder before anything is written. */
export const DEMO_TIMING = { slide: 320, char: 45, pause: 160, beat: 220 } as const;

/** The whole sequence must end within this many milliseconds. */
export const DEMO_MAX_MS = 4500;

/** Lists shown as one line or one group of tags: they appear as one entry. */
const GROUPED: ReadonlySet<ListSection> = new Set(["technicalSkills", "softSkills", "languages", "interests"]);

type Unit =
  | { kind: "name" }
  | { kind: "title" }
  | { kind: "contact" }
  | { kind: "summary" }
  /** One entry of a list, or the whole list when `id` is null (grouped lists). */
  | { kind: "entry"; list: ListSection; id: string | null }
  | { kind: "custom"; section: string; id: string };

const chars = (s: string) => Array.from(s.trim());

/** Entries in the order the template shows them. */
function entryUnits(cv: CVData): Unit[] {
  const units: Unit[] = [];
  for (const key of visibleSectionsInOrder(cv)) {
    if (isBuiltinSection(key)) {
      for (const list of SECTION_LISTS[key]) {
        const items = filledItems(cv, list);
        if (items.length === 0) continue;
        if (GROUPED.has(list)) units.push({ kind: "entry", list, id: null });
        else for (const item of items) units.push({ kind: "entry", list, id: item.id });
      }
    } else {
      const section = findCustomSection(cv, key);
      if (!section) continue;
      for (const item of filledCustomItems(section)) units.push({ kind: "custom", section: section.id, id: item.id });
    }
  }
  return units;
}

function demoUnits(cv: CVData): Unit[] {
  const p = cv.personal;
  const units: Unit[] = [];
  for (let i = 0; i < chars(p.fullName).length; i++) units.push({ kind: "name" });
  for (let i = 0; i < chars(p.title).length; i++) units.push({ kind: "title" });
  if ([p.email, p.phone, p.city, p.country, p.linkedin, p.website, p.photo].some((v) => v.trim())) {
    units.push({ kind: "contact" });
  }
  if (cv.summary.trim()) units.push({ kind: "summary" });
  return units.concat(entryUnits(cv));
}

/** Number of steps after the empty sheet; `demoFrame(cv, demoStepCount(cv))` is the whole CV. */
export function demoStepCount(cv: CVData): number {
  return demoUnits(cv).length;
}

/**
 * When each step starts, in milliseconds after the sequence starts: `times[i]` shows step
 * `i + 1`. The name and title type at `char` per character with a short pause between
 * them; everything after that comes a `beat` apart.
 */
export function demoTimes(cv: CVData): number[] {
  const { slide, char, pause, beat } = DEMO_TIMING;
  const times: number[] = [];
  let t = slide;
  let previous: Unit["kind"] | null = null;
  for (const unit of demoUnits(cv)) {
    if (previous !== null) {
      if (unit.kind === "name" || (unit.kind === "title" && previous === "title")) t += char;
      else if (unit.kind === "title") t += pause;
      else t += beat;
    }
    times.push(t);
    previous = unit.kind;
  }
  return times;
}

/** How long the whole sequence takes, from the start of the slide to the last step. */
export function demoDuration(cv: CVData): number {
  const times = demoTimes(cv);
  return times.length > 0 ? times[times.length - 1] : DEMO_TIMING.slide;
}

/**
 * The CV as it looks at `step` (0 = empty sheet, clamped to the last step). Everything the
 * step hasn't reached yet is blank or left out; meta (template, language, style) is kept.
 */
export function demoFrame(cv: CVData, step: number): CVData {
  const units = demoUnits(cv);
  const shown = units.slice(0, Math.max(0, Math.min(step, units.length)));
  if (shown.length === units.length) return cv;

  const count = (kind: Unit["kind"]) => shown.filter((u) => u.kind === kind).length;
  const revealed = (kind: "contact" | "summary") => shown.some((u) => u.kind === kind);
  /** Keys of the entries shown: "list:id", "list:*" for a whole grouped list, "custom:section:id". */
  const entries = new Set<string>();
  for (const u of shown) {
    if (u.kind === "entry") entries.add(`${u.list}:${u.id ?? "*"}`);
    else if (u.kind === "custom") entries.add(`custom:${u.section}:${u.id}`);
  }
  const keepList = <S extends ListSection>(list: S): CVData[S] =>
    (cv[list] as { id: string }[]).filter(
      (item) => entries.has(`${list}:*`) || entries.has(`${list}:${item.id}`),
    ) as CVData[S];

  const p = cv.personal;
  const contact = revealed("contact");
  return {
    ...cv,
    personal: {
      ...p,
      fullName: chars(p.fullName).slice(0, count("name")).join(""),
      title: chars(p.title).slice(0, count("title")).join(""),
      email: contact ? p.email : "",
      phone: contact ? p.phone : "",
      city: contact ? p.city : "",
      country: contact ? p.country : "",
      linkedin: contact ? p.linkedin : "",
      website: contact ? p.website : "",
      photo: contact ? p.photo : "",
    },
    summary: revealed("summary") ? cv.summary : "",
    experience: keepList("experience"),
    education: keepList("education"),
    projects: keepList("projects"),
    technicalSkills: keepList("technicalSkills"),
    softSkills: keepList("softSkills"),
    certifications: keepList("certifications"),
    languages: keepList("languages"),
    organizations: keepList("organizations"),
    awards: keepList("awards"),
    references: keepList("references"),
    interests: keepList("interests"),
    customSections: cv.customSections
      .map((s) => ({ ...s, items: s.items.filter((item) => entries.has(`custom:${s.id}:${item.id}`)) }))
      .filter((s) => s.items.length > 0),
  };
}
