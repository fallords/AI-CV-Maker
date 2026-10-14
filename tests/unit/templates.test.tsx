import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CVPreview } from "@/components/cv-preview/CVPreview";
import { DocumentPreview, pageBreaks } from "@/components/cv-preview/DocumentPreview";
import { CVDocument, TEMPLATES } from "@/components/templates";
import { LetterDocument } from "@/components/templates/LetterDocument";
import { PrintRoot, pageRule } from "@/components/templates/PrintRoot";
import { ACCENTED_CLASS, FONT_STACKS, docStyleVars } from "@/components/templates/style";
import { CV_LABELS } from "@/lib/cv-format";
import { TEMPLATE_IDS, createEmptyCV, type CVData, type TemplateId } from "@/lib/cv-schema";
import { TEMPLATE_SECTION_ORDER, type BuiltinSectionKey } from "@/lib/cv-sections";
import {
  ACCENT_PRESETS,
  DEFAULT_STYLE,
  FONT_OPTIONS,
  FONT_SIZE_PT,
  MARGINS,
  MARGIN_MM,
  SPACINGS,
  SPACING_SCALE,
  type DocStyle,
} from "@/lib/doc-style";
import type { AnyDoc } from "@/lib/documents";
import { I18nProvider } from "@/lib/i18n";
import { createEmptyLetter, letterDateLine, type LetterData } from "@/lib/letter-schema";
import { richSampleCV, sampleCV, sampleLetter } from "@/lib/sample-cv";

const PHOTO = "data:image/png;base64,iVBORw0KGgo=";

function headings(container: HTMLElement) {
  return Array.from(container.querySelectorAll("h2")).map((h) => h.textContent);
}

describe("CV templates", () => {
  it.each(TEMPLATE_IDS)("%s renders every filled section of the sample CV", (template) => {
    const { container } = render(<CVDocument cv={sampleCV(template)} />);
    expect(headings(container).sort()).toEqual(
      ["Certifications", "Education", "Professional Summary", "Projects", "Skills", "Work Experience"].sort(),
    );
    const text = container.textContent ?? "";
    for (const expected of [
      "Alex Example",
      "Example Logistics Co.",
      "Placeholder Research Lab",
      "Example Institute of Technology",
      "Open Transit Dashboard",
      "Power BI (Intermediate)",
      "Attention to detail",
      "Example Data Analytics Certificate",
      "Mar 2022 – Present",
    ]) {
      expect(text).toContain(expected);
    }
  });

  it("switching templates shows the same content", () => {
    // Compare individual text nodes, so layout order does not matter but content does.
    const words = (t: CVData["meta"]["template"]) => {
      const { container, unmount } = render(<CVDocument cv={sampleCV(t)} />);
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const out = new Set<string>();
      while (walker.nextNode()) {
        for (const w of (walker.currentNode.textContent ?? "").split(/[\s·,()|:–]+/)) if (w) out.add(w);
      }
      unmount();
      return out;
    };
    const [a, b, c] = TEMPLATE_IDS.map(words);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });

  it.each(TEMPLATE_IDS)("%s omits empty sections and empty entries", (template) => {
    const cv = createEmptyCV();
    cv.meta.template = template;
    cv.personal.fullName = "Only Name";
    cv.experience.push({ id: "e", jobTitle: " ", company: "", location: "", startDate: "", endDate: "", current: false, description: "" });
    cv.technicalSkills.push({ id: "s", name: "", level: "advanced" });
    const { container } = render(<CVDocument cv={cv} />);
    expect(headings(container)).toEqual([]);
    expect(container.textContent).toContain("Only Name");
    expect(container.querySelectorAll(".cv-entry")).toHaveLength(0);
  });

  it("renders CV headings in the CV language, independent of the UI", () => {
    const cv = sampleCV("modern-professional");
    cv.meta.cvLanguage = "id";
    const { container } = render(<CVDocument cv={cv} />);
    expect(headings(container)).toContain("Pengalaman Kerja");
    expect(container.textContent).toContain("Mar 2022 – Sekarang");
    expect(container.textContent).toContain("Power BI (Menengah)");
    // User content is never translated.
    expect(container.textContent).toContain("Maintain weekly delivery-performance dashboards");
  });

  it("orders education and projects first in the Graduate template", () => {
    const { container } = render(<CVDocument cv={sampleCV("graduate")} />);
    const order = headings(container);
    expect(order.indexOf("Education")).toBeLessThan(order.indexOf("Work Experience"));
    expect(order.indexOf("Projects")).toBeLessThan(order.indexOf("Work Experience"));
  });

  it("shows the photo only in templates that support it", () => {
    for (const id of TEMPLATE_IDS) {
      const cv = sampleCV(id);
      cv.personal.photo = PHOTO;
      const { container, unmount } = render(<CVDocument cv={cv} />);
      expect(container.querySelector("img") !== null).toBe(TEMPLATES[id].showsPhoto);
      unmount();
    }
    expect(TEMPLATES["ats-minimal"].showsPhoto).toBe(false);
  });

  it("renders bullet lines as list items and links only safe URLs", () => {
    const cv = createEmptyCV();
    cv.personal.fullName = "Link Test";
    cv.personal.website = "javascript:alert(1)";
    cv.personal.linkedin = "linkedin.com/in/test";
    cv.projects.push({ id: "p", name: "P", role: "", description: "- one\n- two", technologies: "", url: "" });
    render(<CVDocument cv={cv} />);
    const link = screen.getByRole("link", { name: "linkedin.com/in/test" });
    expect(link).toHaveAttribute("href", "https://linkedin.com/in/test");
    expect(screen.getByText("javascript:alert(1)").closest("a")).toBeNull();
    const projects = screen.getByRole("region", { name: "Projects" });
    expect(within(projects).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["one", "two"]);
  });
});

