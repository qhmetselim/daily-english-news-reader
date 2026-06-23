"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Article, ArticleCategory } from "@/lib/articles";
import {
  levelOptions,
  translations,
  type InterfaceLanguage,
  type TranslationKey,
} from "@/lib/i18n";
import { LocalizedText } from "@/components/localized-text";
import { useSettings } from "@/components/settings-provider";

const categories: ("All" | ArticleCategory)[] = [
  "All",
  "World",
  "Economy",
  "Sports",
  "Technology",
  "Science",
  "Culture",
  "Magazine",
];

const categoryTranslationKeys: Record<"All" | ArticleCategory, TranslationKey> = {
  All: "all",
  World: "world",
  Economy: "economy",
  Sports: "sports",
  Technology: "technology",
  Science: "science",
  Culture: "culture",
  Magazine: "magazine",
};

const levelTone = {
  beginner: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  intermediate: "bg-amber-50 text-amber-700 ring-amber-200",
  upperIntermediate: "bg-orange-50 text-orange-700 ring-orange-200",
  advanced: "bg-rose-50 text-rose-700 ring-rose-200",
};

const levelSelectTone = {
  beginner: "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-900/10",
  intermediate: "border-amber-200 bg-amber-50 text-amber-800 shadow-amber-900/10",
  upperIntermediate: "border-orange-200 bg-orange-50 text-orange-800 shadow-orange-900/10",
  advanced: "border-rose-200 bg-rose-50 text-rose-800 shadow-rose-900/10",
};

export function NewsExplorer({ articles }: { articles: Article[] }) {
  const [category, setCategory] = useState<"All" | ArticleCategory>("All");
  const [query, setQuery] = useState("");
  const { level, setLevel, language } = useSettings();

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesCategory = category === "All" || article.category === category;
      const matchesLevel = article.level === level;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        article.title.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesLevel && matchesSearch;
    });
  }, [articles, category, level, query]);

  return (
    <div className="mt-12">
      <div className="premium-shell rounded-[2rem] p-4">
        <div className="flex items-center gap-3">
          <label className="relative flex-1">
            <span className="sr-only">
              <LocalizedText id="searchArticles" />
            </span>
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
              ⌕
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={translations[language].searchArticles}
              className="h-14 w-full rounded-2xl border border-stone-200 bg-white/75 pl-12 pr-5 text-base font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100/80"
            />
          </label>

          <label
            className={`flex h-14 min-w-80 items-center gap-3 rounded-2xl border px-5 shadow-sm transition ${levelSelectTone[level]}`}
          >
            <span className="text-xs font-semibold uppercase opacity-75">
              <LocalizedText id="levelLabel" />
            </span>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value as typeof level)}
              className="flex-1 bg-transparent text-sm font-semibold outline-none"
            >
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.labels[language]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === item
                  ? "bg-blue-700 text-white shadow-lg shadow-blue-900/15"
                  : "bg-white/70 text-slate-600 shadow-sm shadow-slate-900/5 hover:bg-white hover:text-slate-950"
              }`}
            >
              {translations[language][categoryTranslationKeys[item]]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between px-1 text-sm text-slate-500">
        <span>
          {filteredArticles.length} <LocalizedText id="articlesFound" />
        </span>
        <span>
          <LocalizedText id="filteredByLevel" />
        </span>
      </div>

      {filteredArticles.length > 0 ? (
        <div className="mt-6 grid grid-cols-3 gap-5">
          {filteredArticles.map((article) => (
            <ArticleCard key={article.id} article={article} language={language} />
          ))}
        </div>
      ) : (
        <div className="premium-card mt-6 rounded-[2rem] border-dashed p-12 text-center">
          <h2 className="text-2xl font-semibold text-slate-950">
            <LocalizedText id="noArticles" />
          </h2>
          <p className="mt-3 text-slate-500">
            <LocalizedText id="tryDifferentFilters" />
          </p>
        </div>
      )}
    </div>
  );
}

function ArticleCard({
  article,
  language,
}: {
  article: Article;
  language: InterfaceLanguage;
}) {
  const levelLabel =
    levelOptions.find((option) => option.value === article.level)?.labels[
      language
    ] ?? article.level;

  return (
    <Link
      href={`/article/${article.id}`}
      className="premium-card group flex h-80 flex-col rounded-[1.75rem] p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {translations[language][categoryTranslationKeys[article.category]]}
          </span>
          {article.isFallback ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              Demo
            </span>
          ) : null}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            levelTone[article.level]
          }`}
        >
          {levelLabel}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-semibold leading-7 text-slate-950">
        {article.title}
      </h3>
      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
        {article.summary}
      </p>
      <div className="mt-6 border-t border-stone-200/90 pt-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>{article.source}</span>
          <span>{article.readTime}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">{article.publishedDate}</span>
          <span className="text-sm font-semibold text-blue-700 transition group-hover:translate-x-1">
            {translations[language].readPractice}
          </span>
        </div>
      </div>
    </Link>
  );
}
