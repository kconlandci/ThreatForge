/**
 * Balance checks: scripted players over many seeds.
 *
 * - yes-bot:          always ends the turn               -> must lose on >= 95% of seeds
 * - block-everything: blocks every intent it can         -> must lose on >= 95%
 * - careful:          inspects, blocks red flags, escalates what it can't inspect,
 *                     uses policy / coffee / rollback     -> must win on >= 80%
 * - perfect:          knows the answers                   -> must win on >= 98%
 * - gut:              never inspects, blocks plans that sound risky (MFA / access)
 *                                                       -> never 3 stars (blind blocks lose the 3rd)
 * - random:           plays random cards (reported only)
 *
 * Only the deck shuffle is random (the step queue is authored), so seeds vary the draws.
 *
 * Generated shifts (Daily practice, drills) can never breach (maxRisk = risky sum + 1), so there a
 * bot "passes" a shift when it ends won with at most 1 plan graded as missed (mastery.gradePlan).
 * Careful must pass most; approving everything (every risky plan gets through, 3+ per daily) and
 * blocking everything (good work keeps coming back until time runs out) must fail. "clean" (won,
 * nothing missed) is checked too: a daily never puts 2 risky plans on one turn (shiftGen
 * dailyOrderOk), so a careful player is not forced into a miss by running out of energy.
 */
import { describe, expect, it } from "vitest";
import { createBattle, endTurn, playCard, scoreBattle, validTargets } from "./engine";
import { nextInt, seedState } from "./rng";
import { HELP_DESK_BANK, HELP_DESK_ENCOUNTER, HELP_DESK_PRACTICE, shiftEncounter } from "./content";
import { shiftTally } from "./mastery";
import { planDaily, planDrill } from "./shiftGen";
import { MASTERY_SKILLS } from "./skills";
import type { AgentStep, BattleState, CardId, Encounter, PathwayProgress } from "./types";

const SEEDS = 200;

type Turn = (s: BattleState, enc: Encounter) => BattleState;

function stepOf(enc: Encounter, id: string): AgentStep {
  const step = enc.steps.find((x) => x.id === id);
  if (!step) throw new Error(`unknown step ${id}`);
  return step;
}

function has(s: BattleState, id: CardId) {
  return s.hand.some((c) => c.cardId === id);
}

/** Play the first copy of a card; null when it's not in hand or the play is illegal. */
function tryPlay(s: BattleState, enc: Encounter, id: CardId, target?: string): BattleState | null {
  const card = s.hand.find((c) => c.cardId === id);
  if (!card) return null;
  const r = playCard(s, enc, card.uid, target);
  return r.ok ? r.state : null;
}

/** Executed steps the player knows were bad (the outcome text is shown), biggest risk first. */
function knownBadExecuted(s: BattleState, enc: Encounter): string[] {
  return validTargets(s, enc, "rollback")
    .filter((id) => !stepOf(enc, id).safe)
    .sort((a, b) => stepOf(enc, b).risk - stepOf(enc, a).risk);
}

/** Roll back a known bad action with leftover energy (drinking coffee to find Roll Back). */
function tryRollback(s: BattleState, enc: Encounter): BattleState | null {
  const bad = knownBadExecuted(s, enc);
  if (bad.length === 0 || s.energy < 2) return null;
  return tryPlay(s, enc, "rollback", bad[0]) ?? (!has(s, "rollback") ? tryPlay(s, enc, "coffee") : null);
}

function finishTurn(s: BattleState, enc: Encounter) {
  return s.status === "playing" ? endTurn(s, enc) : s;
}

const yesBot: Turn = (s, enc) => endTurn(s, enc);

const blockEverything: Turn = (s, enc) => {
  let cur = s;
  while (cur.status === "playing" && cur.announced.length > 0) {
    const next = tryPlay(cur, enc, "block", cur.announced[0]) ?? tryPlay(cur, enc, "coffee");
    if (!next) break;
    cur = next;
  }
  return finishTurn(cur, enc);
};

