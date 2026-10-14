import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TEMPLATE_ACCENTS } from "@/components/builder/DesignPanel";
import { TEMPLATES } from "@/components/templates";
import { TEMPLATE_IDS } from "@/lib/cv-schema";
import { DOC_COLORS, TEMPLATE_COLORS, templateColor } from "@/lib/doc-style";
import { TEMPLATE_ACCENTS as WORD_ACCENTS, WORD_COLORS } from "@/lib/export/docx";

/**
 * The template colours exist twice: in app/globals.css (what the preview and PDF use) and
 * in lib/doc-style.ts (the Design panel's "Template colour" swatch, the starting point for
 * a custom colour, and the Word export). These tests keep the two in step.
 */
const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

/** Declarations of the first rule whose selector is exactly `selector`. */
function ruleBody(selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, "m").exec(css);
  return m ? m[1] : null;
}

function customProperty(body: string | null, name: string): string | null {
  if (!body) return null;
  const m = new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(body);
  return m ? m[1].toLowerCase() : null;
}

describe("template colours match app/globals.css", () => {
  const docRule = ruleBody(".cv-doc");

  it("finds the base document rule", () => {
    expect(docRule).not.toBeNull();
  });

  it("neutral colours match .cv-doc", () => {
    expect(customProperty(docRule, "--cv-text")).toBe(DOC_COLORS.text);
    expect(customProperty(docRule, "--cv-muted")).toBe(DOC_COLORS.muted);
    expect(customProperty(docRule, "--cv-rule")).toBe(DOC_COLORS.rule);
    expect(WORD_COLORS).toEqual({
      text: DOC_COLORS.text.slice(1).toUpperCase(),
      muted: DOC_COLORS.muted.slice(1).toUpperCase(),
      rule: DOC_COLORS.rule.slice(1).toUpperCase(),
    });
  });

  for (const template of TEMPLATE_IDS) {
    it(`the default accent of ${template} matches its .tpl-* rule`, () => {
      const className = TEMPLATES[template].className;
      expect(className).toMatch(/^tpl-/);
      // A template either sets its own --cv-accent, or (ATS Minimal) shows no accent at
      // all and is set in the text colour.
      const own = customProperty(ruleBody(`.${className}`), "--cv-accent");
      const expected = own ?? customProperty(docRule, "--cv-text");
      expect(expected).toMatch(/^#[0-9a-f]{6}$/);
      expect(TEMPLATE_COLORS[template]).toBe(expected);
      expect(TEMPLATE_ACCENTS[template]).toBe(expected);
      expect(templateColor(template)).toBe(expected);
      // Word colours headings with the same accent (ATS Minimal keeps black text).
      expect(WORD_ACCENTS[template]).toBe(own ? own.slice(1).toUpperCase() : null);
    });
  }

  it("falls back to ATS Minimal's colour for unknown template ids", () => {
    for (const bad of ["constructor", "__proto__", "toString", "nope", ""]) {
      expect(templateColor(bad)).toBe(TEMPLATE_COLORS["ats-minimal"]);
    }
  });
});
