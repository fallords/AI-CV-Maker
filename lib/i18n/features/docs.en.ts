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
    unavailable:
      "Browser storage isn’t available, so nothing is saved in this browser. To keep your work, download a JSON backup before you close the page and import it next time.",
    quota: "Browser storage is full, so your latest changes aren’t saved. Delete documents you no longer need or remove the photo to make room.",
    conflict: "Not saved: this document was changed in another tab or window.",
  },
  actions: {
    /** Accessible name of the toolbar's “More” panel. */
    label: "Document actions",
    newCv: "New CV",
    /** Opens “Your documents” with the new cover letter setup shown. */
    newLetter: "New cover letter…",
    /** Opens “Your documents”. */
    allDocs: "All documents…",
    rename: "Rename",
    duplicate: "Duplicate",
    delete: "Delete",
  },
  download: {
    /**
     * The button next to “Download PDF” that lists every format: its visible text from small
     * screens up (phones show only the arrow) and its accessible name at every width. One
     * string for both, so the name always contains the visible label (WCAG 2.5.3).
     */
    more: "All formats",
  },
  dialog: {
    intro: "Each CV and cover letter is saved separately in this browser. Open one to edit it, or start a new one.",
    newCv: "New CV",
    newLetter: "New cover letter",
    importFile: "Import file",
    importHint: "Import a JSON backup made with this app. It’s added as a new document, so nothing is replaced.",
    listLabel: "Saved documents",
    empty: "Nothing is saved yet. What you type in the editor is saved here automatically.",
    emptyUnavailable:
      "Browser storage isn’t available, so documents can’t be saved or listed here. You can still start a new document or import a file, but it’s lost when you close the page.",
    current: "Currently open",
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
  /** Asked before another document replaces one whose latest changes aren’t saved. */
  discard: {
    title: "Discard unsaved changes?",
    quota:
      "Browser storage is full, so your latest changes to “{name}” couldn’t be saved. To keep them, choose Cancel, then delete a document you no longer need or remove the photo. If you continue, those changes are lost.",
    unavailable:
      "Browser storage isn’t available, so “{name}” isn’t saved anywhere. If you continue, it’s replaced and can’t be brought back. To keep it, choose Cancel and download a JSON backup first.",
    conflict:
      "“{name}” was also changed in another tab or window, so your latest changes here weren’t saved. If you continue, they’re lost. To keep them, choose Cancel, then “Keep mine”.",
    confirm: "Open anyway (discard unsaved changes)",
    cancel: "Cancel",
  },
  /** Shown when another tab or window saved the open document while this one had unsaved changes. */
  conflict: {
    text: "“{name}” was changed in another tab or window, so your latest changes here haven’t been saved.",
    loadNewer: "Load the newer version",
    keepMine: "Keep mine",
    loaded: "The newer version of “{name}” is open.",
    kept: "Your version of “{name}” was saved.",
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
    legacyBlocked:
      "Your draft from the earlier version of this app is open, but browser storage is full, so it couldn’t be moved into “Your documents”. It’s still kept in this browser. To make room, delete documents you no longer need or remove the photo.",
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
