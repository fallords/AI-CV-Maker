import { expect, test } from "@playwright/test";
import { sampleCV } from "@/lib/sample-cv";
import { appStorage, expectSaved, fullNameField, openDocuments, seedCV, storedIndex } from "./helpers";

test("several CVs: create, switch, rename, duplicate, delete, and keep them after a reload", async ({ page }) => {
  await seedCV(page, sampleCV(), "Alex Example");
  await page.goto("/builder/");
  const name = fullNameField(page);
  const email = page.locator("#personal").getByLabel("Email");
  const switcher = page.getByTestId("document-switcher");
  const preview = page.getByRole("document", { name: "CV preview" });
  await expect(name).toHaveValue("Alex Example");
  await expect(switcher).toContainText("Alex Example");

  // A second CV starts empty and gets its name from its content.
  let dialog = await openDocuments(page);
  await expect(dialog.locator("li[data-doc-id]")).toHaveCount(1);
  await dialog.getByRole("button", { name: "New CV" }).click();
  await expect(dialog).toBeHidden();
  await expect(name).toHaveValue("");
  await expect(switcher).toContainText("Untitled CV");
  await name.fill("Bima Second");
  await email.fill("bima@example.com");
  await expectSaved(page);
  await expect(switcher).toContainText("Bima Second");
  await expect(preview).toContainText("Bima Second");
  await expect(preview).not.toContainText("Alex Example");

  // Switching documents keeps their contents separate.
  dialog = await openDocuments(page);
  await expect(dialog.locator("li[data-doc-id]")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Open: Alex Example" }).click();
  await expect(name).toHaveValue("Alex Example");
  await expect(email).toHaveValue("alex@example.com");
  await expect(preview).toContainText("Example Logistics Co.");
  await expect(preview).not.toContainText("Bima Second");

  dialog = await openDocuments(page);
  await dialog.getByRole("button", { name: "Open: Bima Second" }).click();
  await expect(name).toHaveValue("Bima Second");
  await expect(email).toHaveValue("bima@example.com");
  await expect(preview).not.toContainText("Example Logistics Co.");

  // Rename (inline in the list).
  dialog = await openDocuments(page);
  await dialog.getByRole("button", { name: "Rename: Bima Second" }).click();
  await dialog.getByLabel("Document name").fill("Bima – Marketing roles");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByText("Renamed to “Bima – Marketing roles”.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Rename: Bima – Marketing roles" })).toBeFocused();

  // Duplicate another document; the open one doesn't change.
  await dialog.getByRole("button", { name: "Duplicate: Alex Example" }).click();
  await expect(dialog.getByText("Copy created: “Alex Example (copy)”.")).toBeVisible();
  await expect(dialog.locator("li[data-doc-id]")).toHaveCount(3);

  // Delete asks first; cancelling keeps the document.
  await dialog.getByRole("button", { name: "Delete: Alex Example (copy)" }).click();
  let confirm = page.getByRole("dialog", { name: "Delete “Alex Example (copy)”?" });
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toBeHidden();
  await expect(dialog.locator("li[data-doc-id]")).toHaveCount(3);
  await dialog.getByRole("button", { name: "Delete: Alex Example (copy)" }).click();
  confirm = page.getByRole("dialog", { name: "Delete “Alex Example (copy)”?" });
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(dialog.getByText("“Alex Example (copy)” was deleted from this browser.")).toBeVisible();
  await expect(dialog.locator("li[data-doc-id]")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();

  // The renamed document is still open and keeps its manual name while it's edited.
  await expect(switcher).toContainText("Bima – Marketing roles");
  await page.locator("#personal").getByLabel("Professional title").fill("Marketing Assistant");
  await expectSaved(page);
  await expect(switcher).toContainText("Bima – Marketing roles");

  // A reload keeps every document and opens the one that was open.
  await page.reload();
  await expect(name).toHaveValue("Bima Second");
  await expect(page.locator("#personal").getByLabel("Professional title")).toHaveValue("Marketing Assistant");
  await expect(switcher).toContainText("Bima – Marketing roles");
  const index = await storedIndex(page);
  expect(index.map((m) => m.name).sort()).toEqual(["Alex Example", "Bima – Marketing roles"]);
  expect(index.every((m) => m.kind === "cv")).toBe(true);
  const stored = await appStorage(page);
  expect(Object.keys(stored).filter((k) => k.startsWith("free-cv-maker:doc:"))).toHaveLength(2);

  dialog = await openDocuments(page);
  const rows = dialog.locator("li[data-doc-id]");
  await expect(rows).toHaveCount(2);
  // The open document is marked, and listed first because it was edited last.
  await expect(rows.first()).toContainText("Bima – Marketing roles");
  await expect(rows.first()).toHaveAttribute("aria-current", "true");
  await expect(rows.first()).toContainText("Currently open");
  await dialog.getByRole("button", { name: "Open: Alex Example" }).click();
  await expect(name).toHaveValue("Alex Example");
  await page.reload();
  await expect(name).toHaveValue("Alex Example");
});

test("deleting the open document from the documents dialog opens the next one", async ({ page }) => {
  await seedCV(page, sampleCV(), "Alex Example");
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");

  let dialog = await openDocuments(page);
  await dialog.getByRole("button", { name: "New CV" }).click();
  await fullNameField(page).fill("Short Lived");
  await expectSaved(page);

  dialog = await openDocuments(page);
  await dialog.getByRole("button", { name: "Delete: Short Lived" }).click();
  await page.getByRole("dialog", { name: "Delete “Short Lived”?" }).getByRole("button", { name: "Delete" }).click();
  await expect(dialog.getByText("“Short Lived” was deleted. “Alex Example” is open now.")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  // No pending autosave brings the deleted document back.
  await page.waitForTimeout(1000);
  expect((await storedIndex(page)).map((m) => m.name)).toEqual(["Alex Example"]);
  await page.reload();
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  expect((await storedIndex(page)).map((m) => m.name)).toEqual(["Alex Example"]);
});
