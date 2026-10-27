import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderApp } from "@/components/builder/BuilderApp";
import { ChecksPanel } from "@/components/builder/ChecksPanel";
import { EntryList } from "@/components/cv-form/EntryList";
import { DocumentPreview } from "@/components/cv-preview/DocumentPreview";
import { TextField } from "@/components/ui/Field";
import { runChecks } from "@/lib/cv-checks";
import type { TemplateId } from "@/lib/cv-schema";
import { createDoc, setActiveDocId, type AnyDoc } from "@/lib/documents";
import { I18nProvider } from "@/lib/i18n";
import { sampleCV } from "@/lib/sample-cv";

/*
 * Motion in the builder answers what the person does (add, move, switch tab, save,
 * change template) and never plays while the page loads. These tests check the hooks
 * the CSS needs (classes, keys, data-flip-key) and that focus and text don't change.
 */

type Entry = { id: string; title: string };

let nextId = 0;

function Entries({ initial }: { initial: Entry[] }) {
  const [items, setItems] = useState(initial);
  return (
    <I18nProvider initialLang="en">
      <EntryList<Entry>
        items={items}
        addLabel="Add entry"
        emptyText="No entries yet."
        itemLabel="Entry"
        getTitle={(item) => item.title}
        isFilled={(item) => item.title !== ""}
        renderFields={(item, update) => (
          <TextField label="Title" value={item.title} onChange={(title) => update({ title })} />
        )}
        onAdd={() => {
          nextId += 1;
          const id = `new-${nextId}`;
          setItems((list) => [...list, { id, title: "" }]);
          return id;
        }}
        onUpdate={(id, patch) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)))}
        onRemove={(id) => setItems((list) => list.filter((i) => i.id !== id))}
        onMove={(id, direction) =>
          setItems((list) => {
            const from = list.findIndex((i) => i.id === id);
            const to = from + direction;
            if (from < 0 || to < 0 || to >= list.length) return list;
            const copy = [...list];
            [copy[from], copy[to]] = [copy[to], copy[from]];
            return copy;
          })
        }
      />
    </I18nProvider>
  );
}

const twoEntries = (): Entry[] => [
  { id: "a", title: "First" },
  { id: "b", title: "Second" },
];
const rows = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>("ol > li"));

