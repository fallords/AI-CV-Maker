import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createElement as h } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChecksPanel } from "@/components/builder/ChecksPanel";
import {
  CHECK_RULES,
  DESIGN_TARGET,
  descriptionLines,
  firstWord,
  isActionVerb,
  isEndBeforeStart,
  runChecks,
  scoreBand,
  startsWithActionVerb,
  startsWithFirstPerson,
  type CheckItem,
  type CheckRule,
} from "@/lib/cv-checks";
import { createEmptyCV, type CVData, type Language } from "@/lib/cv-schema";
import { customSectionKey } from "@/lib/cv-sections";
import { contrastOnWhite } from "@/lib/doc-style";
import { I18nProvider } from "@/lib/i18n";
import checksEn from "@/lib/i18n/features/checks.en";
import checksId from "@/lib/i18n/features/checks.id";
import { richSampleCV, sampleCV } from "@/lib/sample-cv";

/** sampleCV with one real figure in the experience, so no rule fires: score 100, no findings. */
function cleanCV(): CVData {
  const cv = sampleCV();
  cv.experience[0].description = cv.experience[0].description.replace(
    "Maintain weekly delivery-performance dashboards",
    "Maintain 12 weekly delivery-performance dashboards",
  );
  return cv;
}

const rules = (items: CheckItem[]) => items.map((i) => i.rule);
const find = (items: CheckItem[], rule: CheckRule) => items.filter((i) => i.rule === rule);
const one = (items: CheckItem[], rule: CheckRule) => {
  const found = find(items, rule);
  expect(found, `expected exactly one "${rule}" in ${JSON.stringify(rules(items))}`).toHaveLength(1);
  return found[0];
};

