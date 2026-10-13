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
      "As you fill in the form, the preview lays out your CV on A4 pages. When it looks right, save it as a PDF from your browser’s print dialog.",
    ctaPrimary: "Create Your Free CV",
    ctaSecondary: "See the templates",
    ctaContinue: "Continue your saved draft",
    facts: [
      { label: "Price", value: "Using the builder and downloading PDFs is free. There are no ads or paid plans." },
      { label: "Account", value: "You don’t need one." },
      {
        label: "Where drafts are kept",
        value: "In this browser’s local storage, on your device. Your CV isn’t uploaded to a server.",
      },
      { label: "PDF", value: "A4 pages with selectable text and no watermark." },
    ],
    templatesTitle: "Templates",
    templatesBody:
      "You can switch templates at any time in the builder, and your details carry over.",
    privacyTitle: "Privacy",
    privacyBody:
      "There are no accounts and no analytics. The privacy notice lists exactly what’s kept in your browser and how to delete it.",
    privacyLink: "Read the privacy notice",
    faqTitle: "Common questions",
    faq: [
      {
        q: "Can I lose my draft?",
        a: "Yes, if you clear your browsing data or work in a private (incognito) window. It also won’t be there on another device. Use More → Export JSON to keep a copy, and Import JSON to load it again.",
      },
      {
        q: "Can the CV be in Indonesian?",
        a: "Yes. Set “CV language” to Indonesian and the section headings and month names switch to Indonesian. Your own text isn’t translated, so write it in the language you want.",
      },
      {
        q: "Will applicant tracking systems (ATS) read my CV?",
        a: "Use the ATS Minimal template. It has a single column and standard section headings, and the PDF contains real text rather than an image. Most systems read that well, though each ATS works a little differently.",
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
    actions: "Draft actions",
    saveNow: "Save draft",
    restore: "Restore previous draft",
    newCv: "Start new CV",
    deleteDraft: "Delete draft",
    importJson: "Import JSON",
    exportJson: "Export JSON",
    downloadPdf: "Download PDF",
    more: "More",
    dismiss: "Dismiss",
    status: {
      saved: "Saved on this device",
      unsaved: "Unsaved changes…",
      unavailable: "Browser storage isn’t available, so changes won’t be saved. Use Export JSON to keep a copy.",
      quota: "Browser storage is full. Remove the photo or use Export JSON to keep a copy.",
    },
    messages: {
      saved: "Draft saved on this device.",
      restored: "Previous draft restored. The draft it replaced is now the previous draft.",
      noBackup: "There’s no previous draft to restore.",
      newCv: "New CV started. You can bring the previous draft back with “Restore previous draft”.",
      deleted: "Draft deleted from this browser.",
      imported: "CV imported.",
      importedMigrated: "CV imported and converted from an older file format.",
      exported: "JSON file downloaded.",
      corrupted: "Your saved draft could not be read, so it’s been set aside. The editor starts with an empty CV.",
      recovered: "Your draft was restored from this browser.",
      importErrors: {
        invalid_json: "This file is not valid JSON.",
        not_object: "This file doesn’t contain CV data.",
        unsupported_version: "This file comes from a newer or unknown version of the app and can’t be imported.",
        too_large: "This file is too large. The limit is 5 MB.",
        read_failed: "The file could not be read.",
      },
    },
    confirm: {
      cancel: "Cancel",
      newTitle: "Start a new CV?",
      newBody: "Your current draft becomes the previous draft. Any older previous draft is replaced.",
      newConfirm: "Start new CV",
      deleteTitle: "Delete this draft?",
      deleteBody:
        "This permanently removes the current and previous drafts from this browser. If you might need them later, export a JSON copy first.",
      deleteConfirm: "Delete draft",
      restoreTitle: "Restore the previous draft?",
      restoreBody: "The current draft and the previous draft swap places, so nothing is lost.",
      restoreConfirm: "Restore",
      importTitle: "Replace your current draft?",
      importBody: "The imported CV replaces what’s in the editor. Your current draft becomes the previous draft.",
      importConfirm: "Import",
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
      empty: "Your CV is empty. Add some details before downloading.",
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
    restorePrompt: "Draft restored",
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
    intro: "Instructions for the builder, including the print settings for each browser.",
    sections: [
      {
        title: "Fill in your CV",
        body: [
          "Open the CV Builder and fill in the sections that apply to you. Every field is optional, and empty sections are left out of the CV.",
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
        title: "Saving and restoring drafts",
        body: [
          "Your draft is saved in this browser automatically, a moment after each change, and also when you click “Save draft”.",
          "When you start a new CV or import a file, the current draft is kept as the “previous draft”, and you can restore it.",
          "Browser storage isn’t a backup. If you clear browser data, use a private window or switch to another device, the draft won’t be there. Use “Export JSON” to keep a copy and “Import JSON” to load it again.",
        ],
      },
      {
        title: "Downloading a PDF",
        body: [
          "The PDF is created by your browser’s own print function. The text in it can still be selected, and no watermark is added.",
        ],
        steps: [
          "Click “Download PDF”. Your browser’s print dialog opens with only the CV, on A4 pages.",
          "Choose “Save as PDF” (Chrome, Edge), “Microsoft Print to PDF” (Windows) or “PDF → Save as PDF” (macOS / Safari).",
          "Set paper size to A4 and margins to Default.",
          "Turn off “Headers and footers” and turn on “Background graphics”.",
        ],
        after: [
          "On iPhone or iPad, open the print preview, tap the Share button and choose “Save to Files”. On Android, choose “Save as PDF” as the printer.",
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
          "Free AI CV Maker has no user accounts, database, advertising or analytics. The CV you write is processed in your browser and stored only on your device.",
        ],
      },
      {
        title: "What is stored and where",
        body: [
          "Your CV draft, a previous draft (kept when you start a new CV or import a file) and your interface language are stored in your browser’s local storage, under keys that start with “free-cv-maker:”.",
          "Local storage isn’t an encrypted cloud service. Anyone with access to this browser profile can read it, and it can be deleted when you clear browsing data, use a private window, or when the browser needs to free up space. Export a JSON copy if you want a backup.",
        ],
      },
      {
        title: "What is sent over the internet",
        body: [
          "When you load the website, its files come from the hosting provider (for example, Cloudflare). Like any web host, it may keep standard technical logs such as your IP address and browser type.",
          "Your CV content isn’t sent anywhere. PDF files are created by your own browser’s print function.",
          "Exported JSON files are downloaded straight to your device.",
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
          "Use “Delete draft” in the builder, or the button below, to remove everything this app has stored in this browser.",
        ],
      },
    ],
    eraseButton: "Erase all locally stored data",
    eraseConfirmTitle: "Erase all data stored by this app?",
    eraseConfirmBody: "This removes your drafts and preferences from this browser. It can’t be undone.",
    eraseConfirm: "Erase everything",
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
