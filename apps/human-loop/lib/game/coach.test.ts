import { describe, expect, it } from "vitest";
import { cardPrompt, coachHint, coachName, drillCoach, unlockTip, hintParts, noBlockOptions, plainHint, practiceCoach, sheetCoach, shiftCoach, type CoachUi } from "./coach";
import { HELP_DESK_BANK, HELP_DESK_ENCOUNTER as E, HELP_DESK_PRACTICE as P } from "./content";
import { createBattle, endTurn } from "./engine";
import { tryPlay } from "./fixtures";
import { LENS_SKILLS } from "./skills";
import { HELP_DESK } from "@/lib/pathways/help-desk";
import type { BattleState, CardId, Encounter } from "./types";

const closed: CoachUi = { selectedCardId: null, sheetStepId: null };
const open = (s: BattleState): CoachUi => ({ selectedCardId: null, sheetStepId: s.announced[0] ?? null });
const picked = (cardId: CardId): CoachUi => ({ selectedCardId: cardId, sheetStepId: null });

const [T1, T2, T3, T4] = P.steps.map((s) => s.id);

/** Play a card on the plan on the board (or with no target). */
function play(s: BattleState, cardId: CardId, enc: Encounter = P): BattleState {
  const next = tryPlay(s, enc, cardId, s.announced[0]);
  expect(next, `play ${cardId}`).not.toBe(s);
  return next;
}

/* Walk the practice shift: block ticket 1 (risky), let ticket 2 run, block ticket 3 (a false alarm), block 4. */
const t1 = createBattle(P, 1);
const t1i = play(t1, "inspect");
const t1caught = play(t1i, "block");
const t2 = endTurn(t1caught, P);
const t2i = play(t2, "inspect");
const t3 = endTurn(t2i, P);
const t3i = play(t3, "inspect");
const t3fa = play(t3i, "block");
const t4 = endTurn(t3fa, P);
const t4i = play(t4, "inspect");
const t4caught = play(t4i, "block");
const t3back = endTurn(t4caught, P);
/* Ticket 1 let run: the next ticket is already on the board. */
const t1ran = endTurn(t1i, P);

const ALL = [t1, t1i, t1caught, t2, t2i, t3, t3i, t3fa, t4, t4i, t4caught, t3back, t1ran];
const UIS = (s: BattleState): CoachUi[] => [closed, open(s), { ...open(s), hint: true }, picked("inspect"), picked("block")];

describe("practice walk-through states", () => {
  it("puts the right ticket on the board", () => {
    expect(t1.announced).toEqual([T1]);
    expect(t2.announced).toEqual([T2]);
    expect(t3.announced).toEqual([T3]);
    expect(t4.announced).toEqual([T4]);
    expect(t3back.announced).toEqual([T3]);
    expect(t3back.steps[T3].requeues).toBe(1);
    expect(t1ran.announced).toEqual([T2]);
  });
});

describe("practiceCoach: ticket 1 (the cold open, then the player's call)", () => {
  it("a) says the cold open, names the skill and rings Inspect; no lock", () => {
    const h = practiceCoach(t1, P, closed);
    expect(h).toEqual({
      id: "p0-a",
      text: "I'm Dana. Ollie is our AI. It's fast, not careful. You check its plans. **Inspect** its plan.",
      target: "card:inspect",
    });
    expect(plainHint(h.text)).toMatch(/check/);
  });

  it("b) sheet open, not inspected: points at the sheet's Inspect", () => {
    expect(practiceCoach(t1, P, open(t1))).toEqual({
      id: "p0-hidden",
      text: "Evidence is hidden. Tap **Inspect** to see it.",
      target: "sheet:inspect",
    });
  });

  it("c) sheet open, inspected: says nothing until the player asks", () => {
    expect(practiceCoach(t1i, P, open(t1i))).toEqual({ id: "p0-sheet", text: "", target: null });
  });

  it("d) the pull hint: where to look, never what to decide", () => {
    expect(practiceCoach(t1i, P, { ...open(t1i), hint: true })).toEqual({
      id: "p0-look",
      text: "Who asked? Compare the sender with the directory.",
      target: null,
    });
    // The hint is for the open sheet only.
    expect(practiceCoach(t1i, P, { ...closed, hint: true }).id).toBe("p0-call");
  });

  it("e) sheet closed, inspected: your call, no ring", () => {
    expect(practiceCoach(t1i, P, closed)).toEqual({ id: "p0-call", text: "Block it or let it run.", target: null });
  });

  it("card selected: says where to tap", () => {
    expect(practiceCoach(t1i, P, picked("block"))).toEqual({ id: "p0-card-block", text: "Now tap the plan to block it.", target: "plan" });
  });

  it("f) after the catch: Next ticket", () => {
    expect(practiceCoach(t1caught, P, closed)).toEqual({ id: "p0-empty", text: "Tap **Next ticket**.", target: "approve" });
  });
});

