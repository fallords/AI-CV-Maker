import {
  CertificationsSection,
  ContactItems,
  EducationSection,
  ExperienceSection,
  ProjectsSection,
  SkillsSection,
  SummarySection,
  type TemplateProps,
} from "./parts";

/** Template A — single column, standard headings, no photo or decoration. */
export default function AtsMinimal({ cv }: TemplateProps) {
  const p = cv.personal;
  return (
    <div className="cv-doc tpl-ats">
      {(p.fullName.trim() || p.title.trim()) && (
        <header className="cv-header">
          {p.fullName.trim() && <h1 className="cv-name">{p.fullName.trim()}</h1>}
          {p.title.trim() && <p className="cv-title">{p.title.trim()}</p>}
          <ContactItems cv={cv} />
        </header>
      )}
      {!p.fullName.trim() && !p.title.trim() && <ContactItems cv={cv} />}
      <SummarySection cv={cv} />
      <ExperienceSection cv={cv} />
      <EducationSection cv={cv} />
      <ProjectsSection cv={cv} />
      <SkillsSection cv={cv} variant="list" />
      <CertificationsSection cv={cv} />
    </div>
  );
}
