import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BuilderApp, docReducer } from "@/components/builder/BuilderApp";
import { copyName, followingName } from "@/components/builder/doc-names";
import { createEmptyCV, type CVData } from "@/lib/cv-schema";
import { serializeDocument } from "@/lib/cv-validation";
import {
  DOC_KEY,
  createDoc,
  getActiveDocId,
  listDocs,
  loadDoc,
  setActiveDocId,
  type AnyDoc,
  type DocMeta,
} from "@/lib/documents";
import { exportDocx } from "@/lib/export/docx";
import { downloadBlob } from "@/lib/export/download";
import { exportText } from "@/lib/export/text";
import { I18nProvider } from "@/lib/i18n";
import { createEmptyLetter } from "@/lib/letter-schema";
import { PRINT_HINT_KEY } from "@/lib/pdf";
import { sampleCV, sampleLetter } from "@/lib/sample-cv";
import { BACKUP_KEY, CORRUPT_KEY, DRAFT_KEY } from "@/lib/storage";

// Exporters are tested in export.test.ts; here only the builder's wiring matters.
vi.mock("@/lib/export/docx", () => ({
  exportDocx: vi.fn(async () => new Blob(["docx"], { type: "application/octet-stream" })),
}));
vi.mock("@/lib/export/text", () => ({ exportText: vi.fn(() => "ALEX EXAMPLE") }));
vi.mock("@/lib/export/download", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/export/download")>()),
  downloadBlob: vi.fn(),
}));

function renderBuilder(lang: "en" | "id" = "en") {
  return render(
    <I18nProvider initialLang={lang}>
      <BuilderApp />
    </I18nProvider>,
  );
}

/** Stores a document and makes it the one the builder opens. */
function seed(doc: AnyDoc, name = ""): DocMeta {
  const result = createDoc(doc, name);
  if (!result.ok) throw new Error("could not seed");
  setActiveDocId(result.meta.id);
  return result.meta;
}
const seedCV = (cv: CVData = sampleCV(), name = "") => seed({ kind: "cv", data: cv }, name);

const preview = () => screen.getByRole("document", { name: /CV preview|Pratinjau CV/i });
const activeDoc = () => {
  const id = getActiveDocId();
  const result = id ? loadDoc(id) : null;
  return result?.status === "ok" ? result.doc : null;
};
const activeCV = () => {
  const doc = activeDoc();
  return doc?.kind === "cv" ? doc.data : null;
};
const docNames = () => listDocs().map((m) => m.name).sort();
const switcher = () => screen.getByTestId("document-switcher");

/**
 * The CV form's "Full name" field. Looked up through its label directly, because label
 * queries over the whole builder are very slow in jsdom.
 */
function fullName(): HTMLInputElement {
  const label = Array.from(document.querySelectorAll<HTMLLabelElement>("#personal label")).find((l) =>
    /^(Full name|Nama lengkap)/.test(l.textContent ?? ""),
  );
  const field = label ? document.getElementById(label.htmlFor) : null;
  if (!(field instanceof HTMLInputElement)) throw new Error("Full name field not found");
  return field;
}
const findFullName = () => waitFor(fullName);

async function openDocuments(user: ReturnType<typeof userEvent.setup>) {
  await user.click(switcher());
  return screen.getByRole("dialog", { name: "Your documents" });
}

async function openMore(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "More" }));
  return screen.getByRole("group", { name: "Document actions" });
}

/** A v1 (single-draft app) payload: no new sections, no order/visibility/appearance settings. */
function legacyPayload(cv: CVData) {
  const { languages, organizations, awards, references, interests, customSections, ...rest } = cv;
  void [languages, organizations, awards, references, interests, customSections];
  return JSON.stringify({
    schemaVersion: 1,
    savedAt: "2026-01-02T03:04:05.000Z",
    data: { ...rest, schemaVersion: 1, meta: { template: cv.meta.template, cvLanguage: cv.meta.cvLanguage } },
  });
}

