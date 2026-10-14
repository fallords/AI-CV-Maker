import { writeFileSync } from "node:fs";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { sampleCV } from "@/lib/sample-cv";
import { editorTab, expectSaved, fullNameField, pdfText, seedCV } from "./helpers";

async function printedText(page: Page, testInfo: TestInfo, name: string): Promise<string | null> {
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const file = testInfo.outputPath(name);
  writeFileSync(file, pdf);
  const text = pdfText(file);
  return text === null ? null : text.replace(/\s+/g, " ");
}

test("new sections and a custom section appear in the preview and the PDF, and hiding one removes it", async ({
  page,
}, testInfo) => {
  await seedCV(page, sampleCV("ats-minimal"));
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  const preview = page.getByRole("document", { name: "CV preview" });

  // A language.
  await page.getByRole("button", { name: "Add language" }).click();
  const language = page.locator("#languages li").first();
  await language.getByLabel("Language", { exact: true }).fill("Japanese");
  await language.getByLabel("Proficiency (optional)").selectOption("conversational");

  // An organisation.
  await page.getByRole("button", { name: "Add organisation" }).click();
  const org = page.locator("#organizations li").first();
  await org.getByLabel("Role", { exact: true }).fill("Treasurer");
  await org.getByLabel("Organisation", { exact: true }).fill("Example Student Union");
  await org.getByLabel("Start date: Year").selectOption("2019");
  await org.getByLabel("End date: Year").selectOption("2020");

  // A custom section with one entry.
  await page.getByRole("button", { name: "Add custom section" }).click();
  const addDialog = page.getByRole("dialog", { name: "Add a custom section" });
  await addDialog.getByLabel("Section title").fill("Publications");
  await addDialog.getByRole("button", { name: "Add section" }).click();
  await expect(addDialog).toBeHidden();
  // The new section's first entry is ready to fill in.
  const entryTitle = page.getByRole("textbox", { name: "Title", exact: true });
  await expect(entryTitle).toBeFocused();
  await entryTitle.fill("Open Data in Small Cities");
  await page.getByLabel("Subtitle").fill("Example Journal of Civic Data");

  await expect(preview.getByRole("heading", { name: "Languages" })).toBeVisible();
  await expect(preview).toContainText("Japanese");
  await expect(preview).toContainText("Conversational");
  await expect(preview.getByRole("heading", { name: "Organizations & Volunteering" })).toBeVisible();
  await expect(preview).toContainText("Treasurer");
  await expect(preview).toContainText("Example Student Union");
  await expect(preview.getByRole("heading", { name: "Publications" })).toBeVisible();
  await expect(preview).toContainText("Open Data in Small Cities");
  await expectSaved(page);

  let text = await printedText(page, testInfo, "sections.pdf");
  test.skip(text === null, "pdftotext not installed");
  for (const s of [
    "Japanese",
    "Conversational",
    "Treasurer",
    "Example Student Union",
    "Open Data in Small Cities",
    "Example Journal of Civic Data",
  ]) {
    expect(text).toContain(s);
  }
  for (const h of ["LANGUAGES", "ORGANIZATIONS & VOLUNTEERING", "PUBLICATIONS"]) expect(text!.toUpperCase()).toContain(h);

  // Hiding sections in the Design tab removes them from the preview and the PDF, but keeps the content.
  await editorTab(page, "Design");
  const manager = page.getByTestId("section-manager");
  for (const name of ["Organisations & volunteering", "Publications"]) {
    const toggle = manager.getByRole("button", { name: `Show ${name}` });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  }
  await expect(preview).not.toContainText("Example Student Union");
  await expect(preview).not.toContainText("Open Data in Small Cities");
  await expect(preview).toContainText("Japanese");
  await expectSaved(page);

  text = await printedText(page, testInfo, "sections-hidden.pdf");
  expect(text).not.toContain("Example Student Union");
  expect(text).not.toContain("Open Data in Small Cities");
  expect(text!.toUpperCase()).not.toContain("PUBLICATIONS");
  expect(text).toContain("Japanese");
  expect(text).toContain("Example Logistics Co.");

  // The hidden sections keep what was written, and say so in the form.
  await editorTab(page, "Content");
  await expect(page.locator("#organizations").getByTestId("section-hidden-note")).toBeVisible();
  await expect(page.locator("#organizations li").first().getByLabel("Role", { exact: true })).toHaveValue("Treasurer");

  // After a reload the choices are still there.
  await page.reload();
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  await expect(preview).toContainText("Japanese");
  await expect(preview).not.toContainText("Example Student Union");
  await editorTab(page, "Design");
  await expect(page.getByTestId("section-manager").getByRole("button", { name: "Show Publications" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
