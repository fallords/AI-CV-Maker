import { describe, expect, it } from "vitest";
import { CV_LABELS, formatMonth, formatRange, toBlocks } from "@/lib/cv-format";
import { LANGUAGE_LEVELS } from "@/lib/cv-schema";

describe("date formatting", () => {
  it("formats months consistently in English and Indonesian", () => {
    expect(formatMonth("2024-05", "en")).toBe("May 2024");
    expect(formatMonth("2024-05", "id")).toBe("Mei 2024");
    expect(formatMonth("2024-08", "id")).toBe("Agu 2024");
    expect(formatMonth("2024", "en")).toBe("2024");
    expect(formatMonth("", "en")).toBe("");
  });

  it("formats ranges, including current roles and partial dates", () => {
    expect(formatRange("2020-01", "2022-12", "en")).toBe("Jan 2020 – Dec 2022");
    expect(formatRange("2020-01", "", "en", true)).toBe("Jan 2020 – Present");
    expect(formatRange("2020-01", "", "id", true)).toBe("Jan 2020 – Sekarang");
    expect(formatRange("", "2022-12", "en")).toBe("Dec 2022");
    expect(formatRange("", "", "en")).toBe("");
  });
});

describe("description blocks", () => {
  it("turns dash/bullet lines into lists and keeps paragraphs", () => {
    expect(toBlocks("Intro line\n- one\n• two\n\n* three\nOutro")).toEqual([
      { kind: "p", text: "Intro line" },
      { kind: "ul", items: ["one", "two", "three"] },
      { kind: "p", text: "Outro" },
    ]);
  });

  it("ignores blank input", () => {
    expect(toBlocks("  \n \n")).toEqual([]);
  });
});

describe("CV labels", () => {
  it("has the same keys in English and Indonesian", () => {
    expect(Object.keys(CV_LABELS.id).sort()).toEqual(Object.keys(CV_LABELS.en).sort());
    expect(Object.keys(CV_LABELS.id.languageLevels).sort()).toEqual(Object.keys(CV_LABELS.en.languageLevels).sort());
  });

  it("names the new sections", () => {
    const pick = (lang: "en" | "id") => {
      const l = CV_LABELS[lang];
      return [l.languages, l.organizations, l.awards, l.references, l.interests];
    };
    expect(pick("en")).toEqual(["Languages", "Organizations & Volunteering", "Awards", "References", "Interests"]);
    expect(pick("id")).toEqual(["Bahasa", "Pengalaman Organisasi", "Penghargaan", "Referensi", "Minat"]);
  });

  it("labels every language level", () => {
    const levels = LANGUAGE_LEVELS.filter((l) => l !== "");
    expect(levels.map((l) => CV_LABELS.en.languageLevels[l])).toEqual([
      "Basic",
      "Conversational",
      "Professional",
      "Fluent",
      "Native",
    ]);
    expect(levels.map((l) => CV_LABELS.id.languageLevels[l])).toEqual([
      "Dasar",
      "Percakapan",
      "Profesional",
      "Fasih",
      "Penutur asli",
    ]);
  });

  it("has letter labels and full month names", () => {
    expect(CV_LABELS.en.subjectPrefix).toBe("Subject:");
    expect(CV_LABELS.id.subjectPrefix).toBe("Perihal:");
    expect(CV_LABELS.en.monthsLong).toHaveLength(12);
    expect(CV_LABELS.id.monthsLong).toHaveLength(12);
    expect(CV_LABELS.id.monthsLong[9]).toBe("Oktober");
    expect(CV_LABELS.en.monthsLong[0]).toBe("January");
  });
});
