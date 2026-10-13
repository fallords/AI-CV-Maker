import type { ComponentType } from "react";
import type { CVData, TemplateId } from "@/lib/cv-schema";
import AtsMinimal, { ATS_CLASS, AtsHeader } from "./AtsMinimal";
import Graduate, { GRADUATE_CLASS, GraduateHeader } from "./Graduate";
import ModernProfessional, { MODERN_CLASS, ModernHeader } from "./ModernProfessional";
import type { HeaderProps } from "./parts";

export interface TemplateDefinition {
  /** Renders a whole CV. */
  component: ComponentType<{ cv: CVData }>;
  /** The template's header (name, title, contact details), reused by cover letters. */
  header: ComponentType<HeaderProps>;
  /** Class on the `.cv-doc` root that carries the template's look in app/globals.css. */
  className: string;
  showsPhoto: boolean;
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  "ats-minimal": { component: AtsMinimal, header: AtsHeader, className: ATS_CLASS, showsPhoto: false },
  "modern-professional": {
    component: ModernProfessional,
    header: ModernHeader,
    className: MODERN_CLASS,
    showsPhoto: true,
  },
  graduate: { component: Graduate, header: GraduateHeader, className: GRADUATE_CLASS, showsPhoto: true },
};

/** The template definition for an id, falling back to ATS Minimal for unknown ids. */
export function templateFor(id: TemplateId | string): TemplateDefinition {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, id) ? TEMPLATES[id as TemplateId] : TEMPLATES["ats-minimal"];
}

/** Renders the CV with its selected template. Pure: same data in, same document out. */
export function CVDocument({ cv }: { cv: CVData }) {
  const Template = templateFor(cv.meta.template).component;
  return (
    <div lang={cv.meta.cvLanguage}>
      <Template cv={cv} />
    </div>
  );
}