// Each test renders the whole builder (form, preview, dialogs), which is slow in jsdom.
vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("builder: editing and autosave", () => {
  it("updates the live preview as the user types", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.type(await findFullName(), "Dewi Lestari");
    await user.type(screen.getByLabelText("Professional title"), "UX Researcher");
    expect(within(preview()).getByRole("heading", { level: 1 })).toHaveTextContent("Dewi Lestari");
    expect(within(preview()).getByText("UX Researcher")).toBeInTheDocument();
  });

  it("stores nothing until the first edit", async () => {
    renderBuilder();
    await findFullName();
    await new Promise((r) => setTimeout(r, 750));
    expect(listDocs()).toEqual([]);
    expect(switcher()).toHaveTextContent("Untitled CV");
  });

  it("autosaves the document and restores it after a reload", async () => {
    const user = userEvent.setup();
    const first = renderBuilder();
    await user.type(await findFullName(), "Persisted Person");
    await waitFor(() => expect(activeCV()?.personal.fullName).toBe("Persisted Person"), { timeout: 2000 });
    // The automatic name follows the content until the person picks their own.
    await waitFor(() => expect(docNames()).toEqual(["Persisted Person"]));
    expect(switcher()).toHaveTextContent("Persisted Person");
    expect(screen.getByTestId("save-status")).toHaveTextContent("Saved on this device");
    first.unmount();

    renderBuilder();
    expect(await findFullName()).toHaveValue("Persisted Person");
    expect(screen.getByText("Your draft was restored from this browser.")).toBeInTheDocument();
    expect(listDocs()).toHaveLength(1);
  });

  it("writes pending edits when the page is hidden", async () => {
    seedCV();
    renderBuilder();
    const name = await screen.findByDisplayValue("Alex Example");
    fireEvent.change(name, { target: { value: "Quick Exit" } });
    expect(activeCV()?.personal.fullName).toBe("Alex Example");
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(activeCV()?.personal.fullName).toBe("Quick Exit");
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

    await user.click(screen.getByRole("button", { name: "Remove: First Job" }));
    const dialog = screen.getByRole("dialog", { name: "Remove this entry?" });
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(entries()).toEqual(["Second Job"]);
  });

  it("switches templates without losing data", async () => {
    seedCV();
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
    await waitFor(() => expect(activeCV()?.meta.template).toBe("ats-minimal"));
    expect(activeCV()?.experience).toHaveLength(3);
  });

  it("saves on demand with the Save draft button", async () => {
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    const name = await screen.findByDisplayValue("Alex Example");
    fireEvent.change(name, { target: { value: "Saved Now" } });
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(activeCV()?.personal.fullName).toBe("Saved Now");
    expect(screen.getByText("Draft saved on this device.")).toBeInTheDocument();
  });
});

