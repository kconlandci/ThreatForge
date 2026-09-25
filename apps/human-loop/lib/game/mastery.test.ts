import { describe, expect, it } from "vitest";
import { HELP_DESK_ENCOUNTER, HELP_DESK_PRACTICE } from "./content";
import { createBattle, endTurn, playCard } from "./engine";
import {
  accuracy,
  addDays,
  applyBattle,
  applyCalls,
  battleKey,
  callsFromBattle,
  daysBetween,
  dueOn,
  gradePlan,
  isDay,
  isDue,
  need,
  shiftTally,
  skillChanges,
  trimScored,
  weakestSkill,
} from "./mastery";
import { debriefRows } from "./useBattle";
import type {
  AgentStep,
  BattleState,
  Call,
  CallGrade,
  Encounter,
  MasterySkillId,
  PathwayProgress,
  SkillRecord,
  StepRuntime,
  StepStatus,
} from "./types";

const DAY = "2026-09-25";

function step(over: Partial<AgentStep> = {}): AgentStep {
  return {
    id: "s1",
    ticket: "#50001 · Test Co",
    intent: "Do a thing",
    quip: "Doing it!",
    category: "ticket",
    safe: true,
    reversible: true,
    progress: 1,
    risk: 0,
    evidence: [{ label: "Note", detail: "Fine.", redFlag: false }],
    outcome: { executed: "Done.", blocked: "Blocked.", escalated: "Dana did it.", rolledBack: "Undone." },
    lesson: "Lesson.",
    skill: "verify-identity",
    ...over,
  };
}

const risky = (over: Partial<AgentStep> = {}) =>
  step({ safe: false, progress: 0, risk: 3, evidence: [{ label: "A", detail: "x", redFlag: false }, { label: "B", detail: "y", redFlag: true }], ...over });

function rt(status: StepStatus, inspected = false, requeues = 0): StepRuntime {
  return { stepId: "s1", status, inspected, requeues, resolvedOnTurn: status === "queued" ? null : 1 };
}

function call(grade: CallGrade, safe: boolean, skill: MasterySkillId = "verify-identity", stepId = "x"): Call {
  return { stepId, skill, grade, safe, reason: "" };
}

/** Calls for one skill from a compact string: uppercase = risky, lowercase = safe. */
function calls(pattern: string, skill: MasterySkillId = "verify-identity"): Call[] {
  return [...pattern].map((ch, i) => call(ch.toUpperCase() as CallGrade, ch === ch.toLowerCase(), skill, `s${i}`));
}

function progress(over: Partial<PathwayProgress> = {}): PathwayProgress {
  return {
    introSeen: true,
    hub: null,
    battle: null,
    pendingResult: null,
    best: null,
    attempts: 0,
    wins: 0,
    history: [],
    ...over,
  };
}

