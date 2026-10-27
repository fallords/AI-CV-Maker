import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroFolder } from "@/components/pages/HeroFolder";
import {
  DEMO_MAX_MS,
  DEMO_TIMING,
  demoDuration,
  demoFrame,
  demoStepCount,
  demoTimes,
} from "@/components/pages/hero-demo";
import { LANGUAGES, TEMPLATE_IDS, type CVData } from "@/lib/cv-schema";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { heroCV, showcaseCV } from "@/lib/sample-cv";

const LIST_KEYS = [
  "experience",
  "education",
  "projects",
  "technicalSkills",
  "softSkills",
  "certifications",
  "languages",
  "organizations",
  "awards",
  "references",
  "interests",
  "customSections",
] as const;

/** Ids of every entry in a frame, in the order the template shows its sections. */
function entryIds(cv: CVData): string[] {
  return LIST_KEYS.flatMap((key) => (cv[key] as { id: string }[]).map((item) => item.id));
}

describe("demo frames", () => {
  const cv = heroCV("ats-minimal", "en");

  it("starts from an empty sheet that keeps the template, language and style", () => {
    const frame = demoFrame(cv, 0);
    expect(frame.meta).toEqual(cv.meta);
    expect(frame.personal).toMatchObject({ fullName: "", title: "", email: "", city: "", country: "" });
    expect(frame.summary).toBe("");
    expect(entryIds(frame)).toEqual([]);
  });

  it("ends with the CV itself, and clamps steps out of range", () => {
    const total = demoStepCount(cv);
    expect(demoFrame(cv, total)).toBe(cv);
    expect(demoFrame(cv, total + 10)).toBe(cv);
    expect(demoFrame(cv, -3)).toEqual(demoFrame(cv, 0));
  });

  it("types the name, then the job title, one character per step", () => {
    const name = cv.personal.fullName;
    for (let i = 1; i <= name.length; i++) {
      expect(demoFrame(cv, i).personal.fullName).toBe(name.slice(0, i));
      expect(demoFrame(cv, i).personal.title).toBe("");
    }
    const title = cv.personal.title;
    for (let i = 1; i <= title.length; i++) {
      const frame = demoFrame(cv, name.length + i);
      expect(frame.personal.title).toBe(title.slice(0, i));
      expect(frame.personal.email).toBe("");
    }
  });

  it("shows the contact line, then the summary, then one entry per step", () => {
    const typed = cv.personal.fullName.length + cv.personal.title.length;
    const contact = demoFrame(cv, typed + 1);
    expect(contact.personal.email).toBe(cv.personal.email);
    expect(contact.personal.city).toBe(cv.personal.city);
    expect(contact.summary).toBe("");
    expect(demoFrame(cv, typed + 2).summary).toBe(cv.summary);

    let previous = 0;
    for (let step = typed + 3; step <= demoStepCount(cv); step++) {
      const count = entryIds(demoFrame(cv, step)).length;
      expect(count).toBeGreaterThan(previous);
      previous = count;
    }
  });

  it("reveals entries in the order the template shows them", () => {
    const firstOf = (template: (typeof TEMPLATE_IDS)[number]) => {
      const c = heroCV(template, "en");
      const typed = c.personal.fullName.length + c.personal.title.length + 2;
      return entryIds(demoFrame(c, typed + 1));
    };
    expect(firstOf("ats-minimal")).toEqual(["exp1"]);
    expect(firstOf("modern-professional")).toEqual(["exp1"]);
    // Graduate puts education first.
    expect(firstOf("graduate")).toEqual(["edu1"]);
  });

  it("has the same steps and timing for every template, so a template change keeps the place", () => {
    for (const lang of LANGUAGES) {
      const counts = TEMPLATE_IDS.map((id) => demoStepCount(heroCV(id, lang)));
      const times = TEMPLATE_IDS.map((id) => demoTimes(heroCV(id, lang)).join(","));
      expect(new Set(counts).size).toBe(1);
      expect(new Set(times).size).toBe(1);
    }
  });

  it("starts after the slide, keeps steps in order and ends within 4.5 seconds", () => {
    for (const lang of LANGUAGES) {
      for (const id of TEMPLATE_IDS) {
        const c = heroCV(id, lang);
        const times = demoTimes(c);
        expect(times).toHaveLength(demoStepCount(c));
        expect(times[0]).toBe(DEMO_TIMING.slide);
        times.slice(1).forEach((t, i) => expect(t).toBeGreaterThan(times[i]));
        expect(demoDuration(c)).toBe(times[times.length - 1]);
        expect(demoDuration(c)).toBeLessThanOrEqual(DEMO_MAX_MS);
      }
    }
  });
});