/* ------------------------------------------------------------------------------------------ */
/* v2: new sections, custom sections, order and visibility                                     */
/* ------------------------------------------------------------------------------------------ */

const EN = CV_LABELS.en;
const BUILTIN_TITLES: Record<BuiltinSectionKey, string> = {
  summary: EN.summary,
  experience: EN.experience,
  education: EN.education,
  projects: EN.projects,
  skills: EN.skills,
  certifications: EN.certifications,
  organizations: EN.organizations,
  awards: EN.awards,
  languages: EN.languages,
  references: EN.references,
  interests: EN.interests,
};

function sectionKeys(container: HTMLElement) {
  return Array.from(container.querySelectorAll("section[data-section]")).map((s) => s.getAttribute("data-section"));
}

function docRoot(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".cv-doc")!;
}

describe("CV templates: v2 sections", () => {
  it.each(TEMPLATE_IDS)("%s renders every section of the rich sample in the template's default order", (template) => {
    const { container } = render(<CVDocument cv={richSampleCV(template)} />);
    expect(headings(container)).toEqual([...TEMPLATE_SECTION_ORDER[template].map((k) => BUILTIN_TITLES[k]), "Courses"]);
    expect(sectionKeys(container)).toEqual([...TEMPLATE_SECTION_ORDER[template], "custom:courses"]);
  });

  it.each(TEMPLATE_IDS)("%s renders the content of the new sections", (template) => {
    const { container } = render(<CVDocument cv={richSampleCV(template)} />);
    const text = container.textContent ?? "";
    for (const expected of [
      "Indonesian (Native)",
      "English (Professional)",
      "Volunteer Data Mentor",
      "Example Community Data Club · Bandung, Indonesia",
      "Jan 2021 – Present",
      "Run monthly beginner sessions on spreadsheets and SQL",
      "Best Internal Dashboard",
      "Nov 2023",
      "Recognised for the weekly delivery-performance dashboard.",
      "Sam Placeholder",
      "Head of Operations, Example Logistics Co.",
      "Line manager",
      "Open data",
      "Trail running",
      "Introduction to Machine Learning",
      "Sample Online Academy",
      "Feb 2023 – Apr 2023",
      "Data Visualisation Basics",
    ]) {
      expect(text).toContain(expected);
    }
    const references = within(container).getByRole("region", { name: "References" });
    expect(within(references).getByRole("link", { name: "sam.placeholder@example.com" })).toHaveAttribute(
      "href",
      "mailto:sam.placeholder@example.com",
    );
    // Organisation bullets are real list items.
    const orgs = within(container).getByRole("region", { name: "Organizations & Volunteering" });
    expect(within(orgs).getAllByRole("listitem")).toHaveLength(2);
    // The second course has a year only and no description.
    const courses = within(container).getByRole("region", { name: "Courses" });
    expect(within(courses).getByText("2022")).toHaveClass("cv-entry-date");
    expect(courses.querySelectorAll(".cv-entry")).toHaveLength(2);
  });

  it("lists languages and interests on one line in ATS Minimal and as tags in Graduate", () => {
    const ats = render(<CVDocument cv={richSampleCV("ats-minimal")} />);
    const atsLanguages = within(ats.container).getByRole("region", { name: "Languages" });
    expect(atsLanguages.querySelector("p.cv-skill-line")).toHaveTextContent("Indonesian (Native), English (Professional)");
    expect(within(ats.container).getByRole("region", { name: "Interests" })).toHaveTextContent("Open data, Trail running");
    ats.unmount();

    const grad = render(<CVDocument cv={richSampleCV("graduate")} />);
    const tags = (name: string) =>
      within(within(grad.container).getByRole("region", { name })).getAllByRole("listitem").map((li) => li.textContent);
    expect(tags("Languages")).toEqual(["Indonesian (Native)", "English (Professional)"]);
    expect(tags("Interests")).toEqual(["Open data", "Trail running"]);
  });

  it("switching templates keeps the content of every section, custom ones included", () => {
    const words = (t: TemplateId) => {
      const { container, unmount } = render(<CVDocument cv={richSampleCV(t)} />);
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const out = new Set<string>();
      while (walker.nextNode()) {
        for (const w of (walker.currentNode.textContent ?? "").split(/[\s·,()|:–]+/)) if (w) out.add(w);
      }
      unmount();
      return out;
    };
    const [a, b, c] = TEMPLATE_IDS.map(words);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });

  it.each(TEMPLATE_IDS)("%s follows the stored section order and appends sections missing from it", (template) => {
    const cv = richSampleCV(template);
    cv.meta.sectionOrder = ["custom:courses", "interests", "skills", "summary"];
    const { container } = render(<CVDocument cv={cv} />);
    const rest = TEMPLATE_SECTION_ORDER[template].filter((k) => !["interests", "skills", "summary"].includes(k));
    expect(sectionKeys(container)).toEqual(["custom:courses", "interests", "skills", "summary", ...rest]);
    expect(headings(container).slice(0, 4)).toEqual(["Courses", "Interests", "Skills", "Professional Summary"]);
  });

  it.each(TEMPLATE_IDS)("%s leaves hidden sections out, built-in and custom alike", (template) => {
    const cv = richSampleCV(template);
    cv.meta.hiddenSections = ["experience", "references", "custom:courses"];
    const { container } = render(<CVDocument cv={cv} />);
    const shown = headings(container);
    for (const hidden of ["Work Experience", "References", "Courses"]) expect(shown).not.toContain(hidden);
    expect(shown).toHaveLength(TEMPLATE_SECTION_ORDER[template].length - 2);
    // Hidden content is not rendered at all (not merely visually hidden).
    expect(container.textContent).not.toContain("Example Logistics Co. · Bandung");
    expect(container.textContent).not.toContain("Introduction to Machine Learning");
    expect(container.textContent).not.toContain("Sam Placeholder");
  });

  it("renders custom sections in creation order, names untitled ones and skips empty ones", () => {
    const cv = createEmptyCV();
    cv.personal.fullName = "Custom Test";
    cv.customSections = [
      {
        id: "vol",
        title: "  Volunteering  ",
        items: [{ id: "v1", title: "", subtitle: "Food bank", startDate: "2020", endDate: "2021-06", description: "- Sorted donations" }],
      },
      { id: "empty", title: "Title only", items: [{ id: "e1", title: " ", subtitle: "", startDate: "", endDate: "", description: "" }] },
      { id: "untitled", title: " ", items: [{ id: "u1", title: "Something", subtitle: "", startDate: "", endDate: "", description: "" }] },
    ];
    const { container, unmount } = render(<CVDocument cv={cv} />);
    expect(headings(container)).toEqual(["Volunteering", "Additional Information"]);
    expect(sectionKeys(container)).toEqual(["custom:vol", "custom:untitled"]);
    const vol = within(container).getByRole("region", { name: "Volunteering" });
    // The subtitle stands in for a missing title; dates and bullets render as usual.
    expect(within(vol).getByRole("heading", { level: 3 })).toHaveTextContent("Food bank");
    expect(vol).toHaveTextContent("2020 – Jun 2021");
    expect(within(vol).getByRole("listitem")).toHaveTextContent("Sorted donations");
    expect(container.querySelector(".cv-section-custom")).not.toBeNull();
    unmount();

    cv.meta.cvLanguage = "id";
    const { container: idContainer } = render(<CVDocument cv={cv} />);
    expect(headings(idContainer)).toEqual(["Volunteering", "Informasi Tambahan"]);
  });

  it("uses the CV language for the new section headings and levels", () => {
    const cv = richSampleCV("modern-professional");
    cv.meta.cvLanguage = "id";
    const { container } = render(<CVDocument cv={cv} />);
    const shown = headings(container);
    for (const heading of ["Bahasa", "Pengalaman Organisasi", "Penghargaan", "Referensi", "Minat"]) {
      expect(shown).toContain(heading);
    }
    expect(container.textContent).toContain("Indonesian (Penutur asli)");
    expect(container.textContent).toContain("English (Profesional)");
    expect(container.textContent).toContain("Jan 2021 – Sekarang");
    expect(container.textContent).toContain("Nov 2023");
    // Custom section titles are user content and never translated.
    expect(shown).toContain("Courses");
  });

  it("omits empty entries in the new sections", () => {
    const cv = createEmptyCV();
    cv.personal.fullName = "Only Name";
    cv.languages.push({ id: "l", name: " ", level: "fluent" });
    cv.organizations.push({ id: "o", role: "", organization: "", location: "", startDate: "", endDate: "", current: true, description: "" });
    cv.awards.push({ id: "a", title: "", issuer: "", date: "", description: " " });
    cv.references.push({ id: "r", name: "", position: "", organization: "", email: "", phone: "", relationship: "" });
    cv.interests.push({ id: "i", name: "" });
    for (const template of TEMPLATE_IDS) {
      cv.meta.template = template;
      const { container, unmount } = render(<CVDocument cv={cv} />);
      expect(headings(container)).toEqual([]);
      expect(container.querySelectorAll(".cv-entry")).toHaveLength(0);
      unmount();
    }
  });

  it("shows a reference's details even without a name", () => {
    const cv = createEmptyCV();
    cv.references.push({
      id: "r",
      name: "",
      position: "Lecturer",
      organization: "Example University",
      email: "",
      phone: "+62 811 0000 0000",
      relationship: "",
    });
    const { container } = render(<CVDocument cv={cv} />);
    const refs = within(container).getByRole("region", { name: "References" });
    expect(within(refs).getByRole("heading", { level: 3 })).toHaveTextContent("Lecturer, Example University");
    expect(refs).toHaveTextContent("+62 811 0000 0000");
  });
});