describe("gradePlan: every row of the grading table", () => {
  const rows: {
    name: string;
    step: AgentStep;
    runtime: StepRuntime;
    result: CallGrade | null;
    reason: string;
    lens: CallGrade | null;
    calib: CallGrade | null;
  }[] = [
    { name: "risky, inspected then blocked", step: risky(), runtime: rt("blocked", true), result: "R", reason: "Caught", lens: "R", calib: null },
    { name: "risky, inspected then escalated", step: risky(), runtime: rt("escalated", true), result: "R", reason: "Caught", lens: "R", calib: null },
    { name: "risky, blocked blind", step: risky(), runtime: rt("blocked"), result: "P", reason: "Lucky guess", lens: "P", calib: null },
    { name: "risky, escalated blind", step: risky(), runtime: rt("escalated"), result: "P", reason: "Dana did the check", lens: "P", calib: null },
    { name: "risky, ran then rolled back", step: risky(), runtime: rt("rolled-back", true), result: "P", reason: "Caught it late", lens: "P", calib: null },
    { name: "risky, ran", step: risky(), runtime: rt("executed", true), result: "W", reason: "Got through", lens: "W", calib: null },
    { name: "safe, inspected then approved", step: step(), runtime: rt("executed", true), result: "R", reason: "Checked and approved", lens: "R", calib: "R" },
    { name: "safe, approved blind", step: step(), runtime: rt("executed"), result: "R", reason: "Approved", lens: null, calib: null },
    { name: "safe, escalated", step: step(), runtime: rt("escalated", true), result: "P", reason: "Dana didn't need this one", lens: "P", calib: "P" },
    { name: "safe, blocked then approved", step: step(), runtime: rt("executed", true, 1), result: "P", reason: "Fixed it later", lens: "P", calib: "W" },
    { name: "safe, blocked then escalated", step: step(), runtime: rt("escalated", false, 2), result: "P", reason: "Fixed it later", lens: "P", calib: "W" },
    { name: "safe, blocked and never done", step: step(), runtime: rt("queued", true, 1), result: "W", reason: "Blocked good work", lens: "W", calib: "W" },
    { name: "safe, rolled back", step: step(), runtime: rt("rolled-back", true), result: "W", reason: "Blocked good work", lens: "W", calib: "W" },
    { name: "safe, never announced", step: step(), runtime: rt("queued"), result: null, reason: "", lens: null, calib: null },
    { name: "risky, never announced", step: risky(), runtime: rt("queued"), result: null, reason: "", lens: null, calib: null },
    { name: "risky, still announced when the shift ended", step: risky(), runtime: rt("announced", true), result: null, reason: "", lens: null, calib: null },
  ];

  for (const r of rows) {
    it(r.name, () => {
      const g = gradePlan(r.step, r.runtime);
      expect(g.result).toBe(r.result);
      expect(g.reason).toBe(r.reason);
      const lens = g.calls.find((c) => c.skill === "verify-identity");
      const calib = g.calls.find((c) => c.skill === "approve-checked");
      expect(lens?.grade ?? null).toBe(r.lens);
      expect(calib?.grade ?? null).toBe(r.calib);
      for (const c of g.calls) expect(c.safe).toBe(r.step.safe);
    });
  }

  it("a step without a skill tag gives only the calibration call", () => {
    const g = gradePlan(step({ skill: undefined }), rt("executed", true));
    expect(g.calls.map((c) => c.skill)).toEqual(["approve-checked"]);
  });

  it("counts a plan inspected by Policy: Callback as inspected", () => {
    const enc: Encounter = {
      ...HELP_DESK_PRACTICE,
      id: "t-policy",
      guidedSteps: 0,
      steps: [risky({ id: "cred", category: "credential" })],
      starterDeck: ["policy-callback", "block"],
      handSize: 2,
      energyPerTurn: 3,
      maxRisk: 10,
      maxTurns: 3,
      actionsPerTurn: [1],
    };
    let s = createBattle(enc, 1);
    const policy = s.hand.find((c) => c.cardId === "policy-callback")!;
    let r = playCard(s, enc, policy.uid);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    expect(s.steps.cred.inspected).toBe(true);
    const block = s.hand.find((c) => c.cardId === "block")!;
    r = playCard(s, enc, block.uid, "cred");
    if (!r.ok) throw new Error(r.reason);
    expect(gradePlan(enc.steps[0], r.state.steps.cred)).toMatchObject({ result: "R", reason: "Caught" });
  });
});

/** Play a Monday shift with a scripted policy, so the debrief and the grades can be compared. */
function playMonday(policy: (s: BattleState, enc: Encounter) => BattleState, seed = 7): BattleState {
  const enc = HELP_DESK_ENCOUNTER;
  let s = createBattle(enc, seed);
  for (let i = 0; s.status === "playing" && i < 20; i++) s = policy(s, enc);
  return s;
}

function tryCard(s: BattleState, enc: Encounter, cardId: string, target?: string): BattleState {
  const card = s.hand.find((c) => c.cardId === cardId);
  if (!card) return s;
  const r = playCard(s, enc, card.uid, target);
  return r.ok ? r.state : s;
}

