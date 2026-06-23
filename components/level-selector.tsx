"use client";

import { levelOptions, type Level } from "@/lib/i18n";
import { LocalizedText } from "@/components/localized-text";
import { useSettings } from "@/components/settings-provider";

const selectedLevelTone: Record<Level, string> = {
  beginner:
    "border-emerald-200 bg-emerald-500 text-white shadow-lg shadow-emerald-950/25",
  intermediate:
    "border-amber-200 bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/20",
  upperIntermediate:
    "border-orange-200 bg-orange-500 text-white shadow-lg shadow-orange-950/25",
  advanced:
    "border-rose-200 bg-rose-500 text-white shadow-lg shadow-rose-950/25",
};

export function LevelSelector() {
  const { level, setLevel, language } = useSettings();

  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-slate-300">
        <LocalizedText id="levelLabel" />
      </p>
      <div className="mx-auto mt-3 grid max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {levelOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setLevel(option.value)}
            className={`min-h-12 rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition sm:min-h-14 ${
              level === option.value
                ? selectedLevelTone[option.value]
                : "border-white/10 bg-white/[0.07] text-slate-200 hover:border-white/25 hover:bg-white/[0.12]"
            }`}
          >
            {option.labels[language]}
          </button>
        ))}
      </div>
    </div>
  );
}
