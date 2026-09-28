import { describe, expect, it } from "vitest";
import { HELP_DESK_ENCOUNTER as E, HELP_DESK_PRACTICE as P } from "./content";
import { canResume, createBattle, endTurn } from "./engine";
import { FIXTURE_NAMES, fixtureBattle, fixtureEncounter, tryPlay } from "./fixtures";
import {
  debriefRows,
  deckAtTurn,
  eventsToBeats,
  groupHand,
  guideCards,
  newCardIds,
  newEvents,
  HINT_BUTTON,
  SPOT_PROMPT,
  readingMs,
  resolvedCount,
  rowName,
  showMeReveal,
  toastMs,
  undoText,
  unlockedThisTurn,
  type ToastTone,
} from "./useBattle";
import type { BattleState, Encounter } from "./types";

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

describe("eventsToBeats: show, then tell (Phase 1a)", () => {
  /** Play the practice shift: let every plan run (inspected), or block the risky ones. */
  function runPractice(enc: Encounter, blockRisky: boolean): { prev: BattleState; next: BattleState }[] {
    const out: { prev: BattleState; next: BattleState }[] = [];
    let s = createBattle(enc, 7);
    for (let guard = 0; guard < 20 && s.status === "playing"; guard++) {
      const id = s.announced[0];
      if (id) {
        s = tryPlay(s, enc, "inspect", id);
        const step = enc.steps.find((x) => x.id === id);
        if (blockRisky && step && !step.safe) {
          const prev = s;
          s = tryPlay(s, enc, "block", id);
          out.push({ prev, next: s });
        }
      }
      const prev = s;
      s = endTurn(s, enc);
      out.push({ prev, next: s });
    }
    return out;
  }

  it("a risky plan that runs carries its vignette", () => {
    const runs = runPractice(P, false);
    const risk = runs.flatMap(({ prev, next }) => eventsToBeats(newEvents(prev, next), P, next)).flatMap((b) => b.stage).filter((m) => m.type === "fx" && m.fx === "risk");
    expect(risk.length).toBeGreaterThan(0);
    for (const m of risk) expect(m).toMatchObject({ vignette: expect.stringMatching(/^(leak|report|system)$/) });
    // The same without a state (the golden traces call it with two arguments).
    const noState = runs.flatMap(({ prev, next }) => eventsToBeats(newEvents(prev, next), P)).flatMap((b) => b.stage).filter((m) => m.type === "fx" && m.fx === "risk");
    expect(noState).toEqual(risk);
  });

  it("a win carries clean with a state, and the mood follows it", () => {
    const ended = (runs: { prev: BattleState; next: BattleState }[]) =>
      runs.find(({ prev, next }) => newEvents(prev, next).some((e) => e.t === "end"))!;
    const last = ended(runPractice(P, true));
    expect(last.next.status).toBe("won");
    const end = eventsToBeats(newEvents(last.prev, last.next), P, last.next).find((b) => b.kind === "end");
    expect(end?.stage).toEqual([{ type: "fx", fx: "win", intensity: 1, clean: true }, { type: "agent-mood", mood: "celebrate" }]);

    const m = ended(runPractice(P, false));
    expect(m.next.status).toBe("won");
    const endM = eventsToBeats(newEvents(m.prev, m.next), P, m.next).find((b) => b.kind === "end");
    expect(endM?.stage).toEqual([{ type: "fx", fx: "win", intensity: 1, clean: false }, { type: "agent-mood", mood: "idle" }]);
  });

  it("without a state: no clean flag, and toasts and logs are identical", () => {
    const runs = runPractice(P, false);
    for (const { prev, next } of runs) {
      const a = eventsToBeats(newEvents(prev, next), P);
      const b = eventsToBeats(newEvents(prev, next), P, next);
      expect(a.map((x) => [x.toast ?? null, x.log])).toEqual(b.map((x) => [x.toast ?? null, x.log]));
      for (const beat of a) for (const msg of beat.stage) if (msg.type === "fx") expect(msg.clean).toBeUndefined();
    }
  });

  it("toastMs: outcome toasts never auto-hide; only hints keep a timer", () => {
    for (const tone of ["good", "bad", "warn", "info"] as ToastTone[]) expect(toastMs({ tone, title: "X", text: "Y" })).toBe(0);
    const hint = { tone: "hint" as const, title: "", text: "Not enough energy. Block costs 1." };
    expect(toastMs(hint)).toBe(readingMs(hint));
    expect(toastMs(undefined)).toBe(0);
  });
});

