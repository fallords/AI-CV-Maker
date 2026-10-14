import { describe, expect, it } from "vitest";
import { cvReducer, type CVAction } from "@/lib/cv-reducer";
import {
  LIST_SECTIONS,
  MAX_CUSTOM_ITEMS,
  MAX_CUSTOM_SECTIONS,
  createEmptyCV,
  emptyItem,
  filledItems,
  isCVEmpty,
  type CVData,
} from "@/lib/cv-schema";
import { TEMPLATE_SECTION_ORDER, allSectionsInOrder, visibleSectionsInOrder } from "@/lib/cv-sections";
import { DEFAULT_STYLE } from "@/lib/doc-style";
import { richSampleCV, sampleCV } from "@/lib/sample-cv";

const run = (cv: CVData, ...actions: CVAction[]) => actions.reduce(cvReducer, cv);

describe("cvReducer", () => {
  it("adds an entry to every repeatable section", () => {
    for (const section of LIST_SECTIONS) {
      const next = cvReducer(createEmptyCV(), { type: "addItem", section, id: "new1" });
      expect(next[section]).toHaveLength(1);
      expect(next[section][0].id).toBe("new1");
    }
  });

  it("edits only the targeted entry and never its id", () => {
    let cv = cvReducer(createEmptyCV(), { type: "addItem", section: "experience", id: "a" });
    cv = cvReducer(cv, { type: "addItem", section: "experience", id: "b" });
    cv = cvReducer(cv, { type: "updateItem", section: "experience", id: "b", patch: { company: "Acme", id: "hijack" } });
    expect(cv.experience[0].company).toBe("");
    expect(cv.experience[1]).toMatchObject({ id: "b", company: "Acme" });
  });

  it("clears the end date when an entry is marked as current", () => {
    let cv = cvReducer(createEmptyCV(), { type: "addItem", section: "experience", id: "a" });
    cv = cvReducer(cv, { type: "updateItem", section: "experience", id: "a", patch: { endDate: "2024-01" } });
    cv = cvReducer(cv, { type: "updateItem", section: "experience", id: "a", patch: { current: true } });
    expect(cv.experience[0]).toMatchObject({ current: true, endDate: "" });
  });

  it("deletes entries", () => {
    const cv = cvReducer(sampleCV(), { type: "removeItem", section: "experience", id: "exp2" });
    expect(cv.experience.map((e) => e.id)).toEqual(["exp1", "exp3"]);
  });

  it("reorders entries and ignores moves past either end", () => {
    let cv = sampleCV();
    cv = cvReducer(cv, { type: "moveItem", section: "experience", id: "exp3", direction: -1 });
    expect(cv.experience.map((e) => e.id)).toEqual(["exp1", "exp3", "exp2"]);
    cv = cvReducer(cv, { type: "moveItem", section: "experience", id: "exp1", direction: -1 });
    expect(cv.experience.map((e) => e.id)).toEqual(["exp1", "exp3", "exp2"]);
    cv = cvReducer(cv, { type: "moveItem", section: "experience", id: "exp2", direction: 1 });
    expect(cv.experience.map((e) => e.id)).toEqual(["exp1", "exp3", "exp2"]);
  });

  it("does not mutate the previous state", () => {
    const before = sampleCV();
    const snapshot = structuredClone(before);
    cvReducer(before, { type: "setPersonal", patch: { fullName: "Changed" } });
    cvReducer(before, { type: "removeItem", section: "projects", id: "prj1" });
    cvReducer(before, { type: "moveItem", section: "education", id: "edu2", direction: -1 });
    expect(before).toEqual(snapshot);
  });

  it("changes template and CV language without touching content", () => {
    const before = sampleCV();
    const after = cvReducer(before, { type: "setMeta", patch: { template: "graduate", cvLanguage: "id" } });
    expect(after.meta).toEqual({ ...before.meta, template: "graduate", cvLanguage: "id" });
    expect({ ...after, meta: before.meta }).toEqual(before);
  });
});

describe("empty section handling", () => {
  it("treats entries without content as empty", () => {
    let cv = cvReducer(createEmptyCV(), { type: "addItem", section: "education" });
    cv = cvReducer(cv, { type: "addItem", section: "technicalSkills" });
    expect(filledItems(cv, "education")).toHaveLength(0);
    expect(isCVEmpty(cv)).toBe(true);
  });

  it("a skill level alone does not make a skill filled", () => {
    let cv = cvReducer(createEmptyCV(), { type: "addItem", section: "technicalSkills", id: "s" });
    cv = cvReducer(cv, { type: "updateItem", section: "technicalSkills", id: "s", patch: { level: "expert" } });
    expect(filledItems(cv, "technicalSkills")).toHaveLength(0);
  });

  it("whitespace-only fields count as empty", () => {
    const cv = cvReducer(createEmptyCV(), { type: "setSummary", value: "   \n  " });
    expect(isCVEmpty(cv)).toBe(true);
  });
});

