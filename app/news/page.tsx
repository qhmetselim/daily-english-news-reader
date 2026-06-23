import { Header } from "@/components/header";
import { LocalizedText } from "@/components/localized-text";
import { LevelBadge } from "@/components/level-badge";
import { NewsExplorer } from "@/components/news-explorer";
import { getArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const articles = await getArticles();

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto w-full max-w-[88rem] px-10 py-14">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-700/90">
              <LocalizedText id="freeDailyNews" />
            </p>
            <h1 className="mt-4 text-6xl font-semibold text-slate-950">
              <LocalizedText id="newsTitle" />
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
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
