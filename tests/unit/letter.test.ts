import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STYLE } from "@/lib/doc-style";
import { letterReducer, type LetterAction } from "@/lib/letter-reducer";
import {
  LETTER_DEFAULTS,
  LETTER_SCHEMA_VERSION,
  createEmptyLetter,
  formatLetterDate,
  isValidIsoDate,
  letterIsEmpty,
  letterParagraphs,
  sanitizeLetter,
  todayIso,
  type LetterAction as SchemaLetterAction,
  type LetterData,
  type LetterField as SchemaLetterField,
} from "@/lib/letter-schema";
import { richSampleCV, sampleLetter } from "@/lib/sample-cv";

afterEach(() => {
  vi.useRealTimers();
});

describe("createEmptyLetter", () => {
  it("creates an English letter dated today with localized defaults", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 13, 9, 30));
    const letter = createEmptyLetter("en");
    expect(letter).toEqual({
      schemaVersion: LETTER_SCHEMA_VERSION,
      kind: "letter",
      meta: { template: "ats-minimal", language: "en", style: DEFAULT_STYLE },
      sender: { fullName: "", title: "", email: "", phone: "", city: "", country: "", linkedin: "", website: "" },
      recipient: { name: "", title: "", company: "", address: "" },
      date: "2026-10-13",
      subject: "",
      greeting: "Dear Hiring Manager,",
      body: "",
      closing: "Kind regards,",
      signature: "",
    });
    expect(letterIsEmpty(letter)).toBe(true);
  });

  it("uses Indonesian greeting and closing", () => {
    const letter = createEmptyLetter("id");
    expect(letter.greeting).toBe("Yth. Bapak/Ibu HRD,");
    expect(letter.closing).toBe("Hormat saya,");
    expect(letter.meta.language).toBe("id");
    expect(LETTER_DEFAULTS.id).toEqual({ greeting: "Yth. Bapak/Ibu HRD,", closing: "Hormat saya," });
  });

  it("copies sender details, signature, template and appearance from a CV", () => {
    const cv = richSampleCV("modern-professional");
    cv.personal.photo = "data:image/png;base64,AAAA";
    cv.meta.style = { ...DEFAULT_STYLE, accent: "#1b4332", font: "serif" };
    const letter = createEmptyLetter("en", cv);
    expect(letter.sender).toEqual({
      fullName: "Alex Example",
      title: "Data Analyst",
      email: "alex@example.com",
      phone: "+62 812 0000 0000",
      city: "Bandung",
      country: "Indonesia",
      linkedin: "linkedin.com/in/alex-example",
      website: "alex-example.dev",
    });
    expect(letter.sender).not.toHaveProperty("photo");
    expect(letter.signature).toBe("Alex Example");
    expect(letter.meta).toEqual({ template: "modern-professional", language: "en", style: cv.meta.style });
    expect(letterIsEmpty(letter)).toBe(false);

    // The letter does not share objects with the CV.
    letter.meta.style.accent = "#000000";
    letter.sender.fullName = "Changed";
    expect(cv.meta.style.accent).toBe("#1b4332");
    expect(cv.personal.fullName).toBe("Alex Example");
  });
});

