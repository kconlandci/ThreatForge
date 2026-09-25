import { describe, expect, it } from "vitest";
import { cardPrompt, coachHint, coachName, drillCoach, unlockTip, hintParts, plainHint, practiceCoach, sheetCoach, shiftCoach, type CoachUi } from "./coach";
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

/* Walk the practice shift the "teach" way. */
const t1 = createBattle(P, 1);
const t1i = play(t1, "inspect");
const t2 = endTurn(t1i, P);
const t2i = play(t2, "inspect");
const t2caught = play(t2i, "block");
const t3 = endTurn(t2caught, P);
const t3i = play(t3, "inspect");
const t3fa = play(t3i, "block");
const t4 = endTurn(t3fa, P);
const t4i = play(t4, "inspect");
const t4caught = play(t4i, "block");
const t3back = endTurn(t4caught, P);

describe("practice walk-through states", () => {
  it("puts the right ticket on the board", () => {
    expect(t1.announced).toEqual([T1]);
    expect(t2.announced).toEqual([T2]);
    expect(t3.announced).toEqual([T3]);
    expect(t4.announced).toEqual([T4]);
    expect(t3back.announced).toEqual([T3]);
    expect(t3back.steps[T3].requeues).toBe(1);
  });
});

describe("practiceCoach: ticket 1 (fully guided)", () => {
  it("a) asks for Inspect and locks Block and Approve", () => {
    expect(practiceCoach(t1, P, closed)).toEqual({
      id: "p0-a",
      text: "Ollie has a plan. Check it first: tap **Inspect**.",
      target: "card:inspect",
      lock: {
        cards: ["block"],
        approve: true,
        sheetBlock: true,
        reason: "Inspect first. Then decide.",
        label: "inspect the plan first",
      },
    });
  });

  it("b) sheet open, not inspected: points at the sheet's Inspect", () => {
    const h = practiceCoach(t1, P, open(t1));
    expect(h.text).toBe("Evidence is hidden. Tap **Inspect** to see it.");
    expect(h.target).toBe("sheet:inspect");
    expect(h.lock?.approve).toBe(true);
    expect(h.lock?.sheetBlock).toBe(true);
  });

  it("card selected: says to tap the plan and keeps the locks", () => {
    const h = practiceCoach(t1, P, picked("inspect"));
    expect(h.text).toBe("Now tap the plan to inspect it.");
    expect(h.target).toBe("plan");
    expect(h.lock?.cards).toEqual(["block"]);
  });

  it("c) sheet open, inspected: Looks OK; Block and Approve stay locked", () => {
    const h = practiceCoach(t1i, P, open(t1i));
    expect(h.text).toBe("Real ticket. Work email. Public guide. Tap **Looks OK**.");
    expect(h.target).toBe("sheet:ok");
    expect(h.lock).toMatchObject({ cards: ["block"], approve: true, sheetBlock: true, reason: "This one is fine. Approve it." });
  });

  it("d) sheet closed, inspected: Approve unlocks and gets the ring", () => {
    const h = practiceCoach(t1i, P, closed);
    expect(h.text).toBe("Looks fine. Tap **Approve** to let Ollie do it.");
    expect(h.target).toBe("approve");
    expect(h.lock).toMatchObject({ cards: ["block"], approve: false, sheetBlock: true });
  });
});

describe("practiceCoach: ticket 2 (guided to Block)", () => {
  it("a) Inspect first, with Block and Approve locked", () => {
    const h = practiceCoach(t2, P, closed);
    expect(h).toMatchObject({ id: "p1-a", text: "New ticket. **Inspect** it first.", target: "card:inspect" });
    expect(h.lock).toMatchObject({ cards: ["block"], approve: true, sheetBlock: true });
  });

  it("b) sheet open, not inspected: same as ticket 1", () => {
    expect(practiceCoach(t2, P, open(t2))).toMatchObject({ text: "Evidence is hidden. Tap **Inspect** to see it.", target: "sheet:inspect" });
  });

  it("c) sheet open, inspected: asks who asked, rings Block, locks nothing", () => {
    const h = practiceCoach(t2i, P, open(t2i));
    expect(h.text).toBe("Who asked? Check the **sender address**. Wrong? Tap **Block**.");
    expect(h.target).toBe("sheet:block");
    expect(h.lock).toBeUndefined();
  });

  it("d) sheet closed, inspected: Block the plan; Approve is not locked", () => {
    const h = practiceCoach(t2i, P, closed);
    expect(h).toEqual({ id: "p1-d", text: "Something wrong? Tap **Block**, then tap the plan.", target: "card:block" });
    expect(practiceCoach(t2i, P, picked("block")).text).toBe("Now tap the plan to block it.");
  });

  it("e) after the catch: Next ticket", () => {
    expect(practiceCoach(t2caught, P, closed)).toEqual({
      id: "p1-caught",
      text: "Caught! A blocked plan never runs. Tap **Next ticket**.",
      target: "approve",
    });
  });
});