const careful: Turn = (s, enc) => {
  let cur = s;
  const credentialLeft = () =>
    [...cur.queue, ...cur.announced].some(
      (id) => stepOf(enc, id).category === "credential" && !cur.steps[id].inspected,
    );

  for (let guard = 0; cur.status === "playing" && guard < 50; guard++) {
    // Policy: worth it when a credential intent needs inspecting now, or when energy is spare.
    if (has(cur, "policy-callback") && !cur.powers.callbackPolicy && credentialLeft()) {
      const uninspected = cur.announced.filter((id) => !cur.steps[id].inspected);
      const credentialNow = uninspected.some((id) => stepOf(enc, id).category === "credential");
      const next = credentialNow || cur.energy - uninspected.length >= 2 ? tryPlay(cur, enc, "policy-callback") : null;
      if (next) {
        cur = next;
        continue;
      }
    }

    let acted: BattleState | null = null;
    for (const id of cur.announced) {
      if (!cur.steps[id].inspected) {
        // Inspect; if there's no Inspect in hand, try coffee; else escalate if energy allows.
        acted =
          (cur.energy >= 1 ? tryPlay(cur, enc, "inspect", id) : null) ??
          (cur.energy >= 1 && !has(cur, "inspect") ? tryPlay(cur, enc, "coffee") : null) ??
          (cur.energy >= 2 ? tryPlay(cur, enc, "escalate", id) : null);
      } else if (stepOf(enc, id).evidence.some((e) => e.redFlag)) {
        acted =
          (cur.energy >= 1 ? tryPlay(cur, enc, "block", id) : null) ??
          (cur.energy >= 1 && !has(cur, "block") ? tryPlay(cur, enc, "coffee") : null) ??
          (cur.energy >= 2 ? tryPlay(cur, enc, "escalate", id) : null);
      }
      if (acted) break;
    }
    if (acted) {
      cur = acted;
      continue;
    }

    const rolled = tryRollback(cur, enc);
    if (rolled) {
      cur = rolled;
      continue;
    }
    break;
  }
  return finishTurn(cur, enc);
};

const perfect: Turn = (s, enc) => {
  let cur = s;
  for (let guard = 0; cur.status === "playing" && guard < 50; guard++) {
    let acted: BattleState | null = null;
    for (const id of cur.announced) {
      if (stepOf(enc, id).safe) continue;
      acted =
        (cur.energy >= 1 ? tryPlay(cur, enc, "block", id) : null) ??
        (!has(cur, "block") ? tryPlay(cur, enc, "coffee") : null) ??
        (cur.energy >= 2 ? tryPlay(cur, enc, "escalate", id) : null);
      if (acted) break;
    }
    const next = acted ?? tryRollback(cur, enc);
    if (!next) break;
    cur = next;
  }
  return finishTurn(cur, enc);
};

/** Judges plans by their wording only: blocks anything about MFA or access, never inspects. */
const gut: Turn = (s, enc) => {
  let cur = s;
  for (let guard = 0; cur.status === "playing" && guard < 50; guard++) {
    const id = cur.announced.find((x) => /MFA|access/i.test(stepOf(enc, x).intent));
    if (!id) break;
    const next = tryPlay(cur, enc, "block", id) ?? (!has(cur, "block") ? tryPlay(cur, enc, "coffee") : null);
    if (!next) break;
    cur = next;
  }
  return finishTurn(cur, enc);
};

function randomBot(seed: number): Turn {
  let rng = seedState(`random-${seed}`);
  const roll = (n: number) => {
    const r = nextInt(rng, n);
    rng = r.state;
    return r.value;
  };
  return (s, enc) => {
    let cur = s;
    for (let i = 0; i < 6 && cur.status === "playing" && cur.hand.length > 0; i++) {
      if (roll(10) < 3) break;
      const card = cur.hand[roll(cur.hand.length)];
      const targets = validTargets(cur, enc, card.cardId);
      const r = playCard(cur, enc, card.uid, targets.length ? targets[roll(targets.length)] : undefined);
      if (r.ok) cur = r.state;
    }
    return finishTurn(cur, enc);
  };
}

interface Tally {
  won: number;
  breach: number;
  timeout: number;
  stars: [number, number, number, number];
}

