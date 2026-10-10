/**
 * Labels and formatting used INSIDE the CV document. These follow the CV's own
 * language (cv.meta.cvLanguage), not the interface language, so a user can work in
 * an Indonesian UI while producing an English CV and vice versa.
 */

import type { Language, SkillLevel } from "./cv-schema";

export interface CVLabels {
  summary: string;
  experience: string;
  education: string;
  projects: string;
  skills: string;
  technicalSkills: string;
  softSkills: string;
  certifications: string;
  present: string;
  role: string;
  technologies: string;
  credential: string;
  issued: string;
  levels: Record<Exclude<SkillLevel, "">, string>;
  months: string[];
}

export const CV_LABELS: Record<Language, CVLabels> = {
  en: {
    summary: "Professional Summary",
    experience: "Work Experience",
    education: "Education",
    projects: "Projects",
    skills: "Skills",
    technicalSkills: "Technical Skills",
    softSkills: "Soft Skills",
    certifications: "Certifications",
    present: "Present",
    role: "Role",
    technologies: "Technologies",
    credential: "Credential",
    issued: "Issued",
    levels: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", expert: "Expert" },
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  id: {
    summary: "Ringkasan Profesional",
    experience: "Pengalaman Kerja",
    education: "Pendidikan",
    projects: "Proyek",
    skills: "Keahlian",
    technicalSkills: "Keahlian Teknis",
    softSkills: "Soft Skill",
    certifications: "Sertifikasi",
    present: "Sekarang",
    role: "Peran",
    technologies: "Teknologi",
    credential: "Kredensial",
    issued: "Terbit",
    levels: { beginner: "Pemula", intermediate: "Menengah", advanced: "Mahir", expert: "Ahli" },
    months: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
  },
};

/** "2024-03" -> "Mar 2024", "2024" -> "2024", "" -> "". Deterministic (no locale APIs). */
export function formatMonth(value: string, lang: Language): string {
  if (/^\d{4}$/.test(value)) return value;
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return "";
  const month = CV_LABELS[lang].months[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : m[1];
}

/** Formats a start–end range; handles current roles and partially known dates. */
export function formatRange(start: string, end: string, lang: Language, current = false): string {
  const s = formatMonth(start, lang);
  const e = current ? CV_LABELS[lang].present : formatMonth(end, lang);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

/**
 * Splits free text into blocks. Lines starting with "-", "•" or "*" become bullet
 * points; other lines stay as paragraphs. Consecutive bullets are grouped.
 */
export type TextBlock = { kind: "p"; text: string } | { kind: "ul"; items: string[] };

export function toBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const bullet = /^[-•*]\s*(.+)$/.exec(line);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "ul") last.items.push(bullet[1]);
      else blocks.push({ kind: "ul", items: [bullet[1]] });
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }
  return blocks;
}

export function joinNonEmpty(parts: string[], sep = ", "): string {
  return parts.map((p) => p.trim()).filter(Boolean).join(sep);
}
