import { docFileBase, type AnyDoc } from "@/lib/documents";
import { printWithTitle } from "@/lib/pdf";

/**
 * Opens the browser's print dialog for the document rendered in #cv-print-root (see
 * PrintRoot). The page title is set to the document's file name while printing, because
 * browsers suggest it as the PDF's file name, and restored afterwards.
 * Returns false when printing is not available (e.g. some in-app browsers).
 */
export function printDocument(doc: AnyDoc, win: Window = window): boolean {
  return printWithTitle(docFileBase(doc), win);
}
