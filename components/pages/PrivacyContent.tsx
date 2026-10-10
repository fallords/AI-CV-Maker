"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { btn } from "@/components/ui/styles";
import { useI18n } from "@/lib/i18n";
import { eraseAllLocalData } from "@/lib/storage";

/** Numbered article section: mono number in a narrow gutter (above the heading on phones). */
const sectionGrid = "grid items-baseline gap-x-6 gap-y-2 sm:grid-cols-[2rem_minmax(0,1fr)]";
const sectionNumber = "font-mono text-xs tracking-[0.08em] text-fg-subtle";

export function PrivacyContent() {
  const { t } = useI18n();
  const p = t.privacy;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-16 sm:pt-16 sm:pb-20">
      <div className="max-w-[68ch]">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-[-0.015em] text-fg">{p.title}</h1>
        <p className="mt-3 font-mono text-xs text-fg-subtle">{p.updated}</p>
        <div className="mt-10">
          {p.sections.map((s, i) => (
            <section key={s.title} className={`${sectionGrid} border-t border-line py-8`}>
              <span aria-hidden="true" className={sectionNumber}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="font-display text-xl leading-snug font-semibold tracking-[-0.01em] text-fg">
                  {s.title}
                </h2>
                {s.body.map((para) => (
                  <p key={para} className="mt-3 text-[15px] leading-relaxed text-fg-muted">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
          {/* Sits directly under the last section ("Deleting your data"), aligned with its text. */}
          <div className={sectionGrid}>
            <div className="rounded-sm border border-danger-line p-5 sm:col-start-2">
              <button type="button" className={btn.danger} onClick={() => setConfirmOpen(true)}>
                {p.eraseButton}
              </button>
              <p role="status" className="mt-3 text-sm text-fg empty:hidden">
                {result}
              </p>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={p.eraseConfirmTitle}
        body={p.eraseConfirmBody}
        confirmLabel={p.eraseConfirm}
        cancelLabel={t.builder.confirm.cancel}
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
