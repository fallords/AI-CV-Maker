import type { AnyDoc } from "@/lib/documents";
import { CVDocument } from "./index";
import { LetterDocument } from "./LetterDocument";

/** Renders any document (CV or cover letter) with its template. Pure. */
export function DocumentView({ doc }: { doc: AnyDoc }) {
  return doc.kind === "cv" ? <CVDocument cv={doc.data} /> : <LetterDocument letter={doc.data} />;
}
