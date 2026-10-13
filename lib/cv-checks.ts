/**
 * Rule-based CV checker. Runs entirely in the browser: no AI, no network.
 *
 * `runChecks` looks at what the rendered CV will contain (hidden sections count as
 * absent) and returns a 0–100 score plus a list of findings. Each finding names a
 * rule, a severity and a jump target (the DOM id of the editor section, see
 * `sectionDomId`), so the UI can link straight to the field that needs work.
 *
 * Scoring is deterministic: the score starts at 100 and every finding subtracts its
 * penalty. Completeness findings (missing name, no summary, …) carry the weight of the
 * part that is missing, so the weights of all completeness parts add up to 100 and an
 * empty CV scores 0. Quality findings (invalid email, missing dates, …) carry smaller
 * penalties, capped per rule. Every lost point is explained by a finding, so a CV with
 * no findings scores 100.
 *
 * The checker never suggests inventing anything: messages ask for real details only.
 */

import { toBlocks } from "./cv-format";
import {
  filledCustomItems,
  filledItems,
  type CVData,
  type CustomItem,
  type ListItem,
  type ListSection,
} from "./cv-schema";
import {
  allSectionsInOrder,
  customSectionKey,
  isSectionFilled,
  sectionDomId,
  visibleSectionsInOrder,
  type BuiltinSectionKey,
  type SectionKey,
} from "./cv-sections";
import { isValidEmail, isValidUrl } from "./cv-validation";
import { contrastOnWhite } from "./doc-style";

export type CheckLevel = "error" | "warning" | "tip";
/** Severity order used for sorting and grouping. */
export const CHECK_LEVELS: readonly CheckLevel[] = ["error", "warning", "tip"];

export const CHECK_RULES = [
  // Personal details
  "missingName",
  "missingEmail",
  "invalidEmail",
  "missingPhone",
  "missingCity",
  "missingTitle",
  "invalidLinkedin",
  "invalidWebsite",
  "photoAts",
  // Summary
  "summaryMissing",
  "summaryShort",
  "summaryLong",
  // Work experience and education
  "noExperienceOrEducation",
  "noExperience",
  "noEducation",
  "noDescription",
  "noBullets",
  "noDates",
  "noStartDate",
  "noEndDate",
  "dateOrder",
  // Writing
  "firstPerson",
  "longLines",
  "fewActionVerbs",
  "noNumbers",
  // Skills and other sections
  "noSkills",
  "duplicateSkill",
  "invalidProjectUrl",
  "invalidReferenceEmail",
  "noExtras",
  "customNoTitle",
  "hiddenSection",
  // Layout and design
  "tooManyPages",
  "lowContrast",
] as const;
export type CheckRule = (typeof CHECK_RULES)[number];

/** Jump target for the personal details card in the form. */
export const PERSONAL_TARGET = "personal";
/**
 * Jump target for findings that are fixed in the Design tab (page count, accent
 * contrast). It is not a DOM id: the builder should open its Design tab for it.
 */
export const DESIGN_TARGET = "design";

/** Where a finding belongs: the personal details, a CV section, or the Design tab. */
export type CheckArea = "personal" | "design" | SectionKey;

export interface CheckItem {
  /** Unique and stable within one result, e.g. "noDates:experience:exp1". */
  id: string;
  rule: CheckRule;
  level: CheckLevel;
  /**
   * DOM id to jump to: "personal", a section's `sectionDomId` ("experience",
   * "custom-<id>", …) or DESIGN_TARGET.
   */
  target: string;
  /** The entry the finding is about (matches `data-item-id` in the form). */
  itemId?: string;
  area: CheckArea;
  /**
   * Values for the message. Entry findings carry `entry` (the entry's title, may be "")
   * and `index` (1-based position in its list); others carry counts such as `count`,
   * `total`, `pages`, `ratio` or `name`.
   */
  params?: Record<string, string | number>;
}

export interface CheckResult {
  /** 0–100, deterministic. */
  score: number;
  /** Sorted by level (errors first), then by position in the form. */
  items: CheckItem[];
}

/* ---------- Thresholds and weights ---------- */

export const SUMMARY_MIN_CHARS = 150;
export const SUMMARY_MAX_CHARS = 800;
export const MAX_LINE_CHARS = 220;
export const MAX_PAGES = 2;
export const MIN_ACCENT_CONTRAST = 4.5;
/** Below this share of points starting with an action verb, the checker suggests verbs. */
export const ACTION_VERB_RATIO = 0.5;
/** Writing-pattern checks need at least this many points to be meaningful. */
export const MIN_LINES_FOR_PATTERNS = 3;

