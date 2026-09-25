/**
 * Pure view helpers for the M3 skill screens (the agent's desk chooser, Your skills, the shift result
 * lists). No React, no clock: `today` (YYYY-MM-DD) is always passed in. Words and pips, never
 * percentages.
 */
import {
  LEVEL_NAMES,
  REVIEW_INTERVAL_DAYS,
  addDays,
  gradePlan,
  isDue,
  reasonText,
  localDay,
  need,
  type PlanGrade,
} from "./mastery";
import { coachName } from "./coach";
import { MASTERY_SKILLS, QUESTION_TITLES, skillName, skillQuestion } from "./skills";
import type {
  AgentStep,
  BattleState,
  CallGrade,
  CheckQuestion,
  Encounter,
  HistoryEntry,
  MasterySkillId,
  PathwayProgress,
  ShiftSpec,
  SkillLevel,
  SkillRecord,
  StepRuntime,
} from "./types";

export type Skills = Partial<Record<MasterySkillId, SkillRecord>>;

/** Daily practice and drills open once the first Monday attempt has ended (any outcome). */
export function dailyUnlocked(p: Pick<PathwayProgress, "attempts"> | null | undefined): boolean {
  return (p?.attempts ?? 0) > 0;
}

/** Skills the player has met (at least one call). */
export function metSkills(skills: Skills | undefined): MasterySkillId[] {
  return MASTERY_SKILLS.filter((s) => (skills?.[s]?.n ?? 0) > 0 && (skills?.[s]?.level ?? 0) >= 1);
}

export function hasSkills(p: Pick<PathwayProgress, "skills"> | null | undefined): boolean {
  return metSkills(p?.skills).length > 0;
}

/** "Level 2 of 4: Practicing" (the pips' accessible text). */
export function levelText(level: SkillLevel): string {
  return level <= 0 ? "Not met yet" : `Level ${level} of 4: ${LEVEL_NAMES[level]}`;
}

/** Days until the next review at this level ("Check back in 4 days"). */
export function reviewDays(level: SkillLevel): number {
  return REVIEW_INTERVAL_DAYS[level] || 1;
}

/** The grades of the last calls, oldest first: R / P / W plus whether the plan was safe. */
export function recentCalls(rec: SkillRecord | undefined): { grade: CallGrade; safe: boolean }[] {
  return [...(rec?.recent ?? "")].map((ch) => ({ grade: ch.toUpperCase() as CallGrade, safe: ch === ch.toLowerCase() }));
}

/** One plain reason for the "Next up" card. */
export function needReason(rec: SkillRecord | undefined, today: string): string {
  if (!rec || rec.n <= 0) return "You haven't met this one yet.";
  if (isDue(rec, today)) return "Review due. A quick practice keeps it sharp.";
  const calls = recentCalls(rec);
  const through = calls.filter((c) => c.grade === "W" && !c.safe).length;
  if (through) return `${through} risky ${through === 1 ? "plan" : "plans"} got through lately.`;
  const blocked = calls.filter((c) => c.grade === "W" && c.safe).length;
  if (blocked) return `You blocked ${blocked} good ${blocked === 1 ? "plan" : "plans"} lately.`;
  const partly = calls.filter((c) => c.grade === "P").length;
  if (partly) return `${partly} ${partly === 1 ? "call was" : "calls were"} only partly right.`;
  if (rec.level < 3) return "A few more calls make it solid.";
  return "Keep it sharp.";
}

/** The "Next up" skill: highest need among the skills met so far (all skills before any are met). */
export function nextUpSkill(skills: Skills | undefined, today: string): MasterySkillId {
  const met = metSkills(skills);
  const pool = met.length ? met : MASTERY_SKILLS;
  let best = pool[0];
  let bestNeed = -Infinity;
  for (const s of pool) {
    const n = need(skills?.[s], today);
    if (n > bestNeed) {
      best = s;
      bestNeed = n;
    }
  }
  return best;
}

export interface SkillGroup {
  /** The skill's question, or null for "All 3 check out" (approve-checked). */
  question: CheckQuestion | null;
  title: string;
  skills: MasterySkillId[];
}

/** The shared question titles (moved to skills.ts). */
export { QUESTION_TITLES };

