/**
 * English strings for the download menu and the Word and plain text exports.
 * Owned by the EXPORT agent; `exporting.id.ts` must provide the same shape. Wired into lib/i18n/en.ts as `t.exporting`.
 *
 * The files themselves (lib/export/*) take their in-document labels from the document's
 * own language (lib/cv-format.ts), not from these UI strings.
 */
const exporting = {
  /** Accessible name of the menu (the list of formats). */
  menuLabel: "Download formats",
  formats: {
    pdf: {
      label: "PDF",
      description: "For sending and printing. Opens your browser’s print dialog.",
    },
    docx: {
      label: "Word (.docx)",
      description: "For editing in Word, Google Docs or LibreOffice.",
    },
    txt: {
      label: "Plain text (.txt)",
      description: "Text only, for pasting into online application forms.",
    },
    json: {
      label: "JSON backup",
      description: "A copy of your data that you can import again later.",
    },
  },
  /** Shown while the Word file is being built (the first time also loads the Word module). */
  preparing: "Creating the Word file…",
  done: {
    docx: "Word file downloaded.",
    txt: "Text file downloaded.",
    json: "JSON file downloaded.",
  },
  failed: {
    docx: "The Word file couldn’t be created. Try again, or download a PDF instead.",
    txt: "The text file couldn’t be created. Try again.",
  },
  empty: {
    cv: "Your CV is empty. Add some details before downloading.",
    letter: "Your letter is empty. Add some details before downloading.",
  },
};

export default exporting;
