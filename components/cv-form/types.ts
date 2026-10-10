import type { Dispatch } from "react";
import type { CVAction } from "@/lib/cv-reducer";
import type { CVData } from "@/lib/cv-schema";

export interface SectionProps {
  cv: CVData;
  dispatch: Dispatch<CVAction>;
}
