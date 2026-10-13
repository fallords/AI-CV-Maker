/**
 * Saving exported files. Everything happens in the browser: the file is built in
 * memory and handed to the browser's own download handling through a temporary
 * object URL, so nothing is uploaded anywhere.
 */

import { docFileBase, type AnyDoc } from "../documents";

export type ExportFormat = "docx" | "txt" | "json";

export const EXPORT_MIME: Record<ExportFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain;charset=utf-8",
  json: "application/json",
};

/**
 * How long the object URL stays valid after the download starts. Some browsers read the
 * blob asynchronously after click(), so revoking it straight away can cancel the download.
 */
export const REVOKE_DELAY_MS = 30_000;

/** "Jane_Doe_CV.docx", "Jane_Doe_Cover_Letter.txt" (see docFileBase in lib/documents.ts). */
export function exportFileName(doc: AnyDoc, format: ExportFormat): string {
  return `${docFileBase(doc)}.${format}`;
}

/** A UTF-8 plain text file. */
export function textBlob(text: string): Blob {
  return new Blob([text], { type: EXPORT_MIME.txt });
}

/**
 * Starts a download of `blob` named `filename` (call it once per user action, e.g. from
 * the download menu). Does nothing outside the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.hidden = true;
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
}