describe("runChecks: overall", () => {
  it("scores a complete, clean CV 100 with no findings", () => {
    expect(runChecks(cleanCV())).toEqual({ score: 100, items: [] });
    expect(runChecks(cleanCV(), { pages: 2 })).toEqual({ score: 100, items: [] });
  });

  it("scores an empty CV 0 and lists the missing basics", () => {
    const { score, items } = runChecks(createEmptyCV());
    expect(score).toBe(0);
    expect(rules(items).sort()).toEqual(
      [
        "missingName",
        "missingEmail",
        "missingPhone",
        "missingCity",
        "missingTitle",
        "summaryMissing",
        "noExperienceOrEducation",
        "noSkills",
        "noExtras",
      ].sort(),
    );
  });

  it("only gives the sample CVs a tip about real figures", () => {
    for (const cv of [sampleCV(), richSampleCV(), richSampleCV("graduate")]) {
      const { score, items } = runChecks(cv);
      expect(rules(items)).toEqual(["noNumbers"]);
      expect(score).toBe(98);
    }
  });

  it("is deterministic and does not change the CV", () => {
    const cv = richSampleCV();
    cv.personal.email = "broken@";
    cv.experience[1].endDate = "2019-01";
    const before = JSON.stringify(cv);
    const a = runChecks(cv, { pages: 3 });
    const b = runChecks(structuredClone(cv), { pages: 3 });
    expect(a).toEqual(b);
    expect(JSON.stringify(cv)).toBe(before);
  });

  it("gives every finding a unique id, a known rule and a target", () => {
    const cv = createEmptyCV();
    cv.personal.fullName = "Dewi";
    cv.experience = [
      { id: "e1", jobTitle: "Kasir", company: "", location: "", startDate: "", endDate: "", current: false, description: "" },
      { id: "e2", jobTitle: "Staf", company: "", location: "", startDate: "2024", endDate: "2020", current: false, description: "saya bekerja" },
    ];
    cv.technicalSkills = [
      { id: "s1", name: "Excel", level: "" },
      { id: "s2", name: "excel", level: "" },
    ];
    const { items } = runChecks(cv, { pages: 4 });
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of items) {
      expect(CHECK_RULES).toContain(item.rule);
      expect(item.target).toBeTruthy();
    }
  });

  it("sorts errors first, then warnings, then tips, each in form order", () => {
    const cv = cleanCV();
    cv.personal.phone = ""; // warning, personal
    cv.personal.city = ""; // tip, personal
    cv.summary = "Short."; // tip, summary
    cv.experience[2].startDate = "2020-01"; // error (end 2019-12), experience entry 3
    cv.experience[1].endDate = "2019-01"; // error, experience entry 2
    cv.personal.email = "nope"; // error, personal
    const { items } = runChecks(cv, { pages: 3 });
    expect(items.map((i) => i.level)).toEqual(["error", "error", "error", "warning", "warning", "tip", "tip"]);
    expect(items.map((i) => i.id)).toEqual([
      "invalidEmail:personal",
      "dateOrder:experience:exp2",
      "dateOrder:experience:exp3",
      "missingPhone:personal",
      "tooManyPages:design",
      "missingCity:personal",
      "summaryShort:summary",
    ]);
  });

  it("follows the section order of the template and of the user", () => {
    const cv = cleanCV();
    cv.experience[0].startDate = "";
    cv.experience[0].current = false;
    cv.education[0].startDate = "";
    cv.education[0].endDate = "";
    const order = (c: CVData) => runChecks(c).items.map((i) => i.target);
    expect(order(cv)).toEqual(["experience", "education"]);
    cv.meta.template = "graduate"; // education comes before experience
    expect(order(cv)).toEqual(["education", "experience"]);
    cv.meta.template = "ats-minimal";
    cv.meta.sectionOrder = ["education", "experience"];
    expect(order(cv)).toEqual(["education", "experience"]);
  });

  it("keeps the score within 0 to 100 and lowers it for every finding", () => {
    const base = runChecks(cleanCV()).score;
    const variants: ((cv: CVData) => void)[] = [
      (cv) => (cv.personal.city = ""),
      (cv) => (cv.personal.linkedin = "not a url"),
      (cv) => (cv.summary = "Too short."),
      (cv) => (cv.experience[0].description = "Did things"),
      (cv) => (cv.softSkills[0].name = "SQL"),
      (cv) => (cv.meta.style.accent = "#bbbbbb"),
    ];
    for (const change of variants) {
      const cv = cleanCV();
      change(cv);
      const { score, items } = runChecks(cv);
      expect(items.length).toBeGreaterThan(0);
      expect(score).toBeLessThan(base);
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });

  it("caps repeated quality issues so one rule can't dominate the score", () => {
    const cv = cleanCV();
    cv.experience = Array.from({ length: 20 }, (_, i) => ({
      id: `x${i}`,
      jobTitle: `Role ${i}`,
      company: "Toko",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "- Managed 3 stores",
    }));
    const { score, items } = runChecks(cv);
    expect(find(items, "noDates")).toHaveLength(20);
    expect(score).toBe(100 - 12);
  });
});

describe("runChecks: personal details", () => {
  it.each([
    ["fullName", "missingName", "error"],
    ["email", "missingEmail", "error"],
    ["phone", "missingPhone", "warning"],
    ["city", "missingCity", "tip"],
    ["title", "missingTitle", "tip"],
  ] as const)("flags a missing %s", (field, rule, level) => {
    const cv = cleanCV();
    cv.personal[field] = "   ";
    const item = one(runChecks(cv).items, rule);
    expect(item).toMatchObject({ level, target: "personal", area: "personal" });
    expect(item.itemId).toBeUndefined();
  });

  it("flags an invalid email instead of a missing one", () => {
    const cv = cleanCV();
    cv.personal.email = "alex@example";
    const { items } = runChecks(cv);
    expect(rules(items)).toEqual(["invalidEmail"]);
    expect(items[0].level).toBe("error");
  });

  it("flags invalid LinkedIn and website URLs, but not empty ones", () => {
    const cv = cleanCV();
    cv.personal.linkedin = "linkedin";
    cv.personal.website = "http://";
    expect(rules(runChecks(cv).items)).toEqual(["invalidLinkedin", "invalidWebsite"]);
    cv.personal.linkedin = "";
    cv.personal.website = "https://alex.dev/portfolio";
    expect(runChecks(cv).items).toEqual([]);
  });

  it("notes that ATS Minimal leaves out the photo", () => {
    const cv = cleanCV();
    cv.personal.photo = "data:image/png;base64,AAAA";
    expect(one(runChecks(cv).items, "photoAts")).toMatchObject({ level: "tip", target: "personal" });
    cv.meta.template = "modern-professional";
    expect(find(runChecks(cv).items, "photoAts")).toEqual([]);
  });
});

