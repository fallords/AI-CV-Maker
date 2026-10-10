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

/**
 * Template C — for students and graduates: education and projects come first,
 * skills are shown as scannable tags and certifications are compact.
 */
export default function Graduate({ cv }: TemplateProps) {
  const p = cv.personal;
  return (
    <div className="cv-doc tpl-graduate">
      <header className="cv-header">
        {p.photo && (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL, must render in print
          <img className="cv-photo" src={p.photo} alt="" />
        )}
        <div className="cv-header-text">
          {p.fullName.trim() && <h1 className="cv-name">{p.fullName.trim()}</h1>}
          {p.title.trim() && <p className="cv-title">{p.title.trim()}</p>}
          <ContactItems cv={cv} />
        </div>
      </header>
      <SummarySection cv={cv} />
      <EducationSection cv={cv} />
      <ProjectsSection cv={cv} />
      <SkillsSection cv={cv} variant="chips" />
      <CertificationsSection cv={cv} compact />
      <ExperienceSection cv={cv} />
    </div>
  );
}
