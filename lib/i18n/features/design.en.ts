/**
 * English strings for the Design panel (appearance and section manager).
 * Owned by the DESIGN agent; `design.id.ts` must provide the same shape. Wired into lib/i18n/en.ts as `t.design`.
 *
 * Placeholders: {name} section name, {ratio} contrast ratio, {size} number, {position}/{total} list positions.
 */
const design = {
  /** Tab label for the panel. */
  title: "Design",
  appearance: {
    title: "Appearance",
    intro: "These settings apply to this document only. Changes show in the preview straight away.",
    reset: "Reset appearance",
    resetDone: "Appearance is back to the template’s defaults.",
  },
  accent: {
    legend: "Accent colour",
    hint: "Used for the name, headings and lines. Where it appears depends on the template.",
    /** Names of the colour presets in lib/doc-style.ts (ACCENT_PRESETS ids). */
    names: {
      default: "Template colour",
      ink: "Ink",
      prussian: "Prussian blue",
      forest: "Forest green",
      teal: "Teal",
      burgundy: "Burgundy",
      plum: "Plum",
      graphite: "Graphite",
    },
    custom: "Custom colour",
    pickerLabel: "Colour",
    hexLabel: "Colour code",
    hexHint: "Six digits, for example #21507a.",
    hexError: "Enter a six-digit colour code, for example #21507a.",
    contrast: "Contrast on white paper: {ratio}:1",
    lowContrast:
      "This colour is too light for text on white paper. Headings may be hard to read, especially when printed. Choose a darker colour with a contrast of at least 4.5:1.",
  },
  font: {
    legend: "Font",
    hint: "IBM Plex is included with this site, so it looks the same on every device. System fonts depend on the device that makes the PDF.",
    options: {
      default: "Template font",
      sans: "System sans-serif",
      serif: "System serif",
      "plex-sans": "IBM Plex Sans",
      "plex-serif": "IBM Plex Serif",
    },
  },
  fontSize: {
    legend: "Text size",
    options: { small: "Small", medium: "Medium", large: "Large" },
    detail: "{size} pt",
  },
  spacing: {
    legend: "Spacing",
    hint: "Space between lines and sections. Compact can help a long CV fit on fewer pages.",
    options: { compact: "Compact", normal: "Normal", relaxed: "Relaxed" },
  },
  margin: {
    legend: "Page margins",
    hint: "The number is the left and right margin. The top and bottom margins change with it.",
    options: { narrow: "Narrow", normal: "Normal", wide: "Wide" },
    detail: "{size} mm",
  },
  sections: {
    title: "Sections",
    intro:
      "Sections follow the template’s order until you move one. A hidden section keeps what you wrote but doesn’t appear on the CV.",
    personalNote: "Your name and contact details always come first.",
    listLabel: "CV sections in order",
    moveUp: "Move {name} up",
    moveDown: "Move {name} down",
    /** Visible text of the show/hide toggle; the button is pressed while the section is shown. */
    show: "Show",
    /** Accessible name of the toggle; starts with the visible text. */
    showLabel: "Show {name}",
    hiddenNote: "Hidden from the CV",
    emptyNote: "Nothing filled in yet, so it doesn’t appear on the CV",
    untitled: "Untitled section",
    reset: "Reset to template order",
    moved: "{name} moved to position {position} of {total}.",
    resetDone: "Sections are back in the template’s order.",
  },
};

export default design;
