/** Shared Tailwind class sets so controls look and behave consistently (dark theme tokens in app/globals.css). */

const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors min-h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed";

export const btn = {
  primary: `${base} border border-accent-line bg-accent text-accent-fg hover:bg-accent-hover shadow-sm shadow-black/40`,
  secondary: `${base} border border-line-strong bg-raised text-fg hover:border-control-line hover:bg-overlay`,
  ghost: `${base} text-fg-muted hover:bg-overlay hover:text-fg`,
  danger: `${base} border border-danger-line bg-raised text-danger-text hover:bg-danger-soft`,
  dangerSolid: `${base} border border-danger-line bg-danger text-accent-fg hover:bg-danger-hover`,
  icon: "inline-flex size-10 items-center justify-center rounded-md text-fg-muted hover:bg-overlay hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent",
};

export const inputClass =
  "block w-full rounded-md border border-control-line bg-raised px-3 py-2 text-base text-fg shadow-xs placeholder:text-fg-subtle focus:border-accent-text focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-text aria-[invalid=true]:border-danger-text disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-fg-subtle sm:text-sm";

export const card = "rounded-lg border border-line bg-surface shadow-xs";