describe("runChecks: summary", () => {
  it("flags a missing summary", () => {
    const cv = cleanCV();
    cv.summary = "";
    expect(one(runChecks(cv).items, "summaryMissing")).toMatchObject({ level: "warning", target: "summary" });
  });

  it("flags summaries under 150 or over 800 characters, with the length", () => {
    const cv = cleanCV();
    cv.summary = "a".repeat(149);
    expect(one(runChecks(cv).items, "summaryShort")).toMatchObject({ level: "tip", params: { count: 149 } });
    cv.summary = `  ${"a".repeat(150)}  `;
    expect(runChecks(cv).items).toEqual([]);
    cv.summary = "a".repeat(800);
    expect(runChecks(cv).items).toEqual([]);
    cv.summary = "a".repeat(801);
    expect(one(runChecks(cv).items, "summaryLong")).toMatchObject({ level: "warning", params: { count: 801 } });
  });

  it("reports a hidden summary that has content instead of calling it missing", () => {
    const cv = cleanCV();
    cv.meta.hiddenSections = ["summary"];
    const hidden = runChecks(cv);
    expect(rules(hidden.items)).toEqual(["hiddenSection"]);
    expect(hidden.items[0]).toMatchObject({ target: "summary", level: "tip" });
    cv.summary = "";
    const missing = runChecks(cv);
    expect(rules(missing.items)).toEqual(["summaryMissing"]);
    expect(hidden.score).toBe(missing.score);
  });
});

describe("runChecks: experience and education", () => {
  it("raises an error when there's neither experience nor education", () => {
    const cv = cleanCV();
    cv.experience = [];
    cv.education = [];
    const { items, score } = runChecks(cv);
    expect(one(items, "noExperienceOrEducation")).toMatchObject({ level: "error", target: "experience" });
    expect(score).toBe(100 - 38);
    cv.meta.template = "graduate";
    expect(one(runChecks(cv).items, "noExperienceOrEducation").target).toBe("education");
  });

  it("ignores entries that have no content", () => {
    const cv = cleanCV();
    cv.experience = [
      { id: "blank", jobTitle: " ", company: "", location: "", startDate: "", endDate: "", current: true, description: "" },
    ];
    expect(rules(runChecks(cv).items)).toEqual(["noExperience"]);
  });

  it("suggests the missing half when only experience or only education is filled", () => {
    const student = cleanCV();
    student.experience = [];
    const s = runChecks(student);
    expect(rules(s.items)).toEqual(["noExperience"]);
    expect(s.items[0]).toMatchObject({ level: "tip", target: "experience" });
    expect(s.score).toBe(94);

    const worker = cleanCV();
    worker.education = [];
    expect(rules(runChecks(worker).items)).toEqual(["noEducation"]);
  });

  it("explains points lost to hidden experience or education", () => {
    const cv = cleanCV();
    cv.meta.hiddenSections = ["experience"];
    const { items, score } = runChecks(cv);
    expect(rules(items)).toEqual(["hiddenSection"]);
    expect(items[0].target).toBe("experience");
    expect(score).toBe(94);

    cv.meta.hiddenSections = ["experience", "education"];
    const both = runChecks(cv);
    expect(rules(both.items)).toEqual(["hiddenSection", "hiddenSection"]);
    expect(both.score).toBe(100 - 38);

    cv.education = [];
    const expOnly = runChecks(cv);
    expect(rules(expOnly.items).sort()).toEqual(["hiddenSection", "noEducation"]);
    expect(expOnly.score).toBe(100 - 38);
  });

  it("asks for a description and for bullet points in work experience", () => {
    const cv = cleanCV();
    cv.experience[1].description = "";
    cv.experience[2].description = "Assisted with survey data entry.\nProduced 4 reports.";
    const { items } = runChecks(cv);
    expect(one(items, "noDescription")).toMatchObject({
      level: "tip",
      target: "experience",
      itemId: "exp2",
      params: { entry: "Junior Business Analyst, Sample Retail Group", index: 2 },
    });
    expect(one(items, "noBullets")).toMatchObject({ itemId: "exp3", params: { index: 3 } });
  });
});

