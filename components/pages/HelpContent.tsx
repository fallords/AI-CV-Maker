"use client";

import Link from "next/link";
import { btn } from "@/components/ui/styles";
import { useI18n } from "@/lib/i18n";

export function HelpContent() {
  const { t } = useI18n();
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{t.help.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-fg-muted">{t.help.intro}</p>
      <div className="mt-10 space-y-10">
        {t.help.sections.map((s) => (
          <section key={s.title} aria-labelledby={s.title} className="border-t border-line pt-8">
            <h2 id={s.title} className="font-display text-2xl font-semibold tracking-tight text-fg">
              {s.title}
            </h2>
            <ul className="mt-4 list-disc space-y-2.5 pl-5 leading-relaxed text-fg-muted marker:text-accent-line">
              {s.body.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Link href="/builder/" className={`${btn.primary} mt-12`}>
        {t.landing.ctaPrimary}
      </Link>
    </main>
  );
}
