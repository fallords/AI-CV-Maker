import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { richSampleCV, sampleCV, sampleLetter } from "@/lib/sample-cv";
import { editorTab, fullNameField, openDocuments, seedCV, seedDocs } from "./helpers";

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

for (const path of ["/", "/builder/", "/help/", "/privacy/"]) {
  test(`no detectable accessibility violations on ${path}`, async ({ page }) => {
    if (path === "/builder/") await seedCV(page, sampleCV());
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    if (path === "/builder/") await expect(fullNameField(page)).toHaveValue("Alex Example");
    await expectNoAxeViolations(page);
  });
}

test("no detectable accessibility violations in the builder's Design and Check tabs and dialogs", async ({ page }) => {
  const cv = richSampleCV("graduate");
  cv.personal.phone = "";
  cv.experience[1] = { ...cv.experience[1], startDate: "", endDate: "", current: false };
  cv.meta.hiddenSections = ["interests"];
  await seedCV(page, cv);
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  // The whole form, including the new sections and a hidden one.
  await expectNoAxeViolations(page);

  await editorTab(page, "Design");
  await expect(page.getByTestId("section-manager")).toBeVisible();
  await page.getByRole("radio", { name: "Custom colour" }).check();
  await expectNoAxeViolations(page);

  await editorTab(page, "Check");
  await expect(page.getByTestId("checks-panel").getByRole("meter")).toBeVisible();
  await expectNoAxeViolations(page);

  const dialog = await openDocuments(page);
  await dialog.getByRole("button", { name: "New cover letter" }).click();
  await expect(dialog.getByTestId("new-letter-setup")).toBeVisible();
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Other download formats" }).click();
  await expect(page.getByRole("group", { name: "Download formats" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("no detectable accessibility violations with a cover letter open", async ({ page }) => {
  await seedDocs(page, [
    { id: "letter1", doc: { kind: "letter", data: sampleLetter("modern-professional") }, name: "Letter" },
    { id: "cv1", doc: { kind: "cv", data: sampleCV() }, name: "Alex Example" },
  ]);
  await page.goto("/builder/");
  await expect(page.getByRole("document", { name: "Cover letter preview" })).toBeVisible();
  await expect(page.locator("#letter-sender").getByLabel("Full name")).toHaveValue("Alex Example");
  await expectNoAxeViolations(page);
  await editorTab(page, "Design");
  await expect(page.getByTestId("design-panel")).toBeVisible();
  await expectNoAxeViolations(page);
});

test("interface language switch to Indonesian persists and leaves CV content alone", async ({ page }) => {
  await seedCV(page, sampleCV());
  await page.goto("/builder/");
  await page.getByRole("button", { name: "Bahasa Indonesia" }).click();
  await expect(page.getByRole("button", { name: "Unduh PDF" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(page.getByLabel(/Nama lengkap/)).toHaveValue("Alex Example");
  // CV headings follow the CV language (still English) until the user changes it.
  const preview = page.getByRole("document", { name: "Pratinjau CV" });
  await expect(preview.getByRole("heading", { name: "Work Experience" })).toBeVisible();
  await page.getByLabel("Bahasa CV").selectOption("id");
  await expect(preview.getByRole("heading", { name: "Pengalaman Kerja" })).toBeVisible();
  await expect(preview).toContainText("Maintain weekly delivery-performance dashboards");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Buat CV gratis" }).first()).toBeVisible();
});

test("keyboard users can reach and operate the main controls", async ({ page }) => {
  await page.goto("/builder/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.getByRole("button", { name: "Add work experience" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#experience li").first().getByLabel("Job title")).toBeFocused();
  await page.keyboard.type("Keyboard Job");
  await expect(page.getByRole("document", { name: "CV preview" })).toContainText("Keyboard Job");

  // The editor tabs work with the arrow keys.
  await page.getByRole("tab", { name: "Content" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Design" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Design" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("design-panel")).toBeVisible();
});

test("privacy page erases all locally stored data after confirmation", async ({ page }) => {
  await seedDocs(page, [
    { id: "cv1", doc: { kind: "cv", data: sampleCV() }, name: "Alex Example" },
    { id: "letter1", doc: { kind: "letter", data: sampleLetter() }, name: "Letter" },
  ]);
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  await page.goto("/privacy/");
  await page.getByRole("button", { name: "Erase all locally stored data" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Erase everything" }).click();
  await expect(page.getByText("All locally stored data was erased.")).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("free-cv-maker:")));
  expect(keys).toEqual([]);
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("");
});

test("the landing page offers to continue when documents are saved", async ({ page }) => {
  await seedCV(page, sampleCV());
  await page.goto("/");
  await page.getByRole("link", { name: /^Continue/ }).click();
  await expect(page).toHaveURL(/\/builder\/$/);
  await expect(fullNameField(page)).toHaveValue("Alex Example");
});