/* ------------------------------------------------------------------------------------------ */
/* Appearance settings                                                                          */
/* ------------------------------------------------------------------------------------------ */

function styledCV(template: TemplateId, patch: Partial<DocStyle>): CVData {
  const cv = sampleCV(template);
  cv.meta.style = { ...DEFAULT_STYLE, ...patch };
  return cv;
}

describe("CV templates: appearance settings", () => {
  it.each(TEMPLATE_IDS)("%s renders the default style exactly as before (no inline style, template class only)", (template) => {
    const { container } = render(<CVDocument cv={sampleCV(template)} />);
    const root = docRoot(container);
    expect(root.getAttribute("style")).toBeNull();
    expect(root.className).toBe(`cv-doc ${TEMPLATES[template].className}`);
    expect(docStyleVars(DEFAULT_STYLE)).toEqual({});
  });

  it("has a template class for every template", () => {
    expect(TEMPLATE_IDS.map((id) => TEMPLATES[id].className)).toEqual(["tpl-ats", "tpl-modern", "tpl-graduate"]);
  });

  it.each(ACCENT_PRESETS.filter((p) => p.hex))("accent $id sets --cv-accent and the accented class", ({ hex }) => {
    for (const template of TEMPLATE_IDS) {
      const { container, unmount } = render(<CVDocument cv={styledCV(template, { accent: hex })} />);
      const root = docRoot(container);
      expect(root.style.getPropertyValue("--cv-accent")).toBe(hex);
      expect(root).toHaveClass("cv-doc", TEMPLATES[template].className, ACCENTED_CLASS);
      unmount();
    }
  });

  it("normalises custom accent colours and ignores invalid ones", () => {
    expect(docStyleVars({ ...DEFAULT_STYLE, accent: "#7A1F2B" })["--cv-accent"]).toBe("#7a1f2b");
    for (const accent of ["red", "#fff", "#12345g", "url(x)", "#1f3a5f; color: red"]) {
      const { container, unmount } = render(<CVDocument cv={styledCV("modern-professional", { accent })} />);
      expect(docRoot(container).getAttribute("style")).toBeNull();
      expect(docRoot(container)).not.toHaveClass(ACCENTED_CLASS);
      unmount();
    }
  });

  it.each(FONT_OPTIONS.filter((f) => f !== "default"))("font %s sets the body and name font stacks", (font) => {
    const { container } = render(<CVDocument cv={styledCV("modern-professional", { font })} />);
    const root = docRoot(container);
    expect(root.style.getPropertyValue("--cv-font")).toBe(FONT_STACKS[font]);
    expect(root.style.getPropertyValue("--cv-font-name")).toBe(FONT_STACKS[font]);
  });

  it("maps the font options to bundled or template font families", () => {
    expect(FONT_STACKS["plex-sans"]).toMatch(/^"IBM Plex Sans", /);
    expect(FONT_STACKS["plex-serif"]).toMatch(/^"IBM Plex Serif", /);
    expect(FONT_STACKS.sans).toBe("var(--font-sans)");
    expect(FONT_STACKS.serif).toBe("var(--font-serif)");
  });

  it.each([
    ["small", "0.95"],
    ["large", "1.05"],
  ] as const)("text size %s scales every font size by %s", (fontSize, scale) => {
    const { container } = render(<CVDocument cv={styledCV("graduate", { fontSize })} />);
    expect(docRoot(container).style.getPropertyValue("--cv-fs")).toBe(scale);
    expect(Number(scale) * FONT_SIZE_PT.medium).toBeCloseTo(FONT_SIZE_PT[fontSize]);
  });

  it.each(SPACINGS.filter((s) => s !== "normal"))("spacing %s sets the gap scale and line height", (spacing) => {
    const { container } = render(<CVDocument cv={styledCV("ats-minimal", { spacing })} />);
    const root = docRoot(container);
    expect(root.style.getPropertyValue("--cv-gap")).toBe(String(SPACING_SCALE[spacing].gap));
    expect(root.style.getPropertyValue("--cv-lh")).toBe(String(SPACING_SCALE[spacing].lineHeight));
  });

  it.each(MARGINS.filter((m) => m !== "normal"))("margin %s sets the page padding", (margin) => {
    const { container } = render(<CVDocument cv={styledCV("ats-minimal", { margin })} />);
    const root = docRoot(container);
    expect(root.style.getPropertyValue("--cv-pad-x")).toBe(`${MARGIN_MM[margin].x}mm`);
    expect(root.style.getPropertyValue("--cv-pad-y")).toBe(`${MARGIN_MM[margin].y}mm`);
  });

  it("emits only the settings that differ from the default", () => {
    expect(docStyleVars({ ...DEFAULT_STYLE, spacing: "compact" })).toEqual({ "--cv-gap": "0.75", "--cv-lh": "1.3" });
    expect(
      docStyleVars({ accent: "#0f5257", font: "plex-serif", fontSize: "large", spacing: "relaxed", margin: "narrow" }),
    ).toEqual({
      "--cv-accent": "#0f5257",
      "--cv-font": FONT_STACKS["plex-serif"],
      "--cv-font-name": FONT_STACKS["plex-serif"],
      "--cv-fs": "1.05",
      "--cv-gap": "1.3",
      "--cv-lh": "1.5",
      "--cv-pad-x": "12mm",
      "--cv-pad-y": "10mm",
    });
    // Invalid or missing values fall back to the default instead of breaking the document.
    expect(docStyleVars({ font: "comic", fontSize: "huge", margin: 3 } as unknown as DocStyle)).toEqual({});
    expect(docStyleVars(undefined)).toEqual({});
  });

  it("keeps rendering a CV whose stored style is missing", () => {
    const cv = sampleCV("modern-professional");
    (cv.meta as { style?: DocStyle }).style = undefined;
    const { container } = render(<CVDocument cv={cv} />);
    expect(docRoot(container).getAttribute("style")).toBeNull();
    expect(container.textContent).toContain("Alex Example");
  });

  it("falls back to ATS Minimal for an unknown template id", () => {
    const cv = sampleCV();
    cv.meta.template = "retro" as TemplateId;
    const { container } = render(<CVDocument cv={cv} />);
    expect(docRoot(container)).toHaveClass("tpl-ats");
  });
});

