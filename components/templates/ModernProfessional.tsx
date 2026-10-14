import { CVSections, ContactItems, DocRoot, type HeaderProps, type TemplateOptions, type TemplateProps } from "./parts";

export const MODERN_CLASS = "tpl-modern";
export const MODERN_OPTIONS: TemplateOptions = { tags: "list", compactCertifications: false };

/** Serif name in the accent colour over an accent rule, photo on the right. Shared by CVs and cover letters. */
export function ModernHeader({ name, title, contact, photo }: HeaderProps) {
  const n = name.trim();
  const t = title.trim();
  return (
    <header className="cv-header">
      <div className="cv-header-text">
        {n && <h1 className="cv-name">{n}</h1>}
        {t && <p className="cv-title">{t}</p>}
        <ContactItems contact={contact} />
      </div>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- local data URL, must render in print
        <img className="cv-photo" src={photo} alt="" />
      )}
    </header>
  );
}

/** Template B — refined serif name, accent rules, photo optional. */
export default function ModernProfessional({ cv }: TemplateProps) {
  const p = cv.personal;
  return (
    <DocRoot templateClass={MODERN_CLASS} style={cv.meta.style}>
      <ModernHeader name={p.fullName} title={p.title} contact={p} photo={p.photo} />
      <CVSections cv={cv} options={MODERN_OPTIONS} />
    </DocRoot>
  );
}
