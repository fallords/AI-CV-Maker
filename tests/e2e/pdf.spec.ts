import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { TEMPLATE_IDS } from "@/lib/cv-schema";
import { longCV, pdfPageCount, pdfText, seedDraft } from "./helpers";

const HEADINGS = ["PROFESSIONAL SUMMARY", "WORK EXPERIENCE", "EDUCATION", "PROJECTS", "SKILLS", "CERTIFICATIONS"];

for (const template of TEMPLATE_IDS) {
  test(`multi-page A4 PDF is complete and well paginated: ${template}`, async ({ page }, testInfo) => {
    const cv = longCV(template);
    await seedDraft(page, cv);
    await page.goto("/builder/");
    await expect(page.getByLabel(/Full name/)).toHaveValue("Alex Example");

    // The preview shows page guides for a multi-page CV.
    await expect(page.getByText(/A4 · [2-9] pages/)).toBeVisible();

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const file = testInfo.outputPath(`${template}.pdf`);
    writeFileSync(file, pdf);
    const pages = pdfPageCount(pdf);
    expect(pages).toBeGreaterThanOrEqual(2);
    expect(pages).toBeLessThanOrEqual(3);

    const text = pdfText(file);
    test.skip(text === null, "pdftotext not installed");
    const flat = text!.replace(/\s+/g, " ");
    for (const e of cv.experience) expect(flat).toContain(e.company);
    for (const e of cv.education) expect(flat).toContain(e.institution);
    for (const p of cv.projects) expect(flat).toContain(p.name);
    for (const c of cv.certifications) expect(flat).toContain(c.name);
    for (const s of cv.technicalSkills) expect(flat).toContain(s.name);
    for (const h of HEADINGS) expect(text!.toUpperCase()).toContain(h);

    for (let n = 1; n <= pages; n++) {
      const lines = (pdfText(file, n) ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
      // No blank pages.
      expect(lines.length, `page ${n} has content`).toBeGreaterThan(3);
      // A section heading never ends a page on its own.
      expect(HEADINGS, `page ${n} does not end with a heading`).not.toContain(lines[lines.length - 1].toUpperCase());
    }
  });
}

test("PDF export does not depend on remote assets", async ({ page, baseURL }) => {
  await seedDraft(page, longCV("modern-professional"));
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(baseURL!) && !r.url().startsWith("data:")) external.push(r.url());
  });
  await page.goto("/builder/");
  await expect(page.getByLabel(/Full name/)).toHaveValue("Alex Example");
  await page.pdf({ preferCSSPageSize: true });
  expect(external).toEqual([]);
});
