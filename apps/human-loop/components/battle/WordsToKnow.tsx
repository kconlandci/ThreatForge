"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import { wordsIn, type GlossaryWord } from "@/lib/game/glossary";

/**
 * "Words to know (2)": a closed box at the end of the evidence sheet with the pathway's jargon that
 * this plan uses, each with a plain meaning. Closed by default, so it adds no reading unless asked.
 */
export function WordsToKnow({ words, texts }: { words: readonly GlossaryWord[]; texts: readonly (string | null | undefined)[] }) {
  const found = wordsIn(texts, words);
  if (!found.length) return null;
  return (
    <details className="group mt-4 rounded-2xl border-2 border-ink bg-paper-soft" data-words={found.map((w) => w.term).join("|")}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 font-display text-[16px] font-bold text-ink [&::-webkit-details-marker]:hidden">
        <BookOpen className="h-5 w-5 flex-none text-teal" aria-hidden="true" />
        Words to know ({found.length})
        <ChevronDown className="ml-auto h-5 w-5 flex-none transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <dl className="grid gap-2 px-3 pb-3">
        {found.map((w) => (
          <div key={w.term}>
            <dt className="font-display text-[15px] font-bold text-teal">{w.term}</dt>
            <dd className="text-[15px] leading-snug text-ink-soft">{w.meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