describe("builder: legacy drafts", () => {
  it("moves the v1 draft and backup into documents and opens the draft", async () => {
    localStorage.setItem(DRAFT_KEY, legacyPayload(sampleCV("graduate")));
    localStorage.setItem(
      BACKUP_KEY,
      legacyPayload({ ...sampleCV(), personal: { ...sampleCV().personal, fullName: "Backup Person" } }),
    );
    const user = userEvent.setup();
    renderBuilder();
    expect(await findFullName()).toHaveValue("Alex Example");
    expect(screen.getByLabelText("Template")).toHaveValue("graduate");
    expect(screen.getByText("Your draft was restored from this browser.")).toBeInTheDocument();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(docNames()).toEqual(["Alex Example", "Backup Person"]);

    const dialog = await openDocuments(user);
    await user.click(within(dialog).getByRole("button", { name: "Open: Backup Person" }));
    expect(fullName()).toHaveValue("Backup Person");
  });

  it("sets a corrupted legacy draft aside and starts empty", async () => {
    localStorage.setItem(DRAFT_KEY, "{corrupted");
    renderBuilder();
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be read");
    expect(fullName()).toHaveValue("");
    expect(localStorage.getItem(CORRUPT_KEY)).toBe("{corrupted");
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("opens the newest readable document when the active one is corrupted", async () => {
    const good = seedCV();
    const bad = seedCV(sampleCV(), "Broken");
    localStorage.setItem(DOC_KEY(bad.id), "{broken");
    renderBuilder();
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be read");
    expect(fullName()).toHaveValue("Alex Example");
    expect(getActiveDocId()).toBe(good.id);
  });
});

describe("builder: documents", () => {
  it("creates a second CV and switches between documents, saving each to its own place", async () => {
    const first = seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");

    let dialog = await openDocuments(user);
    await user.click(within(dialog).getByRole("button", { name: "New CV" }));
    expect(screen.queryByRole("dialog", { name: "Your documents" })).toBeNull();
    expect(fullName()).toHaveValue("");
    expect(screen.getByText("New CV created.")).toBeInTheDocument();
    expect(switcher()).toHaveTextContent("Untitled CV");
    const secondId = getActiveDocId();
    expect(secondId).not.toBe(first.id);

    await user.type(fullName(), "Second Person");
    await waitFor(() => expect(docNames()).toEqual(["Alex Example", "Second Person"]), { timeout: 2000 });

    dialog = await openDocuments(user);
    const rows = within(dialog).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const current = rows.find((row) => row.getAttribute("aria-current") === "true")!;
    expect(current).toHaveTextContent("Second Person");
    expect(current).toHaveTextContent("Open now");
    await user.click(within(dialog).getByRole("button", { name: "Open: Alex Example" }));

    expect(fullName()).toHaveValue("Alex Example");
    expect(getActiveDocId()).toBe(first.id);
    expect(screen.getByText("Now editing “Alex Example”.")).toBeInTheDocument();
    const second = loadDoc(secondId!);
    expect(second.status === "ok" && second.doc.kind === "cv" && second.doc.data.personal.fullName).toBe(
      "Second Person",
    );

    // Edits now go to the first document only.
    fireEvent.change(fullName(), { target: { value: "Alex Edited" } });
    await waitFor(() => expect(activeCV()?.personal.fullName).toBe("Alex Edited"));
    const again = loadDoc(secondId!);
    expect(again.status === "ok" && again.doc.kind === "cv" && again.doc.data.personal.fullName).toBe(
      "Second Person",
    );
  });

  it("saves pending edits before opening another document", async () => {
    const other = seedCV({ ...sampleCV(), personal: { ...sampleCV().personal, fullName: "Other Person" } });
    const current = seedCV();
    const user = userEvent.setup();
    renderBuilder();
    fireEvent.change(await screen.findByDisplayValue("Alex Example"), { target: { value: "Unsaved Edit" } });
    const dialog = await openDocuments(user);
    await user.click(within(dialog).getByRole("button", { name: /^Open: / }));
    expect(getActiveDocId()).toBe(other.id);
    const stored = loadDoc(current.id);
    expect(stored.status === "ok" && stored.doc.kind === "cv" && stored.doc.data.personal.fullName).toBe(
      "Unsaved Edit",
    );
  });

  it("renames, duplicates and deletes documents in the documents dialog", async () => {
    const meta = seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    const dialog = await openDocuments(user);

    // Rename inline; an empty name is refused.
    await user.click(within(dialog).getByRole("button", { name: "Rename: Alex Example" }));
    const field = within(dialog).getByLabelText("Document name");
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter a name.");
    await user.type(field, "Data analyst CV");
    await user.keyboard("{Enter}");
    expect(within(dialog).getByRole("status")).toHaveTextContent("Renamed to “Data analyst CV”.");
    expect(within(dialog).getByRole("button", { name: "Rename: Data analyst CV" })).toHaveFocus();
    expect(listDocs().find((m) => m.id === meta.id)?.name).toBe("Data analyst CV");
    expect(switcher()).toHaveTextContent("Data analyst CV");

    // Duplicate keeps the open document and adds a copy.
    await user.click(within(dialog).getByRole("button", { name: "Duplicate: Data analyst CV" }));
    expect(within(dialog).getByRole("status")).toHaveTextContent("Copy created: “Data analyst CV (copy)”.");
    expect(docNames()).toEqual(["Data analyst CV", "Data analyst CV (copy)"]);
    expect(getActiveDocId()).toBe(meta.id);
    expect(within(dialog).getByRole("button", { name: "Open: Data analyst CV (copy)" })).toHaveFocus();

    // Delete asks first; cancelling keeps the document.
    await user.click(within(dialog).getByRole("button", { name: "Delete: Data analyst CV (copy)" }));
    let confirm = screen.getByRole("dialog", { name: "Delete “Data analyst CV (copy)”?" });
    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(listDocs()).toHaveLength(2);

    await user.click(within(dialog).getByRole("button", { name: "Delete: Data analyst CV (copy)" }));
    confirm = screen.getByRole("dialog", { name: "Delete “Data analyst CV (copy)”?" });
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(docNames()).toEqual(["Data analyst CV"]);
    expect(within(dialog).getByRole("status")).toHaveTextContent("“Data analyst CV (copy)” was deleted from this browser.");
    expect(fullName()).toHaveValue("Alex Example");
  });

  it("deletes the open document without letting a pending autosave bring it back", async () => {
    const other = seedCV({ ...sampleCV(), personal: { ...sampleCV().personal, fullName: "Other Person" } });
    const current = seedCV();
    renderBuilder();
    // An edit whose autosave is still pending when the document is deleted. The clicks are
    // synchronous, so the 600 ms autosave timer can't fire in between.
    fireEvent.change(await screen.findByDisplayValue("Alex Example"), { target: { value: "About To Go" } });
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Document actions" })).getByRole("button", { name: "Delete" }));
    const confirm = screen.getByRole("dialog", { name: "Delete “Alex Example”?" });
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));

    expect(fullName()).toHaveValue("Other Person");
    expect(screen.getByText("“Alex Example” was deleted. You’re now editing “Other Person”.")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 800));
    expect(localStorage.getItem(DOC_KEY(current.id))).toBeNull();
    expect(listDocs().map((m) => m.id)).toEqual([other.id]);
    expect(getActiveDocId()).toBe(other.id);
  });

  it("starts an empty CV after the last document is deleted", async () => {
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    const more = await openMore(user);
    await user.click(within(more).getByRole("button", { name: "Delete" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Delete “Alex Example”?" })).getByRole("button", { name: "Delete" }),
    );
    expect(fullName()).toHaveValue("");
    expect(screen.getByText("“Alex Example” was deleted from this browser.")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 800));
    expect(listDocs()).toEqual([]);
    // Nothing to delete or duplicate until the new CV is saved.
    const menu = await openMore(user);
    expect(within(menu).getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(within(menu).getByRole("button", { name: "Duplicate" })).toBeDisabled();
  });

  it("renames and duplicates the open document from the toolbar", async () => {
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");

    let more = await openMore(user);
    await user.click(within(more).getByRole("button", { name: "Rename" }));
    const dialog = screen.getByRole("dialog", { name: "Rename document" });
    const field = within(dialog).getByLabelText("Document name");
    await user.clear(field);
    await user.type(field, "For Example Corp");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("dialog", { name: "Rename document" })).toBeNull();
    expect(switcher()).toHaveTextContent("For Example Corp");
    expect(docNames()).toEqual(["For Example Corp"]);

    // A custom name no longer follows the content.
    fireEvent.change(fullName(), { target: { value: "Alexandra Example" } });
    await waitFor(() => expect(activeCV()?.personal.fullName).toBe("Alexandra Example"));
    expect(docNames()).toEqual(["For Example Corp"]);

    more = await openMore(user);
    await user.click(within(more).getByRole("button", { name: "Duplicate" }));
    expect(switcher()).toHaveTextContent("For Example Corp (copy)");
    expect(screen.getByText("Copy created. You’re now editing “For Example Corp (copy)”.")).toBeInTheDocument();
    expect(docNames()).toEqual(["For Example Corp", "For Example Corp (copy)"]);
    expect(fullName()).toHaveValue("Alexandra Example");
  });

  it("imports a JSON file as a new document and never replaces the open one", async () => {
    const original = seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");

    let dialog = await openDocuments(user);
    let input = dialog.querySelector<HTMLInputElement>('input[type="file"][accept*="json"]')!;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(["{oops"], "bad.json", { type: "application/json" })] } });
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("not valid JSON");
    expect(listDocs()).toHaveLength(1);

    dialog = await openDocuments(user);
    input = dialog.querySelector<HTMLInputElement>('input[type="file"][accept*="json"]')!;
    const file = new File([serializeDocument({ kind: "cv", data: sampleCV("graduate") })], "cv.json", {
      type: "application/json",
    });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    await waitFor(() => expect(screen.getByLabelText("Template")).toHaveValue("graduate"));
    expect(screen.getByText("“Alex Example” was imported as a new document.")).toBeInTheDocument();
    expect(listDocs()).toHaveLength(2);
    expect(getActiveDocId()).not.toBe(original.id);
    const kept = loadDoc(original.id);
    expect(kept.status === "ok" && kept.doc.data.meta.template).toBe("ats-minimal");

    // A cover letter file becomes a letter document.
    dialog = await openDocuments(user);
    input = dialog.querySelector<HTMLInputElement>('input[type="file"][accept*="json"]')!;
    const letter = new File([serializeDocument({ kind: "letter", data: sampleLetter() })], "letter.json", {
      type: "application/json",
    });
    await act(async () => {
      fireEvent.change(input, { target: { files: [letter] } });
    });
    expect(await screen.findByRole("document", { name: "Cover letter preview" })).toHaveTextContent(
      "Example Analytics Ltd.",
    );
    expect(activeDoc()?.kind).toBe("letter");
    expect(listDocs()).toHaveLength(3);
  });
});

