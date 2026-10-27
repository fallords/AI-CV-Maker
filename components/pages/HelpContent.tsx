"use client";

import Link from "next/link";
import { btn, card } from "@/components/ui/styles";
import { useI18n } from "@/lib/i18n";

/** The title sits on the kraft folder; the instructions are on one sheet of paper. */
const pageTitle = "max-w-[22ch] text-4xl leading-[1.08] font-extrabold tracking-[-0.01em] text-balance text-fg [font-stretch:125%]";
const h2Class = "font-display text-[21px] leading-snug font-semibold text-fg";
const prose = "text-base leading-[1.55] text-pretty text-fg-body";

export function HelpContent() {
  const { t } = useI18n();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:pt-14 sm:pb-28">
      <h1 className={pageTitle}>{t.help.title}</h1>
      <p className="mt-4 max-w-[60ch] text-lg leading-[1.55] text-pretty text-kraft-ink">{t.help.intro}</p>
      <div className={`${card} mt-10 max-w-[46rem] px-5 py-8 sm:px-12 sm:py-12`}>
        <div className="space-y-12">
          {t.help.sections.map((s, i) => {
            const headingId = `help-section-${i + 1}`;
            return (
              <section key={s.title} aria-labelledby={headingId}>
                <h2 id={headingId} className={h2Class}>
                  {s.title}
                </h2>
                <div className="mt-3 space-y-3">
                  {s.body.map((para) => (
                    <p key={para} className={prose}>
                      {para}
                    </p>
                  ))}
                  {s.steps && (
                    <ol className={`list-decimal space-y-2 pl-6 marker:font-semibold marker:text-fg ${prose}`}>
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
        </div>
        <p className="mt-12">
          <Link href="/builder/" className={`${btn.primary} min-h-12 px-6 text-base`}>
            {t.landing.ctaPrimary}
          </Link>
        </p>
      </div>
    </main>
  );
}
