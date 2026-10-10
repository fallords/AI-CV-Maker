"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./SiteHeader";

const linkClass = "inline-flex min-h-8 items-center rounded-sm text-fg-muted transition-colors hover:text-fg hover:underline underline-offset-4";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="no-print mt-auto border-t border-line">
      <div className="mx-auto max-w-6xl px-4 text-sm">
        <div className="py-8">
          <Logo />
          <p className="mt-2 max-w-[65ch] leading-relaxed text-fg-muted">{t.footer.tagline}</p>
        </div>
        <div className="flex flex-col gap-x-12 gap-y-3 border-t border-line py-4 sm:flex-row sm:items-center">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <li><Link className={linkClass} href="/builder/">{t.nav.builder}</Link></li>
              <li><Link className={linkClass} href="/help/">{t.nav.help}</Link></li>
              <li><Link className={linkClass} href="/privacy/">{t.nav.privacy}</Link></li>
            </ul>
          </nav>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-fg">{t.footer.contact}</span>
            <span className="text-fg-muted">{t.footer.contactPlaceholder}</span>
          </p>
        </div>
        <p className="border-t border-line py-4 text-xs text-fg-subtle">
          © {new Date().getFullYear()} {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
