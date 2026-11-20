/**
 * Trophy ids and the save-side helpers, with no imports, so the save code (loaded on every game
 * page, the pathway picker included) does not pull in the trophy rules (lib/game/trophies.ts).
 */

export const TROPHY_IDS = [
  "first-catch",
  "proof",
  "let-it-run",
  "team-player",
  "undo",
  "clean-shift",
  "first-shift",
  "three-stars",
  "three-days",
  "solid-skill",
] as const;

export type TrophyId = (typeof TROPHY_IDS)[number];

export type TrophyRecord = Partial<Record<TrophyId, string>>;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Saved trophies, cleaned: only known ids with a YYYY-MM-DD day. */
export function toTrophies(value: unknown): TrophyRecord {
  const out: TrophyRecord = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const id of TROPHY_IDS) {
    const day = (value as Record<string, unknown>)[id];
    if (typeof day === "string" && DAY_RE.test(day)) out[id] = day;
  }
  return out;
}

/**
 * Saves from before trophies: a first shift already won (wins, best) earned "First shift done", and
 * a 3-star best earned "Three stars", on the day of that best shift.
 */
export function backfillTrophies(
  trophies: TrophyRecord,
  wins: number,
  best: { stars: number; completedAt: string } | null,
): TrophyRecord {
  const day = best?.completedAt.slice(0, 10) ?? "";
  if (wins <= 0 || !best || !DAY_RE.test(day)) return trophies;
  const out: TrophyRecord = { ...trophies };
  out["first-shift"] ??= day;
  if (best.stars >= 3) out["three-stars"] ??= day;
  return out;
}
