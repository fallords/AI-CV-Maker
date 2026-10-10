"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CVDocument } from "@/components/templates";
import { btn } from "@/components/ui/styles";
import { TEMPLATE_IDS } from "@/lib/cv-schema";
import { useI18n } from "@/lib/i18n";
import { showcaseCV } from "@/lib/sample-cv";
import { hasDraft } from "@/lib/storage";

const A4_PX = 793.7;
const THUMB_SCALE = 0.36;
const THUMB_W = A4_PX * THUMB_SCALE;
/** A4 ratio, rounded down by ~1px so page 1 ends in a gap instead of through a text line. */
const THUMB_H = 403;
/**
 * Hero sheet: a real A4 page scaled to HERO_W and cut off at HERO_H, in the white gap
 * between Projects and Education. The gap moves by one line depending on whether the
 * summary wraps to two or three lines (font dependent); 461 sits inside it in both cases.
 */
const HERO_W = 420;
const HERO_H = 461;

const container = "mx-auto max-w-6xl px-4";
const h2Class = "font-display text-2xl font-semibold tracking-[-0.01em] text-fg";
const prose = "text-[15px] leading-relaxed text-pretty text-fg-body";
const textLink =
  "font-medium text-accent-text underline decoration-accent-line underline-offset-4 hover:decoration-accent-text";
/** White CV paper on the dark canvas: square corners, a tight contact shadow, no halo. */
const paper =
  "overflow-hidden bg-paper shadow-[0_1px_2px_rgba(0,0,0,0.5),0_8px_16px_-8px_rgba(0,0,0,0.6)] ring-1 ring-black/40";
/** Heading in the left third, content in the right two thirds (shared with Help and Privacy). */
const splitRow = "grid gap-x-12 gap-y-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]";

export function LandingContent() {
  const { t } = useI18n();
  const l = t.landing;
  const [draftExists, setDraftExists] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
  useEffect(() => setDraftExists(hasDraft()), []);

  return (
    <main id="main" className="flex-1">
      {/* Hero */}
      <section>
        <div
          className={`${container} grid gap-12 pt-10 pb-14 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-16`}
        >
          <div>
            <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[2.75rem]">
              {l.title}
            </h1>
            <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-fg-body">{l.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/builder/" className={`${btn.primary} min-h-11 px-5 text-[15px]`}>
                {l.ctaPrimary}
              </Link>
              <a href="#templates" className={`inline-flex min-h-11 items-center text-[15px] ${textLink}`}>
                {l.ctaSecondary}
              </a>
            </div>
            {draftExists && (
              <p className="mt-3 text-sm">
                <Link href="/builder/" className={textLink}>
                  {l.ctaContinue}
                </Link>
              </p>
            )}
            <dl className="mt-10 max-w-xl border-b border-line">
              {l.facts.map((fact) => (
                <div
                  key={fact.label}
                  className="grid gap-x-6 gap-y-0.5 border-t border-line py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-baseline"
                >
                  <dt className="text-[15px] text-fg-muted">{fact.label}</dt>
                  <dd className={prose}>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div aria-hidden="true" inert className="hidden lg:block">
            <div className={paper} style={{ width: HERO_W, height: HERO_H }}>
              <div className="origin-top-left" style={{ transform: `scale(${HERO_W / A4_PX})`, width: A4_PX }}>
                <div className="cv-sheet">
                  <CVDocument cv={showcaseCV("modern-professional")} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="scroll-mt-4 border-t border-line" aria-labelledby="templates-title">
        <div className={`${container} pt-12 pb-16 sm:pt-14 sm:pb-20`}>
          <h2 id="templates-title" className={h2Class}>
            {l.templatesTitle}
          </h2>
          <p className={`mt-3 max-w-[65ch] ${prose}`}>{l.templatesBody}</p>
          <ul
            tabIndex={0}
            aria-label={l.templatesTitle}
            className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-6 overflow-x-auto px-4 pt-1 pb-2 sm:mx-0 sm:mt-10 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 sm:overflow-visible sm:px-0 sm:pt-0 sm:pb-0 lg:grid-cols-3"
          >
            {TEMPLATE_IDS.map((id) => (
              <li key={id} className="shrink-0 snap-start">
                <div className={paper} style={{ width: THUMB_W, height: THUMB_H }} aria-hidden="true" inert>
                  <div className="origin-top-left" style={{ transform: `scale(${THUMB_SCALE})`, width: A4_PX }}>
                    <div className="cv-sheet">
                      <CVDocument cv={showcaseCV(id)} />
                    </div>
                  </div>
                </div>
                <div className="mt-4" style={{ maxWidth: THUMB_W }}>
                  <h3 className="text-[15px] font-semibold text-fg">{t.templates[id].name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">{t.templates[id].description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Privacy */}
      <section className="border-t border-line" aria-labelledby="privacy-title">
        <div className={`${container} ${splitRow} py-10 sm:py-12`}>
          <h2 id="privacy-title" className={h2Class}>
            {l.privacyTitle}
          </h2>
          <div>
            <p className={`max-w-[65ch] ${prose}`}>{l.privacyBody}</p>
            <p className="mt-4 text-[15px]">
              <Link href="/privacy/" className={textLink}>
                {l.privacyLink}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className="border-t border-line" aria-labelledby="faq-title">
        <div className={`${container} ${splitRow} pt-12 pb-20 sm:pt-14 sm:pb-24`}>
          <h2 id="faq-title" className={h2Class}>
            {l.faqTitle}
          </h2>
          <dl className="max-w-[65ch] divide-y divide-line">
            {l.faq.map((item) => (
              <div key={item.q} className="py-5 first:pt-0 last:pb-0">
                <dt className="text-[15px] leading-relaxed font-semibold text-fg">{item.q}</dt>
                <dd className={`mt-1.5 ${prose}`}>{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