describe("practiceCoach: tickets 2-4 (the same beats)", () => {
  it("asks for Inspect on a new plan", () => {
    for (const [s, id] of [[t2, "p1-a"], [t3, "p2-a"], [t4, "p3-a"], [t1ran, "p1-a"]] as const) {
      expect(practiceCoach(s, P, closed)).toEqual({ id, text: "Next plan. **Inspect** it.", target: "card:inspect" });
    }
  });

  it("gives each plan its own idle line", () => {
    const idle = P.coachScript?.idle ?? [];
    expect(idle).toHaveLength(4);
    expect(practiceCoach(t2i, P, { ...open(t2i), hint: true })).toMatchObject({ id: "p1-look", text: idle[1] });
    expect(practiceCoach(t3i, P, { ...open(t3i), hint: true })).toMatchObject({ id: "p2-look", text: idle[2] });
    expect(practiceCoach(t4i, P, { ...open(t4i), hint: true })).toMatchObject({ id: "p3-look", text: idle[3] });
  });

  it("after a false alarm: Next ticket", () => {
    expect(practiceCoach(t3fa, P, closed)).toEqual({ id: "p2-empty", text: "Tap **Next ticket**.", target: "approve" });
  });

  it("back again after a blind block: look again", () => {
    let s = play(t3, "block"); // blocked without inspecting
    s = endTurn(s, P); // ticket 4
    s = endTurn(s, P); // ticket 4 approved: ticket 3 is back
    expect(s.announced).toEqual([T3]);
    expect(practiceCoach(s, P, closed)).toEqual({ id: "p2-back", text: "It's back. Look again, then decide.", target: "plan" });
  });

  it("back again after an inspected block: points at the plan, never at Inspect (nothing left to inspect)", () => {
    expect(practiceCoach(t3back, P, closed)).toEqual({ id: "p2-back", text: "It's back. Tap the plan to look again.", target: "plan" });
    expect(practiceCoach(t3back, P, open(t3back)).id).toBe("p2-sheet");
  });

  it("ends with See how you did", () => {
    const s = endTurn(t3back, P);
    expect(s.status).not.toBe("playing");
    expect(practiceCoach(s, P, closed)).toEqual({ id: "p-end", text: "Tap **See how you did**.", target: null });
  });
});