describe("new list sections", () => {
  it("includes the v2 list sections", () => {
    expect(LIST_SECTIONS).toEqual([
      "experience",
      "education",
      "projects",
      "technicalSkills",
      "softSkills",
      "certifications",
      "languages",
      "organizations",
      "awards",
      "references",
      "interests",
    ]);
  });

  it("creates empty entries with the right fields", () => {
    expect(emptyItem("languages")).toEqual({ id: expect.any(String), name: "", level: "" });
    expect(emptyItem("organizations")).toEqual({
      id: expect.any(String),
      role: "",
      organization: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
    });
    expect(emptyItem("awards")).toEqual({ id: expect.any(String), title: "", issuer: "", date: "", description: "" });
    expect(emptyItem("references")).toEqual({
      id: expect.any(String),
      name: "",
      position: "",
      organization: "",
      email: "",
      phone: "",
      relationship: "",
    });
    expect(emptyItem("interests")).toEqual({ id: expect.any(String), name: "" });
  });

  it("edits, reorders and removes entries in the new sections", () => {
    let cv = run(
      createEmptyCV(),
      { type: "addItem", section: "languages", id: "a" },
      { type: "addItem", section: "languages", id: "b" },
      { type: "updateItem", section: "languages", id: "b", patch: { name: "English", level: "fluent" } },
      { type: "moveItem", section: "languages", id: "b", direction: -1 },
    );
    expect(cv.languages.map((l) => l.id)).toEqual(["b", "a"]);
    expect(cv.languages[0]).toEqual({ id: "b", name: "English", level: "fluent" });
    cv = cvReducer(cv, { type: "removeItem", section: "languages", id: "a" });
    expect(cv.languages).toHaveLength(1);
  });

  it("clears the end date when an organisation is marked as current", () => {
    const cv = run(
      createEmptyCV(),
      { type: "addItem", section: "organizations", id: "o" },
      { type: "updateItem", section: "organizations", id: "o", patch: { endDate: "2023-05", role: "Chair" } },
      { type: "updateItem", section: "organizations", id: "o", patch: { current: true } },
    );
    expect(cv.organizations[0]).toMatchObject({ role: "Chair", current: true, endDate: "" });
  });

  it("counts new sections when deciding whether the CV is empty", () => {
    const empty = createEmptyCV();
    expect(isCVEmpty(empty)).toBe(true);
    const levelOnly = run(empty, { type: "addItem", section: "languages", id: "l" }, {
      type: "updateItem",
      section: "languages",
      id: "l",
      patch: { level: "native" },
    });
    expect(isCVEmpty(levelOnly)).toBe(true);
    const interest = run(empty, { type: "addItem", section: "interests", id: "i" }, {
      type: "updateItem",
      section: "interests",
      id: "i",
      patch: { name: "Photography" },
    });
    expect(isCVEmpty(interest)).toBe(false);
    expect(filledItems(interest, "interests")).toHaveLength(1);
  });

  it("counts custom sections only when an entry has content", () => {
    const titled = run(createEmptyCV(), { type: "addCustomSection", id: "c", title: "Courses" });
    expect(isCVEmpty(titled)).toBe(true);
    const withEmptyItem = cvReducer(titled, { type: "addCustomItem", sectionId: "c", id: "i" });
    expect(isCVEmpty(withEmptyItem)).toBe(true);
    const filled = cvReducer(withEmptyItem, {
      type: "updateCustomItem",
      sectionId: "c",
      id: "i",
      patch: { subtitle: "Online" },
    });
    expect(isCVEmpty(filled)).toBe(false);
  });
});

