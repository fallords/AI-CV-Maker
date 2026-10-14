import { expect, test, type Locator, type Page } from "@playwright/test";
import type { CVData } from "@/lib/cv-schema";
import { richSampleCV, sampleCV, sampleLetter } from "@/lib/sample-cv";
import { editorTab, fullNameField, openDocuments, seedCV, seedDocs } from "./helpers";

async function expectNoOverflow(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `horizontal overflow on ${where}`).toBeLessThanOrEqual(0);
}

/** True when nothing (such as the sticky Edit/Preview bar) covers the middle of the element. */
async function expectOnTop(item: Locator, what: string) {
  const onTop = await item.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return hit !== null && el.contains(hit);
  });
  expect(onTop, `${what} is covered by another element`).toBe(true);
}

/** A CV of about four A4 pages: the work history of richSampleCV repeated. */
function fourPageCV(): CVData {
  const cv = richSampleCV("ats-minimal");
  const extra = [1, 2, 3, 4].flatMap((n) =>
    cv.experience.map((e) => ({ ...e, id: `${e.id}-again${n}`, company: `${e.company} (${n})` })),
  );
  cv.experience = [...cv.experience, ...extra];
  return cv;
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
  for (const name of ["Download PDF", "All formats", "More", "Add work experience"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box!.height, name).toBeGreaterThanOrEqual(40);
  }
  const box = await page.getByTestId("document-switcher").boundingBox();
  expect(box!.height, "document switcher").toBeGreaterThanOrEqual(40);
});

test("the phone toolbar is compact and still shows whether work is saved", async ({ page }) => {
  await seedCV(page, sampleCV());
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");

  // "Save" moves into "More"; Download PDF and More share one row.
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeHidden();
  const more = page.getByRole("button", { name: "More" });
  const download = page.getByRole("button", { name: "Download PDF" });
  const moreBox = (await more.boundingBox())!;
  const downloadBox = (await download.boundingBox())!;
  expect(Math.abs(moreBox.y - downloadBox.y), "More and Download PDF on one row").toBeLessThan(4);

  // The save status is visible on a phone.
  await fullNameField(page).fill("Alex Phone");
  const status = page.getByTestId("save-status");
  await expect(status).toBeVisible();
  await expect(status).toHaveText(/Saved on this device/);
  await expect(page.getByRole("status").filter({ hasText: "Saved on this device" })).toHaveCount(1);

  await more.click();
  const menu = page.getByRole("group", { name: "Document actions" });
  await expect(menu.getByRole("button").first()).toHaveText("New CV");
  await expect(menu.getByRole("button").nth(1)).toHaveText("New cover letter…");
  await menu.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved on this device.")).toBeVisible();
});

test("the Check tab counts pages on a phone the same way as on a computer", async ({ page }) => {
  await seedCV(page, fourPageCV(), "Long CV");
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  // The preview tab hasn't been opened: the page count must not depend on it.
  await editorTab(page, "Check");
  const panel = page.getByTestId("checks-panel");
  await expect(panel.locator('[data-check-id^="tooManyPages"]')).toBeVisible();
  await expect(panel.locator('[data-check-id^="tooManyPages"]')).toContainText(/is [3-9] pages long/);
  const phoneFinding = await panel.locator('[data-check-id^="tooManyPages"]').innerText();
  const phoneScore = await page.getByTestId("check-score-badge").innerText();

  // The same document side by side with its preview (desktop layout).
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("document", { name: "CV preview" })).toBeVisible();
  await expect(panel.locator('[data-check-id^="tooManyPages"]')).toHaveText(phoneFinding);
  await expect(page.getByTestId("check-score-badge")).toHaveText(phoneScore);

  // Jumping from the finding lands on the text size choice in the Design tab.
  await page.setViewportSize({ width: 412, height: 800 });
  await panel.locator('[data-check-id^="tooManyPages"]').click();
  const size = page.getByRole("group", { name: "Text size" }).getByRole("radio", { checked: true });
  await expect(size).toBeFocused();
  // The radio is visually hidden; its label shows the focus ring, even after a tap.
  await expect(size.locator("xpath=..")).toHaveCSS("outline-style", "solid");
  await expect(size.locator("xpath=..")).toBeInViewport();
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

      // Menus open above the sticky Edit/Preview bar: every item can be seen and tapped.
      await page.getByRole("button", { name: "All formats" }).click();
      const menu = page.getByRole("group", { name: "Download formats" });
      const menuBox = (await menu.boundingBox())!;
      expect(menuBox.x).toBeGreaterThanOrEqual(0);
      expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(width);
      const formats = menu.getByRole("button");
      await expect(formats.first()).toBeFocused();
      for (let i = 0; i < (await formats.count()); i++) await expectOnTop(formats.nth(i), `download format ${i + 1}`);
      await formats.first().click({ trial: true });
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: "More" }).click();
      const actions = page.getByRole("group", { name: "Document actions" });
      const visibleActions = actions.getByRole("button").filter({ visible: true });
      for (let i = 0; i < (await visibleActions.count()); i++) {
        await expectOnTop(visibleActions.nth(i), `document action ${i + 1}`);
      }
      await actions.getByRole("button", { name: "Duplicate" }).click({ trial: true });
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
