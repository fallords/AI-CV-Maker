/**
 * Word (.docx) export for CVs and cover letters, built in the browser with the `docx`
 * package. The package is loaded with a dynamic import() the first time a Word file is
 * requested, so it never weighs on the builder's initial bundle.
 *
 * The file follows the document's template and appearance settings as closely as Word
 * allows: A4 pages with the style's margins, the template's (or the chosen) accent
 * colour, font, text size and spacing, real Word headings (Title for the name, Heading 1
 * for sections, Heading 2 for entries, so Word's navigation pane and accessibility
 * checker understand the structure), real Word bullets and right-aligned dates on a
 * tab stop. Content comes from lib/export/model.ts, the same model as the plain text
 * export, so section order, hidden sections and CV-language labels match the preview.
 */

import type * as Docx from "docx";
import {
  DOC_COLORS,
  FONT_SIZE_PT,
  MARGIN_MM,
  SPACING_SCALE,
  TEMPLATE_COLORS,
  type DocStyle,
  type FontOption,
} from "../doc-style";
import type { AnyDoc } from "../documents";
import type { TemplateId } from "../cv-schema";
import { EXPORT_MIME } from "./download";
import {
  buildDocModel,
  type CVModel,
  type DocModel,
  type EntryModel,
  type HeaderModel,
  type LetterModel,
  type Part,
  type SectionModel,
  type TextBlock,
} from "./model";

type DocxModule = typeof Docx;
type ParagraphSpec = Docx.IParagraphOptions;
type RunOptions = Docx.IRunOptions;

export const DOCX_MIME = EXPORT_MIME.docx;

/* ---------------- units ---------------- */

/** Millimetres to twentieths of a point (twips). */
const twips = (mm: number): number => Math.round((mm * 1440) / 25.4);
/** Points to half-points (Word font sizes). */
const halfPoints = (pt: number): number => Math.round(pt * 2);
const mmToPt = (mm: number): number => (mm * 72) / 25.4;
/** Border width: millimetres to eighths of a point (Word allows 2 to 96). */
const eighths = (mm: number): number => Math.min(96, Math.max(2, Math.round(mmToPt(mm) * 8)));

const A4 = { width: twips(210), height: twips(297) };

/* ---------------- theme ---------------- */

/** "#rrggbb" → "RRGGBB" (Word colour values). */
const wordColor = (hex: string): string => hex.replace("#", "").toUpperCase();

/** The templates' neutral colours (lib/doc-style.ts DOC_COLORS, as in app/globals.css .cv-doc). */
export const WORD_COLORS = {
  text: wordColor(DOC_COLORS.text),
  muted: wordColor(DOC_COLORS.muted),
  rule: wordColor(DOC_COLORS.rule),
} as const;

/** Template accent colours used when the style keeps the template default (accent ""). */
export const TEMPLATE_ACCENTS: Record<TemplateId, string | null> = {
  "ats-minimal": null, // black text; a chosen accent colours the name, headings and header rule
  "modern-professional": wordColor(TEMPLATE_COLORS["modern-professional"]),
  graduate: wordColor(TEMPLATE_COLORS.graduate),
};

/**
 * Word font per appearance option. Word cannot fall back through a CSS font stack, so
 * each option names one font: Arial and Georgia are installed almost everywhere; IBM
 * Plex is named as chosen (Word shows a similar font when it is not installed).
 */
export const WORD_FONTS: Record<Exclude<FontOption, "default">, string> = {
  sans: "Arial",
  serif: "Georgia",
  "plex-sans": "IBM Plex Sans",
  "plex-serif": "IBM Plex Serif",
};

interface Rule {
  color: string;
  /** Eighths of a point. */
  size: number;
  /** Distance from the text in points. */
  space: number;
}

