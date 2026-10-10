import { describe, expect, it } from "vitest";
import { formatMonth, formatRange, toBlocks } from "@/lib/cv-format";

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
