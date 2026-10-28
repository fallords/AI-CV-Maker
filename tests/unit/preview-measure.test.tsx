import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentPreview } from "@/components/cv-preview/DocumentPreview";
import { I18nProvider } from "@/lib/i18n";
import { sampleCV } from "@/lib/sample-cv";

/** A ResizeObserver whose callbacks the test runs by hand. */
const observers: (() => void)[] = [];
class ManualResizeObserver {
  constructor(private callback: () => void) {
    observers.push(() => this.callback());
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
const resize = () => act(() => observers.forEach((run) => run()));

/** The preview sheet's layout as jsdom will report it. */
const layout = { height: 0, rendered: true };
let originalRO: typeof ResizeObserver;

beforeEach(() => {
  observers.length = 0;
  originalRO = globalThis.ResizeObserver;
  globalThis.ResizeObserver = ManualResizeObserver as unknown as typeof ResizeObserver;
  const isSheet = (el: Element) => el.classList.contains("cv-sheet");
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(function (this: Element) {
    return isSheet(this) && layout.rendered ? layout.height : 0;
  });
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
    return (isSheet(this) && layout.rendered ? [new DOMRect(0, 0, 794, layout.height)] : []) as unknown as DOMRectList;
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return layout.rendered ? 600 : 0;
  });
});

afterEach(() => {
  globalThis.ResizeObserver = originalRO;
  vi.restoreAllMocks();
});

describe("DocumentPreview page count", () => {
  it("keeps the last real measurement while the preview isn't rendered", () => {
    layout.height = 4000;
    layout.rendered = true;
    const onPages = vi.fn();
    render(
      <I18nProvider initialLang="en">
        <DocumentPreview doc={{ kind: "cv", data: sampleCV() }} onPagesChange={onPages} />
      </I18nProvider>,
    );
    expect(onPages).toHaveBeenLastCalledWith(4);
    expect(screen.getByText("A4, 4 pages")).toBeInTheDocument();

    // Hidden with display: none (e.g. a phone showing the Edit tab): everything measures 0.
    layout.rendered = false;
    resize();
    expect(onPages).toHaveBeenLastCalledWith(4);
    expect(screen.getByText("A4, 4 pages")).toBeInTheDocument();

    // Shown again with less content: the new measurement counts.
    layout.rendered = true;
    layout.height = 1000;
    resize();
    expect(onPages).toHaveBeenLastCalledWith(1);
    expect(screen.getByText("A4, 1 page")).toBeInTheDocument();
  });
});