/**
 * Completeness weights (they add up to 100). A missing part costs its weight.
 * `background` is lost entirely when there's neither experience nor education
 * (together with `descriptions`); with only one of them, `oneBackground` is lost.
 */
export const COMPLETENESS_WEIGHTS = {
  name: 10,
  email: 8,
  phone: 6,
  city: 4,
  title: 4,
  summary: 14,
  background: 28,
  descriptions: 10,
  skills: 12,
  extras: 4,
} as const;
const ONE_BACKGROUND_MISSING = 6;
const NO_BACKGROUND = COMPLETENESS_WEIGHTS.background + COMPLETENESS_WEIGHTS.descriptions;

/** Penalties for quality findings (per finding) and the most each rule can cost in total. */
const QUALITY_PENALTY: Partial<Record<CheckRule, { each: number; cap: number }>> = {
  invalidLinkedin: { each: 3, cap: 3 },
  invalidWebsite: { each: 3, cap: 3 },
  photoAts: { each: 1, cap: 1 },
  summaryShort: { each: 5, cap: 5 },
  summaryLong: { each: 5, cap: 5 },
  noBullets: { each: 1, cap: 3 },
  noDates: { each: 4, cap: 12 },
  noStartDate: { each: 2, cap: 6 },
  noEndDate: { each: 2, cap: 6 },
  dateOrder: { each: 5, cap: 10 },
  firstPerson: { each: 2, cap: 6 },
  longLines: { each: 1, cap: 3 },
  fewActionVerbs: { each: 3, cap: 3 },
  noNumbers: { each: 2, cap: 2 },
  duplicateSkill: { each: 1, cap: 3 },
  invalidProjectUrl: { each: 2, cap: 6 },
  invalidReferenceEmail: { each: 2, cap: 6 },
  customNoTitle: { each: 3, cap: 6 },
  tooManyPages: { each: 5, cap: 5 },
  lowContrast: { each: 4, cap: 4 },
};

/* ---------- Text helpers (exported for tests) ---------- */

/** The lines of a description as the CV renders them (bullet markers removed), and whether any is a bullet. */
export function descriptionLines(text: string): { lines: string[]; hasBullets: boolean } {
  const lines: string[] = [];
  let hasBullets = false;
  for (const block of toBlocks(text)) {
    if (block.kind === "ul") {
      hasBullets = true;
      lines.push(...block.items);
    } else {
      lines.push(block.text);
    }
  }
  return { lines: lines.map((l) => l.trim()).filter(Boolean), hasBullets };
}

