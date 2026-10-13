import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReducer, type Dispatch } from "react";
import { describe, expect, it } from "vitest";

// These tests drive the whole form (dozens of fields) with userEvent, which is slow in jsdom.
const SLOW = { timeout: 30_000 };
import { CVForm } from "@/components/cv-form/CVForm";
import { cvReducer, type CVAction } from "@/lib/cv-reducer";
import { MAX_CUSTOM_SECTIONS, createEmptyCV, type CVData, type Language } from "@/lib/cv-schema";
import { allSectionsInOrder, customSectionKey, sectionDomId } from "@/lib/cv-sections";
import { I18nProvider } from "@/lib/i18n";
import { richSampleCV } from "@/lib/sample-cv";

/** Renders CVForm with the real reducer and exposes the latest CV state and dispatch. */
function renderForm(initial: CVData = createEmptyCV(), lang: Language = "en") {
  const state: { cv: CVData; dispatch: Dispatch<CVAction> } = { cv: initial, dispatch: () => {} };
  function Harness() {
    const [cv, dispatch] = useReducer(cvReducer, initial);
    state.cv = cv;
    state.dispatch = dispatch;
    return <CVForm cv={cv} dispatch={dispatch} />;
  }
  const utils = render(
    <I18nProvider initialLang={lang}>
      <Harness />
    </I18nProvider>,
  );
  return { ...utils, state };
}

const section = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No section #${id}`);
  return el;
};
const sectionIds = (container: HTMLElement) => Array.from(container.querySelectorAll("section")).map((s) => s.id);
const navLinks = () =>
  within(screen.getByRole("navigation", { name: "CV sections" }))
    .getAllByRole("link")
    .map((a) => a.getAttribute("href"));

describe("CVForm section order", SLOW, () => {
  it.each(["ats-minimal", "modern-professional", "graduate"] as const)(
    "renders personal first, then every section in the %s order, with matching nav links",
    (template) => {
      const cv = richSampleCV(template);
      const { container } = renderForm(cv);
      const expected = ["personal", ...allSectionsInOrder(cv).map(sectionDomId)];
      expect(sectionIds(container)).toEqual(expected);
      expect(expected).toContain("custom-courses");
      expect(navLinks()).toEqual(expected.map((id) => `#${id}`));
      // Every section is labelled by its own heading.
      for (const id of expected) {
        expect(section(id)).toHaveAttribute("aria-labelledby", `${id}-title`);
      }
    },
  );

  it("follows a stored order and updates when sections are moved", () => {
    const cv = richSampleCV();
    cv.meta.sectionOrder = ["interests", customSectionKey("courses"), "summary"];
    const { container, state } = renderForm(cv);
    expect(sectionIds(container).slice(0, 4)).toEqual(["personal", "interests", "custom-courses", "summary"]);

    act(() => state.dispatch({ type: "moveSection", key: "summary", direction: -1 }));
    expect(sectionIds(container).slice(0, 4)).toEqual(["personal", "interests", "summary", "custom-courses"]);
  });

  it("notes hidden sections in the section and in the nav, and keeps their content editable", () => {
    const cv = richSampleCV();
    cv.meta.hiddenSections = ["awards", customSectionKey("courses")];
    renderForm(cv);
    for (const id of ["awards", "custom-courses"]) {
      expect(within(section(id)).getByTestId("section-hidden-note")).toHaveTextContent(
        "Hidden from your CV. What you enter here is kept. To show the section again, use the Design tab.",
      );
    }
    expect(within(section("experience")).queryByTestId("section-hidden-note")).toBeNull();
    expect(within(section("awards")).getByLabelText("Award")).toHaveValue("Best Internal Dashboard");

    const nav = screen.getByRole("navigation", { name: "CV sections" });
    expect(within(nav).getByRole("link", { name: "Awards (hidden from CV)" })).toHaveAttribute("href", "#awards");
    expect(within(nav).getByRole("link", { name: "Courses (hidden from CV)" })).toHaveAttribute(
      "href",
      "#custom-courses",
    );
    expect(within(nav).getByRole("link", { name: "Languages" })).toBeInTheDocument();
  });
});

