"use client";

import { useId, useRef, useState, type Dispatch, type ReactNode, type RefObject } from "react";
import { CV_LABELS } from "@/lib/cv-format";
import { LANGUAGES, type CVData, type Language } from "@/lib/cv-schema";
import { isValidEmail, isValidUrl } from "@/lib/cv-validation";
import { fmt, useI18n } from "@/lib/i18n";
import type { LetterAction, LetterField } from "@/lib/letter-reducer";
import {
  LETTER_DEFAULTS,
  LETTER_SENDER_FIELDS,
  MAX_ADDRESS,
  MAX_BODY,
  letterDateLine,
  letterParagraphs,
  senderFromCV,
  todayIso,
  type LetterData,
  type LetterRecipient,
  type LetterSender,
} from "@/lib/letter-schema";
import { ConfirmDialog } from "../ui/Dialog";
import { TextAreaField, TextField } from "../ui/Field";
import { btn, inputClass, selectClass } from "../ui/styles";

/** Longest body the letter keeps (the cap `sanitizeLetter` applies). */
export const LETTER_BODY_MAX = MAX_BODY;
/** Above this many words the editor suggests trimming the letter. */
export const LONG_LETTER_WORDS = 400;
/** The remaining-characters note appears when this few characters are left. */
const NEAR_LIMIT = 1_000;

/** Element ids of the form's sections, so other views can link or jump to them. */
export const LETTER_SECTION_IDS = {
  sender: "letter-sender",
  recipient: "letter-recipient",
  date: "letter-date",
  content: "letter-content",
} as const;

export interface LetterFormProps {
  letter: LetterData;
  dispatch: Dispatch<LetterAction>;
  /** CVs stored on this device that sender details can be copied from (may be empty). */
  cvOptions: { id: string; name: string }[];
  /** Loads one of `cvOptions`; null when it is missing or can't be read. */
  loadCV: (id: string) => CVData | null;
}

/** Paragraph, word and character counts of a letter body (paragraphs as the templates split them). */
export function bodyStats(body: string): { paragraphs: number; words: number; characters: number } {
  const trimmed = body.trim();
  return {
    paragraphs: letterParagraphs(body).length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    characters: body.length,
  };
}

type DefaultField = "greeting" | "closing";

/**
 * Greeting/closing fields that still hold another language's default text (e.g. "Dear Hiring
 * Manager," in a letter switched to Indonesian), with the language they came from.
 */
export function foreignDefaults(letter: LetterData): { from: Language; fields: DefaultField[] } | null {
  const own = letter.meta.language;
  for (const other of LANGUAGES) {
    if (other === own) continue;
    const fields = (["greeting", "closing"] as const).filter(
      (f) => letter[f].trim() === LETTER_DEFAULTS[other][f] && LETTER_DEFAULTS[other][f] !== LETTER_DEFAULTS[own][f],
    );
    if (fields.length > 0) return { from: other, fields };
  }
  return null;
}

/** Focus the first text control inside a wrapper (for buttons that remove themselves when used). */
function focusControlIn(ref: RefObject<HTMLElement | null>) {
  ref.current?.querySelector<HTMLElement>("input, textarea")?.focus();
}

/** One form section: a group headed by an H2 and set apart by space, like the CV form. */
function LetterSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 pb-8 not-first:pt-4">
      <h2 id={`${id}-title`} className="mb-5 font-display text-[21px] leading-tight font-semibold text-fg">
        {title}
      </h2>
      {intro && <p className="-mt-3 mb-5 max-w-[65ch] text-sm text-fg-muted">{intro}</p>}
      {children}
    </section>
  );
}

type Copied = { name: string; sender: LetterSender };