describe("debrief rows and results use gradePlan", () => {
  it("maps R to good, P to ok, W to bad, never-judged to none, for every step", () => {
    const blindEscalate = (s: BattleState, enc: Encounter) => {
      let cur = s;
      for (const id of cur.announced.slice()) {
        const def = enc.steps.find((x) => x.id === id)!;
        if (!def.safe) cur = tryCard(cur, enc, "escalate", id);
      }
      return cur.status === "playing" ? endTurn(cur, enc) : cur;
    };
    for (const policy of [blindEscalate, (s: BattleState, enc: Encounter) => endTurn(s, enc)]) {
      const s = playMonday(policy);
      const rows = debriefRows(s, HELP_DESK_ENCOUNTER);
      const want = { R: "good", P: "ok", W: "bad" } as const;
      for (const row of rows) {
        const g = gradePlan(row.step, s.steps[row.step.id]);
        expect(row.grade).toBe(g.result ? want[g.result] : "none");
        expect(row.plan).toEqual(g);
      }
    }
  });

  it("a blind Escalate on a risky plan is now ok, not good", () => {
    const s = playMonday((st, enc) => {
      let cur = st;
      for (const id of cur.announced.slice()) {
        if (!enc.steps.find((x) => x.id === id)!.safe) cur = tryCard(cur, enc, "escalate", id);
      }
      return cur.status === "playing" ? endTurn(cur, enc) : cur;
    });
    const escalatedBlind = debriefRows(s, HELP_DESK_ENCOUNTER).filter(
      (r) => !r.step.safe && r.runtime.status === "escalated" && !r.runtime.inspected,
    );
    expect(escalatedBlind.length).toBeGreaterThan(0);
    for (const r of escalatedBlind) expect(r.grade).toBe("ok");
  });

  it("shiftTally counts results the way the debrief shows them", () => {
    const s = playMonday((st, enc) => endTurn(st, enc));
    const rows = debriefRows(s, HELP_DESK_ENCOUNTER);
    expect(shiftTally(s, HELP_DESK_ENCOUNTER)).toEqual({
      right: rows.filter((r) => r.grade === "good").length,
      partly: rows.filter((r) => r.grade === "ok").length,
      missed: rows.filter((r) => r.grade === "bad").length,
    });
  });
});

describe("callsFromBattle", () => {
  it("skips the guided practice steps (1-2) and keeps the rest", () => {
    const enc = HELP_DESK_PRACTICE;
    expect(enc.guidedSteps).toBe(2);
    let s = createBattle(enc, 3);
    // Inspect and approve everything, one plan per turn.
    for (let i = 0; s.status === "playing" && i < 10; i++) {
      const id = s.announced[0];
      if (id) s = tryCard(s, enc, "inspect", id);
      s = endTurn(s, enc);
    }
    const ids = new Set(callsFromBattle(s, enc).map((c) => c.stepId));
    expect(ids.has(enc.steps[0].id)).toBe(false);
    expect(ids.has(enc.steps[1].id)).toBe(false);
    expect(ids.has(enc.steps[2].id) || ids.has(enc.steps[3].id)).toBe(true);
  });

  it("lists calls in the order the plans were finally resolved", () => {
    const s = playMonday((st, enc) => endTurn(st, enc));
    const order = s.executedHistory;
    const seen = callsFromBattle(s, HELP_DESK_ENCOUNTER).map((c) => c.stepId);
    const firstSeen = [...new Set(seen)];
    expect(firstSeen).toEqual(order.filter((id) => firstSeen.includes(id)));
  });
});

