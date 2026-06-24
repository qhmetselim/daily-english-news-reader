import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
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
  imageUrl?: string;
  imageSourceType?: ArticleImageSourceType;
  imageCandidates?: ImageCandidate[];
  usesFallbackImage?: boolean;
  hasUsableImage?: boolean;
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
  imageUrl?: string;
  imageSourceType: ArticleImageSourceType;
  hasUsableImage: boolean;
  usesFallbackImage?: boolean;
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

type ArticleImageSourceType =
  | "media"
  | "enclosure"
  | "og"
  | "twitter"
  | "structured"
  | "fallback";

type ImageCandidate = {
  url: string;
  source: Exclude<ArticleImageSourceType, "fallback">;
  priority?: number;
  width?: number;
  height?: number;
};

type ImageRunStats = {
  totalCandidates: number;
  usableRealImages: number;
  rejectedMissingImage: number;
  rejectedLowQualityImage: number;
  localizedImageCount: number;
  downloadedImageUrls: string[];
};

const CATEGORIES: ArticleCategory[] = [
  "World",
  "Economy",
  "Sports",
  "Technology",
  "Science",
  "Culture",
  "Magazine",
];
const ENGLISH_LEVELS: EnglishLevel[] = [
  "Beginner",
  "Intermediate",
  "Upper Intermediate",
  "Advanced",
];
const MIN_ARTICLES_PER_CATEGORY = 10;
const MIN_ARTICLES_PER_CATEGORY_LEVEL = 2;
const MAX_ARTICLES_PER_CATEGORY = 20;
const articleUpdateConfig = {
  targetFinalArticleCount: 100,
  candidateFetchMultiplier: 3,
  minimumImageWidth: 600,
  maximumFallbackUsage: 0,
} as const;
const MIN_TOTAL_ARTICLES = articleUpdateConfig.targetFinalArticleCount;
const CANDIDATE_ARTICLE_TARGET =
  articleUpdateConfig.targetFinalArticleCount *
  articleUpdateConfig.candidateFetchMultiplier;
const MAX_ARTICLES = CATEGORIES.length * MAX_ARTICLES_PER_CATEGORY;
const RECENT_ARTICLE_DAYS = 7;
const FEED_TIMEOUT_MS = 12_000;
const ARTICLE_TIMEOUT_MS = 12_000;
const MIN_FULL_TEXT_CHARS = 900;
const MIN_PARAGRAPH_COUNT = 4;
const OUTPUT_PATH = path.join(process.cwd(), "data", "articles.json");
const LOCAL_IMAGE_DIR = path.join(process.cwd(), "public", "article-images");
const LOCAL_IMAGE_PUBLIC_PATH = "/article-images";

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

const categoryFallbackImages: Record<ArticleCategory, string> = Object.fromEntries(
  CATEGORIES.map((category) => [
    category,
    createCategoryFallbackImage(category),
  ]),
) as Record<ArticleCategory, string>;

function createCategoryFallbackImage(category: ArticleCategory): string {
  return `/news-fallbacks/${slugify(category)}.svg`;
}

function isCategoryFallbackImage(value: string | undefined): boolean {
  return Boolean(
    value &&
      Object.values(categoryFallbackImages).some(
        (fallbackImage) => fallbackImage === value,
      ),
  );
}

function localImageExists(value: string | undefined): boolean {
  if (!value?.startsWith("/")) {
    return true;
  }

  return existsSync(path.join(process.cwd(), "public", value));
}

async function main() {
  console.log("Starting RSS article update...");
  console.log(`Fetching ${feeds.length} free RSS feeds.`);
  console.log(
    `Targeting ${articleUpdateConfig.targetFinalArticleCount} final articles from up to ${CANDIDATE_ARTICLE_TARGET} candidates.`,
  );

  const existingArticles = await readExistingArticles();
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
    .slice(0, CANDIDATE_ARTICLE_TARGET);

  console.log(
    `Found ${uniqueItems.length} unique RSS items. Fetching full article text...`,
  );

  const enrichedItems: EnrichedRssItem[] = [];
  let checkedArticleCount = 0;

  for (const item of uniqueItems) {
    if (enrichedItems.length >= CANDIDATE_ARTICLE_TARGET) {
      break;
    }

    checkedArticleCount += 1;
    const enrichedItem = await enrichWithFullText(item);

    if (enrichedItem) {
      enrichedItems.push(enrichedItem);
      console.log(
        `Added full article ${enrichedItems.length}/${CANDIDATE_ARTICLE_TARGET}: ${item.title}`,
      );
    } else if (checkedArticleCount % 10 === 0) {
      console.log(
        `Checked ${checkedArticleCount}/${uniqueItems.length} article pages; kept ${enrichedItems.length}.`,
      );
    }
  }

  console.log(`Readable full articles: ${enrichedItems.length}.`);

  const enrichedLinks = new Set(enrichedItems.map((item) => normalizeUrl(item.link)));
  const freshArticles = enrichedItems.map((item) =>
    keepStableArticleId(toOutputArticle(item), existingArticles),
  );
  const rssFallbackArticles = uniqueItems
    .filter((item) => !enrichedLinks.has(normalizeUrl(item.link)))
    .map(toRssFallbackArticle)
    .map((article) => keepStableArticleId(article, existingArticles));
  const candidateArticles = [...freshArticles, ...rssFallbackArticles];
  const localizedResult = await localizeArticleImages(candidateArticles);
  let articlesToWrite = balanceArticles(
    localizedResult.articles,
    existingArticles,
  );
  articlesToWrite = replaceRemainingFallbackImageArticles(articlesToWrite);
  articlesToWrite = limitFallbackUsage(articlesToWrite);
  articlesToWrite = topUpFinalArticlesWithRealImages(
    articlesToWrite,
    localizedResult.articles,
  );
  await removeUnusedDownloadedImages(
    localizedResult.stats.downloadedImageUrls,
    articlesToWrite,
  );
  const stats = getArticleStats(articlesToWrite);
  const finalImageStats = getFinalImageStats(articlesToWrite);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        maxArticles: articleUpdateConfig.targetFinalArticleCount,
        articleUpdateConfig,
        articleCount: articlesToWrite.length,
        failedFeedCount: failedFeeds.length,
        failedFeeds,
        preservedExistingArticles: articlesToWrite.some((article) =>
          existingArticles.some((existing) => existing.id === article.id),
        ),
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
  logImageRunStats(localizedResult.stats, finalImageStats);
  console.log(`Fresh readable articles considered: ${freshArticles.length}`);
  console.log(`RSS summary fallback articles considered: ${rssFallbackArticles.length}`);
  logArticleStats(stats);

  for (const failure of failedFeeds) {
    console.warn(`Feed skipped: ${failure.name} - ${failure.reason}`);
  }
}