/** "Fill in from a CV": copies a CV's personal details into the sender, asking first if that would overwrite input. */
function FillFromCV({ letter, dispatch, cvOptions, loadCV }: LetterFormProps) {
  const { t } = useI18n();
  const f = t.letter.fromCv;
  const id = useId();
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState<Copied | null>(null);
  const [result, setResult] = useState<{ ok: true; copied: Copied } | { ok: false } | null>(null);

  const current = cvOptions.some((o) => o.id === selected) ? selected : (cvOptions[0]?.id ?? "");

  const apply = (next: Copied) => {
    dispatch({ type: "setSender", patch: next.sender });
    // The signature follows the sender's name unless the user wrote something else there.
    const signature = letter.signature.trim();
    if (next.sender.fullName.trim() && (!signature || signature === letter.sender.fullName.trim())) {
      dispatch({ type: "setField", field: "signature", value: next.sender.fullName });
    }
    setResult({ ok: true, copied: next });
  };

  const fill = () => {
    const option = cvOptions.find((o) => o.id === current);
    let cv: CVData | null = null;
    try {
      cv = option ? loadCV(option.id) : null;
    } catch {
      cv = null;
    }
    if (!option || !cv) {
      setResult({ ok: false });
      return;
    }
    const next: Copied = { name: option.name, sender: senderFromCV(cv) };
    const overwrites = LETTER_SENDER_FIELDS.some(
      (k) => letter.sender[k].trim() !== "" && letter.sender[k] !== next.sender[k],
    );
    if (overwrites) setPending(next);
    else apply(next);
  };

  // The confirmation stays visible only while the sender still matches what was copied.
  const copied =
    result?.ok && LETTER_SENDER_FIELDS.every((k) => letter.sender[k] === result.copied.sender[k])
      ? result.copied
      : null;

  return (
    <div className="mb-6 max-w-xl">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg">
        {f.label}
      </label>
      <div className="flex gap-2">
        <select
          id={id}
          value={current}
          onChange={(e) => {
            setSelected(e.target.value);
            setResult(null);
          }}
          aria-describedby={`${id}-hint`}
          className={`${selectClass} min-w-0 flex-1`}
        >
          {cvOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button type="button" className={`${btn.secondary} shrink-0`} onClick={fill}>
          {f.button}
        </button>
      </div>
      <p id={`${id}-hint`} className="mt-1 text-sm text-fg-muted">
        {f.hint}
      </p>
      <div role="status">
        {copied && <p className="mt-2 text-sm break-words text-fg-muted">{fmt(f.done, { name: copied.name })}</p>}
      </div>
      {result && !result.ok && (
        <p className="mt-2 text-sm font-medium text-danger-text" role="alert">
          {f.failed}
        </p>
      )}
      <ConfirmDialog
        open={pending !== null}
        title={f.confirmTitle}
        body={pending ? fmt(f.confirmBody, { name: pending.name }) : ""}
        confirmLabel={f.confirmReplace}
        cancelLabel={f.cancel}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) apply(pending);
          setPending(null);
        }}
      />
    </div>
  );
}

function DateField({ letter, onChange }: { letter: LetterData; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const d = t.letter.dateSubject;
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const today = todayIso();
  const shown = letterDateLine(letter);
  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg">
        {d.date}
      </label>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          ref={inputRef}
          id={id}
          type="date"
          value={letter.date}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-hint`}
          className={`${inputClass} sm:w-52`}
        />
        {letter.date !== today && (
          <button
            type="button"
            className={btn.secondary}
            onClick={() => {
              onChange(today);
              // The button goes away once the date is today; keep focus on the field.
              inputRef.current?.focus();
            }}
          >
            {d.today}
          </button>
        )}
      </div>
      <p id={`${id}-hint`} className="mt-1 text-sm text-fg-muted">
        {shown ? fmt(d.dateShown, { date: shown }) : d.dateEmpty}
      </p>
    </div>
  );
}

function BodyField({
  value,
  language,
  onChange,
}: {
  value: string;
  language: Language;
  onChange: (value: string) => void;
}) {
  const { t, lang } = useI18n();
  const c = t.letter.content;
  const id = useId();
  const stats = bodyStats(value);
  const nf = new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-GB");
  const count = (n: number, one: string, many: string) => (n === 1 ? one : fmt(many, { count: nf.format(n) }));
  const left = LETTER_BODY_MAX - stats.characters;
  const tooLong = stats.words > LONG_LETTER_WORDS;

  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg">
        {c.body}
      </label>
      <p id={`${id}-hint`} className="mb-2 text-sm text-fg-muted">
        {c.bodyHint}
      </p>
      <textarea
        id={id}
        value={value}
        rows={14}
        lang={language}
        maxLength={LETTER_BODY_MAX}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-hint ${id}-count`}
        className={`${inputClass} resize-y leading-relaxed`}
      />
      {/* Not a live region: a count that changes on every keystroke would be noise. It is read with the field. */}
      <p
        id={`${id}-count`}
        data-testid="letter-body-count"
        className="mt-1 flex flex-wrap justify-between gap-x-4 text-sm text-fg-muted tabular-nums"
      >
        <span>
          {[
            count(stats.paragraphs, c.paragraphOne, c.paragraphMany),
            count(stats.words, c.wordOne, c.wordMany),
            count(stats.characters, c.characterOne, c.characterMany),
          ].join(", ")}
        </span>{" "}
        {left <= NEAR_LIMIT && <span>{fmt(c.charactersLeft, { count: nf.format(left) })}</span>}
      </p>
      <div role="status">
        {tooLong && <p className="mt-1 text-sm text-warn-text">{fmt(c.tooLong, { limit: LONG_LETTER_WORDS })}</p>}
      </div>
    </div>
  );
}

