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

/** Template B — refined serif name, accent rules, photo optional. */
export default function ModernProfessional({ cv }: TemplateProps) {
  const p = cv.personal;
  return (
    <div className="cv-doc tpl-modern">
      <header className="cv-header">
        <div className="cv-header-text">
          {p.fullName.trim() && <h1 className="cv-name">{p.fullName.trim()}</h1>}
          {p.title.trim() && <p className="cv-title">{p.title.trim()}</p>}
          <ContactItems cv={cv} />
        </div>
        {p.photo && (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL, must render in print
          <img className="cv-photo" src={p.photo} alt="" />
        )}
      </header>
      <SummarySection cv={cv} />
      <ExperienceSection cv={cv} />
      <ProjectsSection cv={cv} />
      <EducationSection cv={cv} />
      <SkillsSection cv={cv} variant="list" />
      <CertificationsSection cv={cv} />
    </div>
  );
}