/** Met skills grouped under the 3 questions; approve-checked last under "All 3 check out". Empty groups are left out. */
export function skillGroups(skills: Skills | undefined): SkillGroup[] {
  const met = new Set(metSkills(skills));
  const groups: SkillGroup[] = (["who", "record", "undo"] as CheckQuestion[]).map((q) => ({
    question: q,
    title: QUESTION_TITLES[q],
    skills: MASTERY_SKILLS.filter((s) => skillQuestion(s) === q && met.has(s)),
  }));
  groups.push({ question: null, title: "All 3 check out", skills: met.has("approve-checked") ? ["approve-checked"] : [] });
  return groups.filter((g) => g.skills.length > 0);
}

/** The last 7 days, oldest first, and whether the player finished a shift on each. */
export function weekDots(days: string[] | undefined, today: string): { day: string; done: boolean; letter: string; today: boolean }[] {
  const set = new Set(days ?? []);
  const letters = ["S", "M", "T", "W", "T", "F", "S"];
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
    return { day, done: set.has(day), letter: letters[dow], today: i === 6 };
  });
}

/** A Daily practice already finished today (the button then reads "One more shift"). */
export function dailyDoneToday(history: HistoryEntry[] | undefined, today: string): boolean {
  return (history ?? []).some((h) => h.mode === "daily" && !!h.at && localDay(new Date(h.at)) === today);
}

/** Minutes a shift takes, roughly (about 45 seconds a plan). */
export function shiftMinutes(plans: number): number {
  return Math.max(2, Math.round(plans * 0.75));
}

/** The note under "Start today's practice": "4 new tickets · about 6 min · Focus: Check who's asking". */
export function dailyNote(spec: Pick<ShiftSpec, "ticketIds" | "stepIds" | "focus">): string {
  const focus = spec.focus[0];
  return `${spec.ticketIds.length} new tickets · about ${shiftMinutes(spec.stepIds.length)} min${focus ? ` · Focus: ${skillName(focus)}` : ""}`;
}

/** Skills that get a "Review due" tag: only the 2 due skills that need practice most (the rest share one grey line). */
export function dueTagSkills(skills: Skills | undefined, today: string, max = 2): MasterySkillId[] {
  return metSkills(skills)
    .filter((s) => isDue(skills?.[s], today))
    .map((s, i) => ({ s, i, need: need(skills?.[s], today) }))
    .sort((a, b) => b.need - a.need || a.i - b.i)
    .slice(0, max)
    .map((x) => x.s);
}

/** "Next pip": how to reach the next level, in plain words (from the level rules in mastery.ts). */
export function nextPipText(skill: MasterySkillId, level: SkillLevel): string {
  switch (level) {
    case 0:
      return "Make your first call on a plan like this.";
    case 1:
      return skill === "approve-checked"
        ? "Inspect 3 safe plans that look scary, and approve them."
        : "Get 3 calls right, including a risky and a safe one.";
    case 2:
      return "Keep it right on 2 different days.";
    case 3:
      return "Come back in 3+ days and get 2 right.";
    default:
      return "Top level. A review every week keeps it there.";
  }
}

/* ------------------------------------------------------------------ */
/* Result lists                                                        */
/* ------------------------------------------------------------------ */

export interface PlanLine {
  step: AgentStep;
  grade: PlanGrade;
  /** The question of the plan's lens skill. */
  question: CheckQuestion | null;
  /** Line 2: the tell, with the reason first for a partly right call ("Lucky guess. ..."). */
  text: string;
}

const RANK: Record<string, number> = { W: 0, P: 1, R: 2, none: 3 };

/** One line per plan, mistakes first (missed, then partly, then right, then never reached). */
export function planLines(state: BattleState, encounter: Encounter): PlanLine[] {
  const coach = coachName(encounter);
  return encounter.steps
    .map((step, i) => {
      const grade = gradePlan(step, state.steps[step.id]);
      const tell = step.tell ?? step.lesson;
      const text = grade.result === "P" ? `${reasonText(grade.reason, coach)}. ${tell}` : grade.result ? tell : "The shift ended before it came up.";
      return { i, line: { step, grade, question: step.skill ? skillQuestion(step.skill) : null, text } };
    })
    .sort((a, b) => RANK[a.line.grade.result ?? "none"] - RANK[b.line.grade.result ?? "none"] || a.i - b.i)
    .map((x) => x.line);
}

/**
 * The weakest skill among the plans that went wrong this shift, or only partly right when nothing
 * went wrong (null when every plan was right). A real miss always wins over a partly right call.
 */