async function readExistingArticles(): Promise<OutputArticle[]> {
  try {
    const file = await readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(file) as { articles?: OutputArticle[] };

    return Array.isArray(parsed.articles)
      ? parsed.articles.filter(isUsableArticle).map(normalizeOutputArticle)
      : [];
  } catch {
    return [];
  }
}

type ArticleStats = {
  total: number;
  byCategory: Map<ArticleCategory, number>;
  byLevel: Map<EnglishLevel, number>;
  byCategoryLevel: Map<string, number>;
  underfilledPairs: { category: ArticleCategory; level: EnglishLevel; count: number }[];
};

function keepStableArticleId(
  article: OutputArticle,
  existingArticles: OutputArticle[],
): OutputArticle {
  const normalizedUrl = normalizeUrl(article.link);
  const normalizedTitle = normalizeTitle(article.title);
  const existing = existingArticles.find(
    (candidate) =>
      normalizeUrl(candidate.link) === normalizedUrl ||
      normalizeTitle(candidate.title) === normalizedTitle,
  );

  return existing ? { ...article, id: existing.id } : article;
}

function balanceArticles(
  freshArticles: OutputArticle[],
  existingArticles: OutputArticle[],
): OutputArticle[] {
  const candidates = dedupeArticles([...freshArticles, ...existingArticles]);
  const selected: OutputArticle[] = [];
  const selectedIds = new Set<string>();

  for (const category of CATEGORIES) {
    for (const level of ENGLISH_LEVELS) {
      addBestCandidates(
        selected,
        selectedIds,
        candidates,
        (article) => article.category === category && article.level === level,
        MIN_ARTICLES_PER_CATEGORY_LEVEL,
      );
    }
  }

  for (const category of CATEGORIES) {
    addBestCandidates(
      selected,
      selectedIds,
      candidates,
      (article) => article.category === category,
      MIN_ARTICLES_PER_CATEGORY,
    );
  }

  addBestCandidates(
    selected,
    selectedIds,
    candidates,
    () => true,
    Math.min(MIN_TOTAL_ARTICLES, candidates.length),
  );

  return rebalanceCategoryLevels(selected).sort(compareByRecency);
}

function addBestCandidates(
  selected: OutputArticle[],
  selectedIds: Set<string>,
  candidates: OutputArticle[],
  matches: (article: OutputArticle) => boolean,
  targetCount: number,
) {
  let matchingSelectedCount = selected.filter(matches).length;

  if (matchingSelectedCount >= targetCount) {
    return;
  }

  for (const candidate of candidates) {
    if (matchingSelectedCount >= targetCount) {
      return;
    }

    if (
      selectedIds.has(candidate.id) ||
      !matches(candidate) ||
      getCategoryCount(selected, candidate.category) >= MAX_ARTICLES_PER_CATEGORY
    ) {
      continue;
    }

    selected.push(candidate);
    selectedIds.add(candidate.id);
    matchingSelectedCount += 1;
  }
}

function rebalanceCategoryLevels(articles: OutputArticle[]): OutputArticle[] {
  const balancedArticles = articles.map((article) => ({ ...article }));

  for (const category of CATEGORIES) {
    const categoryArticles = balancedArticles
      .filter((article) => article.category === category)
      .sort(compareByRecency);
    const targetPerLevel =
      categoryArticles.length >=
      ENGLISH_LEVELS.length * MIN_ARTICLES_PER_CATEGORY_LEVEL
        ? MIN_ARTICLES_PER_CATEGORY_LEVEL
        : 1;

    if (categoryArticles.length < ENGLISH_LEVELS.length) {
      continue;
    }

    for (const level of ENGLISH_LEVELS) {
      while (getLevelCount(categoryArticles, level) < targetPerLevel) {
        const donorLevel = ENGLISH_LEVELS
          .filter(
            (candidateLevel) =>
              getLevelCount(categoryArticles, candidateLevel) > targetPerLevel,
          )
          .sort(
            (a, b) =>
              getLevelCount(categoryArticles, b) - getLevelCount(categoryArticles, a),
          )[0];

        if (!donorLevel) {
          break;
        }

        const donorArticle = [...categoryArticles]
          .reverse()
          .find((article) => article.level === donorLevel);

        if (!donorArticle) {
          break;
        }

        donorArticle.level = level;
      }
    }
  }

  return balancedArticles;
}

function getLevelCount(articles: OutputArticle[], level: EnglishLevel): number {
  return articles.filter((article) => article.level === level).length;
}

function dedupeArticles(articles: OutputArticle[]): OutputArticle[] {
  const byUrl = new Map<string, OutputArticle>();

  for (const article of articles.filter(isUsableArticle).map(normalizeOutputArticle)) {
    const normalizedUrl = normalizeUrl(article.link);
    const existing = byUrl.get(normalizedUrl);

    if (!existing || compareArticleQuality(article, existing) < 0) {
      byUrl.set(normalizedUrl, article);
    }
  }

  const uniqueByTitle: OutputArticle[] = [];

  for (const article of [...byUrl.values()].sort(compareArticleQuality)) {
    if (
      uniqueByTitle.some((existing) =>
        areNearDuplicateTitles(article.title, existing.title),
      )
    ) {
      continue;
    }

    uniqueByTitle.push(article);
  }

  return uniqueByTitle.sort(compareArticleQuality);
}