describe("new section editors", SLOW, () => {
  it("edits languages with a name and a proficiency level", async () => {
    const user = userEvent.setup();
    const { state } = renderForm();
    const languages = section("languages");
    expect(within(languages).getByRole("heading", { level: 2, name: "Languages" })).toBeInTheDocument();
    expect(within(languages).getByText("No languages added yet.")).toBeInTheDocument();

    await user.click(within(languages).getByRole("button", { name: "Add language" }));
    const name = within(languages).getByLabelText("Language");
    expect(name).toHaveFocus();
    await user.type(name, "English");
    await user.selectOptions(within(languages).getByLabelText("Proficiency (optional)"), "Fluent");

    expect(state.cv.languages).toEqual([expect.objectContaining({ name: "English", level: "fluent" })]);
    expect(
      within(languages).getAllByRole("option").map((o) => o.textContent),
    ).toEqual(["No label", "Basic", "Conversational", "Professional", "Fluent", "Native"]);
  });

  it("edits organizations, including the still-active toggle and date checks", async () => {
    const user = userEvent.setup();
    const { state } = renderForm();
    const orgs = section("organizations");
    await user.click(within(orgs).getByRole("button", { name: "Add organization" }));
    await user.type(within(orgs).getByLabelText("Role"), "Treasurer");
    await user.type(within(orgs).getByLabelText("Organization"), "Student Union");
    expect(within(orgs).getByRole("heading", { level: 3 })).toHaveTextContent("Treasurer · Student Union");

    await user.selectOptions(within(orgs).getByLabelText("Start date: Year"), "2022");
    await user.selectOptions(within(orgs).getByLabelText("End date: Year"), "2020");
    expect(within(orgs).getByRole("alert")).toHaveTextContent("The end date is before the start date.");

    await user.click(within(orgs).getByLabelText("I’m still active here"));
    expect(state.cv.organizations[0]).toMatchObject({
      role: "Treasurer",
      organization: "Student Union",
      startDate: "2022",
      endDate: "",
      current: true,
    });
    expect(within(orgs).getByLabelText("End date: Year")).toBeDisabled();
    expect(within(orgs).queryByRole("alert")).toBeNull();
  });

  it("edits awards", async () => {
    const user = userEvent.setup();
    const { state } = renderForm();
    const awards = section("awards");
    await user.click(within(awards).getByRole("button", { name: "Add award" }));
    await user.type(within(awards).getByLabelText("Award"), "Best Final Project");
    await user.type(within(awards).getByLabelText("Awarded by"), "Example University");
    await user.selectOptions(within(awards).getByLabelText("Date: Month"), "06");
    await user.selectOptions(within(awards).getByLabelText("Date: Year"), "2024");
    await user.type(within(awards).getByLabelText("Description"), "Top score in the cohort.");
    expect(state.cv.awards[0]).toMatchObject({
      title: "Best Final Project",
      issuer: "Example University",
      date: "2024-06",
      description: "Top score in the cohort.",
    });
  });

  it("edits references and checks the email address", async () => {
    const user = userEvent.setup();
    const { state } = renderForm();
    const refs = section("references");
    expect(within(refs).getByText(/Ask people before you list them/)).toBeInTheDocument();
    await user.click(within(refs).getByRole("button", { name: "Add reference" }));
    await user.type(within(refs).getByLabelText("Name"), "Sam Placeholder");
    await user.type(within(refs).getByLabelText("Position"), "Head of Operations");
    await user.type(within(refs).getByLabelText("Organization"), "Example Co.");
    await user.type(within(refs).getByLabelText("Relationship"), "Line manager");
    await user.type(within(refs).getByLabelText("Phone number"), "+62 812 0000 0000");
    const email = within(refs).getByLabelText("Email");
    expect(email).toHaveAttribute("autocomplete", "off");
    await user.type(email, "sam@");
    expect(email).toHaveAttribute("aria-invalid", "true");
    await user.type(email, "example.com");
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(state.cv.references[0]).toMatchObject({
      name: "Sam Placeholder",
      position: "Head of Operations",
      organization: "Example Co.",
      email: "sam@example.com",
      phone: "+62 812 0000 0000",
      relationship: "Line manager",
    });
  });

  it("edits interests as a compact list with reorder and remove", async () => {
    const user = userEvent.setup();
    const { state } = renderForm();
    const interests = section("interests");
    const add = within(interests).getByRole("button", { name: "Add interest" });
    await user.click(add);
    await user.type(within(interests).getAllByLabelText("Interest")[0], "Chess");
    await user.click(add);
    const second = within(interests).getAllByLabelText("Interest")[1];
    expect(second).toHaveFocus();
    await user.type(second, "Hiking");
    expect(within(interests).queryByRole("heading", { level: 3 })).toBeNull();

    await user.click(within(interests).getByRole("button", { name: "Move up: Hiking" }));
    expect(state.cv.interests.map((i) => i.name)).toEqual(["Hiking", "Chess"]);

    // Filled entries ask first; focus then moves to the neighbouring entry.
    await user.click(within(interests).getByRole("button", { name: "Remove: Hiking" }));
    await user.click(within(screen.getByRole("dialog", { name: "Remove this entry?" })).getByRole("button", { name: "Remove" }));
    expect(state.cv.interests.map((i) => i.name)).toEqual(["Chess"]);
    expect(within(interests).getByLabelText("Interest")).toHaveFocus();

    // Empty entries go straight away; with none left, focus returns to the add button.
    await user.clear(within(interests).getByLabelText("Interest"));
    await user.click(within(interests).getByRole("button", { name: "Remove: Untitled" }));
    expect(state.cv.interests).toEqual([]);
    expect(within(interests).getByRole("button", { name: "Add interest" })).toHaveFocus();
  });
});