describe("runChecks: dates", () => {
  const job = (patch: Partial<CVData["experience"][number]>): CVData["experience"][number] => ({
    id: "j1",
    jobTitle: "Barista",
    company: "Kopi Kita",
    location: "",
    startDate: "2022-01",
    endDate: "2023-01",
    current: false,
    description: "- Served 200 customers a day",
    ...patch,
  });

  it.each([
    [{ startDate: "", endDate: "" }, "noDates", "warning"],
    [{ startDate: "2022-01", endDate: "" }, "noEndDate", "tip"],
    [{ startDate: "", endDate: "2023-01" }, "noStartDate", "tip"],
    [{ startDate: "", endDate: "", current: true }, "noStartDate", "tip"],
    [{ startDate: "2023-05", endDate: "2023-02" }, "dateOrder", "error"],
  ] as const)("flags experience dates %o as %s", (patch, rule, level) => {
    const cv = cleanCV();
    cv.experience = [job(patch)];
    expect(one(runChecks(cv).items, rule)).toMatchObject({ level, target: "experience", itemId: "j1" });
  });

  it("accepts complete, current and year-only ranges", () => {
    for (const patch of [
      { startDate: "2022-01", endDate: "", current: true },
      { startDate: "2022", endDate: "2023" },
      { startDate: "2024-05", endDate: "2024" },
      { startDate: "2024", endDate: "2024-01" },
    ]) {
      const cv = cleanCV();
      cv.experience = [job(patch)];
      expect(runChecks(cv).items).toEqual([]);
    }
  });

  it("only asks education for dates when it has none", () => {
    const cv = cleanCV();
    cv.education[0].startDate = "";
    expect(runChecks(cv).items).toEqual([]);
    cv.education[0].endDate = "";
    expect(one(runChecks(cv).items, "noDates")).toMatchObject({ target: "education", itemId: "edu1" });
    cv.education[0].startDate = "2020-09";
    cv.education[0].endDate = "2016";
    expect(one(runChecks(cv).items, "dateOrder")).toMatchObject({ level: "error", itemId: "edu1" });
  });

  it("checks organizations like work experience", () => {
    const cv = richSampleCV();
    cv.experience[0].description += "\n- Cut report time by 30%";
    cv.organizations[0].current = false;
    expect(one(runChecks(cv).items, "noEndDate")).toMatchObject({ target: "organizations", itemId: "org1" });
  });

  it("checks the order of custom entry dates, but doesn't require them", () => {
    const cv = richSampleCV();
    cv.experience[0].description += "\n- Cut report time by 30%";
    cv.customSections[0].items[1].startDate = "";
    expect(runChecks(cv).items).toEqual([]);
    cv.customSections[0].items[0].endDate = "2022-12";
    expect(one(runChecks(cv).items, "dateOrder")).toMatchObject({
      target: "custom-courses",
      area: customSectionKey("courses"),
      itemId: "course1",
      params: { entry: "Introduction to Machine Learning", index: 1 },
    });
  });

  it("compares year-only and month dates sensibly", () => {
    expect(isEndBeforeStart("2023-05", "2023-02")).toBe(true);
    expect(isEndBeforeStart("2023-05", "2023-05")).toBe(false);
    expect(isEndBeforeStart("2023-05", "2022")).toBe(true);
    expect(isEndBeforeStart("2023-05", "2023")).toBe(false);
    expect(isEndBeforeStart("2023", "2023-01")).toBe(false);
    expect(isEndBeforeStart("2023", "2022-12")).toBe(true);
    expect(isEndBeforeStart("", "2022")).toBe(false);
    expect(isEndBeforeStart("2022", "")).toBe(false);
  });
});

