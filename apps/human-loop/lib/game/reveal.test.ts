import { describe, expect, it } from "vitest";
import { EXPECT, TEST_PATHWAYS } from "@/lib/pathways/testing";
import { fxTag, heldMood, toastDelayMs, type ToStage } from "./bus";
import { HELP_DESK_ENCOUNTER as E, HELP_DESK_PRACTICE as P } from "./content";
import { createBattle, endTurn } from "./engine";
import { tryPlay } from "./fixtures";
import {
  PRACTICED_LINE,
  PROOF_TITLE,
  flagIndices,
  isCleanRun,
  isMarkable,
  keyIndex,
  practiceBar,
  practiceScoreLine,
  proofCount,
  resultMood,
  revealFor,
  vignetteFor,
  wordCount,
  type Reveal,
  type RevealKind,
} from "./reveal";
import type { AgentStep, BattleState, CardId, Encounter } from "./types";

/** Play a card on the plan on the board (or with no target). */
function play(s: BattleState, cardId: CardId, enc: Encounter = P): BattleState {
  const next = tryPlay(s, enc, cardId, s.announced[0]);
  expect(next, `play ${cardId}`).not.toBe(s);
  return next;
}

const NO_MARKS: ReadonlyMap<string, number> = new Map();

/* Practice order (Phase 1a): risky, safe mirror, scary-safe, routine-risky. */
const [R1, S2] = P.steps;
const t1 = createBattle(P, 1);
const t1i = play(t1, "inspect");

describe("practice order the reveal tests rely on", () => {
  it("has risky, safe, safe, risky", () => {
    expect(P.steps.map((s) => s.safe)).toEqual([false, true, true, false]);
    expect(t1.announced).toEqual([R1.id]);
  });
});

