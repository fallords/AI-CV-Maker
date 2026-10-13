import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReducer, useState, type Dispatch } from "react";
import { describe, expect, it } from "vitest";
import {
  DesignPanel,
  TEMPLATE_ACCENTS,
  formatRatio,
  parseHexInput,
  sectionDisplayName,
} from "@/components/builder/DesignPanel";
import { CV_LABELS } from "@/lib/cv-format";
import { cvReducer, type CVAction } from "@/lib/cv-reducer";
import { createEmptyCV, type CVData, type Language, type TemplateId } from "@/lib/cv-schema";
import { TEMPLATE_SECTION_ORDER, allSectionsInOrder, customSectionKey } from "@/lib/cv-sections";
import { DEFAULT_STYLE, contrastOnWhite, sanitizeStyle, type DocStyle } from "@/lib/doc-style";
import { I18nProvider } from "@/lib/i18n";
import { richSampleCV } from "@/lib/sample-cv";

/** CV mode: DesignPanel wired to the real reducer, as the builder does it. */
function renderCV(initial: CVData = richSampleCV(), lang: Language = "en") {
  const state: { cv: CVData; dispatch: Dispatch<CVAction>; patches: Partial<DocStyle>[] } = {
    cv: initial,
    dispatch: () => {},
    patches: [],
  };
  function Harness() {
    const [cv, dispatch] = useReducer(cvReducer, initial);
    state.cv = cv;
    state.dispatch = dispatch;
    return (
      <DesignPanel
        style={cv.meta.style}
        template={cv.meta.template}
        onStyleChange={(patch) => {
          state.patches.push(patch);
          dispatch({ type: "setStyle", patch });
        }}
        cv={cv}
        dispatch={dispatch}
      />
    );
  }
  const utils = render(
    <I18nProvider initialLang={lang}>
      <Harness />
    </I18nProvider>,
  );
  return { ...utils, state, user: userEvent.setup() };
}

/** Letter mode: appearance only, style kept in plain state (like the letter reducer's setStyle). */
function renderStyleOnly(
  initial: DocStyle = { ...DEFAULT_STYLE },
  template: TemplateId = "modern-professional",
  lang: Language = "en",
) {
  const state: { style: DocStyle; patches: Partial<DocStyle>[] } = { style: initial, patches: [] };
  function Harness() {
    const [style, setStyle] = useState(initial);
    state.style = style;
    return (
      <DesignPanel
        style={style}
        template={template}
        onStyleChange={(patch) => {
          state.patches.push(patch);
          setStyle((s) => sanitizeStyle({ ...s, ...patch }));
        }}
      />
    );
  }
  const utils = render(
    <I18nProvider initialLang={lang}>
      <Harness />
    </I18nProvider>,
  );
  return { ...utils, state, user: userEvent.setup() };
}

const group = (name: string) => screen.getByRole("group", { name });
const sectionList = () => screen.getByRole("list", { name: "CV sections in order" });
const rowNames = () =>
  within(sectionList())
    .getAllByTestId("section-name")
    .map((el) => el.textContent);
const row = (name: string) => {
  const li = within(sectionList())
    .getAllByRole("listitem")
    .find((el) => within(el).getByTestId("section-name").textContent === name);
  if (!li) throw new Error(`No row for ${name}`);
  return li;
};
const announcer = () => screen.getByTestId("design-announcer");