function simulate(enc: Encounter, makeBot: (seed: number) => Turn): Tally {
  const tally: Tally = { won: 0, breach: 0, timeout: 0, stars: [0, 0, 0, 0] };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const bot = makeBot(seed);
    let s = createBattle(enc, seed);
    for (let turns = 0; s.status === "playing"; turns++) {
      if (turns > enc.maxTurns + 1) throw new Error("battle did not end in time");
      s = bot(s, enc);
    }
    if (s.status === "won") tally.won++;
    else if (s.status === "lost-breach") tally.breach++;
    else tally.timeout++;
    tally.stars[scoreBattle(s, enc).stars]++;
  }
  return tally;
}

const pct = (n: number) => `${((100 * n) / SEEDS).toFixed(1)}%`;

describe(`balance: ${HELP_DESK_ENCOUNTER.id} over ${SEEDS} seeds`, () => {
  const enc = HELP_DESK_ENCOUNTER;
  const results = {
    yes: simulate(enc, () => yesBot),
    "block-everything": simulate(enc, () => blockEverything),
    careful: simulate(enc, () => careful),
    perfect: simulate(enc, () => perfect),
    gut: simulate(enc, () => gut),
    random: simulate(enc, randomBot),
  };

  it("reports the numbers", () => {
    const rows = Object.entries(results).map(
      ([name, r]) =>
        `${name.padEnd(17)} win ${pct(r.won).padStart(6)}  breach ${pct(r.breach).padStart(6)}  timeout ${pct(r.timeout).padStart(6)}  stars 0/1/2/3 = ${r.stars.join("/")}`,
    );
    console.info(`\n${rows.join("\n")}\n`);
    expect(rows).toHaveLength(6);
  });

  it("yes-bot (always ends turn) loses to a breach on >= 95% of seeds", () => {
    expect(results.yes.breach / SEEDS).toBeGreaterThanOrEqual(0.95);
  });

  it("block-everything loses (timeout or breach) on >= 95% of seeds", () => {
    const r = results["block-everything"];
    expect((r.breach + r.timeout) / SEEDS).toBeGreaterThanOrEqual(0.95);
  });

  it("careful player wins on >= 80% of seeds", () => {
    expect(results.careful.won / SEEDS).toBeGreaterThanOrEqual(0.8);
  });

  it("perfect-information player wins on >= 98% of seeds", () => {
    expect(results.perfect.won / SEEDS).toBeGreaterThanOrEqual(0.98);
  });

  it("guessing from the wording never earns 3 stars (the 3rd star needs inspected evidence)", () => {
    expect(results.gut.stars[3]).toBe(0);
  });

  it("stars reward care: careful earns 3 stars often, random rarely", () => {
    expect(results.careful.stars[3] / SEEDS).toBeGreaterThanOrEqual(0.4);
    expect(results.random.stars[3] / SEEDS).toBeLessThanOrEqual(0.05);
    expect(results.random.won / SEEDS).toBeLessThanOrEqual(0.5);
  });
});

