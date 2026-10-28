import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { sampleCV } from "@/lib/sample-cv";
import { editorTab, expectNoAxeViolations, expectSaved, fullNameField, seedCV, stubPrint } from "./helpers";

/*
 * The rest of the suite runs with reduced motion (playwright.config.ts). These tests turn
 * motion on and check that the animated paths still work: the landing page's folder demo,
 * and the builder's feedback motion (dialogs, menus, moving entries, tab changes).
 */
test.use({ contextOptions: { reducedMotion: "no-preference" } });

/** The last entry of the demo CV that shows above the flap (English, ATS Minimal, desktop). */
const LAST_VISIBLE_ENTRY = "Bachelor of Science, Statistics";
/** The demo's whole sequence ends after about 3.1 s; the spec allows 4.5 s. */
const DEMO_MAX_MS = 4500;

interface DemoRecord {
  state: string;
  /** performance.now() when this state and sheet text were first seen. */
  at: number;
  /** Length of the sheet's text. */
  length: number;
}

/**
 * Records every state the folder demo passes through, and how much text the sheet holds
 * at each point, from the first parse of the page on. Read it with `demoLog`.
 */
async function recordDemo(page: Page) {
  await page.addInitScript(() => {
    const log: { state: string; at: number; length: number }[] = [];
    (window as unknown as { __demo: typeof log }).__demo = log;
    const record = () => {
      const folder = document.querySelector('[data-testid="hero-folder"]');
      const sheet = document.querySelector('[data-testid="hero-sheet"]');
      if (!folder || !sheet) return;
      const state = folder.getAttribute("data-demo") ?? "";
      const length = (sheet.textContent ?? "").length;
      const last = log[log.length - 1];
      if (!last || last.state !== state || last.length !== length) log.push({ state, at: performance.now(), length });
    };
    new MutationObserver(record).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["data-demo"],
    });
  });
}

const demoLog = (page: Page) => page.evaluate(() => (window as unknown as { __demo: DemoRecord[] }).__demo);

/** The states in the order they were seen, without repeats. */
const statesOf = (log: DemoRecord[]) => log.map((r) => r.state).filter((s, i, all) => s !== all[i - 1]);

async function expectMotionAllowed(page: Page) {
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: no-preference)").matches)).toBe(true);
}

/** The CV accent colour the sheet's document resolves. */
const accentOf = (doc: Locator) =>
  doc.evaluate((el) => getComputedStyle(el).getPropertyValue("--cv-accent").trim().toLowerCase());

async function expectNoOverflow(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `horizontal overflow ${where}`).toBeLessThanOrEqual(0);
}

function hero(page: Page) {
  return {
    folder: page.getByTestId("hero-folder"),
    sheet: page.getByTestId("hero-sheet"),
    doc: page.getByTestId("hero-sheet").locator(".cv-doc"),
    templates: page.getByRole("radiogroup", { name: "Template" }),
    colours: page.getByRole("radiogroup", { name: "Colour" }),
    playAgain: page.getByRole("button", { name: "Play again" }),
  };
}

