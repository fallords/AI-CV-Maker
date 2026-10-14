import { expect, test } from "@playwright/test";
import type { CVData } from "@/lib/cv-schema";
import { sampleCV } from "@/lib/sample-cv";
import {
  BACKUP_KEY,
  DOC_KEY,
  DRAFT_KEY,
  appStorage,
  fullNameField,
  openDocuments,
  seedLegacyDraft,
  storedIndex,
} from "./helpers";

/** The parts of a CV that existed in the single-draft (v1) version of the app. */
const v1Content = (cv: CVData) => ({
  personal: cv.personal,
  summary: cv.summary,
  experience: cv.experience,
  education: cv.education,
  projects: cv.projects,
  technicalSkills: cv.technicalSkills,
  softSkills: cv.softSkills,
  certifications: cv.certifications,
  template: cv.meta.template,
  cvLanguage: cv.meta.cvLanguage,
});

test("a draft and previous draft from the single-draft version become documents, with nothing lost", async ({
  page,
}) => {
  const draft = sampleCV("modern-professional");
  const backup = sampleCV("graduate");
  backup.personal = { ...backup.personal, fullName: "Previous Person", email: "previous@example.com" };
  backup.meta = { ...backup.meta, cvLanguage: "id" };
  backup.summary = "An older summary that should survive the move.";
  await seedLegacyDraft(page, draft, backup);

  await page.goto("/builder/");
  // The draft opens, as it did before.
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  await expect(page.getByLabel("Template")).toHaveValue("modern-professional");
  await expect(page.getByText("Opened “Alex Example” from this browser.")).toBeVisible();
  await expect(page.getByTestId("document-switcher")).toContainText("Alex Example");
  const preview = page.getByRole("document", { name: "CV preview" });
  for (const e of draft.experience) await expect(preview).toContainText(e.company);

  // Both are documents now, and the old keys are gone.
  const stored = await appStorage(page);
  expect(stored[DRAFT_KEY]).toBeUndefined();
  expect(stored[BACKUP_KEY]).toBeUndefined();
  const index = await storedIndex(page);
  expect(index.map((m) => m.name).sort()).toEqual(["Alex Example", "Previous Person"]);
  for (const meta of index) {
    const doc = JSON.parse(stored[DOC_KEY(meta.id)]);
    expect(doc.kind).toBe("cv");
    expect(doc.data.schemaVersion).toBe(2);
    const original = meta.name === "Alex Example" ? draft : backup;
    expect(v1Content(doc.data)).toEqual(v1Content(original));
    // The v2 fields are added empty.
    expect(doc.data.languages).toEqual([]);
    expect(doc.data.customSections).toEqual([]);
  }

  // The previous draft opens with its own content.
  const dialog = await openDocuments(page);
  await expect(dialog.locator("li[data-doc-id]")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Open: Previous Person" }).click();
  await expect(fullNameField(page)).toHaveValue("Previous Person");
  await expect(page.getByLabel("Template")).toHaveValue("graduate");
  await expect(page.getByLabel("CV language")).toHaveValue("id");
  await expect(preview).toContainText("An older summary that should survive the move.");
  await expect(preview.getByRole("heading", { name: "Pengalaman Kerja" })).toBeVisible();

  // Loading again doesn't migrate twice.
  await page.reload();
  await expect(fullNameField(page)).toHaveValue("Previous Person");
  expect(await storedIndex(page)).toHaveLength(2);
});

test("a corrupted legacy draft is set aside and the builder starts empty", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("free-cv-maker:draft", "{corrupted");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/builder/");
  await expect(page.getByRole("alert").filter({ hasText: "could not be read" })).toBeVisible();
  await expect(fullNameField(page)).toHaveValue("");
  const stored = await appStorage(page);
  expect(stored["free-cv-maker:corrupted"]).toBe("{corrupted");
  expect(stored[DRAFT_KEY]).toBeUndefined();
});

test("the landing page offers to continue a legacy draft before it has been migrated", async ({ page }) => {
  await seedLegacyDraft(page, sampleCV());
  await page.goto("/");
  await page.getByRole("link", { name: /^Continue/ }).click();
  await expect(page).toHaveURL(/\/builder\/$/);
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  expect((await storedIndex(page)).map((m) => m.name)).toEqual(["Alex Example"]);
});