describe("runChecks: writing", () => {
  it("finds first-person lines in English and Indonesian, per entry", () => {
    const cv = cleanCV();
    cv.experience[0].description = [
      "- I managed 4 dashboards",
      "- I’m the owner of reporting",
      "- My team shipped 3 tools",
      "- IT support for 40 staff",
      "- Improved load times",
    ].join("\n");
    cv.experience[1].description = "- Saya mengelola laporan bulanan\n- aku membuat 3 dasbor\n- Menyusun SOP";
    cv.projects[0].description = "Improved a dashboard for 3 teams";
    const items = find(runChecks(cv).items, "firstPerson");
    expect(items.map((i) => [i.itemId, i.params?.count])).toEqual([
      ["exp1", 3],
      ["exp2", 2],
    ]);
    expect(items[0]).toMatchObject({ level: "tip", target: "experience" });
  });

  it("detects first-person words only at the start of a line", () => {
    expect(startsWithFirstPerson("I led the team")).toBe(true);
    expect(startsWithFirstPerson("i led the team")).toBe(true);
    expect(startsWithFirstPerson("“I’ve built…")).toBe(true);
    expect(startsWithFirstPerson("My role was")).toBe(true);
    expect(startsWithFirstPerson("SAYA bertanggung jawab")).toBe(true);
    expect(startsWithFirstPerson("Aku membuat")).toBe(true);
    expect(startsWithFirstPerson("IT helpdesk")).toBe(false);
    expect(startsWithFirstPerson("Implemented my plan")).toBe(false);
    expect(startsWithFirstPerson("Mylar packaging")).toBe(false);
    expect(startsWithFirstPerson("Sayap kanan")).toBe(false);
    expect(startsWithFirstPerson("")).toBe(false);
  });

  it("flags lines over 220 characters in any section", () => {
    const cv = cleanCV();
    cv.projects[1].description = `${"x".repeat(221)}\n- ${"y".repeat(220)}\n- ${"z".repeat(300)}`;
    expect(one(runChecks(cv).items, "longLines")).toMatchObject({
      level: "tip",
      target: "projects",
      itemId: "prj2",
      params: { count: 2, max: 220 },
    });
  });

  it("suggests action verbs when fewer than half the points start with one", () => {
    const cv = cleanCV();
    cv.experience[0].description = "- Responsible for 5 reports\n- Tasks included filing\n- Duties: answering calls";
    cv.experience[1].description = "- Managed the stock room";
    cv.experience[2].description = "- Bertanggung jawab atas kas";
    const item = one(runChecks(cv).items, "fewActionVerbs");
    expect(item).toMatchObject({ level: "tip", target: "experience", params: { count: 1, total: 5 } });
    expect(item.itemId).toBeUndefined();

    cv.experience[2].description = "- Mengelola kas harian\n- Menyusun laporan\n- Melayani pelanggan";
    expect(find(runChecks(cv).items, "fewActionVerbs")).toEqual([]);
  });

  it("needs at least three points before judging verbs or numbers", () => {
    const cv = cleanCV();
    cv.experience = [cv.experience[0]];
    cv.experience[0].description = "- Responsible for reports\n- Duties included filing";
    const r = rules(runChecks(cv).items);
    expect(r).not.toContain("fewActionVerbs");
    expect(r).not.toContain("noNumbers");
  });

  it("counts organization points for verbs and targets organizations when there's no experience", () => {
    const cv = richSampleCV("graduate");
    cv.experience = [];
    cv.organizations[0].description = "- Member of the board\n- Treasurer duties\n- Committee work";
    expect(one(runChecks(cv).items, "fewActionVerbs")).toMatchObject({
      target: "organizations",
      params: { count: 0, total: 3 },
    });
  });

  it("asks for real figures only when no experience point has a number", () => {
    const cv = sampleCV();
    const item = one(runChecks(cv).items, "noNumbers");
    expect(item).toMatchObject({ level: "tip", target: "experience" });
    cv.experience[2].description += "\n- Checked 1,200 survey forms";
    expect(find(runChecks(cv).items, "noNumbers")).toEqual([]);
  });

  it("recognises action verbs in English and Indonesian", () => {
    const verbs = [
      "Managed",
      "manages",
      "Managing",
      "manage",
      "Led",
      "Built",
      "Planned",
      "planning",
      "Identified",
      "identifies",
      "Processes",
      "Ran",
      "Running",
      "Oversaw",
      "Co-led",
      "Re-designed",
      "Spearheaded",
      "Mengelola",
      "membangun",
      "Menyusun",
      "Merancang",
      "Meningkatkan",
      "Melakukan",
      "Mewakili",
      "Berhasil",
      "Berkolaborasi",
      "Mentored",
    ];
    for (const verb of verbs) expect(isActionVerb(verb), verb).toBe(true);
    const others = [
      "Responsible",
      "The",
      "Experienced",
      "Skilled",
      "Member",
      "Bertanggung",
      "Saya",
      "Duties",
      "Work",
      "Menjadi",
      "Menu",
      "",
    ];
    for (const word of others) expect(isActionVerb(word), word).toBe(false);
    expect(startsWithActionVerb("- “Delivered” 3 projects")).toBe(true);
  });

  it("reads description lines the way the CV renders them", () => {
    expect(descriptionLines("- One\n\n• Two\nThree\n  ")).toEqual({ lines: ["One", "Two", "Three"], hasBullets: true });
    expect(descriptionLines("Plain text")).toEqual({ lines: ["Plain text"], hasBullets: false });
    expect(descriptionLines("")).toEqual({ lines: [], hasBullets: false });
    expect(firstWord("  (I’m) here")).toBe("i’m");
    expect(firstWord("Co-led a team")).toBe("co-led");
  });
});

