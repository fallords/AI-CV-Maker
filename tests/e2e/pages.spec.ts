import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { sampleCV } from "@/lib/sample-cv";
import { seedDraft } from "./helpers";

for (const path of ["/", "/builder/", "/help/", "/privacy/"]) {
  test(`no detectable accessibility violations on ${path}`, async ({ page }) => {
    if (path === "/builder/") await seedDraft(page, sampleCV());
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    if (path === "/builder/") await expect(page.getByLabel(/Full name/)).toHaveValue("Alex Example");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test("interface language switch to Indonesian persists and leaves CV content alone", async ({ page }) => {
  await seedDraft(page, sampleCV());
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
  await expect(page.getByRole("link", { name: "Buat CV Gratis Anda" }).first()).toBeVisible();
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
});

test("privacy page erases all locally stored data after confirmation", async ({ page }) => {
  await seedDraft(page, sampleCV());
  await page.goto("/builder/");
  await expect(page.getByLabel(/Full name/)).toHaveValue("Alex Example");
  await page.goto("/privacy/");
  await page.getByRole("button", { name: "Erase all locally stored data" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Erase everything" }).click();
  await expect(page.getByText("All locally stored data was erased.")).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("free-cv-maker:")));
  expect(keys).toEqual([]);
});

test("recovers gracefully from a corrupted draft", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("free-cv-maker:draft", "{corrupted");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/builder/");
  await expect(page.getByRole("alert").filter({ hasText: "could not be read" })).toBeVisible();
  await expect(page.getByLabel(/Full name/)).toHaveValue("");
  expect(await page.evaluate(() => localStorage.getItem("free-cv-maker:corrupted"))).toBe("{corrupted");
});
