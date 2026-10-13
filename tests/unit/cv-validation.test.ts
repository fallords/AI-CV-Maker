import { describe, expect, it } from "vitest";
import { CV_SCHEMA_VERSION, MAX_CUSTOM_ITEMS, MAX_CUSTOM_SECTIONS, createEmptyCV, type CVData } from "@/lib/cv-schema";
import {
  EXPORT_APP_ID,
  MAX_IMPORT_BYTES,
  isValidEmail,
  isValidMonthRange,
  isValidUrl,
  migrations,
  normalizeMonth,
  parseCVJson,
  parseCVValue,
  parseDocumentJson,
  parseDocumentValue,
  safeHref,
  sanitizeCV,
  sanitizePhoto,
  serializeCV,
  serializeDocument,
} from "@/lib/cv-validation";
import { DEFAULT_STYLE } from "@/lib/doc-style";
import { richSampleCV, sampleCV, sampleLetter, showcaseCV } from "@/lib/sample-cv";

/** sampleCV() as the v1 app stored it: no v2 fields and schemaVersion 1. */
function v1CV(): Record<string, unknown> {
  const cv = sampleCV("modern-professional");
  const {
    languages: _l,
    organizations: _o,
    awards: _a,
    references: _r,
    interests: _i,
    customSections: _c,
    ...rest
  } = cv;
  void [_l, _o, _a, _r, _i, _c];
  return { ...rest, schemaVersion: 1, meta: { template: "modern-professional", cvLanguage: "id" } };
}

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
    expect(data.meta).toEqual({
      template: "ats-minimal",
      cvLanguage: "en",
      sectionOrder: [],
      hiddenSections: [],
      style: DEFAULT_STYLE,
    });
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