describe("evidence sheet copy (Phase 1a)", () => {
  const wc = (t: string) => t.split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length;

  it("the undo row: one-way can be right; undoNote wins; lookups change nothing", () => {
    expect(undoText({ category: "comms", reversible: false })).toBe("No. One-way. That is OK if it is right.");
    expect(undoText({ category: "access", reversible: true })).toBe("Yes. It can be undone after it runs.");
    expect(undoText({ category: "lookup", reversible: false })).toBe("Nothing to undo. It only reads. It changes nothing.");
    expect(undoText({ category: "comms", reversible: true, undoNote: "Custom." })).toBe("Custom.");
    for (const t of [undoText({ category: "comms", reversible: false }), undoText({ category: "comms", reversible: true }), SPOT_PROMPT, HINT_BUTTON]) {
      for (const sentence of t.split(/(?<=[.?!])\s+/)) expect(wc(sentence)).toBeLessThanOrEqual(15);
    }
  });

  it("a row's accessible name is label: detail, then the gloss", () => {
    expect(rowName({ label: "Sender address", detail: "a@b.com" })).toBe("Sender address: a@b.com");
    expect(rowName({ label: "Sign-off record", detail: "Signed off by: Quill (AI).", gloss: "Sign-off: the owner's written OK." })).toBe(
      "Sign-off record: Signed off by: Quill (AI). Sign-off: the owner's written OK.",
    );
  });

  it("showMeReveal: only after a wrong call, for the latest resolved plan", () => {
    const none = new Map<string, number>();
    let s = createBattle(P, 1);
    s = tryPlay(s, P, "inspect", s.announced[0]);
    expect(showMeReveal(s, P, none)).toBeNull();
    // Ticket 1 is risky: letting it run is a miss (Show me)...
    const ran = endTurn(s, P);
    expect(showMeReveal(ran, P, none)).toMatchObject({ kind: "missed", stepId: P.steps[0].id, showMe: true });
    // ...blocking it is a catch (no Show me).
    const caught = tryPlay(s, P, "block", s.announced[0]);
    expect(showMeReveal(caught, P, none)).toBeNull();
    // Marking the red flag first: caught with proof.
    const flag = P.steps[0].evidence.findIndex((e) => e.redFlag);
    expect(showMeReveal(caught, P, new Map([[P.steps[0].id, flag]]))).toBeNull();
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

describe("How to play guide (outside a battle)", () => {
  it("lists only the pathway's own policy card", () => {
    // The exact pre-refactor Help Desk list (commit 6605f27 HAND_ORDER).
    expect(guideCards("policy-callback")).toEqual(["inspect", "block", "escalate", "rollback", "policy-callback", "coffee"]);
    expect(guideCards("policy-look-first")).toEqual(["inspect", "block", "escalate", "rollback", "policy-look-first", "coffee"]);
    expect(guideCards("policy-change-window")).toEqual(["inspect", "block", "escalate", "rollback", "policy-change-window", "coffee"]);
    expect(guideCards("policy-code-review")).toEqual(["inspect", "block", "escalate", "rollback", "policy-code-review", "coffee"]);
    expect(guideCards("policy-source-check")).toEqual(["inspect", "block", "escalate", "rollback", "policy-source-check", "coffee"]);
  });
});
