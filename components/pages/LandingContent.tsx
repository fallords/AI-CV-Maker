"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CVDocument } from "@/components/templates";
import { btn, card } from "@/components/ui/styles";
import { isAIEnabled } from "@/lib/ai/provider";
import { TEMPLATE_IDS } from "@/lib/cv-schema";
import { listDocs } from "@/lib/documents";
import { useI18n } from "@/lib/i18n";
import { heroCV } from "@/lib/sample-cv";
import { hasDraft } from "@/lib/storage";
import { HeroFolder } from "./HeroFolder";

const A4_PX = 793.7;
const THUMB_SCALE = 0.4;
const THUMB_W = A4_PX * THUMB_SCALE;
/** A whole A4 page (297mm). The example CV fits on one page in every template, so nothing is cut off. */
const THUMB_H = Math.round(1122.5 * THUMB_SCALE);

const container = "mx-auto w-full max-w-6xl px-4";
/** Ink link with an ink underline; reads on kraft and on paper. */
const textLink = "font-medium text-fg underline decoration-1 underline-offset-4 hover:decoration-2";
/** A sheet of paper on the folder: square corners and the paper shadow. */
const sheet = "overflow-hidden bg-paper shadow-[0_1px_0_var(--color-kraft-deep),0_2px_6px_-2px_rgb(74_48_25/0.35)]";
const panelH2 = "font-display text-[21px] leading-snug font-semibold text-fg";
const panelText = "text-base leading-[1.55] text-pretty text-fg-body";

/**
 * Below the `sm` breakpoint the template strip scrolls sideways, so keyboard users need to be
 * able to focus it. From `sm` up it is a static grid and must not be a Tab stop.
 */
const NARROW = "(max-width: 639.98px)";
function subscribeNarrow(onChange: () => void) {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getNarrow = () => window.matchMedia(NARROW).matches;
const getNarrowOnServer = () => false;

export function LandingContent() {
  const { t, lang } = useI18n();
  const l = t.landing;
  const [hasSavedDocs, setHasSavedDocs] = useState(false);
  // A draft from the single-draft version still counts: the builder moves it into the documents store on open.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
  useEffect(() => setHasSavedDocs(listDocs().length > 0 || hasDraft()), []);
  const stripScrolls = useSyncExternalStore(subscribeNarrow, getNarrow, getNarrowOnServer);

  return (
    <main id="main" className="flex-1">
      {/* Hero: what it is and the CTA on the left, the folder on the right. On phones the
          folder follows the CTA and the facts come last. */}
      <section aria-labelledby="hero-title">
        <div
          className={`${container} grid gap-y-12 pt-8 pb-16 sm:pt-14 sm:pb-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-14`}
        >
          <div className="lg:col-start-1 lg:row-start-1">
            <h1
              id="hero-title"
              className="max-w-[16ch] text-[2.25rem] leading-[1.04] font-extrabold tracking-[-0.01em] text-balance text-fg [font-stretch:125%] sm:text-5xl"
            >
              {l.title}
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg leading-[1.55] text-pretty text-fg">{l.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
              <Link href="/builder/" className={`${btn.primary} min-h-12 px-6 text-base`}>
                {l.ctaPrimary}
              </Link>
              <a href="#templates" className={`inline-flex min-h-11 items-center text-base ${textLink}`}>
                {l.ctaSecondary}
              </a>
            </div>
            {hasSavedDocs && (
              <p className="mt-4 text-base">
                <Link href="/builder/" className={`inline-flex min-h-10 items-center ${textLink}`}>
                  {l.ctaContinue}
                </Link>
              </p>
            )}
          </div>

          <div className="mx-auto w-full max-w-[460px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-none">
            <HeroFolder />
          </div>

          <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:col-start-1 lg:row-start-2 lg:self-end">
            {l.facts.map((fact) => (
              <li key={fact.title}>
                <p className="text-base leading-snug font-semibold text-fg">{fact.title}</p>
                <p className="mt-1 text-base leading-[1.5] text-pretty text-kraft-ink">{fact.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Templates: three sheets, each under its folder tab. */}
      <section id="templates" className="scroll-mt-4" aria-labelledby="templates-title">
        <div className={`${container} pb-16 sm:pb-24`}>
          <h2 id="templates-title" className="font-display text-2xl leading-tight font-semibold text-fg">
            {l.templatesTitle}
          </h2>
          <p className="mt-3 max-w-[62ch] text-base leading-[1.55] text-pretty text-kraft-ink">{l.templatesBody}</p>
          {/* The ring is drawn inside the strip (it is full-bleed on phones); `!` beats the global :focus-visible rule. */}
          <ul
            tabIndex={stripScrolls ? 0 : undefined}
            aria-label={stripScrolls ? l.templatesTitle : undefined}
            className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-6 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:mt-10 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 sm:overflow-visible sm:px-0 sm:pt-0 sm:pb-0 lg:grid-cols-3 focus-visible:outline-offset-[-2px]!"
          >
            {TEMPLATE_IDS.map((id) => (
              <li key={id} className="shrink-0 snap-start" style={{ width: THUMB_W }}>
                <h3 className="inline-flex min-h-9 items-center rounded-t-[6px] bg-kraft-deep px-3 text-sm font-medium text-white">
                  {t.templates[id].name}
                </h3>
                <div className={sheet} style={{ width: THUMB_W, height: THUMB_H }} aria-hidden="true" inert>
                  <div className="origin-top-left" style={{ transform: `scale(${THUMB_SCALE})`, width: A4_PX }}>
                    <div className="cv-sheet">
                      <CVDocument cv={heroCV(id, lang)} />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-base leading-[1.5] text-pretty text-fg">{t.templates[id].description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Privacy and questions: one sheet of paper. */}
      <div className={`${container} pb-20 sm:pb-28`}>
        <div className={`${card} max-w-[46rem] px-5 py-8 sm:px-12 sm:py-12`}>
          <section aria-labelledby="privacy-title">
            <h2 id="privacy-title" className={panelH2}>
              {l.privacyTitle}
            </h2>
            <p className={`mt-3 ${panelText}`}>{l.privacyBody}</p>
            <p className="mt-3 text-base">
              <Link href="/privacy/" className={`inline-flex min-h-10 items-center ${textLink}`}>
                {l.privacyLink}
              </Link>
            </p>
          </section>

          <section aria-labelledby="faq-title" className="mt-12">
            <h2 id="faq-title" className={panelH2}>
              {l.faqTitle}
            </h2>
            <dl className="mt-6 space-y-7">
              {l.faq.map((item) => (
                <div key={item.q}>
                  <dt className="text-base leading-snug font-semibold text-fg">{item.q}</dt>
                  <dd className={`mt-2 ${panelText}`}>{item.a}</dd>
                </div>
              ))}
              <div>
                <dt className="text-base leading-snug font-semibold text-fg">{l.aiFaq.q}</dt>
                <dd className={`mt-2 ${panelText}`}>{isAIEnabled() ? l.aiFaq.on : l.aiFaq.off}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </main>
  );
}