export interface WordTheme {
  bodyFont: string;
  nameFont: string;
  /** Multiplies every font size (FONT_SIZE_PT relative to 10pt). */
  scale: number;
  /** Multiplies vertical gaps (SPACING_SCALE.gap). */
  gap: number;
  /** CSS-style line height of body text. */
  lineHeight: number;
  /** Accent colour as RRGGBB, or null for ATS Minimal without a chosen accent. */
  accent: string | null;
  name: { size: number; color: string };
  title: { size: number; color: string; bold: boolean };
  heading: { size: number; color: string; tracking: number; before: number; rule: Rule | null };
  date: { color: string; bold: boolean };
  bulletColor: string;
  /** Rule under the header (ATS Minimal, Modern Professional). */
  headerRule: Rule | null;
  /** Tinted header band with an accent edge (Graduate). */
  band: { fill: string; edge: string } | null;
  photo: { mm: number; side: "left" | "right" } | null;
}

/** RRGGBB of `hex` (RRGGBB) blended with white: amount 1 = the colour, 0 = white. */
export function mixWithWhite(hex: string, amount: number): string {
  const n = parseInt(hex, 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(c * amount + 255 * (1 - amount))
      .toString(16)
      .padStart(2, "0");
  };
  return `${channel(16)}${channel(8)}${channel(0)}`.toUpperCase();
}

/** The Word look of a template with the given appearance settings. */
export function wordTheme(template: TemplateId, style: DocStyle): WordTheme {
  const custom = style.accent ? style.accent.replace("#", "").toUpperCase() : null;
  const accent =
    custom ?? (Object.prototype.hasOwnProperty.call(TEMPLATE_ACCENTS, template) ? TEMPLATE_ACCENTS[template] : null);
  const chosenFont = style.font === "default" ? null : WORD_FONTS[style.font];
  const base = {
    bodyFont: chosenFont ?? WORD_FONTS.sans,
    nameFont: chosenFont ?? WORD_FONTS.sans,
    scale: FONT_SIZE_PT[style.fontSize] / 10,
    gap: SPACING_SCALE[style.spacing].gap,
    lineHeight: SPACING_SCALE[style.spacing].lineHeight,
    accent,
  };
  const gap = base.gap;
  const { text, muted, rule } = WORD_COLORS;

  if (template === "modern-professional" && accent) {
    return {
      ...base,
      nameFont: chosenFont ?? WORD_FONTS.serif,
      name: { size: 24, color: accent },
      title: { size: 12, color: text, bold: false },
      heading: {
        size: 10,
        color: accent,
        tracking: 0.1,
        before: 6,
        rule: { color: mixWithWhite(accent, 0.35), size: eighths(0.25), space: 2 },
      },
      date: { color: accent, bold: true },
      bulletColor: accent,
      headerRule: { color: accent, size: eighths(0.8), space: Math.round(mmToPt(4 * gap)) },
      band: null,
      photo: { mm: 28, side: "right" },
    };
  }
  if (template === "graduate" && accent) {
    return {
      ...base,
      name: { size: 20, color: text },
      title: { size: 11.5, color: accent, bold: true },
      heading: { size: 11, color: accent, tracking: 0.04, before: 5, rule: { color: accent, size: eighths(0.5), space: 3 } },
      date: { color: muted, bold: false },
      bulletColor: text,
      headerRule: null,
      band: { fill: custom ? mixWithWhite(custom, 0.08) : "EFF6F1", edge: accent },
      photo: { mm: 26, side: "left" },
    };
  }
  // ATS Minimal: black by default; a chosen accent colours the name, headings and header rule.
  return {
    ...base,
    name: { size: 21, color: accent ?? text },
    title: { size: 11.5, color: muted, bold: false },
    heading: { size: 10.5, color: accent ?? text, tracking: 0.06, before: 5, rule: { color: rule, size: eighths(0.25), space: 3 } },
    date: { color: muted, bold: false },
    bulletColor: text,
    headerRule: { color: accent ?? text, size: eighths(0.4), space: Math.round(mmToPt(3 * gap)) },
    band: null,
    photo: null,
  };
}

/* ---------------- building ---------------- */

const BULLETS = "cv-bullets";
const PHOTO_RE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;

/** Document title stored in the file's properties. */
function documentTitle(model: DocModel): string {
  const name = model.header.name;
  const label = model.kind === "cv" ? "CV" : model.language === "id" ? "Surat lamaran" : "Cover letter";
  return name ? `${name} – ${label}` : label;
}

class WordWriter {
  readonly theme: WordTheme;
  readonly contentWidth: number;

