/**
 * Shared Tailwind class sets so controls look and behave consistently (theme tokens in
 * app/globals.css). Corner radii follow the folder: paper sheets are square, panels 2px,
 * fields 3px, buttons 4px, folder tabs 6px on top.
 */

const base =
  "inline-flex items-center justify-center gap-2 rounded-[4px] text-sm font-medium min-h-10 px-4 transition-[color,background-color,border-color,translate] duration-150 motion-safe:active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0";

export const btn = {
  /** Solid ink: the main action on a screen. */
  primary: `${base} bg-accent text-accent-fg hover:bg-accent-hover`,
  /** White paper with an ink outline; reads on both kraft and paper. */
  secondary: `${base} border border-control-line bg-surface text-fg hover:border-fg hover:bg-overlay`,
  ghost: `${base} text-fg-muted hover:bg-overlay hover:text-fg`,
  danger: `${base} border border-danger-line bg-surface text-danger-text hover:border-danger-text hover:bg-danger-soft`,
  dangerSolid: `${base} bg-danger text-accent-fg hover:bg-danger-hover`,
  icon: "inline-flex size-10 items-center justify-center rounded-[4px] text-fg-muted transition-colors duration-150 hover:bg-overlay hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent",
};

const fieldBase =
  "block w-full rounded-[3px] border border-control-line bg-raised py-2 text-base text-fg transition-[border-color] duration-150 placeholder:text-fg-subtle focus:border-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-text aria-[invalid=true]:border-danger-text disabled:cursor-not-allowed disabled:border-line disabled:bg-overlay disabled:text-fg-subtle sm:text-sm";

export const inputClass = `${fieldBase} px-3`;

/**
 * For <select>: browsers add about 4px of their own padding before the selected text,
 * so 8px here lines that text up with the 12px of the inputs above and below it.
 */
export const selectClass = `${fieldBase} px-2`;

/** A sheet of working paper lying on the kraft folder. */
export const card = "rounded-[2px] bg-surface shadow-[0_1px_0_var(--color-kraft-deep),0_2px_6px_-2px_rgb(74_48_25/0.35)]";
