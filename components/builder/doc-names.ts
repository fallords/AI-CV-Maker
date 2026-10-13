import type { Language } from "@/lib/cv-schema";
import { defaultDocName, MAX_DOC_NAME, type AnyDoc } from "@/lib/documents";
import { fmt } from "@/lib/i18n";

const LANGS: readonly Language[] = ["en", "id"];

/**
 * Documents keep following their content while they still carry the automatic name
 * (e.g. "Untitled CV" becomes "Jane Doe" once the name is typed). Returns the new name
 * when `currentName` is the automatic name of `previous` and `next` has a different one;
 * null once the person has picked their own name, or when nothing changed.
 */
export function followingName(currentName: string, previous: AnyDoc, next: AnyDoc, uiLang: Language): string | null {
  if (previous.kind !== next.kind) return null;
  const order = [uiLang, ...LANGS.filter((l) => l !== uiLang)];
  for (const lang of order) {
    if (currentName !== defaultDocName(previous, lang)) continue;
    const name = defaultDocName(next, lang);
    return name && name !== currentName ? name : null;
  }
  return null;
}

/** Name for a duplicate, e.g. "Jane Doe (copy)", shortened so it fits the name limit. */
export function copyName(name: string, template: string): string {
  const suffix = fmt(template, { name: "" });
  const room = Math.max(1, MAX_DOC_NAME - suffix.length);
  const base = name.length > room ? `${name.slice(0, room - 1).trimEnd()}…` : name;
  return fmt(template, { name: base });
}
