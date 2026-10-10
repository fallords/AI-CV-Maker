"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGES } from "@/lib/cv-schema";
import { useI18n } from "@/lib/i18n";

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight text-stone-900">
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-md bg-brand-700 text-sm font-bold text-white">
        CV
      </span>
      Free AI CV Maker
    </span>
  );
}

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t.nav.language} className="flex rounded-md border border-stone-300 bg-white p-0.5 text-xs font-semibold">
      {LANGUAGES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          aria-label={l === "en" ? "English" : "Bahasa Indonesia"}
          className={`min-h-8 min-w-10 rounded px-2 uppercase ${lang === l ? "bg-brand-700 text-white" : "text-stone-700 hover:bg-stone-100"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  const links = [
    { href: "/builder/", label: t.nav.builder },
    { href: "/help/", label: t.nav.help },
    { href: "/privacy/", label: t.nav.privacy },
  ];
  return (
    <header className="no-print border-b border-stone-200 bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        {t.nav.skip}
      </a>
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" aria-label={`${t.appName} – ${t.nav.home}`}>
          <Logo />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <nav aria-label={t.nav.menu}>
            <ul className="flex items-center gap-1 text-sm">
              {links.map((l) => {
                const active = pathname?.replace(/\/?$/, "/") === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center rounded-md px-2 sm:px-3 ${
                        active ? "font-semibold text-brand-800" : "text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
