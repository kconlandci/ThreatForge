/**
 * Skill mastery (M3) — pure, deterministic; `today` is always passed in (YYYY-MM-DD).
 *
 * 1. One grading function, gradePlan(), turns each plan's final outcome into a result
 *    (R right / P partly / W wrong) plus skill evidence ("calls"). The result screen, the debrief
 *    (useBattle.debriefRows) and mastery all read it, so they never disagree.
 *
 *    | Plan  | What the player did                    | Lens | approve-checked | Reason                  |
 *    | risky | Inspected, then Block or Escalate      | R    | -               | Caught                  |
 *    | risky | Block / Escalate without inspecting    | P    | -               | Lucky guess / <coach> did the check |
 *    | risky | It ran, then Roll Back                 | P    | -               | Caught it late          |
 *    | risky | It ran (approved)                      | W    | -               | Got through             |
 *    | safe  | Inspected, then approved               | R    | R               | Checked and approved    |
 *    | safe  | Approved without inspecting            | -    | -               | (shown as right, no evidence) |
 *    | safe  | Escalated                              | P    | P               | <coach> didn't need this one |
 *    | safe  | Blocked, approved when it came back    | P    | W               | Fixed it later          |
 *    | safe  | Blocked and never done, or rolled back | W    | W               | Blocked good work       |
 *    | any   | Never judged (time ran out)            | -    | -               |                         |
 *
 *    "Inspected" includes plans a policy card inspected automatically.
 *    Reasons naming the coach are stored with the Help Desk coach's name (saves keep them);
 *    display them with reasonText(reason, coachName).
 * 2. SkillRecord per skill: last 6 grades (uppercase = risky plan, lowercase = safe plan), total
 *    calls, level 0-4, last 3 days with a call, last call day, and the day it reached Solid.
 * 3. Levels: 0 New, 1 Learning (1+ call), 2 Practicing (n >= 3, accuracy >= 0.6, and for lens
 *    skills an R on a risky plan and an r on a safe plan), 3 Solid (n >= 5, accuracy >= 0.8, no W
 *    in the last 3, calls on 2+ days), 4 Sharp (Solid, and the first 2 calls made 3+ days after
 *    solidOn are both right; a miss restarts that wait). At most one level per shift, up or down,
 *    and never below Learning once met.
 * 4. Spacing, no streaks: review interval by level 1, 2, 4, 7 days. A due skill's first call
 *    decides: R or P keeps the level, W drops one.
 * 5. Idempotence: applyBattle() applies a battle once, keyed `${encounterId}:${seed}` in
 *    progress.applied (last 10). A step already scored in the last 2 days does not count again.
 * 6. need() ranks skills for Daily practice and the "Next up" card.
 */
import { STORED_COACH_CHECKED, STORED_COACH_NOT_NEEDED, STORED_REASON_COACH } from "./helpDeskDefaults";
import { LENS_SKILLS, MASTERY_SKILLS, isSkillId } from "./skills";
import type {
  AgentStep,
  BattleState,
  Call,
  CallGrade,
  Encounter,
  MasterySkillId,
  PathwayProgress,
  SkillLevel,
  SkillRecord,
  StepRuntime,
} from "./types";

export const RECENT_MAX = 6;
export const RECORD_DAYS_MAX = 3;
/** Review interval in days by level (Learning 1, Practicing 2, Solid 4, Sharp 7). */
export const REVIEW_INTERVAL_DAYS: Record<SkillLevel, number> = { 0: 0, 1: 1, 2: 2, 3: 4, 4: 7 };
/** Sharp needs a delayed review: calls made this many days after reaching Solid. */
export const SHARP_DELAY_DAYS = 3;
/** A step scored this recently (same day or yesterday) does not count again. */
export const SCORED_WINDOW_DAYS = 2;
/** progress.scored keeps this many days. */
export const SCORED_KEEP_DAYS = 7;
export const APPLIED_MAX = 10;
/** progress.days keeps the days practiced in this many days. */
export const PRACTICE_DAYS_KEEP = 14;

export const LEVEL_NAMES: Record<SkillLevel, string> = {
  0: "New",
  1: "Learning",
  2: "Practicing",
  3: "Solid",
  4: "Sharp",
};

/* ------------------------------------------------------------------ */
/* Days                                                                */
/* ------------------------------------------------------------------ */

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day written YYYY-MM-DD. */
export function isDay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = DAY_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

function dayNumber(day: string): number {
  const m = DAY_RE.exec(day);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). NaN for a bad day. */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(day: string, n: number): string {
  return new Date((dayNumber(day) + n) * 86_400_000).toISOString().slice(0, 10);
}