test.describe("landing page folder demo", () => {
  test("the CV fills itself in once, then rests on the finished sheet", async ({ page }) => {
    await recordDemo(page);
    await page.goto("/");
    await expectMotionAllowed(page);
    const { folder, sheet, playAgain } = hero(page);

    await expect(folder).toHaveAttribute("data-demo", "done", { timeout: 6000 });
    await expect(sheet).toContainText("Nadia Rahmawati");
    await expect(sheet).toContainText(LAST_VISIBLE_ENTRY);
    await expect(playAgain).toBeVisible();

    const log = await demoLog(page);
    expect(statesOf(log).slice(-2)).toEqual(["playing", "done"]);
    expect(statesOf(log)).not.toContain("still");
    // It really played: the sheet started empty and grew one step at a time, never shrinking.
    const playing = log.filter((r) => r.state === "playing");
    const done = log.find((r) => r.state === "done")!;
    expect(playing.length).toBeGreaterThan(10);
    const lengths = playing.map((r) => r.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    expect(lengths[0]).toBeLessThan(done.length / 4);
    expect(done.at - playing[0].at).toBeLessThanOrEqual(DEMO_MAX_MS);

    // Then it rests: nothing changes any more.
    const settled = log.length;
    await page.waitForTimeout(600);
    expect((await demoLog(page)).length).toBe(settled);
  });

  test("the folder tabs switch the template and the swatches set the colour", async ({ page }) => {
    await page.goto("/");
    const { folder, sheet, doc, templates, colours } = hero(page);
    await expect(folder).toHaveAttribute("data-demo", "done", { timeout: 6000 });

    await expect(templates.getByRole("radio")).toHaveCount(3);
    await expect(templates.getByRole("radio", { name: "ATS Minimal" })).toBeChecked();
    await expect(doc).toHaveClass(/\btpl-ats\b/);
    for (const [name, cls] of [
      ["Modern Professional", "tpl-modern"],
      ["Graduate", "tpl-graduate"],
      ["ATS Minimal", "tpl-ats"],
    ]) {
      await templates.getByRole("radio", { name }).check();
      await expect(doc).toHaveClass(new RegExp(`\\b${cls}\\b`));
      await expect(sheet).toContainText("Nadia Rahmawati");
      // A new template doesn't start the sequence again.
      await expect(folder).toHaveAttribute("data-demo", "done");
    }

    await templates.getByRole("radio", { name: "Modern Professional" }).check();
    await expect(doc).toHaveClass(/\btpl-modern\b/);
    await expect(colours.getByRole("radio")).toHaveCount(5);
    await expect(colours.getByRole("radio", { name: "Template colour" })).toBeChecked();
    await expect.poll(() => accentOf(doc)).toBe("#245740");
    for (const [name, hex] of [
      ["Burgundy", "#7a1f2b"],
      ["Ink", "#1f3a5f"],
      ["Prussian blue", "#21507a"],
      ["Forest green", "#1b4332"],
    ]) {
      await colours.getByRole("radio", { name }).check();
      await expect(colours.getByRole("radio", { name })).toBeChecked();
      await expect.poll(() => accentOf(doc)).toBe(hex);
      await expect(doc).toHaveClass(/\bcv-accented\b/);
    }
    await colours.getByRole("radio", { name: "Template colour" }).check();
    await expect.poll(() => accentOf(doc)).toBe("#245740");
    await expect(doc).not.toHaveClass(/\bcv-accented\b/);
    await expect(folder).toHaveAttribute("data-demo", "done");
  });

  test("Play again runs the sequence again, and a language change finishes it at once", async ({ page }) => {
    await recordDemo(page);
    await page.goto("/");
    const { folder, sheet, playAgain } = hero(page);
    await expect(folder).toHaveAttribute("data-demo", "done", { timeout: 6000 });
    const before = (await demoLog(page)).length;

    await playAgain.click();
    await expect(folder).toHaveAttribute("data-demo", "playing");
    await expect(folder).toHaveAttribute("data-demo", "done", { timeout: 6000 });
    await expect(sheet).toContainText("Nadia Rahmawati");
    await expect(sheet).toContainText(LAST_VISIBLE_ENTRY);
    const again = (await demoLog(page)).slice(before);
    expect(statesOf(again)).toEqual(["playing", "done"]);
    // The sheet was emptied and written again.
    const playing = again.filter((r) => r.state === "playing");
    const done = again.find((r) => r.state === "done")!;
    expect(playing.length).toBeGreaterThan(10);
    expect(playing[0].length).toBeLessThan(done.length / 4);
    expect(done.at - playing[0].at).toBeLessThanOrEqual(DEMO_MAX_MS);

    // Switching the interface language in the middle jumps to the finished sheet.
    const mark = (await demoLog(page)).length;
    await playAgain.click();
    await expect(folder).toHaveAttribute("data-demo", "playing");
    await page.getByRole("button", { name: "Bahasa Indonesia" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(folder).toHaveAttribute("data-demo", "done");
    await expect(sheet).toContainText("Nadia Rahmawati");
    const switched = (await demoLog(page)).slice(mark);
    const start = switched.find((r) => r.state === "playing")!;
    const end = switched.find((r) => r.state === "done")!;
    // Well before the sequence would have ended on its own (about 3.1 s).
    expect(end.at - start.at).toBeLessThan(2500);
    await expect(page.getByRole("button", { name: "Putar lagi" })).toBeVisible();
  });

  test("the folder works with the keyboard", async ({ page }) => {
    await page.goto("/");
    const { folder, doc, templates, colours, playAgain } = hero(page);
    await expect(folder).toHaveAttribute("data-demo", "done", { timeout: 6000 });

    // After the hero links, Tab reaches the checked template tab, which shows a focus ring.
    await page.getByRole("link", { name: "See the templates" }).focus();
    await page.keyboard.press("Tab");
    const ats = templates.getByRole("radio", { name: "ATS Minimal" });
    await expect(ats).toBeFocused();
    await expect(ats.locator("xpath=..")).toHaveCSS("outline-style", "solid");

    // Arrow keys choose the template.
    await page.keyboard.press("ArrowRight");
    const modern = templates.getByRole("radio", { name: "Modern Professional" });
    await expect(modern).toBeFocused();
    await expect(modern).toBeChecked();
    await expect(doc).toHaveClass(/\btpl-modern\b/);

    // Tab moves on to the colours; arrow keys choose one.
    await page.keyboard.press("Tab");
    const own = colours.getByRole("radio", { name: "Template colour" });
    await expect(own).toBeFocused();
    await expect(own.locator("xpath=../span[@aria-hidden='true']")).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("ArrowRight");
    const ink = colours.getByRole("radio", { name: "Ink" });
    await expect(ink).toBeFocused();
    await expect(ink).toBeChecked();
    await expect.poll(() => accentOf(doc)).toBe("#1f3a5f");

    // Then Play again, which works with Enter and keeps focus while the sheet refills.
    await page.keyboard.press("Tab");
    await expect(playAgain).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(folder).toHaveAttribute("data-demo", "playing");
    await expect(folder).toHaveAttribute("data-demo", "done", { timeout: 6000 });
    await expect(playAgain).toBeFocused();
    // The choices made with the keyboard stay.
    await expect(doc).toHaveClass(/\btpl-modern\b/);
    await expect.poll(() => accentOf(doc)).toBe("#1f3a5f");
  });

  test.describe("at 360px", () => {
    test.use({ viewport: { width: 360, height: 800 } });

    test("the folder fits the screen while it plays and after", async ({ page }) => {
      await page.goto("/");
      const { folder, sheet, playAgain } = hero(page);
      await folder.scrollIntoViewIfNeeded();
      await expect(folder).toHaveAttribute("data-demo", "done", { timeout: 6000 });
      await expect(sheet).toContainText("Nadia Rahmawati");
      await expectNoOverflow(page, "after the demo");
      const box = (await folder.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);

      await playAgain.click();
      await expect(folder).toHaveAttribute("data-demo", "playing");
      await expectNoOverflow(page, "while the demo plays");
      await expect(folder).toHaveAttribute("data-demo", "done", { timeout: 6000 });
      await expectNoOverflow(page, "after playing again");
    });
  });
});

test.describe("with reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("the folder shows the finished CV at once and offers no Play again", async ({ page }) => {
    await recordDemo(page);
    await page.goto("/");
    const { folder, sheet, playAgain } = hero(page);
    // Already complete when the page has loaded.
    const text = (await sheet.textContent()) ?? "";
    expect(text).toContain("Nadia Rahmawati");
    expect(text).toContain(LAST_VISIBLE_ENTRY);

    await expect(folder).toHaveAttribute("data-demo", "still");
    await expect(playAgain).toHaveCount(0);
    await expect(sheet).toHaveCSS("translate", "none");
    // It never played or waited to play.
    await page.waitForTimeout(600);
    const states = statesOf(await demoLog(page));
    expect(states).not.toContain("armed");
    expect(states).not.toContain("playing");
    expect(states).not.toContain("done");
    await expect(sheet).toContainText(LAST_VISIBLE_ENTRY);
  });
});