  constructor(
    private readonly d: DocxModule,
    readonly model: DocModel,
  ) {
    this.theme = wordTheme(model.template, model.style);
    const margin = MARGIN_MM[model.style.margin];
    this.contentWidth = A4.width - 2 * twips(margin.x);
  }

  /** Vertical gap in twips, scaled by the spacing setting. */
  gap(mm: number): number {
    return twips(mm * this.theme.gap);
  }

  size(pt: number): number {
    return halfPoints(pt * this.theme.scale);
  }

  /** Text runs; "\n" becomes a line break and tabs become spaces (tabs would jump to the date tab stop). */
  runs(text: string, options: RunOptions = {}): Docx.TextRun[] {
    return text.split("\n").map(
      (line, i) => new this.d.TextRun({ ...options, text: line.replace(/\t/g, " "), ...(i > 0 ? { break: 1 } : {}) }),
    );
  }

  /** Parts joined by a separator; labels in bold body colour, links as real hyperlinks. */
  parts(parts: Part[], separator: string, options: RunOptions, separatorColor?: string): Docx.ParagraphChild[] {
    const d = this.d;
    const out: Docx.ParagraphChild[] = [];
    parts.forEach((part, i) => {
      if (i > 0) out.push(new d.TextRun({ ...options, text: separator, ...(separatorColor ? { color: separatorColor } : {}) }));
      if (part.label) out.push(new d.TextRun({ ...options, text: `${part.label}: `, bold: true, color: WORD_COLORS.text }));
      const runs = this.runs(part.text, options);
      if (part.href) out.push(new d.ExternalHyperlink({ link: part.href, children: runs }));
      else out.push(...runs);
    });
    return out;
  }

  /* ----- header ----- */

  headerParagraphs(h: HeaderModel): ParagraphSpec[] {
    const t = this.theme;
    const specs: ParagraphSpec[] = [];
    if (h.name) specs.push({ heading: this.d.HeadingLevel.TITLE, children: this.runs(h.name) });
    if (h.title) {
      specs.push({
        spacing: { before: twips(1) },
        keepNext: true,
        children: this.runs(h.title, { size: this.size(t.title.size), color: t.title.color, bold: t.title.bold }),
      });
    }
    if (h.contact.length > 0) {
      specs.push({
        spacing: { before: specs.length > 0 ? this.gap(2.5) : 0 },
        children: this.parts(h.contact, "  |  ", { size: this.size(9), color: WORD_COLORS.muted }, WORD_COLORS.rule),
      });
    }
    return specs;
  }

  header(h: HeaderModel): Docx.FileChild[] {
    const d = this.d;
    const t = this.theme;
    const specs = this.headerParagraphs(h);
    if (specs.length === 0) return [];

    const photo = t.photo && PHOTO_RE.test(h.photo) ? h.photo : "";
    if (photo && t.photo) return [this.photoHeader(specs, photo, t.photo)];

    // ATS Minimal without a name or title shows the contact line alone, without the rule.
    const headerless = this.model.template === "ats-minimal" && !h.name && !h.title;
    if (t.band) {
      const band = t.band;
      const pad = { x: mmToPt(6), y: mmToPt(5) };
      const fillBorder = (space: number) => ({ style: d.BorderStyle.SINGLE, size: 4, color: band.fill, space: Math.round(space) });
      return specs.map(
        (spec) =>
          new d.Paragraph({
            ...spec,
            keepNext: true,
            keepLines: true,
            shading: { type: d.ShadingType.CLEAR, fill: band.fill, color: "auto" },
            indent: { left: twips(7.5), right: twips(6) },
            border: {
              left: { style: d.BorderStyle.SINGLE, size: eighths(1.5), color: band.edge, space: Math.round(pad.x) },
              right: fillBorder(pad.x),
              top: fillBorder(pad.y),
              bottom: fillBorder(pad.y),
            },
          }),
      );
    }
    // The header stays on the page with what follows it.
    return specs.map((spec, i) => {
      const rule = !headerless && i === specs.length - 1 ? t.headerRule : null;
      return new d.Paragraph({
        ...spec,
        keepNext: true,
        keepLines: true,
        ...(rule ? { border: { bottom: { style: d.BorderStyle.SINGLE, size: rule.size, color: rule.color, space: rule.space } } } : {}),
      });
    });
  }

