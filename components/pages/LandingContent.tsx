"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CVDocument } from "@/components/templates";
import { btn } from "@/components/ui/styles";
import { TEMPLATE_IDS } from "@/lib/cv-schema";
import { useI18n } from "@/lib/i18n";
import { sampleCV } from "@/lib/sample-cv";
import { hasDraft } from "@/lib/storage";

const THUMB_SCALE = 0.36;
const A4_PX = 793.7;

export function LandingContent() {
  const { t } = useI18n();
  const l = t.landing;
  const [draftExists, setDraftExists] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
  useEffect(() => setDraftExists(hasDraft()), []);

  return (
    <main id="main" className="flex-1">
      {/* Hero */}
      <section className="border-b border-line bg-linear-to-b from-accent-soft to-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold tracking-wide text-accent-text">{l.eyebrow}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance text-fg sm:text-5xl">
              {l.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-fg-muted">{l.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/builder/" className={`${btn.primary} min-h-12 px-6 text-base`}>
                {l.ctaPrimary}
              </Link>
              <a href="#templates" className={`${btn.secondary} min-h-12 px-6 text-base`}>
                {l.ctaSecondary}
              </a>
            </div>
            {draftExists && (
              <p className="mt-4 text-sm">
                <Link
                  href="/builder/"
                  className="font-medium text-accent-text underline decoration-accent-line underline-offset-2 hover:decoration-accent-text"
                >
                  {l.ctaContinue} →
                </Link>
              </p>
            )}
          </div>
          <div aria-hidden="true" inert className="relative mx-auto hidden h-[420px] w-[330px] sm:block">
            <div className="absolute inset-0 translate-x-6 translate-y-4 rotate-3 rounded-md border border-line bg-raised shadow-lg shadow-black/40" />
            <div className="absolute inset-0 overflow-hidden rounded-md bg-paper shadow-2xl shadow-black/60 ring-1 ring-line">
              <div className="origin-top-left" style={{ transform: `scale(${330 / A4_PX})`, width: A4_PX }}>
                <div className="cv-sheet">
                  <CVDocument cv={sampleCV("modern-professional")} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="features-title">
        <h2 id="features-title" className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {l.featuresTitle}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {l.features.map((f) => (
            <li key={f.title} className="rounded-lg border border-line bg-surface p-5 shadow-sm shadow-black/40">
              <h3 className="font-semibold text-fg">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Templates */}
      <section id="templates" className="scroll-mt-4 border-y border-line bg-surface" aria-labelledby="templates-title">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="templates-title" className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {l.templatesTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-fg-muted">{l.templatesBody}</p>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_IDS.map((id) => (
              <li key={id} className="flex flex-col">
                <div
                  className="relative mx-auto overflow-hidden rounded-md bg-paper shadow-lg shadow-black/50 ring-1 ring-line"
                  style={{ width: A4_PX * THUMB_SCALE, height: A4_PX * THUMB_SCALE * 1.414 }}
                  aria-hidden="true"
                  inert
                >
                  <div className="origin-top-left" style={{ transform: `scale(${THUMB_SCALE})`, width: A4_PX }}>
                    <div className="cv-sheet">
                      <CVDocument cv={sampleCV(id)} />
                    </div>
                  </div>
                </div>
                <h3 className="mt-5 font-semibold text-fg">{t.templates[id].name}</h3>
                <p className="mt-1 text-sm text-fg-muted">{t.templates[id].description}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Link href="/builder/" className={btn.primary}>
              {l.ctaPrimary}
            </Link>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="privacy-title">
        <div className="rounded-xl border border-accent-line bg-accent-soft p-6 shadow-sm shadow-black/40 sm:p-10">
          <h2 id="privacy-title" className="font-display text-2xl font-semibold tracking-tight text-fg">
            {l.privacyTitle}
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-fg">{l.privacyBody}</p>
          <Link
            href="/privacy/"
            className="mt-4 inline-block font-medium text-accent-text underline decoration-accent-line underline-offset-2 hover:decoration-accent-text"
          >
            {l.privacyLink}
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20" aria-labelledby="faq-title">
        <h2 id="faq-title" className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {l.faqTitle}
        </h2>
        <div className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface shadow-sm shadow-black/40">
          {l.faq.map((item) => (
            <details key={item.q} className="group px-5 py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-medium text-fg [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden="true" className="text-fg-subtle transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-4 leading-relaxed text-fg-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
