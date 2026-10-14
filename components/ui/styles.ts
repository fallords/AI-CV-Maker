/** Shared Tailwind class sets so controls look and behave consistently (dark theme tokens in app/globals.css). */

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium transition-colors min-h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed";

export const btn = {
  primary: `${base} bg-accent text-accent-fg hover:bg-accent-hover`,
  secondary: `${base} border border-line-strong text-fg hover:border-control-line hover:bg-raised`,
  ghost: `${base} text-fg-muted hover:bg-raised hover:text-fg`,
  danger: `${base} border border-danger-line text-danger-text hover:bg-danger-soft`,
  dangerSolid: `${base} bg-danger text-accent-fg hover:bg-danger-hover`,
  icon: "inline-flex size-10 items-center justify-center rounded-sm text-fg-muted hover:bg-raised hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent",
};

const fieldBase =
  "block w-full rounded-sm border border-control-line bg-raised py-2 text-base text-fg placeholder:text-fg-subtle focus:border-accent-text focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-text aria-[invalid=true]:border-danger-text disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-fg-subtle sm:text-sm";

export const inputClass = `${fieldBase} px-3`;

/**
 * For <select>: browsers add about 4px of their own padding before the selected text,
 * so 8px here lines that text up with the 12px of the inputs above and below it.
 */
export const selectClass = `${fieldBase} px-2`;

export const card = "rounded-sm border border-line bg-surface";
