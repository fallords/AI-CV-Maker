import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { sampleCV } from "@/lib/sample-cv";
import {
  editorTab,
  expectSaved,
  fullNameField,
  mmToPt,
  pdfFonts,
  pdfPageCount,
  pdfText,
  pdfWordX,
  seedCV,
} from "./helpers";

const BURGUNDY = "rgb(122, 31, 43)"; // #7a1f2b
const MODERN_GREEN = "rgb(36, 87, 64)"; // #245740

test("accent colour, font and margins show in the preview and the PDF", async ({ page }, testInfo) => {
  await seedCV(page, sampleCV("modern-professional"));
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  const preview = page.getByRole("document", { name: "CV preview" });
  const doc = preview.locator(".cv-doc");
  const heading = doc.locator(".cv-heading").first();
  const printDoc = page.locator("#cv-print-root .cv-doc");

  // Template defaults first.
  await expect(heading).toHaveCSS("color", MODERN_GREEN);
  const paddingLeft = () => doc.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
  expect(await paddingLeft()).toBeCloseTo((16 * 96) / 25.4, 1);

  await editorTab(page, "Design");
  const panel = page.getByTestId("design-panel");

  await panel.getByRole("radio", { name: "Burgundy" }).check();
  await expect(heading).toHaveCSS("color", BURGUNDY);
  await expect(printDoc.locator(".cv-heading").first()).toHaveCSS("color", BURGUNDY);

  await panel.getByRole("radio", { name: "IBM Plex Serif" }).check();
  await expect(doc).toHaveCSS("font-family", /IBM Plex Serif/);
  await expect(doc.locator(".cv-name")).toHaveCSS("font-family", /IBM Plex Serif/);

  // Text size, spacing and margins are visually hidden radios inside their labels.
  const wide = panel.getByRole("radio", { name: /^Wide/ });
  await panel.locator("label", { has: page.getByRole("radio", { name: /^Wide/ }) }).click();
  await expect(wide).toBeChecked();
  const widePx = (20 * 96) / 25.4; // 75.59px
  await expect.poll(paddingLeft).toBeCloseTo(widePx, 1);
  await expectSaved(page);

  // The PDF has the same look: same content, the chosen font embedded, wider margins.
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const file = testInfo.outputPath("design.pdf");
  writeFileSync(file, pdf);
  const pages = pdfPageCount(pdf);
  expect(pages).toBeGreaterThanOrEqual(1);
  expect(pages).toBeLessThanOrEqual(2);
  const text = pdfText(file);
  test.skip(text === null, "poppler-utils not installed");
  const flat = text!.replace(/\s+/g, " ");
  const cv = sampleCV();
  for (const e of cv.experience) expect(flat).toContain(e.company);
  for (const h of ["WORK EXPERIENCE", "EDUCATION", "SKILLS"]) expect(flat.toUpperCase()).toContain(h);
  expect(pdfFonts(file)!.some((f) => /IBMPlexSerif/i.test(f))).toBe(true);
  const nameX = pdfWordX(file, "Alex");
  expect(nameX).not.toBeNull();
  expect(nameX!).toBeGreaterThan(mmToPt(20) - 2);
  expect(nameX!).toBeLessThan(mmToPt(20) + 6);

  // The settings are kept with the document.
  await page.reload();
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  await expect(heading).toHaveCSS("color", BURGUNDY);
  await editorTab(page, "Design");
  await expect(page.getByRole("radio", { name: "Burgundy" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "IBM Plex Serif" })).toBeChecked();
  await expect(page.getByRole("radio", { name: /^Wide/ })).toBeChecked();

  // Reset brings the template's look back.
  await page.getByRole("button", { name: "Reset appearance" }).click();
  await expect(heading).toHaveCSS("color", MODERN_GREEN);
  await expect.poll(paddingLeft).toBeCloseTo((16 * 96) / 25.4, 1);
});

test("a custom accent colour that is too light shows a contrast warning", async ({ page }) => {
  await seedCV(page, sampleCV("ats-minimal"));
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  await editorTab(page, "Design");
  await page.getByRole("radio", { name: "Custom colour" }).check();
  const code = page.getByLabel("Colour code");
  await code.fill("#dddddd");
  await code.press("Enter");
  await expect(page.getByTestId("contrast-warning")).toBeVisible();
  await expect(page.getByRole("document", { name: "CV preview" }).locator(".cv-name")).toHaveCSS(
    "color",
    "rgb(221, 221, 221)",
  );
  // The checker points at it too.
  await editorTab(page, "Check");
  await page.locator('[data-check-id="lowContrast:design"]').click();
  await expect(page.getByRole("tab", { name: "Design" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Design" })).toBeFocused();
});
