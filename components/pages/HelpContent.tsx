"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

/** Same split as the landing page: heading in the left third, text in the right two thirds. */
const sectionRow =
  "grid gap-x-12 gap-y-3 border-t border-line py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]";
const h2Class = "font-display text-xl leading-snug font-semibold tracking-[-0.01em] text-fg";
const prose = "text-[15px] leading-relaxed text-pretty text-fg-body";
const textLink =
  "font-medium text-accent-text underline decoration-accent-line underline-offset-4 hover:decoration-accent-text";

export function HelpContent() {
  const { t } = useI18n();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-16 sm:pt-16 sm:pb-20">
      <div className="max-w-[68ch]">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-[-0.015em] text-fg">
          {t.help.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-fg-body">{t.help.intro}</p>
      </div>
      <div className="mt-10">
        {t.help.sections.map((s, i) => {
          const headingId = `help-section-${i + 1}`;
          return (
            <section key={s.title} aria-labelledby={headingId} className={sectionRow}>
              <h2 id={headingId} className={h2Class}>
                {s.title}
              </h2>
              <div className="max-w-[65ch] space-y-3">
                {s.body.map((para) => (
                  <p key={para} className={prose}>
                    {para}
                  </p>
                ))}
                {s.steps && (
                  <ol className={`list-decimal space-y-2 pl-5 marker:text-fg-muted ${prose}`}>
                    {s.steps.map((step) => (
                      <li key={step} className="pl-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
                {s.after?.map((para) => (
                  <p key={para} className={prose}>
                    {para}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
        <div className="grid gap-x-12 border-t border-line pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <p className="text-[15px] md:col-start-2">
            <Link href="/builder/" className={textLink}>
              {t.landing.ctaPrimary}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
