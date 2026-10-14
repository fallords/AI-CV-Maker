/**
 * English strings for the CV checker panel.
 * Owned by the CHECKS agent; `checks.id.ts` must provide the same shape. Wired into lib/i18n/en.ts as `t.checks`.
 *
 * Placeholders: {score}, {count}, {total}, {pages}, {ratio}, {name} (a skill), {max} (characters),
 * {index} (entry position). Rule messages ask for real details only; they never suggest inventing anything.
 */
const checks = {
  /** Tab label for the panel. */
  title: "Check",
  heading: "CV check",
  intro:
    "These checks run in your browser. They look for missing details and common problems, but they can’t judge how strong your experience is.",
  score: {
    label: "Score",
    /** Accessible value of the score meter, and a label for a score badge on the tab. */
    valueText: "{score} out of 100",
    badge: "Score: {score} out of 100",
    outOf: "out of 100",
    basis: "Based on how complete the CV is and on the issues listed below.",
    bands: {
      high: "In good shape.",
      medium: "A good start. Some parts could be stronger.",
      low: "Several important parts are missing.",
    },
    /** Shown instead of the band while there are errors. */
    withErrors: "Fix the errors below before you send it.",
  },
  groups: {
    error: "Errors",
    warning: "Warnings",
    tip: "Tips",
  },
  /** Read before each finding by screen readers, so the severity is clear outside the group heading. */
  levels: {
    error: "Error",
    warning: "Warning",
    tip: "Tip",
  },
  counts: {
    error: { one: "1 error", other: "{count} errors" },
    warning: { one: "1 warning", other: "{count} warnings" },
    tip: { one: "1 tip", other: "{count} tips" },
  },
  /** Joins the counts: "2 errors and 3 tips", "2 errors, 1 warning and 3 tips". */
  list: { separator: ", ", pair: " and ", last: " and " },
  allClear:
    "No issues found. Before you send it, read it through once more and check that every detail is accurate.",
  empty: "Your CV is empty. Fill in the form and the checks will appear here.",
  emptyAction: "Start with your personal details",
  /** Location shown under each finding. */
  places: {
    personal: "Personal information",
    design: "Design",
    summary: "Professional summary",
    experience: "Work experience",
    education: "Education",
    projects: "Projects",
    skills: "Skills",
    certifications: "Certifications",
    organizations: "Organisations & volunteering",
    awards: "Awards",
    languages: "Languages",
    references: "References",
    interests: "Interests",
    customUntitled: "Untitled section",
  },
  /** Used when an entry has no title yet. */
  entryUntitled: "Entry {index}",
  rules: {
    missingName: "Add your full name.",
    missingEmail: "Add an email address so employers can reply to you.",
    invalidEmail: "Check your email address. It doesn’t look complete.",
    missingPhone: "Add a phone number. Many recruiters call or send a message first.",
    missingCity: "Add the city you live in. Employers often look at where a candidate is based.",
    missingTitle: "Add a professional title, such as your current role or the kind of role you’re applying for.",
    invalidLinkedin: "Check the LinkedIn URL. It isn’t a valid web address.",
    invalidWebsite: "Check the portfolio or website URL. It isn’t a valid web address.",
    photoAts: "ATS Minimal doesn’t show your photo. If you want it on the CV, choose another template.",
    summaryMissing: "Add a short summary: two to four sentences about your experience and the role you want.",
    summaryShort: "Your summary is short ({count} characters). Two to four sentences usually work well.",
    summaryLong: "Your summary is long ({count} characters). Keeping it under 800 makes it quicker to read.",
    noExperienceOrEducation: "Add at least one work experience or education entry.",
    noExperience:
      "There’s no work experience on your CV. If you’ve done internships, part-time or freelance work, add it here.",
    noEducation: "Add your education, at least the highest level you’ve completed.",
    noDescription: "Add a few lines about what you did in this role and the results you actually achieved.",
    noBullets: "Split the description into bullet points: start each line with “-”.",
    noDates: "This entry has no dates. Add when it started and ended.",
    noStartDate: "Add a start date.",
    noEndDate: "Add an end date, or mark the entry as current if it’s still ongoing.",
    dateOrder: "The end date is before the start date.",
    /** By the language of the pronouns found (usually the CV's), so the tip names the words used. */
    firstPerson: {
      en: {
        one: "One line starts with “I” or “my”. CV points usually leave out the pronoun: “Managed…” rather than “I managed…”.",
        other:
          "{count} lines start with “I” or “my”. CV points usually leave out the pronoun: “Managed…” rather than “I managed…”.",
      },
      id: {
        one: "One line starts with “saya” or “aku”. CV points usually leave out the pronoun: “Mengelola…” rather than “Saya mengelola…”.",
        other:
          "{count} lines start with “saya” or “aku”. CV points usually leave out the pronoun: “Mengelola…” rather than “Saya mengelola…”.",
      },
    },
    longLines: {
      one: "One line is longer than {max} characters. Shorter points are easier to read at a glance.",
      other: "{count} lines are longer than {max} characters. Shorter points are easier to read at a glance.",
    },
    fewActionVerbs:
      "Only {count} of {total} points start with an action verb. Starting with verbs such as “Led”, “Built” or “Improved” makes each point clearer.",
    noNumbers:
      "None of your work experience points include a number. If you have real figures, such as team size, volume or time saved, add them. Leave out anything you can’t back up.",
    noSkills: "Add a few skills that are relevant to the jobs you’re applying for.",
    duplicateSkill: "“{name}” is listed more than once in your skills.",
    invalidProjectUrl: "Check the project URL. It isn’t a valid web address.",
    invalidReferenceEmail: "Check this reference’s email address. It doesn’t look complete.",
    noExtras:
      "If you have them, add projects, certifications, organisations, awards or languages. Only include what’s real.",
    customNoTitle: "This section has no title. Add one so readers know what it lists.",
    hiddenSection: "This section has content but is hidden from the CV. You can show it again in the Design tab.",
    tooManyPages:
      "Your CV is {pages} pages long. One or two pages is usual. Try shorter descriptions, or a smaller text size, spacing or margins in the Design tab.",
    lowContrast:
      "The accent colour is hard to read on white (contrast {ratio}:1). Choose a darker colour with at least 4.5:1.",
  },
};

export default checks;