function compareArticleQuality(a: OutputArticle, b: OutputArticle): number {
  const fullArticleDifference = Number(a.isFallback) - Number(b.isFallback);

  if (fullArticleDifference !== 0) {
    return fullArticleDifference;
  }

  const fallbackImageDifference =
    Number(!a.hasUsableImage || a.usesFallbackImage === true || !a.imageUrl) -
    Number(!b.hasUsableImage || b.usesFallbackImage === true || !b.imageUrl);

  if (fallbackImageDifference !== 0) {
    return fallbackImageDifference;
  }

  const imageSourceDifference =
    getArticleImageSourceScore(b.imageSourceType) -
    getArticleImageSourceScore(a.imageSourceType);

  if (imageSourceDifference !== 0) {
    return imageSourceDifference;
  }

  const recentDifference = Number(isRecentArticle(b)) - Number(isRecentArticle(a));

  if (recentDifference !== 0) {
    return recentDifference;
  }

  return compareByRecency(a, b);
}

function getArticleImageSourceScore(source: ArticleImageSourceType): number {
  const scores: Record<ArticleImageSourceType, number> = {
    media: 500,
    enclosure: 420,
    og: 360,
    twitter: 320,
    structured: 280,
    fallback: 0,
  };

  return scores[source];
}

function compareByRecency(a: OutputArticle, b: OutputArticle): number {
  return getPublishedTime(b) - getPublishedTime(a);
}

function getArticleStats(articles: OutputArticle[]): ArticleStats {
  const byCategory = new Map<ArticleCategory, number>();
  const byLevel = new Map<EnglishLevel, number>();
  const byCategoryLevel = new Map<string, number>();
  const underfilledPairs: ArticleStats["underfilledPairs"] = [];

  for (const category of CATEGORIES) {
    byCategory.set(category, 0);
  }

  for (const level of ENGLISH_LEVELS) {
    byLevel.set(level, 0);
  }

  for (const category of CATEGORIES) {
    for (const level of ENGLISH_LEVELS) {
      byCategoryLevel.set(getCategoryLevelKey(category, level), 0);
    }
  }

  for (const article of articles) {
    byCategory.set(article.category, (byCategory.get(article.category) ?? 0) + 1);
    byLevel.set(article.level, (byLevel.get(article.level) ?? 0) + 1);
    const key = getCategoryLevelKey(article.category, article.level);
    byCategoryLevel.set(key, (byCategoryLevel.get(key) ?? 0) + 1);
  }

  for (const category of CATEGORIES) {
    for (const level of ENGLISH_LEVELS) {
      const count = byCategoryLevel.get(getCategoryLevelKey(category, level)) ?? 0;

      if (count < MIN_ARTICLES_PER_CATEGORY_LEVEL) {
        underfilledPairs.push({ category, level, count });
      }
    }
  }

  return {
    total: articles.length,
    byCategory,
    byLevel,
    byCategoryLevel,
    underfilledPairs,
  };
}

function logArticleStats(stats: ArticleStats) {
  console.log(`Final article count: ${stats.total}`);
  console.log("Article count per category:");
  for (const category of CATEGORIES) {
    console.log(`- ${category}: ${stats.byCategory.get(category) ?? 0}`);
  }

  console.log("Article count per level:");
  for (const level of ENGLISH_LEVELS) {
    console.log(`- ${level}: ${stats.byLevel.get(level) ?? 0}`);
  }

  console.log("Article count per category-level pair:");
  for (const category of CATEGORIES) {
    for (const level of ENGLISH_LEVELS) {
      const key = getCategoryLevelKey(category, level);
      console.log(`- ${category} / ${level}: ${stats.byCategoryLevel.get(key) ?? 0}`);
    }
  }

  if (stats.underfilledPairs.length === 0) {
    console.log("Missing or underfilled category-level pairs: none");
    return;
  }

  console.log("Missing or underfilled category-level pairs:");
  for (const pair of stats.underfilledPairs) {
    console.log(
      `- ${pair.category} / ${pair.level}: ${pair.count}/${MIN_ARTICLES_PER_CATEGORY_LEVEL}`,
    );
  }
}

type FinalImageStats = {
  publishedArticles: number;
  realImageCount: number;
  fallbackImageCount: number;
  imageCoveragePercentage: number;
  byCategory: Map<
    ArticleCategory,
    { total: number; realImageCount: number; fallbackImageCount: number }
  >;
};

function getFinalImageStats(articles: OutputArticle[]): FinalImageStats {
  const byCategory: FinalImageStats["byCategory"] = new Map();

  for (const category of CATEGORIES) {
    byCategory.set(category, {
      total: 0,
      realImageCount: 0,
      fallbackImageCount: 0,
    });
  }

  for (const article of articles) {
    const categoryStats = byCategory.get(article.category) ?? {
      total: 0,
      realImageCount: 0,
      fallbackImageCount: 0,
    };

    categoryStats.total += 1;

    if (article.hasUsableImage && !article.usesFallbackImage) {
      categoryStats.realImageCount += 1;
    } else {
      categoryStats.fallbackImageCount += 1;
    }

    byCategory.set(article.category, categoryStats);
  }

  const realImageCount = articles.filter(
    (article) => article.hasUsableImage && !article.usesFallbackImage,
  ).length;
  const fallbackImageCount = articles.length - realImageCount;

  return {
    publishedArticles: articles.length,
    realImageCount,
    fallbackImageCount,
    imageCoveragePercentage:
      articles.length > 0 ? Math.round((realImageCount / articles.length) * 100) : 0,
    byCategory,
  };
}

function logImageRunStats(
  candidateStats: ImageRunStats,
  finalStats: FinalImageStats,
) {
  console.log("Image coverage report:");
  console.log(`- total candidate articles fetched: ${candidateStats.totalCandidates}`);
  console.log(
    `- total articles with usable real images: ${candidateStats.usableRealImages}`,
  );
  console.log(
    `- total rejected due to missing image: ${candidateStats.rejectedMissingImage}`,
  );
  console.log(
    `- total rejected due to low-quality image: ${candidateStats.rejectedLowQualityImage}`,
  );
  console.log(`- total final published articles: ${finalStats.publishedArticles}`);
  console.log(
    `- final published articles with real images: ${finalStats.realImageCount}`,
  );
  console.log(
    `- final published articles using fallback images: ${finalStats.fallbackImageCount}`,
  );
  console.log(`- image coverage percentage: ${finalStats.imageCoveragePercentage}%`);
  console.log("- per-category image coverage:");

  for (const category of CATEGORIES) {
    const categoryStats = finalStats.byCategory.get(category);
    const total = categoryStats?.total ?? 0;
    const realImageCount = categoryStats?.realImageCount ?? 0;
    const fallbackImageCount = categoryStats?.fallbackImageCount ?? 0;
    const coverage = total > 0 ? Math.round((realImageCount / total) * 100) : 0;
    console.log(
      `  - ${category}: ${realImageCount}/${total} real images (${coverage}%), ${fallbackImageCount} fallback`,
    );
  }
}

