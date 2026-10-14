"use client";

import { useMemo } from "react";
import type { CVData } from "@/lib/cv-schema";
import type { AnyDoc } from "@/lib/documents";
import { DocumentPreview } from "./DocumentPreview";

/** Live, scaled A4 preview of a CV. Thin wrapper around DocumentPreview, kept for existing callers. */
export function CVPreview({ cv, onPagesChange }: { cv: CVData; onPagesChange?: (pages: number) => void }) {
  const doc = useMemo<AnyDoc>(() => ({ kind: "cv", data: cv }), [cv]);
  return <DocumentPreview doc={doc} onPagesChange={onPagesChange} />;
}