/** Leading punctuation, quotes and brackets that may precede the first word of a line. */
const LEADING_NOISE = /^[\s"'“”‘’([{•*·–-]+/u;

/** First word of a line, lowercased, keeping inner apostrophes and hyphens ("i’m", "co-led"). */
export function firstWord(line: string): string {
  const m = /^[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/u.exec(line.replace(LEADING_NOISE, ""));
  return m ? m[0].toLowerCase() : "";
}

/** First-person words that CV points usually leave out (English and Indonesian). */
const FIRST_PERSON_WORDS: ReadonlySet<string> = new Set([
  "i",
  "i'm",
  "i’m",
  "i've",
  "i’ve",
  "i'd",
  "i’d",
  "i'll",
  "i’ll",
  "me",
  "my",
  "myself",
  "mine",
  "saya",
  "aku",
]);

/** True when the line starts with "I", "my", "saya", "aku" and similar. */
export function startsWithFirstPerson(line: string): boolean {
  return FIRST_PERSON_WORDS.has(firstWord(line));
}

/**
 * English action verbs in their base form. Past ("managed"), third person ("manages")
 * and -ing ("managing") forms are recognised by `isActionVerb`.
 */
const EN_VERBS: ReadonlySet<string> = new Set(
  (
    "accelerate achieve acquire adapt administer advise advocate align analyse analyze answer apply approve arrange " +
    "assemble assess assist audit author automate award balance boost brief build calculate champion chair clean " +
    "coach collaborate collect communicate compile complete conduct configure consolidate construct consult " +
    "contribute control convert coordinate create curate cut debug decrease define deliver deploy design develop " +
    "diagnose direct distribute document double draft drive earn edit educate eliminate enable engineer enhance " +
    "ensure establish evaluate exceed execute expand facilitate forecast form found gather generate grow guide " +
    "handle help hire host identify implement improve increase initiate inspect install integrate interview " +
    "introduce investigate launch lead lower maintain manage map market measure mentor merge migrate model " +
    "moderate modernise modernize monitor motivate negotiate onboard operate optimise optimize orchestrate " +
    "organise organize oversee own participate partner perform pilot pioneer plan prepare present prioritise " +
    "prioritize process produce program promote propose prototype provide publish raise rebuild recommend " +
    "reconcile record recruit redesign reduce refactor regulate renew reorganise reorganize report represent " +
    "research resolve respond restore restructure revamp review revise run save schedule secure select sell " +
    "serve set ship simplify solve spearhead standardise standardize steer streamline strengthen structure " +
    "supervise support survey teach test track train transform translate triple troubleshoot tutor update " +
    "upgrade validate verify volunteer win write"
  ).split(" "),
);

/** Irregular and doubled-consonant forms that suffix stripping can't reduce to a base verb. */
const EN_VERB_FORMS: ReadonlySet<string> = new Set([
  "built",
  "rebuilt",
  "cut",
  "drove",
  "driven",
  "grew",
  "headed",
  "held",
  "led",
  "oversaw",
  "ran",
  "sold",
  "set",
  "taught",
  "won",
  "wrote",
  "spoke",
  "gave",
  "undertook",
]);

/** -ed words that usually describe a person rather than an action ("Experienced in …"). */
const EN_ED_ADJECTIVES: ReadonlySet<string> = new Set([
  "advanced",
  "based",
  "certified",
  "committed",
  "dedicated",
  "detailed",
  "experienced",
  "focused",
  "interested",
  "licensed",
  "motivated",
  "qualified",
  "related",
  "seasoned",
  "self-motivated",
  "skilled",
  "talented",
  "varied",
]);

/**
 * Indonesian action verbs that don't follow the me- prefix pattern. "Bertanggung jawab"
 * ("responsible for") is deliberately not counted: it describes a duty, not an action.
 */
const ID_VERBS: ReadonlySet<string> = new Set([
  "berhasil",
  "berkolaborasi",
  "berkontribusi",
  "berperan",
  "berpartisipasi",
]);

/** Words that look like Indonesian me- verbs but aren't (and common English words with the same start). */
const ID_ME_EXCEPTIONS: ReadonlySet<string> = new Set([
  "member",
  "members",
  "membership",
  "memory",
  "memories",
  "memorandum",
  "mental",
  "mentally",
  "menara",
  "menteri",
  "mentega",
  "merchant",
  "merchandise",
  "merchandising",
  "merger",
  "mergers",
  "merit",
  "melody",
  "mengenai",
  "merupakan",
  "menjadi",
]);

function enBaseCandidates(word: string): string[] {
  const out = [word];
  const push = (s: string) => {
    if (s.length >= 2) out.push(s);
  };
  const undouble = (s: string) => (/([bdgklmnprt])\1$/.test(s) ? s.slice(0, -1) : s);
  if (word.endsWith("ied") || word.endsWith("ies")) push(`${word.slice(0, -3)}y`);
  if (word.endsWith("ed")) {
    const stem = word.slice(0, -2);
    push(stem); // "launched" → "launch"
    push(word.slice(0, -1)); // "managed" → "manage"
    push(undouble(stem)); // "planned" → "plan"
  }
  if (word.endsWith("ing")) {
    const stem = word.slice(0, -3);
    push(stem);
    push(`${stem}e`);
    push(undouble(stem)); // "running" → "run"
  }
  if (word.endsWith("es")) push(word.slice(0, -2));
  if (word.endsWith("s")) push(word.slice(0, -1));
  return out;
}

function isEnglishActionVerb(word: string): boolean {
  if (EN_VERB_FORMS.has(word)) return true;
  if (enBaseCandidates(word).some((c) => EN_VERBS.has(c))) return true;
  // Most other past-tense words at the start of a point are actions too ("Spearheaded").
  return word.length >= 6 && word.endsWith("ed") && !EN_ED_ADJECTIVES.has(word);
}

function isIndonesianActionVerb(word: string): boolean {
  if (ID_VERBS.has(word)) return true;
  // Active verbs with the me- prefix: me-, mem-, men-, meng-, meny- (membangun, mengelola, menyusun, merancang, …).
  return /^me[mnlrwy][a-z]{3,}$/.test(word) && !ID_ME_EXCEPTIONS.has(word);
}

/** True when the word is an action verb in English or Indonesian (case-insensitive, any common form). */
export function isActionVerb(rawWord: string): boolean {
  const word = rawWord.toLowerCase();
  if (!word) return false;
  if (isEnglishActionVerb(word) || isIndonesianActionVerb(word)) return true;
  // "co-led", "re-designed": judge the part after the last hyphen.
  const dash = word.lastIndexOf("-");
  if (dash > 0 && dash < word.length - 1) return isActionVerb(word.slice(dash + 1));
  return false;
}

/** True when the line's first word is an action verb. */
export function startsWithActionVerb(line: string): boolean {
  return isActionVerb(firstWord(line));
}

/** "YYYY" or "YYYY-MM" → comparable parts; null for anything else. */
function parseMonth(value: string): { year: number; month: number | null } | null {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  return { year: Number(m[1]), month: m[2] ? Number(m[2]) : null };
}

/**
 * True when the end date is before the start date. A year-only date is compared by
 * year, so "2024-05" → "2024" is fine (the end can be any month of 2024).
 */
export function isEndBeforeStart(start: string, end: string): boolean {
  const s = parseMonth(start);
  const e = parseMonth(end);
  if (!s || !e) return false;
  if (s.year !== e.year) return e.year < s.year;
  if (s.month === null || e.month === null) return false;
  return e.month < s.month;
}

const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const has = (s: string) => s.trim().length > 0;
const join = (parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");

/* ---------- The checker ---------- */

/** An entry finding's subject: `index` is its position in its own list, `rank` its position in the section. */
type Entry = { id: string; title: string; index: number; rank: number };

interface Draft {
  rule: CheckRule;
  level: CheckLevel;
  area: CheckArea;
  itemId?: string;
  params?: Record<string, string | number>;
  /** Completeness weight lost, or a quality penalty (capped per rule). */
  penalty: number;
  /** Sort position: area, then entry index, then insertion order. */
  areaRank: number;
  entryRank: number;
  seq: number;
}

function entryTitle(section: ListSection, item: ListItem<ListSection>): string {
  switch (section) {
    case "experience": {
      const e = item as ListItem<"experience">;
      return join([e.jobTitle, e.company]);
    }
    case "education": {
      const e = item as ListItem<"education">;
      return join([e.degree, e.institution]) || e.field.trim();
    }
    case "projects":
      return (item as ListItem<"projects">).name.trim();
    case "organizations": {
      const o = item as ListItem<"organizations">;
      return join([o.role, o.organization]);
    }
    case "awards":
      return (item as ListItem<"awards">).title.trim();
    case "references":
      return (item as ListItem<"references">).name.trim();
    case "certifications":
      return (item as ListItem<"certifications">).name.trim();
    case "technicalSkills":
    case "softSkills":
    case "languages":
    case "interests":
      return (item as { name: string }).name.trim();
  }
}

function customEntryTitle(item: CustomItem): string {
  return item.title.trim() || item.subtitle.trim();
}

/** Run every rule on the CV. `pages` is the rendered page count, when known. */
export function runChecks(cv: CVData, opts: { pages?: number } = {}): CheckResult {
  const order = allSectionsInOrder(cv);
  const visible = new Set<SectionKey>(visibleSectionsInOrder(cv));
  const rankOf = new Map<string, number>(order.map((key, i) => [key, i]));
  const drafts: Draft[] = [];
  let seq = 0;

  const add = (
    rule: CheckRule,
    level: CheckLevel,
    area: CheckArea,
    penalty: number,
    extra: { entry?: Entry; params?: Record<string, string | number> } = {},
  ) => {
    const areaRank =
      area === "personal" ? -1 : area === "design" ? order.length + 1 : (rankOf.get(area) ?? order.length);
    const params: Record<string, string | number> = { ...extra.params };
    if (extra.entry) {
      params.entry = extra.entry.title;
      params.index = extra.entry.index + 1;
    }
    drafts.push({
      rule,
      level,
      area,
      itemId: extra.entry?.id,
      params: Object.keys(params).length > 0 ? params : undefined,
      penalty,
      areaRank,
      entryRank: extra.entry ? extra.entry.rank : -1,
      seq: seq++,
    });
  };
  const quality = (rule: CheckRule) => QUALITY_PENALTY[rule]?.each ?? 0;

  /**
   * Filled entries of a visible built-in list, with their positions in the full list.
   * `rankOffset` places a second list of the same section (soft skills) after the first.
   */
  const entries = <S extends ListSection>(
    section: S,
    key: BuiltinSectionKey,
    rankOffset = 0,
  ): { item: ListItem<S>; entry: Entry }[] => {
    if (!visible.has(key)) return [];
    const filled = new Set<ListItem<S>>(filledItems(cv, section));
    return (cv[section] as ListItem<S>[]).flatMap((item, index) =>
      filled.has(item)
        ? [{ item, entry: { id: item.id, title: entryTitle(section, item), index, rank: rankOffset + index } }]
        : [],
    );
  };
  const visibleFilled = (key: SectionKey) => visible.has(key) && isSectionFilled(cv, key);
  const hiddenFilled = (key: SectionKey) => !visible.has(key) && isSectionFilled(cv, key);

  /* Personal details (always shown). */
  const p = cv.personal;
  const W = COMPLETENESS_WEIGHTS;
  if (!has(p.fullName)) add("missingName", "error", "personal", W.name);
  if (!has(p.email)) add("missingEmail", "error", "personal", W.email);
  else if (!isValidEmail(p.email)) add("invalidEmail", "error", "personal", W.email);
  if (!has(p.phone)) add("missingPhone", "warning", "personal", W.phone);
  if (!has(p.city)) add("missingCity", "tip", "personal", W.city);
  if (!has(p.title)) add("missingTitle", "tip", "personal", W.title);
  if (has(p.linkedin) && !isValidUrl(p.linkedin)) {
    add("invalidLinkedin", "warning", "personal", quality("invalidLinkedin"));
  }
  if (has(p.website) && !isValidUrl(p.website)) {
    add("invalidWebsite", "warning", "personal", quality("invalidWebsite"));
  }
  // ATS Minimal never shows the photo.
  if (has(p.photo) && cv.meta.template === "ats-minimal") add("photoAts", "tip", "personal", quality("photoAts"));

  /* Summary. */
  const summary = cv.summary.trim();
  if (visibleFilled("summary")) {
    const count = summary.length;
    if (count < SUMMARY_MIN_CHARS) {
      add("summaryShort", "tip", "summary", quality("summaryShort"), { params: { count } });
    } else if (count > SUMMARY_MAX_CHARS) {
      add("summaryLong", "warning", "summary", quality("summaryLong"), { params: { count } });
    }
  } else if (hiddenFilled("summary")) {
    add("hiddenSection", "tip", "summary", W.summary);
  } else {
    add("summaryMissing", "warning", "summary", W.summary);
  }

  /* Work experience and education: the core of the CV. */
  const expVisible = visibleFilled("experience");
  const eduVisible = visibleFilled("education");
  const expHidden = hiddenFilled("experience");
  const eduHidden = hiddenFilled("education");
  const backgroundLoss = (exp: boolean, edu: boolean) =>
    exp && edu ? 0 : exp || edu ? ONE_BACKGROUND_MISSING : NO_BACKGROUND;
  const actualLoss = backgroundLoss(expVisible, eduVisible);
  if (actualLoss > 0) {
    const lossIfShown = backgroundLoss(expVisible || expHidden, eduVisible || eduHidden);
    // Points lost only because filled sections are hidden are explained by "hiddenSection".
    const hiddenKeys = [expHidden ? "experience" : null, eduHidden ? "education" : null].filter(
      (k): k is "experience" | "education" => k !== null,
    );
    const hiddenLoss = actualLoss - lossIfShown;
    for (const key of hiddenKeys) add("hiddenSection", "tip", key, hiddenLoss / hiddenKeys.length);
    if (lossIfShown === NO_BACKGROUND) {
      const first = order.find((k) => k === "experience" || k === "education") ?? "experience";
      add("noExperienceOrEducation", "error", first, NO_BACKGROUND);
    } else if (lossIfShown > 0) {
      if (!(expVisible || expHidden)) add("noExperience", "tip", "experience", lossIfShown);
      else add("noEducation", "tip", "education", lossIfShown);
    }
  }

  const experience = entries("experience", "experience");
  for (const { item, entry } of experience) {
    const { lines, hasBullets } = descriptionLines(item.description);
    if (lines.length === 0) {
      // The descriptions weight is shared by the visible experience entries.
      add("noDescription", "tip", "experience", W.descriptions / experience.length, { entry });
    } else if (!hasBullets) {
      add("noBullets", "tip", "experience", quality("noBullets"), { entry });
    }
  }

  /* Dates. */
  const checkDates = (
    area: SectionKey,
    entry: Entry,
    d: { startDate: string; endDate: string; current?: boolean },
    mode: "full" | "education" | "orderOnly",
  ) => {
    const start = has(d.startDate);
    const end = has(d.endDate) || d.current === true;
    if (mode !== "orderOnly") {
      if (!start && !end) add("noDates", "warning", area, quality("noDates"), { entry });
      else if (mode === "full" && !start) add("noStartDate", "tip", area, quality("noStartDate"), { entry });
      else if (mode === "full" && !end) add("noEndDate", "tip", area, quality("noEndDate"), { entry });
    }
    if (!d.current && isEndBeforeStart(d.startDate, d.endDate)) {
      add("dateOrder", "error", area, quality("dateOrder"), { entry });
    }
  };
  for (const { item, entry } of experience) checkDates("experience", entry, item, "full");
  for (const { item, entry } of entries("education", "education")) checkDates("education", entry, item, "education");
  const organizations = entries("organizations", "organizations");
  for (const { item, entry } of organizations) checkDates("organizations", entry, item, "full");

  const customSections = cv.customSections
    .map((section) => ({ section, key: customSectionKey(section.id) }))
    .filter(({ key }) => visible.has(key));
  const customEntries = customSections.map(({ section, key }) => {
    const filled = new Set(filledCustomItems(section));
    return {
      key,
      items: section.items.flatMap((item, index) =>
        filled.has(item) ? [{ item, entry: { id: item.id, title: customEntryTitle(item), index, rank: index } }] : [],
      ),
    };
  });
  for (const { key, items } of customEntries) {
    for (const { item, entry } of items) checkDates(key, entry, item, "orderOnly");
  }

  /* Writing: first person and very long lines, per entry. */
  const writing = (area: SectionKey, entry: Entry, text: string) => {
    const { lines } = descriptionLines(text);
    const firstPerson = lines.filter(startsWithFirstPerson).length;
    if (firstPerson > 0) {
      add("firstPerson", "tip", area, quality("firstPerson"), { entry, params: { count: firstPerson } });
    }
    const long = lines.filter((l) => l.length > MAX_LINE_CHARS).length;
    if (long > 0) {
      add("longLines", "tip", area, quality("longLines"), { entry, params: { count: long, max: MAX_LINE_CHARS } });
    }
  };
  for (const { item, entry } of experience) writing("experience", entry, item.description);
  for (const { item, entry } of entries("education", "education")) writing("education", entry, item.description);
  for (const { item, entry } of entries("projects", "projects")) writing("projects", entry, item.description);
  for (const { item, entry } of organizations) writing("organizations", entry, item.description);
  for (const { item, entry } of entries("awards", "awards")) writing("awards", entry, item.description);
  for (const { key, items } of customEntries) {
    for (const { item, entry } of items) writing(key, entry, item.description);
  }

  /* Writing: action verbs (experience + organizations) and numbers (experience). */
  const expLines = experience.flatMap(({ item }) => descriptionLines(item.description).lines);
  const orgLines = organizations.flatMap(({ item }) => descriptionLines(item.description).lines);
  const pointLines = [...expLines, ...orgLines];
  if (pointLines.length >= MIN_LINES_FOR_PATTERNS) {
    const count = pointLines.filter(startsWithActionVerb).length;
    if (count / pointLines.length < ACTION_VERB_RATIO) {
      add("fewActionVerbs", "tip", expLines.length > 0 ? "experience" : "organizations", quality("fewActionVerbs"), {
        params: { count, total: pointLines.length },
      });
    }
  }
  if (expLines.length >= MIN_LINES_FOR_PATTERNS && !expLines.some((l) => /\d/.test(l))) {
    add("noNumbers", "tip", "experience", quality("noNumbers"));
  }

  /* Skills. */
  if (visibleFilled("skills")) {
    const seen = new Map<string, string>();
    const reported = new Set<string>();
    const skills = [
      ...entries("technicalSkills", "skills"),
      ...entries("softSkills", "skills", cv.technicalSkills.length),
    ];
    for (const { item, entry } of skills) {
      const norm = normalizeName(item.name);
      if (!norm) continue;
      const firstName = seen.get(norm);
      if (firstName === undefined) seen.set(norm, item.name.trim());
      else if (!reported.has(norm)) {
        reported.add(norm);
        add("duplicateSkill", "warning", "skills", quality("duplicateSkill"), { entry, params: { name: firstName } });
      }
    }
  } else if (hiddenFilled("skills")) {
    add("hiddenSection", "tip", "skills", W.skills);
  } else {
    add("noSkills", "warning", "skills", W.skills);
  }

  /* Links and emails in other sections. */
  for (const { item, entry } of entries("projects", "projects")) {
    if (has(item.url) && !isValidUrl(item.url))
      add("invalidProjectUrl", "warning", "projects", quality("invalidProjectUrl"), { entry });
  }
  for (const { item, entry } of entries("references", "references")) {
    if (has(item.email) && !isValidEmail(item.email))
      add("invalidReferenceEmail", "warning", "references", quality("invalidReferenceEmail"), { entry });
  }

  /* Custom sections without a title. */
  for (const { section, key } of customSections) {
    if (!has(section.title)) add("customNoTitle", "warning", key, quality("customNoTitle"));
  }

  /* Optional sections that show more than jobs and school. */
  // Filled but hidden extras count: hiding them was a deliberate choice.
  const extraKeys: SectionKey[] = [
    "projects",
    "certifications",
    "organizations",
    "awards",
    "languages",
    ...cv.customSections.map((s) => customSectionKey(s.id)),
  ];
  if (!extraKeys.some((k) => isSectionFilled(cv, k))) {
    const target = order.find((k) => extraKeys.includes(k) && visible.has(k)) ?? "projects";
    add("noExtras", "tip", target, W.extras);
  }

  /* Layout and design. */
  if (opts.pages !== undefined && Number.isFinite(opts.pages) && opts.pages > MAX_PAGES) {
    add("tooManyPages", "warning", "design", quality("tooManyPages"), { params: { pages: Math.floor(opts.pages) } });
  }
  const accent = cv.meta.style.accent;
  if (accent) {
    const ratio = contrastOnWhite(accent);
    if (ratio < MIN_ACCENT_CONTRAST) {
      add("lowContrast", "warning", "design", quality("lowContrast"), {
        params: { ratio: Math.floor(ratio * 10) / 10 },
      });
    }
  }

  return finish(drafts);
}

function finish(drafts: Draft[]): CheckResult {
  // Sum penalties, capping quality rules so one repeated issue can't dominate the score.
  const perRule = new Map<CheckRule, number>();
  for (const d of drafts) perRule.set(d.rule, (perRule.get(d.rule) ?? 0) + d.penalty);
  let lost = 0;
  for (const [rule, sum] of perRule) {
    const cap = QUALITY_PENALTY[rule]?.cap;
    lost += cap === undefined ? sum : Math.min(cap, sum);
  }
  const score = Math.max(0, Math.min(100, Math.round(100 - lost)));

  const levelRank = (l: CheckLevel) => CHECK_LEVELS.indexOf(l);
  const items = [...drafts]
    .sort(
      (a, b) =>
        levelRank(a.level) - levelRank(b.level) ||
        a.areaRank - b.areaRank ||
        a.entryRank - b.entryRank ||
        a.seq - b.seq,
    )
    .map((d): CheckItem => {
      const target =
        d.area === "personal" ? PERSONAL_TARGET : d.area === "design" ? DESIGN_TARGET : sectionDomId(d.area);
      const item: CheckItem = {
        id: [d.rule, d.area, d.itemId].filter(Boolean).join(":"),
        rule: d.rule,
        level: d.level,
        target,
        area: d.area,
      };
      if (d.itemId) item.itemId = d.itemId;
      if (d.params) item.params = d.params;
      return item;
    });
  return { score, items };
}

/** Number of findings per level, e.g. for a badge. */
export function countByLevel(items: readonly CheckItem[]): Record<CheckLevel, number> {
  const counts: Record<CheckLevel, number> = { error: 0, warning: 0, tip: 0 };
  for (const item of items) counts[item.level] += 1;
  return counts;
}

export type ScoreBand = "low" | "medium" | "high";

/** Rough verdict for a score: high ≥ 85, medium ≥ 60, otherwise low. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  return "low";
}
