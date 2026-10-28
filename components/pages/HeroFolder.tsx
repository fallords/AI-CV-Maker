"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CVDocument } from "@/components/templates";
import { MOTION_EASE, useReducedMotion } from "@/components/ui/motion";
import { TEMPLATE_IDS, type TemplateId } from "@/lib/cv-schema";
import { ACCENT_PRESETS, templateColor } from "@/lib/doc-style";
import { useI18n } from "@/lib/i18n";
import { heroCV } from "@/lib/sample-cv";
import { DEMO_TIMING, demoFrame, demoStepCount, demoTimes } from "./hero-demo";
import "./landing.css";

/** Width of an A4 page in CSS pixels (210mm). */
const A4_PX = 793.7;

/** The template's own colour, then four presets from the Design tab. */
const HERO_ACCENTS = ["default", "ink", "prussian", "forest", "burgundy"] as const;
type HeroAccent = (typeof HERO_ACCENTS)[number];

type Phase = "armed" | "playing" | "done";

const subscribeNothing = () => () => {};
/** False in static HTML and during hydration, true after. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

const hasIntersectionObserver = () =>
  typeof window !== "undefined" && typeof window.IntersectionObserver === "function";

/**
 * The landing page's application folder: index tabs choose the template, a real CV stands
 * in the folder on white paper, and the front flap carries the colour choice. When the
 * folder first comes into view the sheet rises and the CV fills itself in (the page's one
 * orchestrated moment, a little over 3 seconds). With reduced motion, before hydration or
 * without IntersectionObserver it shows the finished CV and nothing moves.
 */
