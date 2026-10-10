import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import type { CVData } from "@/lib/cv-schema";
import { sampleCV } from "@/lib/sample-cv";

export const DRAFT_KEY = "free-cv-maker:draft";

/** Puts a draft into localStorage before any app script runs. */
export async function seedDraft(page: Page, cv: CVData) {
  const payload = JSON.stringify({ schemaVersion: 1, savedAt: new Date().toISOString(), data: cv });
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [DRAFT_KEY, payload],
  );
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
