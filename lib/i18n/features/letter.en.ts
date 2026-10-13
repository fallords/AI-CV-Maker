/**
 * English strings for the cover letter editor and preview.
 * Owned by the LETTER agent; `letter.id.ts` must provide the same shape. Wired into lib/i18n/en.ts as `t.letter`.
 *
 * Placeholders: {name} CV or person name, {date} formatted date, {prefix} the letter's "Subject:" label,
 * {count} a number, {limit} a word count, {from}/{to} language names from `content.languageNames`.
 */
const letter = {
  /** Accessible name of the letter preview (DocumentPreview). Keep. */
  previewLabel: "Cover letter preview",
  sender: {
    title: "Your details",
    intro: "Shown at the top of the letter.",
    fullName: "Full name",
    jobTitle: "Professional title",
    jobTitlePlaceholder: "e.g. Data Analyst",
    email: "Email",
    phone: "Phone number",
    city: "City",
    /** Shown under City when the letter is in Indonesian. */
    cityHintId: "Letters in Indonesian put this city before the date, for example “Bandung, 13 Oktober 2026”.",
    country: "Country",
    linkedin: "LinkedIn URL",
    website: "Portfolio / website URL",
  },
  fromCv: {
    label: "Fill in from a CV",
    hint: "Copies the name, title and contact details from the CV you choose. You can still edit them here.",
    button: "Fill in details",
    done: "Details copied from “{name}”.",
    failed: "That CV couldn’t be opened. It may have been deleted or damaged.",
    confirmTitle: "Replace your details?",
    confirmBody: "The details you’ve entered here will be replaced with the ones from “{name}”.",
    confirmReplace: "Replace",
    cancel: "Cancel",
  },
  recipient: {
    title: "Recipient",
    intro: "Who the letter is for. If you don’t know the person’s name, the company name is enough.",
    name: "Name",
    jobTitle: "Job title",
    jobTitlePlaceholder: "e.g. HR Manager",
    company: "Company or organisation",
    address: "Address",
    addressHint: "Optional. Put each part of the address on its own line.",
  },
  dateSubject: {
    title: "Date and subject",
    date: "Date",
    dateShown: "Shown on the letter as “{date}”.",
    dateEmpty: "No date will be shown on the letter.",
    today: "Use today’s date",
    subject: "Subject",
    subjectPlaceholder: "e.g. Application for the Data Analyst position",
    subjectHint: "Printed after “{prefix}”. Name the position, and add the job reference if the ad gives one.",
  },
  content: {
    title: "Letter",
    tipsTitle: "Writing tips",
    tips: [
      "Write a new letter for each job. Name the position and the company in the first paragraph.",
      "Pick two or three things from your CV that match the job ad and say briefly what you did. There’s no need to repeat the whole CV.",
      "Only mention results you can back up. If you have real numbers, use them. If not, describe what you did.",
      "Keep it to one page, and end by saying you’d welcome the chance to talk about the role.",
      "Before sending, check the company name, the recipient’s name and the position title.",
    ],
    greeting: "Greeting",
    greetingHint: "If you know the reader’s name, use it instead of a general greeting.",
    body: "Main text",
    bodyHint: "Leave a blank line between paragraphs.",
    paragraphOne: "1 paragraph",
    paragraphMany: "{count} paragraphs",
    wordOne: "1 word",
    wordMany: "{count} words",
    characterOne: "1 character",
    characterMany: "{count} characters",
    charactersLeft: "{count} characters left",
    tooLong: "Over {limit} words. Three or four short paragraphs, about 250 to 400 words, usually fit on one page.",
    closing: "Closing",
    signature: "Name under the closing",
    signatureHint: "Usually your full name.",
    useName: "Use “{name}”",
    languageMismatch: "The greeting or closing is still the {from} default, but the letter is in {to}.",
    useDefaults: "Use the {to} defaults",
    languageNames: { en: "English", id: "Indonesian" },
  },
  errors: {
    email: "Enter a valid email address, for example name@example.com.",
    url: "Enter a valid web address, for example linkedin.com/in/your-name.",
  },
};

export default letter;
