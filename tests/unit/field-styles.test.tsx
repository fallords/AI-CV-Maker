import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LetterForm } from "@/components/letter/LetterForm";
import { SelectField, TextField } from "@/components/ui/Field";
import { MonthField } from "@/components/ui/MonthField";
import { inputClass, selectClass } from "@/components/ui/styles";
import { I18nProvider } from "@/lib/i18n";
import { sampleLetter, richSampleCV } from "@/lib/sample-cv";

const noop = () => {};
const classes = (className: string) => className.split(/\s+/);

describe("form control padding", () => {
  // Browsers add about 4px before a select's text, so selects get 8px of padding to the
  // inputs' 12px, and the text in both starts at the same place.
  it("gives selects less side padding than text inputs, and is otherwise the same", () => {
    expect(classes(inputClass)).toContain("px-3");
    expect(classes(selectClass)).toContain("px-2");
    expect(classes(selectClass)).not.toContain("px-3");
    const rest = (c: string) => classes(c).filter((x) => x !== "px-2" && x !== "px-3").sort();
    expect(rest(selectClass)).toEqual(rest(inputClass));
  });

  it("uses the select style for SelectField and MonthField, and the input style for TextField", () => {
    const { container } = render(
      <I18nProvider initialLang="en">
        <TextField label="Name" value="" onChange={noop} />
        <SelectField label="Level" value="a" onChange={noop} options={[{ value: "a", label: "A" }]} />
        <MonthField label="Start" value="2024-01" onChange={noop} />
      </I18nProvider>,
    );
    const selects = Array.from(container.querySelectorAll("select"));
    expect(selects).toHaveLength(3);
    for (const select of selects) expect(select.className).toBe(selectClass);
    expect(container.querySelector("input")?.className).toBe(inputClass);
  });

  it("lines up the letter's “Fill in from a CV” select with the inputs below it", () => {
    const { container } = render(
      <I18nProvider initialLang="en">
        <LetterForm
          letter={sampleLetter()}
          dispatch={noop}
          cvOptions={[{ id: "cv-1", name: "Jane CV" }]}
          loadCV={() => richSampleCV()}
        />
      </I18nProvider>,
    );
    const selects = Array.from(container.querySelectorAll("select"));
    expect(selects.length).toBeGreaterThan(0);
    for (const select of selects) {
      expect(classes(select.className)).toContain("px-2");
      expect(classes(select.className)).not.toContain("px-3");
    }
  });
});