describe("custom sections", SLOW, () => {
  async function addCustomSection(user: ReturnType<typeof userEvent.setup>, title: string) {
    await user.click(screen.getByRole("button", { name: "Add custom section" }));
    const dialog = screen.getByRole("dialog", { name: "Add a custom section" });
    if (title) await user.type(within(dialog).getByLabelText("Section title"), title);
    await user.click(within(dialog).getByRole("button", { name: "Add section" }));
  }

  it("asks for a title, then adds the section with a first entry and focuses it", async () => {
    const user = userEvent.setup();
    const { container, state } = renderForm();

    await addCustomSection(user, "");
    const dialog = screen.getByRole("dialog", { name: "Add a custom section" });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter a title for the section.");
    expect(state.cv.customSections).toEqual([]);

    await user.type(within(dialog).getByLabelText("Section title"), "  Courses ");
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("dialog")).toBeNull();

    expect(state.cv.customSections).toHaveLength(1);
    const created = state.cv.customSections[0];
    expect(created.title).toBe("Courses");
    expect(created.items).toHaveLength(1);

    const domId = `custom-${created.id}`;
    expect(sectionIds(container).at(-1)).toBe(domId);
    const card = section(domId);
    expect(within(card).getByRole("heading", { level: 2, name: "Courses" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "CV sections" })).getByRole("link", { name: "Courses" })).toHaveAttribute(
      "href",
      `#${domId}`,
    );
    expect(within(card).getByLabelText("Title")).toHaveFocus();
  });

  it("hints when the title repeats an existing section", async () => {
    const user = userEvent.setup();
    renderForm(richSampleCV());
    await user.click(screen.getByRole("button", { name: "Add custom section" }));
    const dialog = screen.getByRole("dialog", { name: "Add a custom section" });
    const input = within(dialog).getByLabelText("Section title");
    await user.type(input, "languages");
    expect(within(dialog).getByText("You already have a section called “languages”.")).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "Courses");
    expect(within(dialog).getByText("You already have a section called “Courses”.")).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "Publications");
    expect(within(dialog).queryByText(/You already have a section/)).toBeNull();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("edits, reorders and removes entries of a custom section", async () => {
    const user = userEvent.setup();
    const { state } = renderForm(richSampleCV());
    const card = section("custom-courses");
    // Entry headings read "<n>. <title> · <subtitle>"; the zero-padded index is decorative.
    const headings = within(card).getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveAccessibleName(/^1\.\s?Introduction to Machine Learning · Sample Online Academy$/);
    expect(headings[1]).toHaveAccessibleName(/^2\.\s?Data Visualisation Basics · Example Learning Platform$/);

    await user.click(within(card).getByRole("button", { name: "Add entry" }));
    const titles = within(card).getAllByLabelText("Title");
    expect(titles[2]).toHaveFocus();
    await user.type(titles[2], "SQL for Analysts");
    await user.type(within(card).getAllByLabelText("Subtitle")[2], "Example Academy");
    await user.selectOptions(within(card).getAllByLabelText("Start date: Year")[2], "2024");
    await user.selectOptions(within(card).getAllByLabelText("End date: Year")[2], "2023");
    expect(within(card).getByRole("alert")).toHaveTextContent("The end date is before the start date.");
    await user.type(within(card).getAllByLabelText("Description")[2], "- Window functions");

    await user.click(within(card).getByRole("button", { name: "Move up: SQL for Analysts · Example Academy" }));
    const items = () => state.cv.customSections[0].items.map((i) => i.title);
    expect(items()).toEqual(["Introduction to Machine Learning", "SQL for Analysts", "Data Visualisation Basics"]);
    expect(state.cv.customSections[0].items[1]).toMatchObject({
      subtitle: "Example Academy",
      startDate: "2024",
      endDate: "2023",
      description: "- Window functions",
    });

    await user.click(within(card).getByRole("button", { name: "Remove: Data Visualisation Basics · Example Learning Platform" }));
    await user.click(within(screen.getByRole("dialog", { name: "Remove this entry?" })).getByRole("button", { name: "Remove" }));
    expect(items()).toEqual(["Introduction to Machine Learning", "SQL for Analysts"]);
  });

  it("renames a custom section and flags an empty title", async () => {
    const user = userEvent.setup();
    const { state } = renderForm(richSampleCV());
    const card = section("custom-courses");
    const title = within(card).getByLabelText("Section title");
    await user.clear(title);
    expect(within(card).getByRole("heading", { level: 2, name: "Untitled section" })).toBeInTheDocument();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(within(card).getByRole("alert")).toHaveTextContent("Enter a title");

    await user.type(title, "Training");
    expect(state.cv.customSections[0].title).toBe("Training");
    expect(within(card).getByRole("heading", { level: 2, name: "Training" })).toBeInTheDocument();
    expect(title).not.toHaveAttribute("aria-invalid");
  });

  it("deletes a custom section only after confirmation", async () => {
    const user = userEvent.setup();
    const cv = richSampleCV();
    cv.meta.sectionOrder = allSectionsInOrder(cv);
    cv.meta.hiddenSections = [customSectionKey("courses")];
    const { state } = renderForm(cv);

    const del = within(section("custom-courses")).getByRole("button", { name: "Delete section: Courses" });
    await user.click(del);
    let dialog = screen.getByRole("dialog", { name: "Delete this section?" });
    expect(dialog).toHaveTextContent("The “Courses” section and everything in it will be removed from your CV.");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(state.cv.customSections).toHaveLength(1);

    await user.click(del);
    dialog = screen.getByRole("dialog", { name: "Delete this section?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete section" }));
    expect(state.cv.customSections).toEqual([]);
    expect(state.cv.meta.sectionOrder).not.toContain(customSectionKey("courses"));
    expect(state.cv.meta.hiddenSections).toEqual([]);
    expect(document.getElementById("custom-courses")).toBeNull();
    expect(screen.getByRole("button", { name: "Add custom section" })).toHaveFocus();
  });

  it("stops offering new sections at the limit", () => {
    const cv = createEmptyCV();
    cv.customSections = Array.from({ length: MAX_CUSTOM_SECTIONS }, (_, i) => ({
      id: `s${i}`,
      title: `Section ${i + 1}`,
      items: [],
    }));
    renderForm(cv);
    expect(screen.getByRole("button", { name: "Add custom section" })).toBeDisabled();
    expect(screen.getByText(`You’ve added ${MAX_CUSTOM_SECTIONS} custom sections, which is the maximum.`)).toBeInTheDocument();
  });
});