async function localizeArticleImages(
  articles: OutputArticle[],
): Promise<{ articles: OutputArticle[]; stats: ImageRunStats }> {
  await mkdir(LOCAL_IMAGE_DIR, { recursive: true });

  const localizedArticles: OutputArticle[] = [];
  const stats: ImageRunStats = {
    totalCandidates: articles.length,
    usableRealImages: 0,
    rejectedMissingImage: 0,
    rejectedLowQualityImage: 0,
    localizedImageCount: 0,
    downloadedImageUrls: [],
  };

  for (const article of articles) {
    if (
      article.hasUsableImage &&
      article.imageUrl?.startsWith("/") &&
      localImageExists(article.imageUrl)
    ) {
      stats.usableRealImages += 1;
      localizedArticles.push({
        ...article,
        usesFallbackImage: false,
        imageSourceType:
          article.imageSourceType === "fallback" ? "media" : article.imageSourceType,
      });
      continue;
    }

    if (!article.imageUrl || article.usesFallbackImage) {
      stats.rejectedMissingImage += 1;
      localizedArticles.push(withFallbackImage(article));
      continue;
    }

    const localizedImage = await downloadArticleImage(article);

    if (localizedImage.url) {
      stats.localizedImageCount += 1;
      stats.usableRealImages += 1;
      stats.downloadedImageUrls.push(localizedImage.url);
      localizedArticles.push({
        ...article,
        imageUrl: localizedImage.url,
        usesFallbackImage: false,
        hasUsableImage: true,
      });
      continue;
    }

    if (localizedImage.reason === "missing") {
      stats.rejectedMissingImage += 1;
    } else {
      stats.rejectedLowQualityImage += 1;
    }

    localizedArticles.push(withFallbackImage(article));
  }

  console.log(`Localized article images: ${stats.localizedImageCount}`);

  return {
    articles: removeUnneededFallbackImageArticles(localizedArticles),
    stats,
  };
}

function withFallbackImage(article: OutputArticle): OutputArticle {
  return {
    ...article,
    imageUrl: categoryFallbackImages[article.category],
    imageSourceType: "fallback",
    hasUsableImage: false,
    usesFallbackImage: true,
  };
}

function replaceRemainingFallbackImageArticles(
  articles: OutputArticle[],
): OutputArticle[] {
  const repairedArticles = articles.map((article) => ({ ...article }));

  for (const fallbackArticle of [...repairedArticles].filter(
    (article) => article.usesFallbackImage || !article.hasUsableImage,
  )) {
    const fallbackIndex = repairedArticles.findIndex(
      (article) => article.id === fallbackArticle.id,
    );

    if (fallbackIndex === -1) {
      continue;
    }

    const sameCategoryDonor = repairedArticles.find(
      (article) =>
        article.category === fallbackArticle.category &&
        article.hasUsableImage &&
        !article.usesFallbackImage &&
        article.imageUrl &&
        article.level !== fallbackArticle.level &&
        getCategoryLevelCount(repairedArticles, article.category, article.level) >
          MIN_ARTICLES_PER_CATEGORY_LEVEL,
    );

    if (sameCategoryDonor) {
      sameCategoryDonor.level = fallbackArticle.level;
      repairedArticles.splice(fallbackIndex, 1);
      continue;
    }

    const crossCategoryDonor = repairedArticles.find(
      (article) =>
        article.category !== fallbackArticle.category &&
        article.hasUsableImage &&
        !article.usesFallbackImage &&
        article.imageUrl &&
        getCategoryCount(repairedArticles, article.category) >
          MIN_ARTICLES_PER_CATEGORY &&
        getCategoryLevelCount(repairedArticles, article.category, article.level) >
          MIN_ARTICLES_PER_CATEGORY_LEVEL,
    );

    if (crossCategoryDonor) {
      crossCategoryDonor.category = fallbackArticle.category;
      crossCategoryDonor.level = fallbackArticle.level;
      repairedArticles.splice(fallbackIndex, 1);
    }
  }

  return topUpUnderfilledCategoriesWithRealImages(repairedArticles).sort(
    compareByRecency,
  );
}

function topUpUnderfilledCategoriesWithRealImages(
  articles: OutputArticle[],
): OutputArticle[] {
  const repairedArticles = articles.map((article) => ({ ...article }));

  for (const category of CATEGORIES) {
    while (getCategoryCount(repairedArticles, category) < MIN_ARTICLES_PER_CATEGORY) {
      const targetLevel = ENGLISH_LEVELS
        .map((level) => ({
          level,
          count: getCategoryLevelCount(repairedArticles, category, level),
        }))
        .sort((a, b) => a.count - b.count)[0]?.level;
      const donor = repairedArticles.find(
        (article) =>
          article.category !== category &&
          article.hasUsableImage &&
          !article.usesFallbackImage &&
          article.imageUrl &&
          getCategoryCount(repairedArticles, article.category) >
            MIN_ARTICLES_PER_CATEGORY &&
          getCategoryLevelCount(repairedArticles, article.category, article.level) >
            MIN_ARTICLES_PER_CATEGORY_LEVEL,
      );

      if (!donor || !targetLevel) {
        break;
      }

      donor.category = category;
      donor.level = targetLevel;
    }
  }

  return repairedArticles;
}

