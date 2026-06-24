"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArticleImage } from "@/components/article-image";
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
    <div className="mt-8 sm:mt-12">
      <div className="premium-shell rounded-[1.5rem] p-3 sm:rounded-[2rem] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
            className={`flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-4 py-2 shadow-sm transition sm:flex-nowrap sm:px-5 lg:w-auto lg:min-w-80 ${levelSelectTone[level]}`}
          >
            <span className="text-xs font-semibold uppercase opacity-75">
              <LocalizedText id="levelLabel" />
            </span>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value as typeof level)}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
            >
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.labels[language]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="-mx-3 mt-4 flex max-w-[calc(100%+1.5rem)] gap-2 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:max-w-[calc(100%+2rem)] sm:px-4 lg:mx-0 lg:max-w-full lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`min-h-11 flex-none rounded-full px-4 py-2 text-sm font-semibold transition ${
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

      <div className="mt-5 flex flex-col gap-1 px-1 text-sm text-slate-500 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {filteredArticles.length} <LocalizedText id="articlesFound" />
        </span>
        <span>
          <LocalizedText id="filteredByLevel" />
        </span>
      </div>

      {filteredArticles.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredArticles.map((article) => (
            <ArticleCard key={article.id} article={article} language={language} />
          ))}
        </div>
      ) : (
        <div className="premium-card mt-6 rounded-[1.5rem] border-dashed p-6 text-center sm:rounded-[2rem] sm:p-12">
          <h2 className="text-xl font-semibold text-slate-950 sm:text-2xl">
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
      href={`/article/${article.slug}`}
      className="premium-card group flex min-h-[26rem] flex-col overflow-hidden rounded-[1.5rem] p-0 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white sm:min-h-[28rem] sm:rounded-[1.75rem]"
    >
      <div className="relative overflow-hidden rounded-t-[1.5rem] sm:rounded-t-[1.75rem]">
        <ArticleImage
          category={article.category}
          imageUrl={article.imageUrl}
          hasUsableImage={article.hasUsableImage}
          title={article.title}
          usesFallbackImage={article.usesFallbackImage}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="aspect-video"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/65 to-transparent" />
        <span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow-lg shadow-slate-950/10 backdrop-blur sm:left-4 sm:top-4">
          {translations[language][categoryTranslationKeys[article.category]]}
        </span>
        <span
          className={`absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)] rounded-full px-3 py-1 text-xs font-semibold ring-1 backdrop-blur sm:bottom-4 sm:right-4 ${
            levelTone[article.level]
          }`}
        >
          {levelLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-6">
        {article.isFallback ? (
          <span className="mb-3 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            Demo
          </span>
        ) : null}
        <h3 className="text-lg font-semibold leading-7 text-slate-950 sm:text-xl">
          {article.title}
        </h3>
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
          {article.summary}
        </p>
        <div className="mt-6 border-t border-stone-200/90 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
            <span>{article.source}</span>
            <span>{article.readTime}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-slate-500">{article.publishedDate}</span>
            <span className="text-sm font-semibold text-blue-700 transition group-hover:translate-x-1">
              {translations[language].readPractice}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
