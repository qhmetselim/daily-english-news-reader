import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleImage } from "@/components/article-image";
import { ArticleExercises } from "@/components/article-exercises";
import { Header } from "@/components/header";
import { LocalizedCategory } from "@/components/localized-category";
import { getArticleById } from "@/lib/articles";
import { levelOptions } from "@/lib/i18n";

type ArticlePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await getArticleById(id);

  return {
    title: article
      ? `${article.title} | Daily English News Reader`
      : "Article | Daily English News Reader",
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      <Header />
      <article className="mx-auto grid w-full max-w-[88rem] grid-cols-1 items-start gap-5 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="premium-shell flex flex-col rounded-[1.5rem] p-3 sm:rounded-[2.25rem] sm:p-6 lg:p-10">
          <Link
            href="/news"
            className="order-2 mt-4 inline-flex min-h-11 w-fit items-center rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:bg-white hover:text-blue-900 xl:order-none xl:mt-0"
          >
            Back to news
          </Link>

          <ArticleImage
            category={article.category}
            imageUrl={article.imageUrl}
            title={article.title}
            usesFallbackImage={article.usesFallbackImage}
            sizes="(max-width: 1024px) 100vw, 58vw"
            priority
            className="order-1 aspect-[16/10] rounded-[1.25rem] sm:aspect-[21/9] sm:rounded-[2rem] xl:order-none xl:mt-8"
            imageClassName="rounded-[1.25rem] sm:rounded-[2rem]"
          />

          <h1 className="order-3 mt-6 max-w-5xl text-3xl font-semibold leading-tight text-slate-950 sm:mt-8 sm:text-4xl lg:text-5xl xl:order-none">
            {article.title}
          </h1>

          <div className="order-4 mt-5 flex flex-wrap items-center gap-2 text-sm text-slate-500 sm:mt-6 sm:gap-3 xl:order-none">
            <span className="rounded-full bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 ring-1 ring-blue-100">
              <LocalizedCategory category={article.category} />
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-stone-200">
              {getLevelLabel(article.level)}
            </span>
            {article.isFallback ? (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600 ring-1 ring-slate-200">
                Demo
              </span>
            ) : null}
            <span>{article.source}</span>
            <span aria-hidden="true">/</span>
            <span>{new Date(article.publishedDate).toLocaleDateString("en")}</span>
            <span aria-hidden="true">/</span>
            <span>{article.readTime}</span>
          </div>

          <div className="reading-prose order-5 mt-7 border-t border-stone-200/90 pt-7 text-lg leading-8 text-slate-800 sm:mt-8 sm:pt-10 sm:text-xl sm:leading-9 xl:order-none">
            {article.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <a
            href={article.link}
            target="_blank"
            rel="noreferrer"
            className="order-6 mt-4 inline-flex min-h-11 w-fit items-center rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-800 sm:mt-8 xl:order-none"
          >
            Original source
          </a>
        </div>

        <aside className="space-y-4 sm:space-y-5 xl:sticky xl:top-28">
          <section className="premium-dark rounded-3xl border border-slate-800 p-5 text-white sm:p-6">
            <p className="text-sm uppercase text-blue-200">Reading practice</p>
            <h2 className="mt-4 text-xl font-semibold sm:text-2xl">
              Learn with this article
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Read the English article first, then use the activities below to
              check meaning, vocabulary, and discussion ideas.
            </p>
          </section>

          <ArticleExercises exercises={article.exercises} />
        </aside>
      </article>
    </main>
  );
}

function getLevelLabel(level: string): string {
  return (
    levelOptions.find((option) => option.value === level)?.labels.en ??
    level
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}
