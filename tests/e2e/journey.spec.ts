import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { DRAFT_KEY, expectNoExternalRequests, pdfPageCount, pdfText } from "./helpers";

test("complete user journey: create, switch templates, refresh, export PDF, delete", async ({ page, baseURL }, testInfo) => {
  // Record print() calls instead of opening a native dialog.
  await page.addInitScript(() => {
    (window as unknown as { __prints: number }).__prints = 0;
    window.print = () => {
      (window as unknown as { __prints: number }).__prints += 1;
    };
  });

  await expectNoExternalRequests(page, baseURL!, async () => {
    // 1–2. Landing page → start creating.
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Write your CV in the browser");
    await page.getByRole("link", { name: "Create Your Free CV" }).first().click();
    await expect(page).toHaveURL(/\/builder\/$/);

    // 3. Personal details.
    await page.getByLabel(/Full name/).fill("Rina Kusuma");
    await page.getByLabel("Professional title").fill("Junior Software Engineer");
    await page.getByLabel("Email").fill("rina@example.com");
    await page.getByLabel("Phone number").fill("+62 811 1111 2222");
    await page.getByLabel("City").fill("Yogyakarta");
    await page.getByLabel("Country").fill("Indonesia");
    await page.getByLabel("LinkedIn URL").fill("linkedin.com/in/rina-example");
    await page.getByLabel(/Summary/).fill("Software engineer focused on accessible web applications.");

    // 4. Work experience and education.
    await page.getByRole("button", { name: "Add work experience" }).click();
    const job = page.locator("#experience li").first();
    await job.getByLabel("Job title").fill("Frontend Developer Intern");
    await job.getByLabel("Company").fill("Example Studio");
    await job.getByLabel("Start date: Month").selectOption("02");
    await job.getByLabel("Start date: Year").selectOption("2024");
    await job.getByLabel("I currently work here").check();
    await job.getByLabel("Responsibilities and achievements").fill("- Built reusable form components\n- Fixed accessibility issues");

    await page.getByRole("button", { name: "Add education" }).click();
    const edu = page.locator("#education li").first();
    await edu.getByLabel("Institution").fill("Example State University");
    await edu.getByLabel("Degree").fill("Bachelor of Computer Science");
    await edu.getByLabel("End date (or expected): Year").selectOption("2025");

    // 5. Project and skills.
    await page.getByRole("button", { name: "Add project" }).click();
    const prj = page.locator("#projects li").first();
    await prj.getByLabel("Project name").fill("Campus Event Finder");
    await prj.getByLabel("Technologies").fill("TypeScript, React");
    await page.getByRole("button", { name: "Add technical skill" }).click();
    await page.locator("#skills li").first().getByLabel("Skill", { exact: true }).fill("TypeScript");
    await page.getByRole("button", { name: "Add soft skill" }).click();
    await page.locator("#skills li").last().getByLabel("Skill", { exact: true }).fill("Teamwork");

    const preview = page.getByRole("document", { name: "CV preview" });
    await expect(preview).toContainText("Rina Kusuma");
    await expect(preview).toContainText("Feb 2024 – Present");
    await expect(preview).toContainText("Campus Event Finder");

    // 6. Switch between all templates; content stays.
    for (const [id, cls] of [
      ["modern-professional", "tpl-modern"],
      ["graduate", "tpl-graduate"],
      ["ats-minimal", "tpl-ats"],
    ]) {
      await page.getByLabel("Template").selectOption(id);
      await expect(preview.locator(".cv-doc")).toHaveClass(new RegExp(cls));
      await expect(preview).toContainText("Example Studio");
      await expect(preview).toContainText("TypeScript");
    }
    await page.getByLabel("Template").selectOption("modern-professional");
    await expect(page.getByTestId("save-status")).toHaveText(/Saved on this device/);

    // 7–8. Refresh → draft restored.
    await page.reload();
    await expect(page.getByLabel(/Full name/)).toHaveValue("Rina Kusuma");
    await expect(page.getByLabel("Template")).toHaveValue("modern-professional");
    await expect(page.locator("#experience li").first().getByLabel("Company")).toHaveValue("Example Studio");
    await expect(page.getByText("Your draft was restored from this browser.")).toBeVisible();

    // 9. Download PDF → instructions → print dialog.
    await page.getByRole("button", { name: "Download PDF" }).click();
    const dialog = page.getByRole("dialog", { name: "Download your CV as PDF" });
    await expect(dialog).toContainText("Save as PDF");
    await dialog.getByRole("button", { name: "Open print dialog" }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __prints: number }).__prints)).toBe(1);
  });

  // 10. Render the same print pipeline to a PDF file and inspect it.
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const file = testInfo.outputPath("journey-cv.pdf");
  writeFileSync(file, pdf);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdfPageCount(pdf)).toBe(1);
  expect(pdf.toString("latin1")).toMatch(/MediaBox\s*\[0 0 59[45]\.\d+ 84[12]\.\d+\]/); // A4 in points
  const text = pdfText(file);
  if (text === null) {
    testInfo.annotations.push({ type: "skipped-check", description: "pdftotext not installed; PDF text not inspected" });
  } else {
    for (const s of ["Rina Kusuma", "Junior Software Engineer", "rina@example.com", "Frontend Developer Intern", "Feb 2024 – Present", "Built reusable form components", "Example State University", "Campus Event Finder", "TypeScript", "Teamwork"]) {
      expect(text).toContain(s);
    }
    for (const ui of ["Download PDF", "Save draft", "Full name", "Add work experience", "Free AI CV Maker"]) {
      expect(text).not.toContain(ui);
    }
    expect(text.toLowerCase()).not.toContain("watermark");
  }

  // 11. No account or AI was needed: there are no AI or sign-in controls.
  await expect(page.getByRole("button", { name: /AI/ })).toHaveCount(0);
  await expect(page.getByText(/sign in|log in|register/i)).toHaveCount(0);

  // 12. Delete the local draft (with confirmation).
  await page.getByText("More").click();
  await page.getByRole("button", { name: "Delete draft" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete this draft?" });
  await confirm.getByRole("button", { name: "Delete draft" }).click();
  await expect(page.getByLabel(/Full name/)).toHaveValue("");
  await page.waitForTimeout(1000);
  expect(await page.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull();
  await page.reload();
  await expect(page.getByLabel(/Full name/)).toHaveValue("");
});