describe(`balance: ${HELP_DESK_PRACTICE.id} (practice) over ${SEEDS} seeds`, () => {
  const enc = HELP_DESK_PRACTICE;
  const results = {
    yes: simulate(enc, () => yesBot),
    "block-everything": simulate(enc, () => blockEverything),
    careful: simulate(enc, () => careful),
    perfect: simulate(enc, () => perfect),
    gut: simulate(enc, () => gut),
    random: simulate(enc, randomBot),
  };

  it("never ends in a breach, whatever the player does", () => {
    for (const [name, r] of Object.entries(results)) expect(r.breach, name).toBe(0);
  });

  it("approving everything and the careful player always win", () => {
    expect(results.yes.won).toBe(SEEDS);
    expect(results.careful.won).toBe(SEEDS);
    expect(results.perfect.won).toBe(SEEDS);
  });

  it("blocking everything never wins (blocked good work comes back)", () => {
    expect(results["block-everything"].won).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Generated shifts                                                    */
/* ------------------------------------------------------------------ */

interface ShiftTally {
  shifts: number;
  passed: number;
  clean: number;
  won: number;
  breach: number;
  right: number;
  partly: number;
  missed: number;
}

function simulateShifts(encs: { enc: Encounter; seed: number }[], bot: Turn): ShiftTally {
  const t: ShiftTally = { shifts: 0, passed: 0, clean: 0, won: 0, breach: 0, right: 0, partly: 0, missed: 0 };
  for (const { enc, seed } of encs) {
    let s = createBattle(enc, seed);
    for (let turns = 0; s.status === "playing"; turns++) {
      if (turns > enc.maxTurns + 1) throw new Error("battle did not end in time");
      s = bot(s, enc);
    }
    const tally = shiftTally(s, enc);
    t.shifts++;
    if (s.status === "won") t.won++;
    if (s.status === "lost-breach") t.breach++;
    if (s.status === "won" && tally.missed <= 1) t.passed++;
    if (s.status === "won" && tally.missed === 0) t.clean++;
    t.right += tally.right;
    t.partly += tally.partly;
    t.missed += tally.missed;
  }
  return t;
}

const freshProgress = (over: Partial<PathwayProgress> = {}): PathwayProgress => ({
  introSeen: true,
  hub: null,
  battle: null,
  pendingResult: null,
  best: null,
  attempts: 1,
  wins: 1,
  history: [],
  ...over,
});

const unlockedHistory = Array.from({ length: 2 }, (_, i) => ({
  encounterId: `hd-daily-${i}`,
  status: "won" as const,
  stars: 0,
  at: "2026-09-20T10:00:00.000Z",
  catches: 0,
  falseAlarms: 0,
  misses: 0,
  mode: "daily" as const,
}));

function describeGenerated(name: string, encs: { enc: Encounter; seed: number }[]) {
  describe(`balance: ${name} (${encs.length} generated shifts)`, () => {
    const results = {
      yes: simulateShifts(encs, yesBot),
      "block-everything": simulateShifts(encs, blockEverything),
      careful: simulateShifts(encs, careful),
      perfect: simulateShifts(encs, perfect),
    };
    const share = (n: number) => n / encs.length;

    it("reports the numbers", () => {
      const rows = Object.entries(results).map(
        ([bot, r]) =>
          `${bot.padEnd(17)} pass ${(100 * share(r.passed)).toFixed(1).padStart(5)}%  clean ${(100 * share(r.clean)).toFixed(1).padStart(5)}%  won ${(100 * share(r.won)).toFixed(1).padStart(5)}%  right/partly/missed = ${r.right}/${r.partly}/${r.missed}`,
      );
      console.info(`\n${name}\n${rows.join("\n")}\n`);
      expect(rows).toHaveLength(4);
    });

    it("never ends in a breach", () => {
      for (const [bot, r] of Object.entries(results)) expect(r.breach, bot).toBe(0);
    });

    it("careful player passes most shifts; perfect passes nearly all", () => {
      expect(share(results.careful.passed)).toBeGreaterThanOrEqual(0.9);
      expect(share(results.careful.clean)).toBeGreaterThanOrEqual(0.8);
      expect(share(results.perfect.passed)).toBeGreaterThanOrEqual(0.98);
    });

    it("approving everything never passes: every risky plan gets through", () => {
      expect(results.yes.passed).toBe(0);
      expect(results.yes.missed).toBeGreaterThanOrEqual(encs.length);
    });

    it("blocking everything fails: blocked good work comes back until time runs out", () => {
      expect(share(results["block-everything"].passed)).toBeLessThanOrEqual(0.05);
      expect(share(results["block-everything"].won)).toBeLessThanOrEqual(0.05);
    });
  });
}

const DAILY_SHIFTS = 120;
describeGenerated(
  "Daily practice",
  Array.from({ length: DAILY_SHIFTS }, (_, i) => {
    const p = i % 2 ? freshProgress({ history: unlockedHistory, dailyCount: 2 + i }) : freshProgress({ dailyCount: i });
    const spec = planDaily(HELP_DESK_BANK, p, { playerId: `bal-${i}`, today: "2026-09-25" });
    return { enc: shiftEncounter(spec), seed: spec.seed };
  }),
);

describeGenerated(
  "drills",
  MASTERY_SKILLS.flatMap((skill) =>
    Array.from({ length: 12 }, (_, k) => {
      const spec = planDrill(HELP_DESK_BANK, skill, { playerId: `bal-${k}`, k, today: "2026-09-25" });
      return { enc: shiftEncounter(spec), seed: spec.seed };
    }),
  ),
);