describe("revealFor", () => {
  it("is null for every unresolved plan (queued, on the board, inspected, back in line)", () => {
    for (const s of [t1, t1i]) for (const st of P.steps) expect(revealFor(s, P, st.id), st.id).toBeNull();
    // A blocked safe plan goes back in line: resolved (false alarm), then null again once re-announced.
    let s = endTurn(play(t1i, "block"), P); // ticket 2 (safe) on the board
    s = play(s, "inspect");
    s = play(s, "block");
    expect(revealFor(s, P, S2.id)?.kind).toBe("false-alarm");
    for (let i = 0; i < 6 && s.status === "playing" && !s.announced.includes(S2.id); i++) s = endTurn(s, P);
    expect(s.announced).toContain(S2.id);
    expect(revealFor(s, P, S2.id)).toBeNull();
    expect(revealFor(s, P, "no-such-step")).toBeNull();
  });

  it("caught-proof only when the mark is a red-flag row", () => {
    const caught = play(t1i, "block");
    const flags = flagIndices(R1);
    expect(flags.length).toBeGreaterThan(0);
    for (let i = 0; i < R1.evidence.length; i++) {
      const r = revealFor(caught, P, R1.id, i)!;
      expect(r.kind, `mark ${i}`).toBe(R1.evidence[i].redFlag ? "caught-proof" : "caught");
      expect(r.proof).toBe(R1.evidence[i].redFlag);
    }
    const none = revealFor(caught, P, R1.id)!;
    expect(none.kind).toBe("caught");
    expect(none.line).toBe(`Caught! Ollie didn't check: ${R1.evidence[flags[0]].label}.`);
    const proof = revealFor(caught, P, R1.id, flags[flags.length - 1])!;
    expect(proof.line).toBe(`${PROOF_TITLE} Ollie didn't check: ${R1.evidence[flags[flags.length - 1]].label}. You did.`);
    expect(proof.markedIdx).toBe(flags[flags.length - 1]);
  });

  it("ignores marks that are not evidence rows (the undo row and the Ask line have no index)", () => {
    const caught = play(t1i, "block");
    for (const bad of [-1, R1.evidence.length, R1.evidence.length + 1, 0.5, NaN, null, undefined]) {
      const r = revealFor(caught, P, R1.id, bad as number)!;
      expect(r.kind).toBe("caught");
      expect(r.markedIdx).toBeNull();
    }
    expect(isMarkable(R1, 0)).toBe(true);
    expect(isMarkable(R1, R1.evidence.length)).toBe(false);
  });

  it("missed: a risky plan ran; flagIdx are the red-flag rows; Show me", () => {
    const ran = endTurn(t1i, P); // Let it run on ticket 1
    const r = revealFor(ran, P, R1.id)!;
    expect(r.kind).toBe("missed");
    expect(r.flagIdx).toEqual(R1.evidence.flatMap((e, i) => (e.redFlag ? [i] : [])));
    expect(r.keyIdx).toBeNull();
    expect(r.showMe && r.wrong).toBe(true);
    expect(r.line).toBe(`Ollie didn't check: ${R1.evidence[r.flagIdx[0]].label}. Tap **Show me**.`);
    expect(r.caption).toBe(R1.tell);
  });

  it("missed without an Inspect: says nobody checked, and to check first", () => {
    const blind = endTurn(t1, P); // Approve before inspecting
    const r = revealFor(blind, P, R1.id)!;
    expect(r.kind).toBe("missed");
    expect(r.line).toBe(`Nobody checked: ${R1.evidence[r.flagIdx[0]].label}. Tap **Show me**. Check first next time.`);
  });

  it("missed-marked: the player marked the flag but let it run", () => {
    const ran = endTurn(t1i, P);
    const flag = flagIndices(R1)[0];
    const r = revealFor(ran, P, R1.id, flag)!;
    expect(r.kind).toBe("missed-marked");
    expect(r.line).toBe(`You spotted it: ${R1.evidence[flag].label}. Trust your eye. Block it next time.`);
    // A mark on a row that is not a flag is still a plain miss.
    expect(revealFor(ran, P, R1.id, 0)!.kind).toBe("missed");
  });

  it("false-alarm returns the key row, and the line sends the player to Show me", () => {
    let s = endTurn(play(t1i, "block"), P);
    s = play(play(s, "inspect"), "block");
    const r = revealFor(s, P, S2.id)!;
    expect(r.kind).toBe("false-alarm");
    expect(r.keyIdx).toBe(keyIndex(S2));
    expect(r.keyIdx).not.toBeNull();
    expect(S2.evidence[r.keyIdx!].key).toBe(true);
    expect(r.flagIdx).toEqual([]);
    expect(r.line).toBe("That one was fine. Tap **Show me**.");
    expect(r.showMe && r.wrong).toBe(true);
  });

  it("ran-safe and ran-safe-marked", () => {
    let s = endTurn(play(t1i, "block"), P);
    s = play(s, "inspect");
    s = endTurn(s, P); // ticket 2 ran
    expect(revealFor(s, P, S2.id)).toMatchObject({ kind: "ran-safe", line: "You checked. It was fine. Good work should run.", wrong: false });
    const marked = revealFor(s, P, S2.id, 1)!;
    expect(marked.kind).toBe("ran-safe-marked");
    expect(marked.line).toBe(`You marked ${S2.evidence[1].label}. It was fine. Good work should run.`);
    // Approved without looking.
    const blind = endTurn(endTurn(play(t1i, "block"), P), P);
    expect(revealFor(blind, P, S2.id)?.line).toBe("That one was fine. Check first next time.");
  });

  it("rolled-back: a risky plan ran, then Roll Back undid it", () => {
    let s = createBattle(E, 1);
    let found: { s: BattleState; id: string } | null = null;
    for (let i = 0; i < 8 && s.status === "playing" && !found; i++) {
      s = endTurn(s, E);
      const done = s.executedHistory.find((id) => {
        const st = E.steps.find((x) => x.id === id)!;
        return !st.safe && st.reversible && s.steps[id].status === "executed";
      });
      if (done && s.hand.some((c) => c.cardId === "rollback") && s.energy >= 1) {
        const after = tryPlay(s, E, "rollback", done);
        if (after !== s) found = { s: after, id: done };
      }
    }
    expect(found, "a story run with a Roll Back").not.toBeNull();
    const r = revealFor(found!.s, E, found!.id)!;
    expect(r.kind).toBe("rolled-back");
    expect(r.line).toMatch(/^Rolled back\. Ollie didn't check: .+\.$/);
  });

  it("changes when the answers are flipped (it reads them; coach.ts must not)", () => {
    const flipped: Encounter = {
      ...P,
      steps: P.steps.map((s) => ({ ...s, safe: !s.safe, evidence: s.evidence.map((e) => ({ ...e, redFlag: !e.redFlag })) })),
    };
    const caught = play(t1i, "block");
    expect(revealFor(caught, flipped, R1.id)).not.toEqual(revealFor(caught, P, R1.id));
    expect(revealFor(caught, flipped, R1.id, 0)?.kind).not.toBe(revealFor(caught, P, R1.id, 0)?.kind);
    const ran = endTurn(t1i, P);
    expect(revealFor(ran, flipped, R1.id)?.kind).not.toBe(revealFor(ran, P, R1.id)?.kind);
  });

  it("keeps every line at 16 words or fewer, for every plan and kind in all 5 pathways", () => {
    const kinds = new Set<RevealKind>();
    for (const B of TEST_PATHWAYS) {
      const steps: AgentStep[] = [...B.encounters.flatMap((e) => e.steps), ...B.bank.flatMap((t) => t.steps)];
      for (const st of steps) {
        for (const r of fakeReveals(B.practice, st)) {
          kinds.add(r.kind);
          expect(wordCount(r.line), `${B.id} ${st.id} ${r.kind}: ${r.line}`).toBeLessThanOrEqual(16);
        }
      }
    }
    expect([...kinds].sort()).toEqual(
      ["caught", "caught-proof", "escalated", "false-alarm", "missed", "missed-marked", "ran-safe", "ran-safe-marked", "rolled-back"].sort(),
    );
  });
});

/**
 * Every reveal a plan can produce: a one-step encounter per resolution, driven through the real
 * engine, with every possible mark.
 */
function fakeReveals(base: Encounter, st: AgentStep): Reveal[] {
  const enc: Encounter = {
    ...base,
    id: `t-${st.id}`,
    practice: true,
    // A safe filler plan keeps the shift going after `st` runs, so Roll Back can still be played.
    steps: [st, { ...st, id: `${st.id}-filler`, safe: true, risk: 0, progress: 1, evidence: st.evidence.map((e) => ({ ...e, redFlag: false })) }],
    maxRisk: 99,
    maxTurns: 4,
    energyPerTurn: 9,
    handSize: 5,
    actionsPerTurn: [1],
    starterDeck: ["inspect", "block", "escalate", "rollback"],
    unlocks: [],
  };
  const out: Reveal[] = [];
  const marks = [null, ...st.evidence.map((_, i) => i)];
  const s0 = createBattle(enc, 5);
  const on = s0.announced[0];
  const inspected = tryPlay(s0, enc, "inspect", on);
  const states = [tryPlay(inspected, enc, "block", on), tryPlay(inspected, enc, "escalate", on), endTurn(inspected, enc)];
  const ran = states[2];
  if (st.reversible && ran.steps[st.id]?.status === "executed") states.push(tryPlay(ran, enc, "rollback", st.id));
  for (const s of states) for (const m of marks) {
    const r = revealFor(s, enc, st.id, m);
    if (r) out.push(r);
  }
  return out;
}

describe("practiceBar (the practice coach bar right after a resolution)", () => {
  it("shows the reveal line after a block, with Next ticket", () => {
    const caught = play(t1i, "block");
    const flag = flagIndices(R1)[0];
    const bar = practiceBar(caught, P, new Map([[R1.id, flag]]))!;
    expect(bar.id).toBe("r-caught-proof");
    // The toast above already says "Caught with proof!": the bar starts at what the agent missed.
    expect(bar.text).toBe(`Ollie didn't check: ${R1.evidence[flag].label}. You did. Tap **Next ticket**.`);
    expect(bar.target).toBe("approve");
    expect(practiceBar(caught, P, NO_MARKS)!.text).toBe(`Ollie didn't check: ${R1.evidence[flagIndices(R1)[0]].label}. Tap **Next ticket**.`);
  });

  it("stops asking for Show me once the player opened it", () => {
    const ran = endTurn(t1i, P);
    const bar = practiceBar(ran, P, NO_MARKS, { reviewed: new Set([R1.id]) })!;
    expect(bar.text).toBe(`Ollie didn't check: ${R1.evidence[flagIndices(R1)[0]].label}. Next plan: **Inspect** it.`);
    expect(bar.text).not.toMatch(/Show me/);
  });

  it("never sends the player to Inspect a plan that is already checked (a false alarm came back)", () => {
    // Ticket 1 caught, ticket 2 (safe) inspected and blocked: a false alarm, back in line.
    let s = endTurn(play(t1i, "block"), P);
    s = play(play(s, "inspect"), "block");
    s = endTurn(s, P); // ticket 3
    s = play(s, "inspect");
    s = endTurn(s, P); // ticket 3 ran; ticket 4 on the board
    s = play(s, "inspect");
    s = endTurn(s, P); // ticket 4 ran (a miss); ticket 2 is back, already inspected
    expect(s.announced).toEqual([S2.id]);
    expect(s.steps[S2.id].inspected).toBe(true);
    const bar = practiceBar(s, P, NO_MARKS)!;
    expect(bar.target).toBe("plan");
    expect(bar.text).toMatch(/It's back\. Tap the plan to look again\.$/);
    expect(bar.text).not.toMatch(/Inspect|Tap \*\*Show me/);
  });

  it("drops the Inspect tail once the player has inspected twice (the ring stays)", () => {
    let s = endTurn(play(t1i, "block"), P);
    s = endTurn(play(s, "inspect"), P); // ticket 2 ran; ticket 3 on the board
    const bar = practiceBar(s, P, NO_MARKS)!;
    expect(bar.text).toBe("You checked. It was fine. Good work should run.");
    expect(bar.target).toBe("card:inspect");
  });

  it("after a plan ran, shows the reveal on the next ticket until the player plays a card", () => {
    const ran = endTurn(t1i, P);
    const bar = practiceBar(ran, P, NO_MARKS)!;
    expect(bar.id).toBe("r-missed");
    expect(bar.text).toMatch(/^Ollie didn't check: .+\. Tap \*\*Show me\*\*\. Next plan: \*\*Inspect\*\* it\.$/);
    expect(bar.target).toBe("card:inspect");
    expect(practiceBar(play(ran, "inspect"), P, NO_MARKS)).toBeNull();
  });

  it("is gone once the next ticket starts after a block, and on the first ticket", () => {
    expect(practiceBar(t1, P, NO_MARKS)).toBeNull();
    expect(practiceBar(t1i, P, NO_MARKS)).toBeNull();
    const next = endTurn(play(t1i, "block"), P);
    expect(practiceBar(next, P, NO_MARKS)).toBeNull();
  });

  it("is null outside practice", () => {
    const s = endTurn(createBattle(E, 1), E);
    expect(practiceBar(s, E, NO_MARKS)).toBeNull();
  });
});

describe("vignetteFor", () => {
  it("picks by skill first, then category; breakin is Phase 3", () => {
    expect(vignetteFor({ skill: "guard-data", category: "report" })).toBe("leak");
    expect(vignetteFor({ skill: "guard-data", category: "comms" })).toBe("leak");
    expect(vignetteFor({ skill: "check-approval", category: "report" })).toBe("report");
    expect(vignetteFor({ skill: "verify-identity", category: "credential" })).toBe("system");
    expect(vignetteFor({ skill: undefined, category: "code" })).toBe("system");
  });

  it("maps every practice risky plan to its intended family", () => {
    for (const B of TEST_PATHWAYS) {
      const risky = B.practice.steps.filter((s) => !s.safe);
      expect(risky.map(vignetteFor), B.id).toEqual(EXPECT[B.id].practiceVignettes);
    }
  });
});

describe("clean runs, result moods and proof counts", () => {
  const runPractice = (blockRisky: boolean, markFlags: boolean) => {
    let s = createBattle(P, 3);
    const marks = new Map<string, number>();
    for (let i = 0; i < 10 && s.status === "playing"; i++) {
      const id = s.announced[0];
      const st = P.steps.find((x) => x.id === id)!;
      s = play(s, "inspect");
      if (!st.safe && blockRisky) {
        if (markFlags) marks.set(id, flagIndices(st)[0]);
        s = play(s, "block");
      }
      s = endTurn(s, P);
    }
    return { s, marks };
  };

  it("celebrates only a clean win", () => {
    const clean = runPractice(true, true);
    expect(clean.s.status).toBe("won");
    expect(isCleanRun(clean.s, P)).toBe(true);
    expect(resultMood(clean.s, P)).toBe("celebrate");
    const leaky = runPractice(false, false);
    expect(leaky.s.status).toBe("won");
    expect(isCleanRun(leaky.s, P)).toBe(false);
    expect(resultMood(leaky.s, P)).toBe("idle");
    expect(resultMood({ ...leaky.s, status: "lost-breach" }, P)).toBe("sad");
    expect(resultMood({ ...clean.s, status: "lost-timeout" }, P)).toBe("sad");
  });

  it("counts plans caught with proof, and writes the practice headline", () => {
    expect(proofCount(runPractice(true, true).s, P, runPractice(true, true).marks)).toBe(2);
    expect(proofCount(runPractice(true, false).s, P, NO_MARKS)).toBe(0);
    expect(practiceScoreLine(4, 4, 2)).toBe("4 of 4 right. 2 caught with proof.");
    expect(practiceScoreLine(3, 4, 0)).toBe("3 of 4 right.");
    expect(PRACTICED_LINE).toBe("You practiced: checking an AI agent's work before it runs.");
  });
});

describe("stage messages (bus.ts)", () => {
  const fx = (m: Omit<Extract<ToStage, { type: "fx" }>, "type">): ToStage => ({ type: "fx", ...m });

  it("holds a mood after an outcome, never celebrate after a false alarm", () => {
    expect(heldMood(fx({ fx: "risk", vignette: "leak" }))).toBe("sad");
    expect(heldMood(fx({ fx: "catch" }))).toBe("busted");
    expect(heldMood(fx({ fx: "false-alarm" }))).toBe("sad");
    // Good work that runs clears a busted or sad face ("Ollie does a small victory spin").
    expect(heldMood(fx({ fx: "execute-safe" }))).toBe("idle");
    expect(heldMood(fx({ fx: "win", clean: true }))).toBe("celebrate");
    expect(heldMood(fx({ fx: "win", clean: false }))).toBe("idle");
    expect(heldMood(fx({ fx: "win" }))).toBe("idle");
    expect(heldMood(fx({ fx: "inspect" }))).toBeNull();
    expect(heldMood({ type: "agent-mood", mood: "eager" })).toBe("eager");
    expect(heldMood({ type: "reduced-motion", value: true })).toBeNull();
  });

  it("tags fx for the test hooks", () => {
    expect(fxTag(fx({ fx: "risk", vignette: "leak" }))).toBe("risk:leak");
    expect(fxTag(fx({ fx: "risk" }))).toBe("risk");
    expect(fxTag(fx({ fx: "win", clean: true }))).toBe("win:clean");
    expect(fxTag(fx({ fx: "win", clean: false }))).toBe("win");
    expect(fxTag(fx({ fx: "catch" }))).toBe("catch");
    expect(fxTag({ type: "agent-mood", mood: "sad" })).toBeNull();
    expect(toastDelayMs(false)).toBe(600);
    expect(toastDelayMs(true)).toBe(400);
  });
});

describe("the coach stays blind to the answers", () => {
  it("coach.ts never imports reveal.ts", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("./coach.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/from\s+["']\.\/reveal["']/);
  });

});