describe("helpers", () => {
  it("parses colour codes with or without #, short codes only when allowed", () => {
    expect(parseHexInput("#21507A")).toBe("#21507a");
    expect(parseHexInput(" 21507a ")).toBe("#21507a");
    expect(parseHexInput("#abc")).toBeNull();
    expect(parseHexInput("#abc", true)).toBe("#aabbcc");
    expect(parseHexInput("#12345")).toBeNull();
    expect(parseHexInput("blue")).toBeNull();
    expect(parseHexInput("")).toBeNull();
  });

  it("rounds contrast ratios down so values just under 4.5 never read as 4.5", () => {
    expect(formatRatio(4.4999, "en")).toBe("4.4");
    expect(formatRatio(4.5, "en")).toBe("4.5");
    expect(formatRatio(12.63, "id")).toBe("12,6");
    expect(formatRatio(21, "en")).toBe("21.0");
  });

  it("names built-in sections with the CV heading in the given language and custom sections by title", () => {
    const cv = richSampleCV();
    expect(sectionDisplayName(cv, "experience", "en", "Untitled")).toBe("Work Experience");
    expect(sectionDisplayName(cv, "experience", "id", "Untitled")).toBe("Pengalaman Kerja");
    expect(sectionDisplayName(cv, customSectionKey("courses"), "en", "Untitled")).toBe("Courses");
    cv.customSections[0].title = "   ";
    expect(sectionDisplayName(cv, customSectionKey("courses"), "en", "Untitled")).toBe("Untitled");
  });
});

