"use client";

import Link from "next/link";
import { btn } from "@/components/ui/styles";
import { useI18n } from "@/lib/i18n";

export function HelpContent() {
  const { t } = useI18n();
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">{t.help.title}</h1>
      <p className="mt-3 text-lg text-stone-700">{t.help.intro}</p>
      <div className="mt-10 space-y-10">
        {t.help.sections.map((s) => (
          <section key={s.title} aria-labelledby={s.title}>
            <h2 id={s.title} className="text-xl font-semibold text-stone-900">
              {s.title}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-stone-700">
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
