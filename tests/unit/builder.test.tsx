import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BuilderApp } from "@/components/builder/BuilderApp";
import { I18nProvider } from "@/lib/i18n";
import { serializeCV } from "@/lib/cv-validation";
import { sampleCV } from "@/lib/sample-cv";
import { DRAFT_KEY, saveDraft } from "@/lib/storage";

function renderBuilder(lang: "en" | "id" = "en") {
  return render(
    <I18nProvider initialLang={lang}>
      <BuilderApp />
    </I18nProvider>,
  );
}

const preview = () => screen.getByRole("document", { name: /CV preview|Pratinjau CV/i });
const storedDraft = () => JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");

describe("CV builder integration", () => {
  it("updates the live preview as the user types", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.type(await screen.findByLabelText(/Full name/), "Dewi Lestari");
    await user.type(screen.getByLabelText("Professional title"), "UX Researcher");
    expect(within(preview()).getByRole("heading", { level: 1 })).toHaveTextContent("Dewi Lestari");
    expect(within(preview()).getByText("UX Researcher")).toBeInTheDocument();
  });

  it("autosaves to localStorage and restores after a reload", async () => {
    const user = userEvent.setup();
    const first = renderBuilder();
    await user.type(await screen.findByLabelText(/Full name/), "Persisted Person");
    await waitFor(() => expect(storedDraft()?.data.personal.fullName).toBe("Persisted Person"), { timeout: 2000 });
    first.unmount();

    renderBuilder();
    expect(await screen.findByLabelText(/Full name/)).toHaveValue("Persisted Person");
    expect(screen.getByText(/draft was restored/i)).toBeInTheDocument();
  });

  it("adds, edits, reorders and removes work experience", async () => {
    const user = userEvent.setup();
    renderBuilder();
    const add = await screen.findByRole("button", { name: "Add work experience" });
    await user.click(add);
    await user.click(add);
    const jobTitles = screen.getAllByLabelText("Job title");
    await user.type(jobTitles[0], "First Job");
    await user.type(jobTitles[1], "Second Job");

    const entries = () => within(preview()).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(entries()).toEqual(["First Job", "Second Job"]);

    await user.click(screen.getByRole("button", { name: "Move up: Second Job" }));
    expect(entries()).toEqual(["Second Job", "First Job"]);

    // Removing an entry with content asks for confirmation first.
    await user.click(screen.getByRole("button", { name: "Remove: First Job" }));
    const dialog = screen.getByRole("dialog", { name: "Remove this entry?" });
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(entries()).toEqual(["Second Job"]);
  });

  it("switches templates without losing data", async () => {
    saveDraft(sampleCV());
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    const select = screen.getByLabelText("Template");
    for (const tpl of ["modern-professional", "graduate", "ats-minimal"]) {
      await user.selectOptions(select, tpl);
      expect(preview().querySelector(".cv-doc")?.className).toContain(
        { "ats-minimal": "tpl-ats", "modern-professional": "tpl-modern", graduate: "tpl-graduate" }[tpl]!,
      );
      expect(preview()).toHaveTextContent("Example Logistics Co.");
    }
    await waitFor(() => expect(storedDraft().data.experience).toHaveLength(3));
    expect(storedDraft().data.meta.template).toBe("ats-minimal");
  });

  it("deletes the draft only after confirmation", async () => {
    saveDraft(sampleCV());
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    await user.click(screen.getByRole("button", { name: "Delete draft" }));
    const dialog = screen.getByRole("dialog", { name: "Delete this draft?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Delete draft" }));
    await user.click(within(screen.getByRole("dialog", { name: "Delete this draft?" })).getByRole("button", { name: "Delete draft" }));
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(screen.getByLabelText(/Full name/)).toHaveValue("");
    await new Promise((r) => setTimeout(r, 800));
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("starts a new CV and can restore the previous draft", async () => {
    saveDraft(sampleCV());
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    await user.click(screen.getByRole("button", { name: "Start new CV" }));
    await user.click(within(screen.getByRole("dialog", { name: "Start a new CV?" })).getByRole("button", { name: "Start new CV" }));
    expect(screen.getByLabelText(/Full name/)).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Restore previous draft" }));
    await user.click(within(screen.getByRole("dialog", { name: /Restore the previous draft/ })).getByRole("button", { name: "Restore" }));
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Alex Example");
  });

  it("imports a valid JSON file and rejects an invalid one", async () => {
    renderBuilder();
    await screen.findByLabelText(/Full name/);
    const input = document.querySelector<HTMLInputElement>('input[type="file"][accept*="json"]')!;

    const bad = new File(["{oops"], "bad.json", { type: "application/json" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [bad] } });
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("not valid JSON");

    const good = new File([serializeCV(sampleCV("graduate"))], "cv.json", { type: "application/json" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [good] } });
    });
    expect(await screen.findByDisplayValue("Alex Example")).toBeInTheDocument();
    expect(screen.getByLabelText("Template")).toHaveValue("graduate");
  });

  it("exports the CV as a JSON download", async () => {
    saveDraft(sampleCV());
    const user = userEvent.setup();
    const createUrl = vi.fn(() => "blob:mock");
    const revokeUrl = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    await user.click(screen.getByRole("button", { name: "Export JSON" }));
    expect(click).toHaveBeenCalledOnce();
    const blob = (createUrl.mock.calls[0] as unknown as [Blob])[0];
    const json = JSON.parse(await blob.text());
    expect(json.data.personal.fullName).toBe("Alex Example");
    click.mockRestore();
  });

  it("downloads the PDF through the print dialog after showing instructions", async () => {
    saveDraft(sampleCV());
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    const dialog = screen.getByRole("dialog", { name: "Download your CV as PDF" });
    expect(dialog).toHaveTextContent("Save as PDF");
    await user.click(within(dialog).getByRole("button", { name: "Open print dialog" }));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    // The print-only copy contains the CV and no application controls.
    const printRoot = document.getElementById("cv-print-root")!;
    expect(printRoot).toHaveTextContent("Alex Example");
    expect(printRoot.querySelector("button, input, select, textarea")).toBeNull();
    print.mockRestore();
  });

  it("refuses to print an empty CV", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderBuilder();
    await screen.findByLabelText(/Full name/);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/CV is empty/);
    expect(print).not.toHaveBeenCalled();
    print.mockRestore();
  });

  it("works without any AI provider and shows no AI controls", async () => {
    saveDraft(sampleCV());
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    expect(screen.queryByRole("button", { name: /AI/ })).toBeNull();
  });

  it("renders the interface in Indonesian while keeping CV content as written", async () => {
    saveDraft(sampleCV());
    renderBuilder("id");
    expect(await screen.findByLabelText(/Nama lengkap/)).toHaveValue("Alex Example");
    expect(screen.getByRole("button", { name: "Unduh PDF" })).toBeInTheDocument();
    // The CV language is still English, so the CV headings are English.
    expect(within(preview()).getByRole("heading", { name: "Work Experience" })).toBeInTheDocument();
  });

  it("labels every form control", async () => {
    saveDraft(sampleCV());
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    const controls = document.querySelectorAll<HTMLElement>(
      "main input:not([type=hidden]):not([aria-hidden=true]), input:not([aria-hidden=true]), select, textarea",
    );
    for (const el of Array.from(controls)) {
      if (el.getAttribute("aria-hidden") === "true") continue;
      const labelled =
        el.getAttribute("aria-label") || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest("label");
      expect(labelled, el.outerHTML).toBeTruthy();
    }
  });
});
