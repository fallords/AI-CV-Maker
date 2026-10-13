/**
 * Turns a DocStyle (lib/doc-style.ts) into the CSS custom properties and classes the
 * `.cv-*` rules in app/globals.css read. Only values that differ from DEFAULT_STYLE are
 * emitted, so a document with the default style renders exactly as before these
 * settings existed (no inline style at all).
 */

import type { CSSProperties } from "react";
import {
  DEFAULT_STYLE,
  FONT_SIZE_PT,
  MARGIN_MM,
  SPACING_SCALE,
  sanitizeStyle,
  type DocStyle,
  type FontOption,
} from "@/lib/doc-style";

/**
 * Font stacks per option. They build on the theme's --font-sans/--font-serif stacks
 * (app/globals.css) so a missing font falls back to the template's own family. IBM Plex
 * is bundled with the app (app/layout.tsx), so PDFs never depend on remote fonts.
 */
export const FONT_STACKS: Record<Exclude<FontOption, "default">, string> = {
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
  "plex-sans": '"IBM Plex Sans", var(--font-sans)',
  "plex-serif": '"IBM Plex Serif", var(--font-serif)',
};

/** Set on the document root when a custom accent colour replaces the template's own. */
export const ACCENTED_CLASS = "cv-accented";

export type StyleVars = Partial<
  Record<"--cv-accent" | "--cv-font" | "--cv-font-name" | "--cv-fs" | "--cv-gap" | "--cv-lh" | "--cv-pad-x" | "--cv-pad-y", string>
>;

/** CSS custom properties for the non-default parts of a style. */
export function docStyleVars(raw: DocStyle | undefined): StyleVars {
  const style = sanitizeStyle(raw);
  const vars: StyleVars = {};
  if (style.accent) vars["--cv-accent"] = style.accent.toLowerCase();
  if (style.font !== "default") {
    // The name font is set too, so templates with their own display face (Modern
    // Professional's serif name) switch completely.
    vars["--cv-font"] = FONT_STACKS[style.font];
    vars["--cv-font-name"] = FONT_STACKS[style.font];
  }
  if (style.fontSize !== DEFAULT_STYLE.fontSize) {
    vars["--cv-fs"] = String(FONT_SIZE_PT[style.fontSize] / FONT_SIZE_PT[DEFAULT_STYLE.fontSize]);
  }
  if (style.spacing !== DEFAULT_STYLE.spacing) {
    vars["--cv-gap"] = String(SPACING_SCALE[style.spacing].gap);
    vars["--cv-lh"] = String(SPACING_SCALE[style.spacing].lineHeight);
  }
  if (style.margin !== DEFAULT_STYLE.margin) {
    vars["--cv-pad-x"] = `${MARGIN_MM[style.margin].x}mm`;
    vars["--cv-pad-y"] = `${MARGIN_MM[style.margin].y}mm`;
  }
  return vars;
}

/** Class name and inline style for a document root (`.cv-doc`). */
export function docRootProps(
  templateClass: string,
  raw: DocStyle | undefined,
  extraClass?: string,
): { className: string; style: CSSProperties | undefined } {
  const vars = docStyleVars(raw);
  const classes = ["cv-doc", templateClass];
  if (extraClass) classes.push(extraClass);
  if (vars["--cv-accent"]) classes.push(ACCENTED_CLASS);
  return {
    className: classes.join(" "),
    style: Object.keys(vars).length > 0 ? (vars as CSSProperties) : undefined,
  };
}

/** The printed page's top/bottom margin in millimetres for a style. */
export function pageMarginY(raw: DocStyle | undefined): number {
  return MARGIN_MM[sanitizeStyle(raw).margin].y;
}
