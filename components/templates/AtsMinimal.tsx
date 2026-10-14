import { CVSections, ContactItems, DocRoot, type HeaderProps, type TemplateOptions, type TemplateProps } from "./parts";

export const ATS_CLASS = "tpl-ats";
export const ATS_OPTIONS: TemplateOptions = { tags: "list", compactCertifications: false };

/** Name, title and contact details; no photo or decoration. Shared by CVs and cover letters. */
export function AtsHeader({ name, title, contact }: HeaderProps) {
  const n = name.trim();
  const t = title.trim();
  if (!n && !t) return <ContactItems contact={contact} />;
  return (
    <header className="cv-header">
      {n && <h1 className="cv-name">{n}</h1>}
      {t && <p className="cv-title">{t}</p>}
      <ContactItems contact={contact} />
    </header>
  );
}

/** Template A — single column, standard headings, no photo or decoration. */
export default function AtsMinimal({ cv }: TemplateProps) {
  const p = cv.personal;
  return (
    <DocRoot templateClass={ATS_CLASS} style={cv.meta.style}>
      <AtsHeader name={p.fullName} title={p.title} contact={p} />
      <CVSections cv={cv} options={ATS_OPTIONS} />
    </DocRoot>
  );
}
