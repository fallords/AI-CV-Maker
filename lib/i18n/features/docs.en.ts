/**
 * English strings for the multi-document builder shell: document switcher, documents
 * dialog, editor tabs, download menu trigger and document-level messages.
 * Owned by the SHELL agent; `docs.id.ts` must provide the same shape. Wired into lib/i18n/en.ts as `t.docs`.
 *
 * Placeholders: {name} / {next} document names, {date} a formatted date and time, {score} a number.
 */
const docs = {
  /** Title of the documents dialog. */
  title: "Your documents",
  kinds: { cv: "CV", letter: "Cover letter" },
  switcher: {
    /** Small label above the button that shows the open document. */
    label: "Document",
    hint: "Show all documents",
  },
  letterLanguage: "Letter language",
  letterLanguageHint: "Sets the language of the date and the “Subject” label. Your own text isn’t translated.",
  /** Tabs above the editor. The Design and Check tab labels come from `t.design.title` and `t.checks.title`. */
  editorTabs: {
    label: "Editor",
    content: "Content",
  },
  status: {
    unavailable: "Browser storage isn’t available, so changes won’t be saved. Download a JSON backup to keep a copy.",
    quota: "Browser storage is full. Delete documents you no longer need, remove the photo, or download a JSON backup.",
  },
  actions: {
    /** Accessible name of the toolbar's “More” panel. */
    label: "Document actions",
    rename: "Rename",
    duplicate: "Duplicate",
    delete: "Delete",
  },
  download: {
    /** Accessible name of the button next to “Download PDF” that lists the other formats. */
    more: "Other download formats",
  },
  dialog: {
    intro: "Each CV and cover letter is saved separately in this browser. Open one to edit it, or start a new one.",
    newCv: "New CV",
    newLetter: "New cover letter",
    importFile: "Import file",
    importHint: "Import a JSON backup made with this app. It’s added as a new document, so nothing is replaced.",
    listLabel: "Saved documents",
    empty: "Nothing is saved yet. What you type in the editor is saved here automatically.",
    current: "Open now",
    edited: "Edited {date}",
    open: "Open",
    rename: "Rename",
    duplicate: "Duplicate",
    delete: "Delete",
    nameLabel: "Document name",
    nameRequired: "Enter a name.",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    /** Name given to a duplicate. */
    copyName: "{name} (copy)",
    letterTitle: "New cover letter",
    letterFrom: "Copy your details from",
    letterFromNone: "Don’t copy, start with empty details",
    letterFromHint: "Your name, title and contact details are filled in from the CV. You can still change them in the letter.",
    createLetter: "Create cover letter",
    renamed: "Renamed to “{name}”.",
    duplicated: "Copy created: “{name}”.",
    deleted: "“{name}” was deleted from this browser.",
    deletedOpened: "“{name}” was deleted. “{next}” is open now.",
  },
  confirmDelete: {
    title: "Delete “{name}”?",
    body: "This permanently removes it from this browser. If you might need it later, download a JSON backup first.",
    confirm: "Delete",
    cancel: "Cancel",
  },
  rename: {
    title: "Rename document",
    save: "Save",
    cancel: "Cancel",
  },
  print: {
    titleLetter: "Download your cover letter as PDF",
  },
  messages: {
    corrupted: "A saved document could not be read, so it’s been set aside in this browser. Your other documents aren’t affected.",
    created: { cv: "New CV created.", letter: "New cover letter created." },
    createdFrom: "New cover letter created with your details from “{name}”.",
    opened: "Now editing “{name}”.",
    duplicatedOpened: "Copy created. You’re now editing “{name}”.",
    renamed: "Renamed to “{name}”.",
    deleted: "“{name}” was deleted from this browser.",
    deletedOpened: "“{name}” was deleted. You’re now editing “{next}”.",
    imported: "“{name}” was imported as a new document.",
    importedMigrated: "“{name}” was imported as a new document and converted from an older file format.",
    createFailed: {
      unavailable: "The document couldn’t be created because browser storage isn’t available.",
      quota:
        "The document couldn’t be created because browser storage is full. Delete documents you no longer need, or remove a photo.",
    },
    openFailed: {
      missing: "That document couldn’t be found. It may have been deleted in another tab.",
      corrupted: "That document could not be read, so it’s been set aside in this browser.",
      unavailable: "Browser storage isn’t available, so the document couldn’t be opened.",
    },
    unsavedChanges:
      "Your latest changes couldn’t be saved, so the other document wasn’t opened. Free up browser storage or download a JSON backup first.",
    renameFailed: "The new name couldn’t be saved. Try again.",
    deleteFailed: "The document couldn’t be deleted. Try again.",
    importErrors: {
      invalid_json: "This file is not valid JSON.",
      not_object: "This file doesn’t contain a CV or cover letter from this app.",
      unsupported_version: "This file comes from a newer or unknown version of the app and can’t be imported.",
      too_large: "This file is too large. The limit is 5 MB.",
      read_failed: "The file could not be read.",
    },
  },
};

export default docs;