function limitFallbackUsage(articles: OutputArticle[]): OutputArticle[] {
  const fallbackLimit = articleUpdateConfig.maximumFallbackUsage;
  const prunedArticles = [...articles];

  for (const article of [...prunedArticles]
    .filter((candidate) => candidate.usesFallbackImage || !candidate.hasUsableImage)
    .sort(compareByRecency)) {
    const fallbackCount = prunedArticles.filter(
      (candidate) => candidate.usesFallbackImage || !candidate.hasUsableImage,
    ).length;

    if (fallbackCount <= fallbackLimit) {
      break;
    }

    const index = prunedArticles.findIndex((candidate) => candidate.id === article.id);

    if (index === -1) {
      continue;
    }

    const withoutArticle = [
      ...prunedArticles.slice(0, index),
      ...prunedArticles.slice(index + 1),
    ];

    if (canRemoveArticle(withoutArticle, article.category, article.level)) {
      prunedArticles.splice(index, 1);
    }
  }

  return prunedArticles;
}

function topUpFinalArticlesWithRealImages(
  articles: OutputArticle[],
  candidates: OutputArticle[],
): OutputArticle[] {
  const toppedUpArticles = [...articles];
  const selectedIds = new Set(toppedUpArticles.map((article) => article.id));

  for (const candidate of dedupeArticles(candidates)) {
    if (toppedUpArticles.length >= MIN_TOTAL_ARTICLES) {
      break;
    }

    if (
      selectedIds.has(candidate.id) ||
      !candidate.hasUsableImage ||
      candidate.usesFallbackImage ||
      !candidate.imageUrl ||
      getCategoryCount(toppedUpArticles, candidate.category) >=
        MAX_ARTICLES_PER_CATEGORY
    ) {
      continue;
    }

    toppedUpArticles.push(candidate);
    selectedIds.add(candidate.id);
  }

  return toppedUpArticles.sort(compareByRecency);
}

async function removeUnusedDownloadedImages(
  downloadedImageUrls: string[],
  finalArticles: OutputArticle[],
) {
  const finalImageUrls = new Set(
    finalArticles
      .map((article) => article.imageUrl)
      .filter((imageUrl): imageUrl is string =>
        Boolean(imageUrl?.startsWith(LOCAL_IMAGE_PUBLIC_PATH)),
      ),
  );
  let removedCount = 0;

  for (const imageUrl of new Set(downloadedImageUrls)) {
    if (
      finalImageUrls.has(imageUrl) ||
      !imageUrl.startsWith(`${LOCAL_IMAGE_PUBLIC_PATH}/`)
    ) {
      continue;
    }

    try {
      await unlink(path.join(LOCAL_IMAGE_DIR, path.basename(imageUrl)));
      removedCount += 1;
    } catch {
      continue;
    }
  }

  console.log(`Removed unused downloaded candidate images: ${removedCount}`);
}

function getCategoryLevelCount(
  articles: OutputArticle[],
  category: ArticleCategory,
  level: EnglishLevel,
): number {
  return articles.filter(
    (article) => article.category === category && article.level === level,
  ).length;
}

async function downloadArticleImage(
  article: OutputArticle,
): Promise<{ url: string | null; reason?: "missing" | "low-quality" }> {
  const imageUrl = article.imageUrl;

  if (!imageUrl) {
    return { url: null, reason: "missing" };
  }

  const urlQualityProblem = getImageUrlQualityProblem(imageUrl);

  if (urlQualityProblem) {
    return { url: null, reason: "low-quality" };
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "DailyEnglishNewsReader/1.0 (+educational RSS reader)",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*",
      },
    });

    if (!response.ok) {
      return { url: null, reason: "low-quality" };
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const extension = getImageExtension(contentType, imageUrl);

    if (!extension) {
      return { url: null, reason: "low-quality" };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const validationProblem = getDownloadedImageQualityProblem(buffer, imageUrl);

    if (validationProblem) {
      return { url: null, reason: "low-quality" };
    }

    const fileName = `${article.id}.${extension}`;
    await writeFile(path.join(LOCAL_IMAGE_DIR, fileName), buffer);

    return { url: `${LOCAL_IMAGE_PUBLIC_PATH}/${fileName}` };
  } catch {
    return { url: null, reason: "low-quality" };
  }
}

function getImageUrlQualityProblem(value: string): string | null {
  const normalized = normalizeImageUrl(value);

  if (!normalized) {
    return "missing";
  }

  if (hasSuspiciousLowResolutionPattern(normalized)) {
    return "suspicious low-resolution URL";
  }

  const dimensions = inferImageDimensions(normalized);
  const queryWidth = getImageQueryNumber(normalized, ["w", "width", "maxwidth"]);
  const queryHeight = getImageQueryNumber(normalized, ["h", "height", "maxheight"]);
  const width = dimensions?.width ?? queryWidth;
  const height = dimensions?.height ?? queryHeight;

  if (width && width < articleUpdateConfig.minimumImageWidth) {
    return "image URL width is too small";
  }

  if (height && height < 270) {
    return "image URL height is too small";
  }

  return null;
}

function getDownloadedImageQualityProblem(
  buffer: Buffer,
  imageUrl: string,
): string | null {
  if (buffer.length < 8_000) {
    return "image file is too small";
  }

  const dimensions = readImageDimensions(buffer) ?? inferImageDimensions(imageUrl);

  if (!dimensions) {
    return null;
  }

  if (dimensions.width < articleUpdateConfig.minimumImageWidth) {
    return "downloaded image width is too small";
  }

  if (dimensions.height < 270) {
    return "downloaded image height is too small";
  }

  const aspectRatio = dimensions.width / Math.max(dimensions.height, 1);

  if (aspectRatio < 0.75 || aspectRatio > 4.5) {
    return "downloaded image shape looks like an icon or banner";
  }

  return null;
}

function readImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  return (
    readPngDimensions(buffer) ??
    readJpegDimensions(buffer) ??
    readWebpDimensions(buffer)
  );
}

function readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (
    buffer.length < 24 ||
    buffer.toString("ascii", 1, 4) !== "PNG" ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (length < 2) {
      return null;
    }

    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
        0xcf,
      ].includes(marker)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function readWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = buffer.toString("ascii", 12, 16);

  if (chunkType === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunkType === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);

    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunkType === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  return null;
}

function getImageExtension(contentType: string, imageUrl: string): string | null {
  if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) {
    return "jpg";
  }

  if (contentType.includes("image/png")) {
    return "png";
  }

  if (contentType.includes("image/webp")) {
    return "webp";
  }

  if (contentType.includes("image/avif")) {
    return "avif";
  }

  const pathExtension = imageUrl
    .split("?")[0]
    .match(/\.([a-z0-9]+)$/i)?.[1]
    ?.toLowerCase();

  return ["jpg", "jpeg", "png", "webp", "avif"].includes(pathExtension ?? "")
    ? pathExtension === "jpeg"
      ? "jpg"
      : pathExtension ?? null
    : null;
}

