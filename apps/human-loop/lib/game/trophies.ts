/**
 * Trophies: ten small wins per pathway, each tied to a habit the game teaches (stop a risky plan,
 * let good work run, ask the coach, come back on another day). They are earned at the end of a
 * battle, from the battle's own events and the saved progress, and kept in
 * `PathwayProgress.trophies` (id -> the day it was earned). Nothing here is graded or ranked.
 *
 * A trophy never asks for luck: each one names the move that earns it ("how"), so a locked trophy
 * doubles as a hint. "Caught with proof" needs the player's marks, which live in memory only, so it
 * is earned when the result is shown (GameShell calls trophiesFor again with the marks). Saves from
 * before trophies get the first-shift ones back from their wins (trophyIds.ts backfillTrophies).
 */
import { isCleanRun, proofCount } from "./reveal";
import { TROPHY_IDS, type TrophyId, type TrophyRecord } from "./trophyIds";
import type { BattleState, Encounter, PathwayProgress } from "./types";

export { TROPHY_IDS, toTrophies, type TrophyId, type TrophyRecord } from "./trophyIds";

export interface TrophyDef {
  id: TrophyId;
  name: string;
  /** What earns it, as an instruction (shown on a locked trophy). `{coach}` is the pathway's coach. */
  how: string;
  /** lucide icon name (components/skills/Trophies.tsx maps it). */
  icon: "Hand" | "PenLine" | "ArrowUpRight" | "Users" | "Undo2" | "Sparkles" | "Flag" | "Star" | "CalendarCheck" | "Award";
}

export const TROPHIES: Record<TrophyId, TrophyDef> = {
  "first-catch": { id: "first-catch", name: "First catch", how: "Inspect a plan, then block it.", icon: "Hand" },
  proof: { id: "proof", name: "Caught with proof", how: "Mark the line that looks wrong, then block the plan.", icon: "PenLine" },
  "let-it-run": { id: "let-it-run", name: "Good work runs", how: "Check a safe plan, then let it run.", icon: "ArrowUpRight" },
  "team-player": { id: "team-player", name: "Team player", how: "Check a plan. Not sure? Escalate it to {coach}.", icon: "Users" },
  undo: { id: "undo", name: "Undo!", how: "A risky plan ran? Use Roll Back.", icon: "Undo2" },
  "clean-shift": { id: "clean-shift", name: "Clean shift", how: "Finish a shift with no misses and no false alarms.", icon: "Sparkles" },
  "first-shift": { id: "first-shift", name: "First shift done", how: "Finish your first real shift.", icon: "Flag" },
  "three-stars": { id: "three-stars", name: "Three stars", how: "Get 3 stars on the first real shift. Replays count.", icon: "Star" },
  "three-days": { id: "three-days", name: "Three days", how: "Play on 3 different days.", icon: "CalendarCheck" },
  "solid-skill": { id: "solid-skill", name: "Solid skill", how: "Get one skill to Solid.", icon: "Award" },
};

/** The trophies this battle earns that `progress` does not have yet, in TROPHY_IDS order. */
export function trophiesFor(
  progress: Pick<PathwayProgress, "trophies" | "days" | "skills">,
  state: BattleState,
  enc: Encounter,
  stars: number,
  marks: ReadonlyMap<string, number> = new Map(),
): TrophyId[] {
  if (state.status === "playing") return [];
  const has = progress.trophies ?? {};
  const safe = (id: string) => !!enc.steps.find((s) => s.id === id)?.safe;
  const evs = state.events;
  const blockedAgain = new Set(evs.flatMap((ev) => (ev.t === "false-alarm" ? [ev.stepId] : [])));
  // A rolled-back safe plan is followed by a false-alarm event; a risky one is not.
  const undoneRisky = evs.some((ev, i) => ev.t === "rolled-back" && evs[i + 1]?.t !== "false-alarm" && !safe(ev.stepId));
  const story = !enc.practice && (enc.mode ?? "story") === "story";
  // Checked first: a lucky blind block or escalation is not a trophy.
  const checked = (id: string) => !!state.steps[id]?.inspected;
  const earned: Record<TrophyId, boolean> = {
    "first-catch": evs.some((ev) => ev.t === "caught" && checked(ev.stepId)),
    proof: proofCount(state, enc, marks) > 0,
    "let-it-run": evs.some((ev) => ev.t === "executed" && ev.safe && !blockedAgain.has(ev.stepId) && !!state.steps[ev.stepId]?.inspected),
    "team-player": evs.some((ev) => ((ev.t === "caught" && ev.by === "escalate") || ev.t === "escalated-safe") && checked(ev.stepId)),
    undo: undoneRisky,
    // Practice is guided, so a clean run there is not a trophy.
    "clean-shift": !enc.practice && isCleanRun(state, enc) && state.stats.falseAlarms === 0,
    "first-shift": story && state.status === "won",
    "three-stars": story && state.status === "won" && stars >= 3,
    "three-days": (progress.days?.length ?? 0) >= 3,
    "solid-skill": Object.values(progress.skills ?? {}).some((r) => (r?.level ?? 0) >= 3),
  };
  return TROPHY_IDS.filter((id) => earned[id] && !has[id]);
}

/** Add trophies to a record, keeping the first day each was earned. */
export function withTrophies(record: TrophyRecord | undefined, ids: readonly TrophyId[], day: string): TrophyRecord {
  const next: TrophyRecord = { ...(record ?? {}) };
  for (const id of ids) if (!next[id]) next[id] = day;
  return next;
}

/** A trophy's "how" line with the pathway's coach name filled in. */
export function trophyHow(id: TrophyId, coach: string): string {
  return TROPHIES[id].how.replace("{coach}", coach);
}
