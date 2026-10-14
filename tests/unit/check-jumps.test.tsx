import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CVForm } from "@/components/cv-form/CVForm";
import { CHECK_FIELDS, runChecks } from "@/lib/cv-checks";
import type { CVData } from "@/lib/cv-schema";
import { I18nProvider } from "@/lib/i18n";
import { richSampleCV } from "@/lib/sample-cv";

/** A CV that sets off every finding that points at a particular form field. */
function flawedCV(): CVData {
  const cv = richSampleCV();
  cv.personal = { ...cv.personal, fullName: "", phone: "", city: "", title: "", linkedin: "not a url", website: "nope" };
  cv.personal.email = "alex@";
  cv.summary = "Too short.";
  cv.experience[0] = { ...cv.experience[0], description: "" };
  cv.experience[1] = { ...cv.experience[1], startDate: "", endDate: "", current: false };
  cv.experience[2] = {
    ...cv.experience[2],
    startDate: "2020-05",
    endDate: "2019-01",
    current: false,
    description: "I did many things\nMy job was to help",
  };
  cv.organizations[0] = { ...cv.organizations[0], startDate: "2021-01", endDate: "", current: false };
  cv.projects[0] = { ...cv.projects[0], url: "not a url" };
  cv.references[0] = { ...cv.references[0], email: "sam@" };
  cv.customSections[0] = { ...cv.customSections[0], title: "" };
  return cv;
}

describe("check findings point at fields that exist in the form", () => {
  it("every finding with a field resolves to a control inside its target", () => {
    const cv = flawedCV();
    const { items } = runChecks(cv);
    const withField = items.filter((item) => item.field);
    // The fixture covers most rules that name a field.
    const rules = new Set(withField.map((item) => item.rule));
    for (const rule of [
      "missingName",
      "invalidEmail",
      "missingPhone",
      "missingCity",
      "missingTitle",
      "invalidLinkedin",
      "invalidWebsite",
      "summaryShort",
      "noDescription",
      "noDates",
      "dateOrder",
      "firstPerson",
      "noEndDate",
      "invalidProjectUrl",
      "invalidReferenceEmail",
      "customNoTitle",
    ] as const) {
      expect(rules, rule).toContain(rule);
      expect(CHECK_FIELDS[rule], rule).toBeTruthy();
    }

    render(
      <I18nProvider initialLang="en">
        <CVForm cv={cv} dispatch={() => {}} />
      </I18nProvider>,
    );
    for (const item of withField) {
      const section = document.getElementById(item.target);
      expect(section, item.id).not.toBeNull();
      const scope = item.itemId
        ? Array.from(section!.querySelectorAll<HTMLElement>("[data-item-id]")).find(
            (el) => el.dataset.itemId === item.itemId,
          )
        : section!;
      expect(scope, item.id).toBeTruthy();
      const control = Array.from(scope!.querySelectorAll<HTMLElement>("[data-field]")).find(
        (el) => el.dataset.field === item.field,
      );
      expect(control, `${item.id} → ${item.field}`).toBeTruthy();
      expect(["INPUT", "SELECT", "TEXTAREA"]).toContain(control!.tagName);
    }
  });
});
