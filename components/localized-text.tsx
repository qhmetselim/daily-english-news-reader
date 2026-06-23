"use client";

import { translations, type TranslationKey } from "@/lib/i18n";
import { useSettings } from "@/components/settings-provider";

export function LocalizedText({ id }: { id: TranslationKey }) {
  const { language } = useSettings();

  return translations[language][id];
}