function removeUnneededFallbackImageArticles(
  articles: OutputArticle[],
): OutputArticle[] {
  const prunedArticles = [...articles];

  for (const article of [...prunedArticles]
    .filter((candidate) => candidate.usesFallbackImage)
    .sort(compareByRecency)) {
    const index = prunedArticles.findIndex((candidate) => candidate.id === article.id);

    if (index === -1) {
      continue;
    }

    const withoutArticle = [
      ...prunedArticles.slice(0, index),
      ...prunedArticles.slice(index + 1),
    ];

    if (canRemoveArticle(withoutArticle, article.category, article.level)) {
      prunedArticles.splice(index, 1);
    }
  }

  return prunedArticles;
}

function canRemoveArticle(
  articles: OutputArticle[],
  category: ArticleCategory,
  level: EnglishLevel,
): boolean {
  const categoryCount = articles.filter((article) => article.category === category).length;
  const categoryLevelCount = articles.filter(
    (article) => article.category === category && article.level === level,
  ).length;

  return (
    articles.length >= MIN_TOTAL_ARTICLES &&
    categoryCount >= MIN_ARTICLES_PER_CATEGORY &&
    categoryLevelCount >= MIN_ARTICLES_PER_CATEGORY_LEVEL
  );
}

function getCategoryCount(articles: OutputArticle[], category: ArticleCategory): number {
  return articles.filter((article) => article.category === category).length;
}

function getCategoryLevelKey(category: ArticleCategory, level: EnglishLevel): string {
  return `${category}::${level}`;
}

function isUsableArticle(article: OutputArticle): boolean {
  return Boolean(article.id && article.title && normalizeUrl(article.link));
}

function normalizeOutputArticle(article: OutputArticle): OutputArticle {
  const content = article.content || article.summary || article.title;
  const category = normalizeCategory(article.category);
  const normalizedImageUrl = article.imageUrl
    ? normalizeImageUrl(article.imageUrl)
    : undefined;
  const hasRealImageUrl = Boolean(
    normalizedImageUrl &&
      !isCategoryFallbackImage(normalizedImageUrl) &&
      localImageExists(normalizedImageUrl),
  );
  const paragraphs =
    article.paragraphs?.filter((paragraph) => paragraph.trim().length > 0) ??
    content
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

  return {
    ...article,
    link: normalizeUrl(article.link),
    imageUrl: hasRealImageUrl ? normalizedImageUrl : categoryFallbackImages[category],
    imageSourceType:
      article.imageSourceType &&
      article.imageSourceType !== "fallback" &&
      hasRealImageUrl
        ? article.imageSourceType
        : hasRealImageUrl
          ? "media"
          : "fallback",
    hasUsableImage: hasRealImageUrl && article.usesFallbackImage !== true,
    usesFallbackImage:
      article.usesFallbackImage === true ||
      !hasRealImageUrl,
    category,
    level: normalizeEnglishLevel(article.level),
    publishedDate: normalizeDate(article.publishedDate),
    isFallback: article.isFallback === true,
    content,
    paragraphs,
    readingTimeMinutes: article.readingTimeMinutes || estimateReadingTime(content),
    exercises: article.exercises ?? generateExercises(article.title, content, category),
  };
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
    const imageCandidates = extractRssImageCandidates(block);
    const imageCandidate = chooseBestImageCandidate(imageCandidates);

    return {
      title,
      link,
      summary,
      source: feed.name,
      publishedDate,
      imageUrl: imageCandidate?.url,
      imageSourceType: imageCandidate?.source,
      imageCandidates,
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
  const imageCandidates = [
    ...(item.imageCandidates ?? []),
    ...extractHtmlImageCandidates(html, item.link),
  ];
  const imageCandidate = chooseBestImageCandidate(imageCandidates);

  if (!isReadableFullArticle(content, paragraphs)) {
    console.warn(`Article skipped: ${item.title} - full text was too short or noisy`);
    return null;
  }

  return {
    ...item,
    imageUrl: imageCandidate?.url,
    imageSourceType: imageCandidate?.source,
    imageCandidates,
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

function extractRssImageCandidates(xml: string): ImageCandidate[] {
  return [
    ...readImageTagCandidates(xml, "media:content", "media", 600),
    ...readImageTagCandidates(xml, "media:thumbnail", "media", 550),
    ...readImageTagCandidates(xml, "enclosure", "enclosure", 500),
  ];
}

function extractHtmlImageCandidates(html: string, pageUrl: string): ImageCandidate[] {
  return [
    ...readMetaContentValues(html, ["og:image", "og:image:url", "og:image:secure_url"])
      .map((url) => ({
        url: resolveUrl(url, pageUrl),
        source: "og" as const,
        priority: 400,
      })),
    ...readMetaContentValues(html, ["twitter:image", "twitter:image:src"]).map(
      (url) => ({
        url: resolveUrl(url, pageUrl),
        source: "twitter" as const,
        priority: 350,
      }),
    ),
    ...extractStructuredImageCandidates(html, pageUrl),
  ];
}

function readImageTagCandidates(
  xml: string,
  tagName: string,
  source: ImageCandidate["source"],
  priority: number,
): ImageCandidate[] {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tags = xml.match(new RegExp(`<${escapedTag}\\b[^>]*>`, "gi")) ?? [];

  return tags
    .map((tag) => ({
      url: cleanText(readHtmlAttribute(tag, "url")),
      source,
      priority,
      width: readPositiveIntegerAttribute(tag, "width"),
      height: readPositiveIntegerAttribute(tag, "height"),
    }))
    .filter((candidate) => Boolean(candidate.url));
}

function readPositiveIntegerAttribute(
  tag: string,
  attributeName: string,
): number | undefined {
  const value = Number(readHtmlAttribute(tag, attributeName));

  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function extractStructuredImageCandidates(
  html: string,
  pageUrl: string,
): ImageCandidate[] {
  const scriptBlocks = [
    ...html.matchAll(
      /<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  const candidates: ImageCandidate[] = [];

  for (const scriptBlock of scriptBlocks) {
    const json = decodeHtml(scriptBlock[1]).trim();

    try {
      collectStructuredImages(JSON.parse(json), pageUrl, candidates);
    } catch {
      continue;
    }
  }

  return candidates.sort(compareImageCandidates);
}

function collectStructuredImages(
  value: unknown,
  pageUrl: string,
  candidates: ImageCandidate[],
) {
  if (!value) {
    return;
  }

  if (typeof value === "string") {
    const url = resolveUrl(value, pageUrl);

    if (url) {
      candidates.push({ url, source: "structured", priority: 300 });
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStructuredImages(item, pageUrl, candidates);
    }

    return;
  }

  if (typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  const structuredType = Array.isArray(record["@type"])
    ? record["@type"].join(" ")
    : String(record["@type"] ?? "");
  const directImageUrl = record.contentUrl ?? record.url;

  if (
    typeof directImageUrl === "string" &&
    /image/i.test(structuredType + String(record.encodingFormat ?? ""))
  ) {
    candidates.push({
      url: resolveUrl(directImageUrl, pageUrl),
      source: "structured",
      priority: 300,
      width: readStructuredNumber(record.width),
      height: readStructuredNumber(record.height),
    });
  }

  const imageValue = record.image ?? record.thumbnailUrl ?? record.primaryImageOfPage;

  if (imageValue) {
    const beforeCount = candidates.length;
    collectStructuredImages(imageValue, pageUrl, candidates);
    const width = typeof record.width === "number" ? record.width : undefined;
    const height = typeof record.height === "number" ? record.height : undefined;

    for (const candidate of candidates.slice(beforeCount)) {
      candidate.width ??= width;
      candidate.height ??= height;
    }
  }

  for (const key of ["@graph", "mainEntity", "itemListElement"]) {
    collectStructuredImages(record[key], pageUrl, candidates);
  }
}

function readStructuredNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));

    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    return readStructuredNumber(record.value);
  }

  return undefined;
}

function readMetaContentValues(html: string, names: string[]): string[] {
  const values: string[] = [];
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const wantedNames = new Set(names.map((name) => name.toLowerCase()));

  for (const tag of metaTags) {
    const name =
      readHtmlAttribute(tag, "property") || readHtmlAttribute(tag, "name");
    const content = readHtmlAttribute(tag, "content");

    if (name && content && wantedNames.has(name.toLowerCase())) {
      values.push(content);
    }
  }

  return values;
}

function readHtmlAttribute(tag: string, attributeName: string): string {
  const escapedAttribute = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`\\b${escapedAttribute}=["']([^"']+)["']`, "i"),
  );

  return cleanText(match?.[1] ?? "");
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

function resolveUrl(value: string, baseUrl: string): string {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function chooseBestImageCandidate(
  candidates: ImageCandidate[],
): ImageCandidate | undefined {
  const normalizedCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      url: normalizeImageUrl(upgradeLowResolutionImageUrl(candidate.url)),
    }))
    .filter(
      (candidate) =>
        candidate.url &&
        !getImageUrlQualityProblem(candidate.url) &&
        !isVeryLowQualityImageUrl(candidate.url),
    );

  return normalizedCandidates.sort(compareImageCandidates)[0];
}

