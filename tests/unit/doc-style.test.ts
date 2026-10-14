import { describe, expect, it } from "vitest";
import {
  ACCENT_PRESETS,
  DEFAULT_STYLE,
  FONT_OPTIONS,
  FONT_SIZES,
  FONT_SIZE_PT,
  MARGINS,
  MARGIN_MM,
  SPACINGS,
  SPACING_SCALE,
  contrastOnWhite,
  isDefaultStyle,
  isHexColor,
  relativeLuminance,
  sanitizeStyle,
} from "@/lib/doc-style";

describe("appearance options", () => {
  it("defaults reproduce the original look", () => {
    expect(DEFAULT_STYLE).toEqual({ accent: "", font: "default", fontSize: "medium", spacing: "normal", margin: "normal" });
    expect(MARGIN_MM[DEFAULT_STYLE.margin]).toEqual({ x: 16, y: 14 });
    expect(FONT_SIZE_PT[DEFAULT_STYLE.fontSize]).toBe(10);
    expect(SPACING_SCALE[DEFAULT_STYLE.spacing]).toEqual({ gap: 1, lineHeight: 1.4 });
  });

  it("has a value for every option", () => {
    expect(FONT_OPTIONS).toEqual(["default", "sans", "serif", "plex-sans", "plex-serif"]);
    expect(Object.keys(FONT_SIZE_PT).sort()).toEqual([...FONT_SIZES].sort());
    expect(Object.keys(SPACING_SCALE).sort()).toEqual([...SPACINGS].sort());
    expect(Object.keys(MARGIN_MM).sort()).toEqual([...MARGINS].sort());
    expect(FONT_SIZE_PT).toEqual({ small: 9.5, medium: 10, large: 10.5 });
    expect(MARGIN_MM.narrow).toEqual({ x: 12, y: 10 });
    expect(MARGIN_MM.wide).toEqual({ x: 20, y: 18 });
  });

  it("offers the template default first and valid, distinct preset colours", () => {
    expect(ACCENT_PRESETS[0]).toEqual({ id: "default", hex: "" });
    const rest = ACCENT_PRESETS.slice(1);
    expect(rest.every((p) => isHexColor(p.hex))).toBe(true);
    expect(new Set(ACCENT_PRESETS.map((p) => p.id)).size).toBe(ACCENT_PRESETS.length);
    expect(new Set(ACCENT_PRESETS.map((p) => p.hex)).size).toBe(ACCENT_PRESETS.length);
  });

  it("only offers presets that are readable on white (WCAG AA for text)", () => {
    for (const p of ACCENT_PRESETS) expect(contrastOnWhite(p.hex)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("sanitizeStyle", () => {
  it("falls back to the defaults for anything that is not an object", () => {
    for (const raw of [undefined, null, "serif", 4, [], true]) expect(sanitizeStyle(raw)).toEqual(DEFAULT_STYLE);
  });

  it("keeps valid values and drops unknown keys", () => {
    const style = { accent: "#4B2E5A", font: "plex-sans", fontSize: "large", spacing: "compact", margin: "wide" };
    expect(sanitizeStyle({ ...style, shadow: "lots" })).toEqual(style);
  });

  it("rejects malformed colours", () => {
    for (const accent of ["red", "#12345", "#1234567", "#ggg000", " #123456", "#123456 ", "123456", "#fff", 0x123456]) {
      expect(sanitizeStyle({ accent }).accent).toBe("");
    }
  });

  it("falls back per field for unknown options", () => {
    expect(sanitizeStyle({ accent: "#333333", font: "Comic Sans", fontSize: "huge", spacing: 2, margin: null })).toEqual({
      ...DEFAULT_STYLE,
      accent: "#333333",
    });
  });

  it("returns a fresh object", () => {
    const s = sanitizeStyle(undefined);
    s.accent = "#000000";
    expect(DEFAULT_STYLE.accent).toBe("");
  });

  it("recognises the default style", () => {
    expect(isDefaultStyle(sanitizeStyle({}))).toBe(true);
    expect(isDefaultStyle({ ...DEFAULT_STYLE, margin: "wide" })).toBe(false);
  });
});

describe("contrastOnWhite", () => {
  it("computes WCAG contrast ratios", () => {
    expect(contrastOnWhite("#000000")).toBeCloseTo(21, 5);
    expect(contrastOnWhite("#ffffff")).toBeCloseTo(1, 5);
    expect(contrastOnWhite("#777777")).toBeCloseTo(4.48, 2);
    expect(contrastOnWhite("#767676")).toBeGreaterThanOrEqual(4.5);
    expect(contrastOnWhite("#FF0000")).toBeCloseTo(4, 1);
  });

  it("accepts short hex colours", () => {
    expect(contrastOnWhite("#fff")).toBeCloseTo(1, 5);
    expect(contrastOnWhite("#000")).toBeCloseTo(21, 5);
  });

  it("treats the template default and invalid values as fully readable", () => {
    expect(contrastOnWhite("")).toBe(21);
    expect(contrastOnWhite("blue")).toBe(21);
    expect(relativeLuminance("blue")).toBeNull();
  });
});
