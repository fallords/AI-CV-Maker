"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { templateFor } from "@/components/templates";
import { DocumentView } from "@/components/templates/DocumentView";
import { pageMarginY } from "@/components/templates/style";
import { isCVEmpty } from "@/lib/cv-schema";
import type { AnyDoc } from "@/lib/documents";
import { fmt, useI18n } from "@/lib/i18n";

/** A4 geometry in CSS pixels, matching the @page rule PrintRoot writes. */
const MM = 96 / 25.4;
const PAGE_W = 210 * MM;
const PAGE_H = 297 * MM;

/**
 * Where printed pages will approximately break, in unscaled sheet pixels. The sheet
 * repeats the page's top/bottom margin as padding, so content spans
 * [marginY, height - marginY] and each page holds PAGE_H - 2 * marginY of it.
 */
export function pageBreaks(height: number, marginYmm: number): number[] {
  const marginY = marginYmm * MM;
  const contentH = PAGE_H - 2 * marginY;
  const contentEnd = height - marginY;
  const breaks: number[] = [];
  for (let y = marginY + contentH; y < contentEnd - 1; y += contentH) breaks.push(y);
  return breaks;
}

/**
 * Live, scaled A4 preview of a CV or cover letter. Dashed guides mark where printed
 * pages will approximately break (the browser may move whole entries to the next page).
 * `onPagesChange` is called with the page count whenever it changes.
 */
export function DocumentPreview({ doc, onPagesChange }: { doc: AnyDoc; onPagesChange?: (pages: number) => void }) {
  const { t } = useI18n();
  const outerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(PAGE_H);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const sheet = docRef.current;
    if (!outer || !sheet || typeof ResizeObserver === "undefined") return;
    const update = () => {
      setScale(Math.min(1, outer.clientWidth / PAGE_W));
      setHeight(Math.max(PAGE_H, sheet.scrollHeight));
    };
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(sheet);
    update();
    return () => ro.disconnect();
  }, []);

  const breaks = pageBreaks(height, pageMarginY(doc.data.meta.style));
  const pages = breaks.length + 1;

  // Report page counts without re-running for every new callback identity.
  const onPagesRef = useRef(onPagesChange);
  useEffect(() => {
    onPagesRef.current = onPagesChange;
  });
  useEffect(() => {
    onPagesRef.current?.(pages);
  }, [pages]);

  // A new letter already shows its date, greeting and closing, so only CVs get the empty-state hint.
  const empty = doc.kind === "cv" && isCVEmpty(doc.data);
  const photoHidden =
    doc.kind === "cv" && !!doc.data.personal.photo && !templateFor(doc.data.meta.template).showsPhoto;
  const label = doc.kind === "cv" ? t.builder.preview.label : t.letter.previewLabel;

  return (
    <div ref={outerRef} className="w-full">
      <p className="mb-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-fg-muted" aria-live="polite">
        {!empty && (
          <span className="tabular-nums">
            A4 · {fmt(pages === 1 ? t.builder.preview.pageOne : t.builder.preview.pageMany, { count: pages })}
          </span>
        )}
        {photoHidden && <span>{t.builder.preview.atsPhotoNote}</span>}
      </p>
      <div
        className="relative mx-auto overflow-hidden bg-paper shadow-[0_1px_2px_rgba(0,0,0,0.5),0_8px_16px_-8px_rgba(0,0,0,0.6)] ring-1 ring-black/40"
        style={{ width: PAGE_W * scale, height: height * scale }}
      >
        <div
          ref={docRef}
          className="cv-sheet absolute top-0 left-0 origin-top-left"
          style={{ transform: `scale(${scale})`, width: PAGE_W }}
          role="document"
          aria-label={label}
        >
          <DocumentView doc={doc} />
          {empty && (
            <p className="absolute inset-x-0 top-1/3 px-16 text-center text-lg text-stone-500">
              {t.builder.preview.empty}
            </p>
          )}
          {breaks.map((y, i) => (
            <div
              key={y}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-accent-line"
              style={{ top: y }}
            >
              <span className="absolute right-2 -top-6 rounded-sm border border-accent-line bg-paper px-1.5 py-0.5 text-xs text-accent">
                {t.builder.preview.pageGuide} · {i + 2}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