describe("schema v1 to v2 migration", () => {
  const expected = (): CVData => {
    const cv = sampleCV("modern-professional");
    cv.meta.cvLanguage = "id";
    return cv;
  };

  it("is at version 2", () => {
    expect(CV_SCHEMA_VERSION).toBe(2);
  });

  it("migrates an explicit v1 CV and keeps all of its content", () => {
    const result = parseCVValue(v1CV());
    expect(result).toEqual({ ok: true, data: expected(), migratedFrom: 1 });
  });

  it("migrates unversioned data as v1", () => {
    const { schemaVersion: _v, ...unversioned } = v1CV();
    void _v;
    const result = parseCVValue(unversioned);
    expect(result).toEqual({ ok: true, data: expected(), migratedFrom: 1 });
  });

  it("migrates a v1 CV inside the export envelope", () => {
    const json = JSON.stringify({ app: EXPORT_APP_ID, exportedAt: "2025-01-01T00:00:00.000Z", data: v1CV() });
    expect(parseCVJson(json)).toEqual({ ok: true, data: expected(), migratedFrom: 1 });
  });

  it("migrates a v1 CV inside the old storage payload", () => {
    const stored = { schemaVersion: 1, savedAt: "2025-01-01T00:00:00.000Z", data: v1CV() };
    expect(parseCVValue(stored)).toEqual({ ok: true, data: expected(), migratedFrom: 1 });
  });

  it("adds empty v2 fields and default meta in the migration step", () => {
    const out = migrations[1]({ schemaVersion: 1, meta: { template: "graduate", cvLanguage: "en" }, summary: "Hi" });
    expect(out).toEqual({
      schemaVersion: 2,
      summary: "Hi",
      languages: [],
      organizations: [],
      awards: [],
      references: [],
      interests: [],
      customSections: [],
      meta: { template: "graduate", cvLanguage: "en", sectionOrder: [], hiddenSections: [], style: DEFAULT_STYLE },
    });
  });

  it("keeps v2 fields that unversioned data already has instead of wiping them", () => {
    const cv = richSampleCV("graduate");
    cv.meta.sectionOrder = ["experience", "custom:courses", "summary"];
    cv.meta.hiddenSections = ["interests"];
    cv.meta.style = { ...DEFAULT_STYLE, accent: "#7a1f2b", spacing: "compact" };
    const { schemaVersion: _v, ...unversioned } = structuredClone(cv);
    void _v;
    expect(parseCVValue(unversioned)).toEqual({ ok: true, data: cv, migratedFrom: 1 });
    // A string version is not an integer, so it also goes through the v1 step without losses.
    expect(parseCVJson(JSON.stringify({ ...cv, schemaVersion: "2" }))).toEqual({ ok: true, data: cv, migratedFrom: 1 });
    const imported = parseCVValue(unversioned);
    expect(imported.ok && imported.data.languages.length).toBeGreaterThan(0);
    expect(imported.ok && imported.data.customSections.length).toBeGreaterThan(0);
  });

  it("keeps present v2 values in the migration step and leaves validation to the sanitiser", () => {
    const out = migrations[1]({
      languages: [{ id: "l1", name: "English" }],
      awards: "not a list",
      customSections: [{ id: "c", title: "C", items: [] }],
      meta: { template: "graduate", sectionOrder: ["custom:c", "bogus"], hiddenSections: null, style: { accent: "red" } },
    });
    expect(out.languages).toEqual([{ id: "l1", name: "English" }]);
    expect(out.awards).toEqual([]);
    expect(out.customSections).toEqual([{ id: "c", title: "C", items: [] }]);
    expect(out.meta).toEqual({ template: "graduate", sectionOrder: ["custom:c", "bogus"], hiddenSections: [], style: { accent: "red" } });
    const data = sanitizeCV(out);
    expect(data.meta.sectionOrder).toEqual(["custom:c"]);
    expect(data.meta.hiddenSections).toEqual([]);
    expect(data.meta.style).toEqual(DEFAULT_STYLE);
  });

  it("copes with a v1 CV whose meta is missing or invalid", () => {
    const result = parseCVValue({ schemaVersion: 1, meta: "nope", personal: { fullName: "Old" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.meta).toEqual(createEmptyCV().meta);
    expect(result.data.personal.fullName).toBe("Old");
  });

  it("is idempotent: a migrated CV parses again unchanged and without migration", () => {
    const first = parseCVValue(v1CV());
    if (!first.ok) throw new Error("expected ok");
    const again = parseCVJson(serializeCV(first.data));
    expect(again).toEqual({ ok: true, data: first.data });
    const twice = parseCVValue(first.data);
    expect(twice).toEqual({ ok: true, data: first.data });
  });

  it("accepts v2 without reporting a migration", () => {
    const cv = richSampleCV("graduate");
    expect(parseCVValue(cv)).toEqual({ ok: true, data: cv });
  });

  it("rejects v3 and later", () => {
    expect(parseCVValue({ ...richSampleCV(), schemaVersion: 3 })).toEqual({ ok: false, error: "unsupported_version" });
    expect(parseCVJson(JSON.stringify({ app: EXPORT_APP_ID, data: { schemaVersion: 3 } }))).toEqual({
      ok: false,
      error: "unsupported_version",
    });
    expect(parseDocumentJson(JSON.stringify({ schemaVersion: 3, personal: {} }))).toEqual({
      ok: false,
      error: "unsupported_version",
    });
  });
});

describe("sanitising v2 fields", () => {
  it("replaces ids that name Object.prototype members", () => {
    const data = sanitizeCV(
      JSON.parse(
        JSON.stringify({
          experience: [{ id: "__proto__", jobTitle: "A" }, { id: "exp2", jobTitle: "B" }],
          languages: [{ id: "prototype", name: "English" }],
          customSections: [
            { id: "__proto__", title: "Proto", items: [{ id: "constructor", title: "Item" }] },
            { id: "constructor", title: "Ctor", items: [] },
            { id: "talks", title: "Talks", items: [{ id: "talk1", title: "Kept" }] },
          ],
          meta: { sectionOrder: ["custom:__proto__", "custom:constructor", "custom:talks"], hiddenSections: ["custom:__proto__"] },
        }),
      ),
    );
    const reserved = ["__proto__", "constructor", "prototype"];
    const allIds = [
      ...data.experience.map((e) => e.id),
      ...data.languages.map((l) => l.id),
      ...data.customSections.flatMap((s) => [s.id, ...s.items.map((i) => i.id)]),
    ];
    for (const id of allIds) {
      expect(reserved).not.toContain(id);
      expect(id).toMatch(/^[\w-]{1,64}$/);
    }
    expect(data.experience.map((e) => e.jobTitle)).toEqual(["A", "B"]);
    expect(data.experience[1].id).toBe("exp2");
    expect(data.customSections.map((s) => s.title)).toEqual(["Proto", "Ctor", "Talks"]);
    expect(data.customSections[2]).toMatchObject({ id: "talks", items: [{ id: "talk1" }] });
    // Order and visibility keys for the renamed sections no longer resolve and are dropped.
    expect(data.meta.sectionOrder).toEqual(["custom:talks"]);
    expect(data.meta.hiddenSections).toEqual([]);
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
  });

  it("keeps the rich sample CV unchanged", () => {
    const cv = richSampleCV("modern-professional");
    cv.meta.sectionOrder = ["experience", "custom:courses", "summary"];
    cv.meta.hiddenSections = ["interests", "custom:courses"];
    cv.meta.style = { accent: "#7a1f2b", font: "plex-serif", fontSize: "large", spacing: "compact", margin: "wide" };
    expect(sanitizeCV(structuredClone(cv) as unknown as Record<string, unknown>)).toEqual(cv);
  });

  it("coerces language entries and falls back to an empty level", () => {
    const data = sanitizeCV({
      languages: [
        { id: "l1", name: "English", level: "fluent" },
        { id: "l2", name: 7, level: "expert" },
        { name: "Javanese", level: null, extra: true },
        "junk",
      ],
    });
    expect(data.languages).toHaveLength(3);
    expect(data.languages[0]).toEqual({ id: "l1", name: "English", level: "fluent" });
    expect(data.languages[1]).toEqual({ id: "l2", name: "7", level: "" });
    expect(data.languages[2].level).toBe("");
    expect(data.languages[2]).not.toHaveProperty("extra");
  });

  it("coerces organizations, awards, references and interests", () => {
    const data = sanitizeCV({
      organizations: [
        {
          role: "Treasurer",
          organization: { nested: true },
          startDate: "2021-02-15",
          endDate: "soon",
          current: "true",
          description: "d".repeat(9000),
          location: "x".repeat(400),
        },
      ],
      awards: [{ title: "Prize", issuer: 3, date: "2022-13", description: ["no"] }],
      references: [
        { name: "Ref", position: "Lead", organization: "Org", email: "ref@example.com", phone: 123, relationship: "Manager" },
      ],
      interests: [{ name: "Chess", level: "expert" }],
    });
    expect(data.organizations[0]).toMatchObject({
      role: "Treasurer",
      organization: "",
      startDate: "2021-02",
      endDate: "",
      current: false,
    });
    expect(data.organizations[0].description).toHaveLength(5000);
    expect(data.organizations[0].location).toHaveLength(300);
    expect(data.awards[0]).toMatchObject({ title: "Prize", issuer: "3", date: "", description: "" });
    expect(data.references[0]).toMatchObject({ name: "Ref", email: "ref@example.com", phone: "123", relationship: "Manager" });
    expect(data.interests[0]).toEqual({ id: data.interests[0].id, name: "Chess" });
  });

  it("caps the new lists at 100 entries", () => {
    const many = Array.from({ length: 150 }, (_, i) => ({ name: `n${i}`, title: `t${i}` }));
    const data = sanitizeCV({ languages: many, organizations: many, awards: many, references: many, interests: many });
    for (const list of [data.languages, data.organizations, data.awards, data.references, data.interests]) {
      expect(list).toHaveLength(100);
    }
  });

  it("sanitises custom sections and caps them at 20 sections × 100 entries", () => {
    const items = Array.from({ length: 130 }, (_, i) => ({ title: `Item ${i}`, startDate: "2020-01-01", bogus: 1 }));
    const sections = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, title: `Section ${i}`, items }));
    const data = sanitizeCV({ customSections: sections });
    expect(data.customSections).toHaveLength(MAX_CUSTOM_SECTIONS);
    expect(MAX_CUSTOM_SECTIONS).toBe(20);
    expect(data.customSections[0].items).toHaveLength(MAX_CUSTOM_ITEMS);
    expect(MAX_CUSTOM_ITEMS).toBe(100);
    expect(data.customSections[0].items[0]).toMatchObject({
      title: "Item 0",
      subtitle: "",
      startDate: "2020-01",
      endDate: "",
      description: "",
    });
    expect(data.customSections[0].items[0]).not.toHaveProperty("bogus");
  });

  it("coerces broken custom sections", () => {
    const data = sanitizeCV({
      customSections: [
        { id: "ok", title: "t".repeat(500), items: "not a list" },
        { title: 5, items: [null, { title: "Real", description: "x".repeat(6000) }, ["array"]] },
        "junk",
        null,
      ],
    });
    expect(data.customSections).toHaveLength(2);
    expect(data.customSections[0]).toMatchObject({ id: "ok", items: [] });
    expect(data.customSections[0].title).toHaveLength(300);
    expect(data.customSections[1].title).toBe("5");
    expect(data.customSections[1].items).toHaveLength(1);
    expect(data.customSections[1].items[0].description).toHaveLength(5000);
  });

  it("makes entry ids unique across all lists, custom entries included", () => {
    const data = sanitizeCV({
      experience: [{ id: "dup" }],
      languages: [{ id: "dup" }, { id: "lang" }],
      interests: [{ id: "lang" }],
      customSections: [
        { id: "cs", items: [{ id: "dup" }, { id: "item" }, { id: "item" }, { id: "bad id!" }] },
        { id: "cs2", items: [{ id: "item" }] },
      ],
    });
    const ids = [
      ...data.experience,
      ...data.languages,
      ...data.interests,
      ...data.customSections.flatMap((s) => s.items),
    ].map((i) => i.id);
    expect(ids).toHaveLength(9);
    expect(new Set(ids).size).toBe(9);
    // Built-in lists keep their ids; later clashes get new ones.
    expect(data.experience[0].id).toBe("dup");
    expect(data.languages[1].id).toBe("lang");
    expect(data.customSections[0].items[1].id).toBe("item");
    expect(ids.every((id) => /^[\w-]{1,64}$/.test(id))).toBe(true);
  });

  it("makes custom section ids unique and valid", () => {
    const data = sanitizeCV({
      customSections: [{ id: "a" }, { id: "a" }, { id: "<script>" }, {}],
    });
    const ids = data.customSections.map((s) => s.id);
    expect(ids[0]).toBe("a");
    expect(new Set(ids).size).toBe(4);
    expect(ids.every((id) => /^[\w-]{1,64}$/.test(id))).toBe(true);
  });

  it("keeps only valid, unique keys in sectionOrder and hiddenSections", () => {
    const data = sanitizeCV({
      customSections: [{ id: "c1", title: "Courses" }],
      meta: {
        sectionOrder: ["skills", "bogus", "custom:c1", "custom:deleted", "skills", 42, null, "custom:", "summary"],
        hiddenSections: ["interests", "custom:deleted", "custom:c1", "technicalSkills", "interests"],
      },
    });
    expect(data.meta.sectionOrder).toEqual(["skills", "custom:c1", "summary"]);
    expect(data.meta.hiddenSections).toEqual(["interests", "custom:c1"]);
  });

  it("falls back to empty section lists when they are not arrays", () => {
    const data = sanitizeCV({ meta: { sectionOrder: "skills", hiddenSections: { skills: true } } });
    expect(data.meta.sectionOrder).toEqual([]);
    expect(data.meta.hiddenSections).toEqual([]);
  });

  it("sanitises the style: invalid colours and unknown options fall back to defaults", () => {
    expect(sanitizeCV({ meta: { style: { accent: "red", font: "comic", fontSize: 12, spacing: "airy", margin: "none" } } }).meta.style).toEqual(DEFAULT_STYLE);
    expect(sanitizeCV({ meta: { style: "dark" } }).meta.style).toEqual(DEFAULT_STYLE);
    expect(sanitizeCV({ meta: {} }).meta.style).toEqual(DEFAULT_STYLE);
    expect(
      sanitizeCV({ meta: { style: { accent: "#1F3A5F", font: "serif", fontSize: "small", spacing: "relaxed", margin: "narrow", x: 1 } } })
        .meta.style,
    ).toEqual({ accent: "#1F3A5F", font: "serif", fontSize: "small", spacing: "relaxed", margin: "narrow" });
  });

  it("returns a style object that is not shared with DEFAULT_STYLE", () => {
    const a = createEmptyCV();
    a.meta.style.accent = "#000000";
    expect(DEFAULT_STYLE.accent).toBe("");
    expect(createEmptyCV().meta.style).toEqual(DEFAULT_STYLE);
  });
});