  /** Header with a photo: a borderless two-cell table (text and photo side by side, as in the template). */
  photoHeader(specs: ParagraphSpec[], photo: string, layout: { mm: number; side: "left" | "right" }): Docx.Table {
    const d = this.d;
    const t = this.theme;
    const side = twips(layout.mm);
    const gutter = twips(6);
    const padX = t.band ? twips(6) : 0;
    const padY = t.band ? twips(5) : 0;
    const bottom = t.headerRule ? this.gap(4) : padY;
    const photoWidth = side + gutter + padX;
    const textWidth = this.contentWidth - photoWidth;
    const shading = t.band ? { type: d.ShadingType.CLEAR, fill: t.band.fill, color: "auto" } : undefined;
    const none = { style: d.BorderStyle.NONE, size: 0, color: "auto" };
    const px = Math.round((layout.mm / 25.4) * 96);

    const image = new d.ImageRun({
      type: photo.startsWith("data:image/png") ? "png" : "jpg",
      data: photo,
      transformation: { width: px, height: px },
      altText: { name: "Photo" },
      // The name sits right next to it, as in the templates (alt="").
      decorative: true,
    });
    const photoLeft = layout.side === "left";
    const photoCell = new d.TableCell({
      width: { size: photoWidth, type: d.WidthType.DXA },
      verticalAlign: d.VerticalAlignTable.CENTER,
      shading,
      margins: photoLeft
        ? { top: padY, bottom, left: padX, right: gutter }
        : { top: padY, bottom, left: gutter, right: padX },
      children: [
        new d.Paragraph({
          alignment: photoLeft ? d.AlignmentType.LEFT : d.AlignmentType.RIGHT,
          children: [image],
        }),
      ],
    });
    const textCell = new d.TableCell({
      width: { size: textWidth, type: d.WidthType.DXA },
      verticalAlign: d.VerticalAlignTable.CENTER,
      shading,
      margins: photoLeft ? { top: padY, bottom, left: 0, right: padX } : { top: padY, bottom, left: padX, right: 0 },
      children: specs.map((spec) => new d.Paragraph(spec)),
    });
    const cells = photoLeft ? [photoCell, textCell] : [textCell, photoCell];
    return new d.Table({
      width: { size: this.contentWidth, type: d.WidthType.DXA },
      columnWidths: photoLeft ? [photoWidth, textWidth] : [textWidth, photoWidth],
      layout: d.TableLayoutType.FIXED,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      borders: {
        top: none,
        right: none,
        insideHorizontal: none,
        insideVertical: none,
        left: t.band ? { style: d.BorderStyle.SINGLE, size: eighths(1.5), color: t.band.edge } : none,
        bottom: t.headerRule ? { style: d.BorderStyle.SINGLE, size: t.headerRule.size, color: t.headerRule.color } : none,
      },
      rows: [new d.TableRow({ cantSplit: true, children: cells })],
    });
  }

  /* ----- CV body ----- */

  blockSpecs(blocks: TextBlock[], firstBefore: number): ParagraphSpec[] {
    const specs: ParagraphSpec[] = [];
    blocks.forEach((b, bi) => {
      const before = bi === 0 ? firstBefore : 1;
      if (b.kind === "p") {
        specs.push({ spacing: { before: this.gap(before) }, children: this.runs(b.text) });
        return;
      }
      b.items.forEach((item, ii) => {
        specs.push({
          numbering: { reference: BULLETS, level: 0 },
          spacing: { before: this.gap(ii === 0 ? before : 0.6) },
          keepLines: true,
          children: this.runs(item),
        });
      });
    });
    return specs;
  }

  metaSpec(parts: Part[]): ParagraphSpec {
    return {
      spacing: { before: this.gap(1) },
      children: this.parts(parts, " · ", { size: this.size(9), color: WORD_COLORS.muted }),
    };
  }

