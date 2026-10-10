import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CVDocument, TEMPLATES } from "@/components/templates";
import { TEMPLATE_IDS, createEmptyCV, type CVData } from "@/lib/cv-schema";
import { sampleCV } from "@/lib/sample-cv";

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
