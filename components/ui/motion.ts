"use client";

/**
 * Small motion helpers shared by the landing page and the builder. Every effect here is
 * decorative: it is skipped when the person asks their system for reduced motion, and
 * nothing waits for an animation to finish. The CSS side (durations, easing and the
 * `.motion-*` classes) lives in the "Motion" section of app/globals.css.
 */

import { useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from "react";

/** Same as --motion-ease in app/globals.css: a plain deceleration, no overshoot. */
export const MOTION_EASE = "cubic-bezier(0.2, 0, 0, 1)";
/** Same as --motion-base in app/globals.css. */
export const MOTION_BASE_MS = 180;

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * True when motion should be left out: the person prefers reduced motion, or the
 * environment can't tell (no window or matchMedia), in which case staying still is safer.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia(REDUCE_QUERY).matches;
}

function subscribeReduced(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Live `prefersReducedMotion()`. Static HTML is rendered as "reduced", so nothing moves before hydration. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, prefersReducedMotion, () => true);
}

/**
 * Animates items of a list to their new place when their order changes ("FLIP"): after
 * each render the items' positions are measured relative to the list, and an item whose
 * key moved slides from its old position to the new one. Items are the children of
 * `listRef` that carry `data-flip-key`. Only order changes animate; items that are added,
 * removed or grow in place don't. Uses `translate` only, so focus and layout are untouched.
 */
export function useFlipList(listRef: RefObject<HTMLElement | null>, keys: readonly string[]): void {
  const positions = useRef(new Map<string, number>());
  const order = useRef<readonly string[]>(keys);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const top = list.getBoundingClientRect().top;
    const items = Array.from(list.querySelectorAll<HTMLElement>(":scope > [data-flip-key]"));
    const previous = positions.current;
    const next = new Map<string, number>();
    for (const el of items) next.set(el.dataset.flipKey ?? "", el.getBoundingClientRect().top - top);

    const reordered =
      order.current.length === keys.length &&
      order.current.some((key, i) => key !== keys[i]) &&
      keys.every((key) => previous.has(key));

    if (reordered && !prefersReducedMotion()) {
      for (const el of items) {
        const key = el.dataset.flipKey ?? "";
        const delta = (previous.get(key) ?? 0) - (next.get(key) ?? 0);
        if (Math.abs(delta) < 1 || typeof el.animate !== "function") continue;
        el.animate([{ translate: `0 ${delta}px` }, { translate: "0 0" }], {
          duration: 220,
          easing: MOTION_EASE,
        });
      }
    }
    positions.current = next;
    order.current = keys;
  });
}