describe("runChecks: skills and other sections", () => {
  it("flags missing skills", () => {
    const cv = cleanCV();
    cv.technicalSkills = [];
    cv.softSkills = [{ id: "blank", name: "  ", level: "expert" }];
    expect(one(runChecks(cv).items, "noSkills")).toMatchObject({ level: "warning", target: "skills" });
  });

  it("flags each repeated skill once, across both lists, ignoring case and spacing", () => {
    const cv = cleanCV();
    cv.softSkills.push({ id: "dup1", name: "sql", level: "" });
    cv.softSkills.push({ id: "dup2", name: "  SQL ", level: "" });
    cv.technicalSkills.push({ id: "dup3", name: "Power   BI", level: "" });
    const items = find(runChecks(cv).items, "duplicateSkill");
    expect(items.map((i) => [i.itemId, i.params?.name])).toEqual([
      ["dup3", "Power BI"],
      ["dup1", "SQL"],
    ]);
    expect(items[0]).toMatchObject({ level: "warning", target: "skills" });
  });

  it("flags invalid project URLs and reference emails", () => {
    const cv = richSampleCV();
    cv.experience[0].description += "\n- Cut report time by 30%";
    cv.projects[0].url = "github";
    cv.references[0].email = "sam@";
    const items = runChecks(cv).items;
    expect(one(items, "invalidProjectUrl")).toMatchObject({ target: "projects", itemId: "prj1", level: "warning" });
    expect(one(items, "invalidReferenceEmail")).toMatchObject({
      target: "references",
      itemId: "ref1",
      params: { entry: "Sam Placeholder", index: 1 },
    });
  });

  it("flags custom sections without a title, using the custom DOM id", () => {
    const cv = cleanCV();
    cv.customSections = [
      {
        id: "abc",
        title: " ",
        items: [{ id: "c1", title: "First aid course", subtitle: "", startDate: "", endDate: "", description: "" }],
      },
    ];
    expect(one(runChecks(cv).items, "customNoTitle")).toMatchObject({
      level: "warning",
      target: "custom-abc",
      area: "custom:abc",
    });
  });

  it("suggests optional sections only when none has content", () => {
    const cv = cleanCV();
    cv.projects = [];
    cv.certifications = [];
    expect(one(runChecks(cv).items, "noExtras")).toMatchObject({ level: "tip", target: "projects" });
    cv.languages = [{ id: "l1", name: "English", level: "fluent" }];
    expect(runChecks(cv).items).toEqual([]);
    cv.meta.hiddenSections = ["languages"]; // hidden on purpose: no nagging
    expect(runChecks(cv).items).toEqual([]);
  });

  it("skips content checks in hidden sections", () => {
    const cv = richSampleCV();
    cv.experience[0].description += "\n- Cut report time by 30%";
    cv.projects[0].url = "github";
    cv.references[0].email = "sam@";
    cv.organizations[0].startDate = "2030-01";
    cv.organizations[0].current = false;
    cv.organizations[0].endDate = "2020-01";
    cv.customSections[0].title = "";
    cv.meta.hiddenSections = ["projects", "references", "organizations", customSectionKey("courses")];
    expect(runChecks(cv).items).toEqual([]);
  });
});

