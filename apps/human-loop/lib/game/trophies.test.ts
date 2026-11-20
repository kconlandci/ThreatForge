import { describe, expect, it } from "vitest";
import { toProgress } from "@/lib/client/save";
import { HELP_DESK_ENCOUNTER as E, HELP_DESK_PRACTICE as P } from "./content";
import { createBattle, endTurn, scoreBattle } from "./engine";
import { tryPlay } from "./fixtures";
import { TROPHIES, TROPHY_IDS, toTrophies, trophiesFor, trophyHow, withTrophies } from "./trophies";
import type { BattleState, Encounter, PathwayProgress } from "./types";

const none: Pick<PathwayProgress, "trophies" | "days" | "skills"> = { trophies: {}, days: [], skills: {} };
const isSafe = (enc: Encounter, id: string) => !!enc.steps.find((s) => s.id === id)?.safe;

/** Play a whole battle: `turn` runs before each endTurn. */
function play(enc: Encounter, seed: number, turn: (s: BattleState) => BattleState): BattleState {
  let s = createBattle(enc, seed);
  for (let i = 0; i < 20 && s.status === "playing"; i++) s = endTurn(turn(s), enc);
  return s;
}

/** Inspect and block the risky plans first, then inspect the safe ones and let them run. */
const careful = (enc: Encounter) => (start: BattleState) => {
  let s = start;
  for (const id of s.announced.slice()) {
    if (isSafe(enc, id)) continue;
    s = tryPlay(s, enc, "inspect", id);
    s = tryPlay(s, enc, "block", id);
  }
  for (const id of s.announced.slice()) s = tryPlay(s, enc, "inspect", id);
  return s;
};

