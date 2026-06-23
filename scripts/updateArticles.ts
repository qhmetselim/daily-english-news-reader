import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ArticleCategory =
  | "World"
  | "Economy"
  | "Sports"
  | "Technology"
  | "Science"
  | "Culture"
  | "Magazine";

type EnglishLevel =
  | "Beginner"
  | "Intermediate"
  | "Upper Intermediate"
  | "Advanced";

type FeedSource = {
  name: string;
  url: string;
  fallbackCategory: ArticleCategory;
};

type RssItem = {
  title: string;
  link: string;
  summary: string;
  source: string;
  publishedDate: string;
  fallbackCategory: ArticleCategory;
};

type EnrichedRssItem = RssItem & {
  content: string;
  paragraphs: string[];
};

type ArticleExerciseSet = {
  warmUpQuestions: string[];
  fillInTheBlanks: string[];
  trueFalse: { statement: string; answer: boolean }[];
  readingComprehension: string[];
  discussionQuestions: string[];
  summaryTask: string;
};

type OutputArticle = {
  id: string;
  title: string;
  link: string;
  summary: string;
  source: string;
  publishedDate: string;
  category: ArticleCategory;
  level: EnglishLevel;
  isFallback: boolean;
  readingTimeMinutes: number;
  content: string;
  paragraphs: string[];
  exercises: ArticleExerciseSet;
};

type FailedFeed = {
  name: string;
  url: string;
  reason: string;
};

const MAX_ARTICLES = 80;
const FEED_TIMEOUT_MS = 12_000;
const ARTICLE_TIMEOUT_MS = 12_000;
const MIN_FULL_TEXT_CHARS = 900;
const MIN_PARAGRAPH_COUNT = 4;
const OUTPUT_PATH = path.join(process.cwd(), "data", "articles.json");

const feeds: FeedSource[] = [
  {
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    fallbackCategory: "World",
  },
  {
    name: "BBC Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    fallbackCategory: "Economy",
  },
  {
    name: "BBC Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    fallbackCategory: "Technology",
  },
  {
    name: "BBC Science",
    url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    fallbackCategory: "Science",
  },
  {
    name: "The Guardian Sport",
    url: "https://www.theguardian.com/sport/rss",
    fallbackCategory: "Sports",
  },
  {
    name: "The Guardian Culture",
    url: "https://www.theguardian.com/culture/rss",
    fallbackCategory: "Culture",
  },
  {
    name: "The Guardian Lifestyle",
    url: "https://www.theguardian.com/lifeandstyle/rss",
    fallbackCategory: "Magazine",
  },
];

const categoryKeywords: Record<ArticleCategory, string[]> = {
  World: [
    "country",
    "city",
    "government",
    "election",
    "president",
    "minister",
    "war",
    "border",
    "global",
    "international",
  ],
  Economy: [
    "market",
    "business",
    "economy",
    "inflation",
    "bank",
    "trade",
    "price",
    "company",
    "tax",
    "jobs",
  ],
  Sports: [
    "football",
    "soccer",
    "basketball",
    "tennis",
    "match",
    "coach",
    "player",
    "cup",
    "league",
    "race",
  ],
  Technology: [
    "technology",
    "software",
    "app",
    "digital",
    "device",
    "data",
    "privacy",
    "robot",
    "internet",
    "cyber",
  ],
  Science: [
    "science",
    "research",
    "study",
    "climate",
    "space",
    "health",
    "energy",
    "species",
    "planet",
    "laboratory",
  ],
  Culture: [
    "film",
    "music",
    "museum",
    "book",
    "art",
    "artist",
    "festival",
    "theatre",
    "culture",
    "history",
  ],
  Magazine: [
    "life",
    "style",
    "travel",
    "food",
    "home",
    "family",
    "weekend",
    "fashion",
    "wellbeing",
    "recipe",
  ],
};

