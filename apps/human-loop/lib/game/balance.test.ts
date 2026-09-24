/**
 * Balance checks: scripted players over many seeds.
 *
 * - yes-bot:          always ends the turn               -> must lose on >= 95% of seeds
 * - block-everything: blocks every intent it can         -> must lose on >= 95%
 * - careful:          inspects, blocks red flags, escalates what it can't inspect,
 *                     uses policy / coffee / rollback     -> must win on >= 80%
 * - perfect:          knows the answers                   -> must win on >= 98%
 * - random:           plays random cards (reported only)
 *
 * Only the deck shuffle is random (the step queue is authored), so seeds vary the draws.
 */
import { describe, expect, it } from "vitest";
import { createBattle, endTurn, playCard, scoreBattle, validTargets } from "./engine";
import { nextInt, seedState } from "./rng";
import { HELP_DESK_ENCOUNTER } from "./content";
import type { AgentStep, BattleState, CardId, Encounter } from "./types";

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
    random: simulate(enc, randomBot),
  };

  it("reports the numbers", () => {
    const rows = Object.entries(results).map(
      ([name, r]) =>
        `${name.padEnd(17)} win ${pct(r.won).padStart(6)}  breach ${pct(r.breach).padStart(6)}  timeout ${pct(r.timeout).padStart(6)}  stars 0/1/2/3 = ${r.stars.join("/")}`,
    );
    console.info(`\n${rows.join("\n")}\n`);
    expect(rows).toHaveLength(5);
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

  it("stars reward care: careful earns 3 stars often, random rarely", () => {
    expect(results.careful.stars[3] / SEEDS).toBeGreaterThanOrEqual(0.4);
    expect(results.random.stars[3] / SEEDS).toBeLessThanOrEqual(0.05);
    expect(results.random.won / SEEDS).toBeLessThanOrEqual(0.5);
  });
});
