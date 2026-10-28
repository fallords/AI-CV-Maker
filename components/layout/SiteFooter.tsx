"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const linkClass =
  "inline-flex min-h-8 items-center rounded-sm text-white underline decoration-white/40 underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-white focus-visible:outline-white";

// Inlined by Next.js at build time. Without it the footer shows no contact line at all (no dummy address).
const rawContactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const contactEmail = typeof rawContactEmail === "string" ? rawContactEmail.trim() : "";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="no-print mt-auto bg-kraft-deep">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-6 text-sm text-white">
        <p>
          © {new Date().getFullYear()} {t.footer.rights}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <li><Link className={linkClass} href="/help/">{t.nav.help}</Link></li>
              <li><Link className={linkClass} href="/privacy/">{t.nav.privacy}</Link></li>
            </ul>
          </nav>
          {contactEmail && (
            <p>
              {t.footer.contact}:{" "}
              <a className={linkClass} href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