export function HeroFolder() {
  const { t, lang } = useI18n();
  const f = t.landing.folder;
  const baseId = useId();
  const colourLabelId = `${baseId}-colour`;

  const [template, setTemplate] = useState<TemplateId>("ats-minimal");
  const [accent, setAccent] = useState<HeroAccent>("default");
  const [phase, setPhase] = useState<Phase>("armed");
  const [step, setStep] = useState(0);
  /** Counts starts of the sequence; each start schedules its own timers. */
  const [run, setRun] = useState(0);

  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const animated = hydrated && !reduced && hasIntersectionObserver();

  // A language change in the middle of the sequence jumps to the finished sheet.
  const [seenLang, setSeenLang] = useState(lang);
  if (seenLang !== lang) {
    setSeenLang(lang);
    if (phase === "playing") setPhase("done");
  }

  const cv = useMemo(() => {
    const base = heroCV(template, lang);
    const hex = ACCENT_PRESETS.find((p) => p.id === accent)?.hex ?? "";
    return hex ? { ...base, meta: { ...base.meta, style: { ...base.meta.style, accent: hex } } } : base;
  }, [template, lang, accent]);

  const total = demoStepCount(cv);
  const shownStep = !animated || phase === "done" ? total : phase === "armed" ? 0 : step;
  const frame = demoFrame(cv, shownStep);
  const demoState = !hydrated ? "pending" : !animated ? "still" : phase;
  // Same for every template, so switching templates doesn't restart the timers.
  const timesKey = demoTimes(cv).join(",");

  const rootRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Scale the A4 sheet to the folder's width.
  const [scale, setScale] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(width / A4_PX);
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = () => {
    setStep(0);
    setPhase("playing");
    setRun((n) => n + 1);
  };

  // Start once, when 30% of the folder is in view.
  useEffect(() => {
    const el = rootRef.current;
    if (!animated || phase !== "armed" || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setStep(0);
        setPhase("playing");
        setRun((n) => n + 1);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animated, phase]);

  // One run: the sheet slides up, then each step on its own timer. Cleared on unmount, on
  // Play again (a new run) and when the sequence stops early (language change).
  const playing = phase === "playing";
  useEffect(() => {
    if (!playing || run === 0) return;
    sheetRef.current?.animate?.([{ translate: "0 24px" }, { translate: "0 0" }], {
      duration: DEMO_TIMING.slide,
      easing: MOTION_EASE,
    });
    const times = timesKey ? timesKey.split(",").map(Number) : [];
    const timers = times.map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
    const end = times.length > 0 ? times[times.length - 1] : DEMO_TIMING.slide;
    timers.push(window.setTimeout(() => setPhase("done"), end));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [playing, run, timesKey]);

  return (
    <div ref={rootRef} className="hf" data-demo={demoState} data-testid="hero-folder">
      {/* Index tabs: the template choice. Native radios, visually hidden; the label is the tab. */}
      <div role="radiogroup" aria-label={f.template} className="flex items-end gap-1">
        {TEMPLATE_IDS.map((id) => (
          <label
            key={id}
            className="inline-flex min-h-11 min-w-0 cursor-pointer items-center rounded-t-[6px] bg-kraft-deep px-3 text-center text-sm leading-tight font-medium text-white transition-colors duration-150 select-none hover:bg-[#7d5938] has-checked:bg-surface has-checked:text-fg has-checked:shadow-[inset_0_3px_0_var(--color-stamp)] has-checked:hover:bg-surface has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-text max-sm:[font-stretch:82%] sm:px-4"
          >
            <input
              type="radio"
              className="sr-only"
              name={`${baseId}-template`}
              value={id}
              checked={template === id}
              onChange={() => setTemplate(id)}
            />
            {t.templates[id].short}
          </label>
        ))}
      </div>

      <div className="hf-back">
        <div className="hf-stage">
          <div ref={windowRef} className="hf-window">
            <div ref={sheetRef} className="hf-sheet" aria-hidden="true" inert data-testid="hero-sheet">
              <div
                className={scale === null ? "invisible" : undefined}
                style={{ width: A4_PX, transform: `scale(${scale ?? 0.5})`, transformOrigin: "0 0" }}
              >
                {/* A new template or colour fades in; the sequence keeps its place. */}
                <div key={`${template}:${accent}`} className="motion-fade">
                  <div className="cv-sheet">
                    <CVDocument cv={frame} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hf-flap">
            <span className="hf-flap-board" aria-hidden="true" />
            <span className="hf-flap-face" aria-hidden="true" />
            <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-3 pt-5 pb-3 sm:flex sm:px-5 sm:pt-6 sm:pb-4">
              <span id={colourLabelId} className="text-sm font-semibold text-fg sm:mr-1">
                {f.colour}
              </span>
              <div
                role="radiogroup"
                aria-labelledby={colourLabelId}
                className="col-span-2 row-start-2 -ml-1.5 flex flex-wrap sm:ml-0 sm:gap-0.5"
              >
                {HERO_ACCENTS.map((id) => {
                  const hex = ACCENT_PRESETS.find((p) => p.id === id)?.hex || templateColor(template);
                  return (
                    <label key={id} className="relative inline-flex size-10 cursor-pointer items-center justify-center">
                      <input
                        type="radio"
                        className="peer sr-only"
                        name={`${baseId}-accent`}
                        value={id}
                        checked={accent === id}
                        onChange={() => setAccent(id)}
                      />
                      <span className="sr-only">{t.design.accent.names[id]}</span>
                      <span
                        aria-hidden="true"
                        className="block size-7 rounded-full forced-color-adjust-none peer-checked:shadow-[0_0_0_2px_var(--color-kraft),0_0_0_4px_var(--color-fg)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[6px] peer-focus-visible:outline-accent-text"
                        style={{ background: hex }}
                      />
                    </label>
                  );
                })}
              </div>
              {animated && (
                <button
                  type="button"
                  onClick={start}
                  className="col-start-2 row-start-1 inline-flex min-h-10 items-center rounded-sm text-sm font-medium text-fg underline decoration-1 underline-offset-4 hover:decoration-2 sm:ml-auto"
                >
                  {f.playAgain}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