describe("levels", () => {
  const apply = (skills: Partial<Record<MasterySkillId, SkillRecord>>, pattern: string, day: string, skill: MasterySkillId = "verify-identity") =>
    applyCalls(skills, calls(pattern, skill), day);

  it("accuracy is the mean of recent grades, 0.5 when empty", () => {
    expect(accuracy("")).toBe(0.5);
    expect(accuracy("RrPW")).toBe(0.625);
    expect(accuracy("wwww")).toBe(0);
  });

  it("the first call makes a skill Learning, and one shift moves at most one level", () => {
    const after = apply({}, "RrRrRrRrRr", DAY)["verify-identity"]!;
    expect(after.level).toBe(1);
    expect(after.n).toBe(10);
    expect(after.recent).toBe("RrRrRr");
    expect(after.days).toEqual([DAY]);
    expect(after.last).toBe(DAY);
  });

  it("Practicing needs n >= 3, accuracy >= 0.6, and a right call on both a risky and a safe plan", () => {
    let s = apply({}, "R", DAY);
    s = apply(s, "RR", DAY);
    expect(s["verify-identity"]!.level).toBe(1); // only risky plans: could be blocking everything
    s = apply(s, "r", DAY);
    expect(s["verify-identity"]!.level).toBe(2);
    // approve-checked has only safe plans, so it needs no risky R.
    let c = apply({}, "rr", DAY, "approve-checked");
    c = apply(c, "r", DAY, "approve-checked");
    expect(c["approve-checked"]!.level).toBe(2);
    // Low accuracy stays Learning.
    let w = apply({}, "Rr", DAY);
    w = apply(w, "WWw", DAY);
    expect(w["verify-identity"]!.level).toBe(1);
  });

  it("Solid needs calls on 2+ days (no cramming), n >= 5, accuracy >= 0.8 and no W in the last 3", () => {
    let s = apply({}, "Rr", DAY);
    s = apply(s, "Rr", DAY);
    s = apply(s, "Rr", DAY);
    s = apply(s, "Rr", DAY);
    expect(s["verify-identity"]!.level).toBe(2); // same day: stuck at Practicing
    const next = addDays(DAY, 1);
    s = apply(s, "Rr", next);
    expect(s["verify-identity"]!.level).toBe(3);
    expect(s["verify-identity"]!.solidOn).toBe(next);

    // A W in the last 3 keeps it from Solid.
    let t = apply({}, "Rr", DAY);
    t = apply(t, "Rr", DAY);
    t = apply(t, "RrRrW", addDays(DAY, 1));
    expect(t["verify-identity"]!.level).toBe(2);
  });

  it("Sharp: Solid, then the first 2 calls 3+ days after solidOn are both right", () => {
    let s = apply({}, "Rr", DAY);
    s = apply(s, "Rr", DAY);
    s = apply(s, "Rr", addDays(DAY, 1));
    const solidOn = s["verify-identity"]!.solidOn!;
    expect(s["verify-identity"]!.level).toBe(3);
    // Too early: still Solid.
    s = apply(s, "RR", addDays(solidOn, 2));
    expect(s["verify-identity"]!.level).toBe(3);
    // The delayed review, over two shifts: both right.
    s = apply(s, "r", addDays(solidOn, 3));
    expect(s["verify-identity"]!.level).toBe(3);
    s = apply(s, "R", addDays(solidOn, 3));
    expect(s["verify-identity"]!.level).toBe(4);
  });

  it("a missed delayed review restarts the wait for Sharp", () => {
    let s = apply({}, "Rr", DAY);
    s = apply(s, "Rr", DAY);
    s = apply(s, "RrRr", addDays(DAY, 1));
    const solidOn = s["verify-identity"]!.solidOn!;
    const review = addDays(solidOn, 3);
    s = apply(s, "PRr", review); // first review call is not R
    expect(s["verify-identity"]!.level).toBe(3);
    expect(s["verify-identity"]!.solidOn).toBe(review);
    s = apply(s, "RR", addDays(review, 1));
    expect(s["verify-identity"]!.level).toBe(3);
    s = apply(s, "Rr", addDays(review, 3));
    expect(s["verify-identity"]!.level).toBe(4);
  });

  it("drops at most one level per shift and never below Learning", () => {
    let s = apply({}, "Rr", DAY);
    s = apply(s, "Rr", DAY);
    s = apply(s, "Rr", addDays(DAY, 1));
    expect(s["verify-identity"]!.level).toBe(3);
    s = apply(s, "WWWWWW", addDays(DAY, 1));
    expect(s["verify-identity"]!.level).toBe(2);
    s = apply(s, "WWW", addDays(DAY, 1));
    expect(s["verify-identity"]!.level).toBe(1);
    s = apply(s, "WWWWWW", addDays(DAY, 1));
    expect(s["verify-identity"]!.level).toBe(1);
    expect(s["verify-identity"]!.solidOn).toBeNull();
  });

  it("only skills with calls change", () => {
    const before = apply({}, "Rr", DAY);
    const after = applyCalls(before, [call("R", false, "guard-data")], DAY);
    expect(after["verify-identity"]).toEqual(before["verify-identity"]);
    expect(after["guard-data"]!.level).toBe(1);
    expect(skillChanges(before, after)).toEqual([{ skill: "guard-data", from: 0, to: 1 }]);
  });
});

