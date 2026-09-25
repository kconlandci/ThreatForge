import { describe, expect, it } from "vitest";
import { CARDS } from "./cards";
import { blindBlocks, blindSafeBlocks, canResume, createBattle, deckAtTurn, endTurn, playCard, scoreBattle, validTargets } from "./engine";
import { nextFloat, seedState, shuffle } from "./rng";
import { HELP_DESK_ENCOUNTER } from "./content";
import type { AgentStep, BattleState, CardId, Encounter, PlayResult } from "./types";

/* ------------------------------------------------------------------ */
/* Fixture: a small encounter so rule tests don't depend on tuning     */
/* ------------------------------------------------------------------ */

function step(id: string, patch: Partial<AgentStep>): AgentStep {
  return {
    id,
    ticket: "#1 · Test Co",
    intent: `Do ${id}`,
    quip: "Beep.",
    category: "lookup",
    safe: true,
    reversible: true,
    progress: 1,
    risk: 0,
    evidence: [{ label: "Note", detail: "Looks fine.", redFlag: false }],
    outcome: { executed: "Done.", blocked: "Stopped.", escalated: "Dana did it." },
    lesson: "Test.",
    ...patch,
  };
}

const FIXTURE: Encounter = {
  id: "fixture",
  pathwayId: "help-desk",
  title: "Fixture",
  subtitle: "",
  agent: { name: "TestBot 9000", role: "", spriteKey: "ollie", personality: "" },
  setting: "",
  intro: [],
  maxRisk: 8,
  maxTurns: 4,
  energyPerTurn: 3,
  handSize: 5,
  actionsPerTurn: [2],
  steps: [
    step("s1", { progress: 1 }),
    step("u1", { safe: false, category: "credential", risk: 4, progress: 0 }),
    step("s2", { progress: 2, category: "access" }),
    step("u2", { safe: false, reversible: false, category: "data", risk: 5, progress: 0 }),
    step("s3", { category: "credential", progress: 1 }),
  ],
  starterDeck: ["inspect", "inspect", "inspect", "block", "block", "block", "escalate", "rollback", "policy-callback", "coffee"],
  outro: { win: [], breach: [], timeout: [] },
  debrief: { skillTag: "", takeaway: "", careerInsight: "" },
};

/** Replace the hand with specific cards (uids h1, h2, ...). Other piles keep their cards. */
function withHand(state: BattleState, cards: CardId[], patch: Partial<BattleState> = {}): BattleState {
  return { ...state, hand: cards.map((cardId, i) => ({ uid: `h${i + 1}`, cardId })), ...patch };
}

function uidOf(state: BattleState, cardId: CardId): string {
  const c = state.hand.find((x) => x.cardId === cardId);
  if (!c) throw new Error(`no ${cardId} in hand`);
  return c.uid;
}

function ok(result: PlayResult): BattleState {
  if (!result.ok) throw new Error(`expected ok, got: ${result.reason}`);
  return result.state;
}

