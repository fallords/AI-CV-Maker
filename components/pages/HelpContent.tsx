"use client";

import Link from "next/link";
import { btn } from "@/components/ui/styles";
import { useI18n } from "@/lib/i18n";

/** Numbered article section: mono number in a narrow gutter (above the heading on phones). */
const sectionRow =
  "grid items-baseline gap-x-6 gap-y-2 border-t border-line py-8 sm:grid-cols-[2rem_minmax(0,1fr)]";
const sectionNumber = "font-mono text-xs tracking-[0.08em] text-fg-subtle";

export function HelpContent() {
  const { t } = useI18n();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-16 sm:pt-16 sm:pb-20">
      <div className="max-w-[68ch]">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-[-0.015em] text-fg">
          {t.help.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-fg-muted">{t.help.intro}</p>
        <div className="mt-10 border-b border-line">
          {t.help.sections.map((s, i) => {
            const headingId = `help-section-${i + 1}`;
            return (
              <section key={s.title} aria-labelledby={headingId} className={sectionRow}>
                <span aria-hidden="true" className={sectionNumber}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2
                    id={headingId}
                    className="font-display text-xl leading-snug font-semibold tracking-[-0.01em] text-fg"
                  >
                    {s.title}
                  </h2>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-fg-muted marker:text-fg-subtle">
                    {s.body.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
        <Link href="/builder/" className={`${btn.primary} mt-10 min-h-11 px-5 text-[15px]`}>
          {t.landing.ctaPrimary}
        </Link>
      </div>
    </main>
  );
}
