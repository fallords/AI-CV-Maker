import { readFileSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyCV, type CVData } from "@/lib/cv-schema";
import type { AnyDoc } from "@/lib/documents";
import { DOCX_MIME, exportDocx, mixWithWhite, wordTheme } from "@/lib/export/docx";
import { EXPORT_MIME, REVOKE_DELAY_MS, downloadBlob, exportFileName, textBlob } from "@/lib/export/download";
import { cleanText } from "@/lib/export/model";
import { exportText } from "@/lib/export/text";
import type { LetterData } from "@/lib/letter-schema";
import { richSampleCV, sampleCV, sampleLetter } from "@/lib/sample-cv";

const cvDoc = (data: CVData): AnyDoc => ({ kind: "cv", data });
const letterDoc = (data: LetterData): AnyDoc => ({ kind: "letter", data });

/** First line of every blank-line-separated block that is written in capitals: the section headings. */
function textHeadings(text: string): string[] {
  return text
    .split("\n\n")
    .map((block) => block.split("\n")[0])
    .filter((line) => /\p{Lu}/u.test(line) && line === line.toUpperCase());
}

/* ---------------- .docx helpers ---------------- */

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
/** 1×1 PNG. */
const PNG_PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

interface Para {
  style: string;
  text: string;
  bullet: boolean;
}

async function openDocx(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const read = async (name: string) => {
    const file = zip.file(name);
    if (!file) throw new Error(`${name} missing`);
    return file.async("string");
  };
  const documentXml = await read("word/document.xml");
  const xml = new DOMParser().parseFromString(documentXml, "application/xml");
  const paragraphs: Para[] = Array.from(xml.getElementsByTagNameNS(W, "p")).map((p) => {
    let text = "";
    for (const el of Array.from(p.getElementsByTagNameNS(W, "*"))) {
      if (el.localName === "t") text += el.textContent ?? "";
      else if (el.localName === "tab" && el.parentElement?.localName === "r") text += "\t";
      else if (el.localName === "br") text += "\n";
    }
    const style = p.getElementsByTagNameNS(W, "pStyle")[0]?.getAttributeNS(W, "val") ?? "";
    return { style, text, bullet: p.getElementsByTagNameNS(W, "numPr").length > 0 };
  });
  return {
    zip,
    xml,
    documentXml,
    stylesXml: await read("word/styles.xml"),
    relsXml: await read("word/_rels/document.xml.rels"),
    paragraphs,
    texts: paragraphs.map((p) => p.text).filter(Boolean),
    withStyle: (style: string) => paragraphs.filter((p) => p.style === style).map((p) => p.text),
  };
}

/** The <w:style> element with this id, as XML text. */
function styleXml(stylesXml: string, id: string): string {
  const match = new RegExp(`<w:style [^>]*w:styleId="${id}"[^>]*>[\\s\\S]*?</w:style>`).exec(stylesXml);
  if (!match) throw new Error(`style ${id} missing`);
  return match[0];
}

const twips = (mm: number) => Math.round((mm * 1440) / 25.4);

/* ---------------- plain text ---------------- */

