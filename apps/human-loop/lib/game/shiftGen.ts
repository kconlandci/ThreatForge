/**
 * Generated shifts (M3): Daily practice and skill drills, built from the ticket bank.
 * Pure and deterministic: the same bank, progress and ids always give the same shift.
 *
 * - The unit of selection is a WHOLE bank ticket: its 1-3 plans stay together and in order.
 * - planDaily() / planDrill() return a ShiftSpec (ids only). It is saved in progress.shift before
 *   the battle starts, and buildShift() rebuilds the same Encounter from it on every load, so a
 *   daily or drill resumes like any other battle (engine canResume works unchanged).
 */
import { daysBetween, isDay, need } from "./mastery";
import { nextFloat, seedState, shuffle } from "./rng";
import { CARDS } from "./cards";
import { MASTERY_SKILLS, skillName } from "./skills";
import type { PathwayId } from "@/lib/types";
import type {
  AgentStep,
  BankTicket,
  CardId,
  CoachInfo,
  DialogueLine,
  Encounter,
  HeadlineKey,
  MasterySkillId,
  PathwayProgress,
  ShiftSpec,
  ShiftText,
  SkillLevel,
} from "./types";

export const DAILY_TICKETS = 4;
export const DAILY_MIN_PLANS = 7;
export const DAILY_MAX_PLANS = 10;
/** Hard limits on a daily's safe share, and the band it aims for when it can. */
export const DAILY_SAFE_MIN = 0.5;
export const DAILY_SAFE_MAX = 0.7;
export const DAILY_SAFE_TARGET: [number, number] = [0.55, 0.65];
export const DAILY_TRIES = 200;
export const ORDER_TRIES = 24;
/** Extra seeded chain merges tried when no ticket order passes the order rules. */
export const MERGE_TRIES = 48;
/** Dailies finished before D3 tickets can appear (then at most 1 per shift). */
export const D3_AFTER_DAILIES = 2;
/** Help Desk: 8 plans, 5 safe, both twists, 2 companies, D1-D2 only. A pathway sets its own in shift.json. */
export const FALLBACK_DAILY = ["c-romero-new-phone", "b-back-from-vacation", "a-pdf-editor", "c-lost-phone"];

export const DRILL_MIN_PLANS = 4;
export const DRILL_MAX_PLANS = 7;
/** Tickets played this recently are avoided in drills when there are others. */
export const DRILL_RECENT_DAYS = 7;

/**
 * The story shift's end-of-shift deck. The pathway's policy card (BuildOptions.policyCard) is added
 * only when a shift has a plan it would inspect.
 */
