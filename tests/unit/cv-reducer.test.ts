import { describe, expect, it } from "vitest";
import { cvReducer } from "@/lib/cv-reducer";
import { LIST_SECTIONS, createEmptyCV, filledItems, isCVEmpty } from "@/lib/cv-schema";
import { sampleCV } from "@/lib/sample-cv";

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
    expect(after.meta).toEqual({ template: "graduate", cvLanguage: "id" });
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
