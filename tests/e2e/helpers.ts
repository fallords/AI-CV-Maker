import { execFileSync } from "node:child_process";
import { expect, type Download, type Page } from "@playwright/test";
import { CV_SCHEMA_VERSION, type CVData } from "@/lib/cv-schema";
import { LETTER_SCHEMA_VERSION } from "@/lib/letter-schema";
import type { AnyDoc, DocMeta } from "@/lib/documents";
import { sampleCV } from "@/lib/sample-cv";

/* Storage keys (lib/documents.ts, lib/storage.ts). Written out here so a renamed key fails loudly. */
export const DOCS_INDEX_KEY = "free-cv-maker:docs";
export const DOC_KEY = (id: string) => `free-cv-maker:doc:${id}`;
export const ACTIVE_DOC_KEY = "free-cv-maker:active";
/** Keys of the single-draft (v1) version of the app, migrated into documents on load. */
export const DRAFT_KEY = "free-cv-maker:draft";
export const BACKUP_KEY = "free-cv-maker:backup";

/**
 * Writes `entries` to localStorage before any app script runs, on the first page load of
 * the test only, so reloads see what the app saved rather than the seed again.
 */
async function seedOnce(page: Page, entries: [string, string][]) {
  await page.addInitScript((pairs: [string, string][]) => {
    if (sessionStorage.getItem("seeded")) return;
    for (const [key, value] of pairs) localStorage.setItem(key, value);
    sessionStorage.setItem("seeded", "1");
  }, entries);
}

export interface SeedDoc {
  id: string;
  doc: AnyDoc;
  name: string;
  /** ISO time; later means listed first. Defaults to "now minus position". */
  updatedAt?: string;
}

/** Stores documents (and the active one) the way lib/documents.ts does, before the app loads. */
export async function seedDocs(page: Page, docs: SeedDoc[], activeId: string | null = docs[0]?.id ?? null) {
  const now = Date.now();
  const entries: [string, string][] = [];
  const index: DocMeta[] = docs.map((d, i) => {
    const at = d.updatedAt ?? new Date(now - i * 60_000).toISOString();
    return { id: d.id, kind: d.doc.kind, name: d.name, createdAt: at, updatedAt: at };
  });
  docs.forEach((d, i) => {
    const stored = {
      schemaVersion: d.doc.kind === "cv" ? CV_SCHEMA_VERSION : LETTER_SCHEMA_VERSION,
      savedAt: index[i].updatedAt,
      kind: d.doc.kind,
      name: d.name,
      createdAt: index[i].createdAt,
      data: d.doc.data,
    };
    entries.push([DOC_KEY(d.id), JSON.stringify(stored)]);
  });
  entries.push([DOCS_INDEX_KEY, JSON.stringify(index)]);
  if (activeId) entries.push([ACTIVE_DOC_KEY, activeId]);
  await seedOnce(page, entries);
}

/** Stores one CV as the open document. */
export async function seedCV(page: Page, cv: CVData, name = cv.personal.fullName || "Untitled CV", id = "seededcv") {
  await seedDocs(page, [{ id, doc: { kind: "cv", data: cv }, name }]);
}

/**
 * Puts a draft (and optionally a "previous draft") into localStorage in the format of the
 * single-draft version of the app (schema v1), before any app script runs.
 */
export async function seedLegacyDraft(page: Page, cv: CVData, backup?: CVData) {
  const wrap = (data: CVData) => {
    // v1 data had none of the v2 fields.
    const v1 = { ...data, schemaVersion: 1, meta: { template: data.meta.template, cvLanguage: data.meta.cvLanguage } };
    for (const key of ["languages", "organizations", "awards", "references", "interests", "customSections"] as const) {
      delete (v1 as Partial<CVData>)[key];
    }
    return JSON.stringify({ schemaVersion: 1, savedAt: new Date().toISOString(), data: v1 });
  };
  const entries: [string, string][] = [[DRAFT_KEY, wrap(cv)]];
  if (backup) entries.push([BACKUP_KEY, wrap(backup)]);
  await seedOnce(page, entries);
}

/** Every key this app keeps in localStorage, with its value. */
export async function appStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const out: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith("free-cv-maker:")) out[key] = localStorage.getItem(key) ?? "";
    }
    return out;
  });
}

