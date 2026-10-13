import { CVSections, ContactItems, DocRoot, type HeaderProps, type TemplateOptions, type TemplateProps } from "./parts";

export const GRADUATE_CLASS = "tpl-graduate";
/** Skills, languages and interests as scannable tags; compact certifications. */
export const GRADUATE_OPTIONS: TemplateOptions = { tags: "chips", compactCertifications: true };

/** Tinted header band with an accent edge, photo on the left. Shared by CVs and cover letters. */
export function GraduateHeader({ name, title, contact, photo }: HeaderProps) {
  const n = name.trim();
  const t = title.trim();
  return (
    <header className="cv-header">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- local data URL, must render in print
        <img className="cv-photo" src={photo} alt="" />
      )}
      <div className="cv-header-text">
        {n && <h1 className="cv-name">{n}</h1>}
        {t && <p className="cv-title">{t}</p>}
        <ContactItems contact={contact} />
      </div>
    </header>
  );
}

/**
 * Template C — for students and graduates: education, projects and organisations come
 * first (template default order), skills are shown as scannable tags and certifications
 * are compact.
 */
export default function Graduate({ cv }: TemplateProps) {
  const p = cv.personal;
  return (
    <DocRoot templateClass={GRADUATE_CLASS} style={cv.meta.style}>
      <GraduateHeader name={p.fullName} title={p.title} contact={p} photo={p.photo} />
      <CVSections cv={cv} options={GRADUATE_OPTIONS} />
    </DocRoot>
  );
}