describe("runChecks: layout and design", () => {
  it("flags more than two pages", () => {
    expect(one(runChecks(cleanCV(), { pages: 3 }).items, "tooManyPages")).toMatchObject({
      level: "warning",
      target: DESIGN_TARGET,
      area: "design",
      params: { pages: 3 },
    });
    expect(runChecks(cleanCV(), { pages: 2 }).items).toEqual([]);
    expect(runChecks(cleanCV(), { pages: Number.NaN }).items).toEqual([]);
  });

  it("flags a custom accent colour with low contrast on white", () => {
    const cv = cleanCV();
    cv.meta.style.accent = "#7fa7c9";
    const item = one(runChecks(cv).items, "lowContrast");
    expect(item).toMatchObject({ level: "warning", target: DESIGN_TARGET });
    const ratio = Number(item.params?.ratio);
    expect(ratio).toBeLessThan(4.5);
    expect(ratio).toBeCloseTo(Math.floor(contrastOnWhite("#7fa7c9") * 10) / 10, 5);
    for (const accent of ["", "#21507a", "#333333"]) {
      cv.meta.style.accent = accent;
      expect(runChecks(cv).items).toEqual([]);
    }
  });

  it("maps score bands", () => {
    expect(scoreBand(100)).toBe("high");
    expect(scoreBand(85)).toBe("high");
    expect(scoreBand(84)).toBe("medium");
    expect(scoreBand(60)).toBe("medium");
    expect(scoreBand(59)).toBe("low");
    expect(scoreBand(0)).toBe("low");
  });
});

describe("checks dictionaries", () => {
  const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
  const flat = (obj: unknown, prefix = ""): [string, string][] =>
    typeof obj === "string"
      ? [[prefix, obj]]
      : Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => flat(v, prefix ? `${prefix}.${k}` : k));

  it("has a message for every rule in both languages, with the same placeholders", () => {
    for (const rule of CHECK_RULES) {
      expect(checksEn.rules[rule], rule).toBeDefined();
      expect(checksId.rules[rule], rule).toBeDefined();
    }
    const en = new Map(flat(checksEn));
    const id = new Map(flat(checksId));
    expect([...id.keys()].sort()).toEqual([...en.keys()].sort());
    for (const [key, text] of en) expect(placeholders(id.get(key) ?? ""), key).toEqual(placeholders(text));
  });

  it("follows the copy rules (no em dashes, no exclamation marks)", () => {
    for (const [key, text] of [...flat(checksEn), ...flat(checksId)]) {
      expect(text, key).not.toMatch(/—|!/);
    }
  });
});