/** The documents index as the app stored it. */
export async function storedIndex(page: Page): Promise<DocMeta[]> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), DOCS_INDEX_KEY);
  return raw ? (JSON.parse(raw) as DocMeta[]) : [];
}

/** The builder's "Full name" field (the CV form's, not the letter's). */
export const fullNameField = (page: Page) => page.locator("#personal").getByLabel(/Full name/);

/** Waits until the save status says everything is stored. */
export async function expectSaved(page: Page) {
  await expect(page.getByTestId("save-status")).toHaveText(/Saved on this device/);
}

/** Opens the "Your documents" dialog from the document switcher. */
export async function openDocuments(page: Page) {
  await page.getByTestId("document-switcher").click();
  const dialog = page.getByRole("dialog", { name: "Your documents" });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Selects an editor tab (Content, Design, Check). */
export async function editorTab(page: Page, name: "Content" | "Design" | "Check") {
  const tab = page.getByRole("tablist", { name: "Editor" }).getByRole("tab", { name: new RegExp(`^${name}`) });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

/** Picks a format from the menu next to "Download PDF" and returns the download. */
export async function downloadAs(
  page: Page,
  format: "Word (.docx)" | "Plain text (.txt)" | "JSON backup",
): Promise<Download> {
  await page.getByRole("button", { name: "All formats" }).click();
  const menu = page.getByRole("group", { name: "Download formats" });
  const pending = page.waitForEvent("download");
  await menu.getByRole("button", { name: format }).click();
  return pending;
}

/** Makes window.print() count calls instead of opening a native dialog. */
export async function stubPrint(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __prints: number }).__prints = 0;
    window.print = () => {
      (window as unknown as { __prints: number }).__prints += 1;
    };
  });
}

/** A long, realistic CV that needs more than one A4 page in every template. */
export function longCV(template: CVData["meta"]["template"]): CVData {
  const cv = sampleCV(template);
  const extra = cv.experience.map((e, i) => ({
    ...e,
    id: `extra${i}`,
    company: `${e.company} (earlier role ${i + 1})`,
    startDate: `201${i}-01`,
    endDate: `201${i}-12`,
    current: false,
  }));
  cv.experience = [...cv.experience, ...extra];
  cv.projects = [
    ...cv.projects,
    {
      id: "prj3",
      name: "Community Data Workshop",
      role: "Co-organiser",
      description: "- Prepared beginner exercises on spreadsheets and SQL\n- Collected participant feedback to improve later sessions",
      technologies: "SQL, Google Sheets",
      url: "",
    },
  ];
  return cv;
}

export function pdfText(file: string, page?: number): string | null {
  try {
    const args = ["-layout", ...(page ? ["-f", String(page), "-l", String(page)] : []), file, "-"];
    return execFileSync("pdftotext", args, { encoding: "utf8" });
  } catch {
    return null; // poppler-utils not installed
  }
}

export function pdfPageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

export async function expectNoExternalRequests(page: Page, origin: string, run: () => Promise<void>) {
  const external: string[] = [];
  const listener = (req: { url: () => string }) => {
    const url = req.url();
    if (!url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:")) external.push(url);
  };
  page.on("request", listener);
  await run();
  page.off("request", listener);
  expect(external, "requests to other origins").toEqual([]);
}

/** Font names embedded in a PDF (pdffonts), or null when poppler-utils isn't installed. */
export function pdfFonts(file: string): string[] | null {
  try {
    const out = execFileSync("pdffonts", [file], { encoding: "utf8" });
    return out
      .split("\n")
      .slice(2)
      .map((line) => line.trim().split(/\s+/)[0])
      .filter(Boolean)
      .map((name) => name.replace(/^[A-Z]{6}\+/, ""));
  } catch {
    return null;
  }
}

/** Left edge (in points) of the first occurrence of `word` on page 1, or null. */
export function pdfWordX(file: string, word: string): number | null {
  try {
    const html = execFileSync("pdftotext", ["-bbox", "-f", "1", "-l", "1", file, "-"], { encoding: "utf8" });
    const m = new RegExp(`<word xMin="([\\d.]+)"[^>]*>${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</word>`).exec(html);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

/** Millimetres to PDF points. */
export const mmToPt = (mm: number) => (mm * 72) / 25.4;
