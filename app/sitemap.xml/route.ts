import { getArticles } from "@/lib/articles";
import { absoluteUrl, articleUrl } from "@/lib/seo";

type SitemapEntry = {
  loc: string;
  lastmod: string;
  changefreq: "daily" | "weekly";
  priority: string;
};

export async function GET() {
  const articles = await getArticles();
  const now = new Date().toISOString();
  const entries: SitemapEntry[] = [
    {
      loc: absoluteUrl("/"),
      lastmod: now,
      changefreq: "daily",
      priority: "1.0",
    },
    {
      loc: absoluteUrl("/news"),
      lastmod: now,
      changefreq: "daily",
      priority: "0.9",
    },
    ...articles.map((article) => ({
      loc: articleUrl(article),
      lastmod: new Date(article.publishedDate).toISOString(),
      changefreq: "weekly" as const,
      priority: "0.8",
    })),
  ];

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    ),
    "</urlset>",
  ].join("\n");

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