describe("practiceCoach: ticket 3 (the player's call)", () => {
  it("a) asks the question without the answer, no locks", () => {
    expect(practiceCoach(t3, P, closed)).toEqual({
      id: "p2-a",
      text: "This one sounds scary. Is it? **Inspect** to find out.",
      target: "card:inspect",
    });
  });

  it("b) inspected: your call, no ring", () => {
    expect(practiceCoach(t3i, P, closed)).toEqual({ id: "p2-b", text: "Your call: **Block** it, or tap **Approve**.", target: null });
    expect(practiceCoach(t3i, P, open(t3i))).toEqual({
      id: "p2-b-sheet",
      text: "Your call. Wrong? **Block**. Fine? **Looks OK**.",
      target: null,
    });
  });

  it("c) after a false alarm: explains that it comes back", () => {
    expect(practiceCoach(t3fa, P, closed)).toEqual({
      id: "p2-false-alarm",
      text: "That one was fine. Blocked good work comes back later. Tap **Next ticket**.",
      target: "approve",
    });
  });

  it("d) back again after a blind block: look again", () => {
    let s = play(t3, "block"); // blocked without inspecting
    s = endTurn(s, P); // ticket 4
    s = endTurn(s, P); // ticket 4 approved: ticket 3 is back
    expect(s.announced).toEqual([T3]);
    expect(practiceCoach(s, P, closed)).toEqual({ id: "p2-back", text: "It's back. Look again, then decide.", target: "plan" });
  });

  it("back again after an inspected block: still the player's call", () => {
    expect(practiceCoach(t3back, P, closed).id).toBe("p2-b");
  });
});

describe("practiceCoach: ticket 4 (the coach fades)", () => {
  it("has no rings and no locks", () => {
    expect(practiceCoach(t4, P, closed)).toEqual({ id: "p3-a", text: "Last ticket. Looks routine. Check it anyway.", target: null });
    expect(practiceCoach(t4i, P, closed)).toEqual({ id: "p3-b", text: "Wrong? **Block** it. Fine? Tap **Approve**.", target: null });
    expect(practiceCoach(t4caught, P, closed)).toEqual({ id: "p3-empty", text: "Tap **Next ticket**.", target: null });
  });
});

describe("practiceCoach: general", () => {
  const all = [t1, t1i, t2, t2i, t2caught, t3, t3i, t3fa, t4, t4i, t4caught, t3back];

  it("returns the same beat after a JSON round trip of the state", () => {
    for (const s of all) {
      for (const ui of [closed, open(s), picked("inspect"), picked("block")]) {
        const copy = JSON.parse(JSON.stringify(s)) as BattleState;
        expect(practiceCoach(copy, P, ui)).toEqual(practiceCoach(s, P, ui));
      }
    }
  });

  it("keeps every practice hint to one short line", () => {
    for (const s of all) {
      for (const ui of [closed, open(s), picked("inspect"), picked("block")]) {
        expect(plainHint(practiceCoach(s, P, ui).text).length).toBeLessThanOrEqual(72);
      }
    }
  });

  it("gives the sheet the same hint, and nothing in the real shift", () => {
    expect(sheetCoach(t2i, P, T2, { selectedCardId: null })).toEqual({
      text: "Who asked? Check the **sender address**. Wrong? Tap **Block**.",
      target: "sheet:block",
      lock: undefined,
    });
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
});

/* ------------------------------------------------------------------ */
/* No leaks: the coach never knows the answers                         */
/* ------------------------------------------------------------------ */

function flipped(enc: Encounter): Encounter {
  return {
    ...enc,
    steps: enc.steps.map((s) => ({ ...s, safe: !s.safe, evidence: s.evidence.map((e) => ({ ...e, redFlag: !e.redFlag })) })),
  };
}

describe("the coach never reads safe or redFlag", () => {
  it("gives identical practice hints when every answer is flipped", () => {
    const FP = flipped(P);
    for (const s of [t3, t3i, t3fa, t4, t4i, t4caught, t3back, t1, t1i, t2, t2i, t2caught]) {
      for (const ui of [closed, open(s), picked("inspect"), picked("block")]) {
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

  it("does not mention safe or redFlag in its source", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("./coach.ts", import.meta.url), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\.safe\b|redFlag|\.twist\b|\.direction\b/);
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

  it("uses the practice coachScript for the first two sheets, else the Help Desk lines", () => {
    const script = { firstSafeSheet: "Safe sheet. Tap **Looks OK**.", firstRiskySheet: "Risky sheet. Tap **Block**." };
    const CP: Encounter = { ...P, coachScript: script };
    expect(practiceCoach(t1i, CP, open(t1i)).text).toBe(script.firstSafeSheet);
    expect(practiceCoach(t2i, CP, open(t2i)).text).toBe(script.firstRiskySheet);
    const bare: Encounter = { ...P, coachScript: undefined };
    expect(practiceCoach(t1i, bare, open(t1i)).text).toBe("Real ticket. Work email. Public guide. Tap **Looks OK**.");
    expect(practiceCoach(t2i, bare, open(t2i)).text).toBe("Who asked? Check the **sender address**. Wrong? Tap **Block**.");
  });

  it("names the pathway's agent and coach", () => {
    const CP: Encounter = { ...P, agent: robo, coach: kofi };
    expect(practiceCoach(t1, CP, closed).text).toBe("Patch has a plan. Check it first: tap **Inspect**.");
    expect(practiceCoach(t1i, CP, closed).text).toBe("Looks fine. Tap **Approve** to let Patch do it.");
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
