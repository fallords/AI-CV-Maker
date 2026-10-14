"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { btn } from "@/components/ui/styles";
import { useI18n } from "@/lib/i18n";
import { eraseAllLocalData } from "@/lib/storage";

/** Same split as the landing page: heading in the left third, text in the right two thirds. */
const sectionRow =
  "grid gap-x-12 gap-y-3 border-t border-line py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]";
const h2Class = "font-display text-xl leading-snug font-semibold tracking-[-0.01em] text-fg";
const prose = "text-[15px] leading-relaxed text-pretty text-fg-body";

export function PrivacyContent() {
  const { t } = useI18n();
  const p = t.privacy;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const lastIndex = p.sections.length - 1;

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-16 sm:pt-16 sm:pb-20">
      <div className="max-w-[68ch]">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-[-0.015em] text-fg">{p.title}</h1>
        <p className="mt-3 text-sm text-fg-subtle">{p.updated}</p>
      </div>
      <div className="mt-10">
        {p.sections.map((s, i) => (
          <section key={s.title} className={sectionRow}>
            <h2 className={h2Class}>{s.title}</h2>
            <div className="max-w-[65ch] space-y-3">
              {s.body.map((para) => (
                <p key={para} className={prose}>
                  {para}
                </p>
              ))}
              {/* The last section is "Deleting your data": its text points to this button. */}
              {i === lastIndex && (
                <div className="pt-2">
                  <button type="button" className={`${btn.danger} py-2 text-left`} onClick={() => setConfirmOpen(true)}>
                    {p.eraseButton}
                  </button>
                  <p role="status" className="mt-3 text-sm text-fg empty:hidden">
                    {result}
                  </p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={p.eraseConfirmTitle}
        body={p.eraseConfirmBody}
        confirmLabel={p.eraseConfirm}
        cancelLabel={p.cancel}
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          setResult(eraseAllLocalData() ? p.erased : p.eraseFailed);
        }}
      />
    </main>
  );
}