describe("exportText (CV)", () => {
  it("writes the header, UPPERCASE headings in template order, entries and '- ' bullets", () => {
    const text = exportText(cvDoc(sampleCV()));
    expect(
      text.startsWith(
        "Alex Example\nData Analyst\nalex@example.com | +62 812 0000 0000 | Bandung, Indonesia | linkedin.com/in/alex-example | alex-example.dev\n\nPROFESSIONAL SUMMARY\nData analyst with four years",
      ),
    ).toBe(true);
    expect(textHeadings(text)).toEqual([
      "PROFESSIONAL SUMMARY",
      "WORK EXPERIENCE",
      "EDUCATION",
      "PROJECTS",
      "SKILLS",
      "CERTIFICATIONS",
    ]);
    expect(text).toContain(
      "WORK EXPERIENCE\nData Analyst\nExample Logistics Co. | Bandung, Indonesia | Mar 2022 – Present\n- Maintain weekly delivery-performance dashboards used by regional managers\n- Automate recurring SQL reports with Python scripts\n",
    );
    expect(text).toContain("\n\nJunior Business Analyst\nSample Retail Group | Jakarta, Indonesia | Aug 2020 – Feb 2022\n");
    expect(text).toContain("Bachelor of Science, Statistics\nExample Institute of Technology | Aug 2016 – Jul 2020\nThesis on forecasting");
    expect(text).toContain(
      "Open Transit Dashboard\nRole: Sole developer\n- Built a small dashboard visualising public transit timetable data\n- Wrote documentation for reproducing the analysis\nTechnologies: Python, pandas, Plotly | github.com/alex-example/transit\n",
    );
    expect(text).toContain(
      "SKILLS\nTechnical Skills: SQL (Advanced), Python (pandas) (Intermediate), Power BI (Intermediate), Excel / Google Sheets (Advanced), Git\nSoft Skills: Clear written communication, Stakeholder collaboration, Attention to detail\n",
    );
    expect(text).toContain("Example Data Analytics Certificate\nSample Online Academy | May 2021\nCredential: ABC-123-XYZ\n");
    // No headings for empty sections, no CRLF, no runs of blank lines, one trailing newline.
    expect(text).not.toContain("LANGUAGES");
    expect(text).not.toContain("\r");
    expect(text).not.toMatch(/\n\n\n/);
    expect(text.endsWith("Credential: ABC-123-XYZ\n")).toBe(true);
  });

  it("follows each template's default section order", () => {
    expect(textHeadings(exportText(cvDoc(richSampleCV("graduate"))))).toEqual([
      "PROFESSIONAL SUMMARY",
      "EDUCATION",
      "PROJECTS",
      "ORGANIZATIONS & VOLUNTEERING",
      "SKILLS",
      "CERTIFICATIONS",
      "AWARDS",
      "WORK EXPERIENCE",
      "LANGUAGES",
      "REFERENCES",
      "INTERESTS",
      "COURSES",
    ]);
    expect(textHeadings(exportText(cvDoc(richSampleCV("modern-professional")))).slice(0, 4)).toEqual([
      "PROFESSIONAL SUMMARY",
      "WORK EXPERIENCE",
      "PROJECTS",
      "EDUCATION",
    ]);
  });

  it("uses the stored order and leaves hidden sections out", () => {
    const cv = richSampleCV();
    cv.meta.sectionOrder = ["custom:courses", "interests", "summary"];
    cv.meta.hiddenSections = ["references", "experience"];
    const text = exportText(cvDoc(cv));
    expect(textHeadings(text)).toEqual([
      "COURSES",
      "INTERESTS",
      "PROFESSIONAL SUMMARY",
      "EDUCATION",
      "PROJECTS",
      "SKILLS",
      "CERTIFICATIONS",
      "ORGANIZATIONS & VOLUNTEERING",
      "AWARDS",
      "LANGUAGES",
    ]);
    expect(text).not.toContain("Sam Placeholder");
    expect(text).not.toContain("Junior Business Analyst");
    expect(text).toContain(
      "COURSES\nIntroduction to Machine Learning\nSample Online Academy | Feb 2023 – Apr 2023\nEight-week online course with weekly assignments.\n\nData Visualisation Basics\nExample Learning Platform | 2022\n\nINTERESTS\nOpen data, Trail running\n",
    );
  });

  it("renders the new sections like the templates do", () => {
    const text = exportText(cvDoc(richSampleCV()));
    expect(text).toContain(
      "ORGANIZATIONS & VOLUNTEERING\nVolunteer Data Mentor\nExample Community Data Club | Bandung, Indonesia | Jan 2021 – Present\n- Run monthly beginner sessions on spreadsheets and SQL\n",
    );
    expect(text).toContain("AWARDS\nBest Internal Dashboard\nExample Logistics Co. | Nov 2023\nRecognised for the weekly");
    expect(text).toContain("LANGUAGES\nIndonesian (Native), English (Professional)\n");
    expect(text).toContain(
      "REFERENCES\nSam Placeholder\nHead of Operations, Example Logistics Co.\nLine manager | sam.placeholder@example.com\n",
    );
  });

  it("uses the CV language for headings, dates and levels, not the interface language", () => {
    const cv = richSampleCV();
    cv.meta.cvLanguage = "id";
    const text = exportText(cvDoc(cv));
    expect(textHeadings(text).slice(0, 3)).toEqual(["RINGKASAN PROFESIONAL", "PENGALAMAN KERJA", "PENDIDIKAN"]);
    expect(text).toContain("Example Logistics Co. | Bandung, Indonesia | Mar 2022 – Sekarang");
    expect(text).toContain("Sample Retail Group | Jakarta, Indonesia | Agu 2020 – Feb 2022");
    expect(text).toContain("Keahlian Teknis: SQL (Mahir), Python (pandas) (Menengah)");
    expect(text).toContain("Peran: Sole developer");
    expect(text).toContain("Kredensial: ABC-123-XYZ");
    expect(text).toContain("BAHASA\nIndonesian (Penutur asli), English (Profesional)\n");
    expect(text).toContain("PENGALAMAN ORGANISASI\n");
  });

  it("skips empty entries and sections and names an untitled custom section", () => {
    const cv = createEmptyCV("id");
    cv.personal.fullName = "Rina Putri";
    cv.experience = [
      { id: "e1", jobTitle: " ", company: "", location: "", startDate: "", endDate: "", current: false, description: "" },
      // Only a stray control character: counts as filled in the form, but has nothing to show.
      { id: "e2", jobTitle: "\u0007", company: "", location: "", startDate: "", endDate: "", current: false, description: "" },
    ];
    cv.technicalSkills = [{ id: "s1", name: "", level: "expert" }];
    cv.customSections = [
      {
        id: "c1",
        title: "  ",
        items: [{ id: "i1", title: "Relawan bencana", subtitle: "", startDate: "2024", endDate: "", description: "" }],
      },
      { id: "c2", title: "Kosong", items: [{ id: "i2", title: "", subtitle: "", startDate: "", endDate: "", description: "" }] },
    ];
    const text = exportText(cvDoc(cv));
    expect(text).toBe("Rina Putri\n\nINFORMASI TAMBAHAN\nRelawan bencana\n2024\n");
  });

  it("removes control characters and normalises line breaks", () => {
    const cv = createEmptyCV();
    cv.summary = "First line\r\nSecond\u0007 line\u000c\r- A bullet\u0000";
    expect(exportText(cvDoc(cv))).toBe("PROFESSIONAL SUMMARY\nFirst line\nSecond line\n- A bullet\n");
  });

  it("returns an empty string for an empty CV", () => {
    expect(exportText(cvDoc(createEmptyCV()))).toBe("");
  });
});

