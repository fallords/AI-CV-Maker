"use client";

import { useId, useMemo } from "react";
import {
  CHECK_LEVELS,
  countByLevel,
  runChecks,
  scoreBand,
  type CheckItem,
  type CheckLevel,
} from "@/lib/cv-checks";
import { isCVEmpty, type CVData, type Language } from "@/lib/cv-schema";
import { findCustomSection, isBuiltinSection } from "@/lib/cv-sections";
import { fmt, useI18n } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/en";
import { Check, Chevron } from "../ui/Icons";
import { btn } from "../ui/styles";

export interface ChecksPanelProps {
  cv: CVData;
  /** Rendered page count from the preview (0 or less when not measured yet). */
  pages: number;
  /**
   * Called when a finding is activated. `target` is the DOM id of the editor section
   * ("personal", "experience", "custom-<id>", …) or "design" (DESIGN_TARGET) for
   * findings that are fixed in the Design tab; `itemId` names the entry
   * (`data-item-id` in the form) when the finding is about one.
   */
  /**
   * `field` names the control (`data-field`) to focus inside the target, when known: a form
   * field, or for design findings a Design tab control ("accent", "fontSize").
   */
  onJump: (target: string, itemId?: string, field?: string) => void;
}

/** Round status dot before each finding (decorative; the level is also read out). */
const DOT: Record<CheckLevel, string> = {
  error: "bg-stamp",
  warning: "bg-warn-text",
  tip: "bg-fg-subtle",
};

function formatNumber(value: string | number, lang: Language): string {
  return typeof value === "number" && lang === "id" ? String(value).replace(".", ",") : String(value);
}

/** The finding's message in the interface language. */
export function checkMessage(item: CheckItem, t: Dictionary, lang: Language): string {
  const rules = t.checks.rules;
  // The first-person tip names the pronouns that were found ("I", "my" or "saya", "aku").
  const template =
    item.rule === "firstPerson" ? rules.firstPerson[item.params?.pronouns === "id" ? "id" : "en"] : rules[item.rule];
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(item.params ?? {})) params[key] = formatNumber(value, lang);
  const text = typeof template === "string" ? template : item.params?.count === 1 ? template.one : template.other;
  return fmt(text, params);
}

/** Where the finding is: the section name, plus the entry title for entry findings. */
export function checkPlace(item: CheckItem, cv: CVData, t: Dictionary): string {
  const places = t.checks.places;
  let section: string;
  if (item.area === "personal" || item.area === "design") section = places[item.area];
  else if (isBuiltinSection(item.area)) section = places[item.area];
  else section = findCustomSection(cv, item.area)?.title.trim() || places.customUntitled;
  if (!item.itemId) return section;
  const entry = String(item.params?.entry ?? "").trim();
  return `${section}: ${entry || fmt(t.checks.entryUntitled, { index: item.params?.index ?? "" })}`;
}

/** "2 errors, 1 warning and 3 tips" (only the levels that occur). */
function countsText(items: readonly CheckItem[], t: Dictionary): string {
  const counts = countByLevel(items);
  const parts = CHECK_LEVELS.filter((level) => counts[level] > 0).map((level) => {
    const forms = t.checks.counts[level];
    return fmt(counts[level] === 1 ? forms.one : forms.other, { count: counts[level] });
  });
  const { separator, pair, last } = t.checks.list;
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return parts.join(pair);
  return `${parts.slice(0, -1).join(separator)}${last}${parts[parts.length - 1]}`;
}

/**
 * The CV checker: the score, stamped on the paper, a quiet meter and the findings grouped
 * by severity. Every finding is a button that jumps to the place where it can be fixed.
 * Everything runs locally.
 */
export function ChecksPanel({ cv, pages, onJump }: ChecksPanelProps) {
  const { t, lang } = useI18n();
  const c = t.checks;
  const id = useId();
  const empty = isCVEmpty(cv);
  const result = useMemo(() => runChecks(cv, pages > 0 ? { pages } : {}), [cv, pages]);
  const { score, items } = result;
  const band = scoreBand(score);

  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 pb-6" data-testid="checks-panel">
      <h2 id={`${id}-title`} className="font-display text-[21px] leading-tight font-semibold text-fg">
        {c.heading}
      </h2>
      <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-fg-muted">{c.intro}</p>

      {empty ? (
        <div className="mt-8">
          <p className="max-w-[65ch] text-sm text-fg-body">{c.empty}</p>
          <button type="button" className={`${btn.secondary} mt-3`} onClick={() => onJump("personal")}>
            {c.emptyAction}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <p id={`${id}-score`} className="text-sm font-medium text-fg">
              {c.score.label}
            </p>
            {/* The score as a stamp on the paper. The meter below carries the value for assistive technology. */}
            <p aria-hidden="true" className="mt-2 flex items-center gap-3">
              <span
                className="inline-flex min-w-[3.25rem] justify-center rounded-[3px] border-2 border-stamp px-2 py-1 font-display text-[36px] leading-none font-bold text-stamp tabular-nums"
                data-testid="checks-score"
              >
                {score}
              </span>{" "}
              <span className="text-sm text-fg-muted">{c.score.outOf}</span>
            </p>
            <div
              role="meter"
              aria-labelledby={`${id}-score`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={score}
              aria-valuetext={fmt(c.score.valueText, { score })}
              className="mt-4 h-1.5 w-full max-w-md overflow-hidden bg-line"
            >
              <div className="h-full bg-fg" style={{ width: `${score}%` }} />
            </div>
            <p className="mt-3 text-sm text-fg-body">
              {items.some((item) => item.level === "error") ? c.score.withErrors : c.score.bands[band]}
              {items.length > 0 && <span className="text-fg-muted"> {countsText(items, t)}.</span>}
            </p>
            <p className="mt-1 text-sm text-fg-muted">{c.score.basis}</p>
          </div>

          {items.length === 0 ? (
            <p className="mt-8 flex max-w-[65ch] gap-2 text-sm text-fg-body">
              <Check className="mt-0.5 shrink-0 text-fg" />
              <span>{c.allClear}</span>
            </p>
          ) : (
            CHECK_LEVELS.map((level) => {
              const group = items.filter((item) => item.level === level);
              if (group.length === 0) return null;
              const headingId = `${id}-${level}`;
              return (
                <div key={level} className="mt-8">
                  <h3 id={headingId} className="text-sm font-semibold text-fg">
                    {c.groups[level]} <span className="font-normal text-fg-muted tabular-nums">({group.length})</span>
                  </h3>
                  <ul aria-labelledby={headingId} className="-mx-2 mt-2 space-y-0.5">
                    {group.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="group flex min-h-11 w-full items-start gap-3 rounded-[3px] px-2 py-2.5 text-left transition-colors duration-150 hover:bg-overlay"
                          onClick={() => onJump(item.target, item.itemId, item.field)}
                          data-check-id={item.id}
                        >
                          <span aria-hidden="true" className={`mt-[7px] size-2 shrink-0 rounded-full ${DOT[level]}`} />
                          <span className="min-w-0 flex-1">
                            <span className="sr-only">{c.levels[level]}:</span>{" "}
                            <span className="block text-sm break-words text-fg-body">
                              {checkMessage(item, t, lang)}
                            </span>{" "}
                            <span className="mt-0.5 block text-sm break-words text-fg-muted">
                              {checkPlace(item, cv, t)}
                            </span>
                          </span>
                          <Chevron className="mt-0.5 shrink-0 -rotate-90 text-fg-subtle group-hover:text-fg" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </>
      )}
    </section>
  );
}
