"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { InterfaceLanguage, Level } from "@/lib/i18n";

type SettingsContextValue = {
  language: InterfaceLanguage;
  level: Level;
  setLanguage: (language: InterfaceLanguage) => void;
  setLevel: (level: Level) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

const languageStorageKey = "daily-news-reader-language";
const levelStorageKey = "daily-news-reader-level";
const supportedLanguages: InterfaceLanguage[] = [
  "en",
  "tr",
  "es",
  "fr",
  "de",
  "ar",
  "ru",
  "zh",
  "ja",
];
const supportedLevels: Level[] = [
  "beginner",
  "intermediate",
  "upperIntermediate",
  "advanced",
];

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<InterfaceLanguage>("tr");
  const [level, setLevelState] = useState<Level>("intermediate");

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(languageStorageKey);
    const savedLevel = window.localStorage.getItem(levelStorageKey);

    if (supportedLanguages.includes(savedLanguage as InterfaceLanguage)) {
      setLanguageState(savedLanguage as InterfaceLanguage);
    }

    if (supportedLevels.includes(savedLevel as Level)) {
      setLevelState(savedLevel as Level);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      level,
      setLanguage: (nextLanguage: InterfaceLanguage) => {
        setLanguageState(nextLanguage);
        window.localStorage.setItem(languageStorageKey, nextLanguage);
      },
      setLevel: (nextLevel: Level) => {
        setLevelState(nextLevel);
        window.localStorage.setItem(levelStorageKey, nextLevel);
      },
    }),
    [language, level],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }

  return context;
}
