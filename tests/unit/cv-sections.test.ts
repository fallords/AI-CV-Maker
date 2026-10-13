import { describe, expect, it } from "vitest";
import { RESERVED_IDS, TEMPLATE_IDS, createEmptyCV, isValidId, type CVData } from "@/lib/cv-schema";
import {
  BUILTIN_SECTIONS,
  SECTION_LISTS,
  TEMPLATE_SECTION_ORDER,
  allSectionsInOrder,
  customSectionKey,
  findCustomSection,
  isBuiltinSection,
  isSectionFilled,
  isSectionHidden,
  isSectionKey,
  parseCustomKey,
  sectionDomId,
  sectionExists,
  visibleSectionsInOrder,
  type SectionKey,
} from "@/lib/cv-sections";
import { richSampleCV, sampleCV } from "@/lib/sample-cv";

function withCustom(cv: CVData, ...ids: string[]): CVData {
  return {
    ...cv,
    customSections: ids.map((id) => ({
      id,
      title: id,
      items: [{ id: `${id}-1`, title: "Entry", subtitle: "", startDate: "", endDate: "", description: "" }],
    })),
  };
}

function withOrder(cv: CVData, sectionOrder: SectionKey[], hiddenSections: SectionKey[] = []): CVData {
  return { ...cv, meta: { ...cv.meta, sectionOrder, hiddenSections } };
}

describe("section keys", () => {
  it("lists every built-in section once in every template order", () => {
    expect(BUILTIN_SECTIONS).toHaveLength(11);
    for (const template of TEMPLATE_IDS) {
      const order = TEMPLATE_SECTION_ORDER[template];
      expect([...order].sort()).toEqual([...BUILTIN_SECTIONS].sort());
    }
  });

  it("uses the agreed default order per template", () => {
    expect(TEMPLATE_SECTION_ORDER["ats-minimal"]).toEqual([...BUILTIN_SECTIONS]);
    expect(TEMPLATE_SECTION_ORDER["modern-professional"].slice(0, 5)).toEqual([
      "summary",
      "experience",
      "projects",
      "education",
      "skills",
    ]);
    expect(TEMPLATE_SECTION_ORDER.graduate).toEqual([
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
    ]);
  });

  it("builds and parses custom section keys", () => {
    expect(customSectionKey("abc")).toBe("custom:abc");
    expect(parseCustomKey(customSectionKey("a_b-1"))).toBe("a_b-1");
    expect(parseCustomKey("summary")).toBeNull();
    expect(parseCustomKey("custom:")).toBeNull();
    expect(parseCustomKey("custom:not valid")).toBeNull();
    expect(parseCustomKey(`custom:${"x".repeat(65)}`)).toBeNull();
  });

  it("recognises valid keys", () => {
    expect(isBuiltinSection("skills")).toBe(true);
    expect(isBuiltinSection("technicalSkills")).toBe(false);
    expect(isSectionKey("custom:x")).toBe(true);
    expect(isSectionKey("custom:")).toBe(false);
    expect(isSectionKey("photo")).toBe(false);
    expect(isSectionKey(5)).toBe(false);
  });

  it("checks that a key exists in a given CV", () => {
    const cv = withCustom(createEmptyCV(), "c1");
    expect(sectionExists(cv, "awards")).toBe(true);
    expect(sectionExists(cv, "custom:c1")).toBe(true);
    expect(sectionExists(cv, "custom:gone")).toBe(false);
    expect(sectionExists(cv, "nope")).toBe(false);
    expect(findCustomSection(cv, "custom:c1")?.title).toBe("c1");
    expect(findCustomSection(cv, "summary")).toBeUndefined();
  });

  it("maps keys to DOM ids", () => {
    expect(sectionDomId("experience")).toBe("experience");
    expect(sectionDomId("custom:abc")).toBe("custom-abc");
  });

  it("maps built-in sections to their list fields", () => {
    expect(SECTION_LISTS.skills).toEqual(["technicalSkills", "softSkills"]);
    expect(SECTION_LISTS.summary).toEqual([]);
    expect(SECTION_LISTS.organizations).toEqual(["organizations"]);
  });
});