/** The player's local calendar day (the one impure input; call it at the edge, pass the result in). */
export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ------------------------------------------------------------------ */
/* Grading                                                             */
/* ------------------------------------------------------------------ */

export interface PlanGrade {
  stepId: string;
  /** How the plan went: R right, P partly, W wrong; null when it was never judged. */
  result: CallGrade | null;
  /** Short reason ("Caught", "Lucky guess", ...); empty when never judged. */
  reason: string;
  /** Skill evidence: the lens call and/or the approve-checked call. Empty for a blind approve. */
  calls: Call[];
}

function call(step: AgentStep, skill: MasterySkillId, grade: CallGrade, reason: string): Call {
  return { stepId: step.id, skill, grade, safe: step.safe, reason };
}

/** The reasons a call can be partly right (kept with a skill's latest miss when it is a P). */
export const MISS_REASONS = ["Lucky guess", STORED_COACH_CHECKED, "Caught it late", STORED_COACH_NOT_NEEDED, "Fixed it later"] as const;

/**
 * A stored reason for display: the reasons that name the coach were saved with the Help Desk
 * coach's name, so show the pathway's coach instead ("Kofi did the check").
 */
export function reasonText(reason: string, coachName: string): string {
  return reason.startsWith(`${STORED_REASON_COACH} `) ? `${coachName}${reason.slice(STORED_REASON_COACH.length)}` : reason;
}

export function isMissReason(value: unknown): value is (typeof MISS_REASONS)[number] {
  return typeof value === "string" && (MISS_REASONS as readonly string[]).includes(value);
}

/** Grade one plan on its final outcome (see the table at the top of this file). */
export function gradePlan(step: AgentStep, runtime: StepRuntime | undefined): PlanGrade {
  const status = runtime?.status ?? "queued";
  const inspected = runtime?.inspected === true;
  const requeues = runtime?.requeues ?? 0;
  const lens = isSkillId(step.skill) ? step.skill : null;
  const out = (result: CallGrade | null, reason: string, lensGrade: CallGrade | null, calib: CallGrade | null): PlanGrade => {
    const calls: Call[] = [];
    if (lens && lensGrade) calls.push(call(step, lens, lensGrade, reason));
    if (calib) calls.push(call(step, "approve-checked", calib, reason));
    return { stepId: step.id, result, reason, calls };
  };

  if (!step.safe) {
    switch (status) {
      case "blocked":
        return inspected ? out("R", "Caught", "R", null) : out("P", "Lucky guess", "P", null);
      case "escalated":
        return inspected ? out("R", "Caught", "R", null) : out("P", STORED_COACH_CHECKED, "P", null);
      case "rolled-back":
        return out("P", "Caught it late", "P", null);
      case "executed":
        return out("W", "Got through", "W", null);
      default:
        return out(null, "", null, null);
    }
  }

  if (requeues > 0) {
    // Blocked at least once: good work was held up.
    if (status === "executed" || status === "escalated") return out("P", "Fixed it later", "P", "W");
    return out("W", "Blocked good work", "W", "W");
  }
  switch (status) {
    case "executed":
      // A blind approve of a safe plan is fine, but proves nothing either way.
      return inspected ? out("R", "Checked and approved", "R", "R") : out("R", "Approved", null, null);
    case "escalated":
      return out("P", STORED_COACH_NOT_NEEDED, "P", "P");
    case "rolled-back":
      return out("W", "Blocked good work", "W", "W");
    default:
      return out(null, "", null, null);
  }
}

/** Every plan's grade, in encounter order. */
export function gradeBattle(state: BattleState, encounter: Encounter): PlanGrade[] {
  return encounter.steps.map((step) => gradePlan(step, state.steps[step.id]));
}

/** Plans graded right / partly / missed (never-judged plans are left out). */
export function shiftTally(state: BattleState, encounter: Encounter): { right: number; partly: number; missed: number } {
  const t = { right: 0, partly: 0, missed: 0 };
  for (const g of gradeBattle(state, encounter)) {
    if (g.result === "R") t.right++;
    else if (g.result === "P") t.partly++;
    else if (g.result === "W") t.missed++;
  }
  return t;
}

/**
 * The skill evidence from a finished battle, in the order the plans were finally resolved.
 * Guided steps (the first `encounter.guidedSteps`, coached step by step) never count.
 */
export function callsFromBattle(state: BattleState, encounter: Encounter): Call[] {
  const order = new Map<string, number>();
  state.events.forEach((ev, i) => {
    if (
      (ev.t === "executed" || ev.t === "caught" || ev.t === "escalated-safe" || ev.t === "rolled-back" || ev.t === "false-alarm") &&
      "stepId" in ev
    ) {
      order.set(ev.stepId, i);
    }
  });
  const guided = Math.max(0, encounter.guidedSteps ?? 0);
  const graded = encounter.steps
    .map((step, i) => ({ i, step, grade: gradePlan(step, state.steps[step.id]) }))
    .filter((x) => x.i >= guided && x.grade.calls.length > 0);
  const at = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER;
  graded.sort((a, b) => at(a.step.id) - at(b.step.id) || a.i - b.i);
  return graded.flatMap((x) => x.grade.calls);
}

