/** Shared Tailwind class sets so controls look and behave consistently. */

const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors min-h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed";

export const btn = {
  primary: `${base} bg-brand-700 text-white hover:bg-brand-800 shadow-sm`,
  secondary: `${base} border border-stone-300 bg-white text-stone-800 hover:bg-stone-50`,
  ghost: `${base} text-stone-700 hover:bg-stone-100`,
  danger: `${base} border border-red-300 bg-white text-red-800 hover:bg-red-50`,
  dangerSolid: `${base} bg-red-700 text-white hover:bg-red-800`,
  icon: "inline-flex size-10 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent",
};

export const inputClass =
  "block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 shadow-xs placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500 aria-[invalid=true]:border-red-600 sm:text-sm";

export const card = "rounded-lg border border-stone-200 bg-white shadow-xs";