const DAILY_DECK: CardId[] = [
  "inspect",
  "inspect",
  "inspect",
  "inspect",
  "block",
  "block",
  "block",
  "escalate",
  "rollback",
  "coffee",
];
const DRILL_DECK: CardId[] = ["inspect", "block", "escalate"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** A tiny mutable wrapper around the pure RNG, local to one call. */
class Rng {
  constructor(public state: number) {}
  float(): number {
    const r = nextFloat(this.state);
    this.state = r.state;
    return r.value;
  }
  int(n: number): number {
    return Math.floor(this.float() * n);
  }
  shuffle<T>(items: readonly T[]): T[] {
    const r = shuffle(items, this.state);
    this.state = r.state;
    return r.items;
  }
}

/** A short, stable hash of every ticket and step id in the bank (order included). */
export function bankVersionOf(bank: BankTicket[]): string {
  const text = bank.map((t) => `${t.id}:${t.steps.map((s) => s.id).join(",")}`).join("|");
  return `b${seedState(text).toString(36)}`;
}

function isScarySafe(s: AgentStep): boolean {
  return s.safe && s.twist === "scary-safe";
}

function isRoutineRisky(s: AgentStep): boolean {
  return !s.safe && s.twist === "routine-risky";
}

/** The skills a ticket exercises: its steps' lens skills, plus approve-checked for a scary-safe plan. */
export function ticketSkills(t: BankTicket): MasterySkillId[] {
  const set = new Set<MasterySkillId>();
  for (const s of t.steps) if (s.skill) set.add(s.skill);
  if (t.steps.some(isScarySafe)) set.add("approve-checked");
  return MASTERY_SKILLS.filter((s) => set.has(s));
}

/** Interleave tickets' plans round-robin, keeping each ticket's chain order. */
export function interleave(tickets: BankTicket[]): AgentStep[] {
  const out: AgentStep[] = [];
  const longest = Math.max(0, ...tickets.map((t) => t.steps.length));
  for (let i = 0; i < longest; i++) for (const t of tickets) if (t.steps[i]) out.push(t.steps[i]);
  return out;
}

function plans(tickets: BankTicket[]): AgentStep[] {
  return tickets.flatMap((t) => t.steps);
}

function inBand(share: number, [lo, hi]: [number, number]): boolean {
  return share >= lo - 1e-9 && share <= hi + 1e-9;
}

export interface DailyCheck {
  ok: boolean;
  /** The safe share is in the 55-65% target band too. */
  target: boolean;
}

/** Whether a set of tickets makes a valid daily (7-10 plans, 50-70% safe, both twists, 2+ companies, a warm-up plan). */
export function checkDaily(tickets: BankTicket[]): DailyCheck {
  const all = plans(tickets);
  const safe = all.filter((s) => s.safe).length;
  const share = all.length ? safe / all.length : 0;
  const ok =
    all.length >= DAILY_MIN_PLANS &&
    all.length <= DAILY_MAX_PLANS &&
    inBand(share, [DAILY_SAFE_MIN, DAILY_SAFE_MAX]) &&
    all.some(isScarySafe) &&
    all.some(isRoutineRisky) &&
    all.some((s) => !s.safe) &&
    new Set(tickets.map((t) => t.company)).size >= 2 &&
    // Some ticket can open the shift with a plain safe plan (the warm-up win).
    tickets.some((t) => t.steps[0]?.safe && !isScarySafe(t.steps[0]));
  return { ok, target: ok && inBand(share, DAILY_SAFE_TARGET) };
}

/** A daily announces 1 plan on turn 1, then 2 a turn. */
export const DAILY_ACTIONS_PER_TURN = [1, 2];

/** The turn (0-based) on which the plan at `index` is announced, for a queue that runs in order. */
export function turnOfPlan(index: number, actionsPerTurn: number[] = DAILY_ACTIONS_PER_TURN): number {
  let left = index;
  for (let turn = 0; ; turn++) {
    const n = Math.max(1, actionsPerTurn[Math.min(turn, actionsPerTurn.length - 1)] ?? 1);
    if (left < n) return turn;
    left -= n;
  }
}

/**
 * Order rules: plan 1 is a plain safe plan (warm-up win), no scary-safe plan in the first 2, never
 * 3 risky in a row, and never 2 risky plans on one turn. (With 3 energy, inspecting 2 plans leaves
 * 1 Block: a second risky plan would get through even for a player who read both right. A blocked
 * safe plan goes to the back of the queue, so it never moves a later pair.)
 */
export function dailyOrderOk(steps: AgentStep[]): boolean {
  if (!steps[0] || !steps[0].safe || isScarySafe(steps[0])) return false;
  if (steps.slice(0, 2).some(isScarySafe)) return false;
  let run = 0;
  const riskyTurns = new Set<number>();
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    run = s.safe ? 0 : run + 1;
    if (run >= 3) return false;
    if (!s.safe) {
      const turn = turnOfPlan(i);
      if (riskyTurns.has(turn)) return false;
      riskyTurns.add(turn);
    }
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Daily practice                                                      */
/* ------------------------------------------------------------------ */

export interface PlanOptions {
  playerId: string;
  /** YYYY-MM-DD, the player's local day. */
  today: string;
  /** The pathway's encounter id prefix (default "hd"): seeds and ids are `${prefix}-daily-...`. */
  prefix?: string;
  /** Ticket ids used when no draw passes the rules (default FALLBACK_DAILY, the Help Desk list). */
  fallback?: string[];
}

/** The daily's focus: the top 2 skills by need, ties broken by a seeded draw. */
function pickFocus(progress: PathwayProgress, today: string, rng: Rng): MasterySkillId[] {
  const ranked = MASTERY_SKILLS.map((skill) => ({ skill, need: need(progress.skills?.[skill], today), key: rng.float() }));
  ranked.sort((a, b) => b.need - a.need || a.key - b.key);
  return ranked.slice(0, 2).map((r) => r.skill);
}

/** Draw up to 4 tickets by seeded weighted sampling without replacement. */
function drawTickets(bank: BankTicket[], weight: (t: BankTicket, picked: BankTicket[]) => number, rng: Rng): BankTicket[] {
  const picked: BankTicket[] = [];
  let count = 0;
  while (picked.length < DAILY_TICKETS) {
    const pool = bank.filter((t) => !picked.includes(t)).map((t) => ({ t, w: weight(t, picked) }));
    const total = pool.reduce((n, x) => n + x.w, 0);
    if (total <= 0) break;
    let r = rng.float() * total;
    let choice = pool[pool.length - 1].t;
    for (const x of pool) {
      if (x.w <= 0) continue;
      r -= x.w;
      if (r < 0) {
        choice = x.t;
        break;
      }
    }
    // Draw 3 if a 4th would push the shift past 10 plans.
    if (picked.length === DAILY_TICKETS - 1 && count + choice.steps.length > DAILY_MAX_PLANS) break;
    picked.push(choice);
    count += choice.steps.length;
  }
  return picked;
}

/** How badly an order breaks the order rules (0 = passes dailyOrderOk). Used only to pick the least-bad fallback. */
function orderCost(steps: AgentStep[]): number {
  let cost = 0;
  if (!steps[0]?.safe || isScarySafe(steps[0])) cost += 100;
  if (steps.slice(0, 2).some(isScarySafe)) cost += 10;
  let run = 0;
  const riskyTurns = new Map<number, number>();
  steps.forEach((s, i) => {
    run = s.safe ? 0 : run + 1;
    if (run >= 3) cost += 5;
    if (!s.safe) {
      const turn = turnOfPlan(i);
      if (riskyTurns.has(turn)) cost += 3;
      riskyTurns.set(turn, 1);
    }
  });
  return cost;
}

/**
 * Order the plans: the first of up to 24 seeded ticket shuffles whose round-robin interleave passes
 * the order rules; then up to 48 seeded merges of the chains (still each ticket's order); else the
 * least-bad order tried, with a ticket that starts with a plain safe plan first.
 */
function orderDaily(tickets: BankTicket[], rng: Rng): { tickets: BankTicket[]; steps: AgentStep[]; ok: boolean } {
  let first: BankTicket[] | null = null;
  let best: { tickets: BankTicket[]; steps: AgentStep[]; cost: number } | null = null;
  const consider = (order: BankTicket[], steps: AgentStep[]) => {
    const cost = orderCost(steps);
    if (!best || cost < best.cost) best = { tickets: order, steps, cost };
  };
  for (let i = 0; i < ORDER_TRIES; i++) {
    const order = rng.shuffle(tickets);
    first ??= order;
    const steps = interleave(order);
    if (dailyOrderOk(steps)) return { tickets: order, steps, ok: true };
    consider(order, steps);
  }
  const base = first ?? tickets;
  for (let i = 0; i < MERGE_TRIES; i++) {
    const steps = randomMerge(base, rng);
    if (dailyOrderOk(steps)) return { tickets: base, steps, ok: true };
    consider(base, steps);
  }
  const lead = base.find((t) => t.steps[0]?.safe && !isScarySafe(t.steps[0]));
  const order = lead ? [lead, ...base.filter((t) => t !== lead)] : base;
  consider(order, interleave(order));
  const pick = best as { tickets: BankTicket[]; steps: AgentStep[]; cost: number } | null;
  return pick ? { tickets: pick.tickets, steps: pick.steps, ok: false } : { tickets: order, steps: interleave(order), ok: false };
}

/** A ticket with a risky plan of this lens skill. */
function hasRiskyOf(t: BankTicket, skill: MasterySkillId | null): boolean {
  return !!skill && t.steps.some((s) => !s.safe && s.skill === skill);
}

/** Plan today's (or the next) Daily practice. Same player + same progress.dailyCount = same shift. */
export function planDaily(bank: BankTicket[], progress: PathwayProgress, opts: PlanOptions): ShiftSpec {
  const n = Math.max(0, Math.floor(progress.dailyCount ?? 0));
  const prefix = opts.prefix ?? "hd";
  const seed = seedState(`${opts.playerId}|${prefix}-daily|${n}`);
  const rng = new Rng(seed);
  const focus = pickFocus(progress, opts.today, rng);
  const needs = new Map(MASTERY_SKILLS.map((s) => [s, need(progress.skills?.[s], opts.today)]));
  const recentLists = (progress.recentTickets ?? []).slice(-2);
  const recent = new Set(recentLists.flat());
  const lastDaily = new Set(recentLists.at(-1) ?? []);
  const dailiesDone = (progress.history ?? []).filter((h) => h.mode === "daily").length;
  const d3Open = dailiesDone >= D3_AFTER_DAILIES;

  // The lead focus is a lens skill: the daily should test it with a risky plan (a safe one alone
  // can't show the weakness). Weaker still (a risky plan of it went partly right or got through
  // lately): lean on those tickets harder.
  const lead = focus[0] && focus[0] !== "approve-checked" ? focus[0] : null;
  const leadWeak = !!lead && /[WP]/.test(progress.skills?.[lead]?.recent ?? "");
  const needLeadRisky =
    !!lead && bank.some((t) => hasRiskyOf(t, lead) && !lastDaily.has(t.id) && (t.difficulty < 3 || d3Open));

  const weight = (t: BankTicket, picked: BankTicket[]): number => {
    if (t.difficulty === 3 && (!d3Open || picked.some((p) => p.difficulty === 3))) return 0;
    const skills = ticketSkills(t);
    const base = Math.max(0, ...skills.map((s) => needs.get(s) ?? 0));
    const hitsFocus = skills.some((s) => focus.includes(s));
    const leadRisky = hasRiskyOf(t, lead);
    const recency = recent.has(t.id) ? (leadRisky && leadWeak ? 0.5 : 0.2) : 1;
    return base * (hitsFocus ? 2 : 1) * (leadRisky && leadWeak ? 3 : 1) * recency;
  };

  // Rank each valid draw: an order that passes the rules matters most (fairness), then a risky
  // plan of the lead focus, then the 55-65% safe band. Take the first perfect draw, else the best.
  let best: { tickets: BankTicket[]; steps: AgentStep[]; rank: number } | null = null;
  for (let i = 0; i < DAILY_TRIES && (!best || best.rank > 0); i++) {
    const picks = drawTickets(bank, weight, rng);
    const check = checkDaily(picks);
    if (!check.ok) continue;
    // A fresh one: not from the last daily (the daily before it is fine, at the damped weight).
    const focusOk = !needLeadRisky || picks.some((t) => hasRiskyOf(t, lead) && !lastDaily.has(t.id));
    const rankNoOrder = (focusOk ? 0 : 2) + (check.target ? 0 : 1);
    if (best && best.rank <= rankNoOrder) continue;
    const ordered = orderDaily(picks, rng);
    const rank = rankNoOrder + (ordered.ok ? 0 : 4);
    if (!best || rank < best.rank) best = { tickets: ordered.tickets, steps: ordered.steps, rank };
  }
  let chosen = best as { tickets: BankTicket[]; steps: AgentStep[]; rank: number } | null;
  if (!chosen) {
    const byId = new Map(bank.map((t) => [t.id, t]));
    const fallback = (opts.fallback ?? FALLBACK_DAILY).map((id) => byId.get(id)).filter((t): t is BankTicket => !!t);
    chosen = { ...orderDaily(fallback, rng), rank: 99 };
  }

  return {
    kind: "daily",
    id: `${prefix}-daily-${n}`,
    seed,
    n,
    ticketIds: chosen.tickets.map((t) => t.id),
    stepIds: chosen.steps.map((s) => s.id),
    focus,
    createdOn: opts.today,
    bankVersion: bankVersionOf(bank),
  };
}

/* ------------------------------------------------------------------ */
/* Drills                                                              */
/* ------------------------------------------------------------------ */

export interface DrillOptions extends PlanOptions {
  /** Drills already started for this skill (progress.drillCount[skill]). */
  k: number;
  /** For recency (progress.scored) and the scaffold (the skill's level). */
  progress?: PathwayProgress;
}

/** The drill's target plans: the skill's own plans, or both twists for approve-checked. */
function drillKind(skill: MasterySkillId, s: AgentStep): "safe" | "risky" | null {
  if (skill === "approve-checked") return isScarySafe(s) ? "safe" : isRoutineRisky(s) ? "risky" : null;
  if (s.skill !== skill) return null;
  return s.safe ? "safe" : "risky";
}

function combos<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  const out: T[][] = [];
  items.forEach((item, i) => {
    for (const rest of combos(items.slice(i + 1), size - 1)) out.push([item, ...rest]);
  });
  return out;
}

/** Scaffold violations: Learning wants contrast (a risky target next to a safe one); later, spacing (2+ apart). */
function scaffoldCost(steps: AgentStep[], skill: MasterySkillId, contrast: boolean): number {
  const kinds = steps.map((s) => drillKind(skill, s));
  let cost = 0;
  for (let i = 0; i < kinds.length; i++) {
    if (contrast) {
      if (kinds[i] === "risky" && kinds[i - 1] !== "safe" && kinds[i + 1] !== "safe") cost++;
    } else if (kinds[i] && kinds[i + 1] && kinds[i] !== kinds[i + 1]) {
      cost++;
    }
  }
  return cost;
}

/** A seeded merge of the tickets' chains (each ticket's order kept). */
function randomMerge(tickets: BankTicket[], rng: Rng): AgentStep[] {
  const left = tickets.map((t) => t.steps.slice());
  const out: AgentStep[] = [];
  for (;;) {
    const open = left.filter((l) => l.length > 0);
    if (!open.length) return out;
    out.push(open[rng.int(open.length)].shift() as AgentStep);
  }
}

/** Plan a "Practice this" drill: 2-3 tickets with 2+ safe and 2+ risky plans of the skill, 4-7 plans. */
export function planDrill(bank: BankTicket[], skill: MasterySkillId, opts: DrillOptions): ShiftSpec {
  const k = Math.max(0, Math.floor(opts.k));
  const prefix = opts.prefix ?? "hd";
  const seed = seedState(`${opts.playerId}|${prefix}-drill|${skill}|${k}`);
  const rng = new Rng(seed);
  const pool = bank.filter((t) => t.steps.some((s) => drillKind(skill, s)));
  const count = (ts: BankTicket[], kind: "safe" | "risky") =>
    plans(ts).filter((s) => drillKind(skill, s) === kind).length;

  const recentSteps = new Set(
    Object.entries(opts.progress?.scored ?? {})
      .filter(([, day]) => {
        const age = isDay(day) ? daysBetween(day, opts.today) : NaN;
        return age >= 0 && age < DRILL_RECENT_DAYS;
      })
      .map(([id]) => id),
  );
  const recentCount = (ts: BankTicket[]) => ts.filter((t) => t.steps.some((s) => recentSteps.has(s.id))).length;

  let candidates = [...combos(pool, 2), ...combos(pool, 3)].filter((ts) => {
    const n = plans(ts).length;
    return n >= DRILL_MIN_PLANS && n <= DRILL_MAX_PLANS && count(ts, "safe") >= 2 && count(ts, "risky") >= 2;
  });
  if (!candidates.length) {
    // A thin pool: take whatever gives the most target plans within the size limit.
    const fits = [...combos(pool, 1), ...combos(pool, 2), ...combos(pool, 3)].filter((ts) => plans(ts).length <= DRILL_MAX_PLANS);
    const score = (ts: BankTicket[]) => Math.min(count(ts, "safe"), count(ts, "risky")) * 10 + count(ts, "safe") + count(ts, "risky");
    const best = Math.max(0, ...fits.map(score));
    candidates = fits.filter((ts) => score(ts) === best);
  }
  // Prefer tickets not played in the last 7 days; repeats are allowed when the pool runs out.
  const fewest = Math.min(...candidates.map(recentCount));
  const fresh = candidates.filter((ts) => recentCount(ts) === fewest);
  const tickets = fresh.length ? fresh[rng.int(fresh.length)] : [];

  // Scaffold fades: contrast at Learning (or new), spacing from Practicing on.
  const level: SkillLevel = opts.progress?.skills?.[skill]?.level ?? 0;
  const contrast = level <= 1;
  let best: AgentStep[] = interleave(tickets);
  let bestCost = scaffoldCost(best, skill, contrast);
  for (let i = 0; i < 48 && bestCost > 0; i++) {
    const merged = randomMerge(tickets, rng);
    const cost = scaffoldCost(merged, skill, contrast);
    if (cost < bestCost) {
      best = merged;
      bestCost = cost;
    }
  }

  return {
    kind: "drill",
    id: `${prefix}-drill-${skill}-${k}`,
    seed,
    n: k,
    ticketIds: tickets.map((t) => t.id),
    stepIds: best.map((s) => s.id),
    focus: [skill],
    createdOn: opts.today,
    bankVersion: bankVersionOf(bank),
  };
}

/* ------------------------------------------------------------------ */
/* Starting a shift and building its encounter                         */
/* ------------------------------------------------------------------ */

/** Save the spec before the battle starts: dailyCount / drillCount go up, recentTickets remembers the daily. */
export function beginShift(progress: PathwayProgress, spec: ShiftSpec): PathwayProgress {
  if (spec.kind === "daily") {
    return {
      ...progress,
      shift: spec,
      dailyCount: Math.max(progress.dailyCount ?? 0, spec.n + 1),
      recentTickets: [...(progress.recentTickets ?? []), spec.ticketIds].slice(-2),
    };
  }
  const skill = spec.focus[0];
  const drillCount = { ...(progress.drillCount ?? {}) };
  if (skill) drillCount[skill] = Math.max(drillCount[skill] ?? 0, spec.n + 1);
  return { ...progress, shift: spec, drillCount };
}

/** Why a saved spec can't be rebuilt (bank changed or a step is gone), or null when it's fine. */
export function specProblem(bank: BankTicket[], spec: ShiftSpec): string | null {
  if (spec.bankVersion !== bankVersionOf(bank)) return "The ticket bank changed.";
  const tickets = new Set(bank.map((t) => t.id));
  const steps = new Set(bank.flatMap((t) => t.steps.map((s) => s.id)));
  if (!spec.ticketIds.length || spec.ticketIds.some((id) => !tickets.has(id))) return "A ticket is gone.";
  if (!spec.stepIds.length || spec.stepIds.some((id) => !steps.has(id))) return "A plan is gone.";
  if (new Set(spec.stepIds).size !== spec.stepIds.length) return "A plan is listed twice.";
  return null;
}

/**
 * One set of lines from a pool. `turn` rotates through the pool (a daily's count, a drill's count
 * plus its skill), so back-to-back shifts never repeat a line until the pool runs out.
 */
function pickLines(pools: DialogueLine[][] | undefined, turn: number): DialogueLine[] {
  if (!pools?.length) return [];
  const i = ((Math.floor(turn) % pools.length) + pools.length) % pools.length;
  return pools[i].map((l) => ({ ...l }));
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export interface BuildOptions {
  /** The pathway's agent, copied from its fixed shifts. */
  agent: Encounter["agent"];
  /** Default "help-desk". */
  pathwayId?: PathwayId;
  /** Hydrated onto the encounter (see lib/pathways/create.ts). */
  coach?: CoachInfo;
  headlines?: Partial<Record<HeadlineKey, string[]>>;
  /** Added to a daily's deck when some plan is in its autoInspect categories. Default "policy-callback". */
  policyCard?: CardId;
  /** Hydrated onto the encounter when true (Encounter.noBlockCue). */
  noBlockCue?: boolean;
  /** The pathway's skill copy (the debrief takeaway is the lead focus's oneLiner). */
  skillCopy: (id: MasterySkillId) => { oneLiner: string };
}

/** Default shell text: the Help Desk lines. {n} tickets, {companies}, {agent} (short name). */
const DEFAULT_SETTING_DAILY = "Daily practice at Fenwick IT Solutions. {n} tickets from {companies}. {agent} plans. You check.";
const DEFAULT_SETTING_DRILL = "A quick drill at Fenwick IT Solutions for {companies}. One plan at a time. {agent} plans. You check.";
const DEFAULT_CAREER_INSIGHT =
  "Help desk techs check requests like these every day. Practice keeps the checks quick, so good work still moves fast.";

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(n|companies|agent)\}/g, (_, k: string) => vars[k] ?? "");
}

