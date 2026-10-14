/**
 * Plain text export: the document as ATS-friendly text for pasting into online
 * application forms. No formatting, one item per line:
 *
 *   - CV: name, title, contact line, then each visible section in the user's order with
 *     an UPPERCASE heading; entries as title, details line ("Company | City | Dates"),
 *     description lines and "- " bullets; skills and other lists on labelled lines.
 *   - Letter: sender block, date, recipient, subject, greeting, paragraphs, closing and
 *     signature, separated by blank lines.
 *
 * Lines end with "\n" (no CRLF); the text ends with a single newline.
 */

import type { AnyDoc } from "../documents";
import { buildDocModel, type CVModel, type EntryModel, type HeaderModel, type LetterModel, type Part, type SectionContent, type TextBlock } from "./model";

/** Separator between parts on one line (contact details, entry details). */
export const TEXT_SEPARATOR = " | ";

function partText(part: Part): string {
  return part.label ? `${part.label}: ${part.text}` : part.text;
}

function joinParts(parts: Part[]): string {
  return parts.map(partText).filter(Boolean).join(TEXT_SEPARATOR);
}

function blockLines(blocks: TextBlock[]): string[] {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.kind === "p") lines.push(b.text);
    else for (const item of b.items) lines.push(`- ${item}`);
  }
  return lines;
}

function headerLines(h: HeaderModel): string[] {
  const contact = joinParts(h.contact);
  return [h.name, h.title, contact].filter(Boolean);
}

function entryLines(e: EntryModel): string[] {
  const lines: string[] = [];
  if (e.title) lines.push(e.title);
  const details = [...e.sub, e.date].filter(Boolean).join(TEXT_SEPARATOR);
  if (details) lines.push(details);
  lines.push(...blockLines(e.body));
  for (const meta of e.meta) {
    const line = joinParts(meta);
    if (line) lines.push(line);
  }
  return lines;
}

/** Each inner array is a group of lines; groups are separated by a blank line. */
function contentGroups(content: SectionContent): string[][] {
  switch (content.kind) {
    case "blocks":
      return [blockLines(content.blocks)];
    case "entries":
      return content.entries.map(entryLines);
    case "groups":
      return [content.groups.map((g) => `${g.label}: ${g.items.join(", ")}`)];
    case "tags":
      return [[content.items.join(", ")]];
  }
}

function cvText(model: CVModel): string[][] {
  const out: string[][] = [headerLines(model.header)];
  const locale = model.language === "id" ? "id-ID" : "en-US";
  for (const section of model.sections) {
    const groups = contentGroups(section.content).filter((g) => g.length > 0);
    if (groups.length === 0) continue;
    const [first, ...rest] = groups;
    out.push([section.title.toLocaleUpperCase(locale), ...first], ...rest);
  }
  return out;
}

function letterText(model: LetterModel): string[][] {
  const out: string[][] = [headerLines(model.header)];
  if (model.date) out.push([model.date]);
  if (model.recipient.length > 0) out.push(model.recipient);
  if (model.subject) out.push([`${model.subject.label} ${model.subject.text}`]);
  if (model.greeting) out.push([model.greeting]);
  for (const p of model.paragraphs) out.push(p.split("\n"));
  // The closing and the typed name go on separate lines with a blank line between them,
  // as in a printed letter.
  if (model.closing) out.push([model.closing]);
  if (model.signature) out.push([model.signature]);
  return out;
}

/** The document as plain text (UTF-8 string, "\n" line endings, trailing newline). */
export function exportText(doc: AnyDoc): string {
  const model = buildDocModel(doc);
  const groups = model.kind === "cv" ? cvText(model) : letterText(model);
  const text = groups
    .map((lines) => lines.map((line) => line.replace(/[ \t]+$/g, "")).filter((line) => line.trim() !== ""))
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join("\n"))
    .join("\n\n");
  return text ? `${text}\n` : "";
}
