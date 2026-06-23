"use client";

import { languageOptions } from "@/lib/i18n";
import { LocalizedText } from "@/components/localized-text";
import { useSettings } from "@/components/settings-provider";

export function LanguageSelector() {
  const { language, setLanguage } = useSettings();

  return (
    <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-stone-200 bg-white/90 px-4 py-2 shadow-sm shadow-slate-900/5 sm:flex-none">
      <span className="hidden text-sm font-medium text-slate-500 sm:inline">
        <LocalizedText id="languageLabel" />
      </span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as typeof language)}
        className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none"
        aria-label="Interface language"
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
