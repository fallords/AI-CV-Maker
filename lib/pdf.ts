/**
 * PDF export via the browser's print engine.
 *
 * The builder renders a print-only copy of the CV (#cv-print-root) and print CSS in
 * app/globals.css hides all application UI, sets A4 page size/margins and avoids
 * breaking entries across pages where practical. The browser then produces a PDF
 * with real, selectable text and embedded local fonts — no server, no remote
 * assets, no watermark.
 */

import type { CVData } from "./cv-schema";

export const PRINT_HINT_KEY = "free-cv-maker:hide-print-hint";

/** "Dévi Lestari!" -> "Devi_Lestari": ASCII letters, digits, "_" and "-" only. */
export function fileSafeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

/** File name suggested to the browser's "Save as PDF" (taken from document.title). */
export function pdfFileName(cv: CVData): string {
  const name = fileSafeName(cv.personal.fullName);
  return name ? `${name}_CV` : "CV";
}

/**
 * Opens the browser's print dialog with `title` as the page title (browsers suggest it as
 * the PDF's file name), then restores the previous title once printing is done.
 * Returns false when printing is not available (e.g. some in-app browsers).
 */
export function printWithTitle(title: string, win: Window = window): boolean {
  if (typeof win.print !== "function") return false;
  const previousTitle = win.document.title;
  win.document.title = title;
  const restore = () => {
    win.document.title = previousTitle;
    win.removeEventListener("afterprint", restore);
  };
  win.addEventListener("afterprint", restore);
  try {
    win.print();
  } catch {
    restore();
    return false;
  }
  return true;
}

/** Opens the print dialog with a CV-specific document title, then restores the title. */
export function printCV(cv: CVData, win: Window = window): boolean {
  return printWithTitle(pdfFileName(cv), win);
}
