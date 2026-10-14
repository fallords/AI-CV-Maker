import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { richSampleCV, sampleLetter } from "@/lib/sample-cv";
import { DOC_KEY, appStorage, downloadAs, fullNameField, openDocuments, seedCV, seedDocs, storedIndex } from "./helpers";

/** Text runs of a Word document joined per paragraph (word/document.xml). */
function wordParagraphs(xml: string): string[] {
  return Array.from(xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)).map((p) =>
    Array.from(p[0].matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g))
      .map((t) => t[1])
      .join("")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"),
  );
}

test("downloads a Word file, plain text and a JSON backup that imports as a new document", async ({ page }, testInfo) => {
  const cv = richSampleCV("modern-professional");
  await seedCV(page, cv, "Alex Example");
  await page.goto("/builder/");
  await expect(fullNameField(page)).toHaveValue("Alex Example");

  // Word (.docx): a zip whose main part holds the name, the headings and the entries.
  const docx = await downloadAs(page, "Word (.docx)");
  expect(docx.suggestedFilename()).toBe("Alex_Example_CV.docx");
  const docxPath = testInfo.outputPath("cv.docx");
  await docx.saveAs(docxPath);
  const bytes = readFileSync(docxPath);
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
  const zip = await JSZip.loadAsync(bytes);
  expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(["[Content_Types].xml", "word/document.xml"]));
  const paragraphs = wordParagraphs(await zip.file("word/document.xml")!.async("string"));
  expect(paragraphs).toContain("Alex Example");
  for (const heading of ["Work Experience", "Education", "Languages", "Courses"]) expect(paragraphs).toContain(heading);
  const all = paragraphs.join("\n");
  for (const e of cv.experience) expect(all).toContain(e.company);
  expect(all).toContain("Introduction to Machine Learning");
  await expect(page.getByText("Word file downloaded.")).toBeVisible();

  // Plain text: UPPERCASE headings and the entries, in order.
  const txt = await downloadAs(page, "Plain text (.txt)");
  expect(txt.suggestedFilename()).toBe("Alex_Example_CV.txt");
  const txtPath = testInfo.outputPath("cv.txt");
  await txt.saveAs(txtPath);
  const text = readFileSync(txtPath, "utf8");
  const lines = text.split("\n");
  expect(lines[0]).toBe("Alex Example");
  const headings = ["PROFESSIONAL SUMMARY", "WORK EXPERIENCE", "PROJECTS", "EDUCATION", "SKILLS", "LANGUAGES", "COURSES"];
  for (const heading of headings) expect(lines).toContain(heading);
  // Modern Professional puts projects before education.
  expect(lines.indexOf("WORK EXPERIENCE")).toBeLessThan(lines.indexOf("PROJECTS"));
  expect(lines.indexOf("PROJECTS")).toBeLessThan(lines.indexOf("EDUCATION"));
  for (const e of cv.experience) expect(text).toContain(e.company);
  expect(text).toMatch(/^- .+/m);
  expect(text).not.toContain("<");

  // JSON backup, imported again as a separate document.
  const json = await downloadAs(page, "JSON backup");
  expect(json.suggestedFilename()).toBe("Alex_Example_CV.json");
  const jsonPath = testInfo.outputPath("cv.json");
  await json.saveAs(jsonPath);
  const backup = JSON.parse(readFileSync(jsonPath, "utf8"));
  expect(backup.kind).toBe("cv");
  expect(backup.data.personal.fullName).toBe("Alex Example");

  const dialog = await openDocuments(page);
  const chooser = page.waitForEvent("filechooser");
  await dialog.getByRole("button", { name: "Import file" }).click();
  await (await chooser).setFiles(jsonPath);
  await expect(page.getByText("“Alex Example” was imported as a new document.")).toBeVisible();
  await expect(fullNameField(page)).toHaveValue("Alex Example");

  const index = await storedIndex(page);
  expect(index).toHaveLength(2);
  const stored = await appStorage(page);
  const [first, second] = index.map((m) => JSON.parse(stored[DOC_KEY(m.id)]).data);
  expect(second).toEqual(first);
  expect(first.customSections[0].items).toHaveLength(2);
  expect(first.languages).toHaveLength(2);
});

test("a cover letter downloads as Word and plain text too", async ({ page }, testInfo) => {
  const letter = sampleLetter("graduate");
  await seedDocs(page, [{ id: "letter1", doc: { kind: "letter", data: letter }, name: "Letter to Example Analytics" }]);
  await page.goto("/builder/");
  await expect(page.getByRole("document", { name: "Cover letter preview" })).toContainText(letter.subject);

  const txt = await downloadAs(page, "Plain text (.txt)");
  expect(txt.suggestedFilename()).toBe("Alex_Example_Cover_Letter.txt");
  const txtPath = testInfo.outputPath("letter.txt");
  await txt.saveAs(txtPath);
  const text = readFileSync(txtPath, "utf8");
  for (const s of ["Alex Example", "Jordan Sample", letter.subject, "Kind regards,"]) expect(text).toContain(s);

  const docx = await downloadAs(page, "Word (.docx)");
  expect(docx.suggestedFilename()).toBe("Alex_Example_Cover_Letter.docx");
  const docxPath = testInfo.outputPath("letter.docx");
  await docx.saveAs(docxPath);
  const zip = await JSZip.loadAsync(readFileSync(docxPath));
  const all = wordParagraphs(await zip.file("word/document.xml")!.async("string")).join("\n");
  for (const s of ["Alex Example", "Jordan Sample", letter.subject, "Kind regards,"]) expect(all).toContain(s);
});
