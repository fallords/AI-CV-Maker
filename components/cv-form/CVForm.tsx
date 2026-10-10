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

function FormCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 rounded-lg border border-stone-200 bg-white p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-title`} className="mb-4 text-base font-semibold text-stone-900">
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
    <div className="space-y-4">
      <nav aria-label={f.sectionNav} className="flex gap-1 overflow-x-auto pb-1">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-brand-300 hover:text-brand-800"
          >
            {s.title}
          </a>
        ))}
      </nav>
      {sections.map((s) => (
        <FormCard key={s.id} id={s.id} title={s.title}>
          {s.node}
        </FormCard>
      ))}
    </div>
  );
}