describe("heroCV", () => {
  it("is the fictional showcase person, trimmed, with nothing added", () => {
    for (const lang of LANGUAGES) {
      for (const id of TEMPLATE_IDS) {
        const hero = heroCV(id, lang);
        const showcase = showcaseCV(id, lang);
        expect(hero.personal.fullName).toBe("Nadia Rahmawati");
        expect(hero.meta).toEqual(showcase.meta);
        expect(hero.personal.email).toBe(showcase.personal.email);
        for (const key of LIST_KEYS) {
          const ids = new Set((showcase[key] as { id: string }[]).map((item) => item.id));
          for (const item of hero[key] as { id: string }[]) expect(ids.has(item.id)).toBe(true);
        }
        // Dates, employers and places are the showcase's own.
        for (const e of hero.experience) {
          const original = showcase.experience.find((x) => x.id === e.id)!;
          expect([e.company, e.location, e.startDate, e.endDate, e.current]).toEqual([
            original.company,
            original.location,
            original.startDate,
            original.endDate,
            original.current,
          ]);
        }
      }
    }
  });

  it("is in English as it is, and in Indonesian for an Indonesian page", () => {
    const en = heroCV("ats-minimal", "en");
    const showcase = showcaseCV("ats-minimal", "en");
    expect(en.summary).toBe(showcase.summary);
    expect(en.experience[0]).toEqual(showcase.experience[0]);
    const id = heroCV("ats-minimal", "id");
    expect(id.meta.cvLanguage).toBe("id");
    expect(id.personal.title).toBe("Analis Data");
    expect(id.summary).not.toBe(showcase.summary);
  });
});

// ---------------------------------------------------------------------------
// The component

/** An IntersectionObserver the test triggers by hand. */
const observers: ((entries: Partial<IntersectionObserverEntry>[]) => void)[] = [];
class ManualIntersectionObserver {
  constructor(private callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
    observers.push((entries) => this.callback(entries));
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

function allowMotion() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  vi.stubGlobal("IntersectionObserver", ManualIntersectionObserver);
}

/** Stands in for the header's language switch. */
function SwitchToIndonesian() {
  const { setLang } = useI18n();
  return (
    <button type="button" onClick={() => setLang("id")}>
      Switch to Indonesian
    </button>
  );
}

function renderFolder() {
  return render(
    <I18nProvider initialLang="en">
      <SwitchToIndonesian />
      <HeroFolder />
    </I18nProvider>,
  );
}

const folder = () => screen.getByTestId("hero-folder");
const sheet = () => screen.getByTestId("hero-sheet");
const nameOnSheet = () => sheet().querySelector(".cv-name")?.textContent ?? "";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  observers.length = 0;
});

