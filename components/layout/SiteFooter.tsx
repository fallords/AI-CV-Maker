"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./SiteHeader";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="no-print mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Logo />
          <p className="mt-3 text-sm text-stone-600">{t.footer.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-2 text-sm">
            <li><Link className="text-stone-700 hover:text-brand-800 hover:underline" href="/builder/">{t.nav.builder}</Link></li>
            <li><Link className="text-stone-700 hover:text-brand-800 hover:underline" href="/help/">{t.nav.help}</Link></li>
            <li><Link className="text-stone-700 hover:text-brand-800 hover:underline" href="/privacy/">{t.nav.privacy}</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="font-medium text-stone-800">{t.footer.contact}</p>
          <p className="mt-2 text-stone-600">{t.footer.contactPlaceholder}</p>
        </div>
      </div>
      <p className="border-t border-stone-100 py-4 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} {t.footer.rights}
      </p>
    </footer>
  );
}
