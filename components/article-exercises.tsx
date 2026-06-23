"use client";

import { useState, type ReactNode } from "react";
import { LocalizedText } from "@/components/localized-text";
import { translations } from "@/lib/i18n";
import type { ArticleExerciseSet } from "@/lib/articles";
import { useSettings } from "@/components/settings-provider";

type ArticleExercisesProps = {
  exercises: ArticleExerciseSet;
};

type TrueFalseChoice = "true" | "false";

export function ArticleExercises({ exercises }: ArticleExercisesProps) {
  return (
    <>
      <LessonSection index="01" title={<LocalizedText id="warmUpQuestions" />}>
        <QuestionList items={exercises.warmUpQuestions} />
      </LessonSection>

      <LessonSection index="02" title={<LocalizedText id="trueFalse" />}>
        <TrueFalseList items={exercises.trueFalse} />
      </LessonSection>

      <LessonSection index="03" title={<LocalizedText id="readingComprehension" />}>
        <QuestionList items={exercises.readingComprehension} />
      </LessonSection>

      <LessonSection index="04" title={<LocalizedText id="discussionQuestions" />}>
        <QuestionList items={exercises.discussionQuestions} />
      </LessonSection>

      <LessonSection index="05" title={<LocalizedText id="summaryTask" />}>
        <SummaryTask prompt={exercises.summaryTask} />
      </LessonSection>
    </>
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
    <section className="premium-card rounded-3xl p-5 sm:p-6">
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
      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-slate-950 text-xs font-semibold text-white">
        {index}
      </span>
      <h2 className="text-lg font-semibold leading-6 text-slate-950 sm:text-xl">
        {title}
      </h2>
    </div>
  );
}

function QuestionList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm leading-6 text-slate-700 shadow-sm shadow-slate-900/5"
        >
          {item}
        </li>
      ))}
    </ol>
  );
}

function TrueFalseList({
  items,
}: {
  items: { statement: string; answer: boolean }[];
}) {
  const [choices, setChoices] = useState<Record<number, TrueFalseChoice>>({});

  return (
    <ol className="space-y-3">
      {items.map((item, index) => {
        const selectedChoice = choices[index];
        const isCorrect =
          selectedChoice !== undefined &&
          (selectedChoice === "true") === item.answer;

        return (
          <li
            key={`${item.statement}-${index}`}
            className={`rounded-2xl border p-4 text-sm leading-6 shadow-sm transition ${
              selectedChoice === undefined
                ? "border-stone-200 bg-white/90 text-slate-700 shadow-slate-900/5"
                : isCorrect
                  ? "border-emerald-200 bg-emerald-50/90 text-emerald-950 shadow-emerald-900/5"
                  : "border-rose-200 bg-rose-50/90 text-rose-950 shadow-rose-900/5"
            }`}
          >
            <span>{item.statement}</span>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ChoiceButton
                isSelected={selectedChoice === "true"}
                label={<LocalizedText id="trueLabel" />}
                onClick={() =>
                  setChoices((current) => ({ ...current, [index]: "true" }))
                }
              />
              <ChoiceButton
                isSelected={selectedChoice === "false"}
                label={<LocalizedText id="falseLabel" />}
                onClick={() =>
                  setChoices((current) => ({ ...current, [index]: "false" }))
                }
              />
              {selectedChoice !== undefined ? (
                <span
                  className={`min-h-8 rounded-full px-3 py-1.5 text-xs font-semibold sm:ml-auto ${
                    isCorrect
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  <LocalizedText
                    id={isCorrect ? "correctAnswer" : "incorrectAnswer"}
                  />
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ChoiceButton({
  isSelected,
  label,
  onClick,
}: {
  isSelected: boolean;
  label: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 ${
        isSelected
          ? "bg-slate-950 text-white shadow-md shadow-slate-900/20"
          : "bg-white text-slate-700 ring-1 ring-stone-200 hover:-translate-y-0.5 hover:ring-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function SummaryTask({ prompt }: { prompt: string }) {
  const { language } = useSettings();

  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 p-4">
      <p className="text-sm leading-6 text-slate-600">{prompt}</p>
      <textarea
        className="mt-4 min-h-40 w-full resize-y rounded-2xl border border-stone-200 bg-white/95 p-4 text-base leading-6 text-slate-800 shadow-inner shadow-slate-900/5 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 sm:text-sm"
        placeholder={translations[language].summaryPlaceholder}
      />
    </div>
  );
}