describe("document import and export (CVs and letters)", () => {
  it("serialises any document with app, kind, exportedAt and data", () => {
    const cv = richSampleCV();
    const parsed = JSON.parse(serializeDocument({ kind: "cv", data: cv }));
    expect(Object.keys(parsed).sort()).toEqual(["app", "data", "exportedAt", "kind"]);
    expect(parsed).toMatchObject({ app: EXPORT_APP_ID, kind: "cv", data: { personal: { fullName: "Alex Example" } } });
    expect(Number.isNaN(Date.parse(parsed.exportedAt))).toBe(false);
    const letter = JSON.parse(serializeDocument({ kind: "letter", data: sampleLetter() }));
    expect(letter).toMatchObject({ app: EXPORT_APP_ID, kind: "letter", data: { kind: "letter" } });
  });

  it("round-trips a v2 CV", () => {
    const cv = richSampleCV("graduate");
    expect(parseDocumentJson(serializeDocument({ kind: "cv", data: cv }))).toEqual({ ok: true, doc: { kind: "cv", data: cv } });
  });

  it("reads files written by serializeCV (envelope without kind)", () => {
    const cv = sampleCV();
    expect(parseDocumentJson(serializeCV(cv))).toEqual({ ok: true, doc: { kind: "cv", data: cv } });
  });

  it("reads bare and enveloped v1 CVs and reports the migration", () => {
    const expected = sampleCV("modern-professional");
    expected.meta.cvLanguage = "id";
    expect(parseDocumentJson(JSON.stringify(v1CV()))).toEqual({
      ok: true,
      doc: { kind: "cv", data: expected },
      migratedFrom: 1,
    });
    expect(parseDocumentJson(JSON.stringify({ app: EXPORT_APP_ID, exportedAt: "x", data: v1CV() }))).toEqual({
      ok: true,
      doc: { kind: "cv", data: expected },
      migratedFrom: 1,
    });
  });

  it("round-trips a letter", () => {
    const letter = sampleLetter("graduate");
    expect(parseDocumentJson(serializeDocument({ kind: "letter", data: letter }))).toEqual({
      ok: true,
      doc: { kind: "letter", data: letter },
    });
  });

  it("reads a bare letter and an envelope that only names the kind outside", () => {
    const letter = sampleLetter();
    expect(parseDocumentJson(JSON.stringify(letter))).toEqual({ ok: true, doc: { kind: "letter", data: letter } });
    const { kind: _k, ...withoutKind } = letter;
    void _k;
    const result = parseDocumentValue({ app: EXPORT_APP_ID, kind: "letter", data: withoutKind });
    expect(result).toEqual({ ok: true, doc: { kind: "letter", data: letter } });
  });

  it("reads the storage payload format", () => {
    const letter = sampleLetter();
    const stored = { schemaVersion: 1, savedAt: "2026-01-01T00:00:00.000Z", kind: "letter", data: letter };
    expect(parseDocumentValue(stored)).toEqual({ ok: true, doc: { kind: "letter", data: letter } });
    const cv = sampleCV();
    expect(parseDocumentValue({ schemaVersion: 2, savedAt: "x", kind: "cv", data: cv })).toEqual({
      ok: true,
      doc: { kind: "cv", data: cv },
    });
  });

  it("sanitises imported letters", () => {
    const result = parseDocumentJson(
      JSON.stringify({ kind: "letter", subject: 5, body: "b".repeat(20_000), date: "tomorrow", evil: "<script>" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.doc.kind !== "letter") throw new Error("expected a letter");
    expect(result.doc.data.subject).toBe("5");
    expect(result.doc.data.body).toHaveLength(10_000);
    expect(result.doc.data.date).toBe("");
    expect(result.doc.data).not.toHaveProperty("evil");
  });

  it("rejects letters from a newer version and unknown document kinds", () => {
    expect(parseDocumentJson(JSON.stringify({ ...sampleLetter(), schemaVersion: 2 }))).toEqual({
      ok: false,
      error: "unsupported_version",
    });
    expect(parseDocumentJson(JSON.stringify({ app: EXPORT_APP_ID, kind: "invoice", data: { total: 1 } }))).toEqual({
      ok: false,
      error: "not_object",
    });
  });

  it("rejects invalid JSON, non-objects and oversized files", () => {
    expect(parseDocumentJson("{nope")).toEqual({ ok: false, error: "invalid_json" });
    expect(parseDocumentJson("null")).toEqual({ ok: false, error: "not_object" });
    expect(parseDocumentJson("[]")).toEqual({ ok: false, error: "not_object" });
    expect(parseDocumentJson(" ".repeat(MAX_IMPORT_BYTES + 1))).toEqual({ ok: false, error: "too_large" });
  });

  it("does not read a letter as a CV", () => {
    expect(parseCVJson(serializeDocument({ kind: "letter", data: sampleLetter() }))).toEqual({
      ok: false,
      error: "not_object",
    });
    expect(parseCVValue(sampleLetter())).toEqual({ ok: false, error: "not_object" });
  });
});

describe("sample data", () => {
  it("gives the sample CVs empty v2 fields and the default style", () => {
    for (const cv of [sampleCV(), showcaseCV()]) {
      expect(cv.schemaVersion).toBe(CV_SCHEMA_VERSION);
      expect(cv.meta).toMatchObject({ sectionOrder: [], hiddenSections: [], style: DEFAULT_STYLE });
      for (const key of ["languages", "organizations", "awards", "references", "interests", "customSections"] as const) {
        expect(cv[key]).toEqual([]);
      }
    }
  });

  it("builds the rich sample from the plain sample", () => {
    const rich = richSampleCV("graduate");
    const plain = sampleCV("graduate");
    expect({
      ...rich,
      languages: [],
      organizations: [],
      awards: [],
      references: [],
      interests: [],
      customSections: [],
    }).toEqual(plain);
    expect(rich.languages).toHaveLength(2);
    expect(rich.organizations).toHaveLength(1);
    expect(rich.awards).toHaveLength(1);
    expect(rich.references).toEqual([expect.objectContaining({ phone: "", email: expect.stringMatching(/@example\.com$/) })]);
    expect(rich.interests).toHaveLength(2);
    expect(rich.customSections).toEqual([expect.objectContaining({ title: "Courses", items: expect.any(Array) })]);
    expect(rich.customSections[0].items).toHaveLength(2);
  });
});
