import { readFileSync } from "node:fs";
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
  slug: string;
  title: string;
  link: string;
  summary: string;
  source: string;
  publishedDate: string;
  imageUrl?: string;
  usesFallbackImage?: boolean;
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
  imageUrl?: string;
  usesFallbackImage?: boolean;
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

  return normalizeArticlesFile(data);
}

export function getArticlesSync(): Article[] {
  const file = readFileSync(articlesPath, "utf8");
  const data = JSON.parse(file) as ArticlesFile;

  return normalizeArticlesFile(data);
}

function normalizeArticlesFile(data: ArticlesFile): Article[] {
  const articles = (data.articles ?? [])
    .filter((article) => article.id && article.title && article.link)
    .map(normalizeArticle);

  return withUniqueSlugs(articles);
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  const articles = await getArticles();

  return articles.find((article) => article.id === id);
}

export async function getArticleBySlug(
  slug: string,
): Promise<Article | undefined> {
  const articles = await getArticles();

  return articles.find((article) => article.slug === slug || article.id === slug);
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
    slug: slugify(title),
    title,
    link: article.link ?? "#",
    summary,
    source: article.source ?? "RSS",
    publishedDate: article.publishedDate ?? new Date().toISOString(),
    imageUrl: normalizeImageUrl(article.imageUrl),
    usesFallbackImage: article.usesFallbackImage === true,
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

function withUniqueSlugs(articles: Article[]): Article[] {
  const counts = new Map<string, number>();

  return articles.map((article) => {
    const baseSlug = article.slug || slugify(article.title) || article.id;
    const count = counts.get(baseSlug) ?? 0;
    counts.set(baseSlug, count + 1);

    return {
      ...article,
      slug: count === 0 ? baseSlug : `${baseSlug}-${count + 1}`,
    };
  });
}

function normalizeImageUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
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
  content: string,
  _category: ArticleCategory,
): ArticleExerciseSet {
  const sentences = extractSentences(content);
  const keywords = extractKeywords(`${title} ${content}`);
  const topic = keywords[0] ?? "the main issue";
  const secondTopic = keywords[1] ?? "the people in the story";
  const thirdTopic = keywords[2] ?? "the situation";
  const generatedTrueFalse = [
    ...sentences.slice(0, 3).map((sentence) => ({
      statement: toStatement(sentence),
      answer: true,
    })),
    {
      statement: `The article says ${topic} is unrelated to the main events described.`,
      answer: false,
    },
    {
      statement:
        "The article says nothing in the situation affects people, places, or decisions.",
      answer: false,
    },
  ];

  return {
    warmUpQuestions: exercises?.warmUpQuestions?.length
      ? exercises.warmUpQuestions
      : [
          `Before reading, what do you think might happen in an article titled "${title}"?`,
          "Which people, places, or problems do you expect this article to mention?",
        ],
    fillInTheBlanks: exercises?.fillInTheBlanks?.length
      ? exercises.fillInTheBlanks
      : [
          "The article is mainly about ______.",
          `${topic} is important in this story because ______.`,
        ],
    trueFalse: exercises?.trueFalse?.length
      ? exercises.trueFalse
      : generatedTrueFalse,
    readingComprehension: exercises?.readingComprehension?.length
      ? exercises.readingComprehension
      : [
          "What is the main idea of the article?",
          `What does the article say about ${topic}?`,
          `How is ${secondTopic} connected to the main story?`,
          "Which paragraph gives the most important detail, and why?",
        ],
    discussionQuestions: exercises?.discussionQuestions?.length
      ? exercises.discussionQuestions
      : [
          `What is your opinion about the way the article presents ${topic}?`,
          `What question would you ask after reading the details about ${secondTopic}?`,
          `How might ${thirdTopic} change if the situation continues?`,
        ],
    summaryTask:
      exercises?.summaryTask ??
      "Write a three-sentence summary: one sentence for what happened, one for an important detail from the article, and one for why it matters.",
  };
}

function extractSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(
      (sentence) =>
        sentence.length >= 45 &&
        sentence.length <= 180 &&
        /[A-Za-z]/.test(sentence),
    )
    .slice(0, 8);
}

function toStatement(sentence: string): string {
  return sentence.replace(/[.!?]+$/, ".");
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
