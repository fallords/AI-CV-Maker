"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import {
  CertificationsSection,
  EducationSection,
  ExperienceSection,
  ProjectsSection,
  SkillsSection,
} from "./ListSections";
import { PersonalSection } from "./PersonalSection";
import { SummarySection } from "./SummarySection";
import type { SectionProps } from "./types";

/** One form section: a rule-separated group (no boxed card), headed by an H2. */
function FormSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-32 border-t border-line pt-6 pb-8 first-of-type:border-t-0"
    >
      <h2 id={`${id}-title`} className="mb-5 font-display text-lg font-semibold text-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CVForm(props: SectionProps) {
  const { t } = useI18n();
  const f = t.form;
  const sections = [
    { id: "personal", title: f.personal.title, node: <PersonalSection {...props} /> },
    { id: "summary", title: f.summary.title, node: <SummarySection {...props} /> },
    { id: "experience", title: f.experience.title, node: <ExperienceSection {...props} /> },
    { id: "education", title: f.education.title, node: <EducationSection {...props} /> },
    { id: "projects", title: f.projects.title, node: <ProjectsSection {...props} /> },
    { id: "skills", title: f.skills.title, node: <SkillsSection {...props} /> },
    { id: "certifications", title: f.certifications.title, node: <CertificationsSection {...props} /> },
  ];
  return (
    <div>
      <nav aria-label={f.sectionNav} className="border-b border-line">
        <div className="flex gap-x-5 overflow-x-auto p-1 pr-8 [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="shrink-0 py-2 text-sm text-fg-muted hover:text-fg">
              {s.title}
            </a>
          ))}
        </div>
      </nav>
      {sections.map((s) => (
        <FormSection key={s.id} id={s.id} title={s.title}>
          {s.node}
        </FormSection>
      ))}
    </div>
  );
}