async function main() {
  console.log("Starting RSS article update...");
  console.log(`Fetching ${feeds.length} free RSS feeds.`);

  const feedResults = await Promise.allSettled(feeds.map(fetchFeed));
  const failedFeeds: FailedFeed[] = [];
  const items = feedResults.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value
      : collectFailure(result.reason, failedFeeds),
  );

  const seenUrls = new Set<string>();
  console.log(`Fetched ${items.length} raw RSS items.`);

  const uniqueItems = items
    .filter((item) => {
      const normalizedUrl = normalizeUrl(item.link);
      if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
        return false;
      }

      seenUrls.add(normalizedUrl);
      item.link = normalizedUrl;
      return Boolean(item.title && item.summary);
    })
    .slice(0, MAX_ARTICLES * 3);

  console.log(
    `Found ${uniqueItems.length} unique RSS items. Fetching full article text...`,
  );

  const enrichedItems: EnrichedRssItem[] = [];
  let checkedArticleCount = 0;

  for (const item of uniqueItems) {
    if (enrichedItems.length >= MAX_ARTICLES) {
      break;
    }

    checkedArticleCount += 1;
    const enrichedItem = await enrichWithFullText(item);

    if (enrichedItem) {
      enrichedItems.push(enrichedItem);
      console.log(
        `Added full article ${enrichedItems.length}/${MAX_ARTICLES}: ${item.title}`,
      );
    } else if (checkedArticleCount % 10 === 0) {
      console.log(
        `Checked ${checkedArticleCount}/${uniqueItems.length} article pages; kept ${enrichedItems.length}.`,
      );
    }
  }

  console.log(`Readable full articles: ${enrichedItems.length}.`);

  const articles = enrichedItems
    .map(toOutputArticle)
    .sort(
      (a, b) =>
        new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime(),
    )
    .slice(0, MAX_ARTICLES);
  const existingArticles = await readExistingArticles();
  const articlesToWrite =
    articles.length > 0 || existingArticles.length === 0
      ? articles
      : existingArticles.slice(0, MAX_ARTICLES);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        maxArticles: MAX_ARTICLES,
        articleCount: articlesToWrite.length,
        failedFeedCount: failedFeeds.length,
        failedFeeds,
        preservedExistingArticles: articles.length === 0 && articlesToWrite.length > 0,
        sources: feeds.map(({ name, url, fallbackCategory }) => ({
          name,
          url,
          category: fallbackCategory,
        })),
        articles: articlesToWrite,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Saved ${articlesToWrite.length} articles to ${OUTPUT_PATH}`);
  console.log(
    articles.length === 0 && articlesToWrite.length > 0
      ? "No fresh articles were fetched; existing articles were preserved."
      : `Fresh articles written: ${articles.length}`,
  );

  for (const failure of failedFeeds) {
    console.warn(`Feed skipped: ${failure.name} - ${failure.reason}`);
  }
}

async function readExistingArticles(): Promise<OutputArticle[]> {
  try {
    const file = await readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(file) as { articles?: OutputArticle[] };

    return Array.isArray(parsed.articles) ? parsed.articles : [];
  } catch {
    return [];
  }
}

async function fetchFeed(feed: FeedSource): Promise<RssItem[]> {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    console.log(`Fetching ${feed.name}...`);
    response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DailyEnglishNewsReader/1.0 (+educational RSS reader)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `timed out after ${FEED_TIMEOUT_MS / 1000}s`
        : error instanceof Error
          ? error.message
          : String(error);
    throw new Error(`Failed to fetch ${feed.name}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ${feed.name}: ${response.status}`);
  }

  const xml = await response.text();
  const itemBlocks = [
    ...[...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]),
    ...[...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]),
  ];

  console.log(`Fetched ${itemBlocks.length} items from ${feed.name}.`);

  return itemBlocks.map((block) => {
    const title = cleanText(readTag(block, "title"));
    const link = cleanText(
      readAtomLink(block) || readTag(block, "link") || readTag(block, "guid"),
    );
    const summary = cleanText(
      readTag(block, "description") ||
        readTag(block, "content:encoded") ||
        readTag(block, "summary") ||
        readTag(block, "content"),
    );
    const publishedDate = normalizeDate(
      cleanText(
        readTag(block, "pubDate") ||
          readTag(block, "dc:date") ||
          readTag(block, "published") ||
          readTag(block, "updated"),
      ),
    );

    return {
      title,
      link,
      summary,
      source: feed.name,
      publishedDate,
      fallbackCategory: feed.fallbackCategory,
    };
  });
}

function collectFailure(reason: unknown, failedFeeds: FailedFeed[]): RssItem[] {
  const message = reason instanceof Error ? reason.message : String(reason);
  const feed = feeds.find((candidate) => message.includes(candidate.name));

  failedFeeds.push({
    name: feed?.name ?? "Unknown feed",
    url: feed?.url ?? "",
    reason: message,
  });

  return [];
}

async function enrichWithFullText(item: RssItem): Promise<EnrichedRssItem | null> {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ARTICLE_TIMEOUT_MS);

  try {
    response = await fetch(item.link, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DailyEnglishNewsReader/1.0 (+educational RSS reader)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `timed out after ${ARTICLE_TIMEOUT_MS / 1000}s`
        : error instanceof Error
          ? error.message
          : String(error);

    console.warn(`Article skipped: ${item.title} - ${message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.warn(`Article skipped: ${item.title} - HTTP ${response.status}`);
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().includes("html")) {
    console.warn(`Article skipped: ${item.title} - not an HTML page`);
    return null;
  }

  const html = await response.text();
  const paragraphs = extractReadableParagraphs(html);
  const content = paragraphs.join("\n\n");

  if (!isReadableFullArticle(content, paragraphs)) {
    console.warn(`Article skipped: ${item.title} - full text was too short or noisy`);
    return null;
  }

  return {
    ...item,
    content,
    paragraphs,
  };
}

