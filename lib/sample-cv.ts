/**
 * A clearly fictional example CV, used for template previews on the landing page
 * and as a realistic multi-page fixture in tests. It is never shown as real data.
 */

import { CV_SCHEMA_VERSION, type CVData, type Language, type TemplateId } from "./cv-schema";
import { DEFAULT_STYLE } from "./doc-style";
import { LETTER_SCHEMA_VERSION, type LetterData } from "./letter-schema";

export function sampleCV(template: TemplateId = "ats-minimal"): CVData {
  return {
    schemaVersion: CV_SCHEMA_VERSION,
    meta: { template, cvLanguage: "en", sectionOrder: [], hiddenSections: [], style: { ...DEFAULT_STYLE } },
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
    languages: [],
    organizations: [],
    awards: [],
    references: [],
    interests: [],
    customSections: [],
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

/**
 * sampleCV() plus every v2 section: two languages, an organisation, an award, a
 * reference (fictional, example.com email, no phone), two interests and a custom
 * "Courses" section with two entries. Used by tests and e2e checks of the new sections.
 */
export function richSampleCV(template: TemplateId = "ats-minimal"): CVData {
  return {
    ...sampleCV(template),
    languages: [
      { id: "lang1", name: "Indonesian", level: "native" },
      { id: "lang2", name: "English", level: "professional" },
    ],
    organizations: [
      {
        id: "org1",
        role: "Volunteer Data Mentor",
        organization: "Example Community Data Club",
        location: "Bandung, Indonesia",
        startDate: "2021-01",
        endDate: "",
        current: true,
        description: "- Run monthly beginner sessions on spreadsheets and SQL\n- Review practice projects from new members",
      },
    ],
    awards: [
      {
        id: "award1",
        title: "Best Internal Dashboard",
        issuer: "Example Logistics Co.",
        date: "2023-11",
        description: "Recognised for the weekly delivery-performance dashboard.",
      },
    ],
    references: [
      {
        id: "ref1",
        name: "Sam Placeholder",
        position: "Head of Operations",
        organization: "Example Logistics Co.",
        email: "sam.placeholder@example.com",
        phone: "",
        relationship: "Line manager",
      },
    ],
    interests: [
      { id: "int1", name: "Open data" },
      { id: "int2", name: "Trail running" },
    ],
    customSections: [
      {
        id: "courses",
        title: "Courses",
        items: [
          {
            id: "course1",
            title: "Introduction to Machine Learning",
            subtitle: "Sample Online Academy",
            startDate: "2023-02",
            endDate: "2023-04",
            description: "Eight-week online course with weekly assignments.",
          },
          {
            id: "course2",
            title: "Data Visualisation Basics",
            subtitle: "Example Learning Platform",
            startDate: "2022",
            endDate: "",
            description: "",
          },
        ],
      },
    ],
  };
}

/** A clearly fictional cover letter from the sample CV's person (example.com addresses only). */
export function sampleLetter(template: TemplateId = "ats-minimal"): LetterData {
  return {
    schemaVersion: LETTER_SCHEMA_VERSION,
    kind: "letter",
    meta: { template, language: "en", style: { ...DEFAULT_STYLE } },
    sender: {
      fullName: "Alex Example",
      title: "Data Analyst",
      email: "alex@example.com",
      phone: "",
      city: "Bandung",
      country: "Indonesia",
      linkedin: "",
      website: "",
    },
    recipient: {
      name: "Jordan Sample",
      title: "Analytics Lead",
      company: "Example Analytics Ltd.",
      address: "Jl. Contoh No. 1\nJakarta 10110\nIndonesia",
    },
    date: "2026-03-02",
    subject: "Application for the Senior Data Analyst position",
    greeting: "Dear Jordan Sample,",
    body:
      "I’m applying for the Senior Data Analyst position advertised on your careers page. I’ve spent four years turning operational data into reports and dashboards that managers use every week.\n\n" +
      "At Example Logistics Co. I maintain the delivery-performance dashboards for regional managers and automate recurring SQL reports with Python. I also worked with operations staff to agree on consistent KPI definitions.\n\n" +
      "I’d welcome the chance to talk about how I could support your analytics team. Thank you for your time.",
    closing: "Kind regards,",
    signature: "Alex Example",
  };
}

/**
 * Indonesian wording of showcaseCV()'s own text, for the landing page in Indonesian. Same
 * person, same facts; names of places, companies, tools and projects stay as they are.
 */
const SHOWCASE_ID = {
  title: "Analis Data",
  summary:
    "Analis data dengan pengalaman empat tahun mengolah data operasional menjadi laporan dan dasbor yang jelas. Terbiasa memakai SQL, Python, dan perangkat BI, serta menjelaskan temuan kepada rekan kerja nonteknis.",
  experience: {
    exp1: {
      jobTitle: "Analis Data",
      description:
        "- Mengelola dasbor mingguan kinerja pengiriman yang dipakai manajer regional\n- Mengotomatiskan laporan SQL rutin dengan skrip Python\n- Bersama staf operasional menyusun definisi KPI yang seragam\n- Mendokumentasikan sumber data dan logika pelaporan untuk tim",
    },
    exp2: {
      jobTitle: "Analis Bisnis Junior",
      description:
        "- Menyusun laporan penjualan bulanan untuk manajer toko\n- Membersihkan dan mencocokkan data ekspor kasir (POS) di spreadsheet\n- Membantu pemindahan laporan ke perangkat BI",
    },
    exp3: {
      jobTitle: "Magang Data",
      description: "- Membantu entri dan validasi data survei\n- Menyusun statistik deskriptif untuk laporan internal",
    },
  } as Record<string, { jobTitle: string; description: string }>,
  education: {
    edu1: { degree: "Sarjana (S1)", field: "Statistika", description: "Skripsi tentang metode peramalan permintaan ritel." },
    edu2: { degree: "Ijazah SMA", field: "IPA", description: "" },
  } as Record<string, { degree: string; field: string; description: string }>,
  projects: {
    prj1: {
      role: "Pengembang tunggal",
      description:
        "- Membuat dasbor kecil yang memvisualisasikan data jadwal transportasi umum\n- Menulis dokumentasi agar analisisnya bisa diulang",
    },
    prj2: {
      role: "",
      description: "Template spreadsheet dengan ringkasan bulanan otomatis, dibagikan kepada teman dan keluarga.",
    },
  } as Record<string, { role: string; description: string }>,
  softSkills: {
    ss1: "Komunikasi tertulis yang jelas",
    ss2: "Kerja sama dengan pemangku kepentingan",
    ss3: "Teliti",
  } as Record<string, string>,
};

/**
 * showcaseCV() written in the CV language: English as it is, or the same CV in Indonesian.
 * Used by the landing page, whose example CVs follow the interface language.
 */
export function localShowcaseCV(template: TemplateId = "modern-professional", cvLanguage: Language = "en"): CVData {
  const cv = showcaseCV(template, cvLanguage);
  if (cvLanguage !== "id") return cv;
  const t = SHOWCASE_ID;
  return {
    ...cv,
    personal: { ...cv.personal, title: t.title },
    summary: t.summary,
    experience: cv.experience.map((e) => ({ ...e, ...t.experience[e.id] })),
    education: cv.education.map((e) => ({ ...e, ...t.education[e.id] })),
    projects: cv.projects.map((p) => ({ ...p, ...t.projects[p.id] })),
    softSkills: cv.softSkills.map((s) => ({ ...s, name: t.softSkills[s.id] ?? s.name })),
  };
}

/**
 * The example CV on the landing page (the folder demo and the template thumbnails):
 * localShowcaseCV() trimmed to one A4 page in every template (the newest two jobs, the
 * degree, the main project and the technical skills). Nothing is added; it's still the
 * fictional Nadia Rahmawati.
 */
export function heroCV(template: TemplateId = "ats-minimal", cvLanguage: Language = "en"): CVData {
  const cv = localShowcaseCV(template, cvLanguage);
  return {
    ...cv,
    experience: cv.experience.filter((e) => e.id === "exp1" || e.id === "exp2"),
    education: cv.education.filter((e) => e.id === "edu1"),
    projects: cv.projects.filter((p) => p.id === "prj1"),
    softSkills: [],
    certifications: [],
  };
}
