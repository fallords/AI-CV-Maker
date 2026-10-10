"use client";

import { useId, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { CV_LABELS } from "@/lib/cv-format";
import { inputClass } from "./styles";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 8 - 1960 + 1 }, (_, i) => String(CURRENT_YEAR + 8 - i));

/**
 * Month + year picker built from two selects. Works in every browser (unlike
 * <input type="month">) and supports year-only dates. Value: "YYYY-MM" | "YYYY" | "".
 */
export function MonthField({
  label,
  value,
  onChange,
  disabled = false,
  error,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const id = useId();
  const [year, monthFromValue] = value ? value.split("-") : ["", ""];
  // A month picked before a year is kept locally until a year is chosen.
  const [pendingMonth, setPendingMonth] = useState("");
  const month = year ? (monthFromValue ?? "") : pendingMonth;

  const emit = (y: string, m: string) => {
    if (!y) {
      setPendingMonth(m);
      onChange("");
    } else {
      setPendingMonth("");
      onChange(m ? `${y}-${m}` : y);
    }
  };

  return (
    <fieldset className={className} disabled={disabled} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1 block text-sm font-medium text-fg">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label={`${label}: ${t.form.month}`}
          value={month}
          onChange={(e) => emit(year, e.target.value)}
          className={inputClass}
          aria-invalid={error ? true : undefined}
        >
          <option value="">{t.form.month}</option>
          {CV_LABELS[lang].months.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, "0")}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label}: ${t.form.year}`}
          value={year}
          onChange={(e) => emit(e.target.value, month)}
          className={inputClass}
          aria-invalid={error ? true : undefined}
        >
          <option value="">{t.form.year}</option>
          {year && !YEARS.includes(year) && <option value={year}>{year}</option>}
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-danger-text" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