test("the builder works with motion on: menus, dialogs, moving entries, tabs and downloads", async ({ page }) => {
  await stubPrint(page);
  await seedCV(page, sampleCV());
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  await expectMotionAllowed(page);
  const preview = page.getByRole("document", { name: "CV preview" });

  // The More menu opens with focus on its first action; Escape closes it and returns focus.
  const more = page.getByRole("button", { name: "More" });
  await more.click();
  const actions = page.getByRole("group", { name: "Document actions" });
  await expect(actions).toBeVisible();
  await expect(actions.getByRole("button", { name: "New CV" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(actions).toBeHidden();
  await expect(more).toBeFocused();

  // A dialog opened from the menu: rename the document and confirm.
  await more.click();
  await actions.getByRole("button", { name: "Rename" }).click();
  const rename = page.getByRole("dialog", { name: "Rename document" });
  await expect(rename).toBeVisible();
  await rename.getByLabel("Document name").fill("Alex, with motion");
  await rename.getByRole("button", { name: "Save" }).click();
  await expect(rename).toBeHidden();
  await expect(page.getByTestId("document-switcher")).toContainText("Alex, with motion");
  await expect(more).toBeFocused();

  // Two new entries; each Add puts focus in the new entry's first field.
  const addJob = page.getByRole("button", { name: "Add work experience" });
  const jobs = page.locator("#experience li[data-item-id]");
  await expect(jobs).toHaveCount(3);
  await addJob.click();
  await expect(jobs.nth(3).getByLabel("Job title")).toBeFocused();
  await page.keyboard.type("Motion Job A");
  await addJob.click();
  await expect(jobs.nth(4).getByLabel("Job title")).toBeFocused();
  await page.keyboard.type("Motion Job B");
  await expect(preview).toContainText("Motion Job B");

  const previewIndex = async (s: string) => (await preview.innerText()).indexOf(s);
  expect(await previewIndex("Motion Job A")).toBeLessThan(await previewIndex("Motion Job B"));

  // Move B up once: it lands between other entries, so focus stays on the pressed button.
  const upB = page.getByRole("button", { name: "Move up: Motion Job B" });
  const downB = page.getByRole("button", { name: "Move down: Motion Job B" });
  await upB.click();
  await expect(jobs.nth(3).getByLabel("Job title")).toHaveValue("Motion Job B");
  await expect.poll(async () => (await previewIndex("Motion Job B")) < (await previewIndex("Motion Job A"))).toBe(true);
  await expect(upB).toBeFocused();

  // Keep going with the keyboard: focus stays on Move up until B reaches the top, where
  // Move up is disabled and focus goes to Move down of the same entry.
  await page.keyboard.press("Enter");
  await expect(jobs.nth(2).getByLabel("Job title")).toHaveValue("Motion Job B");
  await expect(upB).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(jobs.nth(1).getByLabel("Job title")).toHaveValue("Motion Job B");
  await expect(upB).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(jobs.nth(0).getByLabel("Job title")).toHaveValue("Motion Job B");
  await expect(upB).toBeDisabled();
  await expect(downB).toBeFocused();
  await expect
    .poll(async () => (await previewIndex("Motion Job B")) < (await previewIndex("Example Logistics Co.")))
    .toBe(true);

  // A confirmation dialog: removing an entry with content asks first.
  await page.getByRole("button", { name: "Remove: Motion Job A" }).click();
  const confirm = page.getByRole("dialog", { name: "Remove this entry?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Remove" }).click();
  await expect(confirm).toBeHidden();
  await expect(jobs).toHaveCount(4);
  await expect(preview).not.toContainText("Motion Job A");
  await expect(preview).toContainText("Motion Job B");

  // Design and Check tabs.
  await editorTab(page, "Design");
  await expect(page.getByTestId("design-panel")).toBeVisible();
  await expect(page.getByTestId("section-manager")).toBeVisible();
  await editorTab(page, "Check");
  const panel = page.getByTestId("checks-panel");
  await expect(panel.getByRole("meter", { name: "Score" })).toBeVisible();
  await expectSaved(page);
  await expect(page.getByText(/^A4, \d+ pages?$/)).toBeVisible();
  const stamp = panel.getByTestId("checks-score");
  await expect(stamp).toHaveText(/^\d+$/);
  const score = ((await stamp.textContent()) ?? "").trim();
  await expect(panel.getByRole("meter", { name: "Score" })).toHaveAttribute("aria-valuenow", score);
  await expect(page.getByTestId("check-score-badge")).toHaveText(score);

  // The download menu: opens with focus on the first format and downloads the moved order.
  await editorTab(page, "Content");
  await page.getByRole("button", { name: "All formats" }).click();
  const formats = page.getByRole("group", { name: "Download formats" });
  await expect(formats).toBeVisible();
  await expect(formats.getByRole("button").first()).toBeFocused();
  const pending = page.waitForEvent("download");
  await formats.getByRole("button", { name: "Plain text (.txt)" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("Alex_Example_CV.txt");
  const path = await download.path();
  const text = readFileSync(path, "utf8");
  expect(text.indexOf("Motion Job B")).toBeGreaterThan(-1);
  expect(text.indexOf("Motion Job B")).toBeLessThan(text.indexOf("Example Logistics Co."));
  expect(text).not.toContain("Motion Job A");
  await expect(page.getByText("Text file downloaded.")).toBeVisible();
  await expect(formats).toBeHidden();

  // Download PDF: its instructions dialog opens and hands over to the print dialog.
  await page.getByRole("button", { name: "Download PDF" }).click();
  const print = page.getByRole("dialog", { name: "Download your CV as PDF" });
  await expect(print).toBeVisible();
  await print.getByRole("button", { name: "Open print dialog" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __prints: number }).__prints)).toBe(1);

  // The same document scores the same with reduced motion.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(fullNameField(page)).toHaveValue("Alex Example");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await editorTab(page, "Check");
  await expect(page.getByTestId("checks-panel").getByTestId("checks-score")).toHaveText(score);
  await expect(page.getByTestId("check-score-badge")).toHaveText(score);
});

for (const path of ["/", "/help/", "/privacy/"]) {
  test(`no detectable accessibility violations on ${path} with motion on`, async ({ page }) => {
    await page.goto(path);
    await expectMotionAllowed(page);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (path === "/") {
      // After the demo has settled, so nothing is mid-fade.
      await expect(page.getByTestId("hero-folder")).toHaveAttribute("data-demo", "done", { timeout: 6000 });
      await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();
    }
    await expectNoAxeViolations(page);
  });
}