/**
 * The cover letter editor: sender (optionally copied from a CV), recipient, date and
 * subject, then greeting, main text, closing and signature, with short writing tips.
 * Labels follow the UI language; placeholders for greeting/closing and the date preview
 * follow the letter's own language.
 */
export function LetterForm(props: LetterFormProps) {
  const { letter, dispatch, cvOptions } = props;
  const { t } = useI18n();
  const l = t.letter;
  const s = letter.sender;
  const r = letter.recipient;
  const language = letter.meta.language;
  const defaults = LETTER_DEFAULTS[language] ?? LETTER_DEFAULTS.en;
  const labels = CV_LABELS[language] ?? CV_LABELS.en;

  const greetingRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef<HTMLDivElement>(null);

  const setSender = (patch: Partial<LetterSender>) => dispatch({ type: "setSender", patch });
  const setRecipient = (patch: Partial<LetterRecipient>) => dispatch({ type: "setRecipient", patch });
  const setField = (field: LetterField, value: string) => dispatch({ type: "setField", field, value });

  const emailError = s.email.trim() && !isValidEmail(s.email) ? l.errors.email : null;
  const urlError = (v: string) => (v.trim() && !isValidUrl(v) ? l.errors.url : null);

  const mismatch = foreignDefaults(letter);
  const senderName = s.fullName.trim();
  const canUseName = senderName !== "" && letter.signature.trim() !== senderName;

  return (
    <div>
      <LetterSection id={LETTER_SECTION_IDS.sender} title={l.sender.title} intro={l.sender.intro}>
        {cvOptions.length > 0 && <FillFromCV {...props} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            label={l.sender.fullName}
            value={s.fullName}
            onChange={(v) => setSender({ fullName: v })}
            autoComplete="name"
          />
          <TextField
            className="sm:col-span-2"
            label={l.sender.jobTitle}
            value={s.title}
            placeholder={l.sender.jobTitlePlaceholder}
            onChange={(v) => setSender({ title: v })}
            autoComplete="organization-title"
          />
          <TextField
            label={l.sender.email}
            type="email"
            inputMode="email"
            value={s.email}
            onChange={(v) => setSender({ email: v })}
            autoComplete="email"
            error={emailError}
          />
          <TextField
            label={l.sender.phone}
            type="tel"
            inputMode="tel"
            value={s.phone}
            onChange={(v) => setSender({ phone: v })}
            autoComplete="tel"
          />
          <TextField
            label={l.sender.city}
            value={s.city}
            hint={language === "id" ? l.sender.cityHintId : undefined}
            onChange={(v) => setSender({ city: v })}
            autoComplete="address-level2"
          />
          <TextField
            label={l.sender.country}
            value={s.country}
            onChange={(v) => setSender({ country: v })}
            autoComplete="country-name"
          />
          <TextField
            label={l.sender.linkedin}
            type="url"
            inputMode="url"
            value={s.linkedin}
            placeholder="linkedin.com/in/…"
            onChange={(v) => setSender({ linkedin: v })}
            error={urlError(s.linkedin)}
          />
          <TextField
            label={l.sender.website}
            type="url"
            inputMode="url"
            value={s.website}
            onChange={(v) => setSender({ website: v })}
            autoComplete="url"
            error={urlError(s.website)}
          />
        </div>
      </LetterSection>

      <LetterSection id={LETTER_SECTION_IDS.recipient} title={l.recipient.title} intro={l.recipient.intro}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={l.recipient.name}
            value={r.name}
            onChange={(v) => setRecipient({ name: v })}
            autoComplete="off"
          />
          <TextField
            label={l.recipient.jobTitle}
            value={r.title}
            placeholder={l.recipient.jobTitlePlaceholder}
            onChange={(v) => setRecipient({ title: v })}
            autoComplete="off"
          />
          <TextField
            className="sm:col-span-2"
            label={l.recipient.company}
            value={r.company}
            onChange={(v) => setRecipient({ company: v })}
            autoComplete="off"
          />
          <TextAreaField
            className="sm:col-span-2"
            label={l.recipient.address}
            hint={l.recipient.addressHint}
            value={r.address}
            rows={3}
            maxLength={MAX_ADDRESS}
            onChange={(v) => setRecipient({ address: v })}
          />
        </div>
      </LetterSection>

      <LetterSection id={LETTER_SECTION_IDS.date} title={l.dateSubject.title}>
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField letter={letter} onChange={(v) => setField("date", v)} />
          <TextField
            className="sm:col-span-2"
            label={l.dateSubject.subject}
            value={letter.subject}
            placeholder={l.dateSubject.subjectPlaceholder}
            hint={fmt(l.dateSubject.subjectHint, { prefix: labels.subjectPrefix })}
            onChange={(v) => setField("subject", v)}
            autoComplete="off"
          />
        </div>
      </LetterSection>

      <LetterSection id={LETTER_SECTION_IDS.content} title={l.content.title}>
        <div className="mb-6 max-w-[65ch]">
          <h3 className="text-sm font-medium text-fg">{l.content.tipsTitle}</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-fg-body marker:text-fg-subtle">
            {l.content.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>

        <div role="status">
          {mismatch && (
            <p className="mb-2 max-w-[65ch] text-sm text-fg-body">
              {fmt(l.content.languageMismatch, {
                from: l.content.languageNames[mismatch.from],
                to: l.content.languageNames[language],
              })}
            </p>
          )}
        </div>
        {mismatch && (
          <button
            type="button"
            className={`${btn.secondary} mb-5`}
            onClick={() => {
              for (const field of mismatch.fields) setField(field, defaults[field]);
              focusControlIn(greetingRef);
            }}
          >
            {fmt(l.content.useDefaults, { to: l.content.languageNames[language] })}
          </button>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div ref={greetingRef} className="sm:col-span-2">
            <TextField
              label={l.content.greeting}
              value={letter.greeting}
              placeholder={defaults.greeting}
              hint={l.content.greetingHint}
              onChange={(v) => setField("greeting", v)}
              autoComplete="off"
            />
          </div>
          <BodyField value={letter.body} language={language} onChange={(v) => setField("body", v)} />
          <TextField
            label={l.content.closing}
            value={letter.closing}
            placeholder={defaults.closing}
            onChange={(v) => setField("closing", v)}
            autoComplete="off"
          />
          <div ref={signatureRef} className="min-w-0">
            <TextField
              label={l.content.signature}
              value={letter.signature}
              hint={l.content.signatureHint}
              onChange={(v) => setField("signature", v)}
              autoComplete="off"
            />
            {canUseName && (
              <button
                type="button"
                className={`${btn.secondary} mt-2 max-w-full`}
                onClick={() => {
                  setField("signature", s.fullName.trim());
                  focusControlIn(signatureRef);
                }}
              >
                <span className="min-w-0 truncate">{fmt(l.content.useName, { name: senderName })}</span>
              </button>
            )}
          </div>
        </div>
      </LetterSection>
    </div>
  );
}