describe("ChecksPanel", () => {
  // Plain createElement keeps this test in a .ts file.
  const panel = (
    cv: CVData,
    pages: number,
    lang: Language,
    onJump: (target: string, itemId?: string, field?: string) => void,
  ) =>
    h(I18nProvider, { initialLang: lang, children: h(ChecksPanel, { cv, pages, onJump }) });

  function renderPanel(cv: CVData, { pages = 1, lang = "en" as Language } = {}) {
    const onJump = vi.fn();
    const utils = render(panel(cv, pages, lang, onJump));
    return { ...utils, onJump };
  }

  it("shows an empty state that jumps to the personal details", () => {
    const { onJump } = renderPanel(createEmptyCV());
    expect(screen.getByText(checksEn.empty)).toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: checksEn.emptyAction }));
    expect(onJump).toHaveBeenCalledWith("personal");
  });

  it("shows the score as text and as a meter, and the findings grouped by level", () => {
    const cv = cleanCV();
    cv.personal.email = "alex@";
    cv.personal.city = "";
    cv.experience[1].startDate = "";
    const { score, items } = runChecks(cv, { pages: 3 });
    renderPanel(cv, { pages: 3 });

    const meter = screen.getByRole("meter", { name: "Score" });
    expect(meter).toHaveAttribute("aria-valuenow", String(score));
    expect(meter).toHaveAttribute("aria-valuetext", `${score} out of 100`);
    expect(screen.getByTestId("checks-score")).toHaveTextContent(`${score} out of 100`);
    expect(screen.getByText(/1 error, 1 warning and 2 tips\./)).toBeInTheDocument();
    expect(screen.getByText(checksEn.score.withErrors, { exact: false })).toBeInTheDocument();

    const errors = screen.getByRole("list", { name: /Errors/ });
    const tips = screen.getByRole("list", { name: /Tips/ });
    expect(within(errors).getAllByRole("button")).toHaveLength(1);
    expect(within(tips).getAllByRole("button")).toHaveLength(2);
    expect(screen.getAllByRole("button")).toHaveLength(items.length);

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAccessibleName(
      "Error: Check your email address. It doesn’t look complete. Personal information",
    );
    expect(within(tips).getByRole("button", { name: /Add a start date\./ })).toHaveTextContent(
      "Work experience: Junior Business Analyst, Sample Retail Group",
    );
  });

  it("calls onJump with the target, entry id and field", () => {
    const cv = cleanCV();
    cv.experience[2].endDate = "2018-01";
    cv.meta.style.accent = "#aaaaaa";
    cv.personal.phone = "";
    const { onJump } = renderPanel(cv);
    fireEvent.click(screen.getByRole("button", { name: /The end date is before the start date/ }));
    expect(onJump).toHaveBeenLastCalledWith("experience", "exp3", "endDate");
    fireEvent.click(screen.getByRole("button", { name: /Add a phone number/ }));
    expect(onJump).toHaveBeenLastCalledWith("personal", undefined, "phone");
    fireEvent.click(screen.getByRole("button", { name: /accent colour/ }));
    expect(onJump).toHaveBeenLastCalledWith(DESIGN_TARGET, undefined, undefined);
  });

  it("shows a positive message when there's nothing to fix", () => {
    renderPanel(cleanCV());
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText(checksEn.score.bands.high)).toBeInTheDocument();
    expect(screen.getByText(checksEn.allClear)).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("updates when the CV changes", () => {
    const cv = cleanCV();
    const { rerender } = renderPanel(cv);
    const next = structuredClone(cv);
    next.personal.phone = "";
    act(() => {
      rerender(panel(next, 1, "en", () => {}));
    });
    expect(screen.getByRole("button", { name: /Add a phone number/ })).toBeInTheDocument();
  });

  it("renders in Indonesian, with plural-free counts and a comma decimal", () => {
    const cv = cleanCV();
    cv.meta.style.accent = "#7fa7c9";
    cv.customSections = [
      { id: "kursus", title: "", items: [{ id: "k1", title: "", subtitle: "Kursus", startDate: "", endDate: "", description: "" }] },
    ];
    cv.experience[0].description = "- Saya mengelola 3 laporan\n- Saya membuat dasbor";
    renderPanel(cv, { lang: "id" });
    expect(screen.getByRole("meter", { name: "Skor" })).toHaveAttribute(
      "aria-valuetext",
      expect.stringMatching(/^\d+ dari 100$/),
    );
    expect(screen.getByRole("heading", { name: /Peringatan/ })).toBeInTheDocument();
    expect(screen.getByText(/kontras \d,\d:1/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2 baris diawali “saya”/ })).toHaveTextContent(
      "Pengalaman kerja: Data Analyst, Example Logistics Co.",
    );
    expect(screen.getByRole("button", { name: /belum berjudul/ })).toHaveTextContent("Bagian tanpa judul");
  });
});