describe("appearance", () => {
  it("merges style changes without touching content or other meta", () => {
    const before = sampleCV();
    const after = cvReducer(before, { type: "setStyle", patch: { accent: "#7a1f2b", margin: "wide" } });
    expect(after.meta.style).toEqual({ ...DEFAULT_STYLE, accent: "#7a1f2b", margin: "wide" });
    expect({ ...after, meta: before.meta }).toEqual(before);
    expect(after.meta.template).toBe(before.meta.template);
  });

  it("falls back to defaults for invalid style values", () => {
    const cv = run(
      createEmptyCV(),
      { type: "setStyle", patch: { accent: "#123456", font: "serif" } },
      { type: "setStyle", patch: { accent: "not a colour" } },
    );
    expect(cv.meta.style).toEqual({ ...DEFAULT_STYLE, font: "serif" });
  });
});

describe("section order and visibility", () => {
  it("stores the full order when a section is moved", () => {
    const cv = cvReducer(sampleCV(), { type: "moveSection", key: "education", direction: -1 });
    const expected = [...TEMPLATE_SECTION_ORDER["ats-minimal"]];
    [expected[1], expected[2]] = [expected[2], expected[1]];
    expect(cv.meta.sectionOrder).toEqual(expected);
    expect(allSectionsInOrder(cv)).toEqual(expected);
  });

  it("ignores moves past either end and unknown keys", () => {
    const cv = sampleCV();
    expect(cvReducer(cv, { type: "moveSection", key: "summary", direction: -1 })).toBe(cv);
    expect(cvReducer(cv, { type: "moveSection", key: "interests", direction: 1 })).toBe(cv);
    expect(cvReducer(cv, { type: "moveSection", key: "custom:nope", direction: 1 })).toBe(cv);
  });

  it("moves custom sections and works from a partial stored order", () => {
    let cv = run(createEmptyCV(), { type: "addCustomSection", id: "c", title: "Courses" });
    cv = { ...cv, meta: { ...cv.meta, sectionOrder: ["custom:c", "interests"] } };
    cv = cvReducer(cv, { type: "moveSection", key: "custom:c", direction: 1 });
    expect(cv.meta.sectionOrder.slice(0, 3)).toEqual(["interests", "custom:c", "summary"]);
    expect(cv.meta.sectionOrder).toHaveLength(12);
  });

  it("follows the template default again after a reset", () => {
    let cv = run(sampleCV("graduate"), { type: "moveSection", key: "experience", direction: -1 });
    expect(cv.meta.sectionOrder).not.toEqual([]);
    cv = run(cv, { type: "setSectionHidden", key: "awards", hidden: true }, { type: "resetSectionOrder" });
    expect(cv.meta.sectionOrder).toEqual([]);
    expect(cv.meta.hiddenSections).toEqual(["awards"]);
    expect(allSectionsInOrder(cv)).toEqual(TEMPLATE_SECTION_ORDER.graduate);
  });

  it("hides and shows sections without duplicates", () => {
    let cv = run(
      sampleCV(),
      { type: "setSectionHidden", key: "projects", hidden: true },
      { type: "setSectionHidden", key: "projects", hidden: true },
      { type: "setSectionHidden", key: "summary", hidden: true },
    );
    expect(cv.meta.hiddenSections).toEqual(["projects", "summary"]);
    expect(visibleSectionsInOrder(cv)).not.toContain("projects");
    cv = cvReducer(cv, { type: "setSectionHidden", key: "projects", hidden: false });
    expect(cv.meta.hiddenSections).toEqual(["summary"]);
  });

  it("ignores hiding a custom section that does not exist", () => {
    const cv = sampleCV();
    expect(cvReducer(cv, { type: "setSectionHidden", key: "custom:ghost", hidden: true })).toBe(cv);
  });
});