describe("spacing: due dates", () => {
  const rec = (level: SkillRecord["level"], last: string, recent = "RrRrRr"): SkillRecord => ({
    recent,
    n: 12,
    level,
    days: [addDays(last, -1), last],
    last,
    solidOn: level >= 3 ? addDays(last, -5) : null,
  });

  it("uses review intervals of 1, 2, 4 and 7 days", () => {
    const cases: [SkillRecord["level"], number][] = [
      [1, 1],
      [2, 2],
      [3, 4],
      [4, 7],
    ];
    for (const [level, days] of cases) {
      expect(isDue(rec(level, DAY), addDays(DAY, days - 1)), `level ${level}`).toBe(false);
      expect(isDue(rec(level, DAY), addDays(DAY, days)), `level ${level}`).toBe(true);
      expect(dueOn(rec(level, DAY))).toBe(addDays(DAY, days));
    }
    expect(isDue(undefined, DAY)).toBe(false);
  });

  it("a due skill's first call decides: R or P keeps the level, W drops one", () => {
    const start = { "verify-identity": rec(2, DAY, "RrRrRr") };
    const dueDay = addDays(DAY, 2);
    // R or P never drops it (here the new day even meets Solid).
    expect(applyCalls(start, calls("P"), dueDay)["verify-identity"]!.level).toBeGreaterThanOrEqual(2);
    expect(applyCalls(start, calls("R"), dueDay)["verify-identity"]!.level).toBeGreaterThanOrEqual(2);
    // The W alone would still meet Practicing (accuracy 5/6), but a due miss drops a level.
    expect(applyCalls(start, calls("W"), dueDay)["verify-identity"]!.level).toBe(1);
    // Not due: the same W keeps Practicing.
    expect(applyCalls(start, calls("W"), addDays(DAY, 1))["verify-identity"]!.level).toBe(2);
  });

  it("a shift with no miss never lowers a skill", () => {
    // (a) A due Practicing skill whose first call is P keeps its level, even with accuracy under the bar.
    const shaky: SkillRecord = { recent: "RrWrWr", n: 6, level: 2, days: [addDays(DAY, -1), DAY], last: DAY, solidOn: null };
    const a = applyCalls({ "verify-identity": shaky }, calls("P"), addDays(DAY, 2))["verify-identity"]!;
    expect(a.recent).toBe("rWrWrP");
    expect(a.level).toBe(2);
    // (b) Sharp with one W drops to Solid; the next shift is all right and must not drop it again,
    // although the old W is still in the last 3.
    const sharp: SkillRecord = { recent: "RrRrRr", n: 12, level: 4, days: [addDays(DAY, -1), DAY], last: DAY, solidOn: addDays(DAY, -8) };
    let s = applyCalls({ "verify-identity": sharp }, calls("rrW"), addDays(DAY, 1));
    expect(s["verify-identity"]!.level).toBe(3);
    s = applyCalls(s, calls("R"), addDays(DAY, 2));
    expect(s["verify-identity"]!.recent).toBe("RrrrWR");
    expect(s["verify-identity"]!.level).toBe(3);
    // A real miss on a due skill still drops one level.
    expect(applyCalls({ "verify-identity": shaky }, calls("W"), addDays(DAY, 2))["verify-identity"]!.level).toBe(1);
  });

  it("nothing decays silently: records only change when there are calls", () => {
    const start = { "verify-identity": rec(3, DAY) };
    expect(applyCalls(start, [], addDays(DAY, 60))).toEqual(start);
  });
});

describe("the latest miss (skill sheet)", () => {
  const withReason = (grade: CallGrade, safe: boolean, stepId: string, reason: string): Call => ({ stepId, skill: "confirm-fix", grade, safe, reason });

  it("keeps a real miss (W) over a later partly right call in the same shift", () => {
    const s = applyCalls({}, [withReason("W", false, "pell-close", "Got through"), withReason("P", true, "lam-close", "Fixed it later")], DAY);
    expect(s["confirm-fix"]!.miss).toBe("pell-close");
    expect(s["confirm-fix"]!.missWhy).toBeUndefined();
  });

  it("uses a partly right call only when no W is recent, and keeps its reason", () => {
    const s = applyCalls({}, [withReason("R", false, "a", "Caught"), withReason("P", true, "lam-close", "Fixed it later")], DAY);
    expect(s["confirm-fix"]!.miss).toBe("lam-close");
    expect(s["confirm-fix"]!.missWhy).toBe("Fixed it later");
    const t = applyCalls(s, [withReason("W", false, "pell-close", "Got through")], DAY);
    expect(t["confirm-fix"]!.miss).toBe("pell-close");
    expect(t["confirm-fix"]!.missWhy).toBeUndefined();
  });
});