describe("exportText (letter)", () => {
  it("writes a business letter in order", () => {
    const letter = sampleLetter();
    const paragraphs = letter.body.split("\n\n");
    expect(exportText(letterDoc(letter))).toBe(
      [
        "Alex Example",
        "Data Analyst",
        "alex@example.com | Bandung, Indonesia",
        "",
        "2 March 2026",
        "",
        "Jordan Sample",
        "Analytics Lead",
        "Example Analytics Ltd.",
        "Jl. Contoh No. 1",
        "Jakarta 10110",
        "Indonesia",
        "",
        "Subject: Application for the Senior Data Analyst position",
        "",
        "Dear Jordan Sample,",
        "",
        paragraphs.join("\n\n"),
        "",
        "Kind regards,",
        "",
        "Alex Example",
      ].join("\n") + "\n",
    );
  });

  it("uses the letter language and leaves blank parts out", () => {
    const letter = sampleLetter();
    letter.meta.language = "id";
    letter.subject = "Lamaran posisi Analis Data";
    letter.recipient = { name: "", title: "", company: "", address: "" };
    letter.body = "Paragraf pertama,\nbaris kedua.\n\n\n\nParagraf kedua.";
    letter.closing = "";
    const text = exportText(letterDoc(letter));
    expect(text).toContain("\n\nBandung, 2 Maret 2026\n\nPerihal: Lamaran posisi Analis Data\n\nDear Jordan Sample,\n\n");
    expect(text).toContain("Paragraf pertama,\nbaris kedua.\n\nParagraf kedua.\n\nAlex Example\n");
    expect(text).not.toContain("Kind regards");
  });
});

/* ---------------- Word ---------------- */

