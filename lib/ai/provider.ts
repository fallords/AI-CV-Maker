/**
 * Optional AI provider abstraction.
 *
 * AI is DISABLED unless the site operator sets NEXT_PUBLIC_AI_PROXY_URL at build time
 * to the URL of their own server-side proxy (e.g. a Cloudflare Worker) that holds
 * the real provider API key. API keys must never be placed in this frontend: every
 * NEXT_PUBLIC_* value is embedded in the public JavaScript bundle.
 *
 * Nothing in the core CV workflow imports from this module except the optional,
 * consent-gated UI in components/cv-form/AiSummaryAssist.tsx.
 */

import { buildPrompt, type AITask } from "./prompts";

export interface AIRequest {
  task: AITask;
  /** The exact text the user agreed to send. */
  text: string;
  /** Language the output should be written in. */
  language: "en" | "id";
  /** Optional extra input, e.g. a job description for keyword suggestions. */
  context?: string;
}

export interface AIResponse {
  text: string;
}

export interface AIProvider {
  readonly id: string;
  complete(request: AIRequest, signal?: AbortSignal): Promise<AIResponse>;
}

export class AIUnavailableError extends Error {
  constructor(message = "AI provider is not configured") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

/**
 * Talks to an operator-hosted proxy. Contract (documented in README):
 *   POST <url>  { task, system, prompt, language }  ->  200 { text: string }
 */
export class HttpProxyProvider implements AIProvider {
  readonly id = "http-proxy";
  constructor(private readonly url: string) {}

  async complete(request: AIRequest, signal?: AbortSignal): Promise<AIResponse> {
    const { system, prompt } = buildPrompt(request);
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: request.task, system, prompt, language: request.language }),
      signal,
      credentials: "omit",
    });
    if (!res.ok) throw new AIUnavailableError(`AI proxy responded with ${res.status}`);
    const body: unknown = await res.json();
    if (typeof body !== "object" || body === null || typeof (body as { text?: unknown }).text !== "string") {
      throw new AIUnavailableError("AI proxy returned an unexpected response");
    }
    return { text: (body as { text: string }).text.trim() };
  }
}

/** Returns the configured provider, or null when AI is disabled (the default). */
export function getAIProvider(env: { NEXT_PUBLIC_AI_PROXY_URL?: string } = {
  NEXT_PUBLIC_AI_PROXY_URL: process.env.NEXT_PUBLIC_AI_PROXY_URL,
}): AIProvider | null {
  const url = env.NEXT_PUBLIC_AI_PROXY_URL?.trim();
  if (!url || !/^https:\/\//i.test(url)) return null;
  return new HttpProxyProvider(url);
}

export function isAIEnabled(): boolean {
  return getAIProvider() !== null;
}