describe("builder: cover letters", () => {
  it("creates a cover letter with details copied from a CV", async () => {
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");

    const dialog = await openDocuments(user);
    await user.click(within(dialog).getByRole("button", { name: "New cover letter" }));
    const select = within(dialog).getByLabelText("Copy your details from");
    expect(select).toHaveValue(getActiveDocId());
    await user.click(within(dialog).getByRole("button", { name: "Create cover letter" }));

    expect(await screen.findByRole("document", { name: "Cover letter preview" })).toHaveTextContent("Alex Example");
    expect(screen.getByText("New cover letter created with your details from “Alex Example”.")).toBeInTheDocument();
    expect(switcher()).toHaveTextContent("Cover letter");
    expect(screen.getByLabelText("Letter language")).toHaveValue("en");
    expect(screen.queryByLabelText("CV language")).toBeNull();

    // Letters have Content and Design tabs only.
    const tabs = screen.getByRole("tablist", { name: "Editor" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Content", "Design"]);

    const stored = activeDoc();
    expect(stored?.kind).toBe("letter");
    expect(stored?.kind === "letter" && stored.data.sender.email).toBe("alex@example.com");

    // Edits autosave into the letter; the automatic name picks up the company.
    await user.type(screen.getByLabelText("Company or organisation"), "Example Corp");
    await waitFor(() => expect(docNames()).toContain("Cover letter – Example Corp"), { timeout: 2000 });
  });

  it("creates an empty cover letter when no CV is chosen", async () => {
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    const dialog = await openDocuments(user);
    await user.click(within(dialog).getByRole("button", { name: "New cover letter" }));
    await user.selectOptions(within(dialog).getByLabelText("Copy your details from"), "");
    await user.click(within(dialog).getByRole("button", { name: "Create cover letter" }));
    expect(screen.getByText("New cover letter created.")).toBeInTheDocument();
    const stored = activeDoc();
    expect(stored?.kind === "letter" && stored.data.sender.fullName).toBe("");
  });

  it("prints a letter with its own instructions title", async () => {
    seed({ kind: "letter", data: sampleLetter() });
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderBuilder();
    await screen.findByRole("document", { name: "Cover letter preview" });
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    const dialog = screen.getByRole("dialog", { name: "Download your cover letter as PDF" });
    await user.click(within(dialog).getByRole("button", { name: "Open print dialog" }));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    expect(document.getElementById("cv-print-root")).toHaveTextContent("Example Analytics Ltd.");
    print.mockRestore();
  });
});

describe("builder: editor tabs and checks", () => {
  it("switches between Content, Design and Check", async () => {
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    const tablist = screen.getByRole("tablist", { name: "Editor" });
    const tab = (name: RegExp) => within(tablist).getByRole("tab", { name });

    expect(tab(/^Content$/)).toHaveAttribute("aria-selected", "true");
    await user.click(tab(/^Design$/));
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeVisible();
    const contentPanel = document.getElementById(tab(/^Content$/).getAttribute("aria-controls")!)!;
    expect(contentPanel).not.toBeVisible();

    // The Check tab carries the score; the panel shows the same number.
    const check = tab(/^Check/);
    expect(check).toHaveAccessibleName(/Score: \d+ out of 100/);
    await user.click(check);
    const panel = screen.getByTestId("checks-panel");
    expect(panel).toBeVisible();
    const badge = screen.getByTestId("check-score-badge").textContent;
    expect(within(panel).getByTestId("checks-score")).toHaveTextContent(badge!);

    // Arrow keys move between tabs.
    await user.keyboard("{ArrowLeft}");
    expect(tab(/^Design$/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/^Design$/)).toHaveFocus();
    await user.keyboard("{Home}");
    expect(tab(/^Content$/)).toHaveAttribute("aria-selected", "true");
    expect(contentPanel).toBeVisible();
    expect(contentPanel).toContainElement(fullName());
  });

  it("keeps design changes in the document", async () => {
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    await user.click(screen.getByRole("tab", { name: "Design" }));
    await user.click(screen.getByRole("radio", { name: "Large 10.5 pt" }));
    await waitFor(() => expect(activeCV()?.meta.style.fontSize).toBe("large"));
  });

  it("jumps from a finding to the entry in the form", async () => {
    const cv = sampleCV();
    cv.experience[1] = { ...cv.experience[1], startDate: "", endDate: "", current: false };
    seedCV(cv);
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    await user.click(screen.getByRole("tab", { name: /^Check/ }));
    const finding = document.querySelector<HTMLButtonElement>(`[data-check-id^="noDates:"]`)!;
    expect(finding).not.toBeNull();
    await user.click(finding);

    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
    const entry = document.querySelector(`#experience [data-item-id="${cv.experience[1].id}"]`)!;
    expect(entry).not.toBeNull();
    await waitFor(() => expect(entry.contains(document.activeElement)).toBe(true));
    // The start date is what's missing, so that's the field that gets focus.
    expect(document.activeElement).toHaveAttribute("data-field", "startDate");
    expect(document.activeElement).toHaveAccessibleName("Start date: Month");
  });

  it("jumps from a personal details finding to the field it is about", async () => {
    const cv = sampleCV();
    cv.personal.email = "";
    seedCV(cv);
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    await user.click(screen.getByRole("tab", { name: /^Check/ }));
    const finding = document.querySelector<HTMLButtonElement>(`[data-check-id="missingEmail:personal"]`)!;
    expect(finding).not.toBeNull();
    await user.click(finding);
    await waitFor(() => expect(document.activeElement).toHaveAttribute("data-field", "email"));
    expect(document.activeElement).toHaveAccessibleName("Email");
    expect(document.querySelector("#personal")!.contains(document.activeElement)).toBe(true);
  });

  it("opens the Design tab for design findings", async () => {
    const cv = sampleCV();
    cv.meta.style = { ...cv.meta.style, accent: "#dddddd" };
    seedCV(cv);
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    await user.click(screen.getByRole("tab", { name: /^Check/ }));
    const finding = document.querySelector<HTMLButtonElement>(`[data-check-id^="lowContrast"]`)!;
    expect(finding).not.toBeNull();
    await user.click(finding);
    expect(screen.getByRole("tab", { name: "Design" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Design" })).toHaveFocus();
  });
});

describe("builder: downloads", () => {
  async function openFormats(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Other download formats" }));
    return screen.getByRole("group", { name: "Download formats" });
  }

  it("downloads Word, plain text and JSON files", async () => {
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");

    let menu = await openFormats(user);
    for (const name of ["PDF", "Word (.docx)", "Plain text (.txt)", "JSON backup"]) {
      expect(within(menu).getByRole("button", { name })).toHaveAccessibleDescription();
    }
    await user.click(within(menu).getByRole("button", { name: "Word (.docx)" }));
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
    expect(vi.mocked(exportDocx).mock.calls[0][0]).toMatchObject({ kind: "cv", data: { personal: { fullName: "Alex Example" } } });
    expect(vi.mocked(downloadBlob).mock.calls[0][1]).toBe("Alex_Example_CV.docx");
    expect(await screen.findByText("Word file downloaded.")).toBeInTheDocument();

    menu = await openFormats(user);
    await user.click(within(menu).getByRole("button", { name: "Plain text (.txt)" }));
    expect(exportText).toHaveBeenCalledOnce();
    const [textFile, textName] = vi.mocked(downloadBlob).mock.calls[1];
    expect(textName).toBe("Alex_Example_CV.txt");
    expect(await textFile.text()).toBe("ALEX EXAMPLE");

    menu = await openFormats(user);
    await user.click(within(menu).getByRole("button", { name: "JSON backup" }));
    const [jsonFile, jsonName] = vi.mocked(downloadBlob).mock.calls[2];
    expect(jsonName).toBe("Alex_Example_CV.json");
    const json = JSON.parse(await jsonFile.text());
    expect(json.kind).toBe("cv");
    expect(json.data.personal.fullName).toBe("Alex Example");
    expect(screen.getByText("JSON file downloaded.")).toBeInTheDocument();
  });

  it("writes pending edits before exporting", async () => {
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    fireEvent.change(await screen.findByDisplayValue("Alex Example"), { target: { value: "Fresh Name" } });
    const menu = await openFormats(user);
    await user.click(within(menu).getByRole("button", { name: "JSON backup" }));
    expect(activeCV()?.personal.fullName).toBe("Fresh Name");
    expect(vi.mocked(downloadBlob).mock.calls[0][1]).toBe("Fresh_Name_CV.json");
  });

  it("reports a failed Word export", async () => {
    vi.mocked(exportDocx).mockRejectedValueOnce(new Error("boom"));
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    const menu = await openFormats(user);
    await user.click(within(menu).getByRole("button", { name: "Word (.docx)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The Word file couldn’t be created.");
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("refuses Word and text exports of an empty document", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await findFullName();
    const menu = await openFormats(user);
    await user.click(within(menu).getByRole("button", { name: "Word (.docx)" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/CV is empty/);
    expect(exportDocx).not.toHaveBeenCalled();
  });

  it("downloads the PDF through the print dialog after showing instructions", async () => {
    seedCV();
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    const dialog = screen.getByRole("dialog", { name: "Download your CV as PDF" });
    expect(dialog).toHaveTextContent("Save as PDF");
    await user.click(within(dialog).getByLabelText("Don’t show these instructions again"));
    await user.click(within(dialog).getByRole("button", { name: "Open print dialog" }));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    // The print-only copy contains the CV and no application controls.
    const printRoot = document.getElementById("cv-print-root")!;
    expect(printRoot).toHaveTextContent("Alex Example");
    expect(printRoot.querySelector("button, input, select, textarea")).toBeNull();
    expect(localStorage.getItem(PRINT_HINT_KEY)).toBe("1");

    // The PDF item in the formats menu prints straight away once the hint is hidden.
    const menu = await openFormats(user);
    await user.click(within(menu).getByRole("button", { name: "PDF" }));
    expect(print).toHaveBeenCalledTimes(2);
    print.mockRestore();
  });

  it("refuses to print an empty CV", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderBuilder();
    await findFullName();
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/CV is empty/);
    expect(print).not.toHaveBeenCalled();
    print.mockRestore();
  });
});

describe("builder: language and accessibility", () => {
  it("works without any AI provider and shows no AI controls", async () => {
    seedCV();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    expect(screen.queryByRole("button", { name: /AI/ })).toBeNull();
  });

  it("renders the interface in Indonesian while keeping CV content as written", async () => {
    seedCV();
    renderBuilder("id");
    expect(await findFullName()).toHaveValue("Alex Example");
    expect(screen.getByRole("button", { name: "Unduh PDF" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Isi" })).toBeInTheDocument();
    // The CV language is still English, so the CV headings are English.
    expect(within(preview()).getByRole("heading", { name: "Work Experience" })).toBeInTheDocument();
  });

  it("labels every form control", async () => {
    seedCV();
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByDisplayValue("Alex Example");
    const check = () => {
      const controls = document.querySelectorAll<HTMLElement>("input, select, textarea");
      for (const el of Array.from(controls)) {
        if (el.getAttribute("aria-hidden") === "true" || el.closest("[hidden]")) continue;
        const labelled =
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby") ||
          (el.id && document.querySelector(`label[for="${el.id}"]`)) ||
          el.closest("label");
        expect(labelled, el.outerHTML).toBeTruthy();
      }
    };
    check();
    await user.click(screen.getByRole("tab", { name: "Design" }));
    check();
    await openDocuments(user);
    check();
  });
});

describe("builder helpers", () => {
  it("applies CV actions to CVs and letter actions to letters only", () => {
    const cv: AnyDoc = { kind: "cv", data: createEmptyCV() };
    const letter: AnyDoc = { kind: "letter", data: createEmptyLetter("en") };
    const named = docReducer(cv, { type: "cv", action: { type: "setPersonal", patch: { fullName: "Ana" } } });
    expect(named.kind === "cv" && named.data.personal.fullName).toBe("Ana");
    expect(docReducer(letter, { type: "cv", action: { type: "setSummary", value: "x" } })).toBe(letter);
    expect(docReducer(cv, { type: "letter", action: { type: "setField", field: "body", value: "x" } })).toBe(cv);
    expect(docReducer(cv, { type: "load", doc: letter })).toBe(letter);
  });

  it("lets automatic names follow the content until the person renames", () => {
    const empty: AnyDoc = { kind: "cv", data: createEmptyCV() };
    const named: AnyDoc = { kind: "cv", data: { ...createEmptyCV(), personal: { ...createEmptyCV().personal, fullName: "Ana" } } };
    expect(followingName("Untitled CV", empty, named, "en")).toBe("Ana");
    expect(followingName("CV tanpa judul", empty, named, "en")).toBe("Ana");
    expect(followingName("Ana", named, empty, "id")).toBe("CV tanpa judul");
    expect(followingName("My own name", empty, named, "en")).toBeNull();
    expect(followingName("Ana", named, named, "en")).toBeNull();

    const letter = createEmptyLetter("en");
    const withCompany = { ...letter, recipient: { ...letter.recipient, company: "Acme" } };
    expect(followingName("Cover letter", { kind: "letter", data: letter }, { kind: "letter", data: withCompany }, "en")).toBe(
      "Cover letter – Acme",
    );
  });

  it("names copies within the name limit", () => {
    expect(copyName("Jane Doe", "{name} (copy)")).toBe("Jane Doe (copy)");
    const long = copyName("x".repeat(200), "{name} (salinan)");
    expect(long.length).toBeLessThanOrEqual(120);
    expect(long.endsWith("… (salinan)")).toBe(true);
  });
});