describe("practiceCoach: general", () => {
  it("never locks a control, and never rings Block, Let it run or Approve while a plan is unresolved", () => {
    for (const s of ALL) {
      for (const ui of UIS(s)) {
        const h = practiceCoach(s, P, ui);
        expect(h.lock).toBeUndefined();
        if (s.announced.length) expect(["sheet:block", "sheet:ok", "approve"]).not.toContain(h.target);
      }
    }
  });

  it("says an idle line only while the pull hint is on", () => {
    const idle = new Set(P.coachScript?.idle ?? []);
    for (const s of ALL) {
      for (const ui of UIS(s)) {
        if (idle.has(practiceCoach(s, P, ui).text)) expect(ui.hint).toBe(true);
      }
    }
  });

  it("falls back to a plain first beat without a cold open or a script", () => {
    const bare: Encounter = { ...P, coldOpen: undefined };
    expect(practiceCoach(t1, bare, closed).text).toBe("Ollie has a plan. Check it first: tap **Inspect**.");
    const noScript: Encounter = { ...P, coachScript: undefined };
    expect(practiceCoach(t1i, noScript, { ...open(t1i), hint: true })).toEqual({ id: "p0-sheet", text: "", target: null });
  });

  it("returns the same beat after a JSON round trip of the state", () => {
    for (const s of ALL) {
      for (const ui of UIS(s)) {
        const copy = JSON.parse(JSON.stringify(s)) as BattleState;
        expect(practiceCoach(copy, P, ui)).toEqual(practiceCoach(s, P, ui));
      }
    }
  });

  it("keeps every practice hint to one short line", () => {
    for (const s of ALL) {
      for (const ui of UIS(s)) {
        // The cold open (16 words or fewer) plus "Inspect its plan." is the longest beat.
        expect(plainHint(practiceCoach(s, P, ui).text).split(/\s+/).length).toBeLessThanOrEqual(20);
      }
    }
  });

  it("gives the sheet the same hint, and nothing in the real shift", () => {
    expect(sheetCoach(t1i, P, T1, { selectedCardId: null, hint: true })).toEqual({
      text: "Who asked? Compare the sender with the directory.",
      target: null,
      lock: undefined,
    });
    expect(sheetCoach(t1i, P, T1, { selectedCardId: null })).toEqual({ text: "", target: null, lock: undefined });
    const s = createBattle(E, 1);
    expect(sheetCoach(s, E, s.announced[0], { selectedCardId: null })).toBeNull();
  });

  it("splits bold marks for rendering", () => {
    expect(hintParts("Tap **Block**, then tap the plan.")).toEqual([
      { text: "Tap ", bold: false },
      { text: "Block", bold: true },
      { text: ", then tap the plan.", bold: false },
    ]);
    expect(plainHint("Tap **Approve**.")).toBe("Tap Approve.");
  });
});

/* ------------------------------------------------------------------ */
/* Real shift                                                          */
/* ------------------------------------------------------------------ */

