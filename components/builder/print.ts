import { docFileBase, type AnyDoc } from "@/lib/documents";

/**
 * Opens the browser's print dialog for the document rendered in #cv-print-root (see
 * PrintRoot). The page title is set to the document's file name while printing, because
 * browsers suggest it as the PDF's file name, and restored afterwards.
 * Returns false when printing is not available (e.g. some in-app browsers).
 */
export function printDocument(doc: AnyDoc, win: Window = window): boolean {
  if (typeof win.print !== "function") return false;
  const previousTitle = win.document.title;
  win.document.title = docFileBase(doc);
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