describe("sanitizeLetter", () => {
  it("keeps a valid letter unchanged", () => {
    const letter = sampleLetter("graduate");
    expect(sanitizeLetter(structuredClone(letter) as unknown as Record<string, unknown>)).toEqual(letter);
  });

  it("fills in safe defaults for missing or wrong fields", () => {
    const letter = sanitizeLetter({
      schemaVersion: 7,
      kind: "cv",
      meta: { template: "fancy", language: "fr", style: { accent: "blue" } },
      sender: { fullName: 42, email: { x: 1 }, photo: "data:image/png;base64,AAAA" },
      recipient: "Acme",
      subject: ["x"],
      extra: "dropped",
    });
    expect(letter.schemaVersion).toBe(1);
    expect(letter.kind).toBe("letter");
    expect(letter.meta).toEqual({ template: "ats-minimal", language: "en", style: DEFAULT_STYLE });
    expect(letter.sender.fullName).toBe("42");
    expect(letter.sender.email).toBe("");
    expect(letter.sender).not.toHaveProperty("photo");
    expect(letter.recipient).toEqual({ name: "", title: "", company: "", address: "" });
    expect(letter.subject).toBe("");
    expect(letter.greeting).toBe("");
    expect(letter).not.toHaveProperty("extra");
  });

  it("caps text lengths", () => {
    const letter = sanitizeLetter({
      subject: "s".repeat(1000),
      body: "b".repeat(50_000),
      recipient: { address: "a".repeat(5000), company: "c".repeat(1000) },
      signature: "x".repeat(400),
    });
    expect(letter.subject).toHaveLength(300);
    expect(letter.body).toHaveLength(10_000);
    expect(letter.recipient.address).toHaveLength(1000);
    expect(letter.recipient.company).toHaveLength(300);
    expect(letter.signature).toHaveLength(300);
  });

  it("only keeps real calendar dates", () => {
    expect(sanitizeLetter({ date: "2026-10-13" }).date).toBe("2026-10-13");
    expect(sanitizeLetter({ date: "2026-10-13T08:00:00.000Z" }).date).toBe("2026-10-13");
    expect(sanitizeLetter({ date: "2026-02-30" }).date).toBe("");
    expect(sanitizeLetter({ date: "13/10/2026" }).date).toBe("");
    expect(sanitizeLetter({ date: 20261013 }).date).toBe("");
  });

  it("keeps multi-line addresses and paragraph breaks", () => {
    const letter = sanitizeLetter({ recipient: { address: "Line 1\nLine 2" }, body: "One\n\nTwo" });
    expect(letter.recipient.address).toBe("Line 1\nLine 2");
    expect(letter.body).toBe("One\n\nTwo");
  });
});

describe("letterIsEmpty", () => {
  const blank = () => sanitizeLetter({ date: "2026-01-01", greeting: "Dear Sir,", closing: "Thanks," });

  it("ignores the pre-filled date, greeting and closing", () => {
    expect(letterIsEmpty(blank())).toBe(true);
  });

  it("treats whitespace as empty", () => {
    expect(letterIsEmpty({ ...blank(), body: "  \n\n " })).toBe(true);
  });

  it("notices any real content", () => {
    expect(letterIsEmpty({ ...blank(), subject: "Application" })).toBe(false);
    expect(letterIsEmpty({ ...blank(), body: "Hello" })).toBe(false);
    expect(letterIsEmpty({ ...blank(), signature: "A. Example" })).toBe(false);
    expect(letterIsEmpty({ ...blank(), recipient: { ...blank().recipient, company: "Acme" } })).toBe(false);
    expect(letterIsEmpty({ ...blank(), sender: { ...blank().sender, email: "a@example.com" } })).toBe(false);
  });
});