function compareImageCandidates(a: ImageCandidate, b: ImageCandidate): number {
  return getImageCandidateScore(b) - getImageCandidateScore(a);
}

function getImageCandidateScore(candidate: ImageCandidate): number {
  const sourceScore: Record<ImageCandidate["source"], number> = {
    media: 500,
    enclosure: 420,
    og: 360,
    twitter: 320,
    structured: 280,
  };
  const dimensions = inferImageDimensions(candidate.url);
  const candidateWidth = candidate.width ?? dimensions?.width;
  const candidateHeight = candidate.height ?? dimensions?.height;
  const dimensionScore =
    candidateWidth && candidateHeight
    ? Math.min(candidateWidth, 1600) + Math.min(candidateHeight, 900)
    : 0;
  const queryWidth = getImageQueryNumber(candidate.url, [
    "w",
    "width",
    "maxwidth",
  ]);
  const queryHeight = getImageQueryNumber(candidate.url, [
    "h",
    "height",
    "maxheight",
  ]);
  const queryDimensionScore =
    Math.min(queryWidth ?? 0, 1600) + Math.min(queryHeight ?? 0, 900);
  const lowQualityPenalty = hasLowResolutionPattern(candidate.url) ? 220 : 0;
  const portraitPenalty =
    candidateWidth && candidateHeight && candidateWidth / candidateHeight < 1.2
      ? 140
      : 0;

  return (
    (candidate.priority ?? sourceScore[candidate.source]) +
    dimensionScore / 4 +
    queryDimensionScore -
    lowQualityPenalty -
    portraitPenalty
  );
}

