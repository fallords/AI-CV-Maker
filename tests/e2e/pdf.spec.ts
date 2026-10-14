import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { TEMPLATE_IDS } from "@/lib/cv-schema";
import { sampleCV } from "@/lib/sample-cv";
import { longCV, pdfPageCount, pdfText, pdfWordX, seedCV } from "./helpers";

const HEADINGS = ["PROFESSIONAL SUMMARY", "WORK EXPERIENCE", "EDUCATION", "PROJECTS", "SKILLS", "CERTIFICATIONS"];

for (const template of TEMPLATE_IDS) {
  test(`multi-page A4 PDF is complete and well paginated: ${template}`, async ({ page }, testInfo) => {
    const cv = longCV(template);
    await seedCV(page, cv);
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
  await seedCV(page, longCV("modern-professional"));
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(baseURL!) && !r.url().startsWith("data:")) external.push(r.url());
  });
  await page.goto("/builder/");
  await expect(page.getByLabel(/Full name/)).toHaveValue("Alex Example");
  await page.pdf({ preferCSSPageSize: true });
  expect(external).toEqual([]);
});

/** Contact list geometry, in the list's own (unscaled) layout coordinates. */
function contactGeometry(root: string) {
  const ul = document.querySelector<HTMLElement>(`${root} .cv-contact`)!;
  const items = Array.from(ul.children as HTMLCollectionOf<HTMLElement>).map((li) => {
    const sep = getComputedStyle(li, "::before");
    const sepLeft = li.offsetLeft + parseFloat(sep.left);
    return {
      text: li.textContent,
      top: li.offsetTop,
      left: li.offsetLeft,
      right: li.offsetLeft + li.offsetWidth,
      sepLeft,
      sepRight: sepLeft + parseFloat(sep.borderLeftWidth),
    };
  });
  return { overflowX: getComputedStyle(ul).overflowX, clipLeft: ul.offsetLeft + ul.clientLeft, items };
}

for (const template of TEMPLATE_IDS) {
  test(`contact separators sit only between items, on screen and in print: ${template}`, async ({ page }, testInfo) => {
    const cv = sampleCV(template);
    cv.personal.linkedin = "linkedin.com/in/alex-example-with-a-longer-handle";
    cv.personal.website = "portfolio.example.com/projects/data-visualisation";
    await seedCV(page, cv);
    await page.goto("/builder/");
    await expect(page.getByLabel(/Full name/)).toHaveValue("Alex Example");

    for (const [media, root] of [
      ["screen", "[aria-label='CV preview']"],
      ["print", "#cv-print-root"],
    ] as const) {
      await page.emulateMedia({ media });
      // Print layout at the width of an A4 page, as in the PDF.
      if (media === "print") await page.setViewportSize({ width: 794, height: 1123 });
      const g = await page.evaluate(contactGeometry, root);
      expect(g.overflowX, media).toBe("clip");
      const rows = new Set(g.items.map((i) => i.top));
      expect(rows.size, `${media}: the contact details wrap onto a second line`).toBeGreaterThanOrEqual(2);
      g.items.forEach((item, i) => {
        const prev = g.items[i - 1];
        if (!prev || prev.top !== item.top) {
          // First on its line: the separator is clipped away, well clear of the clip edge,
          // so no sub-pixel sliver of it can show.
          expect(item.sepRight, `${media}: ${item.text} starts a line`).toBeLessThanOrEqual(g.clipLeft - 2);
        } else {
          // Between two items, visible, with the same space on both sides.
          expect(item.sepLeft, `${media}: ${item.text}`).toBeGreaterThanOrEqual(prev.right);
          expect(item.sepRight, `${media}: ${item.text}`).toBeLessThanOrEqual(item.left);
          expect(item.sepLeft).toBeGreaterThan(g.clipLeft);
          expect(Math.abs(item.sepLeft - prev.right - (item.left - item.sepRight))).toBeLessThan(1.5);
        }
      });
    }
    // Back to the defaults (page.pdf() uses print media unless screen media is emulated).
    await page.emulateMedia({ media: null });

    // In the PDF both contact lines start exactly under the name.
    const file = testInfo.outputPath(`contact-${template}.pdf`);
    writeFileSync(file, await page.pdf({ preferCSSPageSize: true, printBackground: true }));
    const nameX = pdfWordX(file, "Alex");
    test.skip(nameX === null, "pdftotext not installed");
    expect(Math.abs(pdfWordX(file, "alex@example.com")! - nameX!)).toBeLessThan(0.75);
    expect(Math.abs(pdfWordX(file, cv.personal.linkedin)! - nameX!)).toBeLessThan(0.75);
  });
}
