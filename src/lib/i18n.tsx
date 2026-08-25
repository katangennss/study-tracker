import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { en } from "./translations/en";
import { hy } from "./translations/hy";

export type Language = "en" | "hy";
export type TranslationKey = keyof typeof en;

const DICTS: Record<Language, Record<string, string>> = { en, hy };
const STORAGE_KEY = "language";

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

function getStoredLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "hy" ? "hy" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  function t(key: TranslationKey, vars?: Record<string, string | number>) {
    let str = DICTS[language][key] ?? DICTS.en[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{{${k}}}`, String(v));
      });
    }
    return str;
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