function getImageQueryNumber(value: string, keys: string[]): number | null {
  try {
    const url = new URL(decodeHtml(value));

    for (const key of keys) {
      const number = Number(url.searchParams.get(key));

      if (Number.isFinite(number) && number > 0) {
        return number;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeImageUrl(value: string): string {
  const trimmedValue = decodeHtml(value).trim();

  if (trimmedValue.startsWith("/")) {
    return trimmedValue;
  }

  try {
    const url = new URL(
      trimmedValue.startsWith("//") ? `https:${trimmedValue}` : trimmedValue,
    );
    const path = url.pathname.toLowerCase();
    const hasImageExtension = /\.(avif|gif|jpe?g|png|webp)$/i.test(path);
    const looksLikeImageCdn =
      path.includes("/image") ||
      url.searchParams.has("format") ||
      url.searchParams.has("width") ||
      url.searchParams.has("w");

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    if (!hasImageExtension && !looksLikeImageCdn) {
      return "";
    }

    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function upgradeLowResolutionImageUrl(value: string): string {
  const trimmedValue = decodeHtml(value).trim();

  try {
    const url = new URL(
      trimmedValue.startsWith("//") ? `https:${trimmedValue}` : trimmedValue,
    );

    if (url.hostname === "i.guim.co.uk" && url.pathname.includes("/master/")) {
      return url.toString();
    }

    url.pathname = url.pathname.replace(
      /(?:^|[-_/])(?:150x150|300x\d+|\d+x300)(?=$|[-_.\/])/gi,
      (match) => match.replace(/150x150|300x\d+|\d+x300/i, "1200x675"),
    );

    for (const key of ["w", "width", "maxwidth"]) {
      if (url.searchParams.has(key)) {
        const width = Number(url.searchParams.get(key));

        if (Number.isFinite(width) && width < 1000) {
          url.searchParams.set(key, "1200");
        }
      }
    }

    for (const key of ["h", "height", "maxheight"]) {
      if (url.searchParams.has(key)) {
        const height = Number(url.searchParams.get(key));

        if (Number.isFinite(height) && height < 675) {
          url.searchParams.set(key, "675");
        }
      }
    }

    for (const key of ["size", "variant"]) {
      const size = url.searchParams.get(key);

      if (size && /^(thumb|thumbnail|small)$/i.test(size)) {
        url.searchParams.set(key, "large");
      }
    }

    return url.toString();
  } catch {
    return trimmedValue;
  }
}

function hasLowResolutionPattern(value: string): boolean {
  return /(?:thumbnail|thumb|small|150x150|300x\d+|\d+x300)/i.test(value);
}

function hasSuspiciousLowResolutionPattern(value: string): boolean {
  return /(?:thumbnail|thumb|small|icon|logo|avatar|150x150|120x120|64x64|300x\d+|\d+x300)/i.test(
    value,
  );
}

function isVeryLowQualityImageUrl(value: string): boolean {
  const dimensions = inferImageDimensions(value);

  return (
    hasLowResolutionPattern(value) &&
    Boolean(dimensions && (dimensions.width < 480 || dimensions.height < 270))
  );
}

function inferImageDimensions(value: string): { width: number; height: number } | null {
  const match = value.match(/(?:^|[^\d])(\d{2,4})x(\d{2,4})(?:[^\d]|$)/i);

  if (!match) {
    return null;
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&[a-z0-9#]+;/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|and|or|but|to|of|in|on|for|with|from|by)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function areNearDuplicateTitles(a: string, b: string): boolean {
  const first = normalizeTitle(a);
  const second = normalizeTitle(b);

  if (!first || !second) {
    return false;
  }

  if (first === second || first.includes(second) || second.includes(first)) {
    return true;
  }

  const firstWords = new Set(first.split(" ").filter((word) => word.length > 2));
  const secondWords = new Set(second.split(" ").filter((word) => word.length > 2));
  const sharedWords = [...firstWords].filter((word) => secondWords.has(word)).length;
  const unionWords = new Set([...firstWords, ...secondWords]).size;

  return unionWords > 0 && sharedWords / unionWords >= 0.82;
}

function isRecentArticle(article: OutputArticle): boolean {
  const publishedTime = getPublishedTime(article);
  const recentCutoff = Date.now() - RECENT_ARTICLE_DAYS * 24 * 60 * 60 * 1000;

  return publishedTime >= recentCutoff;
}

function getPublishedTime(article: OutputArticle): number {
  const time = new Date(article.publishedDate).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function normalizeCategory(value: ArticleCategory | string | undefined): ArticleCategory {
  return CATEGORIES.find((category) => category === value) ?? "World";
}

function normalizeEnglishLevel(value: EnglishLevel | string | undefined): EnglishLevel {
  const normalized = value?.toLowerCase().replace(/[\s_-]+/g, "");

  if (normalized === "beginner") {
    return "Beginner";
  }

  if (normalized === "intermediate") {
    return "Intermediate";
  }

  if (normalized === "upperintermediate") {
    return "Upper Intermediate";
  }

  if (normalized === "advanced") {
    return "Advanced";
  }

  return "Intermediate";
}

function toOutputArticle(item: EnrichedRssItem): OutputArticle {
  const text = `${item.title}. ${item.summary}. ${item.content}`;
  const category = item.fallbackCategory;
  const level = estimateLevel(text);
  const imageUrl = item.imageUrl ?? categoryFallbackImages[category];
  const hasUsableImage = Boolean(item.imageUrl);

  return {
    id: slugify(`${item.source}-${item.title}`),
    title: item.title,
    link: item.link,
    summary: item.summary || createExcerpt(item.content),
    source: item.source,
    publishedDate: item.publishedDate,
    imageUrl,
    imageSourceType: item.imageSourceType ?? (hasUsableImage ? "media" : "fallback"),
    hasUsableImage,
    usesFallbackImage: !hasUsableImage,
    category,
    level,
    isFallback: false,
    readingTimeMinutes: estimateReadingTime(item.content),
    content: item.content,
    paragraphs: item.paragraphs,
    exercises: generateExercises(item.title, item.content, category),
  };
}

function toRssFallbackArticle(item: RssItem): OutputArticle {
  const category = item.fallbackCategory;
  const content =
    item.summary ||
    `This RSS item is available from ${item.source}. Open the original source to read the full article.`;
  const imageUrl = item.imageUrl ?? categoryFallbackImages[category];
  const hasUsableImage = Boolean(item.imageUrl);

  return {
    id: slugify(`${item.source}-${item.title}`),
    title: item.title,
    link: item.link,
    summary: item.summary || createExcerpt(content),
    source: item.source,
    publishedDate: item.publishedDate,
    imageUrl,
    imageSourceType: item.imageSourceType ?? (hasUsableImage ? "media" : "fallback"),
    hasUsableImage,
    usesFallbackImage: !hasUsableImage,
    category,
    level: estimateLevel(`${item.title}. ${content}`),
    isFallback: true,
    readingTimeMinutes: estimateReadingTime(content),
    content,
    paragraphs: splitContentParagraphs(content),
    exercises: generateExercises(item.title, content, category),
  };
}

function categorize(text: string, fallbackCategory: ArticleCategory): ArticleCategory {
  const normalized = text.toLowerCase();
  const scores = Object.entries(categoryKeywords).map(([category, keywords]) => ({
    category: category as ArticleCategory,
    score:
      keywords.reduce(
        (total, keyword) =>
          total + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
        0,
      ) + (category === fallbackCategory ? 2 : 0),
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

function splitContentParagraphs(content: string): string[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [content];
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
