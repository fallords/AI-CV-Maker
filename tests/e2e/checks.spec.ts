import { expect, test } from "@playwright/test";
import { sampleCV } from "@/lib/sample-cv";
import { editorTab, expectSaved, fullNameField, seedCV } from "./helpers";

test("the Check tab scores an incomplete CV and each suggestion jumps to its field", async ({ page }) => {
  const cv = sampleCV();
  cv.personal = { ...cv.personal, email: "", phone: "" };
  cv.summary = "Data analyst.";
  cv.experience[1] = { ...cv.experience[1], startDate: "", endDate: "", current: false };
  await seedCV(page, cv);
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");

  // The tab shows the score as a badge.
  const tab = page.getByRole("tab", { name: /^Check/ });
  const badge = page.getByTestId("check-score-badge");
  await expect(badge).toHaveText(/^\d+$/);
  const badgeScore = Number(await badge.textContent());
  expect(badgeScore).toBeLessThan(100);
  await expect(tab).toHaveAccessibleName(new RegExp(`Score: ${badgeScore} out of 100`));

  await editorTab(page, "Check");
  const panel = page.getByTestId("checks-panel");
  await expect(panel.getByRole("meter", { name: "Score" })).toHaveAttribute("aria-valuenow", String(badgeScore));
  // The stamp holds only the number; the line it sits on reads "N out of 100".
  const stamp = panel.getByTestId("checks-score");
  await expect(stamp).toHaveText(String(badgeScore));
  await expect(stamp.locator("xpath=..")).toHaveText(`${badgeScore} out of 100`);
  await expect(panel.getByRole("list", { name: /Errors/ })).toBeVisible();

  // Missing email → the Email field.
  const email = panel.getByRole("button", { name: /Add an email address/ });
  await expect(email).toBeVisible();
  await email.click();
  await expect(page.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
  const emailField = page.locator("#personal").getByLabel("Email");
  await expect(emailField).toBeFocused();
  await emailField.fill("alex@example.com");

  // An entry without dates → that entry's start date.
  await editorTab(page, "Check");
  await panel.getByRole("button", { name: /This entry has no dates/ }).click();
  const entry = page.locator(`#experience li[data-item-id="${cv.experience[1].id}"]`);
  await expect(entry.getByLabel("Start date: Month")).toBeFocused();
  await entry.getByLabel("Start date: Year").selectOption("2019");

  // A short summary → the summary field.
  await editorTab(page, "Check");
  await panel.getByRole("button", { name: /Your summary is short/ }).click();
  await expect(page.locator("#summary textarea")).toBeFocused();

  // Fixing things raises the score.
  await expectSaved(page);
  await expect.poll(async () => Number(await badge.textContent())).toBeGreaterThan(badgeScore);
  await editorTab(page, "Check");
  await expect(panel.getByRole("button", { name: /Add an email address/ })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: /This entry has no dates/ })).toHaveCount(0);
});

test("an empty CV gets a starting point instead of a score", async ({ page }) => {
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("");
  await expect(page.getByTestId("check-score-badge")).toHaveCount(0);
  await editorTab(page, "Check");
  const panel = page.getByTestId("checks-panel");
  await expect(panel.getByRole("meter")).toHaveCount(0);
  await panel.getByRole("button").first().click();
  await expect(fullNameField(page)).toBeFocused();
});