describe("need and the weakest skill", () => {
  it("follows the formula", () => {
    expect(need(undefined, DAY)).toBe(2.5);
    const base: SkillRecord = { recent: "RrRr", n: 4, level: 2, days: [DAY], last: DAY, solidOn: null };
    expect(need(base, DAY)).toBe(1);
    expect(need({ ...base, recent: "RrWw" }, DAY)).toBe(2.5);
    expect(need(base, addDays(DAY, 2))).toBe(3); // due
    expect(need({ ...base, level: 4, solidOn: DAY }, DAY)).toBe(0.5); // Sharp, not due
    expect(need({ ...base, level: 4, solidOn: DAY }, addDays(DAY, 7))).toBe(3); // Sharp, due
  });

  it("picks the highest need, ties broken by skill order", () => {
    expect(weakestSkill({}, DAY)).toBe("verify-identity");
    const strong: SkillRecord = { recent: "RrRrRr", n: 6, level: 2, days: [DAY], last: DAY, solidOn: null };
    const skills = {
      "verify-identity": strong,
      "check-approval": strong,
      "match-request": { ...strong, recent: "RrWw" },
    };
    // match-request 2.5 ties with every skill that has no calls; it comes first in skill order.
    expect(weakestSkill(skills, DAY)).toBe("match-request");
    expect(weakestSkill({ ...skills, "match-request": { ...strong, recent: "WwWw" } }, DAY)).toBe("match-request");
  });
});

describe("applyBattle: idempotence, scored window, practice days", () => {
  const enc = HELP_DESK_ENCOUNTER;
  const approveAll = (seed: number) => {
    let s = createBattle(enc, seed);
    for (let i = 0; s.status === "playing" && i < 20; i++) s = endTurn(s, enc);
    return s;
  };

  it("applies a battle once, keyed by encounter id and seed", () => {
    const s = approveAll(11);
    const once = applyBattle(progress(), s, enc, DAY);
    expect(once.applied).toEqual([battleKey(s)]);
    expect(Object.keys(once.skills ?? {}).length).toBeGreaterThan(0);
    expect(applyBattle(once, s, enc, DAY)).toBe(once);
    expect(once.days).toEqual([DAY]);
  });

  it("keeps the last 10 applied keys", () => {
    let p = progress();
    for (let seed = 1; seed <= 12; seed++) p = applyBattle(p, approveAll(seed), enc, addDays(DAY, seed * 3));
    expect(p.applied).toHaveLength(10);
    expect(p.applied![9]).toBe(`${enc.id}:12`);
  });

  it("a same-day replay tests skill, not memory: steps scored in the last 2 days don't count again", () => {
    const first = applyBattle(progress(), approveAll(1), enc, DAY);
    const replay = applyBattle(first, approveAll(2), enc, DAY);
    expect(replay.skills).toEqual(first.skills);
    expect(replay.applied).toHaveLength(2);
    const nextDay = applyBattle(first, approveAll(3), enc, addDays(DAY, 1));
    expect(nextDay.skills).toEqual(first.skills);
    const later = applyBattle(first, approveAll(4), enc, addDays(DAY, 2));
    expect(later.skills?.["verify-identity"]!.n).toBeGreaterThan(first.skills?.["verify-identity"]!.n ?? 0);
  });

  it("trims scored steps to 7 days and practice days to 14", () => {
    expect(trimScored({ a: DAY, b: addDays(DAY, -6), c: addDays(DAY, -7), d: "junk" }, DAY)).toEqual({ a: DAY, b: addDays(DAY, -6) });
    const old = Array.from({ length: 20 }, (_, i) => addDays(DAY, -i - 1));
    const p = applyBattle(progress({ days: old }), approveAll(5), enc, DAY);
    expect(p.days!.length).toBeLessThanOrEqual(14);
    expect(p.days![p.days!.length - 1]).toBe(DAY);
    expect(p.days!.every((d) => daysBetween(d, DAY) < 14)).toBe(true);
  });

  it("dates are real YYYY-MM-DD days", () => {
    expect(isDay("2026-02-29")).toBe(false);
    expect(isDay("2028-02-29")).toBe(true);
    expect(isDay("2026-9-5")).toBe(false);
    expect(daysBetween("2026-12-31", "2027-01-02")).toBe(2);
  });
});
