/**
 * A clearly fictional example CV, used for template previews on the landing page
 * and as a realistic multi-page fixture in tests. It is never shown as real data.
 */

import { CV_SCHEMA_VERSION, type CVData, type Language, type TemplateId } from "./cv-schema";

export function sampleCV(template: TemplateId = "ats-minimal"): CVData {
  return {
    schemaVersion: CV_SCHEMA_VERSION,
    meta: { template, cvLanguage: "en" },
    personal: {
      fullName: "Alex Example",
      title: "Data Analyst",
      email: "alex@example.com",
      phone: "+62 812 0000 0000",
      city: "Bandung",
      country: "Indonesia",
      linkedin: "linkedin.com/in/alex-example",
      website: "alex-example.dev",
      photo: "",
    },
    summary:
      "Data analyst with four years of experience turning operational data into clear reports and dashboards. Comfortable working with SQL, Python and BI tools, and with explaining findings to non-technical colleagues.",
    experience: [
      {
        id: "exp1",
        jobTitle: "Data Analyst",
        company: "Example Logistics Co.",
        location: "Bandung, Indonesia",
        startDate: "2022-03",
        endDate: "",
        current: true,
        description:
          "- Maintain weekly delivery-performance dashboards used by regional managers\n- Automate recurring SQL reports with Python scripts\n- Work with operations staff to define consistent KPI definitions\n- Document data sources and reporting logic for the team",
      },
      {
        id: "exp2",
        jobTitle: "Junior Business Analyst",
        company: "Sample Retail Group",
        location: "Jakarta, Indonesia",
        startDate: "2020-08",
        endDate: "2022-02",
        current: false,
        description:
          "- Prepared monthly sales reports for store managers\n- Cleaned and reconciled point-of-sale exports in spreadsheets\n- Supported the migration of reports to a BI tool",
      },
      {
        id: "exp3",
        jobTitle: "Data Intern",
        company: "Placeholder Research Lab",
        location: "Bandung, Indonesia",
        startDate: "2019-06",
        endDate: "2019-12",
        current: false,
        description: "- Assisted with survey data entry and validation\n- Produced descriptive statistics for internal reports",
      },
    ],
    education: [
      {
        id: "edu1",
        institution: "Example Institute of Technology",
        degree: "Bachelor of Science",
        field: "Statistics",
        startDate: "2016-08",
        endDate: "2020-07",
        description: "Thesis on forecasting methods for retail demand.",
      },
      {
        id: "edu2",
        institution: "Sample Senior High School",
        degree: "High School Diploma",
        field: "Science",
        startDate: "2013-07",
        endDate: "2016-06",
        description: "",
      },
    ],
    projects: [
      {
        id: "prj1",
        name: "Open Transit Dashboard",
        role: "Sole developer",
        description: "- Built a small dashboard visualising public transit timetable data\n- Wrote documentation for reproducing the analysis",
        technologies: "Python, pandas, Plotly",
        url: "github.com/alex-example/transit",
      },
      {
        id: "prj2",
        name: "Household Budget Tracker",
        role: "",
        description: "A spreadsheet template with automatic monthly summaries, shared with friends and family.",
        technologies: "Google Sheets",
        url: "",
      },
    ],
    technicalSkills: [
      { id: "ts1", name: "SQL", level: "advanced" },
      { id: "ts2", name: "Python (pandas)", level: "intermediate" },
      { id: "ts3", name: "Power BI", level: "intermediate" },
      { id: "ts4", name: "Excel / Google Sheets", level: "advanced" },
      { id: "ts5", name: "Git", level: "" },
    ],
    softSkills: [
      { id: "ss1", name: "Clear written communication", level: "" },
      { id: "ss2", name: "Stakeholder collaboration", level: "" },
      { id: "ss3", name: "Attention to detail", level: "" },
    ],
    certifications: [
      {
        id: "cert1",
        name: "Example Data Analytics Certificate",
        issuer: "Sample Online Academy",
        issueDate: "2021-05",
        credential: "ABC-123-XYZ",
      },
    ],
  };
}

/**
 * The sample CV with realistic, fictional Indonesian names, for the landing page hero and
 * template thumbnails. It has no phone number, profile handles, links or credential IDs, so
 * nothing on it points at a real person or organisation. Content and layout are otherwise
 * the same as sampleCV(), which stays unchanged because tests depend on it.
 */
export function showcaseCV(template: TemplateId = "modern-professional", cvLanguage: Language = "en"): CVData {
  const base = sampleCV(template);
  base.meta.cvLanguage = cvLanguage;
  const companies: Record<string, string> = {
    exp1: "Lintas Raya Logistik",
    exp2: "Toko Mitra Sejahtera",
    exp3: "Lab Statistika Terapan",
  };
  const institutions: Record<string, string> = {
    edu1: "Universitas Cendekia Raya",
    edu2: "SMA Tunas Harapan",
  };
  return {
    ...base,
    personal: {
      ...base.personal,
      fullName: "Nadia Rahmawati",
      email: "nadia.rahmawati@example.com",
      phone: "",
      linkedin: "",
      website: "",
    },
    experience: base.experience.map((e) => ({ ...e, company: companies[e.id] ?? e.company })),
    education: base.education.map((e) => ({ ...e, institution: institutions[e.id] ?? e.institution })),
    projects: base.projects.map((p) => ({ ...p, url: "" })),
    certifications: base.certifications.map((c) =>
      c.id === "cert1"
        ? {
            ...c,
            name: "Pelatihan Analisis Data dengan SQL",
            issuer: "Pelatihan internal Lintas Raya Logistik",
            credential: "",
          }
        : c,
    ),
  };
}
