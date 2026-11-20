/**
 * Words to know: each pathway's jargon list (content/<pathway>/glossary.json) and the matching
 * that picks the words a plan uses, for the evidence sheet. Meanings say what a thing is, never
 * whether a plan is safe (lib/game/content.test.ts checks the lists).
 */

export interface GlossaryWord {
  /** As shown, e.g. "MFA". */
  term: string;
  /** Other forms that match too (plurals, the long form). */
  also?: string[];
  /** Plain English, at most 18 words. */
  meaning: string;
}

export interface GlossaryJson {
  words: GlossaryWord[];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A whole-word, case-insensitive pattern for one form ("read-only" and "MFA's" both match). */
function formPattern(form: string): RegExp {
  return new RegExp(`(^|[^A-Za-z0-9])${escape(form)}(?=$|[^A-Za-z0-9])`, "i");
}

/**
 * The glossary words that appear in `texts`, in order of first appearance. A longer form wins where
 * two overlap ("key vault" over "key"), and each word is listed once.
 */
export function wordsIn(texts: readonly (string | null | undefined)[], words: readonly GlossaryWord[]): GlossaryWord[] {
  const text = texts.filter(Boolean).join("\n");
  if (!text) return [];
  const forms = words
    .flatMap((w) => [w.term, ...(w.also ?? [])].map((form) => ({ w, form })))
    .sort((a, b) => b.form.length - a.form.length);
  const taken: Array<[number, number]> = [];
  const found = new Map<GlossaryWord, number>();
  for (const { w, form } of forms) {
    const re = new RegExp(formPattern(form).source, "gi");
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const start = m.index + m[1].length;
      const end = start + form.length;
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      taken.push([start, end]);
      if (!found.has(w) || start < found.get(w)!) found.set(w, start);
    }
  }
  return [...found.entries()].sort((a, b) => a[1] - b[1]).map(([w]) => w);
}