describe("custom sections", () => {
  it("adds a section with the given id and title", () => {
    const cv = cvReducer(createEmptyCV(), { type: "addCustomSection", id: "c1", title: "Courses" });
    expect(cv.customSections).toEqual([{ id: "c1", title: "Courses", items: [] }]);
    // With no stored order the template default (plus custom sections) still applies.
    expect(cv.meta.sectionOrder).toEqual([]);
    expect(allSectionsInOrder(cv).at(-1)).toBe("custom:c1");
  });

  it("generates an id when none, a taken one or an invalid one is given", () => {
    const cv = run(
      createEmptyCV(),
      { type: "addCustomSection", title: "A" },
      { type: "addCustomSection", id: "x", title: "B" },
      { type: "addCustomSection", id: "x", title: "C" },
      { type: "addCustomSection", id: "not valid!", title: "D" },
    );
    const ids = cv.customSections.map((s) => s.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    expect(ids[1]).toBe("x");
    expect(ids.every((id) => /^[\w-]{1,64}$/.test(id))).toBe(true);
  });

  it("appends the new key to a stored order", () => {
    let cv = cvReducer(sampleCV(), { type: "moveSection", key: "projects", direction: -1 });
    cv = cvReducer(cv, { type: "addCustomSection", id: "c", title: "Talks" });
    expect(cv.meta.sectionOrder.at(-1)).toBe("custom:c");
    expect(allSectionsInOrder(cv).at(-1)).toBe("custom:c");
  });

  it("stops at 20 sections", () => {
    let cv = createEmptyCV();
    for (let i = 0; i < MAX_CUSTOM_SECTIONS + 3; i++) cv = cvReducer(cv, { type: "addCustomSection", title: `S${i}` });
    expect(cv.customSections).toHaveLength(MAX_CUSTOM_SECTIONS);
  });

  it("renames a section and ignores unknown ids", () => {
    const cv = run(createEmptyCV(), { type: "addCustomSection", id: "c", title: "Old" });
    expect(cvReducer(cv, { type: "renameCustomSection", id: "c", title: "New" }).customSections[0].title).toBe("New");
    expect(cvReducer(cv, { type: "renameCustomSection", id: "zzz", title: "New" })).toBe(cv);
  });

  it("removes a section together with its order and visibility entries", () => {
    let cv = run(
      createEmptyCV(),
      { type: "addCustomSection", id: "a", title: "A" },
      { type: "addCustomSection", id: "b", title: "B" },
      { type: "moveSection", key: "custom:a", direction: -1 },
      { type: "setSectionHidden", key: "custom:a", hidden: true },
      { type: "setSectionHidden", key: "skills", hidden: true },
    );
    expect(cv.meta.sectionOrder).toContain("custom:a");
    cv = cvReducer(cv, { type: "removeCustomSection", id: "a" });
    expect(cv.customSections.map((s) => s.id)).toEqual(["b"]);
    expect(cv.meta.sectionOrder).not.toContain("custom:a");
    expect(cv.meta.sectionOrder).toContain("custom:b");
    expect(cv.meta.hiddenSections).toEqual(["skills"]);
    expect(cvReducer(cv, { type: "removeCustomSection", id: "a" })).toBe(cv);
  });

  it("adds, edits, reorders and removes entries", () => {
    let cv = run(
      createEmptyCV(),
      { type: "addCustomSection", id: "c", title: "Courses" },
      { type: "addCustomItem", sectionId: "c", id: "i1" },
      { type: "addCustomItem", sectionId: "c", id: "i2" },
      { type: "addCustomItem", sectionId: "c" },
      { type: "updateCustomItem", sectionId: "c", id: "i2", patch: { title: "SQL", startDate: "2024-01" } },
    );
    const items = cv.customSections[0].items;
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ id: "i1", title: "", subtitle: "", startDate: "", endDate: "", description: "" });
    expect(items[1]).toMatchObject({ id: "i2", title: "SQL", startDate: "2024-01" });
    expect(items[2].id).toEqual(expect.any(String));

    cv = cvReducer(cv, { type: "moveCustomItem", sectionId: "c", id: "i2", direction: -1 });
    expect(cv.customSections[0].items.map((i) => i.id).slice(0, 2)).toEqual(["i2", "i1"]);
    cv = cvReducer(cv, { type: "removeCustomItem", sectionId: "c", id: "i1" });
    expect(cv.customSections[0].items.map((i) => i.id)).not.toContain("i1");
  });

  it("never changes an entry id and leaves other entries alone", () => {
    const cv = run(
      createEmptyCV(),
      { type: "addCustomSection", id: "c", title: "C" },
      { type: "addCustomItem", sectionId: "c", id: "a" },
      { type: "addCustomItem", sectionId: "c", id: "b" },
      { type: "updateCustomItem", sectionId: "c", id: "b", patch: { id: "hijack", title: "B" } },
    );
    expect(cv.customSections[0].items[0].title).toBe("");
    expect(cv.customSections[0].items[1]).toMatchObject({ id: "b", title: "B" });
  });

  it("ignores moves past either end and actions on unknown sections", () => {
    const cv = run(
      createEmptyCV(),
      { type: "addCustomSection", id: "c", title: "C" },
      { type: "addCustomItem", sectionId: "c", id: "a" },
      { type: "addCustomItem", sectionId: "c", id: "b" },
    );
    expect(cvReducer(cv, { type: "moveCustomItem", sectionId: "c", id: "a", direction: -1 })).toBe(cv);
    expect(cvReducer(cv, { type: "moveCustomItem", sectionId: "c", id: "b", direction: 1 })).toBe(cv);
    expect(cvReducer(cv, { type: "addCustomItem", sectionId: "nope" })).toBe(cv);
    expect(cvReducer(cv, { type: "updateCustomItem", sectionId: "nope", id: "a", patch: { title: "x" } })).toBe(cv);
    expect(cvReducer(cv, { type: "removeCustomItem", sectionId: "nope", id: "a" })).toBe(cv);
  });

  it("only uses a requested entry id when it is valid and not used by any entry", () => {
    const base = richSampleCV();
    const ids = (cv: CVData) => [
      ...LIST_SECTIONS.flatMap((l) => (cv[l] as { id: string }[]).map((i) => i.id)),
      ...cv.customSections.flatMap((s) => s.items.map((i) => i.id)),
    ];
    for (const requested of ["exp1", "course1", "lang1", "not valid!", "__proto__", "constructor", "prototype", ""]) {
      const cv = cvReducer(base, { type: "addCustomItem", sectionId: "courses", id: requested });
      const added = cv.customSections[0].items.at(-1)!;
      expect(added.id).not.toBe(requested);
      expect(added.id).toMatch(/^[\w-]{1,64}$/);
      expect(new Set(ids(cv)).size).toBe(ids(cv).length);
    }
    const ok = cvReducer(base, { type: "addCustomItem", sectionId: "courses", id: "course9" });
    expect(ok.customSections[0].items.at(-1)!.id).toBe("course9");

    // Two adds with the same id in a row: the second gets a fresh id, so actions hit one entry.
    let cv = run(
      base,
      { type: "addCustomItem", sectionId: "courses", id: "dup" },
      { type: "addCustomItem", sectionId: "courses", id: "dup" },
    );
    expect(cv.customSections[0].items.filter((i) => i.id === "dup")).toHaveLength(1);
    cv = cvReducer(cv, { type: "updateCustomItem", sectionId: "courses", id: "dup", patch: { title: "Only me" } });
    expect(cv.customSections[0].items.filter((i) => i.title === "Only me")).toHaveLength(1);
  });

  it("applies the same id rule to built-in list entries", () => {
    const base = richSampleCV();
    for (const requested of ["exp1", "course1", "bad id", "__proto__", "constructor"]) {
      const cv = cvReducer(base, { type: "addItem", section: "awards", id: requested });
      expect(cv.awards.at(-1)!.id).not.toBe(requested);
      expect(cv.awards).toHaveLength(base.awards.length + 1);
    }
    expect(cvReducer(base, { type: "addItem", section: "awards", id: "award9" }).awards.at(-1)!.id).toBe("award9");
    const twice = run(
      createEmptyCV(),
      { type: "addItem", section: "experience", id: "x" },
      { type: "addItem", section: "education", id: "x" },
    );
    expect(twice.experience[0].id).toBe("x");
    expect(twice.education[0].id).not.toBe("x");
  });

  it("stops at 100 entries per section", () => {
    let cv = cvReducer(createEmptyCV(), { type: "addCustomSection", id: "c", title: "C" });
    for (let i = 0; i < MAX_CUSTOM_ITEMS + 5; i++) cv = cvReducer(cv, { type: "addCustomItem", sectionId: "c" });
    expect(cv.customSections[0].items).toHaveLength(MAX_CUSTOM_ITEMS);
  });

  it("does not mutate the previous state", () => {
    const before = richSampleCV();
    const snapshot = structuredClone(before);
    const actions: CVAction[] = [
      { type: "setStyle", patch: { accent: "#333333" } },
      { type: "moveSection", key: "education", direction: -1 },
      { type: "setSectionHidden", key: "interests", hidden: true },
      { type: "resetSectionOrder" },
      { type: "addCustomSection", title: "New" },
      { type: "renameCustomSection", id: "courses", title: "Training" },
      { type: "removeCustomSection", id: "courses" },
      { type: "addCustomItem", sectionId: "courses" },
      { type: "updateCustomItem", sectionId: "courses", id: "course1", patch: { title: "Changed" } },
      { type: "removeCustomItem", sectionId: "courses", id: "course1" },
      { type: "moveCustomItem", sectionId: "courses", id: "course2", direction: -1 },
      { type: "updateItem", section: "awards", id: "award1", patch: { title: "Changed" } },
    ];
    for (const action of actions) cvReducer(before, action);
    expect(before).toEqual(snapshot);
  });
});
