"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { btn } from "@/components/ui/styles";
import { useI18n } from "@/lib/i18n";
import { eraseAllLocalData } from "@/lib/storage";

export function PrivacyContent() {
  const { t } = useI18n();
  const p = t.privacy;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{p.title}</h1>
      <p className="mt-3 text-sm tracking-wide text-fg-subtle">{p.updated}</p>
      <div className="mt-10 space-y-8">
        {p.sections.map((s) => (
          <section key={s.title} className="border-t border-line pt-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">{s.title}</h2>
            {s.body.map((para) => (
              <p key={para} className="mt-3 leading-relaxed text-fg-muted">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
      <div className="mt-12 rounded-lg border border-danger-line bg-surface p-5 shadow-sm shadow-black/40">
        <button type="button" className={btn.danger} onClick={() => setConfirmOpen(true)}>
          {p.eraseButton}
        </button>
        <p role="status" className="mt-3 text-sm text-fg empty:hidden">
          {result}
        </p>
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