describe("letter dates", () => {
  it("formats dates in English and Indonesian", () => {
    expect(formatLetterDate("2026-10-13", "en")).toBe("13 October 2026");
    expect(formatLetterDate("2026-10-13", "id")).toBe("13 Oktober 2026");
    expect(formatLetterDate("2026-03-02", "en")).toBe("2 March 2026");
    expect(formatLetterDate("2026-03-02", "id")).toBe("2 Maret 2026");
    expect(formatLetterDate("2024-08-17", "id")).toBe("17 Agustus 2024");
  });

  it("returns an empty string for missing or invalid dates", () => {
    expect(formatLetterDate("", "en")).toBe("");
    expect(formatLetterDate("2026-13-01", "en")).toBe("");
    expect(formatLetterDate("2026-02-29", "en")).toBe("");
    expect(formatLetterDate("2024-02-29", "en")).toBe("29 February 2024");
    expect(formatLetterDate("2026-10", "en")).toBe("");
  });

  it("validates ISO dates", () => {
    expect(isValidIsoDate("2026-04-30")).toBe(true);
    expect(isValidIsoDate("2026-04-31")).toBe(false);
    expect(isValidIsoDate("2026-00-10")).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
  });

  it("uses the local date for today", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("letterParagraphs", () => {
  it("splits on blank lines and keeps single line breaks", () => {
    expect(letterParagraphs("First line\nstill first\n\n\nSecond\r\n\r\nThird  \n \n")).toEqual([
      "First line\nstill first",
      "Second",
      "Third",
    ]);
    expect(letterParagraphs("   ")).toEqual([]);
  });
});

describe("letterReducer", () => {
  const run = (l: LetterData, ...actions: LetterAction[]) => actions.reduce(letterReducer, l);

  it("replaces the whole letter", () => {
    const next = sampleLetter();
    expect(letterReducer(createEmptyLetter("en"), { type: "replace", data: next })).toBe(next);
  });

  it("updates meta without touching content", () => {
    const before = sampleLetter();
    const after = letterReducer(before, { type: "setMeta", patch: { template: "graduate", language: "id" } });
    expect(after.meta).toEqual({ template: "graduate", language: "id", style: before.meta.style });
    expect({ ...after, meta: before.meta }).toEqual(before);
  });

  it("merges style changes and drops invalid values", () => {
    const l = run(
      sampleLetter(),
      { type: "setStyle", patch: { accent: "#0f5257", spacing: "relaxed" } },
      { type: "setStyle", patch: { margin: "narrow" } },
    );
    expect(l.meta.style).toEqual({ ...DEFAULT_STYLE, accent: "#0f5257", spacing: "relaxed", margin: "narrow" });
    expect(letterReducer(l, { type: "setStyle", patch: { accent: "teal" } }).meta.style.accent).toBe("");
  });

  it("patches sender and recipient", () => {
    const l = run(
      createEmptyLetter("en"),
      { type: "setSender", patch: { fullName: "Jane Doe", email: "jane@example.com" } },
      { type: "setSender", patch: { phone: "123" } },
      { type: "setRecipient", patch: { company: "Acme", address: "Street 1\nCity" } },
    );
    expect(l.sender).toMatchObject({ fullName: "Jane Doe", email: "jane@example.com", phone: "123" });
    expect(l.recipient).toEqual({ name: "", title: "", company: "Acme", address: "Street 1\nCity" });
  });

  it("sets each free-text field", () => {
    let l = createEmptyLetter("en");
    for (const field of ["date", "subject", "greeting", "body", "closing", "signature"] as const) {
      l = letterReducer(l, { type: "setField", field, value: `value of ${field}` });
      expect(l[field]).toBe(`value of ${field}`);
    }
  });

  it("ignores unknown fields", () => {
    const l = createEmptyLetter("en");
    const bogus = { type: "setField", field: "kind", value: "cv" } as unknown as LetterAction;
    expect(letterReducer(l, bogus)).toBe(l);
    expect(letterReducer(l, { type: "nope" } as unknown as LetterAction)).toBe(l);
  });

  it("does not mutate the previous state", () => {
    const before = sampleLetter();
    const snapshot = structuredClone(before);
    letterReducer(before, { type: "setSender", patch: { fullName: "X" } });
    letterReducer(before, { type: "setRecipient", patch: { name: "Y" } });
    letterReducer(before, { type: "setStyle", patch: { font: "serif" } });
    letterReducer(before, { type: "setMeta", patch: { language: "id" } });
    letterReducer(before, { type: "setField", field: "body", value: "Z" });
    expect(before).toEqual(snapshot);
  });
});

describe("sampleLetter", () => {
  it("is clearly fictional and complete", () => {
    const l = sampleLetter();
    expect(l.sender.email).toMatch(/@example\.com$/);
    expect(l.recipient.company).toContain("Example");
    expect(letterParagraphs(l.body).length).toBeGreaterThanOrEqual(3);
    expect(formatLetterDate(l.date, "en")).toBe("2 March 2026");
  });
});

describe("letter-schema type re-exports", () => {
  it("exposes LetterAction and LetterField from lib/letter-schema", () => {
    // Compile-time check (npm run typecheck): the re-exported types are the reducer's types.
    const field: SchemaLetterField = "subject";
    const action: SchemaLetterAction = { type: "setField", field, value: "Application" };
    const sameAction: LetterAction = action;
    const back: SchemaLetterAction = sameAction;
    expect(letterReducer(sampleLetter(), back).subject).toBe("Application");
  });
});
