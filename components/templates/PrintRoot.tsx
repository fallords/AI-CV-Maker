import type { AnyDoc } from "@/lib/documents";
import { DocumentView } from "./DocumentView";
import { pageMarginY } from "./style";

/** The @page rule for a document: A4 with the style's top/bottom margin (left/right come from the sheet's padding). */
export function pageRule(doc: AnyDoc): string {
  return `@page{size:A4;margin:${pageMarginY(doc.data.meta.style)}mm 0}`;
}

/**
 * Print-only copy of the document: hidden on screen, the only thing that appears in
 * the PDF (see the print rules in app/globals.css). The inline @page rule comes after
 * the stylesheet's default, so it sets the page margin for this document's style.
 */
export function PrintRoot({ doc }: { doc: AnyDoc }) {
  return (
    <>
      <style>{pageRule(doc)}</style>
      <div id="cv-print-root" className="hidden">
        <DocumentView doc={doc} />
      </div>
    </>
  );
}
