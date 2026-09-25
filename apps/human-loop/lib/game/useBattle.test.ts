import { describe, expect, it } from "vitest";
import { HELP_DESK_ENCOUNTER as E, HELP_DESK_PRACTICE as P } from "./content";
import { canResume, createBattle, endTurn } from "./engine";
import { FIXTURE_NAMES, fixtureBattle, fixtureEncounter, tryPlay } from "./fixtures";
import {
  debriefRows,
  deckAtTurn,
  eventsToBeats,
  groupHand,
  newCardIds,
  newEvents,
  resolvedCount,
  unlockedThisTurn,
} from "./useBattle";

describe("fixtures", () => {
  it("builds every fixture with the expected status", () => {
    const want: Record<string, string> = {
      start: "playing",
      mid: "playing",
      rollback: "playing",
      won: "won",
      lost: "lost-breach",
      timeout: "lost-timeout",
      practice: "playing",
      "practice-t2": "playing",
      "practice-won": "won",
    };
    for (const name of FIXTURE_NAMES) {
      const s = fixtureBattle(name);
      expect(s.status, name).toBe(want[name]);
      expect(s.encounterId, name).toBe(fixtureEncounter(name).id);
      expect(canResume(s, fixtureEncounter(name)), name).toBe(true);
    }
  });

  it("puts the rollback fixture on a turn where Roll Back is unlocked and in hand", () => {
    const s = fixtureBattle("rollback");
    expect(s.turn).toBeGreaterThanOrEqual(4);
    expect(s.hand.some((c) => c.cardId === "rollback")).toBe(true);
  });

  it("puts practice-t2 on the second ticket", () => {
    const s = fixtureBattle("practice-t2");
    expect(s.announced).toEqual([P.steps[1].id]);
  });
});

describe("hand stacks and new cards", () => {
  it("groups the hand by card in a fixed order, keeping uids in hand order", () => {
    const stacks = groupHand([
      { uid: "c9", cardId: "coffee" },
      { uid: "c5", cardId: "block" },
      { uid: "c1", cardId: "inspect" },
      { uid: "c6", cardId: "block" },
      { uid: "c8", cardId: "escalate" },
    ]);
    expect(stacks.map((x) => x.cardId)).toEqual(["inspect", "block", "escalate", "coffee"]);
    expect(stacks[1].uids).toEqual(["c5", "c6"]);
    expect(groupHand([])).toEqual([]);
  });

  it("moves this turn's new cards to the right end of the hand", () => {
    const hand = [
      { uid: "c1", cardId: "inspect" as const },
      { uid: "c10", cardId: "rollback" as const },
      { uid: "c9", cardId: "policy-callback" as const },
      { uid: "c5", cardId: "block" as const },
    ];
    expect(groupHand(hand, new Set(["rollback"] as const)).map((x) => x.cardId)).toEqual([
      "inspect",
      "block",
      "policy-callback",
      "rollback",
    ]);
    expect(groupHand(hand, new Set()).map((x) => x.cardId)).toEqual(["inspect", "block", "rollback", "policy-callback"]);
  });

  it("never has more than 6 stacks in the real shift", () => {
    let s = createBattle(E, 12);
    while (s.status === "playing") {
      expect(groupHand(s.hand).length).toBeLessThanOrEqual(6);
      expect(s.hand.length).toBeLessThanOrEqual(6);
      s = endTurn(s, E);
    }
  });

  it("marks cards unlocked this turn as new until they are played", () => {
    let s = createBattle(E, 2);
    expect(newCardIds(s).size).toBe(0);
    s = endTurn(s, E);
    expect(s.turn).toBe(2);
    expect(unlockedThisTurn(s)).toEqual(["policy-callback"]);
    expect([...newCardIds(s)]).toEqual(["policy-callback"]);
    const played = tryPlay(s, E, "policy-callback");
    expect(played).not.toBe(s);
    expect(newCardIds(played).size).toBe(0);
    s = endTurn(s, E);
    expect(unlockedThisTurn(s)).toEqual(["escalate"]);
    expect([...newCardIds(s)]).toEqual(["escalate"]);
  });

  it("gives the deck per turn: 7 cards, then one more each turn from turn 2 to 5", () => {
    expect([1, 2, 3, 4, 5, 6].map((t) => deckAtTurn(E, t).length)).toEqual([7, 8, 9, 10, 11, 11]);
  });

  it("attaches unlocks to the turn beat and logs them", () => {
    const s0 = createBattle(E, 3);
    const s1 = endTurn(s0, E);
    const turn = eventsToBeats(newEvents(s0, s1), E).find((b) => b.kind === "turn");
    expect(turn?.unlocked).toEqual(["policy-callback"]);
    expect(turn?.log).toContain("New card: Policy: Callback.");
  });
});

describe("eventsToBeats", () => {
  it("turns the opening events into one turn beat", () => {
    const s = createBattle(E, 3);
    const beats = eventsToBeats(s.events, E);
    expect(beats).toHaveLength(1);
    expect(beats[0].kind).toBe("turn");
    expect(beats[0].announced).toBe(s.announced.length);
  });

  it("makes one agent beat per executed intent, then a turn beat", () => {
    const s0 = createBattle(E, 3);
    const s1 = endTurn(s0, E);
    const beats = eventsToBeats(newEvents(s0, s1), E);
    const agent = beats.filter((b) => b.kind === "agent");
    expect(agent).toHaveLength(s0.announced.length);
    expect(agent[0].toast?.text).toBeTruthy();
    expect(beats[beats.length - 1].kind).toBe("turn");
  });

  it("reports a manual inspect as a player beat that opens the evidence", () => {
    let s = createBattle(E, 5);
    for (let i = 0; i < 4 && !s.hand.some((c) => c.cardId === "inspect"); i++) s = endTurn(s, E);
    const before = s;
    s = tryPlay(s, E, "inspect");
    if (s === before) return; // no inspect in hand for this seed
    const beats = eventsToBeats(newEvents(before, s), E);
    expect(beats[0].kind).toBe("player");
    expect(beats[0].openEvidence).toBe(before.announced.find((id) => s.steps[id].inspected));
  });
});

describe("debrief", () => {
  it("grades every step of a won battle", () => {
    const s = fixtureBattle("won");
    const rows = debriefRows(s, E);
    expect(rows).toHaveLength(E.steps.length);
    expect(resolvedCount(s)).toBe(E.steps.length);
    expect(rows.filter((r) => r.grade === "bad")).toHaveLength(s.stats.misses);
    expect(rows.filter((r) => !r.step.safe).every((r) => r.redFlags.length > 0)).toBe(true);
  });
});