/** Rebuild the Encounter for a Daily practice or drill spec. Pure: same spec, same encounter. */
export function buildShift(bank: BankTicket[], spec: ShiftSpec, text: ShiftText, opts: BuildOptions): Encounter {
  const stepMap = new Map(bank.flatMap((t) => t.steps.map((s) => [s.id, s] as const)));
  const steps = spec.stepIds.map((id) => {
    const s = stepMap.get(id);
    if (!s) throw new Error(`Shift "${spec.id}" uses unknown step "${id}"`);
    return s;
  });
  const tickets = spec.ticketIds.map((id) => bank.find((t) => t.id === id)).filter((t): t is BankTicket => !!t);
  const riskySum = steps.filter((s) => !s.safe).reduce((n, s) => n + s.risk, 0);
  const companies = [...new Set(tickets.map((t) => t.company))];
  const focus = spec.focus.slice(0, 2);
  const lead = focus[0] ?? "approve-checked";
  // Lines rotate with the shift count: the next daily (or the next drill) says something new.
  const turn = spec.kind === "drill" ? spec.n + MASTERY_SKILLS.indexOf(lead) : spec.n;
  const intro = pickLines(text.intros, turn);
  const outro: Encounter["outro"] = {
    win: pickLines(text.outros.win, turn),
    winWithMisses: pickLines(text.outros.winWithMisses, turn),
    timeout: pickLines(text.outros.timeout, turn),
    breach: pickLines(text.outros.breach, turn),
  };
  const one = pickLines(text.outros.winWithOneMiss, turn);
  if (one.length) outro.winWithOneMiss = one;
  if (spec.kind === "drill") {
    const drillWin = pickLines(text.outros.drillWin, turn);
    if (drillWin.length) outro.drillWin = drillWin;
  }
  const vars = {
    n: String(tickets.length),
    companies: listNames(companies),
    agent: opts.agent.name.split(" ")[0] || opts.agent.name,
  };
  const common = {
    id: spec.id,
    pathwayId: opts.pathwayId ?? ("help-desk" as const),
    agent: { ...opts.agent },
    intro,
    outro,
    steps,
    energyPerTurn: 3,
    // Every plan gets played and graded: risk never reaches the limit (as in practice.json).
    maxRisk: riskySum + 1,
    debrief: {
      skillTag: skillName(lead),
      takeaway: opts.skillCopy(lead).oneLiner,
      careerInsight: text.careerInsight ?? DEFAULT_CAREER_INSIGHT,
    },
    ...(opts.coach ? { coach: { ...opts.coach } } : {}),
    ...(opts.headlines ? { headlines: opts.headlines } : {}),
    ...(opts.noBlockCue ? { noBlockCue: true } : {}),
  };

  if (spec.kind === "drill") {
    return {
      ...common,
      mode: "drill",
      title: `Drill: ${skillName(lead)}`,
      subtitle: `${steps.length} plans · one at a time`,
      setting: fill(text.settingDrill ?? DEFAULT_SETTING_DRILL, vars),
      maxTurns: steps.length + 3,
      handSize: 3,
      actionsPerTurn: [1],
      starterDeck: DRILL_DECK.slice(),
    };
  }

  const deck = DAILY_DECK.slice();
  const policy = opts.policyCard ?? "policy-callback";
  const covers = CARDS[policy]?.autoInspect ?? [];
  if (steps.some((s) => covers.includes(s.category))) deck.push(policy);
  return {
    ...common,
    mode: "daily",
    title: "Daily practice",
    subtitle: `${tickets.length} tickets · Focus: ${focus.map(skillName).join(", ")}`,
    setting: fill(text.settingDaily ?? DEFAULT_SETTING_DAILY, vars),
    // 1 + 2 x 6 = 13 slots: enough for 10 plans and 3 blocked-and-requeued safe plans.
    maxTurns: 7,
    handSize: 5,
    actionsPerTurn: DAILY_ACTIONS_PER_TURN.slice(),
    starterDeck: deck,
  };
}
