"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CVDocument } from "@/components/templates";
import { btn } from "@/components/ui/styles";
import { TEMPLATE_IDS } from "@/lib/cv-schema";
import { useI18n } from "@/lib/i18n";
import { sampleCV } from "@/lib/sample-cv";
import { hasDraft } from "@/lib/storage";

const A4_PX = 793.7;
const THUMB_SCALE = 0.36;
const THUMB_W = A4_PX * THUMB_SCALE;
const THUMB_H = THUMB_W * 1.414;
/** Hero sheet: a real A4 page scaled to this width and cut off at HERO_H. */
const HERO_W = 420;
const HERO_H = 500;

const container = "mx-auto max-w-6xl px-4";
const sectionPad = "py-16 sm:py-20";
const h2Class = "font-display text-2xl font-semibold tracking-[-0.01em] text-fg";
const monoLabel = "font-mono text-xs uppercase tracking-[0.08em] text-fg-subtle";
const textLink =
  "font-medium text-accent-text underline decoration-accent-line underline-offset-4 hover:decoration-accent-text";

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
          className={`${container} grid gap-12 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-16`}
        >
          <div>
            <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[2.75rem]">
              {l.title}
            </h1>
            <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-fg-muted">{l.subtitle}</p>
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
                  className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-t border-line py-3"
                >
                  <dt className={monoLabel}>{fact.label}</dt>
                  <dd className="text-[15px] leading-relaxed text-fg">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div aria-hidden="true" inert className="hidden sm:block">
            <div
              className="overflow-hidden bg-paper shadow-[0_2px_6px_rgba(0,0,0,0.45),0_16px_40px_rgba(0,0,0,0.4)] ring-1 ring-black/40"
              style={{ width: HERO_W, height: HERO_H }}
            >
              <div className="origin-top-left" style={{ transform: `scale(${HERO_W / A4_PX})`, width: A4_PX }}>
                <div className="cv-sheet">
                  <CVDocument cv={sampleCV("modern-professional")} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-line" aria-labelledby="steps-title">
        <div className={`${container} ${sectionPad}`}>
          <h2 id="steps-title" className={h2Class}>
            {l.stepsTitle}
          </h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
            {l.steps.map((step, i) => (
              <li key={step.title} className="md:px-8 md:first:pl-0 md:last:pr-0">
                <span aria-hidden="true" className={`block ${monoLabel}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-base font-semibold text-fg">{step.title}</h3>
                <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-fg-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="scroll-mt-4 border-t border-line" aria-labelledby="templates-title">
        <div className={`${container} ${sectionPad}`}>
          <h2 id="templates-title" className={h2Class}>
            {l.templatesTitle}
          </h2>
          <p className="mt-3 max-w-[65ch] text-[15px] leading-relaxed text-fg-muted">{l.templatesBody}</p>
          <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_IDS.map((id) => (
              <li key={id}>
                <div
                  className="overflow-hidden bg-paper shadow-[0_1px_3px_rgba(0,0,0,0.45),0_10px_24px_rgba(0,0,0,0.35)] ring-1 ring-black/40"
                  style={{ width: THUMB_W, height: THUMB_H }}
                  aria-hidden="true"
                  inert
                >
                  <div className="origin-top-left" style={{ transform: `scale(${THUMB_SCALE})`, width: A4_PX }}>
                    <div className="cv-sheet">
                      <CVDocument cv={sampleCV(id)} />
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
          <div className="mt-12">
            <Link href="/builder/" className={`${btn.primary} min-h-11 px-5 text-[15px]`}>
              {l.ctaPrimary}
            </Link>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="border-t border-line" aria-labelledby="privacy-title">
        <div className={`${container} ${sectionPad} grid gap-x-12 gap-y-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]`}>
          <h2 id="privacy-title" className={h2Class}>
            {l.privacyTitle}
          </h2>
          <div>
            <p className="max-w-[65ch] text-[15px] leading-relaxed text-fg-muted">{l.privacyBody}</p>
            <p className="mt-4 text-[15px]">
              <Link href="/privacy/" className={textLink}>
                {l.privacyLink}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line" aria-labelledby="faq-title">
        <div className={`${container} ${sectionPad}`}>
          <h2 id="faq-title" className={h2Class}>
            {l.faqTitle}
          </h2>
          <dl className="mt-8 border-b border-line">
            {l.faq.map((item) => (
              <div
                key={item.q}
                className="grid gap-x-12 gap-y-2 border-t border-line py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
              >
                <dt className="text-[15px] leading-relaxed font-semibold text-fg">{item.q}</dt>
                <dd className="max-w-[65ch] text-[15px] leading-relaxed text-fg-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
