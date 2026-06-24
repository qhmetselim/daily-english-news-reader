import type { Article } from "@/lib/articles";

export const siteName = "Daily English News Reader";
export const siteDescription =
  "Read daily English news articles with level-based reading practice, vocabulary support, and comprehension exercises.";

const fallbackSiteUrl = "https://daily-english-news-reader.vercel.app";

export function getSiteUrl(): string {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    fallbackSiteUrl;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  return withProtocol.replace(/\/+$/, "");
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  return `${getSiteUrl()}${path}`;
}

export function articleUrl(article: Pick<Article, "slug">): string {
  return absoluteUrl(`/article/${article.slug}`);
}

export function articleDescription(
  article: Pick<Article, "summary" | "paragraphs">,
): string {
  return truncateDescription(article.summary || article.paragraphs.join(" "));
}

export function truncateDescription(value: string, maxLength = 155): string {
  const clean = value.replace(/\s+/g, " ").trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  const shortened = clean.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(" ");

  return `${shortened.slice(0, lastSpace > 80 ? lastSpace : shortened.length).trim()}...`;
}

export function getArticleImageUrl(article: Pick<Article, "imageUrl">): string {
  return absoluteUrl(article.imageUrl ?? "/study-newsroom.svg");
}