describe("shiftCoach: first-shift tips", () => {
  const first = { ...closed, firstShift: true };

  it("walks through one tip per turn on turns 1-5", () => {
    let s = createBattle(E, 21);
    expect(shiftCoach(s, E, first)).toMatchObject({ id: "tip-energy", target: "card:inspect" });
    expect(shiftCoach(s, E, first).text).toBe("Tap **Inspect**, then the plan. Cards cost energy: the orange number.");
    s = play(s, "inspect", E);
    expect(shiftCoach(s, E, first).id.startsWith("g-")).toBe(true);

    s = endTurn(s, E); // turn 2: two plans, Policy unlocks
    expect(s.announced).toHaveLength(2);
    expect(shiftCoach(s, E, first)).toEqual({
      id: "tip-two-plans",
      text: "**Two plans** now. They run in order, top to bottom.",
      target: "plan",
    });
    s = play(s, "inspect", E);
    expect(shiftCoach(s, E, first)).toEqual({
      id: "tip-policy-callback",
      text: "New card: **Policy: Callback**. It inspects every MFA, password and unlock plan.",
      target: "card:policy-callback",
    });
    s = play(s, "policy-callback", E);
    expect(shiftCoach(s, E, first).id.startsWith("g-")).toBe(true);

    s = endTurn(s, E); // turn 3
    expect(shiftCoach(s, E, first)).toMatchObject({ id: "tip-escalate", target: "card:escalate" });
    s = endTurn(s, E); // turn 4
    expect(shiftCoach(s, E, first)).toMatchObject({
      id: "tip-rollback",
      text: "New card: **Roll Back**. It undoes an action in the **Done** row.",
    });
    s = endTurn(s, E); // turn 5
    if (s.status === "playing") {
      expect(shiftCoach(s, E, first)).toMatchObject({ id: "tip-coffee", text: "New card: **Coffee**. Free. Draw 2 more cards." });
    }
  });

  it("shows no tips after the first shift, only generic hints", () => {
    const s = createBattle(E, 21);
    expect(shiftCoach(s, E, { ...closed, firstShift: false }).id).toBe("g-check-one");
    expect(shiftCoach(s, E, { ...closed, firstShift: false }).text).toBe("Check the plan: tap **Inspect**, then the plan.");
  });

  it("uses the card prompt while a card is selected", () => {
    const s = endTurn(createBattle(E, 21), E);
    expect(shiftCoach(s, E, { ...picked("inspect"), firstShift: true }).text).toBe("Tap a plan to inspect it.");
    expect(shiftCoach(s, E, { ...picked("block"), firstShift: true }).text).toBe("Tap a plan to block it.");
    expect(shiftCoach(s, E, { ...picked("policy-callback"), firstShift: true }).text).toBe("Policy: Callback. Tap Play.");
    expect(shiftCoach({ ...s, energy: 0 }, E, { ...picked("block"), firstShift: true }).text).toBe("Not enough energy. Block costs 1.");
  });

  it("lets 'what to do now' beat a new-card tip", () => {
    let s = createBattle(E, 21);
    s = play(s, "inspect", E);
    s = endTurn(s, E);
    s = play(s, "inspect", E);
    s = play(s, "policy-callback", E);
    s = endTurn(s, E); // turn 3: Escalate unlocks
    expect(shiftCoach(s, E, first).id).toBe("tip-escalate");
    // Out of energy: Dana says Approve, not "New card".
    expect(shiftCoach({ ...s, energy: 0 }, E, first)).toMatchObject({ id: "g-energy", target: "approve" });
    // Not enough energy for Escalate (2): no ring on a card that can't be played.
    expect(shiftCoach({ ...s, energy: 1 }, E, first).id.startsWith("g-")).toBe(true);
    // No Inspect left: say so.
    expect(shiftCoach({ ...s, hand: s.hand.filter((c) => c.cardId !== "inspect") }, E, first).id).toBe("g-no-inspect");
    // After the first card play this turn, the generic hint (unchecked plans) takes over.
    const after = play(s, "block", E);
    if (after.status === "playing" && after.announced.some((id) => !after.steps[id].inspected)) {
      expect(shiftCoach(after, E, first).id).toMatch(/^g-check/);
    }
  });

  it("skips the Roll Back tip when the Done row has nothing to undo", () => {
    let s = createBattle(E, 21);
    while (s.status === "playing" && s.turn < 4) s = endTurn(s, E);
    expect(s.turn).toBe(4);
    const emptyDone = { ...s, executedHistory: [] };
    expect(shiftCoach(emptyDone, E, first).id).not.toBe("tip-rollback");
  });

  it("generic hints cover out of energy, all checked and an empty board", () => {
    const s = createBattle(E, 21);
    const g = { ...closed, firstShift: false };
    expect(shiftCoach({ ...s, energy: 0 }, E, g).text).toBe("Out of energy. Tap **Approve**.");
    const checked = play(s, "inspect", E);
    expect(shiftCoach(checked, E, g).text).toBe("All checked. Stop anything wrong, then tap **Approve**.");
    expect(shiftCoach({ ...s, announced: [] }, E, g).text).toBe("Nothing to check. Tap **Next turn**.");
    expect(shiftCoach({ ...s, hand: s.hand.filter((c) => c.cardId !== "inspect") }, E, g).text).toBe(
      "No Inspect left. **Block** or **Approve**.",
    );
  });

  it("says what can still stop a plan when there is no Block in hand", () => {
    const s = createBattle(E, 21);
    const g = { ...closed, firstShift: false };
    const checked = play(s, "inspect", E);
    const card = (cardId: CardId, n: number) => ({ uid: `x-${cardId}-${n}`, cardId });
    const noBlock = checked.hand.filter((c) => c.cardId !== "block" && c.cardId !== "escalate" && c.cardId !== "coffee");
    const withHand = (hand: BattleState["hand"], energy = 3) => shiftCoach({ ...checked, hand, energy }, E, g);
    expect(withHand([...noBlock, card("escalate", 1), card("coffee", 1)])).toMatchObject({
      id: "g-no-block",
      text: "All checked. No **Block** left: **Escalate** anything wrong, or play **Coffee**.",
    });
    expect(withHand([...noBlock, card("escalate", 1)]).text).toBe(
      "All checked. No **Block** left: **Escalate** anything wrong, then tap **Approve**.",
    );
    // Escalate costs 2: with 1 energy it can't be played, so only Coffee is named.
    expect(withHand([...noBlock, card("escalate", 1), card("coffee", 1)], 1).text).toBe(
      "All checked. No **Block** left: play **Coffee** to draw 2 cards.",
    );
    expect(withHand(noBlock).text).toBe("All checked. No **Block** left. Tap **Approve**.");
    // With a Block in hand, nothing changes.
    expect(withHand([...noBlock, card("block", 1), card("coffee", 1)]).id).toBe("g-checked");
    // Unchecked plans and no Inspect: only name the cards in hand.
    const unchecked = { ...s, hand: [card("escalate", 1)] };
    expect(shiftCoach(unchecked, E, g).text).toBe("No Inspect left. **Escalate** or **Approve**.");
    expect(shiftCoach({ ...s, hand: [] }, E, g).text).toBe("No Inspect left. Tap **Approve**.");
    // Escalate costs 2: at 1 energy only playable cards are named, with or without Block.
    const low = (hand: BattleState["hand"]) => shiftCoach({ ...s, hand, energy: 1 }, E, g).text;
    expect(low([card("escalate", 1)])).toBe("No Inspect left. Tap **Approve**.");
    expect(low([card("escalate", 1), card("coffee", 1)])).toBe("No Inspect left. Play **Coffee** or tap **Approve**.");
    expect(low([card("block", 1), card("escalate", 1)])).toBe("No Inspect left. **Block** or **Approve**.");
  });

  it("noBlockOptions names only cards that can help now", () => {
    const s = createBattle(E, 21);
    const card = (cardId: CardId) => ({ uid: `x-${cardId}`, cardId });
    const hand = [card("escalate"), card("coffee")];
    expect(noBlockOptions({ ...s, hand, energy: 2 })).toEqual({ escalate: true, coffee: true });
    expect(noBlockOptions({ ...s, hand, energy: 1 })).toEqual({ escalate: false, coffee: true });
    // Coffee costs 0, but with no energy left the cards it draws can't be played.
    expect(noBlockOptions({ ...s, hand, energy: 0 })).toEqual({ escalate: false, coffee: false });
    expect(noBlockOptions({ ...s, hand: [], energy: 3 })).toEqual({ escalate: false, coffee: false });
  });
});