function play(state: BattleState, cardId: CardId, target?: string, enc: Encounter = FIXTURE): BattleState {
  return ok(playCard(state, enc, uidOf(state, cardId), target));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

function allCards(s: BattleState) {
  return [...s.drawPile, ...s.hand, ...s.discardPile, ...s.exhausted].map((c) => c.uid).sort();
}

/**
 * Resolve every announced step correctly (inspect and block unsafe, let safe run) until the battle
 * ends. With `inspect: false` it blocks the risky plans blind (a lucky guess).
 */
function playCorrectly(state: BattleState, enc: Encounter, opts: { inspect?: boolean } = {}): BattleState {
  const inspect = opts.inspect ?? true;
  let s = state;
  for (let guard = 0; s.status === "playing" && guard < 50; guard++) {
    const bad = s.announced.filter((id) => !enc.steps.find((x) => x.id === id)!.safe);
    const blocks = bad.map((_, i) => `b${i}`);
    const looks = bad.map((_, i) => `i${i}`);
    s = {
      ...s,
      energy: 99,
      hand: [
        ...blocks.map((uid) => ({ uid, cardId: "block" as const })),
        ...(inspect ? looks.map((uid) => ({ uid, cardId: "inspect" as const })) : []),
      ],
    };
    bad.forEach((id, i) => {
      if (inspect && !s.steps[id].inspected) s = ok(playCard(s, enc, looks[i], id));
      s = ok(playCard(s, enc, blocks[i], id));
    });
    if (s.status === "playing") s = endTurn(s, enc);
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* RNG                                                                 */
/* ------------------------------------------------------------------ */

describe("rng", () => {
  it("is deterministic and in [0, 1)", () => {
    let a = seedState(42);
    let b = seedState(42);
    for (let i = 0; i < 100; i++) {
      const ra = nextFloat(a);
      const rb = nextFloat(b);
      expect(ra).toEqual(rb);
      expect(ra.value).toBeGreaterThanOrEqual(0);
      expect(ra.value).toBeLessThan(1);
      a = ra.state;
      b = rb.state;
    }
  });

  it("shuffles into a new array without touching the input", () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
    const r = shuffle(input, seedState(7));
    expect([...r.items].sort()).toEqual([...input]);
    expect(r.items).not.toBe(input);
    expect(shuffle(input, seedState(7))).toEqual(r);
  });

  it("spreads nearby seeds apart", () => {
    const firsts = new Set([1, 2, 3, 4, 5].map((s) => seedState(s)));
    expect(firsts.size).toBe(5);
  });
});

/* ------------------------------------------------------------------ */
/* createBattle                                                        */
/* ------------------------------------------------------------------ */

describe("createBattle", () => {
  it("starts turn 1 with energy, a full hand and announced intents", () => {
    const s = createBattle(FIXTURE, 1);
    expect(s.version).toBe(1);
    expect(s.encounterId).toBe("fixture");
    expect(s.status).toBe("playing");
    expect(s.turn).toBe(1);
    expect(s.energy).toBe(3);
    expect(s.hand).toHaveLength(5);
    expect(s.drawPile).toHaveLength(5);
    expect(s.announced).toEqual(["s1", "u1"]);
    expect(s.queue).toEqual(["s2", "u2", "s3"]);
    expect(s.steps.s1.status).toBe("announced");
    expect(s.steps.s2.status).toBe("queued");
    expect(s.events.map((e) => e.t)).toEqual(["turn-start", "energy", "draw", "announce", "announce"]);
    expect(s.events[2]).toEqual({ t: "draw", count: 5 });
  });

  it("gives cards deterministic uids c1..cN in deck order", () => {
    const s = createBattle(FIXTURE, 99);
    expect(allCards(s)).toEqual(FIXTURE.starterDeck.map((_, i) => `c${i + 1}`).sort());
    const byUid = new Map([...s.drawPile, ...s.hand].map((c) => [c.uid, c.cardId]));
    FIXTURE.starterDeck.forEach((cardId, i) => expect(byUid.get(`c${i + 1}`)).toBe(cardId));
  });

  it("shuffles differently for different seeds", () => {
    const orders = new Set(
      Array.from({ length: 10 }, (_, i) => createBattle(FIXTURE, i + 1).hand.map((c) => c.uid).join()),
    );
    expect(orders.size).toBeGreaterThan(5);
  });

  it("rejects broken encounters", () => {
    expect(() => createBattle({ ...FIXTURE, steps: [] }, 1)).toThrow();
    expect(() => createBattle({ ...FIXTURE, steps: [step("a", {}), step("a", {})] }, 1)).toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* validTargets                                                        */
/* ------------------------------------------------------------------ */

describe("validTargets", () => {
  it("intent cards target announced intents; inspect skips inspected ones", () => {
    let s = withHand(createBattle(FIXTURE, 1), ["inspect", "block"]);
    expect(validTargets(s, FIXTURE, "inspect")).toEqual(["s1", "u1"]);
    s = play(s, "inspect", "s1");
    expect(validTargets(s, FIXTURE, "inspect")).toEqual(["u1"]);
    expect(validTargets(s, FIXTURE, "block")).toEqual(["s1", "u1"]);
    expect(validTargets(s, FIXTURE, "escalate")).toEqual(["s1", "u1"]);
  });

  it("rollback targets executed, reversible, not rolled-back steps", () => {
    let s = createBattle(FIXTURE, 1);
    expect(validTargets(s, FIXTURE, "rollback")).toEqual([]);
    s = endTurn(s, FIXTURE); // s1 + u1 execute
    expect(validTargets(s, FIXTURE, "rollback")).toEqual(["s1", "u1"]);
    s = endTurn(s, FIXTURE); // s2 + u2 execute -> risk 9 >= 8 -> breach
    expect(s.status).toBe("lost-breach");
    expect(validTargets(s, FIXTURE, "rollback")).toEqual([]);
  });

  it("excludes irreversible steps from rollback", () => {
    const enc: Encounter = { ...FIXTURE, maxRisk: 100 };
    let s = endTurn(endTurn(createBattle(enc, 1), enc), enc);
    expect(s.executedHistory).toEqual(["s1", "u1", "s2", "u2"]);
    expect(validTargets(s, enc, "rollback")).toEqual(["s1", "u1", "s2"]);
    s = play(withHand(s, ["rollback"]), "rollback", "u1", enc);
    expect(validTargets(s, enc, "rollback")).toEqual(["s1", "s2"]);
  });

  it("returns [] for untargeted cards", () => {
    const s = createBattle(FIXTURE, 1);
    expect(validTargets(s, FIXTURE, "coffee")).toEqual([]);
    expect(validTargets(s, FIXTURE, "policy-callback")).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Card rules                                                          */
/* ------------------------------------------------------------------ */

describe("cards", () => {
  it("inspect reveals an intent once and costs 1", () => {
    const s0 = withHand(createBattle(FIXTURE, 1), ["inspect", "inspect"]);
    const s1 = play(s0, "inspect", "u1");
    expect(s1.steps.u1.inspected).toBe(true);
    expect(s1.energy).toBe(2);
    expect(s1.stats.inspections).toBe(1);
    expect(s1.hand).toHaveLength(1);
    expect(s1.discardPile.at(-1)?.cardId).toBe("inspect");
    expect(s1.events.slice(-2)).toEqual([
      { t: "card-played", cardId: "inspect", targetStepId: "u1" },
      { t: "inspected", stepId: "u1", auto: false },
    ]);
    const again = playCard(s1, FIXTURE, uidOf(s1, "inspect"), "u1");
    expect(again).toEqual({ ok: false, reason: expect.stringMatching(/already inspected/i) });
  });

  it("block on an unsafe intent catches it", () => {
    const s = play(withHand(createBattle(FIXTURE, 1), ["block"]), "block", "u1");
    expect(s.announced).toEqual(["s1"]);
    expect(s.steps.u1.status).toBe("blocked");
    expect(s.steps.u1.resolvedOnTurn).toBe(1);
    expect(s.stats.catches).toBe(1);
    expect(s.stats.falseAlarms).toBe(0);
    expect(s.events.at(-1)).toEqual({ t: "caught", stepId: "u1", by: "block" });
  });

  it("block on a safe intent is a false alarm and sends it to the back of the queue", () => {
    const s = play(withHand(createBattle(FIXTURE, 1), ["block"]), "block", "s1");
    expect(s.announced).toEqual(["u1"]);
    expect(s.queue).toEqual(["s2", "u2", "s3", "s1"]);
    expect(s.steps.s1).toMatchObject({ status: "queued", requeues: 1, resolvedOnTurn: null });
    expect(s.stats.falseAlarms).toBe(1);
    expect(s.stats.catches).toBe(0);
    expect(s.events.at(-1)).toEqual({ t: "false-alarm", stepId: "s1" });
  });

  it("escalate resolves correctly either way and costs 2", () => {
    const base = withHand(createBattle(FIXTURE, 1), ["escalate", "escalate"], { energy: 4 });
    const a = play(base, "escalate", "u1");
    expect(a.energy).toBe(2);
    expect(a.steps.u1.status).toBe("escalated");
    expect(a.stats).toMatchObject({ catches: 1, escalations: 1, falseAlarms: 0 });
    expect(a.events.at(-1)).toEqual({ t: "caught", stepId: "u1", by: "escalate" });

    const b = play(a, "escalate", "s1");
    expect(b.steps.s1.status).toBe("escalated");
    expect(b.progress).toBe(1);
    expect(b.stats).toMatchObject({ catches: 1, escalations: 2, falseAlarms: 0 });
    expect(b.events.at(-1)).toEqual({ t: "escalated-safe", stepId: "s1", progress: 1 });
  });

  it("rollback on an executed unsafe step removes its risk and the miss", () => {
    let s = endTurn(createBattle(FIXTURE, 1), FIXTURE);
    expect(s.risk).toBe(4);
    expect(s.stats.misses).toBe(1);
    s = play(withHand(s, ["rollback"]), "rollback", "u1");
    expect(s.risk).toBe(0);
    expect(s.stats.misses).toBe(0);
    expect(s.stats.rollbacks).toBe(1);
    expect(s.stats.falseAlarms).toBe(0);
    expect(s.energy).toBe(1);
    expect(s.steps.u1.status).toBe("rolled-back");
    expect(s.events.at(-1)).toEqual({ t: "rolled-back", stepId: "u1", riskRemoved: 4, progressRemoved: 0 });
  });

  it("rollback on an executed safe step removes progress and counts a false alarm", () => {
    let s = endTurn(createBattle(FIXTURE, 1), FIXTURE);
    expect(s.progress).toBe(1);
    s = play(withHand(s, ["rollback"]), "rollback", "s1");
    expect(s.progress).toBe(0);
    expect(s.stats.falseAlarms).toBe(1);
    expect(s.steps.s1.status).toBe("rolled-back");
    expect(s.queue).not.toContain("s1");
    expect(s.events.slice(-2)).toEqual([
      { t: "rolled-back", stepId: "s1", riskRemoved: 0, progressRemoved: 1 },
      { t: "false-alarm", stepId: "s1" },
    ]);
  });

  it("rollback refuses irreversible or unexecuted steps", () => {
    const enc: Encounter = { ...FIXTURE, maxRisk: 100 };
    const s = withHand(endTurn(endTurn(createBattle(enc, 1), enc), enc), ["rollback"]);
    const irreversible = playCard(s, enc, "h1", "u2");
    expect(irreversible).toEqual({ ok: false, reason: expect.stringMatching(/can't be undone/i) });
    const notExecuted = playCard(s, enc, "h1", "s3");
    expect(notExecuted.ok).toBe(false);
    const noTarget = playCard(s, enc, "h1");
    expect(noTarget).toEqual({ ok: false, reason: expect.stringMatching(/undo/i) });
  });

  it("policy-callback is a power that exhausts and auto-inspects credential intents now and later", () => {
    let s = withHand(createBattle(FIXTURE, 1), ["policy-callback", "policy-callback"]);
    s = play(s, "policy-callback");
    expect(s.powers.callbackPolicy).toBe(true);
    expect(s.exhausted.map((c) => c.cardId)).toEqual(["policy-callback"]);
    expect(s.steps.u1.inspected).toBe(true); // credential
    expect(s.steps.s1.inspected).toBe(false); // lookup
    expect(s.events.slice(-3)).toEqual([
      { t: "card-played", cardId: "policy-callback" },
      { t: "power", power: "callbackPolicy" },
      { t: "inspected", stepId: "u1", auto: true },
    ]);
    const second = playCard(s, FIXTURE, uidOf(s, "policy-callback"));
    expect(second).toEqual({ ok: false, reason: expect.stringMatching(/already on/i) });

    // Turn 2 announces s2 (access) + u2 (data): nothing to auto-inspect. Turn 3 announces s3 (credential).
    const enc: Encounter = { ...FIXTURE, maxRisk: 100 };
    s = endTurn(endTurn(s, enc), enc);
    expect(s.announced).toEqual(["s3"]);
    expect(s.steps.s3.inspected).toBe(true);
    expect(s.events.at(-1)).toEqual({ t: "inspected", stepId: "s3", auto: true });
  });

  it("coffee draws 2, costs 0 and exhausts", () => {
    const s0 = createBattle(FIXTURE, 3);
    const s = withHand(s0, ["coffee"]);
    const after = play(s, "coffee");
    expect(after.hand).toHaveLength(2);
    expect(after.energy).toBe(3);
    expect(after.drawPile).toHaveLength(s.drawPile.length - 2);
    expect(after.exhausted.map((c) => c.cardId)).toEqual(["coffee"]);
    expect(after.events.at(-1)).toEqual({ t: "draw", count: 2 });
  });

  it("coffee reshuffles the discard pile when the draw pile is empty", () => {
    const s0 = createBattle(FIXTURE, 3);
    const s = withHand(s0, ["coffee"], { drawPile: [], discardPile: s0.drawPile });
    const after = play(s, "coffee");
    expect(after.hand).toHaveLength(2);
    expect(after.discardPile).toHaveLength(0);
    expect(after.drawPile).toHaveLength(s0.drawPile.length - 2);
    expect(after.rng).not.toBe(s.rng);
  });

  it("coffee is refused when there is nothing to draw", () => {
    const s = withHand(createBattle(FIXTURE, 3), ["coffee"], { drawPile: [], discardPile: [] });
    expect(playCard(s, FIXTURE, "h1")).toEqual({ ok: false, reason: expect.stringMatching(/no cards left/i) });
  });

  it("every card id in CARDS has a rule and a sane cost", () => {
    for (const card of Object.values(CARDS)) {
      expect(card.cost).toBeGreaterThanOrEqual(0);
      expect(card.cost).toBeLessThanOrEqual(3);
      expect(card.text.length).toBeGreaterThan(0);
      expect(card.flavor.length).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Illegal plays                                                       */
/* ------------------------------------------------------------------ */

describe("illegal plays", () => {
  const s = withHand(createBattle(FIXTURE, 1), ["inspect", "escalate", "block"]);

  it("needs enough energy", () => {
    const low = { ...s, energy: 1 };
    const r = playCard(low, FIXTURE, uidOf(low, "escalate"), "u1");
    expect(r).toEqual({ ok: false, reason: expect.stringMatching(/not enough energy/i) });
    const none = { ...s, energy: 0 };
    expect(playCard(none, FIXTURE, uidOf(none, "inspect"), "u1")).toEqual({
      ok: false,
      reason: "Out of energy. Tap “Approve”.",
    });
  });

  it("needs the card in hand", () => {
    expect(playCard(s, FIXTURE, "nope", "u1")).toEqual({ ok: false, reason: expect.stringMatching(/not in your hand|isn't in your hand/i) });
  });

  it("needs a valid target", () => {
    expect(playCard(s, FIXTURE, uidOf(s, "block"))).toEqual({ ok: false, reason: expect.stringMatching(/pick an intent/i) });
    expect(playCard(s, FIXTURE, uidOf(s, "block"), "s2")).toEqual({ ok: false, reason: expect.stringMatching(/isn't on the board/i) });
    expect(playCard(s, FIXTURE, uidOf(s, "block"), "ghost")).toMatchObject({ ok: false });
  });

  it("refuses plays after the battle ends", () => {
    const over = { ...s, status: "won" as const };
    expect(playCard(over, FIXTURE, uidOf(over, "inspect"), "u1")).toEqual({ ok: false, reason: expect.stringMatching(/over/i) });
    expect(validTargets(over, FIXTURE, "inspect")).toEqual([]);
  });

  it("refuses a state from another encounter", () => {
    expect(playCard(s, { ...FIXTURE, id: "other" }, uidOf(s, "inspect"), "u1").ok).toBe(false);
  });

  it("keeps reasons short and player-facing", () => {
    const reasons = [
      playCard({ ...s, energy: 1 }, FIXTURE, uidOf(s, "escalate"), "u1"),
      playCard(s, FIXTURE, "nope"),
      playCard(s, FIXTURE, uidOf(s, "block")),
      playCard({ ...s, energy: 0 }, FIXTURE, uidOf(s, "inspect"), "u1"),
    ];
    for (const r of reasons) {
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.reason.length).toBeLessThanOrEqual(60);
        // One word for one action: the main button is "Approve".
        expect(r.reason).not.toMatch(/proceed|let it run/i);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* endTurn                                                             */
/* ------------------------------------------------------------------ */

describe("endTurn", () => {
  it("executes announced intents in order, then starts the next turn", () => {
    const s0 = createBattle(FIXTURE, 5);
    const spent = play(withHand(s0, ["inspect"]), "inspect", "s1");
    const s = endTurn(spent, FIXTURE);
    const newEvents = s.events.slice(spent.events.length);
    expect(newEvents.slice(0, 2)).toEqual([
      { t: "executed", stepId: "s1", safe: true, risk: 0, progress: 1 },
      { t: "executed", stepId: "u1", safe: false, risk: 4, progress: 0 },
    ]);
    expect(newEvents.slice(2).map((e) => e.t)).toEqual(["turn-start", "energy", "draw", "announce", "announce"]);
    expect(s.executedHistory).toEqual(["s1", "u1"]);
    expect(s.steps.s1).toMatchObject({ status: "executed", resolvedOnTurn: 1 });
    expect(s.progress).toBe(1);
    expect(s.risk).toBe(4);
    expect(s.stats.misses).toBe(1);
    expect(s.turn).toBe(2);
    expect(s.energy).toBe(3);
    expect(s.hand).toHaveLength(5);
    expect(s.announced).toEqual(["s2", "u2"]);
    expect(allCards(s)).toEqual(allCards(spent));
  });

  it("discards the old hand and draws a fresh one, reshuffling when needed", () => {
    let s = createBattle({ ...FIXTURE, maxRisk: 100, maxTurns: 10, actionsPerTurn: [0] }, 8);
    const enc: Encounter = { ...FIXTURE, maxRisk: 100, maxTurns: 10, actionsPerTurn: [0] };
    // actionsPerTurn [0] announces nothing, so the queue never empties: pure card cycling.
    for (let i = 0; i < 6; i++) {
      s = endTurn(s, enc);
      expect(s.hand).toHaveLength(5);
      expect(allCards(s)).toHaveLength(FIXTURE.starterDeck.length);
      expect(new Set(allCards(s)).size).toBe(FIXTURE.starterDeck.length);
    }
  });

  it("uses the last actionsPerTurn value for later turns", () => {
    const enc: Encounter = { ...FIXTURE, actionsPerTurn: [1, 3], maxRisk: 100 };
    let s = createBattle(enc, 1);
    expect(s.announced).toEqual(["s1"]);
    s = endTurn(s, enc);
    expect(s.announced).toEqual(["u1", "s2", "u2"]);
    s = endTurn(s, enc);
    expect(s.announced).toEqual(["s3"]);
  });

  it("returns the same state when the battle is over", () => {
    const over = { ...createBattle(FIXTURE, 1), status: "lost-breach" as const };
    expect(endTurn(over, FIXTURE)).toBe(over);
  });
});

/* ------------------------------------------------------------------ */
/* Win / loss                                                          */
/* ------------------------------------------------------------------ */

describe("win and loss", () => {
  it("wins when every step is resolved and risk is under the limit", () => {
    const s = playCorrectly(createBattle(FIXTURE, 2), FIXTURE);
    expect(s.status).toBe("won");
    expect(s.events.at(-1)).toEqual({ t: "end", status: "won" });
    expect(s.queue).toEqual([]);
    expect(s.announced).toEqual([]);
    expect(s.risk).toBe(0);
    expect(s.progress).toBe(4);
    expect(s.stats).toMatchObject({ catches: 2, misses: 0, falseAlarms: 0 });
    const score = scoreBattle(s, FIXTURE);
    expect(score).toMatchObject({ stars: 3, catches: 2, misses: 0, falseAlarms: 0, turnsUsed: 3 });
    expect(score.headline.length).toBeGreaterThan(0);
    expect(score.headline).not.toContain("{agent}");
  });

  it("wins immediately when a card resolves the last intent", () => {
    const enc: Encounter = { ...FIXTURE, steps: [FIXTURE.steps[1]] };
    const s = play(withHand(createBattle(enc, 1), ["block"]), "block", "u1", enc);
    expect(s.status).toBe("won");
    expect(s.events.slice(-2)).toEqual([
      { t: "caught", stepId: "u1", by: "block" },
      { t: "end", status: "won" },
    ]);
  });

  it("loses to a breach the moment risk reaches the limit", () => {
    const enc: Encounter = {
      ...FIXTURE,
      maxRisk: 4,
      actionsPerTurn: [3],
    };
    const s = endTurn(createBattle(enc, 1), enc); // s1, u1 (risk 4 -> breach), s2 never runs
    expect(s.status).toBe("lost-breach");
    expect(s.risk).toBe(4);
    expect(s.executedHistory).toEqual(["s1", "u1"]);
    expect(s.announced).toEqual(["s2"]);
    expect(s.steps.s2.status).toBe("announced");
    expect(s.events.at(-1)).toEqual({ t: "end", status: "lost-breach" });
    expect(s.turn).toBe(1);
    expect(scoreBattle(s, enc).stars).toBe(0);
  });

  it("loses to a timeout when the shift ends with work left", () => {
    let s = createBattle(FIXTURE, 4);
    for (let guard = 0; s.status === "playing" && guard < 20; guard++) {
      // Block every safe intent forever (never runs out: fresh blocks each turn).
      s = { ...s, energy: 99, hand: s.announced.map((_, i) => ({ uid: `b${i}`, cardId: "block" as const })) };
      for (let i = 0; s.announced.length > 0; i++) s = ok(playCard(s, FIXTURE, `b${i}`, s.announced[0]));
      if (s.status === "playing") s = endTurn(s, FIXTURE);
    }
    expect(s.status).toBe("lost-timeout");
    expect(s.turn).toBe(FIXTURE.maxTurns);
    expect(s.events.at(-1)).toEqual({ t: "end", status: "lost-timeout" });
    expect(s.stats.falseAlarms).toBeGreaterThan(0);
    expect(scoreBattle(s, FIXTURE)).toMatchObject({ stars: 0, turnsUsed: FIXTURE.maxTurns });
  });

  it("scores stars from misses and false alarms", () => {
    const won = playCorrectly(createBattle(FIXTURE, 2), FIXTURE);
    const stars = (misses: number, falseAlarms: number) =>
      scoreBattle({ ...won, stats: { ...won.stats, misses, falseAlarms } }, FIXTURE).stars;
    expect(stars(0, 0)).toBe(3);
    expect(stars(0, 1)).toBe(3);
    expect(stars(0, 2)).toBe(2);
    expect(stars(1, 0)).toBe(2);
    expect(stars(1, 1)).toBe(2);
    expect(stars(2, 3)).toBe(1);
  });

  it("withholds the third star for risky plans blocked without inspecting them", () => {
    const blind = playCorrectly(createBattle(FIXTURE, 2), FIXTURE, { inspect: false });
    expect(blind.status).toBe("won");
    expect(blindBlocks(blind, FIXTURE).length).toBeGreaterThan(0);
    expect(scoreBattle(blind, FIXTURE).stars).toBe(2);
    const careful = playCorrectly(createBattle(FIXTURE, 2), FIXTURE);
    expect(blindBlocks(careful, FIXTURE)).toEqual([]);
    expect(scoreBattle(careful, FIXTURE).stars).toBe(3);
  });

  it("lists safe plans blocked before their evidence was seen (for the result checklist's wording)", () => {
    const start = createBattle(FIXTURE, 3);
    // Turn 1 announces s1 (safe) and u1. Block s1 without inspecting it.
    const blind = play(withHand(start, ["block", "inspect"], { energy: 3 }), "block", "s1");
    expect(blindSafeBlocks(blind, FIXTURE)).toEqual(["s1"]);
    const checked = play(play(withHand(start, ["block", "inspect"], { energy: 3 }), "inspect", "s1"), "block", "s1");
    expect(blindSafeBlocks(checked, FIXTURE)).toEqual([]);
  });

  it("has a headline for every outcome", () => {
    const base = createBattle(FIXTURE, 1);
    for (const status of ["playing", "won", "lost-breach", "lost-timeout"] as const) {
      for (const [misses, falseAlarms] of [
        [0, 0],
        [0, 1],
        [0, 3],
        [1, 0],
        [2, 2],
      ]) {
        const h = scoreBattle({ ...base, status, stats: { ...base.stats, misses, falseAlarms } }, FIXTURE).headline;
        expect(h.length).toBeGreaterThan(0);
        expect(h.length).toBeLessThanOrEqual(70);
        expect(h).not.toContain("{agent}");
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Purity, determinism, persistence                                    */
/* ------------------------------------------------------------------ */

/** A scripted run that touches every card and endTurn. */
function script(enc: Encounter, seed: number, transform: (s: BattleState) => BattleState = (s) => s) {
  const snapshots: BattleState[] = [];
  let s = transform(createBattle(enc, seed));
  snapshots.push(s);
  for (let guard = 0; s.status === "playing" && guard < 40; guard++) {
    // Play every playable card on its first valid target, cheapest first.
    for (let i = 0; i < 8 && s.status === "playing"; i++) {
      const playable = s.hand
        .map((c) => ({ c, def: CARDS[c.cardId], targets: validTargets(s, enc, c.cardId) }))
        .filter(({ def, targets }) => def.cost <= s.energy && (def.target === "none" || targets.length > 0));
      if (playable.length === 0) break;
      const { c, targets } = playable[0];
      const r = playCard(s, enc, c.uid, targets[0]);
      if (!r.ok) break;
      s = transform(r.state);
      snapshots.push(s);
    }
    if (s.status === "playing") {
      s = transform(endTurn(s, enc));
      snapshots.push(s);
    }
  }
  return snapshots;
}

describe("purity and determinism", () => {
  it("same seed -> identical states", () => {
    for (const enc of [FIXTURE, HELP_DESK_ENCOUNTER]) {
      const a = script(enc, 1234);
      const b = script(enc, 1234);
      expect(a).toEqual(b);
      expect(a.at(-1)!.status).not.toBe("playing");
    }
  });

  it("never mutates its input (deep-frozen states)", () => {
    for (const enc of [FIXTURE, HELP_DESK_ENCOUNTER]) {
      const frozen = script(enc, 77, (s) => deepFreeze(structuredClone(s)));
      const plain = script(enc, 77);
      expect(frozen).toEqual(plain);
    }
    // And the input is unchanged after each call.
    const s0 = deepFreeze(withHand(createBattle(FIXTURE, 1), ["inspect", "block", "coffee", "policy-callback"]));
    const before = JSON.stringify(s0);
    play(s0, "inspect", "u1");
    play(s0, "block", "s1");
    play(s0, "coffee");
    play(s0, "policy-callback");
    endTurn(s0, FIXTURE);
    validTargets(s0, FIXTURE, "rollback");
    scoreBattle(s0, FIXTURE);
    expect(JSON.stringify(s0)).toBe(before);
  });

  it("round-trips through JSON and resumes identically", () => {
    for (const enc of [FIXTURE, HELP_DESK_ENCOUNTER]) {
      const direct = script(enc, 2024);
      const viaJson = script(enc, 2024, (s) => JSON.parse(JSON.stringify(s)) as BattleState);
      expect(viaJson).toEqual(direct);
      for (const s of direct) expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    }
  });

  it("appends events and never rewrites old ones", () => {
    const snaps = script(HELP_DESK_ENCOUNTER, 5);
    for (let i = 1; i < snaps.length; i++) {
      const prev = snaps[i - 1];
      const next = snaps[i];
      expect(next.events.length).toBeGreaterThan(prev.events.length);
      expect(next.events.slice(0, prev.events.length)).toEqual(prev.events);
    }
    const last = snaps.at(-1)!;
    expect(last.events.filter((e) => e.t === "end")).toHaveLength(1);
  });

  it("conserves cards across a whole battle (the deck grows only by unlocks)", () => {
    const snaps = script(HELP_DESK_ENCOUNTER, 11);
    expect(HELP_DESK_ENCOUNTER.unlocks?.length).toBeGreaterThan(0);
    for (const s of snaps) {
      const deck = deckAtTurn(HELP_DESK_ENCOUNTER, s.turn).map((_, i) => `c${i + 1}`).sort();
      expect(allCards(s)).toEqual(deck);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Unlocks                                                             */
/* ------------------------------------------------------------------ */

const UNLOCKING: Encounter = {
  ...FIXTURE,
  id: "fixture-unlocks",
  maxTurns: 6,
  actionsPerTurn: [1],
  starterDeck: ["inspect", "inspect", "block", "block"],
  handSize: 3,
  unlocks: [
    { turn: 3, cards: ["escalate"] },
    { turn: 2, cards: ["policy-callback", "coffee"] },
  ],
};

/** Let every plan run (no card plays) and keep only the states that are still playing. */
function turns(enc: Encounter, seed: number): BattleState[] {
  const out: BattleState[] = [];
  let s = createBattle(enc, seed);
  while (s.status === "playing") {
    out.push(s);
    s = endTurn(s, enc);
  }
  return out;
}

describe("unlocks", () => {
  it("builds the deck for a turn from the starter deck plus unlocks so far, in turn order", () => {
    expect(deckAtTurn(UNLOCKING, 1)).toEqual(["inspect", "inspect", "block", "block"]);
    expect(deckAtTurn(UNLOCKING, 2)).toEqual(["inspect", "inspect", "block", "block", "policy-callback", "coffee"]);
    expect(deckAtTurn(UNLOCKING, 6)).toHaveLength(7);
    expect(deckAtTurn(FIXTURE, 3)).toEqual(FIXTURE.starterDeck);
  });

  it("puts unlocked cards into the hand on their turn, after the draw, with continuing uids", () => {
    const [t1, t2, t3] = turns(UNLOCKING, 3);
    expect(t1.events.some((e) => e.t === "unlock")).toBe(false);
    expect(t1.hand).toHaveLength(3);

    expect(t2.turn).toBe(2);
    expect(t2.hand).toHaveLength(5);
    expect(t2.hand.slice(-2)).toEqual([
      { uid: "c5", cardId: "policy-callback" },
      { uid: "c6", cardId: "coffee" },
    ]);
    const t2Events = t2.events.slice(t1.events.length).map((e) => e.t);
    expect(t2Events.indexOf("unlock")).toBe(t2Events.indexOf("draw") + 1);
    expect(t2.events.find((e) => e.t === "unlock")).toEqual({ t: "unlock", cardIds: ["policy-callback", "coffee"] });

    expect(t3.hand.at(-1)).toEqual({ uid: "c7", cardId: "escalate" });
    expect(t3.hand).toHaveLength(4);
  });

  it("keeps unlocked cards in the deck afterwards", () => {
    for (const s of turns(UNLOCKING, 8)) {
      const ids = [...s.drawPile, ...s.hand, ...s.discardPile, ...s.exhausted].map((c) => c.cardId).sort();
      expect(ids).toEqual(deckAtTurn(UNLOCKING, s.turn).sort());
    }
  });

  it("is deterministic across a JSON round trip", () => {
    const direct = turns(UNLOCKING, 42);
    let s = createBattle(UNLOCKING, 42);
    const viaJson: BattleState[] = [];
    while (s.status === "playing") {
      viaJson.push(s);
      s = endTurn(JSON.parse(JSON.stringify(s)) as BattleState, UNLOCKING);
    }
    expect(viaJson).toEqual(direct);
  });

  it("does not change the shuffle for a given seed (unlocks use no randomness)", () => {
    const a = createBattle(UNLOCKING, 99);
    const b = createBattle({ ...UNLOCKING, unlocks: [] }, 99);
    expect(a.drawPile).toEqual(b.drawPile);
    expect(a.rng).toBe(b.rng);
  });

  it("rejects unlocks with unknown cards or turns outside the shift", () => {
    expect(() => createBattle({ ...UNLOCKING, unlocks: [{ turn: 7, cards: ["coffee"] }] }, 1)).toThrow(/turn 7/);
    expect(() => createBattle({ ...UNLOCKING, unlocks: [{ turn: 0, cards: ["coffee"] }] }, 1)).toThrow();
    expect(() => createBattle({ ...UNLOCKING, unlocks: [{ turn: 1.5, cards: ["coffee"] }] }, 1)).toThrow();
    expect(() => createBattle({ ...UNLOCKING, unlocks: [{ turn: 2, cards: ["nope" as CardId] }] }, 1)).toThrow(/unknown card/);
  });
});

describe("canResume", () => {
  it("accepts unlocked decks at every turn of the real shift", () => {
    for (const s of turns(HELP_DESK_ENCOUNTER, 5)) {
      expect(canResume(JSON.parse(JSON.stringify(s)), HELP_DESK_ENCOUNTER), `turn ${s.turn}`).toBe(true);
    }
  });

  it("rejects a mid-shift save made with the old 12-card deck", () => {
    const OLD: Encounter = {
      ...HELP_DESK_ENCOUNTER,
      unlocks: undefined,
      starterDeck: ["inspect", "inspect", "inspect", "inspect", "block", "block", "block", "escalate", "escalate", "rollback", "policy-callback", "coffee"],
    };
    let old = createBattle(OLD, 3);
    old = endTurn(endTurn(old, OLD), OLD);
    expect(old.status).toBe("playing");
    expect(canResume(old, OLD)).toBe(true);
    expect(canResume(JSON.parse(JSON.stringify(old)), HELP_DESK_ENCOUNTER)).toBe(false);
  });

  it("rejects a deck with a card unlocked too early", () => {
    const s = createBattle(HELP_DESK_ENCOUNTER, 4);
    const early = { ...s, hand: [...s.hand, { uid: "c8", cardId: "policy-callback" as const }] };
    expect(canResume(early, HELP_DESK_ENCOUNTER)).toBe(false);
  });

  it("accepts a saved battle for the same content, even after JSON", () => {
    const s = endTurn(createBattle(HELP_DESK_ENCOUNTER, 9), HELP_DESK_ENCOUNTER);
    expect(canResume(JSON.parse(JSON.stringify(s)), HELP_DESK_ENCOUNTER)).toBe(true);
  });

  it("rejects saves that no longer fit the content", () => {
    const s = createBattle(FIXTURE, 1);
    expect(canResume(s, FIXTURE)).toBe(true);
    expect(canResume(null, FIXTURE)).toBe(false);
    expect(canResume({ ...s, version: 2 }, FIXTURE)).toBe(false);
    expect(canResume(s, { ...FIXTURE, id: "other" })).toBe(false);
    expect(canResume(s, { ...FIXTURE, steps: FIXTURE.steps.slice(1) })).toBe(false);
    expect(canResume(s, { ...FIXTURE, starterDeck: [...FIXTURE.starterDeck, "inspect"] })).toBe(false);
    expect(canResume({ ...s, hand: undefined }, FIXTURE)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Policy cards (any card with autoInspect) and pathway headlines      */
/* ------------------------------------------------------------------ */

describe("policy cards across pathways", () => {
  const SOC: Encounter = {
    ...FIXTURE,
    id: "soc-fixture",
    maxRisk: 100,
    steps: [
      step("n1", { category: "network" }),
      step("c1", { safe: false, category: "credential", risk: 4, progress: 0 }),
      step("e1", { category: "lookup" }),
      step("e2", { safe: false, category: "endpoint", risk: 3, progress: 0 }),
      step("e3", { category: "endpoint" }),
    ],
    starterDeck: ["inspect", "inspect", "inspect", "block", "block", "block", "escalate", "rollback", "policy-look-first", "coffee"],
  };

  it("finds the one policy card of an encounter", async () => {
    const { policyCardOf } = await import("./engine");
    expect(policyCardOf(FIXTURE)).toBe("policy-callback");
    expect(policyCardOf(SOC)).toBe("policy-look-first");
    expect(policyCardOf({ ...FIXTURE, starterDeck: ["inspect", "block"] })).toBeNull();
    expect(policyCardOf(HELP_DESK_ENCOUNTER)).toBe("policy-callback");
  });

  it("policy-look-first auto-inspects device and network plans now and on later turns, not accounts", () => {
    let s = withHand(createBattle(SOC, 1), ["policy-look-first", "policy-look-first"]);
    expect(s.announced).toEqual(["n1", "c1"]);
    s = play(s, "policy-look-first", undefined, SOC);
    expect(s.powers.callbackPolicy).toBe(true);
    expect(s.steps.n1.inspected).toBe(true); // network
    expect(s.steps.c1.inspected).toBe(false); // credential stays manual
    expect(s.stats.inspections).toBe(1);
    expect(s.events.slice(-3)).toEqual([
      { t: "card-played", cardId: "policy-look-first" },
      { t: "power", power: "callbackPolicy" },
      { t: "inspected", stepId: "n1", auto: true },
    ]);
    const second = playCard(s, SOC, uidOf(s, "policy-look-first"));
    expect(second).toEqual({ ok: false, reason: "The Look First policy is already on." });

    s = endTurn(s, SOC);
    expect(s.announced).toEqual(["e1", "e2"]);
    expect(s.steps.e2.inspected).toBe(true);
    expect(s.steps.e1.inspected).toBe(false);
    s = endTurn(s, SOC);
    expect(s.announced).toEqual(["e3"]);
    expect(s.steps.e3.inspected).toBe(true);
  });

  it("keeps the callback policy's exact refusal", () => {
    let s = withHand(createBattle(FIXTURE, 1), ["policy-callback", "policy-callback"]);
    s = play(s, "policy-callback");
    expect(playCard(s, FIXTURE, uidOf(s, "policy-callback"))).toEqual({ ok: false, reason: "The callback policy is already on." });
  });

  it("refuses an encounter with two different policy cards", () => {
    const both: Encounter = { ...SOC, unlocks: [{ turn: 2, cards: ["policy-callback"] }] };
    expect(() => createBattle(both, 1)).toThrow(/policy cards/);
    // Two copies of the same policy card are fine.
    expect(() => createBattle({ ...SOC, unlocks: [{ turn: 2, cards: ["policy-look-first"] }] }, 1)).not.toThrow();
  });

  it("an encounter's own headlines replace the default pool, with {agent} filled in", () => {
    const s = playCorrectly(createBattle(FIXTURE, 1), FIXTURE);
    const pools = { perfect: ["{agent} and Kofi: perfect."], sharp: ["Sharp."], lucky: ["Lucky."], leaky: ["Leaky."] };
    const own = scoreBattle(s, { ...FIXTURE, headlines: pools });
    expect(["TestBot and Kofi: perfect.", "Sharp.", "Lucky.", "Leaky."]).toContain(own.headline);
    // A missing pool falls back to the default lines.
    const base = scoreBattle(s, FIXTURE);
    expect(scoreBattle(s, { ...FIXTURE, headlines: { breach: ["x"] } }).headline).toBe(base.headline);
  });
});
