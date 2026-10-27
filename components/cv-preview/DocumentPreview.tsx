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
 * Live, scaled A4 preview of a CV or cover letter: a white sheet lying on the folder.
 * Stamp-red dashed guides mark where printed pages will approximately break (the browser
 * may move whole entries to the next page). `onPagesChange` is called with the page count
 * whenever it changes. To keep the count right while the preview isn't shown, hide it
 * with `visibility: hidden` rather than `display: none` (a preview that isn't rendered
 * keeps its last measurement).
 *
 * With `fadeOnChange`, a change of template or document kind made after it was turned on
 * cross-fades the sheet's content (typing never does). Turn it on once the first document
 * is shown, so nothing fades in while the page loads.
 */
export function DocumentPreview({
  doc,
  onPagesChange,
  fadeOnChange = false,
}: {
  doc: AnyDoc;
  onPagesChange?: (pages: number) => void;
  fadeOnChange?: boolean;
}) {
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
      // A preview that isn't rendered (display: none) measures 0. Keep the last real
      // measurement then, so the page count (and the checker's page rule) stays right.
      if (sheet.getClientRects().length === 0) return;
      const width = outer.clientWidth;
      if (width > 0) setScale(Math.min(1, width / PAGE_W));
      setHeight(Math.max(PAGE_H, sheet.scrollHeight));
    };
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(sheet);
    update();
    return () => ro.disconnect();
  }, []);

  // What the sheet shows; a new value remounts the content, which then fades in once fading
  // is armed. Adjusted during render (not in an effect) so the fade starts with the change.
  const viewKey = `${doc.kind}:${doc.data.meta.template}`;
  const [view, setView] = useState({ key: viewKey, armed: fadeOnChange, fade: false });
  if (view.key !== viewKey || view.armed !== fadeOnChange) {
    setView({
      key: viewKey,
      armed: fadeOnChange,
      fade: view.fade || (view.armed && fadeOnChange && view.key !== viewKey),
    });
  }

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
      {/*
        On the kraft board, so kraft-ink rather than a muted grey. As tall as the editor's
        folder tabs, so the sheet lines up with the editor's sheet beside it.
      */}
      <p
        className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1 text-sm text-kraft-ink"
        aria-live="polite"
      >
        {!empty && (
          <span className="tabular-nums">
            {fmt(pages === 1 ? t.builder.preview.pageOne : t.builder.preview.pageMany, { count: pages })}
          </span>
        )}
        {photoHidden && <span>{t.builder.preview.atsPhotoNote}</span>}
      </p>
      <div
        className="relative mx-auto overflow-hidden bg-paper shadow-[0_1px_0_var(--color-kraft-deep),0_2px_6px_-2px_rgb(74_48_25/0.35)]"
        style={{ width: PAGE_W * scale, height: height * scale }}
      >
        <div
          ref={docRef}
          className="cv-sheet absolute top-0 left-0 origin-top-left"
          style={{ transform: `scale(${scale})`, width: PAGE_W }}
          role="document"
          aria-label={label}
        >
          <div key={view.key} className={view.fade ? "motion-fade" : undefined}>
            <DocumentView doc={doc} />
          </div>
          {empty && (
            <p className="absolute inset-x-0 top-1/3 px-16 text-center text-xl text-fg-muted">
              {t.builder.preview.empty}
            </p>
          )}
          {/* Sized for the scaled-down sheet, so the label stays legible in the preview. */}
          {breaks.map((y, i) => (
            <div
              key={y}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-stamp"
              style={{ top: y }}
            >
              <span className="absolute right-3 bottom-full bg-paper px-1.5 pb-0.5 text-[15px] leading-tight font-medium text-stamp">
                {fmt(t.builder.preview.pageGuide, { page: i + 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
