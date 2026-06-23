import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { LocalizedCategory } from "@/components/localized-category";
import { LocalizedText } from "@/components/localized-text";
import { VocabularyList } from "@/components/vocabulary-list";
import { getArticleById } from "@/lib/articles";

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
      <article className="mx-auto grid w-full max-w-[88rem] grid-cols-[minmax(0,1fr)_430px] items-start gap-8 px-10 py-14">
        <div className="premium-shell rounded-[2.25rem] p-10">
          <Link
            href="/news"
            className="inline-flex rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:bg-white hover:text-blue-900"
          >
            <LocalizedText id="backToNews" />
          </Link>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 ring-1 ring-blue-100">
              <LocalizedCategory category={article.category} />
            </span>
            {article.isFallback ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
                Demo
              </span>
            ) : null}
            <span>{article.source}</span>
            <span aria-hidden="true">/</span>
            <span>{new Date(article.publishedDate).toLocaleDateString("en")}</span>
            <span aria-hidden="true">/</span>
            <span>{article.readTime}</span>
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-tight text-slate-950">
            {article.title}
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-8 text-slate-600">
            {article.summary}
          </p>

          <section className="mt-10 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white/70 p-6 shadow-sm shadow-blue-950/5">
            <p className="text-sm font-semibold uppercase text-blue-700">
              <LocalizedText id="englishArticleText" />
            </p>
            <p className="mt-3 text-base leading-7 text-slate-600">
              <LocalizedText id="articleTextNote" />
            </p>
          </section>

          <div className="reading-prose mt-8 border-t border-stone-200/90 pt-10 text-xl leading-9 text-slate-800">
            {article.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <a
            href={article.link}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-800"
          >
            Original source
          </a>
        </div>

        <aside className="sticky top-28 space-y-5">
          <section className="premium-dark rounded-3xl border border-slate-800 p-6 text-white">
            <p className="text-sm uppercase text-blue-200">
              <LocalizedText id="readingPractice" />
            </p>
            <h2 className="mt-4 text-2xl font-semibold">
              <LocalizedText id="instructionsTitle" />
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              <LocalizedText id="instructionsBody" />
            </p>
          </section>

          <LessonSection index="01" title={<LocalizedText id="warmUpQuestions" />}>
            <QuestionList items={article.exercises.warmUpQuestions} />
          </LessonSection>

          <section className="premium-card rounded-3xl p-6">
            <SectionHeading index="02" title={<LocalizedText id="keyVocabulary" />} />
            <VocabularyList vocabulary={article.vocabulary} />
          </section>

          <LessonSection index="03" title={<LocalizedText id="fillInTheBlanks" />}>
            <QuestionList items={article.exercises.fillInTheBlanks} variant="blank" />
          </LessonSection>

          <LessonSection index="04" title={<LocalizedText id="trueFalse" />}>
            <QuestionList
              items={article.exercises.trueFalse.map((item) => item.statement)}
              variant="choice"
            />
          </LessonSection>

          <LessonSection
            index="05"
            title={<LocalizedText id="readingComprehension" />}
          >
            <QuestionList items={article.exercises.readingComprehension} />
          </LessonSection>

          <LessonSection
            index="06"
            title={<LocalizedText id="discussionQuestions" />}
          >
            <QuestionList items={article.exercises.discussionQuestions} />
          </LessonSection>

          <LessonSection index="07" title={<LocalizedText id="summaryTask" />}>
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 p-4">
              <p className="text-sm leading-6 text-slate-600">
                {article.exercises.summaryTask}
              </p>
              <div className="mt-4 space-y-2">
                <div className="h-10 rounded-xl border border-stone-200 bg-white/90" />
                <div className="h-10 rounded-xl border border-stone-200 bg-white/90" />
                <div className="h-10 rounded-xl border border-stone-200 bg-white/90" />
              </div>
            </div>
          </LessonSection>
        </aside>
      </article>
    </main>
  );
}

function LessonSection({
  index,
  title,
  children,
}: {
  index: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="premium-card rounded-3xl p-6">
      <SectionHeading index={index} title={title} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionHeading({
  index,
  title,
}: {
  index: string;
  title: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-xs font-semibold text-white">
        {index}
      </span>
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
    </div>
  );
}

function QuestionList({
  items,
  variant = "question",
}: {
  items: string[];
  variant?: "question" | "blank" | "choice";
}) {
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm leading-6 text-slate-700 shadow-sm shadow-slate-900/5"
        >
          <span>{item}</span>
          {variant === "choice" ? (
            <div className="mt-3 flex gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <LocalizedText id="trueLabel" />
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <LocalizedText id="falseLabel" />
              </span>
            </div>
          ) : null}
          {variant === "blank" ? (
            <div className="mt-3 h-9 rounded-xl border border-dashed border-stone-300 bg-stone-50/90" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
