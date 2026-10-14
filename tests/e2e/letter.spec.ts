import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { sampleCV } from "@/lib/sample-cv";
import { expectSaved, fullNameField, openDocuments, pdfPageCount, pdfText, seedCV, storedIndex, stubPrint } from "./helpers";

const SUBJECT = "Application for the Junior Data Analyst position";
const PARAGRAPH_1 = "I would like to apply for the Junior Data Analyst position at Example Analytics Ltd.";
const PARAGRAPH_2 = "At Example Logistics Co. I build weekly dashboards and automate SQL reports.";

test("cover letter: create from a CV, write it, preview it and print it", async ({ page }, testInfo) => {
  await stubPrint(page);
  await seedCV(page, sampleCV("modern-professional"), "Alex Example");
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");

  // New cover letter, with the sender details copied from the CV.
  const dialog = await openDocuments(page);
  await dialog.getByRole("button", { name: "New cover letter" }).click();
  const setup = dialog.getByTestId("new-letter-setup");
  await expect(setup.getByLabel("Copy your details from")).toHaveValue(/.+/);
  await expect(setup.getByLabel("Copy your details from").locator("option:checked")).toHaveText("Alex Example");
  await setup.getByRole("button", { name: "Create cover letter" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("New cover letter created with your details from “Alex Example”.")).toBeVisible();

  const switcher = page.getByTestId("document-switcher");
  await expect(switcher).toContainText("Cover letter");
  // A letter has Content and Design tabs, and no Check tab.
  const tabs = page.getByRole("tablist", { name: "Editor" });
  await expect(tabs.getByRole("tab")).toHaveText(["Content", "Design"]);
  await expect(page.getByLabel("Letter language")).toHaveValue("en");
  await expect(page.getByLabel("Template")).toHaveValue("modern-professional");

  const sender = page.locator("#letter-sender");
  await expect(sender.getByLabel("Full name")).toHaveValue("Alex Example");
  await expect(sender.getByLabel("Email")).toHaveValue("alex@example.com");

  // Write the letter.
  const recipient = page.locator("#letter-recipient");
  await recipient.getByLabel("Name", { exact: true }).fill("Jordan Sample");
  await recipient.getByLabel("Company or organisation").fill("Example Analytics Ltd.");
  await page.locator("#letter-date").getByLabel("Subject").fill(SUBJECT);
  const content = page.locator("#letter-content");
  await content.getByLabel("Greeting").fill("Dear Jordan Sample,");
  await content.getByLabel("Main text").fill(`${PARAGRAPH_1}\n\n${PARAGRAPH_2}`);
  await expectSaved(page);
  await expect(switcher).toContainText("Cover letter – Example Analytics Ltd.");

  // The preview shows it in the CV's look.
  const preview = page.getByRole("document", { name: "Cover letter preview" });
  await expect(preview.locator(".cv-doc")).toHaveClass(/tpl-modern/);
  const shown = [
    "Alex Example",
    "Jordan Sample",
    "Example Analytics Ltd.",
    `Subject: ${SUBJECT}`,
    PARAGRAPH_1,
    PARAGRAPH_2,
    "Kind regards,",
  ];
  for (const s of shown) {
    await expect(preview).toContainText(s);
  }
  await expect(preview.locator("p", { hasText: PARAGRAPH_2 })).toHaveCount(1);

  // Download PDF → instructions for a letter → print dialog.
  await page.getByRole("button", { name: "Download PDF" }).click();
  const printDialog = page.getByRole("dialog", { name: "Download your cover letter as PDF" });
  await printDialog.getByRole("button", { name: "Open print dialog" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __prints: number }).__prints)).toBe(1);

  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const file = testInfo.outputPath("letter.pdf");
  writeFileSync(file, pdf);
  expect(pdfPageCount(pdf)).toBe(1);
  const text = pdfText(file);
  test.skip(text === null, "pdftotext not installed");
  const flat = text!.replace(/\s+/g, " ");
  const printed = [
    "Alex Example",
    "alex@example.com",
    "Jordan Sample",
    "Example Analytics Ltd.",
    SUBJECT,
    PARAGRAPH_1,
    PARAGRAPH_2,
    "Kind regards,",
  ];
  for (const s of printed) {
    expect(flat).toContain(s);
  }
  for (const ui of ["Download PDF", "Main text", "Your details", "Free AI CV Maker"]) expect(flat).not.toContain(ui);

  // Both documents are kept, and the letter reopens after a reload.
  const index = await storedIndex(page);
  expect(index.map((m) => `${m.kind}:${m.name}`).sort()).toEqual([
    "cv:Alex Example",
    "letter:Cover letter – Example Analytics Ltd.",
  ]);
  await page.reload();
  await expect(page.locator("#letter-content").getByLabel("Main text")).toHaveValue(`${PARAGRAPH_1}\n\n${PARAGRAPH_2}`);
  await expect(page.getByRole("document", { name: "Cover letter preview" })).toContainText(SUBJECT);
});
