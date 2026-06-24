import { getArticlesSync } from "@/lib/articles";
import { absoluteUrl, articleUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeDate(value?: string) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function urlEntry({
  loc,
  lastmod,
  changefreq,
  priority,
}: {
  loc: string;
  lastmod: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
}) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  const articles = getArticlesSync();
  const now = new Date().toISOString();

  const entries = [
    urlEntry({
      loc: absoluteUrl("/"),
      lastmod: now,
      changefreq: "daily",
      priority: "1.0",
    }),
    urlEntry({
      loc: absoluteUrl("/news"),
      lastmod: now,
      changefreq: "daily",
      priority: "0.9",
    }),
    ...articles.map((article) =>
      urlEntry({
        loc: articleUrl(article),
        lastmod: safeDate(article.publishedDate),
        changefreq: "weekly",
        priority: "0.8",
      })
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
