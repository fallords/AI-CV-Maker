"use client";

import { fmt, useI18n } from "@/lib/i18n";
import { TextAreaField } from "../ui/Field";
import { AiSummaryAssist } from "./AiSummaryAssist";
import type { SectionProps } from "./types";

const SOFT_LIMIT = 800;

export function SummarySection({ cv, dispatch }: SectionProps) {
  const { t } = useI18n();
  const count = cv.summary.trim().length;
  const hint = fmt(count > SOFT_LIMIT ? t.form.summary.tooLong : t.form.summary.guidance, { count });
  return (
    <div>
      <TextAreaField
        field="summary"
        label={t.form.summary.label}
        value={cv.summary}
        rows={5}
        placeholder={t.form.summary.placeholder}
        hint={<span aria-live="polite">{hint}</span>}
        onChange={(value) => dispatch({ type: "setSummary", value })}
      />
      <AiSummaryAssist
        text={cv.summary}
        language={cv.meta.cvLanguage}
        onApply={(value) => dispatch({ type: "setSummary", value })}
      />
    </div>
  );
}