/** Lets motion run: matchMedia says "no reduced motion" (and a wide screen). */
function allowMotion() {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: !query.includes("reduce"),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("entries", () => {
  it("brings in only an entry added with Add, and still moves focus into it", async () => {
    const user = userEvent.setup();
    const { container } = render(<Entries initial={twoEntries()} />);
    // Entries that were there when the list mounted (or a document opened) don't animate.
    for (const row of rows(container)) expect(row).not.toHaveClass("motion-enter");

    await user.click(screen.getByRole("button", { name: "Add entry" }));
    const [first, second, added] = rows(container);
    expect(added).toHaveClass("motion-enter");
    expect(first).not.toHaveClass("motion-enter");
    expect(second).not.toHaveClass("motion-enter");
    expect(within(added).getByLabelText("Title")).toHaveFocus();

    // The entrance class goes once it has played, so a later move can't replay it.
    await waitFor(() => expect(added).not.toHaveClass("motion-enter"), { timeout: 2000 });
  });

  it("marks each entry for the reorder animation and keeps focus on the pressed move button", async () => {
    const user = userEvent.setup();
    const { container } = render(<Entries initial={[...twoEntries(), { id: "c", title: "Third" }]} />);
    expect(rows(container).map((row) => row.dataset.flipKey)).toEqual(["a", "b", "c"]);

    const up = screen.getByRole("button", { name: "Move up: Third" });
    await user.click(up);
    expect(rows(container).map((row) => row.dataset.flipKey)).toEqual(["a", "c", "b"]);
    expect(screen.getByRole("button", { name: "Move up: Third" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Move down: First" }));
    expect(rows(container).map((row) => row.dataset.flipKey)).toEqual(["c", "a", "b"]);
    expect(screen.getByRole("button", { name: "Move down: First" })).toHaveFocus();

    // At the bottom, "Move down" is disabled, so focus goes to the same entry's "Move up".
    await user.click(screen.getByRole("button", { name: "Move down: First" }));
    expect(rows(container).map((row) => row.dataset.flipKey)).toEqual(["c", "b", "a"]);
    expect(screen.getByRole("button", { name: "Move down: First" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move up: First" })).toHaveFocus();
  });

  it("slides moved entries from their old place, unless reduced motion is asked for", async () => {
    const user = userEvent.setup();
    // Each entry is 100px tall, stacked in DOM order.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const el = this as HTMLElement;
      const index = el.dataset?.flipKey ? Array.from(el.parentElement?.children ?? []).indexOf(el) : 0;
      return new DOMRect(0, index * 100, 300, 100);
    });
    const animate = vi.fn();
    const proto = Element.prototype as unknown as { animate?: unknown };
    const originalAnimate = proto.animate;
    proto.animate = animate;
    const restoreMedia = allowMotion();
    try {
      const { container } = render(<Entries initial={twoEntries()} />);
      await user.click(screen.getByRole("button", { name: "Move down: First" }));
      const [second, first] = rows(container);
      const calls = animate.mock.calls.map((call, i) => ({ el: animate.mock.contexts[i], frames: call[0] }));
      expect(calls).toContainEqual({ el: first, frames: [{ translate: "0 -100px" }, { translate: "0 0" }] });
      expect(calls).toContainEqual({ el: second, frames: [{ translate: "0 100px" }, { translate: "0 0" }] });

      // With reduced motion the order still changes, but nothing slides.
      restoreMedia();
      animate.mockClear();
      await user.click(screen.getByRole("button", { name: "Move up: First" }));
      expect(rows(container).map((row) => row.dataset.flipKey)).toEqual(["a", "b"]);
      expect(animate).not.toHaveBeenCalled();
    } finally {
      restoreMedia();
      proto.animate = originalAnimate;
    }
  });
});

describe("preview", () => {
  const cvDoc = (template: TemplateId, name = "Alex Example"): AnyDoc => {
    const data = sampleCV(template);
    data.personal.fullName = name;
    return { kind: "cv", data };
  };
  const content = () => screen.getByRole("document", { name: "CV preview" }).firstElementChild as HTMLElement;

  function Harness({ doc, armed }: { doc: AnyDoc; armed: boolean }) {
    return (
      <I18nProvider initialLang="en">
        <DocumentPreview doc={doc} fadeOnChange={armed} />
      </I18nProvider>
    );
  }

  it("cross-fades a template change made after fading is armed, but never on typing", () => {
    const { rerender } = render(<Harness doc={cvDoc("ats-minimal")} armed={false} />);
    expect(content()).not.toHaveClass("motion-fade");

    // The first document arrives together with arming: no fade while the page loads.
    rerender(<Harness doc={cvDoc("modern-professional")} armed />);
    expect(content()).not.toHaveClass("motion-fade");

    // Typing keeps the same content element.
    const before = content();
    rerender(<Harness doc={cvDoc("modern-professional", "Alex Typed")} armed />);
    expect(content()).toBe(before);
    expect(content()).toHaveTextContent("Alex Typed");

    // A template change remounts the content, which fades in.
    rerender(<Harness doc={cvDoc("graduate")} armed />);
    expect(content()).not.toBe(before);
    expect(content()).toHaveClass("motion-fade");
    expect(content().querySelector(".cv-doc")).toHaveClass("tpl-graduate");
  });

  it("labels page breaks and the page count without middle dots", () => {
    // A sheet about two and a half A4 pages tall.
    const isSheet = (el: Element) => el.classList.contains("cv-sheet");
    vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(function (this: Element) {
      return isSheet(this) ? 2700 : 0;
    });
    vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
      return (isSheet(this) ? [new DOMRect(0, 0, 794, 2700)] : []) as unknown as DOMRectList;
    });
    const { container } = render(<Harness doc={cvDoc("ats-minimal")} armed={false} />);
    expect(screen.getByText("A4, 3 pages")).toBeInTheDocument();
    expect(screen.getByText("Page 2")).toHaveClass("text-stamp");
    expect(screen.getByText("Page 3")).toBeInTheDocument();

    // The interface around the sheet has no dotted meta strings (the CV itself is the person's document).
    const chrome = container.cloneNode(true) as HTMLElement;
    chrome.querySelector(".cv-doc")?.remove();
    expect(chrome.textContent).not.toContain("·");
  });
});

describe("check score", () => {
  it("stamps the score as a bare number and keeps the meter's real values", () => {
    const cv = sampleCV();
    const { score } = runChecks(cv, { pages: 1 });
    render(
      <I18nProvider initialLang="en">
        <ChecksPanel cv={cv} pages={1} onJump={() => {}} />
      </I18nProvider>,
    );
    expect(screen.getByTestId("checks-score").textContent).toBe(String(score));
    expect(screen.getByTestId("checks-score")).toHaveClass("text-stamp", "border-stamp");
    const meter = screen.getByRole("meter", { name: "Score" });
    expect(meter).toHaveAttribute("aria-valuenow", String(score));
    expect(meter).toHaveAttribute("aria-valuetext", `${score} out of 100`);
  });
});

describe("builder", () => {
  function seedCV() {
    const result = createDoc({ kind: "cv", data: sampleCV() }, "Alex Example");
    if (!result.ok) throw new Error("could not seed");
    setActiveDocId(result.meta.id);
  }
  const renderBuilder = () =>
    render(
      <I18nProvider initialLang="en">
        <BuilderApp />
      </I18nProvider>,
    );
  /** The CV form's "Full name" field, found through its label (fast in jsdom). */
  function fullName(): HTMLInputElement {
    const label = Array.from(document.querySelectorAll<HTMLLabelElement>("#personal label")).find((l) =>
      (l.textContent ?? "").startsWith("Full name"),
    );
    const field = label ? document.getElementById(label.htmlFor) : null;
    if (!(field instanceof HTMLInputElement)) throw new Error("Full name field not found");
    return field;
  }
  const status = () => screen.getByTestId("save-status");
  const panel = (name: string) => document.getElementById(screen.getByRole("tab", { name }).getAttribute("aria-controls")!)!;

  it("plays nothing while the page loads", async () => {
    seedCV();
    renderBuilder();
    await waitFor(fullName);

    // The "Opened …" notice and the saved tick appear without an entrance.
    const opened = screen.getByText(/^Opened “Alex Example”/).closest("[role=status]")!.parentElement!;
    expect(opened).not.toHaveClass("motion-enter");
    expect(status()).toHaveTextContent("Saved on this device");
    expect(status().querySelector("svg")).not.toHaveClass("motion-enter");

    expect(document.getElementById("panel-edit")).not.toHaveClass("motion-fade");
    expect(panel("Content")).not.toHaveClass("motion-fade");
    const sheet = screen.getByRole("document", { name: "CV preview" }).firstElementChild;
    expect(sheet).not.toHaveClass("motion-fade");
  });

  it("fades a panel in when the person switches tabs, but never the measured mobile preview", async () => {
    const user = userEvent.setup();
    seedCV();
    renderBuilder();
    await waitFor(fullName);

    await user.click(screen.getByRole("tab", { name: "Design" }));
    expect(panel("Design")).toHaveClass("motion-fade");
    expect(panel("Design")).not.toHaveAttribute("hidden");

    await user.click(screen.getByRole("tab", { name: "Preview" }));
    expect(document.getElementById("panel-preview")).not.toHaveClass("motion-fade");
    await user.click(screen.getByRole("tab", { name: "Edit" }));
    expect(document.getElementById("panel-edit")).toHaveClass("motion-fade");
  });

  it("shows unsaved changes as a pulsing dot and brings the tick back in after the save", async () => {
    seedCV();
    renderBuilder();
    await waitFor(fullName);

    fireEvent.change(fullName(), { target: { value: "Alex Edited" } });
    expect(status()).toHaveTextContent("Unsaved changes…");
    const dot = status().querySelector(".motion-pulse");
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute("aria-hidden", "true");

    await waitFor(() => expect(status()).toHaveTextContent("Saved on this device"));
    expect(status().querySelector(".motion-pulse")).toBeNull();
    expect(status().querySelector("svg")).toHaveClass("motion-enter");
  });

  it("keeps problem states still", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    renderBuilder();
    await waitFor(fullName);
    fireEvent.change(fullName(), { target: { value: "Alex" } });
    await waitFor(() => expect(status()).toHaveTextContent("Browser storage isn’t available"));
    expect(status().querySelector(".motion-pulse, .motion-enter")).toBeNull();
  });

  it("brings each new notice in", async () => {
    const user = userEvent.setup();
    seedCV();
    renderBuilder();
    await waitFor(fullName);

    await user.click(screen.getByRole("button", { name: "Save" }));
    const saved = screen.getByText("Saved on this device.").closest("[role=status]")!.parentElement!;
    expect(saved).toHaveClass("motion-enter");

    // The same message again is a new notice: a new element, so it comes in again.
    await user.click(screen.getByRole("button", { name: "Save" }));
    const again = screen.getByText("Saved on this device.").closest("[role=status]")!.parentElement!;
    expect(again).not.toBe(saved);
    expect(again).toHaveClass("motion-enter");
  });

  it("cross-fades the preview when the template changes, and not when typing", async () => {
    seedCV();
    renderBuilder();
    await waitFor(fullName);
    const content = () => screen.getByRole("document", { name: "CV preview" }).firstElementChild as HTMLElement;

    const before = content();
    act(() => {
      fireEvent.change(fullName(), { target: { value: "Alex Typing" } });
    });
    expect(content()).toBe(before);
    expect(content()).not.toHaveClass("motion-fade");

    fireEvent.change(screen.getByRole("combobox", { name: "Template" }), { target: { value: "graduate" } });
    expect(content()).not.toBe(before);
    expect(content()).toHaveClass("motion-fade");
    expect(content().querySelector(".cv-doc")).toHaveClass("tpl-graduate");
  });
});
