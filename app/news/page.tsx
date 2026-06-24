import type { Metadata } from "next";
import { Header } from "@/components/header";
import { LocalizedText } from "@/components/localized-text";
import { LevelBadge } from "@/components/level-badge";
import { NewsExplorer } from "@/components/news-explorer";
import { getArticles } from "@/lib/articles";
import { absoluteUrl, siteName } from "@/lib/seo";

export const dynamic = "force-dynamic";

const newsDescription =
  "Browse the latest daily English news articles for reading practice, vocabulary learning, and comprehension exercises.";

export const metadata: Metadata = {
  title: "Daily English News",
  description: newsDescription,
  alternates: {
    canonical: absoluteUrl("/news"),
  },
  openGraph: {
    type: "website",
    title: `Daily English News | ${siteName}`,
    description: newsDescription,
    url: absoluteUrl("/news"),
    images: [
      {
        url: absoluteUrl("/study-newsroom.svg"),
        alt: "Daily English news reading practice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Daily English News | ${siteName}`,
    description: newsDescription,
    images: [absoluteUrl("/study-newsroom.svg")],
  },
};

export default async function NewsPage() {
  const articles = await getArticles();

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto w-full max-w-[88rem] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase text-blue-700/90">
              <LocalizedText id="freeDailyNews" />
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              <LocalizedText id="newsTitle" />
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              <LocalizedText id="newsIntro" />
            </p>
          </div>
          <LevelBadge />
        </div>

        <NewsExplorer articles={articles} />
      </section>
    </main>
  );
}
