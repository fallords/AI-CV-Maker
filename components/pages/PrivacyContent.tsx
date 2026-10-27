"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { btn, card } from "@/components/ui/styles";
import { useI18n } from "@/lib/i18n";
import { eraseAllLocalData } from "@/lib/storage";

/** The title sits on the kraft folder; the notice is on one sheet of paper. */
const pageTitle = "max-w-[22ch] text-4xl leading-[1.08] font-extrabold tracking-[-0.01em] text-balance text-fg [font-stretch:125%]";
const h2Class = "font-display text-[21px] leading-snug font-semibold text-fg";
const prose = "text-base leading-[1.55] text-pretty text-fg-body";

export function PrivacyContent() {
  const { t } = useI18n();
  const p = t.privacy;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const lastIndex = p.sections.length - 1;

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:pt-14 sm:pb-28">
      <h1 className={pageTitle}>{p.title}</h1>
      <p className="mt-3 text-base text-kraft-ink">{p.updated}</p>
      <div className={`${card} mt-10 max-w-[46rem] px-5 py-8 sm:px-12 sm:py-12`}>
        <div className="space-y-12">
          {p.sections.map((s, i) => (
            <section key={s.title}>
              <h2 className={h2Class}>{s.title}</h2>
              <div className="mt-3 space-y-3">
                {s.body.map((para) => (
                  <p key={para} className={prose}>
                    {para}
                  </p>
                ))}
                {/* The last section is "Deleting your data": its text points to this button. */}
                {i === lastIndex && (
                  <div className="pt-3">
                    <button
                      type="button"
                      className={`${btn.danger} py-2 text-left`}
                      onClick={() => setConfirmOpen(true)}
                    >
                      {p.eraseButton}
                    </button>
                    <p role="status" className="mt-3 text-base text-fg empty:hidden">
                      {result}
                    </p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
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
