"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type Dispatch, type ReactNode } from "react";
import { FONT_STACKS } from "@/components/templates/style";
import { CV_LABELS } from "@/lib/cv-format";
import type { CVAction } from "@/lib/cv-reducer";
import type { CVData, Language, TemplateId } from "@/lib/cv-schema";
import {
  allSectionsInOrder,
  findCustomSection,
  isBuiltinSection,
  isSectionFilled,
  isSectionHidden,
  type SectionKey,
} from "@/lib/cv-sections";
import {
  ACCENT_PRESETS,
  DEFAULT_STYLE,
  FONT_OPTIONS,
  FONT_SIZES,
  FONT_SIZE_PT,
  MARGINS,
  MARGIN_MM,
  SPACINGS,
  contrastOnWhite,
  isDefaultStyle,
  type AccentPresetId,
  type DocStyle,
} from "@/lib/doc-style";
import { fmt, useI18n } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/en";
import { ArrowDown, ArrowUp, Check } from "../ui/Icons";
import { btn, inputClass } from "../ui/styles";

/** WCAG AA minimum for normal-size text; accents below this get a warning. */
export const MIN_ACCENT_CONTRAST = 4.5;

/**
 * Each template's own accent colour (app/globals.css: `.tpl-*` `--cv-accent`, and the
 * near-black text colour that ATS Minimal uses when no accent is set). Shown on the
 * "Template colour" swatch and used as the starting point for a custom colour.
 */
export const TEMPLATE_ACCENTS: Record<TemplateId, string> = {
  "ats-minimal": "#1c1917",
  "modern-professional": "#245740",
  graduate: "#2d6a4f",
};

type DesignStrings = Dictionary["design"];
type AccentChoice = AccentPresetId | "custom";

/**
 * Parses what a person typed as a colour code: an optional "#" and six hex digits
 * (three when `allowShort`, expanded to six). Returns lowercase "#rrggbb" or null.
 */
export function parseHexInput(input: string, allowShort = false): string | null {
  const s = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{6}$/i.test(s)) return `#${s.toLowerCase()}`;
  if (allowShort && /^[0-9a-f]{3}$/i.test(s)) {
    return `#${s
      .toLowerCase()
      .split("")
      .map((d) => d + d)
      .join("")}`;
  }
  return null;
}

/** Decimal number in the UI language ("9.5" / "9,5"). */
function formatNumber(n: number, lang: Language): string {
  const s = String(n);
  return lang === "id" ? s.replace(".", ",") : s;
}

/**
 * Contrast ratio with one decimal, rounded down so a colour just under the 4.5:1
 * threshold never reads as "4.5" next to the warning.
 */
export function formatRatio(ratio: number, lang: Language): string {
  const floored = Math.floor(ratio * 10 + 1e-9) / 10;
  const s = floored.toFixed(1);
  return lang === "id" ? s.replace(".", ",") : s;
}

