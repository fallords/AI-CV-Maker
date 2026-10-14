/**
 * Appearance settings shared by CVs and cover letters.
 *
 * DEFAULT_STYLE reproduces the original look exactly (template colours and fonts,
 * 10pt base text, 16mm × 14mm page margins, the original spacing), so documents
 * created before these settings existed render unchanged.
 */

import type { TemplateId } from "./cv-schema";

export const ACCENT_PRESETS = [
  { id: "default", hex: "" }, // template default colour
  { id: "ink", hex: "#1f3a5f" },
  { id: "prussian", hex: "#21507a" },
  { id: "forest", hex: "#1b4332" },
  { id: "teal", hex: "#0f5257" },
  { id: "burgundy", hex: "#7a1f2b" },
  { id: "plum", hex: "#4b2e5a" },
  { id: "graphite", hex: "#333333" },
] as const;
export type AccentPreset = (typeof ACCENT_PRESETS)[number];
export type AccentPresetId = AccentPreset["id"];

/** "default" keeps the template's own font. */
export const FONT_OPTIONS = ["default", "sans", "serif", "plex-sans", "plex-serif"] as const;
export type FontOption = (typeof FONT_OPTIONS)[number];

/** Base text size: 9.5pt / 10pt / 10.5pt (see FONT_SIZE_PT). */
export const FONT_SIZES = ["small", "medium", "large"] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const SPACINGS = ["compact", "normal", "relaxed"] as const;
export type Spacing = (typeof SPACINGS)[number];

export const MARGINS = ["narrow", "normal", "wide"] as const;
export type Margin = (typeof MARGINS)[number];

export interface DocStyle {
  /** "" (template default) or a "#rrggbb" colour. */
  accent: string;
  font: FontOption;
  fontSize: FontSize;
  spacing: Spacing;
  margin: Margin;
}

export const DEFAULT_STYLE: DocStyle = {
  accent: "",
  font: "default",
  fontSize: "medium",
  spacing: "normal",
  margin: "normal",
};

/** Page margins in millimetres: x = left/right padding of the sheet, y = top/bottom page margin. */
export const MARGIN_MM: Record<Margin, { x: number; y: number }> = {
  narrow: { x: 12, y: 10 },
  normal: { x: 16, y: 14 },
  wide: { x: 20, y: 18 },
};

export const FONT_SIZE_PT: Record<FontSize, number> = { small: 9.5, medium: 10, large: 10.5 };

/** `gap` multiplies the template's vertical gaps; `lineHeight` is the body line height. */
export const SPACING_SCALE: Record<Spacing, { gap: number; lineHeight: number }> = {
  compact: { gap: 0.75, lineHeight: 1.3 },
  normal: { gap: 1, lineHeight: 1.4 },
  relaxed: { gap: 1.3, lineHeight: 1.5 },
};

/**
 * The neutral colours every template uses (app/globals.css: `.cv-doc` `--cv-text`,
 * `--cv-muted`, `--cv-rule`). The Word export reuses them; a unit test keeps the two in step.
 */
export const DOC_COLORS = { text: "#1c1917", muted: "#57534e", rule: "#d6d3d1" } as const;

/**
 * Each template's own colour, used when `accent` is "" (app/globals.css: `.tpl-modern` and
 * `.tpl-graduate` `--cv-accent`; ATS Minimal has no accent and is set in the near-black
 * text colour). The design panel shows it on the "Template colour" swatch and the Word
 * export colours headings with it. A unit test keeps it in step with the stylesheet.
 */
export const TEMPLATE_COLORS: Record<TemplateId, string> = {
  "ats-minimal": DOC_COLORS.text,
  "modern-professional": "#245740",
  graduate: "#2d6a4f",
};

/** A template's own colour; unknown ids (including inherited keys like "constructor") get ATS Minimal's. */
export function templateColor(template: string): string {
  return Object.prototype.hasOwnProperty.call(TEMPLATE_COLORS, template)
    ? TEMPLATE_COLORS[template as TemplateId]
    : TEMPLATE_COLORS["ats-minimal"];
}

export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && HEX_COLOR_RE.test(v);
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Coerce anything into a valid DocStyle; invalid or missing values fall back to DEFAULT_STYLE. */
export function sanitizeStyle(raw: unknown): DocStyle {
  const r = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    accent: isHexColor(r.accent) ? r.accent : DEFAULT_STYLE.accent,
    font: oneOf<FontOption>(r.font, FONT_OPTIONS, DEFAULT_STYLE.font),
    fontSize: oneOf<FontSize>(r.fontSize, FONT_SIZES, DEFAULT_STYLE.fontSize),
    spacing: oneOf<Spacing>(r.spacing, SPACINGS, DEFAULT_STYLE.spacing),
    margin: oneOf<Margin>(r.margin, MARGINS, DEFAULT_STYLE.margin),
  };
}

/** True when the style equals DEFAULT_STYLE. */
export function isDefaultStyle(style: DocStyle): boolean {
  return (
    style.accent === DEFAULT_STYLE.accent &&
    style.font === DEFAULT_STYLE.font &&
    style.fontSize === DEFAULT_STYLE.fontSize &&
    style.spacing === DEFAULT_STYLE.spacing &&
    style.margin === DEFAULT_STYLE.margin
  );
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2 relative luminance of "#rrggbb" or "#rgb"; null for anything else. */
export function relativeLuminance(hex: string): number | null {
  const s = typeof hex === "string" ? hex.trim() : "";
  let digits: string;
  if (/^#[0-9a-f]{6}$/i.test(s)) digits = s.slice(1);
  else if (/^#[0-9a-f]{3}$/i.test(s)) digits = s.slice(1).replace(/./g, (d) => d + d);
  else return null;
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(digits.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio of the colour against white (1 to 21).
 * Returns 21 for "" (template default colour, which is always dark enough) and for
 * values that are not a "#rrggbb"/"#rgb" colour, so callers only warn about real colours.
 */
export function contrastOnWhite(hex: string): number {
  const l = relativeLuminance(hex);
  if (l === null) return 21;
  return 1.05 / (l + 0.05);
}
