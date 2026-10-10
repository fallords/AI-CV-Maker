"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { TEMPLATES, CVDocument } from "@/components/templates";
import { isCVEmpty, type CVData } from "@/lib/cv-schema";
import { fmt, useI18n } from "@/lib/i18n";

/** A4 geometry, matching the @page rules in app/globals.css. */
const MM = 96 / 25.4;
const PAGE_W = 210 * MM;
const PAGE_H = 297 * MM;
const MARGIN_Y = 14 * MM;
const CONTENT_H = PAGE_H - 2 * MARGIN_Y;

/**
 * Live, scaled A4 preview. Dashed guides mark where printed pages will
 * approximately break (the browser may move whole entries to the next page).
 */
export function CVPreview({ cv }: { cv: CVData }) {
  const { t } = useI18n();
  const outerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(PAGE_H);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const doc = docRef.current;
    if (!outer || !doc || typeof ResizeObserver === "undefined") return;
    const update = () => {
      setScale(Math.min(1, outer.clientWidth / PAGE_W));
      setHeight(Math.max(PAGE_H, doc.scrollHeight));
    };
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(doc);
    update();
    return () => ro.disconnect();
  }, []);

  const contentEnd = height - MARGIN_Y;
  const breaks: number[] = [];
  for (let y = MARGIN_Y + CONTENT_H; y < contentEnd - 1; y += CONTENT_H) breaks.push(y);
  const pages = breaks.length + 1;
  const empty = isCVEmpty(cv);
  const photoHidden = !!cv.personal.photo && !TEMPLATES[cv.meta.template].showsPhoto;

  return (
    <div ref={outerRef} className="w-full">
      <p className="mb-2 flex justify-between text-xs text-stone-600" aria-live="polite">
        <span>A4 · {fmt(pages === 1 ? t.builder.preview.pageOne : t.builder.preview.pageMany, { count: pages })}</span>
        {photoHidden && <span>{t.builder.preview.atsPhotoNote}</span>}
      </p>
      <div
        className="relative mx-auto overflow-hidden rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.06)] ring-1 ring-stone-200"
        style={{ width: PAGE_W * scale, height: height * scale }}
      >
        <div
          ref={docRef}
          className="cv-sheet absolute top-0 left-0 origin-top-left"
          style={{ transform: `scale(${scale})`, width: PAGE_W }}
          role="document"
          aria-label={t.builder.preview.label}
        >
          <CVDocument cv={cv} />
          {empty && (
            <p className="absolute inset-x-0 top-1/3 px-16 text-center text-lg text-stone-400">
              {t.builder.preview.empty}
            </p>
          )}
          {breaks.map((y, i) => (
            <div
              key={y}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-brand-300"
              style={{ top: y }}
            >
              <span className="absolute right-2 -top-6 rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-800">
                {t.builder.preview.pageGuide} · {i + 2}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