/** Readable name of a section in the interface language: the CV heading, or a custom section's own title. */
export function sectionDisplayName(cv: CVData, key: SectionKey, lang: Language, untitled: string): string {
  if (isBuiltinSection(key)) return CV_LABELS[lang][key];
  return findCustomSection(cv, key)?.title.trim() || untitled;
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

/* ------------------------------------------------------------------ */
/* Option groups                                                       */
/* ------------------------------------------------------------------ */

interface Option<T extends string> {
  value: T;
  label: string;
  detail?: string;
  /** Decorative visual shown before the label (a colour swatch). */
  swatch?: ReactNode;
  labelStyle?: CSSProperties;
}

/** A fieldset with a legend and an optional hint that describes the whole group. */
function Group({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  const hintId = useId();
  return (
    <fieldset aria-describedby={hint ? hintId : undefined} className="min-w-0">
      <legend className="text-sm font-medium text-fg">{legend}</legend>
      {hint && (
        <p id={hintId} className="mt-1 max-w-[65ch] text-xs leading-relaxed text-fg-muted">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
    </fieldset>
  );
}

/** Native radio buttons laid out as a list or grid (keyboard: Tab into the group, arrow keys to choose). */
function RadioList<T extends string>({
  name,
  value,
  options,
  onChange,
  className,
}: {
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className: string;
}) {
  return (
    <div className={className}>
      {options.map((o) => {
        const id = `${name}-${o.value}`;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className="flex min-h-10 min-w-0 cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-fg hover:bg-raised"
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="size-4 shrink-0 accent-accent-control"
            />
            {o.swatch}
            <span className="min-w-0 break-words" style={o.labelStyle}>
              {o.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * Three options side by side. Still native radios (visually hidden), so arrow keys,
 * form semantics and screen reader announcements work as usual; the selected option is
 * filled and marked with a check.
 */
function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-flow-col auto-cols-fr rounded-sm border border-control-line">
      {options.map((o) => {
        const id = `${name}-${o.value}`;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className="group relative flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center px-1.5 py-1.5 text-center text-sm text-fg not-first:border-l not-first:border-control-line first:rounded-l-sm last:rounded-r-sm hover:bg-raised has-checked:bg-accent has-checked:text-accent-fg has-checked:hover:bg-accent-hover has-focus-visible:z-10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-text"
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className="inline-flex max-w-full items-center gap-1 font-medium break-words">
              <Check width={14} height={14} strokeWidth={2.5} className="hidden shrink-0 group-has-checked:block" />
              {o.label}
            </span>
            {/* The space keeps "Small 9.5 pt" apart in the accessible name; flex layout drops it visually. */}
            {o.detail && " "}
            {o.detail && <span className="text-xs text-fg-muted group-has-checked:text-accent-fg">{o.detail}</span>}
          </label>
        );
      })}
    </div>
  );
}

/** Decorative colour sample next to a colour option. */
function Swatch({ hex }: { hex: string | null }) {
  return (
    <span
      aria-hidden="true"
      className={`size-5 shrink-0 rounded-sm ${hex ? "ring-1 ring-white/25 ring-inset" : "border border-dashed border-control-line"}`}
      style={hex ? { backgroundColor: hex } : undefined}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Custom colour                                                       */
/* ------------------------------------------------------------------ */

function CustomColour({
  value,
  onChange,
  d,
  lang,
}: {
  /** Current accent, lowercase "#rrggbb". */
  value: string;
  onChange: (hex: string) => void;
  d: DesignStrings["accent"];
  lang: Language;
}) {
  const id = useId();
  const pickerId = `${id}-picker`;
  const hexId = `${id}-hex`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const contrastId = `${id}-contrast`;
  const warningId = `${id}-warning`;

  // What the person is typing; it only becomes the accent once it is a valid colour code.
  const [draft, setDraft] = useState(value);
  const [showError, setShowError] = useState(false);
  // Follow colour changes made elsewhere (the colour picker, another document), unless
  // the draft already says the same thing in a different spelling.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (parseHexInput(draft, true) !== value) {
      setDraft(value);
      setShowError(false);
    }
  }

  const ratio = contrastOnWhite(value);
  const low = ratio < MIN_ACCENT_CONTRAST;
  const invalid = showError && parseHexInput(draft, true) === null;

  const commitDraft = () => {
    const parsed = parseHexInput(draft, true);
    if (parsed === null) {
      setShowError(true);
      return;
    }
    setShowError(false);
    setDraft(parsed);
    if (parsed !== value) onChange(parsed);
  };

  const describedBy = (...ids: (string | false)[]) => ids.filter(Boolean).join(" ") || undefined;

  return (
    <div className="mt-3 border-l-2 border-line pl-4" data-testid="custom-colour">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div>
          <label htmlFor={pickerId} className="mb-1 block text-sm font-medium text-fg">
            {d.pickerLabel}
          </label>
          <input
            id={pickerId}
            type="color"
            value={value}
            onChange={(e) => {
              const parsed = parseHexInput(e.target.value);
              if (!parsed) return;
              setDraft(parsed);
              setShowError(false);
              if (parsed !== value) onChange(parsed);
            }}
            aria-describedby={describedBy(contrastId, low && warningId)}
            className="block h-10 w-16 cursor-pointer rounded-sm border border-control-line bg-raised p-1"
          />
        </div>
        <div className="w-40 max-w-full">
          <label htmlFor={hexId} className="mb-1 block text-sm font-medium text-fg">
            {d.hexLabel}
          </label>
          <input
            id={hexId}
            type="text"
            value={draft}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              // Apply complete six-digit codes while typing; "#215" is a prefix, not a colour yet.
              const parsed = parseHexInput(next);
              if (parsed) {
                setShowError(false);
                if (parsed !== value) onChange(parsed);
              }
            }}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              }
            }}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={describedBy(hintId, invalid && errorId, contrastId, low && warningId)}
            className={inputClass}
          />
        </div>
      </div>
      <p id={hintId} className="mt-1 text-xs text-fg-muted">
        {d.hexHint}
      </p>
      {invalid && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-danger-text">
          {d.hexError}
        </p>
      )}
      <p id={contrastId} className="mt-3 text-sm text-fg-muted" data-testid="contrast-ratio">
        {fmt(d.contrast, { ratio: formatRatio(ratio, lang) })}
      </p>
      {/* Polite live region: announced when the colour crosses the threshold, not on every change. */}
      <div aria-live="polite">
        {low && (
          <p
            id={warningId}
            className="mt-2 max-w-[65ch] rounded-sm border-l-2 border-warn-text bg-surface px-3 py-2 text-sm leading-relaxed text-warn-text"
            data-testid="contrast-warning"
          >
            {d.lowContrast}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section manager                                                     */
/* ------------------------------------------------------------------ */

function SectionManager({
  cv,
  dispatch,
  announce,
}: {
  cv: CVData;
  dispatch: Dispatch<CVAction>;
  announce: (message: string) => void;
}) {
  const { t, lang } = useI18n();
  const s = t.design.sections;
  const titleId = useId();
  const order = allSectionsInOrder(cv);
  const templateOrder = allSectionsInOrder({ ...cv, meta: { ...cv.meta, sectionOrder: [] } });
  const isTemplateOrder = sameOrder(order, templateOrder);

  // Move buttons per section (keys can contain user-chosen ids, hence a Map). After a
  // move, focus returns to the same button on the moved row, or to the other one when
  // the row reached the top or bottom and that button became disabled.
  const moveButtons = useRef(new Map<string, { up?: HTMLButtonElement | null; down?: HTMLButtonElement | null }>());
  const pendingFocus = useRef<{ key: SectionKey; direction: -1 | 1 } | null>(null);
  const setMoveButton = (key: string, which: "up" | "down", el: HTMLButtonElement | null) => {
    const entry = moveButtons.current.get(key) ?? {};
    entry[which] = el;
    if (!entry.up && !entry.down) moveButtons.current.delete(key);
    else moveButtons.current.set(key, entry);
  };

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const entry = moveButtons.current.get(pending.key);
    if (!entry) return;
    const same = pending.direction === -1 ? entry.up : entry.down;
    const other = pending.direction === -1 ? entry.down : entry.up;
    const target = same && !same.disabled ? same : other && !other.disabled ? other : null;
    target?.focus();
  });

  const nameOf = (key: SectionKey) => sectionDisplayName(cv, key, lang, s.untitled);

  const move = (key: SectionKey, index: number, direction: -1 | 1) => {
    const to = index + direction;
    if (to < 0 || to >= order.length) return;
    pendingFocus.current = { key, direction };
    dispatch({ type: "moveSection", key, direction });
    announce(fmt(s.moved, { name: nameOf(key), position: to + 1, total: order.length }));
  };

  const resetOrder = () => {
    if (isTemplateOrder) return;
    dispatch({ type: "resetSectionOrder" });
    announce(s.resetDone);
  };

  return (
    <section aria-labelledby={titleId} className="border-t border-line pt-6 pb-8" data-testid="section-manager">
      <h2 id={titleId} className="font-display text-lg font-semibold text-fg">
        {s.title}
      </h2>
      <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-fg-muted">{s.intro}</p>
      <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-fg-muted">{s.personalNote}</p>

      <ol aria-label={s.listLabel} className="mt-4 divide-y divide-line border-y border-line">
        {order.map((key, index) => {
          const name = nameOf(key);
          const hidden = isSectionHidden(cv, key);
          const note = hidden ? s.hiddenNote : isSectionFilled(cv, key) ? "" : s.emptyNote;
          const untitled = !isBuiltinSection(key) && name === s.untitled;
          return (
            <li key={key} className="flex items-center gap-2 py-1.5" data-section={key}>
              <div className="min-w-0 flex-1 py-1">
                <p
                  className={`text-sm font-medium break-words ${hidden || untitled ? "text-fg-muted" : "text-fg"}`}
                  data-testid="section-name"
                >
                  {name}
                </p>
                {note && <p className="text-xs text-fg-muted">{note}</p>}
              </div>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  ref={(el) => setMoveButton(key, "up", el)}
                  className={btn.icon}
                  aria-label={fmt(s.moveUp, { name })}
                  disabled={index === 0}
                  onClick={() => move(key, index, -1)}
                >
                  <ArrowUp />
                </button>
                <button
                  type="button"
                  ref={(el) => setMoveButton(key, "down", el)}
                  className={btn.icon}
                  aria-label={fmt(s.moveDown, { name })}
                  disabled={index === order.length - 1}
                  onClick={() => move(key, index, 1)}
                >
                  <ArrowDown />
                </button>
                <button
                  type="button"
                  aria-pressed={!hidden}
                  aria-label={fmt(s.showLabel, { name })}
                  onClick={() => dispatch({ type: "setSectionHidden", key, hidden: !hidden })}
                  className="ml-1 inline-flex min-h-10 items-center gap-2 rounded-sm px-2 text-sm text-fg hover:bg-raised"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                      hidden ? "border-control-line" : "border-accent-control bg-accent-control text-canvas"
                    }`}
                  >
                    {!hidden && <Check width={12} height={12} strokeWidth={3} />}
                  </span>
                  {s.show}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4">
        <button
          type="button"
          className={`${btn.secondary} aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-line-strong aria-disabled:hover:bg-transparent`}
          aria-disabled={isTemplateOrder ? true : undefined}
          onClick={resetOrder}
        >
          {s.reset}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

/**
 * Appearance settings for a CV or cover letter, plus (when `cv` and `dispatch` are
 * given) the section manager: order, visibility and reset to the template order.
 */
export function DesignPanel({
  style,
  template,
  onStyleChange,
  cv,
  dispatch,
}: {
  style: DocStyle;
  template: TemplateId;
  onStyleChange: (patch: Partial<DocStyle>) => void;
  cv?: CVData;
  dispatch?: Dispatch<CVAction>;
}) {
  const { t, lang } = useI18n();
  const d = t.design;
  const baseId = useId();
  const appearanceTitleId = `${baseId}-appearance`;

  const [announcement, setAnnouncement] = useState("");

  // Which radio shows as selected. A preset colour can also be reached through the
  // custom field; `customFor` remembers that the person is working on a custom colour,
  // so typing a preset's code does not jump the selection to that preset.
  const accent = style.accent.toLowerCase();
  const presetMatch = ACCENT_PRESETS.find((p) => p.hex === accent);
  const [customFor, setCustomFor] = useState<string | null>(null);
  const [lastCustom, setLastCustom] = useState<string | null>(accent && !presetMatch ? accent : null);
  const accentChoice: AccentChoice =
    accent !== "" && (customFor === accent || !presetMatch) ? "custom" : (presetMatch?.id ?? "default");
  const templateAccent = TEMPLATE_ACCENTS[template] ?? TEMPLATE_ACCENTS["ats-minimal"];

  const setCustom = (hex: string) => {
    setCustomFor(hex);
    setLastCustom(hex);
    onStyleChange({ accent: hex });
  };

  const chooseAccent = (choice: AccentChoice) => {
    if (choice === "custom") {
      // Bring back the last custom colour, or start from the colour in use so nothing jumps.
      setCustom(lastCustom ?? (accent || templateAccent));
      return;
    }
    setCustomFor(null);
    const preset = ACCENT_PRESETS.find((p) => p.id === choice);
    if (preset) onStyleChange({ accent: preset.hex });
  };

  const accentOptions: Option<AccentChoice>[] = [
    ...ACCENT_PRESETS.map((p) => ({
      value: p.id,
      label: d.accent.names[p.id],
      swatch: <Swatch hex={p.hex || templateAccent} />,
    })),
    {
      value: "custom" as const,
      label: d.accent.custom,
      swatch: <Swatch hex={accentChoice === "custom" ? accent : lastCustom} />,
    },
  ];

  const isDefault = isDefaultStyle(style);
  const resetAppearance = () => {
    if (isDefault) return;
    setCustomFor(null);
    onStyleChange({ ...DEFAULT_STYLE });
    setAnnouncement(d.appearance.resetDone);
  };

  return (
    <div className="min-w-0" data-testid="design-panel">
      <section aria-labelledby={appearanceTitleId} className="pb-8">
        <h2 id={appearanceTitleId} className="font-display text-lg font-semibold text-fg">
          {d.appearance.title}
        </h2>
        <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-fg-muted">{d.appearance.intro}</p>

        <div className="mt-6 space-y-7">
          <Group legend={d.accent.legend} hint={d.accent.hint}>
            <RadioList
              name={`${baseId}-accent`}
              value={accentChoice}
              options={accentOptions}
              onChange={chooseAccent}
              className="-mx-2 grid grid-cols-2 gap-x-2"
            />
            {accentChoice === "custom" && <CustomColour value={accent} onChange={setCustom} d={d.accent} lang={lang} />}
          </Group>

          <Group legend={d.font.legend} hint={d.font.hint}>
            <RadioList
              name={`${baseId}-font`}
              value={style.font}
              options={FONT_OPTIONS.map((f) => ({
                value: f,
                label: d.font.options[f],
                // Each name is set in its own typeface, so the list doubles as a sample.
                labelStyle: f === "default" ? undefined : { fontFamily: FONT_STACKS[f] },
              }))}
              onChange={(font) => onStyleChange({ font })}
              className="-mx-2 grid gap-x-2 sm:grid-cols-2"
            />
          </Group>

          <Group legend={d.fontSize.legend}>
            <Segmented
              name={`${baseId}-size`}
              value={style.fontSize}
              options={FONT_SIZES.map((size) => ({
                value: size,
                label: d.fontSize.options[size],
                detail: fmt(d.fontSize.detail, { size: formatNumber(FONT_SIZE_PT[size], lang) }),
              }))}
              onChange={(fontSize) => onStyleChange({ fontSize })}
            />
          </Group>

          <Group legend={d.spacing.legend} hint={d.spacing.hint}>
            <Segmented
              name={`${baseId}-spacing`}
              value={style.spacing}
              options={SPACINGS.map((spacing) => ({ value: spacing, label: d.spacing.options[spacing] }))}
              onChange={(spacing) => onStyleChange({ spacing })}
            />
          </Group>

          <Group legend={d.margin.legend} hint={d.margin.hint}>
            <Segmented
              name={`${baseId}-margin`}
              value={style.margin}
              options={MARGINS.map((margin) => ({
                value: margin,
                label: d.margin.options[margin],
                detail: fmt(d.margin.detail, { size: formatNumber(MARGIN_MM[margin].x, lang) }),
              }))}
              onChange={(margin) => onStyleChange({ margin })}
            />
          </Group>
        </div>

        <div className="mt-7">
          <button
            type="button"
            className={`${btn.secondary} aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-line-strong aria-disabled:hover:bg-transparent`}
            aria-disabled={isDefault ? true : undefined}
            onClick={resetAppearance}
          >
            {d.appearance.reset}
          </button>
        </div>
      </section>

      {cv && dispatch && <SectionManager cv={cv} dispatch={dispatch} announce={setAnnouncement} />}

      <p role="status" aria-live="polite" className="sr-only" data-testid="design-announcer">
        {announcement}
      </p>
    </div>
  );
}