/* ------------------------------------------------------------------ */
/* Records and levels                                                  */
/* ------------------------------------------------------------------ */

export function emptyRecord(): SkillRecord {
  return { recent: "", n: 0, level: 0, days: [], last: "", solidOn: null };
}

const POINTS: Record<string, number> = { R: 1, P: 0.5, W: 0 };

/** Mean of the recent grades (R 1, P 0.5, W 0); 0.5 when there are none. */
export function accuracy(recent: string): number {
  if (!recent) return 0.5;
  let sum = 0;
  for (const ch of recent) sum += POINTS[ch.toUpperCase()] ?? 0;
  return sum / recent.length;
}

/** The level the record's calls support on their own (0-3; Sharp also needs the delayed review). */
export function criteriaLevel(rec: SkillRecord, skill: MasterySkillId): 0 | 1 | 2 | 3 {
  if (rec.n <= 0) return 0;
  const acc = accuracy(rec.recent);
  const lens = (LENS_SKILLS as string[]).includes(skill);
  // Lens skills must show they can tell good from bad: a right call on a risky AND a safe plan.
  const both = !lens || (rec.recent.includes("R") && rec.recent.includes("r"));
  const practicing = rec.n >= 3 && acc >= 0.6 && both;
  if (!practicing) return 1;
  const solid = rec.n >= 5 && acc >= 0.8 && !/w/i.test(rec.recent.slice(-3)) && rec.days.length >= 2;
  return solid ? 3 : 2;
}

/** A skill is due for review when its interval has passed since the last call. */
export function isDue(rec: SkillRecord | undefined, today: string): boolean {
  if (!rec || rec.level < 1 || !isDay(rec.last)) return false;
  return daysBetween(rec.last, today) >= REVIEW_INTERVAL_DAYS[rec.level];
}

/** The day a skill becomes due (null for a skill with no calls). */
export function dueOn(rec: SkillRecord | undefined): string | null {
  if (!rec || rec.level < 1 || !isDay(rec.last)) return null;
  return addDays(rec.last, REVIEW_INTERVAL_DAYS[rec.level]);
}

function applySkill(skill: MasterySkillId, prev: SkillRecord | undefined, calls: Call[], today: string): SkillRecord {
  const start = prev ?? emptyRecord();
  const startLevel = start.level;
  const wasDue = isDue(start, today);
  const rec: SkillRecord = { ...start, days: start.days.slice() };
  let reviewPassed = false;

  for (const c of calls) {
    // Sharp: the first 2 calls made SHARP_DELAY_DAYS+ days after reaching Solid must both be right.
    if (startLevel === 3 && rec.solidOn && daysBetween(rec.solidOn, today) >= SHARP_DELAY_DAYS && !reviewPassed) {
      const priorInWindow = rec.n > 0 && isDay(rec.last) && daysBetween(rec.solidOn, rec.last) >= SHARP_DELAY_DAYS;
      if (c.grade !== "R") rec.solidOn = today; // missed the review: wait again
      else if (priorInWindow && rec.recent.slice(-1).toUpperCase() === "R") reviewPassed = true;
    }
    rec.recent = (rec.recent + (c.safe ? c.grade.toLowerCase() : c.grade)).slice(-RECENT_MAX);
    // "From your latest miss": a real miss (W). A partly right call only while no W is recent,
    // and then with its reason ("Fixed it later."), so the sheet never teaches the wrong plan.
    if (c.grade === "W") {
      rec.miss = c.stepId;
      delete rec.missWhy;
    } else if (c.grade === "P" && !/w/i.test(rec.recent)) {
      rec.miss = c.stepId;
      if (isMissReason(c.reason)) rec.missWhy = c.reason;
      else delete rec.missWhy;
    }
    rec.n += 1;
    rec.last = today;
    if (rec.days[rec.days.length - 1] !== today) rec.days = [...rec.days.filter((d) => d !== today), today].slice(-RECORD_DAYS_MAX);
  }

  let target: number = criteriaLevel(rec, skill);
  if (startLevel >= 3 && target >= 3 && (startLevel === 4 || reviewPassed)) target = 4;
  // A due skill's first call decides: a miss drops one level.
  if (wasDue && calls[0]?.grade === "W") target = Math.min(target, startLevel - 1);
  let level = Math.max(startLevel - 1, Math.min(startLevel + 1, target));
  // A shift with no miss never lowers a skill (R or P keeps the level). An older W still in the
  // last 3 can hold a raise back, but it can't drop the skill a second time.
  if (!calls.some((c) => c.grade === "W")) level = Math.max(level, startLevel);
  if (rec.n >= 1) level = Math.max(1, level);
  rec.level = Math.max(0, Math.min(4, level)) as SkillLevel;
  rec.solidOn = rec.level >= 3 ? (startLevel >= 3 && rec.solidOn ? rec.solidOn : today) : null;
  return rec;
}

