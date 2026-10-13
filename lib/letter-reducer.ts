/** Pure state transitions for the cover letter editor (unit-tested in tests/unit/letter.test.ts). */

import { sanitizeStyle, type DocStyle } from "./doc-style";
import type { LetterData } from "./letter-schema";

export type LetterField = "date" | "subject" | "greeting" | "body" | "closing" | "signature";

export type LetterAction =
  | { type: "replace"; data: LetterData }
  | { type: "setMeta"; patch: Partial<LetterData["meta"]> }
  | { type: "setStyle"; patch: Partial<DocStyle> }
  | { type: "setSender"; patch: Partial<LetterData["sender"]> }
  | { type: "setRecipient"; patch: Partial<LetterData["recipient"]> }
  | { type: "setField"; field: LetterField; value: string };

const FIELDS: readonly LetterField[] = ["date", "subject", "greeting", "body", "closing", "signature"];

export function letterReducer(l: LetterData, a: LetterAction): LetterData {
  switch (a.type) {
    case "replace":
      return a.data;
    case "setMeta":
      return { ...l, meta: { ...l.meta, ...a.patch } };
    case "setStyle":
      // Invalid values (e.g. a malformed colour) fall back to the defaults.
      return { ...l, meta: { ...l.meta, style: sanitizeStyle({ ...l.meta.style, ...a.patch }) } };
    case "setSender":
      return { ...l, sender: { ...l.sender, ...a.patch } };
    case "setRecipient":
      return { ...l, recipient: { ...l.recipient, ...a.patch } };
    case "setField":
      if (!FIELDS.includes(a.field)) return l;
      return { ...l, [a.field]: a.value };
    default:
      return l;
  }
}
