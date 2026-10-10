import type { ComponentType } from "react";
import type { CVData, TemplateId } from "@/lib/cv-schema";
import AtsMinimal from "./AtsMinimal";
import Graduate from "./Graduate";
import ModernProfessional from "./ModernProfessional";

export const TEMPLATES: Record<TemplateId, { component: ComponentType<{ cv: CVData }>; showsPhoto: boolean }> = {
  "ats-minimal": { component: AtsMinimal, showsPhoto: false },
  "modern-professional": { component: ModernProfessional, showsPhoto: true },
  graduate: { component: Graduate, showsPhoto: true },
};

/** Renders the CV with its selected template. Pure: same data in, same document out. */
export function CVDocument({ cv }: { cv: CVData }) {
  const Template = (TEMPLATES[cv.meta.template] ?? TEMPLATES["ats-minimal"]).component;
  return (
    <div lang={cv.meta.cvLanguage}>
      <Template cv={cv} />
    </div>
  );
}
