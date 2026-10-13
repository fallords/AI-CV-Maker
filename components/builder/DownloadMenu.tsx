"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Chevron, Download } from "@/components/ui/Icons";
import { btn } from "@/components/ui/styles";
import { serializeDocument } from "@/lib/cv-validation";
import { isDocEmpty, type AnyDoc } from "@/lib/documents";
import { exportDocx } from "@/lib/export/docx";
import { downloadBlob, EXPORT_MIME, exportFileName, textBlob } from "@/lib/export/download";
import { exportText } from "@/lib/export/text";
import { useI18n } from "@/lib/i18n";
import { PRINT_HINT_KEY } from "@/lib/pdf";
import { readPreference, writePreference } from "@/lib/storage";
import { MenuButton, menuItem } from "./MenuButton";
import type { Notice } from "./notice";
import { printDocument } from "./print";

export type DownloadFormat = "pdf" | "docx" | "txt" | "json";
const FORMATS: readonly DownloadFormat[] = ["pdf", "docx", "txt", "json"];

export interface DownloadMenuProps {
  doc: AnyDoc;
  /** Called right before a download starts, so pending edits can be saved first. */
  onBeforeExport?: () => void;
  /** Reports progress, success and errors (shown under the toolbar). */
  onNotice: (notice: Notice) => void;
}

/**
 * "Download PDF" (the browser's print dialog, after the print instructions) plus a menu
 * with every format: PDF, Word (.docx), plain text (.txt) and a JSON backup. Every file
 * is made in the browser; nothing is uploaded.
 */
export function DownloadMenu({ doc, onBeforeExport, onNotice }: DownloadMenuProps) {
  const { t } = useI18n();
  const b = t.builder;
  const x = t.exporting;
  const ids = useId();
  const [printHintOpen, setPrintHintOpen] = useState(false);
  const [hidePrintHint, setHidePrintHint] = useState(false);
  const [preparingWord, setPreparingWord] = useState(false);
  // The document as last rendered, for the print dialog's delayed start.
  const docRef = useRef(doc);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  const kind = doc.kind;
  const refuseEmpty = () => {
    if (!isDocEmpty(doc)) return false;
    onNotice({ kind: "error", text: (d) => d.exporting.empty[kind] });
    return true;
  };

  const startPrint = () => {
    onBeforeExport?.();
    if (!printDocument(docRef.current)) onNotice({ kind: "error", text: (d) => d.builder.print.unavailable });
  };

  const onPdf = () => {
    if (refuseEmpty()) return;
    if (readPreference(PRINT_HINT_KEY) === "1") startPrint();
    else setPrintHintOpen(true);
  };

  const onDocx = async () => {
    if (refuseEmpty() || preparingWord) return;
    onBeforeExport?.();
    const current = doc;
    setPreparingWord(true);
    onNotice({ kind: "info", text: (d) => d.exporting.preparing });
    try {
      const blob = await exportDocx(current);
      downloadBlob(blob, exportFileName(current, "docx"));
      onNotice({ kind: "success", text: (d) => d.exporting.done.docx });
    } catch {
      onNotice({ kind: "error", text: (d) => d.exporting.failed.docx });
    } finally {
      setPreparingWord(false);
    }
  };

  const onTxt = () => {
    if (refuseEmpty()) return;
    onBeforeExport?.();
    try {
      downloadBlob(textBlob(exportText(doc)), exportFileName(doc, "txt"));
      onNotice({ kind: "success", text: (d) => d.exporting.done.txt });
    } catch {
      onNotice({ kind: "error", text: (d) => d.exporting.failed.txt });
    }
  };

  // A backup of an empty document is allowed: it is still a valid file to import later.
  const onJson = () => {
    onBeforeExport?.();
    downloadBlob(new Blob([serializeDocument(doc)], { type: EXPORT_MIME.json }), exportFileName(doc, "json"));
    onNotice({ kind: "success", text: (d) => d.exporting.done.json });
  };

  const handlers: Record<DownloadFormat, () => void> = {
    pdf: onPdf,
    docx: () => void onDocx(),
    txt: onTxt,
    json: onJson,
  };

  // Primary colours shared by both halves of the split button.
  const half =
    "inline-flex min-h-10 items-center justify-center gap-2 bg-accent text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover";

  return (
    <>
      <div className="flex max-sm:grow">
        <button type="button" className={`${half} grow rounded-l-sm px-4`} onClick={onPdf}>
          <Download /> {b.downloadPdf}
        </button>
        <MenuButton
          triggerClassName={`${half} w-10 rounded-r-sm border-l border-accent-fg/25`}
          triggerLabel={t.docs.download.more}
          triggerContent={<Chevron width={16} height={16} />}
          panelLabel={x.menuLabel}
        >
          {(run) =>
            FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                className={menuItem}
                aria-labelledby={`${ids}-${format}`}
                aria-describedby={`${ids}-${format}-desc`}
                aria-busy={format === "docx" && preparingWord ? true : undefined}
                disabled={format === "docx" && preparingWord}
                onClick={run(handlers[format])}
              >
                <span id={`${ids}-${format}`} className="font-medium">
                  {x.formats[format].label}
                </span>
                <span id={`${ids}-${format}-desc`} className="text-xs text-fg-muted">
                  {format === "docx" && preparingWord ? x.preparing : x.formats[format].description}
                </span>
              </button>
            ))
          }
        </MenuButton>
      </div>

      <Dialog
        open={printHintOpen}
        onClose={() => setPrintHintOpen(false)}
        title={kind === "cv" ? b.print.title : t.docs.print.titleLetter}
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setPrintHintOpen(false)}>
              {b.print.cancel}
            </button>
            <button
              type="button"
              className={btn.primary}
              autoFocus
              onClick={() => {
                if (hidePrintHint) writePreference(PRINT_HINT_KEY, "1");
                setPrintHintOpen(false);
                // Let the dialog close before the print dialog snapshots the page.
                window.setTimeout(startPrint, 50);
              }}
            >
              {b.print.continue}
            </button>
          </>
        }
      >
        <p>{b.print.intro}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {b.print.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-3 text-fg-muted">{b.print.note}</p>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            className="size-5 accent-accent-control"
            checked={hidePrintHint}
            onChange={(e) => setHidePrintHint(e.target.checked)}
          />
          {b.print.dontShow}
        </label>
      </Dialog>
    </>
  );
}
