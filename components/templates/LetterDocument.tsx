import { CV_LABELS } from "@/lib/cv-format";
import { letterDateLine, letterParagraphs, type LetterData } from "@/lib/letter-schema";
import { templateFor } from "./index";
import { DocRoot } from "./parts";

/** Non-blank lines of a multi-line field, trimmed. */
function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * A cover letter in the look of its template: the template's header with the sender's
 * details, then date, recipient, subject, greeting, body, closing and signature in
 * business-letter order. Pure: same data in, same document out. Blank parts are left out.
 */
export function LetterDocument({ letter }: { letter: LetterData }) {
  const lang = letter.meta.language;
  const labels = CV_LABELS[lang] ?? CV_LABELS.en;
  const template = templateFor(letter.meta.template);
  const Header = template.header;
  const s = letter.sender;
  const r = letter.recipient;

  const dateLine = letterDateLine(letter);
  const recipient = [r.name.trim(), r.title.trim(), r.company.trim(), ...lines(r.address)].filter(Boolean);
  const subject = letter.subject.trim();
  const greeting = letter.greeting.trim();
  const paragraphs = letterParagraphs(letter.body);
  const closing = letter.closing.trim();
  const signature = letter.signature.trim();

  return (
    <div lang={lang}>
      <DocRoot templateClass={template.className} style={letter.meta.style} extraClass="cv-letter">
        <Header name={s.fullName} title={s.title} contact={s} />
        <div className="cv-letter-body">
          {dateLine && <p className="cv-letter-date">{dateLine}</p>}
          {recipient.length > 0 && <p className="cv-letter-recipient">{recipient.join("\n")}</p>}
          {subject && (
            <p className="cv-letter-subject">
              <span className="cv-letter-subject-label">{labels.subjectPrefix}</span> {subject}
            </p>
          )}
          {greeting && <p className="cv-letter-greeting">{greeting}</p>}
          {paragraphs.length > 0 && (
            <div className="cv-letter-text">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          {(closing || signature) && (
            <div className="cv-letter-signoff">
              {closing && <p className="cv-letter-closing">{closing}</p>}
              {signature && <p className="cv-letter-signature">{signature}</p>}
            </div>
          )}
        </div>
      </DocRoot>
    </div>
  );
}
