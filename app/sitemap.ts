import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/articles";
import { absoluteUrl, articleUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getArticles();
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/news"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...articles.map((article) => ({
      url: articleUrl(article),
      lastModified: new Date(article.publishedDate),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
