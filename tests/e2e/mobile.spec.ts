import { expect, test, type Page } from "@playwright/test";
import { richSampleCV, sampleCV, sampleLetter } from "@/lib/sample-cv";
import { editorTab, fullNameField, openDocuments, seedCV, seedDocs } from "./helpers";

async function expectNoOverflow(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `horizontal overflow on ${where}`).toBeLessThanOrEqual(0);
}

test("mobile builder uses Edit/Preview tabs and does not scroll horizontally", async ({ page }) => {
  await seedCV(page, sampleCV());
  await page.goto("/builder/");
  const editTab = page.getByRole("tab", { name: "Edit" });
  const previewTab = page.getByRole("tab", { name: "Preview" });
  await expect(editTab).toHaveAttribute("aria-selected", "true");
  await expect(fullNameField(page)).toBeVisible();
  await expect(page.getByRole("document", { name: "CV preview" })).toBeHidden();

  await previewTab.click();
  await expect(page.getByRole("document", { name: "CV preview" })).toBeVisible();
  await expect(fullNameField(page)).toBeHidden();

  for (const path of ["/", "/builder/", "/help/", "/privacy/"]) {
    await page.goto(path);
    await expectNoOverflow(page, path);
  }
});

test("mobile touch targets for primary actions are at least 40px tall", async ({ page }) => {
  await page.goto("/builder/");
  for (const name of ["Download PDF", "Save draft", "Add work experience"]) {
    const box = await page.getByRole("button", { name }).boundingBox();
    expect(box!.height, name).toBeGreaterThanOrEqual(40);
  }
  const box = await page.getByTestId("document-switcher").boundingBox();
  expect(box!.height, "document switcher").toBeGreaterThanOrEqual(40);
});

for (const width of [412, 360]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test("pages, editor tabs, dialogs and letters fit the screen", async ({ page }) => {
      await seedDocs(page, [
        { id: "cv1", doc: { kind: "cv", data: richSampleCV("graduate") }, name: "Alex Example" },
        { id: "letter1", doc: { kind: "letter", data: sampleLetter() }, name: "Cover letter – Example Analytics Ltd." },
      ]);
      for (const path of ["/", "/help/", "/privacy/"]) {
        await page.goto(path);
        await expectNoOverflow(page, path);
      }

      await page.goto("/builder/");
      await expect(fullNameField(page)).toHaveValue("Alex Example");
      await expectNoOverflow(page, "builder: content");
      await editorTab(page, "Design");
      await expect(page.getByTestId("section-manager")).toBeVisible();
      await page.getByRole("radio", { name: "Custom colour" }).check();
      await expectNoOverflow(page, "builder: design");
      await editorTab(page, "Check");
      await expect(page.getByTestId("checks-panel")).toBeVisible();
      await expectNoOverflow(page, "builder: check");

      await page.getByRole("button", { name: "Other download formats" }).click();
      const menu = page.getByRole("group", { name: "Download formats" });
      const menuBox = (await menu.boundingBox())!;
      expect(menuBox.x).toBeGreaterThanOrEqual(0);
      expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");

      const dialog = await openDocuments(page);
      await expectNoOverflow(page, "documents dialog");
      const dialogBox = (await dialog.boundingBox())!;
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(width);
      await dialog.getByRole("button", { name: /^Open: Cover letter/ }).click();
      await expect(page.locator("#letter-sender").getByLabel("Full name")).toHaveValue("Alex Example");
      await expectNoOverflow(page, "builder: letter");

      await page.getByRole("tab", { name: "Preview" }).click();
      await expect(page.getByRole("document", { name: "Cover letter preview" })).toBeVisible();
      await expectNoOverflow(page, "builder: letter preview");
    });
  });
}