export function weakestInShift(lines: PlanLine[], skills: Skills | undefined, today: string): MasterySkillId | null {
  const skillsOf = (grades: CallGrade[]) => {
    const set = new Set<MasterySkillId>();
    for (const l of lines) {
      if (!l.grade.result || !grades.includes(l.grade.result)) continue;
      if (l.step.skill) set.add(l.step.skill);
      else for (const c of l.grade.calls) set.add(c.skill);
    }
    return set;
  };
  const missed = skillsOf(["W"]);
  const pool = missed.size ? missed : skillsOf(["P"]);
  if (!pool.size) return null;
  const among = MASTERY_SKILLS.filter((s) => pool.has(s));
  let best = among[0];
  let bestNeed = -Infinity;
  for (const s of among) {
    const n = need(skills?.[s], today);
    if (n > bestNeed) {
      best = s;
      bestNeed = n;
    }
  }
  return best;
}

/** "7 right · 1 partly · 1 missed" (zero parts left out, except "0 missed" on a clean shift). */
export function tallyHeadline(t: { right: number; partly: number; missed: number }): string {
  const parts = [`${t.right} right`];
  if (t.partly) parts.push(`${t.partly} partly`);
  parts.push(`${t.missed} missed`);
  return parts.join(" · ");
}

/* ------------------------------------------------------------------ */
/* Skills moved (Daily / drill result)                                 */
/* ------------------------------------------------------------------ */

export interface SkillMoveView {
  skill: MasterySkillId;
  from: SkillLevel;
  to: SkillLevel;
  up: boolean;
  /** One plain reason for a drop ("Down: a risky plan got through"); null for a rise. */
  why: string | null;
}

/** Why a skill went down this shift, from its plans' grades. */
function dropReason(skill: MasterySkillId, lines: PlanLine[]): string {
  const calls = lines.flatMap((l) => l.grade.calls).filter((c) => c.skill === skill);
  if (calls.some((c) => c.grade === "W" && !c.safe)) return "Down: a risky plan got through";
  if (calls.some((c) => c.grade === "W" && c.safe)) return "Down: good work was blocked";
  return "Down: a review call was missed";
}

/**
 * "Skills moved", most important first: drops, then the shift's focus, then a new Solid or Sharp,
 * then the rest (each group in skill order). The screen shows the first 2 and "+N more changed".
 */
export function orderMoves(
  moves: { skill: MasterySkillId; from: SkillLevel; to: SkillLevel }[],
  focus: MasterySkillId | null,
  lines: PlanLine[],
): SkillMoveView[] {
  const rank = (m: { skill: MasterySkillId; from: SkillLevel; to: SkillLevel }) =>
    m.to < m.from ? 0 : m.skill === focus ? 1 : m.to >= 3 ? 2 : 3;
  return moves
    .map((m, i) => ({ m, i }))
    .sort((a, b) => rank(a.m) - rank(b.m) || MASTERY_SKILLS.indexOf(a.m.skill) - MASTERY_SKILLS.indexOf(b.m.skill) || a.i - b.i)
    .map(({ m }) => ({ ...m, up: m.to > m.from, why: m.to < m.from ? dropReason(m.skill, lines) : null }));
}

/* ------------------------------------------------------------------ */
/* Toast chip (during play)                                            */
/* ------------------------------------------------------------------ */

export interface LiveGrade {
  /** The result shape to show, only once the plan's outcome is final. */
  grade: CallGrade | null;
  /** A word instead of a shape while it isn't final (or proves nothing): "Back in line". */
  note: string | null;
}

/**
 * The toast chip's result for a plan that just moved. It shows a shape only when the outcome is
 * final, so it never disagrees with the result screen (gradePlan grades the final outcome):
 * - a safe plan blocked and sent back in line: "Back in line" (it can still be approved);
 * - a risky plan that ran and can still be rolled back this shift: "Can still roll back";
 * - a safe plan approved without inspecting: "Not checked" (no evidence either way).
 */
export function liveGrade(step: AgentStep, rt: StepRuntime | undefined, opts: { canRollBack: boolean }): LiveGrade {
  const status = rt?.status ?? "queued";
  if (step.safe && (rt?.requeues ?? 0) > 0 && (status === "queued" || status === "announced")) {
    return { grade: null, note: "Back in line" };
  }
  if (!step.safe && status === "executed" && step.reversible && opts.canRollBack) {
    return { grade: null, note: "Can still roll back" };
  }
  if (step.safe && status === "executed" && !rt?.inspected && (rt?.requeues ?? 0) === 0) {
    return { grade: null, note: "Not checked" };
  }
  return { grade: gradePlan(step, rt).result, note: null };
}
