import checks from "./features/checks.en";
import design from "./features/design.en";
import docs from "./features/docs.en";
import exporting from "./features/exporting.en";
import letter from "./features/letter.en";
import sections from "./features/sections.en";

/** English interface strings. `id.ts` must provide the same shape (enforced by the type). */
const en = {
  appName: "Free AI CV Maker",
  nav: {
    home: "Home",
    builder: "CV Builder",
    help: "Help",
    privacy: "Privacy",
    language: "Interface language",
    skip: "Skip to main content",
    menu: "Main navigation",
  },
  landing: {
    title: "Write your CV in the browser and download it as a PDF",
    subtitle:
      "As you fill in the form, the preview lays out your CV on A4 pages. The Check tab points out missing details and common problems. When it looks right, download it as a PDF, a Word file or plain text.",
    ctaPrimary: "Create Your Free CV",
    ctaSecondary: "See the templates",
    ctaContinue: "Continue with your saved documents",
    facts: [
      { label: "Price", value: "The builder and every download format are free. There are no ads or paid plans." },
      { label: "Account", value: "You don’t need one." },
      {
        label: "Your documents",
        value:
          "Kept in this browser’s local storage, on your device. You can have several CVs and cover letters, and none of them are uploaded to a server.",
      },
      {
        label: "Downloads",
        value: "A4 PDF with selectable text and no watermark. You can also download a Word file (.docx) or plain text.",
      },
    ],
    templatesTitle: "Templates",
    templatesBody:
      "You can switch templates at any time in the builder, and your details carry over. In the Design tab you can also change the accent colour, font, text size, spacing and margins. Cover letters use the same templates, so a letter can match its CV.",
    privacyTitle: "Privacy",
    privacyBody:
      "There are no accounts and no analytics. The privacy notice lists exactly what’s kept in your browser and how to delete it.",
    privacyLink: "Read the privacy notice",
    faqTitle: "Common questions",
    faq: [
      {
        q: "Can I write a cover letter here too?",
        a: "Yes. Open “Your documents” and choose “New cover letter”. You can copy your name and contact details from one of your CVs, and the letter then uses that CV’s template and design, so the two match. A letter downloads in the same formats as a CV.",
      },
      {
        q: "Can I lose my documents?",
        a: "Yes, if you clear your browsing data or work in a private (incognito) window. They also won’t be on another device. To keep a copy, click the arrow next to “Download PDF” and choose “JSON backup”. To load it again, use “Import file” in “Your documents”.",
      },
      {
        q: "Can the CV be in Indonesian?",
        a: "Yes. Set “CV language” to Indonesian and the section headings and month names switch to Indonesian. Your own text isn’t translated, so write it in the language you want. Cover letters have the same setting, called “Letter language”.",
      },
      {
        q: "Will applicant tracking systems (ATS) read my CV?",
        a: "Use the ATS Minimal template. It has a single column and standard section headings, and the PDF contains real text rather than an image. Most systems read that well, though each ATS works a little differently. If an application form asks you to paste your CV, the plain text download has the same content without formatting.",
      },
    ],
    /** Rendered after `faq`; `on` or `off` depending on whether AI is configured for this deployment. */
    aiFaq: {
      q: "Why is “AI” in the name?",
      on: "Under the summary field there’s a button that asks an AI service to suggest a rewrite of your summary. Before anything is sent, it shows you the exact text and asks for your permission. Everything else works without it.",
      off: "Because the builder can include an AI helper that suggests a rewrite of your summary. It isn’t switched on here, so nothing you type is sent to an AI service, and everything in the builder works without it.",
    },
  },
  footer: {
    contact: "Contact",
    rights: "Free AI CV Maker",
  },
  templates: {
    "ats-minimal": {
      name: "ATS Minimal",
      description: "For job portals and online application forms. It has one column and no photo.",
    },
    "modern-professional": {
      name: "Modern Professional",
      description: "For applications you send by email or hand over in person. It has an accent colour and room for a photo.",
    },
    graduate: {
      name: "Graduate / Student",
      description:
        "For students and recent graduates. Education and projects come before work experience, and skills are shown as tags.",
    },
  },
  builder: {
    title: "CV Builder",
    loading: "Loading your draft…",
    template: "Template",
    cvLanguage: "CV language",
    cvLanguageHint: "Sets the language of the CV’s headings and dates. Your own text isn’t translated.",
    languageNames: { en: "English", id: "Indonesian" },
    tabs: { edit: "Edit", preview: "Preview" },
    saveNow: "Save draft",
    downloadPdf: "Download PDF",
    more: "More",
    dismiss: "Dismiss",
    status: {
      saved: "Saved on this device",
      unsaved: "Unsaved changes…",
    },
    messages: {
      saved: "Draft saved on this device.",
      recovered: "Your draft was restored from this browser.",
    },
    print: {
      title: "Download your CV as PDF",
      intro: "Your browser’s print dialog opens next. For a clean A4 PDF:",
      steps: [
        "Set Destination (or Printer) to “Save as PDF”.",
        "Set Paper size to A4 and Margins to “Default”.",
        "Turn off “Headers and footers”.",
        "Turn on “Background graphics” so the template colours are printed.",
      ],
      note: "The text in the PDF can be selected and copied. No watermark is added.",
      dontShow: "Don’t show these instructions again",
      continue: "Open print dialog",
      cancel: "Cancel",
      unavailable: "Printing isn’t available in this browser. Try Chrome, Edge, Firefox or Safari.",
    },
    preview: {
      label: "CV preview",
      empty: "The preview appears here as you fill in the form.",
      pageGuide: "Approximate page break",
      pageOne: "1 page",
      pageMany: "{count} pages",
      atsPhotoNote: "The ATS Minimal template doesn’t show a photo.",
    },
  },
  form: {
    sectionNav: "CV sections",
    optional: "optional",
    personal: {
      title: "Personal information",
      fullName: "Full name",
      jobTitle: "Professional title",
      jobTitlePlaceholder: "e.g. Data Analyst",
      email: "Email",
      phone: "Phone number",
      city: "City",
      country: "Country",
      linkedin: "LinkedIn URL",
      website: "Portfolio / website URL",
      photo: "Profile photo",
      photoHint: "Many employers outside Indonesia prefer CVs without a photo. In Indonesia a photo is common.",
      photoUpload: "Upload photo",
      photoChange: "Change photo",
      photoRemove: "Remove photo",
      photoError: "Choose a PNG, JPEG or WebP image smaller than 10 MB.",
      photoAlt: "Profile photo preview",
    },
    summary: {
      title: "Professional summary",
      label: "Summary",
      placeholder: "Two to four sentences on your experience, your strengths and the kind of role you want.",
      guidance: "{count} characters. Around 300 to 600 works well.",
      tooLong: "{count} characters. Consider shortening it so it stays easy to read.",
    },
    experience: {
      title: "Work experience",
      add: "Add work experience",
      item: "Experience",
      jobTitle: "Job title",
      company: "Company",
      location: "Location",
      startDate: "Start date",
      endDate: "End date",
      current: "I currently work here",
      description: "Responsibilities and achievements",
      descriptionHint: "One point per line. Start a line with “-” to make it a bullet point.",
      empty: "No work experience yet. If it doesn’t apply to you, leave it empty and it won’t appear on the CV.",
    },
    education: {
      title: "Education",
      add: "Add education",
      item: "Education",
      institution: "Institution",
      degree: "Degree",
      field: "Field of study",
      startDate: "Start date",
      endDate: "End date (or expected)",
      description: "Description",
      descriptionHint: "Optional: GPA, honours, thesis or relevant courses.",
      empty: "No education added yet.",
    },
    projects: {
      title: "Projects",
      add: "Add project",
      item: "Project",
      name: "Project name",
      role: "Your role",
      description: "Description and achievements",
      descriptionHint: "One point per line. Start a line with “-” to make it a bullet point.",
      technologies: "Technologies",
      technologiesPlaceholder: "e.g. React, Python, Figma",
      url: "Project URL",
      empty: "No projects added yet.",
    },
    skills: {
      title: "Skills",
      technical: "Technical skills",
      soft: "Soft skills",
      addTechnical: "Add technical skill",
      addSoft: "Add soft skill",
      item: "Skill",
      name: "Skill",
      level: "Proficiency (optional)",
      levels: { "": "No label", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", expert: "Expert" },
      emptyTechnical: "No technical skills added yet.",
      emptySoft: "No soft skills added yet.",
    },
    certifications: {
      title: "Certifications",
      add: "Add certification",
      item: "Certification",
      name: "Certification name",
      issuer: "Issuing organisation",
      issueDate: "Issue date",
      credential: "Credential URL or ID",
      empty: "No certifications added yet.",
    },
    itemControls: {
      moveUp: "Move up",
      moveDown: "Move down",
      remove: "Remove",
      untitled: "Untitled",
      removeTitle: "Remove this entry?",
      removeBody: "This entry and everything in it will be removed from your CV.",
      cancel: "Cancel",
    },
    errors: {
      email: "Enter a valid email address, for example name@example.com.",
      url: "Enter a valid web address, for example linkedin.com/in/your-name.",
      dateOrder: "The end date is before the start date.",
    },
    monthHint: "Month and year",
    month: "Month",
    year: "Year",
    noMonth: "No month",
  },
  ai: {
    sectionTitle: "AI writing help",
    disabled: "AI features are off. Everything in the builder works without them.",
    rewrite: "Suggest an improved summary (AI)",
    consentTitle: "Send this text to an AI service?",
    consentBody:
      "Only the summary text below will be sent. It goes to the AI service set up by the operator of this website, which may process and store it under its own policies.",
    consentCheckbox: "I agree to send this text for this request.",
    send: "Send",
    cancel: "Cancel",
    working: "Waiting for the AI service…",
    reviewTitle: "Review the suggestion",
    reviewWarning:
      "AI suggestions may contain errors or made-up details. Read every word and keep only what’s true.",
    original: "Your text",
    suggestion: "Suggestion",
    apply: "Replace my summary",
    discard: "Discard",
    error: "The AI service could not be reached. Your text hasn’t been changed.",
    empty: "Write a summary first.",
  },
  help: {
    title: "How to use the CV builder",
    intro: "Instructions for writing CVs and cover letters in the builder, including the print settings for each browser.",
    sections: [
      {
        title: "Fill in your CV",
        body: [
          "Open the CV Builder and fill in the sections that apply to you. Every field is optional, and empty sections are left out of the CV.",
          "Besides work experience, education, projects, skills and certifications, there are sections for organizations and volunteering, awards, languages, references and interests. For anything else, such as courses or publications, use “Add custom section” and give it your own title.",
          "Use the “Add …” buttons to add entries and the arrow buttons to change their order. Most people put the most recent entry first.",
          "In description fields, write one point per line. A line that starts with “-” becomes a bullet point.",
        ],
      },
      {
        title: "Template and CV language",
        body: [
          "You can switch between ATS Minimal, Modern Professional and Graduate / Student at any time. Your content stays the same.",
          "“CV language” sets the language of the CV’s headings and month names (English or Indonesian). Your own text isn’t translated.",
        ],
      },
      {
        title: "Your documents",
        body: [
          "You can keep several CVs and cover letters in this browser. At the start of the toolbar, under “Document”, is the name of the one you have open. Click it to open “Your documents”, where you can open, rename, duplicate or delete any of them, start a new CV or cover letter, or import a file. The “More” menu has Rename, Duplicate and Delete for the open document.",
          "Each document is saved in this browser automatically, a moment after each change, and also when you click “Save draft”.",
          "Duplicating a CV is a quick way to make a version for a different kind of job. “Import file” adds a JSON backup as a new document, so nothing you already have is replaced. Deleting a document removes it from this browser for good.",
          "If you used the builder before it could hold several documents, your draft and any previous draft are now in “Your documents”.",
          "Browser storage isn’t a backup. If you clear browser data, use a private window or switch to another device, your documents won’t be there. Download a JSON backup of anything you want to keep.",
        ],
      },
      {
        title: "Changing the design",
        body: [
          "The Design tab, next to Content, changes how the open document looks: accent colour, font, text size, spacing and page margins. The settings apply to that document only, and the preview updates straight away. “Reset appearance” goes back to the template’s defaults.",
          "If you pick your own accent colour, the panel warns you when it’s too light to read on white paper.",
          "For a CV, the Design tab also lists its sections. Move a section up or down to change where it appears on the CV, or turn off “Show” to leave it off the CV without deleting what you wrote. “Reset to template order” puts them back in the template’s order. Your name and contact details always come first.",
        ],
      },
      {
        title: "Checking your CV",
        body: [
          "The Check tab gives your CV a score out of 100 and lists errors, warnings and tips. It looks for things like missing contact details, entries without dates, an end date before the start date, a very short or very long summary, and a CV that runs over two pages.",
          "Click a finding to go straight to the field or setting it refers to.",
          "The checks run in your browser and don’t use AI. They can spot missing details and common problems, but they can’t judge how strong your experience is. If a tip suggests adding numbers or more sections, only add what’s true.",
        ],
      },
      {
        title: "Cover letters",
        body: [
          "To start a letter, open “Your documents” and choose “New cover letter”. You can copy your name, title and contact details from one of your CVs, and the letter then uses that CV’s template and design. Later, “Fill in from a CV” in the letter copies the details again.",
          "Then fill in the recipient, the date and subject, the greeting, the main text and the closing. Leave a blank line between paragraphs.",
          "“Letter language” sets the language of the date and the “Subject” label. Your own text isn’t translated. A letter in Indonesian puts your city before the date, for example “Bandung, 13 Oktober 2026”.",
          "A letter has its own Design tab and downloads in the same formats as a CV. There’s no Check tab for letters.",
        ],
      },
      {
        title: "Downloading a PDF",
        body: [
          "The PDF is created by your browser’s own print function. The text in it can still be selected, and no watermark is added.",
        ],
        steps: [
          "Click “Download PDF”. Your browser’s print dialog opens with only the CV or letter, on A4 pages.",
          "Choose “Save as PDF” (Chrome, Edge), “Microsoft Print to PDF” (Windows) or “PDF → Save as PDF” (macOS / Safari).",
          "Set paper size to A4 and margins to Default.",
          "Turn off “Headers and footers” and turn on “Background graphics”.",
        ],
        after: [
          "On iPhone or iPad, open the print preview, tap the Share button and choose “Save to Files”. On Android, choose “Save as PDF” as the printer.",
        ],
      },
      {
        title: "Word, plain text and JSON backup",
        body: [
          "Click the arrow next to “Download PDF” to see the other formats. Like the PDF, they’re created in your browser.",
          "Word (.docx) is for editing in Word, Google Docs or LibreOffice. Word uses the fonts installed on the computer that opens the file, so if the chosen font isn’t installed, it shows a similar one.",
          "Plain text (.txt) has the same content without formatting, for pasting into online application forms.",
          "A JSON backup is a copy of the document’s data. Keep it somewhere safe, and use “Import file” in “Your documents” to load it again, in this browser or another one. Files saved with “Export JSON” in the earlier version of the builder can be imported too.",
        ],
      },
      {
        title: "Writing tips",
        body: [
          "Start each bullet point with an action verb and describe results you actually achieved. Only include numbers you can back up.",
          "Keep the summary to two to four sentences, and adjust it for each job you apply for.",
          "If the employer uses an applicant tracking system, choose the ATS Minimal template and keep the standard section headings.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy notice",
    updated: "Last updated: October 2026",
    sections: [
      {
        title: "Summary",
        body: [
          "Free AI CV Maker has no user accounts, database, advertising or analytics. The CVs and cover letters you write are processed in your browser and stored only on your device.",
        ],
      },
      {
        title: "What is stored and where",
        body: [
          "Your CVs and cover letters are stored in your browser’s local storage, under keys that start with “free-cv-maker:”. There’s a list of your documents with their names and dates, one key for each document, the ID of the document you last had open, and two preferences: the interface language and whether to show the print instructions.",
          "If a saved document can’t be read, its contents are set aside under a separate “free-cv-maker:” key instead of being deleted.",
          "Drafts saved by the earlier, single-draft version of this app (“free-cv-maker:draft” and “free-cv-maker:backup”) are moved into your documents the next time you open the builder, and the old keys are removed.",
          "Local storage isn’t an encrypted cloud service. Anyone with access to this browser profile can read it, and it can be deleted when you clear browsing data, use a private window, or when the browser needs to free up space. Download a JSON backup if you want a copy.",
        ],
      },
      {
        title: "What is sent over the internet",
        body: [
          "When you load the website, its files come from the hosting provider (for example, Cloudflare). Like any web host, it may keep standard technical logs such as your IP address and browser type.",
          "The content of your CVs and cover letters isn’t sent anywhere. The CV check runs in your browser. PDF files are created by your own browser’s print function.",
          "Word, plain text and JSON files are created in your browser and downloaded straight to your device.",
        ],
      },
      {
        title: "Optional AI features",
        body: [
          "AI features are off unless the operator of this website turns them on. When they are on, the AI button asks for your explicit consent every time, before it sends the specific text shown to you to the configured AI service. Nothing is sent without that consent, and a suggestion is only applied after you’ve reviewed it.",
        ],
      },
      {
        title: "Deleting your data",
        body: [
          "To delete a single document, open “Your documents” in the builder and choose “Delete”. To remove everything this app has stored in this browser, including all documents and preferences, use the button below.",
        ],
      },
    ],
    eraseButton: "Erase all locally stored data",
    eraseConfirmTitle: "Erase all data stored by this app?",
    eraseConfirmBody:
      "This removes all your CVs, cover letters and preferences from this browser. It can’t be undone.",
    eraseConfirm: "Erase everything",
    cancel: "Cancel",
    erased: "All locally stored data was erased.",
    eraseFailed: "Browser storage isn’t available, so there’s nothing to erase.",
  },
  // Feature dictionaries live in ./features so each feature owns its own file.
  sections,
  design,
  checks,
  docs,
  exporting,
  letter,
};

export default en;
export type Dictionary = typeof en;