  /** An entry: title with the date on a right tab stop, details line, description and extra lines. */
  entrySpecs(e: EntryModel, first: boolean): ParagraphSpec[] {
    const d = this.d;
    const t = this.theme;
    const specs: ParagraphSpec[] = [];
    if (e.title || e.date) {
      const date = e.date
        ? [
            new d.TextRun({
              children: [new d.Tab(), e.date],
              size: this.size(9),
              color: t.date.color,
              bold: t.date.bold,
            }),
          ]
        : [];
      specs.push({
        heading: d.HeadingLevel.HEADING_2,
        tabStops: [{ type: d.TabStopType.RIGHT, position: this.contentWidth }],
        children: [...this.runs(e.title), ...date],
      });
    }
    if (e.sub.length > 0) {
      specs.push({ keepLines: true, children: this.runs(e.sub.join(" · "), { color: WORD_COLORS.muted }) });
    }
    const hasHead = specs.length > 0;
    specs.push(...this.blockSpecs(e.body, hasHead ? 1 : 0));
    specs.push(...e.meta.map((m) => this.metaSpec(m)));
    if (specs.length === 0) return specs;
    if (!first) specs[0] = { ...specs[0], spacing: { ...specs[0].spacing, before: this.gap(3) } };
    // Keep an entry on one page where possible (as the templates do in print).
    return specs.map((spec, i) => (i < specs.length - 1 ? { ...spec, keepNext: true } : spec));
  }

  /** One-line entry: "Name · Issuer · Date · Credential" (the Graduate template's certifications). */
  compactSpec(e: EntryModel, first: boolean): ParagraphSpec {
    const d = this.d;
    const parts: Docx.ParagraphChild[] = [];
    if (e.title) parts.push(...this.runs(e.title, { bold: true }));
    const rest: Part[] = [...e.sub.map((text) => ({ text })), ...(e.date ? [{ text: e.date }] : []), ...e.meta.flat()];
    if (rest.length > 0) {
      if (parts.length > 0) parts.push(new d.TextRun({ text: " · " }));
      parts.push(...this.parts(rest, " · ", {}));
    }
    return { keepLines: true, spacing: { before: first ? 0 : this.gap(1.5) }, children: parts };
  }

  sectionSpecs(section: SectionModel): ParagraphSpec[] {
    const d = this.d;
    const c = section.content;
    const specs: ParagraphSpec[] = [{ heading: d.HeadingLevel.HEADING_1, children: this.runs(section.title) }];
    switch (c.kind) {
      case "blocks":
        specs.push(...this.blockSpecs(c.blocks, 0));
        break;
      case "entries":
        c.entries.forEach((e, i) => {
          if (c.compact) specs.push(this.compactSpec(e, i === 0));
          else specs.push(...this.entrySpecs(e, i === 0));
        });
        break;
      case "groups":
        c.groups.forEach((g, i) => {
          specs.push({
            keepLines: true,
            spacing: { before: i === 0 ? 0 : this.gap(1.5) },
            children: [new d.TextRun({ text: `${g.label}:`, bold: true }), ...this.runs(` ${g.items.join(", ")}`)],
          });
        });
        break;
      case "tags":
        specs.push({ children: this.runs(c.items.join(", ")) });
        break;
    }
    return specs;
  }

  cvChildren(model: CVModel): Docx.FileChild[] {
    const children: Docx.FileChild[] = this.header(model.header);
    for (const section of model.sections) {
      children.push(...this.sectionSpecs(section).map((spec) => new this.d.Paragraph(spec)));
    }
    return children;
  }

  /* ----- letter body ----- */

  letterChildren(model: LetterModel): Docx.FileChild[] {
    const d = this.d;
    const specs: ParagraphSpec[] = [];
    // The letter body starts 9mm below the header; its parts are 6mm apart (LetterDocument CSS).
    const add = (spec: ParagraphSpec, beforeMm: number) => {
      specs.push({ ...spec, spacing: { before: this.gap(specs.length === 0 ? 9 : beforeMm) } });
    };
    if (model.date) add({ children: this.runs(model.date) }, 6);
    if (model.recipient.length > 0) add({ keepLines: true, children: this.runs(model.recipient.join("\n")) }, 6);
    if (model.subject) {
      add({ keepNext: true, children: this.runs(`${model.subject.label} ${model.subject.text}`, { bold: true }) }, 6);
    }
    if (model.greeting) add({ keepNext: true, children: this.runs(model.greeting) }, 6);
    model.paragraphs.forEach((p, i) => {
      add({ children: this.runs(p) }, i === 0 && !model.greeting ? 6 : 3.5);
    });
    if (model.closing) add({ keepNext: true, keepLines: true, children: this.runs(model.closing) }, 6);
    // Room for a handwritten signature above the typed name.
    if (model.signature) add({ keepLines: true, children: this.runs(model.signature) }, model.closing ? 14 : 6);
    return [...this.header(model.header), ...specs.map((spec) => new d.Paragraph(spec))];
  }