/* ------------------------------------------------------------------ */
/* No leaks: the coach never knows the answers                         */
/* ------------------------------------------------------------------ */

function flipped(enc: Encounter): Encounter {
  return {
    ...enc,
    steps: enc.steps.map((s) => ({
      ...s,
      safe: !s.safe,
      evidence: s.evidence.map((e, i) => ({ ...e, redFlag: !e.redFlag, key: i === 0 ? !e.key : false })),
    })),
  };
}

describe("the coach never reads safe or redFlag", () => {
  it("gives identical practice hints when every answer is flipped", () => {
    const FP = flipped(P);
    for (const s of ALL) {
      for (const ui of UIS(s)) {
        expect(practiceCoach(s, FP, ui)).toEqual(practiceCoach(s, P, ui));
        expect(coachHint(s, FP, { ...ui, firstShift: true })).toEqual(coachHint(s, P, { ...ui, firstShift: true }));
        if (s.announced[0]) {
          expect(sheetCoach(s, FP, s.announced[0], ui)).toEqual(sheetCoach(s, P, s.announced[0], ui));
        }
      }
    }
  });

  it("gives identical real-shift hints when every answer is flipped", () => {
    const FE = flipped(E);
    for (const seed of [1, 2, 3, 4, 5]) {
      let s = createBattle(E, seed);
      while (s.status === "playing") {
        const states = [s, tryPlay(s, E, "inspect"), tryPlay(s, E, "policy-callback")];
        for (const st of states) {
          for (const firstShift of [true, false]) {
            for (const sel of [null, "inspect", "block", "escalate", "rollback", "coffee"] as (CardId | null)[]) {
              const ui = { selectedCardId: sel, sheetStepId: st.announced[0] ?? null, firstShift };
              expect(shiftCoach(st, FE, ui)).toEqual(shiftCoach(st, E, ui));
              if (st.announced[0]) expect(sheetCoach(st, FE, st.announced[0], ui)).toEqual(sheetCoach(st, E, st.announced[0], ui));
            }
          }
        }
        s = endTurn(s, E);
      }
    }
  });

  it("does not mention safe, redFlag or key in its source, and never imports reveal.ts", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("./coach.ts", import.meta.url), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\.safe\b|redFlag|\.key\b|\.twist\b|\.direction\b/);
    expect(code).not.toMatch(/from\s+["']\.\/reveal["']/);
  });
});

