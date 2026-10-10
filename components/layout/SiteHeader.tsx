"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGES } from "@/lib/cv-schema";
import { useI18n } from "@/lib/i18n";

/** Wordmark only: the name set in Plex Sans 600, no badge. */
export function Logo() {
  return <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-fg">Free AI CV Maker</span>;
}

/** Plain text "EN / ID" toggle. The active language is underlined in the accent colour. */
export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t.nav.language} className="flex items-center text-sm font-medium">
      {LANGUAGES.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="px-0.5 text-fg-subtle">
              /
            </span>
          )}
          <button
            type="button"
            lang={l}
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            aria-label={l === "en" ? "English" : "Bahasa Indonesia"}
            className={`inline-flex min-h-10 min-w-8 items-center justify-center rounded-sm px-1 uppercase transition-colors ${
              lang === l
                ? "text-fg underline decoration-accent-text decoration-2 underline-offset-4"
                : "text-fg-subtle hover:text-fg"
            }`}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  // The builder runs full width; the other pages share the 72rem reading column.
  const wide = pathname?.startsWith("/builder") ?? false;
  const links = [
    { href: "/builder/", label: t.nav.builder },
    { href: "/help/", label: t.nav.help },
    { href: "/privacy/", label: t.nav.privacy },
  ];
  return (
    <header className="no-print border-b border-line">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:border focus:border-line-strong focus:bg-raised focus:px-3 focus:py-2 focus:text-fg"
      >
        {t.nav.skip}
      </a>
      <div
        className={`mx-auto flex min-h-14 flex-wrap items-center justify-between gap-x-6 px-4 ${
          wide ? "max-w-[1600px]" : "max-w-6xl"
        }`}
      >
        <Link href="/" aria-label={`${t.appName} – ${t.nav.home}`} className="inline-flex min-h-10 items-center rounded-sm">
          <Logo />
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6">
          <nav aria-label={t.nav.menu}>
            <ul className="flex items-center gap-x-4 text-sm sm:gap-x-6">
              {links.map((l) => {
                const active = pathname?.replace(/\/?$/, "/") === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center rounded-sm transition-colors ${
                        active
                          ? "text-fg underline decoration-accent-text decoration-2 underline-offset-[6px]"
                          : "text-fg-muted hover:text-fg"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <span aria-hidden="true" className="hidden h-4 w-px bg-line-strong sm:block" />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
