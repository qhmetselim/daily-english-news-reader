"use client";

import { levelOptions, type Level } from "@/lib/i18n";
import { useSettings } from "@/components/settings-provider";
import { LocalizedText } from "@/components/localized-text";

const levelBadgeTone: Record<Level, string> = {
  beginner: "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-900/10",
  intermediate: "border-amber-200 bg-amber-50 text-amber-800 shadow-amber-900/10",
  upperIntermediate: "border-orange-200 bg-orange-50 text-orange-800 shadow-orange-900/10",
  advanced: "border-rose-200 bg-rose-50 text-rose-800 shadow-rose-900/10",
};

export function LevelBadge() {
  const { level, language } = useSettings();
  const label =
    levelOptions.find((option) => option.value === level)?.labels[language] ??
    level;

  return (
    <div
      className={`w-full rounded-3xl border px-5 py-4 shadow-lg sm:w-auto sm:px-6 sm:py-5 ${levelBadgeTone[level]}`}
    >
      <p className="text-xs font-semibold uppercase opacity-70">
        <LocalizedText id="currentLevel" />
      </p>
      <p className="mt-2 text-xl font-semibold sm:text-2xl">{label}</p>
    </div>
  );
}