describe("DesignPanel appearance", () => {
  it("labels every control and reflects the current style", () => {
    renderStyleOnly();
    const accent = group("Accent colour");
    const radios = within(accent).getAllByRole("radio");
    expect(radios.map((r) => r.closest("label")?.textContent)).toEqual([
      "Template colour",
      "Ink",
      "Prussian blue",
      "Forest green",
      "Teal",
      "Burgundy",
      "Plum",
      "Graphite",
      "Custom colour",
    ]);
    expect(within(accent).getByRole("radio", { name: "Template colour" })).toBeChecked();
    expect(accent).toHaveAccessibleDescription(
      "Used for the name, headings and lines. Where it appears depends on the template.",
    );

    expect(within(group("Font")).getByRole("radio", { name: "Template font" })).toBeChecked();
    expect(within(group("Font")).getAllByRole("radio")).toHaveLength(5);
    expect(within(group("Text size")).getByRole("radio", { name: "Medium 10 pt" })).toBeChecked();
    expect(within(group("Text size")).getByRole("radio", { name: "Small 9.5 pt" })).not.toBeChecked();
    expect(within(group("Spacing")).getByRole("radio", { name: "Normal" })).toBeChecked();
    expect(within(group("Page margins")).getByRole("radio", { name: "Normal 16 mm" })).toBeChecked();
    expect(within(group("Page margins")).getByRole("radio", { name: "Wide 20 mm" })).not.toBeChecked();

    // No section manager without a CV (cover letters).
    expect(screen.queryByTestId("section-manager")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Sections" })).toBeNull();
  });

  it("applies a preset accent and the other appearance options", async () => {
    const { state, user } = renderStyleOnly();
    await user.click(screen.getByRole("radio", { name: "Burgundy" }));
    expect(state.patches.at(-1)).toEqual({ accent: "#7a1f2b" });
    expect(screen.getByRole("radio", { name: "Burgundy" })).toBeChecked();
    // Presets never need the custom colour fields.
    expect(screen.queryByLabelText("Colour code")).toBeNull();

    await user.click(screen.getByRole("radio", { name: "IBM Plex Serif" }));
    await user.click(screen.getByRole("radio", { name: "Large 10.5 pt" }));
    await user.click(screen.getByRole("radio", { name: "Compact" }));
    await user.click(screen.getByRole("radio", { name: "Narrow 12 mm" }));
    expect(state.style).toEqual({
      accent: "#7a1f2b",
      font: "plex-serif",
      fontSize: "large",
      spacing: "compact",
      margin: "narrow",
    });
    expect(screen.getByRole("radio", { name: "Large 10.5 pt" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Template colour" }));
    expect(state.style.accent).toBe("");
  });

  it("supports arrow keys inside a radio group", async () => {
    const { state, user } = renderStyleOnly();
    screen.getByRole("radio", { name: "Normal" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(state.style.spacing).toBe("relaxed");
    expect(screen.getByRole("radio", { name: "Relaxed" })).toHaveFocus();
  });

  it("starts a custom colour from the colour in use and warns when contrast is below 4.5:1", async () => {
    const { state, user } = renderStyleOnly(undefined, "modern-professional");
    await user.click(screen.getByRole("radio", { name: "Custom colour" }));
    expect(state.style.accent).toBe(TEMPLATE_ACCENTS["modern-professional"]);
    const code = screen.getByLabelText("Colour code");
    expect(code).toHaveValue("#245740");
    expect(screen.getByLabelText("Colour")).toHaveValue("#245740");
    expect(screen.queryByTestId("contrast-warning")).toBeNull();

    await user.clear(code);
    await user.type(code, "#ffcc00");
    expect(state.style.accent).toBe("#ffcc00");
    const ratio = formatRatio(contrastOnWhite("#ffcc00"), "en");
    expect(screen.getByTestId("contrast-ratio")).toHaveTextContent(`Contrast on white paper: ${ratio}:1`);
    const warning = screen.getByTestId("contrast-warning");
    expect(warning).toHaveTextContent("This colour is too light for text on white paper.");
    expect(code).toHaveAccessibleDescription(expect.stringContaining("This colour is too light"));
    expect(screen.getByRole("radio", { name: "Custom colour" })).toBeChecked();

    // A dark colour clears the warning.
    await user.clear(code);
    await user.type(code, "#2b2b6e");
    expect(state.style.accent).toBe("#2b2b6e");
    expect(screen.queryByTestId("contrast-warning")).toBeNull();
  });

  it("keeps Custom selected while typing a code that matches a preset", async () => {
    const { state, user } = renderStyleOnly();
    await user.click(screen.getByRole("radio", { name: "Custom colour" }));
    const code = screen.getByLabelText("Colour code");
    await user.clear(code);
    await user.type(code, "#7a1f2b");
    expect(state.style.accent).toBe("#7a1f2b");
    expect(screen.getByRole("radio", { name: "Custom colour" })).toBeChecked();
    expect(screen.getByLabelText("Colour code")).toBeInTheDocument();
  });

  it("only applies complete codes, explains invalid ones and expands short ones on blur", async () => {
    const { state, user } = renderStyleOnly({ ...DEFAULT_STYLE, accent: "#123456" });
    // A stored non-preset colour opens with Custom selected.
    expect(screen.getByRole("radio", { name: "Custom colour" })).toBeChecked();
    const code = screen.getByLabelText("Colour code");
    expect(code).toHaveValue("#123456");

    await user.clear(code);
    await user.type(code, "#12");
    expect(state.style.accent).toBe("#123456");
    expect(screen.queryByRole("alert")).toBeNull();
    await user.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a six-digit colour code, for example #21507a.");
    expect(code).toHaveAttribute("aria-invalid", "true");
    expect(state.style.accent).toBe("#123456");

    await user.clear(code);
    await user.type(code, "abc{Enter}");
    expect(state.style.accent).toBe("#aabbcc");
    expect(code).toHaveValue("#aabbcc");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(code).not.toHaveAttribute("aria-invalid");
  });

  it("follows the colour picker", () => {
    const { state } = renderStyleOnly({ ...DEFAULT_STYLE, accent: "#123456" });
    fireEvent.input(screen.getByLabelText("Colour"), { target: { value: "#0f5257" } });
    expect(state.style.accent).toBe("#0f5257");
    expect(screen.getByLabelText("Colour code")).toHaveValue("#0f5257");
    // Still the custom colour, even though it matches the Teal preset.
    expect(screen.getByRole("radio", { name: "Custom colour" })).toBeChecked();
  });

  it("resets the appearance and announces it", async () => {
    const { state, user } = renderStyleOnly({
      accent: "#4b2e5a",
      font: "serif",
      fontSize: "small",
      spacing: "relaxed",
      margin: "wide",
    });
    expect(screen.getByRole("radio", { name: "Plum" })).toBeChecked();
    const reset = screen.getByRole("button", { name: "Reset appearance" });
    expect(reset).not.toHaveAttribute("aria-disabled");
    await user.click(reset);
    expect(state.style).toEqual(DEFAULT_STYLE);
    expect(announcer()).toHaveTextContent("Appearance is back to the template’s defaults.");
    // Focus stays on the button, which now reports that there is nothing to reset.
    expect(reset).toHaveFocus();
    expect(reset).toHaveAttribute("aria-disabled", "true");
    const before = state.patches.length;
    await user.click(reset);
    expect(state.patches).toHaveLength(before);
  });

  it("is translated into Indonesian, including decimal commas", () => {
    renderStyleOnly({ ...DEFAULT_STYLE, accent: "#eeeeee" }, "graduate", "id");
    expect(within(group("Warna aksen")).getByRole("radio", { name: "Warna lain" })).toBeChecked();
    expect(within(group("Ukuran teks")).getByRole("radio", { name: "Kecil 9,5 pt" })).toBeInTheDocument();
    expect(within(group("Margin halaman")).getByRole("radio", { name: "Sempit 12 mm" })).toBeInTheDocument();
    expect(screen.getByLabelText("Kode warna")).toHaveValue("#eeeeee");
    expect(screen.getByTestId("contrast-ratio")).toHaveTextContent(/^Kontras di atas kertas putih: \d+,\d:1$/);
    expect(screen.getByTestId("contrast-warning")).toHaveTextContent("terlalu terang");
  });
});

describe("DesignPanel section manager", () => {
  it("lists every section in allSectionsInOrder order with readable names", () => {
    const cv = richSampleCV("graduate");
    renderCV(cv);
    const labels = CV_LABELS.en;
    const expected = allSectionsInOrder(cv).map((key) =>
      key === "custom:courses" ? "Courses" : labels[key as keyof typeof labels],
    );
    expect(rowNames()).toEqual(expected);
    expect(rowNames()[0]).toBe("Professional Summary");
    expect(rowNames()[1]).toBe("Education");
    expect(rowNames().at(-1)).toBe("Courses");
    expect(screen.getByRole("heading", { level: 2, name: "Sections" })).toBeInTheDocument();
  });

  it("uses the interface language for built-in names, whatever the CV language", () => {
    const cv = richSampleCV();
    cv.meta.cvLanguage = "en";
    renderCV(cv, "id");
    const list = screen.getByRole("list", { name: "Urutan bagian CV" });
    expect(within(list).getAllByTestId("section-name")[0]).toHaveTextContent("Ringkasan Profesional");
    expect(screen.getByRole("button", { name: "Pindahkan Pengalaman Kerja ke bawah" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tampilkan Minat" })).toHaveAttribute("aria-pressed", "true");
  });

  it("moves sections, keeps focus on the moved row and announces the new position", async () => {
    const { state, user } = renderCV(richSampleCV());
    const total = allSectionsInOrder(state.cv).length;
    expect(screen.getByRole("button", { name: "Move Professional Summary up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Courses down" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Move Work Experience up" }));
    expect(rowNames().slice(0, 2)).toEqual(["Work Experience", "Professional Summary"]);
    expect(state.cv.meta.sectionOrder.slice(0, 2)).toEqual(["experience", "summary"]);
    expect(announcer()).toHaveTextContent(`Work Experience moved to position 1 of ${total}.`);
    // At the top the up button is disabled, so focus moves to the row's down button.
    expect(screen.getByRole("button", { name: "Move Work Experience down" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(rowNames().slice(0, 2)).toEqual(["Professional Summary", "Work Experience"]);
    expect(screen.getByRole("button", { name: "Move Work Experience down" })).toHaveFocus();
    expect(announcer()).toHaveTextContent(`Work Experience moved to position 2 of ${total}.`);

    await user.keyboard("{Enter}");
    expect(rowNames().slice(1, 3)).toEqual(["Education", "Work Experience"]);
    expect(screen.getByRole("button", { name: "Move Work Experience down" })).toHaveFocus();
  });

  it("shows and hides sections with a pressed toggle", async () => {
    const { state, user } = renderCV(richSampleCV());
    const toggle = screen.getByRole("button", { name: "Show Awards" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("Show");
    expect(within(row("Awards")).queryByText("Hidden from the CV")).toBeNull();

    await user.click(toggle);
    expect(state.cv.meta.hiddenSections).toEqual(["awards"]);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(within(row("Awards")).getByText("Hidden from the CV")).toBeInTheDocument();
    // Hidden sections stay in the list and keep their place.
    expect(rowNames()).toContain("Awards");

    await user.click(screen.getByRole("button", { name: "Show Courses" }));
    expect(state.cv.meta.hiddenSections).toEqual(["awards", customSectionKey("courses")]);

    await user.click(toggle);
    expect(state.cv.meta.hiddenSections).toEqual([customSectionKey("courses")]);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("resets to the template order without touching hidden sections", async () => {
    const cv = richSampleCV("modern-professional");
    cv.meta.hiddenSections = ["interests"];
    const { state, user } = renderCV(cv);
    const reset = screen.getByRole("button", { name: "Reset to template order" });
    expect(reset).toHaveAttribute("aria-disabled", "true");
    await user.click(reset);
    expect(state.cv.meta.sectionOrder).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Move Interests up" }));
    expect(reset).not.toHaveAttribute("aria-disabled");
    await user.click(reset);
    expect(state.cv.meta.sectionOrder).toEqual([]);
    expect(rowNames().slice(0, 11)).toEqual(TEMPLATE_SECTION_ORDER["modern-professional"].map((k) => CV_LABELS.en[k]));
    expect(state.cv.meta.hiddenSections).toEqual(["interests"]);
    expect(announcer()).toHaveTextContent("Sections are back in the template’s order.");
    expect(reset).toHaveFocus();
    expect(reset).toHaveAttribute("aria-disabled", "true");
  });

  it("treats a stored order equal to the template order as already reset", () => {
    const cv = richSampleCV("ats-minimal");
    cv.meta.sectionOrder = allSectionsInOrder(cv);
    renderCV(cv);
    expect(screen.getByRole("button", { name: "Reset to template order" })).toHaveAttribute("aria-disabled", "true");
  });

  it("notes empty sections and names untitled custom sections", () => {
    const cv = createEmptyCV();
    const withCustom = cvReducer(cv, { type: "addCustomSection", id: "blank", title: "" });
    renderCV(withCustom);
    expect(within(row("Professional Summary")).getByText(/Nothing filled in yet/)).toBeInTheDocument();
    expect(within(row("Untitled section")).getByText(/Nothing filled in yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Untitled section" })).toBeInTheDocument();
  });

  it("follows section changes made elsewhere (custom section added, renamed, removed)", () => {
    const { state } = renderCV(richSampleCV());
    act(() => state.dispatch({ type: "addCustomSection", id: "pubs", title: "Publications" }));
    expect(rowNames().at(-1)).toBe("Publications");
    act(() => state.dispatch({ type: "renameCustomSection", id: "pubs", title: "Papers" }));
    expect(rowNames().at(-1)).toBe("Papers");
    act(() => state.dispatch({ type: "removeCustomSection", id: "pubs" }));
    expect(rowNames()).not.toContain("Papers");
  });

  it("changes the CV style through the reducer in CV mode", async () => {
    const { state, user } = renderCV(richSampleCV());
    await user.click(screen.getByRole("radio", { name: "Graphite" }));
    await user.click(screen.getByRole("radio", { name: "Relaxed" }));
    expect(state.cv.meta.style).toEqual({ ...DEFAULT_STYLE, accent: "#333333", spacing: "relaxed" });
  });
});