describe("section order", () => {
  it("uses the template default when no order is stored", () => {
    for (const template of TEMPLATE_IDS) {
      expect(allSectionsInOrder(sampleCV(template))).toEqual(TEMPLATE_SECTION_ORDER[template]);
    }
  });

  it("appends custom sections in creation order to the template default", () => {
    const cv = withCustom(sampleCV("graduate"), "b", "a");
    expect(allSectionsInOrder(cv)).toEqual([...TEMPLATE_SECTION_ORDER.graduate, "custom:b", "custom:a"]);
  });

  it("uses the stored order and drops unknown keys, duplicates and deleted custom sections", () => {
    const cv = withOrder(withCustom(createEmptyCV(), "keep"), [
      "skills",
      "custom:keep",
      "bogus" as SectionKey,
      "custom:deleted",
      "summary",
      "skills",
    ]);
    const order = allSectionsInOrder(cv);
    expect(order.slice(0, 3)).toEqual(["skills", "custom:keep", "summary"]);
    expect(order).not.toContain("bogus");
    expect(order).not.toContain("custom:deleted");
    expect(new Set(order).size).toBe(order.length);
  });

  it("appends missing built-in sections in template order, then missing custom sections", () => {
    const base = withCustom(sampleCV("modern-professional"), "c1", "c2");
    const cv = withOrder(base, ["custom:c2", "interests", "education"]);
    expect(allSectionsInOrder(cv)).toEqual([
      "custom:c2",
      "interests",
      "education",
      "summary",
      "experience",
      "projects",
      "skills",
      "certifications",
      "organizations",
      "awards",
      "languages",
      "references",
      "custom:c1",
    ]);
  });

  it("keeps a complete stored order exactly", () => {
    const full: SectionKey[] = ["custom:c1", ...[...BUILTIN_SECTIONS].reverse()];
    const cv = withOrder(withCustom(createEmptyCV(), "c1"), full);
    expect(allSectionsInOrder(cv)).toEqual(full);
  });

  it("follows the template default again when the template changes and no order is stored", () => {
    const cv = sampleCV("ats-minimal");
    const switched = { ...cv, meta: { ...cv.meta, template: "graduate" as const } };
    expect(allSectionsInOrder(switched)).toEqual(TEMPLATE_SECTION_ORDER.graduate);
  });

  it("leaves hidden sections out of the visible order only", () => {
    const cv = withOrder(withCustom(sampleCV(), "c1"), [], ["projects", "custom:c1"]);
    expect(allSectionsInOrder(cv)).toContain("projects");
    expect(allSectionsInOrder(cv)).toContain("custom:c1");
    expect(visibleSectionsInOrder(cv)).toEqual(
      TEMPLATE_SECTION_ORDER["ats-minimal"].filter((k) => k !== "projects"),
    );
    expect(isSectionHidden(cv, "projects")).toBe(true);
    expect(isSectionHidden(cv, "summary")).toBe(false);
  });

  it("combines a stored order with hidden sections", () => {
    const cv = withOrder(createEmptyCV(), ["interests", "summary"], ["summary"]);
    expect(visibleSectionsInOrder(cv).slice(0, 2)).toEqual(["interests", "experience"]);
  });
});

describe("filled sections", () => {
  it("reports nothing as filled in an empty CV", () => {
    const cv = withOrder(createEmptyCV(), []);
    for (const key of BUILTIN_SECTIONS) expect(isSectionFilled(cv, key)).toBe(false);
  });

  it("reports every section of the rich sample as filled", () => {
    const cv = richSampleCV();
    for (const key of allSectionsInOrder(cv)) expect(isSectionFilled(cv, key)).toBe(true);
  });

  it("ignores whitespace-only summaries", () => {
    const cv = { ...createEmptyCV(), summary: "  \n " };
    expect(isSectionFilled(cv, "summary")).toBe(false);
  });

  it("treats skills as filled when either skill list has a named entry", () => {
    const cv = createEmptyCV();
    expect(isSectionFilled({ ...cv, softSkills: [{ id: "s", name: "Listening", level: "" }] }, "skills")).toBe(true);
    expect(isSectionFilled({ ...cv, technicalSkills: [{ id: "s", name: "", level: "expert" }] }, "skills")).toBe(false);
  });

  it("does not count a language level alone", () => {
    const cv = createEmptyCV();
    expect(isSectionFilled({ ...cv, languages: [{ id: "l", name: "", level: "native" }] }, "languages")).toBe(false);
    expect(isSectionFilled({ ...cv, languages: [{ id: "l", name: "Sundanese", level: "" }] }, "languages")).toBe(true);
  });

  it("does not count an organisation marked as current without any text", () => {
    const cv = createEmptyCV();
    const org = {
      id: "o",
      role: "",
      organization: "",
      location: "",
      startDate: "",
      endDate: "",
      current: true,
      description: "",
    };
    expect(isSectionFilled({ ...cv, organizations: [org] }, "organizations")).toBe(false);
  });

  it("treats a custom section with only a title as empty", () => {
    const cv: CVData = {
      ...createEmptyCV(),
      customSections: [
        { id: "t", title: "Courses", items: [] },
        { id: "e", title: "Talks", items: [{ id: "i", title: " ", subtitle: "", startDate: "", endDate: "", description: "" }] },
        { id: "f", title: "", items: [{ id: "j", title: "", subtitle: "", startDate: "2020", endDate: "", description: "" }] },
      ],
    };
    expect(isSectionFilled(cv, "custom:t")).toBe(false);
    expect(isSectionFilled(cv, "custom:e")).toBe(false);
    expect(isSectionFilled(cv, "custom:f")).toBe(true);
    expect(isSectionFilled(cv, "custom:missing")).toBe(false);
  });
});

describe("reserved ids", () => {
  it("rejects ids that name Object.prototype members", () => {
    for (const id of RESERVED_IDS) {
      expect(isValidId(id)).toBe(false);
      expect(parseCustomKey(`custom:${id}`)).toBeNull();
      expect(isSectionKey(`custom:${id}`)).toBe(false);
    }
    expect(isValidId("__proto__x")).toBe(true);
    expect(isValidId("Constructor")).toBe(true);
    expect(isValidId("a".repeat(64))).toBe(true);
    expect(isValidId("a".repeat(65))).toBe(false);
    expect(isValidId("")).toBe(false);
    expect(isValidId(42)).toBe(false);
  });
});
