import { describe, expect, it } from "vitest";
import { CV_SCHEMA_VERSION, createEmptyCV } from "@/lib/cv-schema";
import {
  MAX_IMPORT_BYTES,
  isValidEmail,
  isValidMonthRange,
  isValidUrl,
  migrations,
  normalizeMonth,
  parseCVJson,
  parseCVValue,
  safeHref,
  sanitizeCV,
  sanitizePhoto,
  serializeCV,
} from "@/lib/cv-validation";
import { sampleCV } from "@/lib/sample-cv";

describe("CV schema validation", () => {
  it("accepts a complete, valid CV unchanged", () => {
    const cv = sampleCV("graduate");
    const result = parseCVValue(cv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(cv);
  });

  it("fills in missing fields with safe defaults", () => {
    const result = parseCVValue({ personal: { fullName: "Jane" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.personal.fullName).toBe("Jane");
    expect(result.data.personal.email).toBe("");
    expect(result.data.experience).toEqual([]);
    expect(result.data.meta.template).toBe("ats-minimal");
    expect(result.data.schemaVersion).toBe(CV_SCHEMA_VERSION);
  });

  it("coerces wrong types and drops unknown fields", () => {
    const data = sanitizeCV({
      personal: { fullName: 42, email: { evil: true }, extra: "x" },
      summary: ["not", "a", "string"],
      experience: [{ jobTitle: "Dev", current: "yes", startDate: "March 2020" }, "junk", null],
      meta: { template: "does-not-exist", cvLanguage: "fr" },
      unknownTopLevel: 1,
    });
    expect(data.personal.fullName).toBe("42");
    expect(data.personal.email).toBe("");
    expect(data.summary).toBe("");
    expect(data.experience).toHaveLength(1);
    expect(data.experience[0].current).toBe(false);
    expect(data.experience[0].startDate).toBe("");
    expect(data.meta).toEqual({ template: "ats-minimal", cvLanguage: "en" });
    expect(data).not.toHaveProperty("unknownTopLevel");
    expect(data.personal).not.toHaveProperty("extra");
  });

  it("makes duplicate or invalid ids unique", () => {
    const data = sanitizeCV({
      experience: [{ id: "same" }, { id: "same" }, { id: "<script>" }],
    });
    const ids = data.experience.map((e) => e.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe("same");
    expect(ids[2]).not.toContain("<");
  });

  it("only accepts small base64 PNG/JPEG/WebP data URLs as photos", () => {
    expect(sanitizePhoto("data:image/png;base64,iVBORw0KGgo=")).toBe("data:image/png;base64,iVBORw0KGgo=");
    expect(sanitizePhoto("data:image/svg+xml;base64,PHN2Zz4=")).toBe("");
    expect(sanitizePhoto("javascript:alert(1)")).toBe("");
    expect(sanitizePhoto("https://example.com/me.jpg")).toBe("");
  });

  it("normalises dates", () => {
    expect(normalizeMonth("2024-03")).toBe("2024-03");
    expect(normalizeMonth("2024")).toBe("2024");
    expect(normalizeMonth("2024-03-15")).toBe("2024-03");
    expect(normalizeMonth("2024-13")).toBe("");
    expect(normalizeMonth("yesterday")).toBe("");
  });

  it("caps very long text and very long lists", () => {
    const data = sanitizeCV({
      summary: "x".repeat(20_000),
      technicalSkills: Array.from({ length: 500 }, (_, i) => ({ name: `s${i}` })),
    });
    expect(data.summary.length).toBe(5000);
    expect(data.technicalSkills.length).toBe(100);
  });
});

describe("JSON import and export", () => {
  it("round-trips through the export envelope", () => {
    const cv = sampleCV("modern-professional");
    const json = serializeCV(cv);
    expect(JSON.parse(json)).toMatchObject({ app: "free-ai-cv-maker", data: { personal: { fullName: "Alex Example" } } });
    const result = parseCVJson(json);
    expect(result).toEqual({ ok: true, data: cv });
  });

  it("accepts a bare CV object without the envelope", () => {
    const result = parseCVJson(JSON.stringify(createEmptyCV("id")));
    expect(result.ok && result.data.meta.cvLanguage).toBe("id");
  });

  it("rejects invalid JSON, non-objects, newer versions and oversized files", () => {
    expect(parseCVJson("{not json")).toEqual({ ok: false, error: "invalid_json" });
    expect(parseCVJson("[1,2,3]")).toEqual({ ok: false, error: "not_object" });
    expect(parseCVJson('"hello"')).toEqual({ ok: false, error: "not_object" });
    expect(parseCVJson(JSON.stringify({ schemaVersion: 999, personal: {} }))).toEqual({
      ok: false,
      error: "unsupported_version",
    });
    expect(parseCVJson(" ".repeat(MAX_IMPORT_BYTES + 1))).toEqual({ ok: false, error: "too_large" });
  });
});

describe("schema migration", () => {
  it("treats unversioned data as v1", () => {
    const result = parseCVValue({ personal: { fullName: "Old" } });
    expect(result.ok && result.data.personal.fullName).toBe("Old");
  });

  it("applies registered migration steps in order", () => {
    // Simulate a legacy v0 format where the name was a top-level field.
    migrations[0] = (raw) => ({ ...raw, schemaVersion: 1, personal: { fullName: raw.name } });
    try {
      const result = parseCVValue({ schemaVersion: 0, name: "Legacy User" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.personal.fullName).toBe("Legacy User");
        expect(result.migratedFrom).toBe(0);
      }
    } finally {
      delete migrations[0];
    }
  });

  it("refuses versions without a migration path", () => {
    expect(parseCVValue({ schemaVersion: 0 })).toEqual({ ok: false, error: "unsupported_version" });
  });
});

describe("field validation helpers", () => {
  it("validates emails", () => {
    expect(isValidEmail("name@example.com")).toBe(true);
    expect(isValidEmail("name@example")).toBe(false);
    expect(isValidEmail("not an email")).toBe(false);
  });

  it("validates URLs with or without scheme and never produces unsafe hrefs", () => {
    expect(isValidUrl("linkedin.com/in/jane")).toBe(true);
    expect(isValidUrl("https://jane.dev")).toBe(true);
    expect(isValidUrl("localhost")).toBe(false);
    expect(safeHref("jane.dev")).toBe("https://jane.dev");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,hi")).toBeNull();
  });

  it("checks date order", () => {
    expect(isValidMonthRange("2020-01", "2021-01")).toBe(true);
    expect(isValidMonthRange("2021-05", "2021-01")).toBe(false);
    expect(isValidMonthRange("", "2021-01")).toBe(true);
  });
});
