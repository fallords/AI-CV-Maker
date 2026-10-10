"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGES } from "@/lib/cv-schema";
import { useI18n } from "@/lib/i18n";

export function Logo() {
  return (
    <span className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-fg">
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-md border border-accent-line bg-accent text-sm font-semibold tracking-wide text-accent-fg shadow-sm shadow-black/40">
        CV
      </span>
      Free AI CV Maker
    </span>
  );
}

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t.nav.language} className="flex rounded-md border border-line-strong bg-raised p-0.5 text-xs font-semibold">
      {LANGUAGES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          aria-label={l === "en" ? "English" : "Bahasa Indonesia"}
          className={`min-h-8 min-w-10 rounded px-2 uppercase ${lang === l ? "bg-accent text-accent-fg ring-1 ring-accent-text" : "text-fg-muted hover:bg-overlay hover:text-fg"}`}
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
    <header className="no-print border-b border-line bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:border focus:border-line-strong focus:bg-raised focus:px-3 focus:py-2 focus:text-fg focus:shadow-lg focus:shadow-black/40"
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
                      className={`inline-flex min-h-10 items-center rounded-md px-2 transition-colors sm:px-3 ${
                        active ? "bg-accent-soft font-semibold text-accent-text" : "text-fg-muted hover:bg-overlay hover:text-fg"
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
