"use client";

import { useId, type ReactNode } from "react";
import { inputClass, selectClass } from "./styles";

interface BaseProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  /**
   * Name of the data field, written to `data-field` so the CV checker can jump straight
   * to the control a finding is about (see lib/cv-checks.ts CheckItem.field).
   */
  field?: string;
}

function Describe({ id, hint, error }: { id: string; hint?: ReactNode; error?: string | null }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-danger-text" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function describedBy(id: string, hint?: ReactNode, error?: string | null) {
  return [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
}

export function TextField({
  label,
  hint,
  error,
  className,
  field,
  value,
  onChange,
  type = "text",
  ...rest
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "url" | "month";
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  disabled?: boolean;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={inputClass}
        maxLength={rest.maxLength ?? 300}
        data-field={field}
        {...rest}
      />
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  field,
  value,
  onChange,
  rows = 4,
  placeholder,
  maxLength = 5000,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        data-field={field}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} resize-y leading-relaxed`}
      />
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  className,
  value,
  onChange,
  options,
  autoFocusInDialog = false,
}: BaseProps & {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** Marks the select as the control to focus when its dialog opens (see Dialog's `data-autofocus`). */
  autoFocusInDialog?: boolean;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg">
        {label}
      </label>
      <select
        id={id}
        data-autofocus={autoFocusInDialog || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={selectClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Describe id={id} hint={hint} />
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`flex min-h-10 items-center gap-2 ${className ?? ""}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 rounded-sm border-control-line accent-accent-control"
      />
      <label htmlFor={id} className="text-sm text-fg">
        {label}
      </label>
    </div>
  );
}