describe("Indonesian UI", SLOW, () => {
  it("labels the new sections and controls in Indonesian", async () => {
    const user = userEvent.setup();
    const cv = richSampleCV();
    cv.meta.hiddenSections = ["interests"];
    renderForm(cv, "id");
    const nav = screen.getByRole("navigation", { name: "Bagian CV" });
    for (const name of ["Bahasa", "Pengalaman organisasi", "Penghargaan", "Referensi", "Courses"]) {
      expect(within(nav).getByRole("link", { name })).toBeInTheDocument();
    }
    expect(within(nav).getByRole("link", { name: "Minat (disembunyikan dari CV)" })).toBeInTheDocument();
    expect(within(section("interests")).getByTestId("section-hidden-note")).toHaveTextContent("Disembunyikan dari CV.");
    expect(within(section("languages")).getAllByLabelText("Tingkat kemahiran (opsional)")[0]).toHaveDisplayValue(
      "Penutur asli",
    );
    expect(within(section("organizations")).getByLabelText("Saya masih aktif di sini")).toBeChecked();

    await user.click(within(section("custom-courses")).getByRole("button", { name: "Hapus bagian: Courses" }));
    expect(screen.getByRole("dialog", { name: "Hapus bagian ini?" })).toHaveTextContent(
      "Bagian “Courses” beserta seluruh isinya akan dihapus dari CV Anda.",
    );
    await user.click(screen.getByRole("button", { name: "Batal" }));

    await user.click(screen.getByRole("button", { name: "Tambah bagian khusus" }));
    expect(screen.getByRole("dialog", { name: "Tambah bagian khusus" })).toBeInTheDocument();
  });
});