  /* ----- document ----- */

  document(): Docx.Document {
    const d = this.d;
    const t = this.theme;
    const model = this.model;
    const isLetter = model.kind === "letter";
    const margin = MARGIN_MM[model.style.margin];
    // CSS line heights include the font's own leading; Word's "single" is about 1.15 already.
    const lineHeight = t.lineHeight + (isLetter ? 0.1 : 0);
    const line = Math.round((240 * lineHeight) / 1.15);
    const language = { value: model.language === "id" ? "id-ID" : "en-US" };
    const headingRule = t.heading.rule;
    const author = model.header.name;
    const children = model.kind === "cv" ? this.cvChildren(model) : this.letterChildren(model);

    return new d.Document({
      title: documentTitle(model),
      creator: author,
      lastModifiedBy: author,
      styles: {
        default: {
          document: {
            run: {
              font: t.bodyFont,
              size: this.size(isLetter ? 10.5 : 10),
              color: WORD_COLORS.text,
              language,
            },
            paragraph: { spacing: { before: 0, after: 0, line, lineRule: d.LineRuleType.AUTO } },
          },
          title: {
            run: { font: t.nameFont, size: this.size(t.name.size), bold: true, color: t.name.color },
            paragraph: { spacing: { before: 0, after: 0, line: 240, lineRule: d.LineRuleType.AUTO }, keepNext: true, keepLines: true },
          },
          heading1: {
            run: {
              font: t.bodyFont,
              size: this.size(t.heading.size),
              bold: true,
              allCaps: true,
              characterSpacing: Math.round(t.heading.size * t.scale * t.heading.tracking * 20),
              color: t.heading.color,
            },
            paragraph: {
              spacing: { before: this.gap(t.heading.before), after: this.gap(2), line: 240, lineRule: d.LineRuleType.AUTO },
              keepNext: true,
              keepLines: true,
              ...(headingRule
                ? { border: { bottom: { style: d.BorderStyle.SINGLE, size: headingRule.size, color: headingRule.color, space: headingRule.space } } }
                : {}),
            },
          },
          heading2: {
            run: { font: t.bodyFont, size: this.size(10.5), bold: true, color: WORD_COLORS.text },
            paragraph: { spacing: { before: 0, after: 0 }, keepNext: true, keepLines: true },
          },
        },
      },
      numbering: {
        config: [
          {
            reference: BULLETS,
            levels: [
              {
                level: 0,
                format: d.LevelFormat.BULLET,
                text: "•",
                alignment: d.AlignmentType.LEFT,
                style: {
                  paragraph: { indent: { left: twips(4.5), hanging: twips(3) } },
                  run: { color: t.bulletColor },
                },
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: A4.width, height: A4.height, orientation: d.PageOrientation.PORTRAIT },
              margin: {
                top: twips(margin.y),
                bottom: twips(margin.y),
                left: twips(margin.x),
                right: twips(margin.x),
                header: twips(Math.min(8, margin.y)),
                footer: twips(Math.min(8, margin.y)),
              },
            },
          },
          // Word expects at least one paragraph in the body.
          children: children.length > 0 ? children : [new d.Paragraph({})],
        },
      ],
    });
  }
}

/** Builds the Word document object (exported for tests; most callers want exportDocx). */
export function buildWordDocument(docx: DocxModule, doc: AnyDoc): Docx.Document {
  return new WordWriter(docx, buildDocModel(doc)).document();
}

/** The document as a .docx file. Loads the `docx` package on first use. */
export async function exportDocx(doc: AnyDoc): Promise<Blob> {
  const docx = await import("docx");
  const blob = await docx.Packer.toBlob(buildWordDocument(docx, doc));
  return blob.type === DOCX_MIME ? blob : new Blob([blob], { type: DOCX_MIME });
}