/* ------------------------------------------------------------------------------------------ */
/* Cover letters                                                                                */
/* ------------------------------------------------------------------------------------------ */

function letterBlocks(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".cv-letter-body > *")).map((el) => el.className);
}

describe("LetterDocument", () => {
  it.each(TEMPLATE_IDS)("%s renders a business letter with the template's header", (template) => {
    const { container } = render(<LetterDocument letter={sampleLetter(template)} />);
    const root = docRoot(container);
    expect(root).toHaveClass("cv-doc", "cv-letter", TEMPLATES[template].className);
    expect(root.getAttribute("style")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("lang", "en");
    // Header: the sender's name, title and contact details, as on the CV.
    expect(within(container).getByRole("heading", { level: 1 })).toHaveTextContent("Alex Example");
    expect(container.querySelector(".cv-title")).toHaveTextContent("Data Analyst");
    expect(within(container).getByRole("link", { name: "alex@example.com" })).toHaveAttribute("href", "mailto:alex@example.com");
    expect(container.querySelector(".cv-contact")).toHaveTextContent("Bandung, Indonesia");
    expect(container.querySelector("img")).toBeNull();
    // Body in business-letter order.
    expect(letterBlocks(container)).toEqual([
      "cv-letter-date",
      "cv-letter-recipient",
      "cv-letter-subject",
      "cv-letter-greeting",
      "cv-letter-text",
      "cv-letter-signoff",
    ]);
  });

  it("renders every part of the letter", () => {
    const { container } = render(<LetterDocument letter={sampleLetter()} />);
    const q = (sel: string) => container.querySelector(sel);
    expect(q(".cv-letter-date")).toHaveTextContent("2 March 2026");
    expect(q(".cv-letter-recipient")?.textContent).toBe(
      "Jordan Sample\nAnalytics Lead\nExample Analytics Ltd.\nJl. Contoh No. 1\nJakarta 10110\nIndonesia",
    );
    expect(q(".cv-letter-subject")).toHaveTextContent("Subject: Application for the Senior Data Analyst position");
    expect(q(".cv-letter-greeting")).toHaveTextContent("Dear Jordan Sample,");
    const paragraphs = Array.from(container.querySelectorAll(".cv-letter-text p")).map((p) => p.textContent);
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toMatch(/^I’m applying for the Senior Data Analyst position/);
    expect(paragraphs[2]).toMatch(/Thank you for your time\.$/);
    expect(q(".cv-letter-closing")).toHaveTextContent("Kind regards,");
    expect(q(".cv-letter-signature")).toHaveTextContent("Alex Example");
  });

  it("uses the letter's language for the subject label and date, with the place for Indonesian letters", () => {
    const letter = sampleLetter("modern-professional");
    letter.meta.language = "id";
    const { container } = render(<LetterDocument letter={letter} />);
    expect(container.firstElementChild).toHaveAttribute("lang", "id");
    expect(container.querySelector(".cv-letter-date")).toHaveTextContent("Bandung, 2 Maret 2026");
    expect(container.querySelector(".cv-letter-subject")).toHaveTextContent(/^Perihal: Application for/);
    expect(letterDateLine({ ...letter, sender: { ...letter.sender, city: " " } })).toBe("2 Maret 2026");
    expect(letterDateLine({ ...letter, meta: { ...letter.meta, language: "en" } })).toBe("2 March 2026");
  });

  it("keeps single line breaks inside a paragraph and drops blank parts", () => {
    const letter = sampleLetter();
    letter.body = "First line\nsame paragraph\n\n\n  \nSecond paragraph";
    letter.subject = "  ";
    letter.date = "";
    letter.recipient = { name: "", title: "", company: "", address: "\n \n" };
    letter.signature = "";
    const { container } = render(<LetterDocument letter={letter} />);
    expect(Array.from(container.querySelectorAll(".cv-letter-text p")).map((p) => p.textContent)).toEqual([
      "First line\nsame paragraph",
      "Second paragraph",
    ]);
    expect(letterBlocks(container)).toEqual(["cv-letter-greeting", "cv-letter-text", "cv-letter-signoff"]);
    expect(container.textContent).not.toContain("Subject:");
    expect(container.querySelector(".cv-letter-signature")).toBeNull();
  });

  it("renders an empty letter without errors", () => {
    const letter = createEmptyLetter("en");
    letter.date = "";
    letter.greeting = "";
    letter.closing = "";
    const { container } = render(<LetterDocument letter={letter} />);
    expect(container.querySelector(".cv-letter-body")?.childElementCount).toBe(0);
    expect(container.querySelector("h1")).toBeNull();
  });

  it("applies the letter's appearance settings like a CV", () => {
    const letter = sampleLetter("graduate");
    letter.meta.style = { accent: "#4b2e5a", font: "serif", fontSize: "small", spacing: "relaxed", margin: "wide" };
    const { container } = render(<LetterDocument letter={letter} />);
    const root = docRoot(container);
    expect(root).toHaveClass("tpl-graduate", "cv-letter", ACCENTED_CLASS);
    expect(root.style.getPropertyValue("--cv-accent")).toBe("#4b2e5a");
    expect(root.style.getPropertyValue("--cv-font")).toBe(FONT_STACKS.serif);
    expect(root.style.getPropertyValue("--cv-fs")).toBe("0.95");
    expect(root.style.getPropertyValue("--cv-gap")).toBe("1.3");
    expect(root.style.getPropertyValue("--cv-pad-y")).toBe("18mm");
  });
});

/* ------------------------------------------------------------------------------------------ */
/* Preview and print                                                                            */
/* ------------------------------------------------------------------------------------------ */

const cvDoc = (cv: CVData): AnyDoc => ({ kind: "cv", data: cv });
const letterDoc = (letter: LetterData): AnyDoc => ({ kind: "letter", data: letter });

describe("DocumentPreview", () => {
  it("previews a CV as a labelled document and reports its page count", () => {
    const onPagesChange = vi.fn();
    render(<DocumentPreview doc={cvDoc(sampleCV())} onPagesChange={onPagesChange} />);
    const preview = screen.getByRole("document", { name: "CV preview" });
    expect(preview).toHaveTextContent("Alex Example");
    expect(screen.getByText("A4 · 1 page")).toBeInTheDocument();
    expect(onPagesChange).toHaveBeenCalledWith(1);
  });

  it("previews a cover letter with its own label and no empty-state hint", () => {
    const { rerender } = render(<DocumentPreview doc={letterDoc(sampleLetter())} />);
    const preview = screen.getByRole("document", { name: "Cover letter preview" });
    expect(preview).toHaveTextContent("Dear Jordan Sample,");
    expect(preview.querySelector(".cv-letter")).not.toBeNull();

    // A new letter already shows its date, greeting and closing, so no "fill in the form" hint.
    rerender(<DocumentPreview doc={letterDoc(createEmptyLetter("en"))} />);
    expect(screen.queryByText("The preview appears here as you fill in the form.")).toBeNull();
  });

  it("labels the letter preview in the interface language", () => {
    render(
      <I18nProvider initialLang="id">
        <DocumentPreview doc={letterDoc(sampleLetter())} />
      </I18nProvider>,
    );
    expect(screen.getByRole("document", { name: "Pratinjau surat lamaran" })).toBeInTheDocument();
  });

  it("shows the empty-state hint for an empty CV and the photo note for ATS Minimal", () => {
    const { rerender } = render(<DocumentPreview doc={cvDoc(createEmptyCV())} />);
    expect(screen.getByText("The preview appears here as you fill in the form.")).toBeInTheDocument();
    expect(screen.queryByText(/A4 ·/)).toBeNull();

    const cv = sampleCV("ats-minimal");
    cv.personal.photo = PHOTO;
    rerender(<DocumentPreview doc={cvDoc(cv)} />);
    expect(screen.getByText("The ATS Minimal template doesn’t show a photo.")).toBeInTheDocument();
  });

  it("keeps CVPreview working as a wrapper", () => {
    const onPagesChange = vi.fn();
    render(<CVPreview cv={richSampleCV("graduate")} onPagesChange={onPagesChange} />);
    const preview = screen.getByRole("document", { name: "CV preview" });
    expect(within(preview).getByRole("region", { name: "Courses" })).toBeInTheDocument();
    expect(onPagesChange).toHaveBeenCalledWith(1);
  });

  it("places page guides using the style's top and bottom margin", () => {
    const mm = 96 / 25.4;
    // Sheet height (px) for `pages` full printed pages: the margins appear once at the top and bottom.
    const sheet = (pages: number, marginY: number) => (pages * (297 - 2 * marginY) + 2 * marginY) * mm;
    expect(pageBreaks(297 * mm, 14)).toEqual([]);
    // Normal margins: each page holds 297 - 2 × 14 = 269mm of content.
    const normal = pageBreaks(sheet(2, 14), 14);
    expect(normal).toHaveLength(1);
    expect(normal[0] / mm).toBeCloseTo(14 + 269);
    // A little more content starts a third page.
    expect(pageBreaks(sheet(2, 14) + 2 * mm, 14)).toHaveLength(2);
    // Narrow margins hold more per page, wide margins less.
    expect(pageBreaks(sheet(2, 10), 10).map((y) => y / mm)).toEqual([expect.closeTo(10 + 277)]);
    expect(pageBreaks(sheet(2, 18), 18).map((y) => y / mm)).toEqual([expect.closeTo(18 + 261)]);
    // The same sheet needs more pages with wide margins than with narrow ones.
    expect(pageBreaks(sheet(3, 10), 18).length).toBeGreaterThan(pageBreaks(sheet(3, 10), 10).length);
  });
});

describe("PrintRoot", () => {
  it.each(MARGINS)("prints on A4 with the %s margin", (margin) => {
    const cv = sampleCV("modern-professional");
    cv.meta.style = { ...DEFAULT_STYLE, margin };
    const { container } = render(<PrintRoot doc={cvDoc(cv)} />);
    expect(container.querySelector("style")?.textContent).toBe(`@page{size:A4;margin:${MARGIN_MM[margin].y}mm 0}`);
    expect(pageRule(cvDoc(cv))).toBe(`@page{size:A4;margin:${MARGIN_MM[margin].y}mm 0}`);
  });

  it("contains a hidden, control-free copy of the CV", () => {
    const { container } = render(<PrintRoot doc={cvDoc(richSampleCV())} />);
    const root = container.querySelector("#cv-print-root")!;
    expect(root).toHaveClass("hidden");
    expect(root).toHaveTextContent("Alex Example");
    expect(root).toHaveTextContent("Introduction to Machine Learning");
    expect(root.querySelector("button, input, select, textarea")).toBeNull();
    expect(root.querySelector(".cv-doc")).toHaveClass("tpl-ats");
  });

  it("prints cover letters too", () => {
    const letter = sampleLetter("graduate");
    letter.meta.style = { ...DEFAULT_STYLE, margin: "narrow" };
    const { container } = render(<PrintRoot doc={letterDoc(letter)} />);
    expect(container.querySelector("style")?.textContent).toContain("margin:10mm 0");
    const root = container.querySelector("#cv-print-root")!;
    expect(root.querySelector(".cv-letter.tpl-graduate")).not.toBeNull();
    expect(root).toHaveTextContent("Dear Jordan Sample,");
  });
});
