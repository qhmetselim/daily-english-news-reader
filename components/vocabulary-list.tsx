"use client";

import type { VocabularyItem } from "@/lib/articles";
import { useSettings } from "@/components/settings-provider";

export function VocabularyList({
  vocabulary,
}: {
  vocabulary: VocabularyItem[];
}) {
  const { language } = useSettings();

  return (
    <dl className="mt-5 space-y-3">
      {vocabulary.map((item) => (
        <div
          key={item.word}
          className="rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm shadow-slate-900/5"
        >
          <dt className="font-semibold text-slate-950">{item.word}</dt>
          <dd className="mt-2 text-sm leading-6 text-slate-600">
            {item.meanings[language]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
