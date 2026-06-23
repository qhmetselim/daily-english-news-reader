"use client";

import type { ArticleCategory } from "@/lib/articles";
import { translations, type TranslationKey } from "@/lib/i18n";
import { useSettings } from "@/components/settings-provider";

const categoryTranslationKeys: Record<ArticleCategory, TranslationKey> = {
  World: "world",
  Economy: "economy",
  Sports: "sports",
  Technology: "technology",
  Science: "science",
  Culture: "culture",
  Magazine: "magazine",
};

export function LocalizedCategory({ category }: { category: ArticleCategory }) {
  const { language } = useSettings();

  return translations[language][categoryTranslationKeys[category]];
}
