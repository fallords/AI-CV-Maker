"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Language } from "../cv-schema";
import { UI_LANG_KEY, readPreference, writePreference } from "../storage";
import en, { type Dictionary } from "./en";
import id from "./id";

export const dictionaries: Record<Language, Dictionary> = { en, id };

interface I18nValue {
  lang: Language;
  t: Dictionary;
  setLang: (lang: Language) => void;
}

const I18nContext = createContext<I18nValue>({ lang: "en", t: en, setLang: () => {} });

/** Replace {name} placeholders. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}

function detectInitial(): Language {
  const stored = readPreference(UI_LANG_KEY);
  if (stored === "en" || stored === "id") return stored;
  if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("id")) return "id";
  return "en";
}

export function I18nProvider({ children, initialLang }: { children: ReactNode; initialLang?: Language }) {
  // Static HTML is rendered in English; the stored/browser preference is applied after mount.
  const [lang, setLangState] = useState<Language>(initialLang ?? "en");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with browser-only preference after hydration
    if (!initialLang) setLangState(detectInitial());
  }, [initialLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    writePreference(UI_LANG_KEY, next);
  }, []);

  const value = useMemo(() => ({ lang, t: dictionaries[lang], setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