describe("exportDocx", () => {
  it("creates a valid .docx with the CV in section order", async () => {
    const blob = await exportDocx(cvDoc(sampleCV()));
    expect(blob.type).toBe(DOCX_MIME);
    const docx = await openDocx(blob);
    expect(docx.zip.file("[Content_Types].xml")).not.toBeNull();
    expect(docx.xml.getElementsByTagName("parsererror")).toHaveLength(0);

    expect(docx.withStyle("Title")).toEqual(["Alex Example"]);
    expect(docx.texts[1]).toBe("Data Analyst");
    expect(docx.texts[2]).toBe(
      "alex@example.com  |  +62 812 0000 0000  |  Bandung, Indonesia  |  linkedin.com/in/alex-example  |  alex-example.dev",
    );
    expect(docx.withStyle("Heading1")).toEqual([
      "Professional Summary",
      "Work Experience",
      "Education",
      "Projects",
      "Skills",
      "Certifications",
    ]);
    // Entry titles are Heading 2 with the date on a right-aligned tab stop at the right margin.
    expect(docx.withStyle("Heading2").slice(0, 2)).toEqual(["Data Analyst\tMar 2022 – Present", "Junior Business Analyst\tAug 2020 – Feb 2022"]);
    const contentWidth = twips(210) - 2 * twips(16);
    expect(docx.documentXml).toContain(`<w:tab w:val="right" w:pos="${contentWidth}"/>`);
    // Real Word bullets: 4 + 3 + 2 experience bullets and 2 project bullets.
    const bullets = docx.paragraphs.filter((p) => p.bullet);
    expect(bullets).toHaveLength(11);
    expect(bullets[0].text).toBe("Maintain weekly delivery-performance dashboards used by regional managers");
    expect(docx.texts).toContain("Example Logistics Co. · Bandung, Indonesia");
    expect(docx.texts).toContain("Technologies: Python, pandas, Plotly · github.com/alex-example/transit");
    expect(docx.texts).toContain("Technical Skills: SQL (Advanced), Python (pandas) (Intermediate), Power BI (Intermediate), Excel / Google Sheets (Advanced), Git");
    // A4 with the default 16mm × 14mm margins.
    expect(docx.documentXml).toMatch(/<w:pgSz w:w="11906" w:h="16838"/);
    expect(docx.documentXml).toContain(`w:top="${twips(14)}"`);
    expect(docx.documentXml).toContain(`w:left="${twips(16)}"`);
  });

  it("honours hidden sections, custom sections and the CV language", async () => {
    const cv = richSampleCV();
    cv.meta.cvLanguage = "id";
    cv.meta.hiddenSections = ["references", "summary"];
    cv.meta.sectionOrder = ["custom:courses"];
    const docx = await openDocx(await exportDocx(cvDoc(cv)));
    expect(docx.withStyle("Heading1")).toEqual([
      "Courses",
      "Pengalaman Kerja",
      "Pendidikan",
      "Proyek",
      "Keahlian",
      "Sertifikasi",
      "Pengalaman Organisasi",
      "Penghargaan",
      "Bahasa",
      "Minat",
    ]);
    expect(docx.withStyle("Heading2")).toContain("Introduction to Machine Learning\tFeb 2023 – Apr 2023");
    expect(docx.withStyle("Heading2")).toContain("Data Analyst\tMar 2022 – Sekarang");
    expect(docx.documentXml).not.toContain("Sam Placeholder");
    expect(docx.documentXml).not.toContain("Data analyst with four years");
    // Spelling and grammar language follows the CV.
    expect(docx.stylesXml).toContain('<w:lang w:val="id-ID"/>');
  });

  it("applies the accent colour, font, text size and margins", async () => {
    const cv = sampleCV();
    cv.meta.style = { accent: "#7a1f2b", font: "serif", fontSize: "large", spacing: "normal", margin: "narrow" };
    const docx = await openDocx(await exportDocx(cvDoc(cv)));
    const heading = styleXml(docx.stylesXml, "Heading1");
    expect(heading).toContain('<w:color w:val="7A1F2B"/>');
    expect(heading).toContain("<w:caps/>");
    expect(styleXml(docx.stylesXml, "Title")).toContain('<w:color w:val="7A1F2B"/>');
    expect(docx.stylesXml).toContain('w:ascii="Georgia"');
    expect(docx.stylesXml).toContain('<w:sz w:val="21"/>'); // 10.5pt body text
    expect(docx.documentXml).toContain(`w:left="${twips(12)}"`);
    expect(docx.documentXml).toContain(`w:top="${twips(10)}"`);
    expect(docx.documentXml).toContain(`<w:tab w:val="right" w:pos="${twips(210) - 2 * twips(12)}"/>`);
  });

  it("uses each template's own colours by default", async () => {
    const ats = await openDocx(await exportDocx(cvDoc(sampleCV("ats-minimal"))));
    expect(styleXml(ats.stylesXml, "Heading1")).toContain('<w:color w:val="1C1917"/>');
    const modern = await openDocx(await exportDocx(cvDoc(sampleCV("modern-professional"))));
    expect(styleXml(modern.stylesXml, "Heading1")).toContain('<w:color w:val="245740"/>');
    expect(styleXml(modern.stylesXml, "Title")).toContain('w:ascii="Georgia"');
    const graduate = await openDocx(await exportDocx(cvDoc(sampleCV("graduate"))));
    expect(styleXml(graduate.stylesXml, "Heading1")).toContain('<w:color w:val="2D6A4F"/>');
    expect(graduate.documentXml).toContain('w:fill="EFF6F1"');
    // Graduate lists certifications on one line.
    expect(graduate.texts).toContain("Example Data Analytics Certificate · Sample Online Academy · May 2021 · Credential: ABC-123-XYZ");
  });

  it("links email addresses and web addresses", async () => {
    const docx = await openDocx(await exportDocx(cvDoc(sampleCV())));
    expect(docx.relsXml).toContain('Target="mailto:alex@example.com" TargetMode="External"');
    expect(docx.relsXml).toContain('Target="https://linkedin.com/in/alex-example" TargetMode="External"');
    expect(docx.relsXml).toContain('Target="https://github.com/alex-example/transit" TargetMode="External"');
    expect(docx.documentXml.match(/<w:hyperlink /g)).toHaveLength(4);
  });

  it("includes the photo only for templates that show one", async () => {
    const modern = sampleCV("modern-professional");
    modern.personal.photo = PNG_PHOTO;
    const withPhoto = await openDocx(await exportDocx(cvDoc(modern)));
    expect(Object.keys(withPhoto.zip.files).some((name) => /^word\/media\/.+\.png$/.test(name))).toBe(true);
    expect(withPhoto.documentXml).toContain("<w:tbl>");
    expect(withPhoto.withStyle("Title")).toEqual(["Alex Example"]);

    const ats = sampleCV("ats-minimal");
    ats.personal.photo = PNG_PHOTO;
    const withoutPhoto = await openDocx(await exportDocx(cvDoc(ats)));
    expect(Object.keys(withoutPhoto.zip.files).some((name) => name.startsWith("word/media/"))).toBe(false);
    expect(withoutPhoto.documentXml).not.toContain("<w:tbl>");
  });

  it("writes a letter as a business letter", async () => {
    const letter = sampleLetter("modern-professional");
    const docx = await openDocx(await exportDocx(letterDoc(letter)));
    const [p1, p2, p3] = letter.body.split("\n\n");
    expect(docx.texts).toEqual([
      "Alex Example",
      "Data Analyst",
      "alex@example.com  |  Bandung, Indonesia",
      "2 March 2026",
      "Jordan Sample\nAnalytics Lead\nExample Analytics Ltd.\nJl. Contoh No. 1\nJakarta 10110\nIndonesia",
      "Subject: Application for the Senior Data Analyst position",
      "Dear Jordan Sample,",
      p1,
      p2,
      p3,
      "Kind regards,",
      "Alex Example",
    ]);
    expect(docx.withStyle("Title")).toEqual(["Alex Example"]);
    expect(docx.documentXml).toMatch(/<w:pgSz w:w="11906" w:h="16838"/);
  });

  it("keeps the file valid when the text contains control characters", async () => {
    const cv = createEmptyCV();
    cv.personal.fullName = "Bad\u0000 Name\u0008";
    cv.summary = "Tab\there\u000b and\u001f more \ud800 text 😀";
    const docx = await openDocx(await exportDocx(cvDoc(cv)));
    expect(docx.xml.getElementsByTagName("parsererror")).toHaveLength(0);
    expect(docx.withStyle("Title")).toEqual(["Bad Name"]);
    expect(docx.texts).toContain("Tab here and more  text 😀");
  });

  it("produces a valid file for an empty document", async () => {
    const docx = await openDocx(await exportDocx(cvDoc(createEmptyCV())));
    expect(docx.paragraphs.length).toBeGreaterThan(0);
    expect(docx.texts).toEqual([]);
  });

  it("leaves out sections whose entries have nothing to show", async () => {
    const cv = createEmptyCV();
    cv.personal.fullName = "Rina Putri";
    cv.experience = [
      { id: "e1", jobTitle: "\u0007", company: "", location: "", startDate: "", endDate: "", current: false, description: "" },
    ];
    const docx = await openDocx(await exportDocx(cvDoc(cv)));
    expect(docx.withStyle("Heading1")).toEqual([]);
    expect(docx.texts).toEqual(["Rina Putri"]);
  });

  it("loads the docx package only when a Word file is requested", () => {
    const source = readFileSync(path.resolve(__dirname, "../../lib/export/docx.ts"), "utf8");
    expect(source).toContain('await import("docx")');
    expect(source).not.toMatch(/^import(?!\s+type\b)[^;]*from\s+["']docx["']/m);
  });
});

describe("Word theme helpers", () => {
  it("blends colours with white like the templates' tints", () => {
    expect(mixWithWhite("000000", 0.5)).toBe("808080");
    expect(mixWithWhite("7A1F2B", 1)).toBe("7A1F2B");
    expect(mixWithWhite("7A1F2B", 0)).toBe("FFFFFF");
  });

  it("only colours ATS Minimal when an accent is chosen", () => {
    const base = sampleCV().meta.style;
    expect(wordTheme("ats-minimal", base).accent).toBeNull();
    expect(wordTheme("ats-minimal", { ...base, accent: "#21507a" }).heading.color).toBe("21507A");
    expect(wordTheme("graduate", { ...base, accent: "#21507a" }).band?.fill).toBe(mixWithWhite("21507A", 0.08));
  });
});

describe("cleanText", () => {
  it("keeps emoji and drops characters XML does not allow", () => {
    expect(cleanText("a\u0000b\u0008c\u000bd\u000ce\u001ff￾g￿h")).toBe("abcdefgh");
    expect(cleanText("tab\tand\r\nnewline")).toBe("tab\tand\nnewline");
    expect(cleanText("😀 \ud800x \udc00y")).toBe("😀 x y");
  });
});

/* ---------------- downloads ---------------- */

describe("downloads", () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  afterEach(() => {
    Object.assign(URL, { createObjectURL: originalCreate, revokeObjectURL: originalRevoke });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("names files after the document", () => {
    expect(exportFileName(cvDoc(sampleCV()), "docx")).toBe("Alex_Example_CV.docx");
    expect(exportFileName(cvDoc(createEmptyCV()), "txt")).toBe("CV.txt");
    expect(exportFileName(letterDoc(sampleLetter()), "txt")).toBe("Alex_Example_Cover_Letter.txt");
  });

  it("makes UTF-8 text files", async () => {
    const blob = textBlob("Héllo – ok\n");
    expect(blob.type).toBe(EXPORT_MIME.txt);
    expect(await blob.text()).toBe("Héllo – ok\n");
  });

  it("downloads a blob through a temporary link and revokes its URL later", () => {
    vi.useFakeTimers();
    const createUrl = vi.fn(() => "blob:mock");
    const revokeUrl = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    let inDocument = false;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      inDocument = document.body.contains(this);
    });

    const blob = new Blob(["x"], { type: EXPORT_MIME.txt });
    downloadBlob(blob, "Alex_Example_CV.txt");

    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(inDocument).toBe(true);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("Alex_Example_CV.txt");
    expect(link.getAttribute("href")).toBe("blob:mock");
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeUrl).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REVOKE_DELAY_MS);
    expect(revokeUrl).toHaveBeenCalledWith("blob:mock");
  });
});