/** Apply one battle's calls to the skill records. Pure: returns new records. */
export function applyCalls(
  skills: Partial<Record<MasterySkillId, SkillRecord>> | undefined,
  calls: Call[],
  today: string,
): Partial<Record<MasterySkillId, SkillRecord>> {
  const out: Partial<Record<MasterySkillId, SkillRecord>> = { ...(skills ?? {}) };
  for (const skill of MASTERY_SKILLS) {
    const mine = calls.filter((c) => c.skill === skill);
    if (mine.length) out[skill] = applySkill(skill, out[skill], mine, today);
  }
  return out;
}

/** The key that makes applying a battle idempotent. */
export function battleKey(state: Pick<BattleState, "encounterId" | "seed">): string {
  return `${state.encounterId}:${state.seed}`;
}

/** Drop scored entries older than SCORED_KEEP_DAYS (and bad or far-future dates). */
export function trimScored(scored: Record<string, string> | undefined, today: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, day] of Object.entries(scored ?? {})) {
    const age = isDay(day) ? daysBetween(day, today) : NaN;
    if (age >= -1 && age < SCORED_KEEP_DAYS) out[id] = day;
  }
  return out;
}

function recentlyScored(day: string | undefined, today: string): boolean {
  return !!day && daysBetween(day, today) < SCORED_WINDOW_DAYS;
}

/** Add today to the practice days, keeping only the last PRACTICE_DAYS_KEEP days. */
export function addPracticeDay(days: string[] | undefined, today: string): string[] {
  const set = new Set((days ?? []).filter((d) => isDay(d) && daysBetween(d, today) < PRACTICE_DAYS_KEEP && daysBetween(d, today) >= 0));
  set.add(today);
  return [...set].sort();
}

/**
 * The battle-end hook: apply a finished battle to the pathway's skills, once. Steps scored in the
 * last 2 days don't count again (a same-day replay tests skill, not memory). Returns `progress`
 * unchanged when this battle was already applied.
 */
export function applyBattle(progress: PathwayProgress, state: BattleState, encounter: Encounter, today: string): PathwayProgress {
  const key = battleKey(state);
  const applied = progress.applied ?? [];
  if (applied.includes(key)) return progress;
  const scored = trimScored(progress.scored, today);
  const calls = callsFromBattle(state, encounter).filter((c) => !recentlyScored(scored[c.stepId], today));
  for (const c of calls) scored[c.stepId] = today;
  return {
    ...progress,
    skills: applyCalls(progress.skills, calls, today),
    scored,
    applied: [...applied, key].slice(-APPLIED_MAX),
    days: addPracticeDay(progress.days, today),
  };
}

/* ------------------------------------------------------------------ */
/* Need                                                                */
/* ------------------------------------------------------------------ */

/** How much a skill needs practice (higher = weaker). A skill with no calls has need 2.5. */
export function need(rec: SkillRecord | undefined, today: string): number {
  if (!rec || rec.n <= 0) return 2.5;
  const due = isDue(rec, today);
  return 1 + 3 * (1 - accuracy(rec.recent)) + (due ? 2 : 0) - (rec.level === 4 && !due ? 0.5 : 0);
}

/** The weakest skill: highest need, ties broken by skill order. */
export function weakestSkill(
  skills: Partial<Record<MasterySkillId, SkillRecord>> | undefined,
  today: string,
  among: MasterySkillId[] = MASTERY_SKILLS,
): MasterySkillId {
  let best = among[0] ?? MASTERY_SKILLS[0];
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

/** Skills whose level changed between two snapshots (for "Skills moved" on the result screen). */
export function skillChanges(
  before: Partial<Record<MasterySkillId, SkillRecord>> | undefined,
  after: Partial<Record<MasterySkillId, SkillRecord>> | undefined,
): { skill: MasterySkillId; from: SkillLevel; to: SkillLevel }[] {
  const out: { skill: MasterySkillId; from: SkillLevel; to: SkillLevel }[] = [];
  for (const skill of MASTERY_SKILLS) {
    const from = before?.[skill]?.level ?? 0;
    const to = after?.[skill]?.level ?? 0;
    if (from !== to) out.push({ skill, from, to });
  }
  return out;
}