describe("drillCoach (Where to look, until Solid)", () => {
  it("gives a safe and a risky plan of the same skill the same line, and stops at Solid", () => {
    const steps = HELP_DESK_BANK.flatMap((t) => t.steps);
    for (const skill of LENS_SKILLS) {
      const safe = steps.find((s) => s.skill === skill && s.safe)!;
      const risky = steps.find((s) => s.skill === skill && !s.safe)!;
      for (const level of [0, 1, 2] as const) {
        const a = drillCoach(safe.skill, level, HELP_DESK.skill(safe.skill!).whereToLook);
        expect(a).toMatch(/^Where to look: /);
        expect(drillCoach(risky.skill, level, HELP_DESK.skill(risky.skill!).whereToLook)).toBe(a);
      }
      expect(drillCoach(skill, 3, HELP_DESK.skill(skill).whereToLook)).toBeNull();
      expect(drillCoach(skill, 4, HELP_DESK.skill(skill).whereToLook)).toBeNull();
    }
    expect(drillCoach(undefined)).toBeNull();
  });
});

describe("pathway wording", () => {
  const kofi = { name: "Kofi", role: "SOC lead", spriteKey: "kofi" };
  const robo = { ...P.agent, name: "Patch" };

  it("uses the practice coachScript idle lines for the pull hint", () => {
    const script = { idle: ["Look here.", "Look there.", "Look up.", "Look down."] };
    const CP: Encounter = { ...P, coachScript: script };
    expect(practiceCoach(t1i, CP, { ...open(t1i), hint: true }).text).toBe("Look here.");
    expect(practiceCoach(t2i, CP, { ...open(t2i), hint: true }).text).toBe("Look there.");
  });

  it("names the pathway's agent and coach", () => {
    const CP: Encounter = { ...P, agent: robo, coach: kofi, coldOpen: undefined };
    expect(practiceCoach(t1, CP, closed).text).toBe("Patch has a plan. Check it first: tap **Inspect**.");
    const CE: Encounter = { ...E, coach: kofi };
    expect(coachName(CE)).toBe("Kofi");
    expect(coachName({})).toBe("Dana");
    expect(unlockTip("escalate", CE)).toBe("New card: **Escalate**. Not sure? Send the plan to Kofi.");
    expect(unlockTip("escalate", E)).toBe("New card: **Escalate**. Not sure? Send the plan to Dana.");
    expect(unlockTip("policy-look-first", CE)).toBe("New card: **Policy: Look First**. It inspects every device and network plan.");
    let s = createBattle(CE, 3);
    for (let i = 0; i < 3 && s.status === "playing"; i++) s = endTurn(s, CE);
    if (s.status === "playing" && s.announced.length) expect(cardPrompt(s, CE, "escalate").text).toMatch(/send it to Kofi\.$/);
  });
});