describe("trophies", () => {
  it("has ten trophies, each with a name and a how-to line", () => {
    expect(TROPHY_IDS).toHaveLength(10);
    for (const id of TROPHY_IDS) {
      expect(TROPHIES[id].name.length).toBeGreaterThan(0);
      expect(TROPHIES[id].how).toMatch(/\.$/);
    }
    expect(trophyHow("team-player", "Dana")).toBe("Check a plan. Not sure? Escalate it to Dana.");
  });

  it("practice: a catch and a checked safe plan that ran; never a clean-shift trophy", () => {
    const s = play(P, 1, careful(P));
    expect(s.status).toBe("won");
    const ids = trophiesFor(none, s, P, 0);
    expect(ids).toContain("first-catch");
    expect(ids).toContain("let-it-run");
    expect(ids).not.toContain("clean-shift");
    expect(ids).not.toContain("first-shift");
  });

  it("first shift, played carefully: first shift done, clean shift, and three stars when scored 3", () => {
    let s: BattleState | null = null;
    for (let seed = 1; seed < 40 && !s; seed++) {
      const run = play(E, seed, careful(E));
      if (run.status === "won" && scoreBattle(run, E).stars === 3) s = run;
    }
    expect(s, "a 3-star careful run").not.toBeNull();
    const ids = trophiesFor(none, s!, E, 3);
    for (const id of ["first-catch", "let-it-run", "clean-shift", "first-shift", "three-stars"] as const) expect(ids).toContain(id);
    expect(trophiesFor(none, s!, E, 2)).not.toContain("three-stars");
  });

  it("a false alarm rules out a clean shift", () => {
    const blockSafeOnce = (start: BattleState) => {
      const s = careful(E)(start);
      const safe = s.announced.find((id) => isSafe(E, id));
      return safe && s.stats.falseAlarms === 0 ? tryPlay(s, E, "block", safe) : s;
    };
    const s = play(E, 3, blockSafeOnce);
    expect(s.stats.falseAlarms).toBeGreaterThan(0);
    expect(trophiesFor(none, s, E, 0)).not.toContain("clean-shift");
  });

  it("escalating earns team player; rolling back a risky plan earns undo, a safe one does not", () => {
    const escalateRisky = (checkFirst: boolean) => (start: BattleState) => {
      const id = start.announced.find((x) => !isSafe(E, x));
      let s = start;
      if (id && checkFirst) s = tryPlay(s, E, "inspect", id);
      if (id) s = tryPlay(s, E, "escalate", id);
      return careful(E)(s);
    };
    expect(trophiesFor(none, play(E, 5, escalateRisky(true)), E, 0)).toContain("team-player");
    // A blind escalation is luck, not a habit.
    const blind = play(E, 5, (start) => {
      let s = start;
      for (const id of s.announced.slice()) if (!isSafe(E, id) && !s.steps[id].inspected) s = tryPlay(s, E, "escalate", id);
      return s;
    });
    const blindEsc = blind.events.some((ev) => (ev.t === "caught" && ev.by === "escalate") || ev.t === "escalated-safe");
    if (blindEsc) expect(trophiesFor(none, blind, E, 0)).not.toContain("team-player");

    // Let one risky plan run, then roll it back once Roll Back is in hand.
    let undone: BattleState | null = null;
    for (let seed = 1; seed < 60 && !undone; seed++) {
      let s = createBattle(E, seed);
      let ran: string | null = null;
      for (let i = 0; i < 10 && s.status === "playing" && !undone; i++) {
        for (const id of s.announced.slice()) {
          const step = E.steps.find((x) => x.id === id)!;
          if (!step.safe && (ran || !step.reversible)) s = tryPlay(s, E, "block", id);
          else if (!step.safe) ran = id;
        }
        s = endTurn(s, E);
        if (ran && s.steps[ran]?.status === "executed") {
          const after = tryPlay(s, E, "rollback", ran);
          if (after !== s) undone = after;
        }
      }
    }
    expect(undone, "a run with a Roll Back on a risky plan").not.toBeNull();
    expect(trophiesFor(none, { ...undone!, status: "won" }, E, 0)).toContain("undo");

    // Rolling back good work is a false alarm, not a trophy.
    let s = createBattle(E, 2);
    for (let i = 0; i < 10 && s.status === "playing"; i++) {
      s = endTurn(careful(E)(s), E);
      const good = s.executedHistory.find((id) => isSafe(E, id) && E.steps.find((x) => x.id === id)!.reversible);
      if (good && s.hand.some((c) => c.cardId === "rollback")) {
        const after = tryPlay(s, E, "rollback", good);
        if (after !== s) {
          s = after;
          break;
        }
      }
    }
    expect(s.stats.falseAlarms).toBeGreaterThan(0);
    expect(trophiesFor(none, { ...s, status: "won" }, E, 0)).not.toContain("undo");
  });

  it("a blind block is luck: no first-catch trophy without an inspect", () => {
    const s = play(P, 1, (start) => {
      let t = start;
      for (const id of t.announced.slice()) if (!isSafe(P, id)) t = tryPlay(t, P, "block", id);
      return t;
    });
    expect(s.events.some((ev) => ev.t === "caught")).toBe(true);
    expect(trophiesFor(none, s, P, 0)).not.toContain("first-catch");
  });

  it("old saves: a won first shift gives First shift done (and Three stars for a 3-star best)", () => {
    expect(toProgress({ wins: 1, best: { stars: 3, completedAt: "2026-10-01T16:46:53.265Z" } }).trophies).toEqual({
      "first-shift": "2026-10-01",
      "three-stars": "2026-10-01",
    });
    expect(toProgress({ wins: 2, best: { stars: 1, completedAt: "2026-10-01T16:46:53.265Z" }, trophies: { "first-shift": "2026-09-30" } }).trophies).toEqual({
      "first-shift": "2026-09-30",
    });
    expect(toProgress({ wins: 0, best: null }).trophies).toEqual({});
  });

  it("proof needs the player's mark on a red-flag row", () => {
    const s = play(P, 1, careful(P));
    expect(trophiesFor(none, s, P, 0)).not.toContain("proof");
    const marks = new Map<string, number>();
    for (const step of P.steps) {
      const flag = step.evidence.findIndex((e) => e.redFlag);
      if (!step.safe && flag >= 0) marks.set(step.id, flag);
    }
    expect(trophiesFor(none, s, P, 0, marks)).toContain("proof");
  });

  it("days and skills: three days played, a Solid skill", () => {
    const s = play(P, 1, careful(P));
    expect(trophiesFor({ ...none, days: ["2026-11-18", "2026-11-19"] }, s, P, 0)).not.toContain("three-days");
    expect(trophiesFor({ ...none, days: ["2026-11-18", "2026-11-19", "2026-11-20"] }, s, P, 0)).toContain("three-days");
    const solid = { "verify-identity": { recent: "RRRRR", n: 5, level: 3 as const, days: ["2026-11-19", "2026-11-20"], last: "2026-11-20", solidOn: "2026-11-20" } };
    expect(trophiesFor({ ...none, skills: solid }, s, P, 0)).toContain("solid-skill");
  });

  it("never gives a trophy twice, and keeps the first day", () => {
    const s = play(P, 1, careful(P));
    const first = trophiesFor(none, s, P, 0);
    const rec = withTrophies({}, first, "2026-11-19");
    expect(trophiesFor({ ...none, trophies: rec }, s, P, 0)).toEqual([]);
    expect(withTrophies(rec, first, "2026-11-20")).toEqual(rec);
    expect(trophiesFor(none, createBattle(P, 1), P, 0)).toEqual([]);
  });

  it("saves keep only known trophies with a real day", () => {
    expect(toTrophies({ "first-catch": "2026-11-20", proof: "yesterday", bogus: "2026-11-20", undo: 3 })).toEqual({ "first-catch": "2026-11-20" });
    expect(toTrophies(null)).toEqual({});
    expect(toTrophies(["first-catch"])).toEqual({});
    expect(toProgress({ trophies: { "three-stars": "2026-11-01" } }).trophies).toEqual({ "three-stars": "2026-11-01" });
    expect(toProgress({}).trophies).toEqual({});
  });
});