function readTag(xml: string, tagName: string): string {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<${escapedTag}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i");
  const match = xml.match(pattern);

  return match?.[1] ?? "";
}

function readAtomLink(xml: string): string {
  const alternateLink = xml.match(
    /<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*\/?>/i,
  );
  const anyLink = xml.match(/<link\b(?=[^>]*\bhref=["']([^"']+)["'])[^>]*\/?>/i);

  return alternateLink?.[1] ?? anyLink?.[1] ?? "";
}

function cleanText(value: string): string {
  return decodeHtml(value)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractReadableParagraphs(html: string): string[] {
  const withoutNoise = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<form\b[\s\S]*?<\/form>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, " ")
    .replace(/<dialog\b[\s\S]*?<\/dialog>/gi, " ")
    .replace(/<button\b[\s\S]*?<\/button>/gi, " ");
  const articleBlocks = [
    ...withoutNoise.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi),
  ].map((match) => match[1]);
  const mainBlocks = [
    ...withoutNoise.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi),
  ].map((match) => match[1]);
  const blocks = articleBlocks.length > 0 ? articleBlocks : mainBlocks;
  const candidateHtml = blocks.length > 0 ? blocks.join(" ") : withoutNoise;
  const paragraphMatches = [...candidateHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
  const seen = new Set<string>();
  const paragraphs: string[] = [];

  for (const match of paragraphMatches) {
    const paragraph = cleanText(match[1]);
    const normalized = paragraph.toLowerCase();

    if (
      paragraph.length < 70 ||
      looksLikeBoilerplate(paragraph) ||
      seen.has(normalized)
    ) {
      continue;
    }

    seen.add(normalized);
    paragraphs.push(paragraph);
  }

  return paragraphs;
}

function looksLikeBoilerplate(value: string): boolean {
  const normalized = value.toLowerCase();
  const boilerplatePatterns = [
    "sign in",
    "sign up",
    "log in",
    "login",
    "register",
    "create account",
    "subscribe",
    "subscription",
    "newsletter",
    "cookie",
    "privacy policy",
    "terms of service",
    "terms and conditions",
    "advertisement",
    "advertising",
    "all rights reserved",
    "share this",
    "follow us",
    "skip to content",
    "enable javascript",
    "already have an account",
    "forgot password",
    "accept cookies",
  ];

  if (boilerplatePatterns.some((pattern) => normalized.includes(pattern))) {
    return true;
  }

  const words = normalized.match(/[a-z]+/g) ?? [];
  const linkLikeWords = words.filter((word) =>
    ["click", "here", "menu", "home", "account", "email"].includes(word),
  ).length;

  return words.length > 0 && linkLikeWords / words.length > 0.25;
}

function isReadableFullArticle(content: string, paragraphs: string[]): boolean {
  if (
    content.length < MIN_FULL_TEXT_CHARS ||
    paragraphs.length < MIN_PARAGRAPH_COUNT ||
    looksLikeBoilerplate(content)
  ) {
    return false;
  }

  const averageParagraphLength =
    paragraphs.reduce((total, paragraph) => total + paragraph.length, 0) /
    Math.max(paragraphs.length, 1);

  return averageParagraphLength >= 120;
}

function decodeHtml(value: string): string {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return entities[entity.toLowerCase()] ?? `&${entity};`;
  });
}

