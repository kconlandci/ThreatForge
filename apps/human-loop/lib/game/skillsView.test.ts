import { describe, expect, it } from "vitest";
import { HELP_DESK_BANK, HELP_DESK_ENCOUNTER, helpDeskStep, shiftEncounter } from "./content";
import { createBattle } from "./engine";
import { applyCalls, emptyRecord } from "./mastery";
import { planDaily } from "./shiftGen";
import {
  dailyDoneToday,
  dailyNote,
  dailyUnlocked,
  dueTagSkills,
  levelText,
  liveGrade,
  nextPipText,
  orderMoves,
  metSkills,
  needReason,
  nextUpSkill,
  planLines,
  recentCalls,
  skillGroups,
  tallyHeadline,
  weakestInShift,
  weekDots,
} from "./skillsView";
import type { AgentStep, BattleState, Call, SkillRecord, StepRuntime } from "./types";

const TODAY = "2026-09-25";

function rec(over: Partial<SkillRecord>): SkillRecord {
  return { ...emptyRecord(), n: 3, level: 1, recent: "RrR", days: [TODAY], last: TODAY, ...over };
}

describe("skillsView", () => {
  it("unlocks daily practice after the first Monday attempt", () => {
    expect(dailyUnlocked({ attempts: 0 })).toBe(false);
    expect(dailyUnlocked({ attempts: 1 })).toBe(true);
  });

  it("words the levels, never as a percentage", () => {
    expect(levelText(2)).toBe("Level 2 of 4: Practicing");
    expect(levelText(4)).toBe("Level 4 of 4: Sharp");
  });

  it("lists met skills grouped by Dana's question, approve-checked last", () => {
    const skills = { "guard-data": rec({}), "approve-checked": rec({}), "verify-identity": rec({}) };
    expect(metSkills(skills)).toEqual(["verify-identity", "guard-data", "approve-checked"]);
    expect(skillGroups(skills).map((g) => g.title)).toEqual(["Who asked?", "Can we undo it?", "All 3 check out"]);
  });

  it("gives one plain reason for Next up", () => {
    expect(needReason(rec({ recent: "RWW" }), TODAY)).toBe("2 risky plans got through lately.");
    expect(needReason(rec({ recent: "Rw" }), TODAY)).toBe("You blocked 1 good plan lately.");
    expect(needReason(rec({ recent: "RP" }), TODAY)).toBe("1 call was only partly right.");
    expect(needReason(rec({ last: "2026-09-20", level: 1 }), TODAY)).toMatch(/^Review due/);
    expect(recentCalls(rec({ recent: "Rw" }))).toEqual([
      { grade: "R", safe: false },
      { grade: "W", safe: true },
    ]);
  });

  it("picks the weakest met skill for Next up", () => {
    const skills = { "verify-identity": rec({ recent: "RRR" }), "guard-data": rec({ recent: "WWR" }) };
    expect(nextUpSkill(skills, TODAY)).toBe("guard-data");
    expect(nextUpSkill({}, TODAY)).toBe("verify-identity");
  });

  it("shows 7 days ending today", () => {
    const dots = weekDots(["2026-09-25", "2026-09-21", "2026-09-10"], TODAY);
    expect(dots).toHaveLength(7);
    expect(dots[6]).toMatchObject({ day: TODAY, done: true, today: true, letter: "F" });
    expect(dots.filter((d) => d.done)).toHaveLength(2);
  });

  it("knows when a daily was finished today", () => {
    const at = new Date(2026, 8, 25, 10, 0).toISOString();
    expect(dailyDoneToday([{ encounterId: "hd-daily-0", status: "won", stars: 0, at, catches: 0, falseAlarms: 0, misses: 0, mode: "daily" }], TODAY)).toBe(true);
    expect(dailyDoneToday([{ encounterId: "encounter-01", status: "won", stars: 3, at, catches: 0, falseAlarms: 0, misses: 0, mode: "story" }], TODAY)).toBe(false);
  });

  it("writes the chooser note from the planned daily", () => {
    const spec = planDaily(HELP_DESK_BANK, { introSeen: true, hub: null, battle: null, best: null, attempts: 1, wins: 0, history: [] }, { playerId: "p", today: TODAY });
    expect(dailyNote(spec)).toMatch(/^\d new tickets · about \d+ min · Focus: /);
    expect(shiftEncounter(spec).steps).toHaveLength(spec.stepIds.length);
  });

  it("lists plans mistakes first with the tell, and the reason first for partly right", () => {
    const enc = HELP_DESK_ENCOUNTER;
    const st = createBattle(enc, 1);
    const risky = enc.steps.find((s) => !s.safe)!;
    const safe = enc.steps.find((s) => s.safe)!;
    const state: BattleState = {
      ...st,
      steps: {
        ...st.steps,
        [risky.id]: { ...st.steps[risky.id], status: "blocked", inspected: false },
        [safe.id]: { ...st.steps[safe.id], status: "executed", inspected: true },
      },
    };
    const lines = planLines(state, enc);
    expect(lines[0].step.id).toBe(risky.id);
    expect(lines[0].text).toBe(`Lucky guess. ${risky.tell}`);
    expect(lines[1].text).toBe(safe.tell);
    expect(lines.at(-1)?.grade.result).toBeNull();
    expect(weakestInShift(lines, {}, TODAY)).toBe(risky.skill);
    expect(tallyHeadline({ right: 7, partly: 1, missed: 1 })).toBe("7 right · 1 partly · 1 missed");
    expect(tallyHeadline({ right: 8, partly: 0, missed: 0 })).toBe("8 right · 0 missed");
  });

  it("orders Skills moved: drops first (with a reason), then the focus, then a new Solid, then the rest", () => {
    const enc = HELP_DESK_ENCOUNTER;
    const st = createBattle(enc, 1);
    // A risky confirm-fix plan got through this shift.
    const cf = enc.steps.find((x) => !x.safe && x.skill === "confirm-fix")!;
    const state: BattleState = { ...st, steps: { ...st.steps, [cf.id]: { ...st.steps[cf.id], status: "executed" } } };
    const lines = planLines(state, enc);
    const moves = [
      { skill: "verify-identity" as const, from: 1 as const, to: 2 as const },
      { skill: "check-approval" as const, from: 1 as const, to: 2 as const },
      { skill: "confirm-fix" as const, from: 2 as const, to: 1 as const },
      { skill: "safe-change" as const, from: 2 as const, to: 3 as const },
      { skill: "approve-checked" as const, from: 2 as const, to: 3 as const },
      { skill: "guard-data" as const, from: 1 as const, to: 2 as const },
    ];
    const out = orderMoves(moves, "guard-data", lines);
    expect(out.map((m) => m.skill)).toEqual(["confirm-fix", "guard-data", "safe-change", "approve-checked", "verify-identity", "check-approval"]);
    // The first 2 (the ones on screen) keep the drop and the focus skill.
    expect(out.slice(0, 2).map((m) => m.skill)).toEqual(["confirm-fix", "guard-data"]);
    expect(out[0]).toMatchObject({ up: false, why: "Down: a risky plan got through" });
    expect(out[1]).toMatchObject({ up: true, why: null });
  });

  it("toast chip: a shape only when the outcome is final", () => {
    const step = (over: Partial<AgentStep>): AgentStep => ({ ...HELP_DESK_ENCOUNTER.steps[0], ...over });
    const rt = (over: Partial<StepRuntime>): StepRuntime => ({ stepId: "x", status: "executed", inspected: false, requeues: 0, resolvedOnTurn: 1, ...over });
    const opts = { canRollBack: true };
    // A safe plan blocked and sent back in line: not missed yet.
    expect(liveGrade(step({ safe: true }), rt({ status: "queued", requeues: 1 }), opts)).toEqual({ grade: null, note: "Back in line" });
    // A risky plan that ran and can still be rolled back: not final.
    const risky = step({ safe: false, reversible: true, risk: 3, progress: 0 });
    expect(liveGrade(risky, rt({ status: "executed" }), opts)).toEqual({ grade: null, note: "Can still roll back" });
    expect(liveGrade(risky, rt({ status: "executed" }), { canRollBack: false })).toEqual({ grade: "W", note: null });
    // A blind approve of a safe plan proves nothing: no check mark.
    expect(liveGrade(step({ safe: true }), rt({ status: "executed", inspected: false }), opts)).toEqual({ grade: null, note: "Not checked" });
    // Final outcomes show their shape, the same as the result screen.
    expect(liveGrade(step({ safe: true }), rt({ status: "executed", inspected: true }), opts)).toEqual({ grade: "R", note: null });
    expect(liveGrade(step({ safe: true }), rt({ status: "executed", requeues: 1 }), opts)).toEqual({ grade: "P", note: null });
    expect(liveGrade(risky, rt({ status: "blocked", inspected: true }), opts)).toEqual({ grade: "R", note: null });
  });

  it("tags Review due on the 2 due skills that need it most", () => {
    const old = "2026-09-20";
    const skills = {
      "verify-identity": rec({ last: old, recent: "RRR" }),
      "check-approval": rec({ last: old, recent: "RWW" }),
      "match-request": rec({ last: old, recent: "RPR" }),
      "guard-data": rec({ recent: "WWW" }), // weak but not due
    };
    expect(dueTagSkills(skills, TODAY)).toEqual(["check-approval", "match-request"]);
  });

  it("says how to earn the next pip", () => {
    expect(nextPipText("confirm-fix", 1)).toBe("Get 3 calls right, including a risky and a safe one.");
    expect(nextPipText("confirm-fix", 2)).toBe("Keep it right on 2 different days.");
    expect(nextPipText("confirm-fix", 3)).toBe("Come back in 3+ days and get 2 right.");
    expect(nextPipText("approve-checked", 1)).not.toMatch(/risky/);
  });

  it("practice this: a real miss beats a partly right call", () => {
    const enc = HELP_DESK_ENCOUNTER;
    const st = createBattle(enc, 1);
    const blindCatch = enc.steps.find((x) => !x.safe && x.skill === "verify-identity")!;
    const through = enc.steps.find((x) => !x.safe && x.skill === "guard-data")!;
    const state: BattleState = {
      ...st,
      steps: {
        ...st.steps,
        [blindCatch.id]: { ...st.steps[blindCatch.id], status: "blocked", inspected: false },
        [through.id]: { ...st.steps[through.id], status: "executed" },
      },
    };
    // verify-identity has the higher need (never met), but guard-data had the real miss.
    expect(weakestInShift(planLines(state, enc), { "guard-data": rec({ recent: "RRRRRR" }) }, TODAY)).toBe("guard-data");
  });

  it("remembers the latest miss, whose tell the skill detail shows", () => {
    const calls: Call[] = [
      { stepId: "romero-mfa-reset", skill: "verify-identity", grade: "W", safe: false, reason: "Got through" },
      { stepId: "ortiz-unlock", skill: "verify-identity", grade: "R", safe: true, reason: "Checked and approved" },
    ];
    const out = applyCalls({}, calls, TODAY);
    expect(out["verify-identity"]?.miss).toBe("romero-mfa-reset");
    expect(helpDeskStep("romero-mfa-reset")?.tell).toBeTruthy();
    expect(helpDeskStep(HELP_DESK_BANK[0].steps[0].id)).toBe(HELP_DESK_BANK[0].steps[0]);
  });
});
