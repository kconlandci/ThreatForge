/**
 * Pure helpers for the site's pathway cards (/ and /play): what the card's button says, and the
 * "is open now" sentence. No game content is imported.
 */
import type { PathwayProgress } from "@/lib/game/types";
import type { PathwayMeta } from "@/lib/types";

export type PathwayCta = "Resume drill" | "Resume practice" | "Resume shift" | "Continue" | "Start shift";

/** What a saved, still-playing battle is, from its encounter id and the pathway's ids. */
export function resumeKindOf(encounterId: string, meta: Pick<PathwayMeta, "idPrefix" | "practiceId">): "drill" | "practice" | "shift" {
  const prefix = meta.idPrefix ?? "";
  if (prefix && encounterId.startsWith(`${prefix}-drill-`)) return "drill";
  if ((prefix && encounterId.startsWith(`${prefix}-daily-`)) || encounterId === meta.practiceId) return "practice";
  return "shift";
}

/** The live card's button. */
export function pathwayCta(progress: PathwayProgress | null | undefined, meta: Pick<PathwayMeta, "idPrefix" | "practiceId">): PathwayCta {
  if (progress?.battle?.status === "playing") {
    const kind = resumeKindOf(progress.battle.encounterId ?? "", meta);
    return kind === "drill" ? "Resume drill" : kind === "practice" ? "Resume practice" : "Resume shift";
  }
  return (progress?.attempts ?? 0) > 0 ? "Continue" : "Start shift";
}

/** Every shift played (attempts count the story shift only, for funder numbers). */
export function shiftsPlayed(progress: PathwayProgress | null | undefined): number {
  const attempts = progress?.attempts ?? 0;
  return attempts + (progress?.history ?? []).filter((h) => h.mode === "daily" || h.mode === "drill").length;
}

/** "Help Desk is open now." / "Help Desk and Cybersecurity are open now." */
export function openNowSentence(live: Pick<PathwayMeta, "name">[]): string {
  const names = live.map((p) => p.name);
  if (names.length === 0) return "";
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `${list} ${names.length === 1 ? "is" : "are"} open now.`;
}