describe("HeroFolder without motion", () => {
  // jsdom has neither matchMedia nor IntersectionObserver: the finished sheet, nothing moves.
  it("shows the finished CV at once and no Play again button", () => {
    renderFolder();
    expect(folder()).toHaveAttribute("data-demo", "still");
    expect(nameOnSheet()).toBe("Nadia Rahmawati");
    expect(sheet()).toHaveTextContent("Python, pandas, Plotly");
    expect(screen.queryByRole("button", { name: "Play again" })).not.toBeInTheDocument();
  });

  it("keeps the sheet out of the accessibility tree and focus order", () => {
    renderFolder();
    expect(sheet()).toHaveAttribute("aria-hidden", "true");
    expect(sheet()).toHaveAttribute("inert");
  });

  it("switches templates with a radio group named Template", () => {
    renderFolder();
    const group = screen.getByRole("radiogroup", { name: "Template" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.closest("label")?.textContent)).toEqual([
      "ATS Minimal",
      "Modern Professional",
      "Graduate",
    ]);
    expect(within(group).getByRole("radio", { name: "ATS Minimal" })).toBeChecked();
    expect(sheet().querySelector(".cv-doc")).toHaveClass("tpl-ats");
    fireEvent.click(within(group).getByRole("radio", { name: "Modern Professional" }));
    expect(sheet().querySelector(".cv-doc")).toHaveClass("tpl-modern");
  });

  it("sets the accent colour with a radio group named Colour", () => {
    renderFolder();
    const group = screen.getByRole("radiogroup", { name: "Colour" });
    expect(within(group).getAllByRole("radio").map((r) => r.closest("label")?.textContent)).toEqual([
      "Template colour",
      "Ink",
      "Prussian blue",
      "Forest green",
      "Burgundy",
    ]);
    expect(within(group).getByRole("radio", { name: "Template colour" })).toBeChecked();
    fireEvent.click(within(group).getByRole("radio", { name: "Burgundy" }));
    const doc = sheet().querySelector<HTMLElement>(".cv-doc")!;
    expect(doc.style.getPropertyValue("--cv-accent")).toBe("#7a1f2b");
  });
});

describe("HeroFolder with motion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    allowMotion();
  });

  const cv = heroCV("ats-minimal", "en");
  const enterView = () =>
    act(() => observers.forEach((run) => run([{ isIntersecting: true, intersectionRatio: 0.5 }])));
  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it("waits with an empty sheet until the folder comes into view", () => {
    renderFolder();
    expect(folder()).toHaveAttribute("data-demo", "armed");
    expect(nameOnSheet()).toBe("");
    expect(sheet().querySelectorAll(".cv-entry")).toHaveLength(0);
  });

  it("types the name, fills the sheet and rests within 4.5 seconds", () => {
    renderFolder();
    enterView();
    expect(folder()).toHaveAttribute("data-demo", "playing");
    advance(DEMO_TIMING.slide + DEMO_TIMING.char * 4);
    expect(nameOnSheet()).toBe("Nadia");
    advance(DEMO_MAX_MS);
    expect(folder()).toHaveAttribute("data-demo", "done");
    expect(nameOnSheet()).toBe("Nadia Rahmawati");
    expect(sheet()).toHaveTextContent("Python, pandas, Plotly");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("plays again from an empty sheet", () => {
    renderFolder();
    enterView();
    advance(DEMO_MAX_MS);
    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    expect(folder()).toHaveAttribute("data-demo", "playing");
    expect(nameOnSheet()).toBe("");
    advance(demoDuration(cv));
    expect(folder()).toHaveAttribute("data-demo", "done");
    expect(nameOnSheet()).toBe("Nadia Rahmawati");
  });

  it("keeps its place when the template changes mid-sequence", () => {
    renderFolder();
    enterView();
    advance(DEMO_TIMING.slide + DEMO_TIMING.char * 4);
    fireEvent.click(screen.getByRole("radio", { name: "Graduate" }));
    expect(sheet().querySelector(".cv-doc")).toHaveClass("tpl-graduate");
    expect(folder()).toHaveAttribute("data-demo", "playing");
    expect(nameOnSheet()).toBe("Nadia");
  });

  it("jumps to the finished sheet when the language changes mid-sequence", () => {
    renderFolder();
    enterView();
    advance(DEMO_TIMING.slide + DEMO_TIMING.char * 4);
    fireEvent.click(screen.getByRole("button", { name: "Switch to Indonesian" }));
    expect(folder()).toHaveAttribute("data-demo", "done");
    expect(sheet()).toHaveTextContent("Analis Data");
    expect(nameOnSheet()).toBe("Nadia Rahmawati");
    // React's own scheduler work runs within a millisecond; the demo's step timers are gone.
    advance(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByRole("button", { name: "Putar lagi" })).toBeInTheDocument();
  });

  it("clears its timers when it unmounts", () => {
    const { unmount } = renderFolder();
    enterView();
    advance(DEMO_TIMING.slide);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
