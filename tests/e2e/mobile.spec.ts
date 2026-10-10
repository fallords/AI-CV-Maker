import { expect, test } from "@playwright/test";
import { sampleCV } from "@/lib/sample-cv";
import { seedDraft } from "./helpers";

test("mobile builder uses Edit/Preview tabs and does not scroll horizontally", async ({ page }) => {
  await seedDraft(page, sampleCV());
  await page.goto("/builder/");
  const editTab = page.getByRole("tab", { name: "Edit" });
  const previewTab = page.getByRole("tab", { name: "Preview" });
  await expect(editTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel(/Full name/)).toBeVisible();
  await expect(page.getByRole("document", { name: "CV preview" })).toBeHidden();

  await previewTab.click();
  await expect(page.getByRole("document", { name: "CV preview" })).toBeVisible();
  await expect(page.getByLabel(/Full name/)).toBeHidden();

  for (const path of ["/", "/builder/", "/help/", "/privacy/"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});

test("mobile touch targets for primary actions are at least 40px tall", async ({ page }) => {
  await page.goto("/builder/");
  for (const name of ["Download PDF", "Save draft", "Add work experience"]) {
    const box = await page.getByRole("button", { name }).boundingBox();
    expect(box!.height, name).toBeGreaterThanOrEqual(40);
  }
});