function normalizeDate(value: string): string {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.searchParams.delete("utm_source");
    url.searchParams.delete("utm_medium");
    url.searchParams.delete("utm_campaign");
    url.searchParams.delete("utm_term");
    url.searchParams.delete("utm_content");
    return url.toString();
  } catch {
    return "";
  }
}

function toOutputArticle(item: EnrichedRssItem): OutputArticle {
  const text = `${item.title}. ${item.summary}. ${item.content}`;
  const category = categorize(text, item.fallbackCategory);
  const level = estimateLevel(text);

  return {
    id: slugify(`${item.source}-${item.title}`),
    title: item.title,
    link: item.link,
    summary: item.summary || createExcerpt(item.content),
    source: item.source,
    publishedDate: item.publishedDate,
    category,
    level,
    isFallback: false,
    readingTimeMinutes: estimateReadingTime(item.content),
    content: item.content,
    paragraphs: item.paragraphs,
    exercises: generateExercises(item.title, item.content, category),
  };
}

function categorize(text: string, fallbackCategory: ArticleCategory): ArticleCategory {
  const normalized = text.toLowerCase();
  const scores = Object.entries(categoryKeywords).map(([category, keywords]) => ({
    category: category as ArticleCategory,
    score: keywords.reduce(
      (total, keyword) =>
        total + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
      0,
    ),
  }));
  const best = scores.sort((a, b) => b.score - a.score)[0];

  return best && best.score > 0 ? best.category : fallbackCategory;
}

function estimateLevel(text: string): EnglishLevel {
  const words = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const averageWordLength =
    words.reduce((total, word) => total + word.length, 0) / Math.max(words.length, 1);
  const averageSentenceLength = words.length / Math.max(sentences.length, 1);
  const longWordRatio =
    words.filter((word) => word.length >= 10).length / Math.max(words.length, 1);
  const veryLongWordRatio =
    words.filter((word) => word.length >= 13).length / Math.max(words.length, 1);
  const score =
    averageSentenceLength * 0.55 +
    averageWordLength * 0.9 +
    longWordRatio * 65 +
    veryLongWordRatio * 90;

  if (score < 18) {
    return "Beginner";
  }

  if (score < 21) {
    return "Intermediate";
  }

  if (score < 23) {
    return "Upper Intermediate";
  }

  return "Advanced";
}

function estimateReadingTime(text: string): number {
  const wordCount = text.match(/\S+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(wordCount / 180));
}

function createExcerpt(text: string): string {
  const firstSentence = text.match(/^.{120,260}?[.!?](?:\s|$)/)?.[0]?.trim();

  if (firstSentence) {
    return firstSentence;
  }

  return `${text.slice(0, 220).trim()}...`;
}

function generateExercises(
  title: string,
  content: string,
  _category: ArticleCategory,
): ArticleExerciseSet {
  const sentences = extractSentences(content);
  const keywords = extractKeywords(`${title} ${content}`);
  const topic = keywords[0] ?? "the main issue";
  const secondTopic = keywords[1] ?? "the people in the story";
  const thirdTopic = keywords[2] ?? "the situation";
  const trueStatements = sentences.slice(0, 3).map(toStatement);

  return {
    warmUpQuestions: [
      `Before reading, what do you think might happen in an article titled "${title}"?`,
      `Which people, places, or problems do you expect this article to mention?`,
    ],
    fillInTheBlanks: [
      `The article is mainly about ______.`,
      `${capitalize(topic)} is important in this story because ______.`,
      `The article mentions ${secondTopic} to explain ______.`,
    ],
    trueFalse: [
      ...trueStatements.map((statement) => ({
        statement,
        answer: true,
      })),
      {
        statement: `The article says ${topic} is unrelated to the main events described.`,
        answer: false,
      },
      {
        statement: `The article says nothing in the situation affects people, places, or decisions.`,
        answer: false,
      },
    ],
    readingComprehension: [
      "What is the main idea of the article?",
      `What does the article say about ${topic}?`,
      `How is ${secondTopic} connected to the main story?`,
      "Which paragraph gives the most important detail, and why?",
    ],
    discussionQuestions: [
      `What is your opinion about the way the article presents ${topic}?`,
      `What question would you ask after reading the details about ${secondTopic}?`,
      `How might ${thirdTopic} change if the situation continues?`,
    ],
    summaryTask:
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
    "also",
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
    "says",
    "they",
    "what",
    "when",
    "where",
    "which",
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
    .slice(0, 6)
    .map(([word]) => word);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
