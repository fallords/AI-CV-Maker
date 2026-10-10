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
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand-700">{l.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance text-stone-900 sm:text-5xl">{l.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-700">{l.subtitle}</p>
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
                <Link href="/builder/" className="font-medium text-brand-800 underline underline-offset-2">
                  {l.ctaContinue} →
                </Link>
              </p>
            )}
          </div>
          <div aria-hidden="true" className="relative mx-auto hidden h-[420px] w-[330px] sm:block">
            <div className="absolute inset-0 translate-x-6 translate-y-4 rotate-3 rounded-md bg-brand-100" />
            <div className="absolute inset-0 overflow-hidden rounded-md bg-white shadow-xl ring-1 ring-stone-200">
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
        <h2 id="features-title" className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          {l.featuresTitle}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {l.features.map((f) => (
            <li key={f.title} className="rounded-lg border border-stone-200 bg-white p-5 shadow-xs">
              <h3 className="font-semibold text-stone-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Templates */}
      <section id="templates" className="scroll-mt-4 border-y border-stone-200 bg-white" aria-labelledby="templates-title">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="templates-title" className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            {l.templatesTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-stone-700">{l.templatesBody}</p>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_IDS.map((id) => (
              <li key={id} className="flex flex-col">
                <div
                  className="relative mx-auto overflow-hidden rounded-md bg-white shadow-md ring-1 ring-stone-200"
                  style={{ width: A4_PX * THUMB_SCALE, height: A4_PX * THUMB_SCALE * 1.414 }}
                  aria-hidden="true"
                >
                  <div className="origin-top-left" style={{ transform: `scale(${THUMB_SCALE})`, width: A4_PX }}>
                    <div className="cv-sheet">
                      <CVDocument cv={sampleCV(id)} />
                    </div>
                  </div>
                </div>
                <h3 className="mt-5 font-semibold text-stone-900">{t.templates[id].name}</h3>
                <p className="mt-1 text-sm text-stone-700">{t.templates[id].description}</p>
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
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 sm:p-10">
          <h2 id="privacy-title" className="text-2xl font-bold tracking-tight text-brand-900">
            {l.privacyTitle}
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-brand-900">{l.privacyBody}</p>
          <Link href="/privacy/" className="mt-4 inline-block font-medium text-brand-800 underline underline-offset-2">
            {l.privacyLink}
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          {l.faqTitle}
        </h2>
        <div className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {l.faq.map((item) => (
            <details key={item.q} className="group px-5 py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-medium text-stone-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden="true" className="text-stone-500 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-4 leading-relaxed text-stone-700">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
