"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./SiteHeader";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="no-print mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t.footer.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-2 text-sm">
            <li><Link className="text-fg-muted transition-colors hover:text-accent-text hover:underline" href="/builder/">{t.nav.builder}</Link></li>
            <li><Link className="text-fg-muted transition-colors hover:text-accent-text hover:underline" href="/help/">{t.nav.help}</Link></li>
            <li><Link className="text-fg-muted transition-colors hover:text-accent-text hover:underline" href="/privacy/">{t.nav.privacy}</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="font-medium text-fg">{t.footer.contact}</p>
          <p className="mt-2 text-fg-muted">{t.footer.contactPlaceholder}</p>
        </div>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-fg-subtle">
        © {new Date().getFullYear()} {t.footer.rights}
      </p>
    </footer>
  );
}
