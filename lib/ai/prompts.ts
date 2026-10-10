/**
 * Prompt templates, kept separate from UI components. Every template instructs the
 * model to preserve facts and never invent experience, credentials or metrics.
 */

export type AITask = "rewrite-summary" | "improve-grammar" | "bulletize" | "suggest-keywords" | "translate";

const FACT_RULES = [
  "Preserve the factual meaning of the input exactly.",
  "Never invent employers, job titles, dates, qualifications, credentials, achievements or numbers.",
  "If the input lacks information, do not fill the gap; keep it general instead.",
  "Return only the resulting text, with no preamble or commentary.",
].join(" ");

const LANGUAGE_NAME = { en: "English", id: "Indonesian" } as const;

export function buildPrompt(req: {
  task: AITask;
  text: string;
  language: "en" | "id";
  context?: string;
}): { system: string; prompt: string } {
  const lang = LANGUAGE_NAME[req.language];
  const system = `You are a careful CV editor. ${FACT_RULES}`;
  const tasks: Record<AITask, string> = {
    "rewrite-summary": `Rewrite this professional CV summary in ${lang} to be clear, concise (2-4 sentences) and professional:`,
    "improve-grammar": `Correct grammar, spelling and clarity in ${lang} without changing the meaning:`,
    bulletize: `Convert these responsibilities into concise CV bullet points in ${lang}, one per line starting with "- ", using only the information given:`,
    "suggest-keywords": `List relevant skills keywords, comma-separated, that appear in or are directly implied by the job description below AND are supported by the candidate text. Job description:\n${req.context ?? ""}\n\nCandidate text:`,
    translate: `Translate this CV text into ${lang}, keeping names, organisations and technical terms unchanged:`,
  };
  return { system, prompt: `${tasks[req.task]}\n\n${req.text}` };
}
