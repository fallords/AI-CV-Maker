"use client";

import { useState } from "react";
import { getAIProvider, type AIProvider } from "@/lib/ai/provider";
import type { Language } from "@/lib/cv-schema";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "../ui/Dialog";
import { btn } from "../ui/styles";

type Step = "idle" | "consent" | "working" | "review" | "error";

/**
 * Optional, consent-gated AI rewrite of the summary. Renders nothing at all when
 * no provider is configured (the default), so the core workflow never depends on it.
 */
export function AiSummaryAssist({
  text,
  language,
  onApply,
  provider = getAIProvider(),
}: {
  text: string;
  language: Language;
  onApply: (text: string) => void;
  provider?: AIProvider | null;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("idle");
  const [consent, setConsent] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  // Snapshot of exactly what the user agreed to send.
  const [sent, setSent] = useState("");

  if (!provider) return null;

  const close = () => {
    setStep("idle");
    setConsent(false);
    setSuggestion("");
  };

  const send = async () => {
    setStep("working");
    try {
      const res = await provider.complete({ task: "rewrite-summary", text: sent, language });
      setSuggestion(res.text);
      setStep(res.text ? "review" : "error");
    } catch {
      setStep("error");
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        className={btn.secondary}
        disabled={!text.trim()}
        title={!text.trim() ? t.ai.empty : undefined}
        onClick={() => {
          setSent(text);
          setStep("consent");
        }}
      >
        {t.ai.rewrite}
      </button>

      <Dialog
        open={step === "consent" || step === "working" || step === "error"}
        onClose={close}
        title={t.ai.consentTitle}
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={close}>
              {t.ai.cancel}
            </button>
            <button
              type="button"
              className={btn.primary}
              disabled={!consent || step === "working"}
              onClick={() => void send()}
            >
              {step === "working" ? t.ai.working : t.ai.send}
            </button>
          </>
        }
      >
        <p>{t.ai.consentBody}</p>
        <blockquote className="mt-3 max-h-40 overflow-auto rounded-md border border-stone-200 bg-stone-50 p-3 whitespace-pre-wrap">
          {sent}
        </blockquote>
        <label className="mt-3 flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 size-5 accent-brand-700"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>{t.ai.consentCheckbox}</span>
        </label>
        {step === "error" && (
          <p role="alert" className="mt-3 font-medium text-red-700">
            {t.ai.error}
          </p>
        )}
      </Dialog>

      <Dialog
        open={step === "review"}
        onClose={close}
        title={t.ai.reviewTitle}
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={close}>
              {t.ai.discard}
            </button>
            <button
              type="button"
              className={btn.primary}
              onClick={() => {
                onApply(suggestion);
                close();
              }}
            >
              {t.ai.apply}
            </button>
          </>
        }
      >
        <p role="note" className="rounded-md bg-amber-50 p-3 text-amber-900">
          {t.ai.reviewWarning}
        </p>
        <h3 className="mt-3 font-semibold">{t.ai.original}</h3>
        <p className="whitespace-pre-wrap">{sent}</p>
        <h3 className="mt-3 font-semibold">{t.ai.suggestion}</h3>
        <p className="whitespace-pre-wrap">{suggestion}</p>
      </Dialog>
    </div>
  );
}
