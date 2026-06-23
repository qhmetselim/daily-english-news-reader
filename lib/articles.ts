import { readFile } from "node:fs/promises";
import path from "node:path";
import type { InterfaceLanguage, Level } from "@/lib/i18n";

export type ArticleCategory =
  | "World"
  | "Economy"
  | "Sports"
  | "Technology"
  | "Science"
  | "Culture"
  | "Magazine";

export type VocabularyItem = {
  word: string;
  meanings: Record<InterfaceLanguage, string>;
};

export type ArticleExerciseSet = {
  warmUpQuestions: string[];
  fillInTheBlanks: string[];
  trueFalse: { statement: string; answer: boolean }[];
  readingComprehension: string[];
  discussionQuestions: string[];
  summaryTask: string;
};

export type Article = {
  id: string;
  title: string;
  link: string;
  summary: string;
  source: string;
  publishedDate: string;
  category: ArticleCategory;
  level: Level;
  readTime: string;
  readingTimeMinutes: number;
  isFallback: boolean;
  paragraphs: string[];
  vocabulary: VocabularyItem[];
  exercises: ArticleExerciseSet;
};

type RawArticle = {
  id?: string;
  title?: string;
  link?: string;
  summary?: string;
  content?: string;
  paragraphs?: string[];
  source?: string;
  publishedDate?: string;
  category?: ArticleCategory;
  level?: string;
  readingTimeMinutes?: number;
  isFallback?: boolean;
  exercises?: Partial<ArticleExerciseSet>;
};

type ArticlesFile = {
  articles?: RawArticle[];
};

const articlesPath = path.join(process.cwd(), "data", "articles.json");

export async function getArticles(): Promise<Article[]> {
  const file = await readFile(articlesPath, "utf8");
  const data = JSON.parse(file) as ArticlesFile;

  return (data.articles ?? [])
    .filter((article) => article.id && article.title && article.link)
    .map(normalizeArticle);
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  const articles = await getArticles();

  return articles.find((article) => article.id === id);
}

function normalizeArticle(article: RawArticle): Article {
  const title = article.title ?? "Untitled article";
  const summary = article.summary ?? "";
  const content = article.content ?? summary;
  const paragraphs =
    article.paragraphs?.filter((paragraph) => paragraph.trim().length > 0) ??
    splitParagraphs(content);
  const category = article.category ?? "World";
  const readingTimeMinutes = article.readingTimeMinutes ?? estimateReadingTime(content);

  return {
    id: article.id ?? slugify(title),
    title,
    link: article.link ?? "#",
    summary,
    source: article.source ?? "RSS",
    publishedDate: article.publishedDate ?? new Date().toISOString(),
    category,
    level: normalizeLevel(article.level),
    readTime: `${readingTimeMinutes} min`,
    readingTimeMinutes,
    isFallback: article.isFallback === true,
    paragraphs,
    vocabulary: buildVocabulary(`${title} ${summary} ${content}`),
    exercises: normalizeExercises(article.exercises, title, content, category),
  };
}

function normalizeLevel(level: string | undefined): Level {
  const normalized = level?.toLowerCase().replace(/[\s_-]+/g, "");

  if (normalized === "beginner") {
    return "beginner";
  }

  if (normalized === "intermediate") {
    return "intermediate";
  }

  if (normalized === "upperintermediate") {
    return "upperIntermediate";
  }

  if (normalized === "advanced") {
    return "advanced";
  }

  return "intermediate";
}

function splitParagraphs(summary: string): string[] {
  const clean = summary.trim();

  if (!clean) {
    return [
      "This article does not include readable text yet. Run the article update again to fetch a full RSS article page.",
    ];
  }

  return clean
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function buildVocabulary(text: string): VocabularyItem[] {
  return extractKeywords(text)
    .slice(0, 3)
    .map((word) => ({
      word,
      meanings: {
        en: `A useful word from this article: "${word}".`,
        tr: `Bu makaleden faydalı bir kelime: "${word}".`,
        es: `Una palabra útil de este artículo: "${word}".`,
        fr: `Un mot utile de cet article : "${word}".`,
        de: `Ein nützliches Wort aus diesem Artikel: "${word}".`,
        ar: `كلمة مفيدة من هذا المقال: "${word}".`,
        ru: `Полезное слово из этой статьи: "${word}".`,
        zh: `本文中的有用词汇：“${word}”。`,
        ja: `この記事の重要語彙：「${word}」。`,
      },
    }));
}

function normalizeExercises(
  exercises: Partial<ArticleExerciseSet> | undefined,
  title: string,
  summary: string,
  category: ArticleCategory,
): ArticleExerciseSet {
  const keywords = extractKeywords(`${title} ${summary}`);
  const firstKeyword = keywords[0] ?? "the story";

  return {
    warmUpQuestions: exercises?.warmUpQuestions?.length
      ? exercises.warmUpQuestions
      : [`What do you know about ${category.toLowerCase()} news?`],
    fillInTheBlanks: exercises?.fillInTheBlanks?.length
      ? exercises.fillInTheBlanks
      : [`The article is mainly about ______.`, `${firstKeyword} is important because ______.`],
    trueFalse: exercises?.trueFalse?.length
      ? exercises.trueFalse
      : [
          {
            statement: `The article belongs to the ${category} category.`,
            answer: true,
          },
        ],
    readingComprehension: exercises?.readingComprehension?.length
      ? exercises.readingComprehension
      : ["What is the main idea of the article?"],
    discussionQuestions: exercises?.discussionQuestions?.length
      ? exercises.discussionQuestions
      : ["How would you explain this article to a friend?"],
    summaryTask:
      exercises?.summaryTask ??
      "Write a three-sentence summary with the main idea, one detail, and your reaction.",
  };
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "about",
    "after",
    "article",
    "from",
    "have",
    "into",
    "more",
    "news",
    "that",
    "their",
    "this",
    "will",
    "with",
  ]);
  const words = text
    .toLowerCase()
    .match(/[a-z]{4,}/g)
    ?.filter((word) => !stopWords.has(word));
  const counts = new Map<string, number>();

  for (const word of words ?? []) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

function estimateReadingTime(text: string): number {
  const wordCount = text.match(/\S+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(wordCount / 180));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
