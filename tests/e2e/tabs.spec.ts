import { writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { serializeDocument } from "@/lib/cv-validation";
import { sampleCV } from "@/lib/sample-cv";
import { DOC_KEY, fullNameField, openDocuments, seedCV } from "./helpers";

const DOC_ID = "seededcv";
const titleField = (page: Page) => page.locator("#personal").getByLabel("Professional title");

/** The professional title in the stored copy of the seeded document. */
async function storedTitle(page: Page): Promise<string> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), DOC_KEY(DOC_ID));
  return raw ? JSON.parse(raw).data.personal.title : "";
}

test("two tabs with the same document never overwrite each other silently", async ({ context }) => {
  const one = await context.newPage();
  // Only the first tab seeds: both tabs share this origin's localStorage.
  await seedCV(one, sampleCV(), "Alex Example", DOC_ID);
  await one.goto("/builder/");
  await expect(titleField(one)).toHaveValue("Data Analyst");
  const two = await context.newPage();
  await two.goto("/builder/");
  await expect(titleField(two)).toHaveValue("Data Analyst");

  // A save in tab one shows up in tab two, which has no unsaved changes.
  await titleField(one).fill("Title from tab one");
  await expect.poll(() => storedTitle(one)).toBe("Title from tab one");
  await expect(titleField(two)).toHaveValue("Title from tab one");
  await expect(two.getByTestId("conflict-notice")).toHaveCount(0);

  // Tab two has unsaved changes when tab one saves again: tab two doesn't overwrite it.
  await titleField(two).fill("Title from tab two");
  await one.getByRole("button", { name: "Save", exact: true }).click();
  const conflict = two.getByTestId("conflict-notice");
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText("“Alex Example” was changed in another tab or window");
  await two.waitForTimeout(1000); // longer than the autosave delay
  expect(await storedTitle(two)).toBe("Title from tab one");
  await expect(two.getByTestId("save-status")).toContainText("Not saved");

  // "Keep mine" saves tab two's version, and the idle tab one follows.
  await conflict.getByRole("button", { name: "Keep mine" }).click();
  await expect(conflict).toBeHidden();
  await expect.poll(() => storedTitle(two)).toBe("Title from tab two");
  await expect(titleField(one)).toHaveValue("Title from tab two");

  // Same again, this time loading the other tab's version.
  await fullNameField(two).fill("Name from tab two");
  await titleField(one).fill("Newer title from tab one");
  await one.getByRole("button", { name: "Save", exact: true }).click();
  await expect(conflict).toBeVisible();
  await conflict.getByRole("button", { name: "Load the newer version" }).click();
  await expect(titleField(two)).toHaveValue("Newer title from tab one");
  await expect(fullNameField(two)).toHaveValue("Alex Example");
  await expect(two.getByText("The newer version of “Alex Example” is open.")).toBeVisible();
  await two.waitForTimeout(1000);
  expect(await storedTitle(two)).toBe("Newer title from tab one");
});

test("without browser storage, imported and new documents still open (unsaved)", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Site data is blocked", "SecurityError");
      },
    });
  });
  await page.goto("/builder/");
  await expect(page.getByTestId("save-status")).toContainText("Browser storage isn’t available");

  const file = testInfo.outputPath("backup.json");
  writeFileSync(file, serializeDocument({ kind: "cv", data: sampleCV("graduate") }));
  let dialog = await openDocuments(page);
  await expect(dialog).toContainText("documents can’t be saved or listed here");
  const chooser = page.waitForEvent("filechooser");
  await dialog.getByRole("button", { name: "Import file" }).click();
  await (await chooser).setFiles(file);
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  await expect(page.getByLabel("Template")).toHaveValue("graduate");

  // Replacing it asks first; "Open anyway" starts the new CV.
  dialog = await openDocuments(page);
  await dialog.getByRole("button", { name: "New CV" }).click();
  const confirm = page.getByRole("dialog", { name: "Discard unsaved changes?" });
  await expect(confirm).toContainText("isn’t saved anywhere");
  await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
  await confirm.getByRole("button", { name: "Open anyway (discard unsaved changes)" }).click();
  await expect(fullNameField(page)).toHaveValue("");
  await expect(page.getByText("New CV created.")).toBeVisible();
});
