import { describe, expect, it } from "vitest";
import { HELP_DESK } from "@/lib/pathways/help-desk";
import { BANK_VERSION, HELP_DESK_BANK, HELP_DESK_ENCOUNTER, SHIFT_TEXT, encounterFor, shiftEncounter } from "./content";
import { canResume, createBattle, deckAtTurn, endTurn } from "./engine";
import { addDays } from "./mastery";
import {
  DAILY_MAX_PLANS,
  DAILY_MIN_PLANS,
  FALLBACK_DAILY,
  bankVersionOf,
  beginShift,
  buildShift,
  checkDaily,
  dailyOrderOk,
  interleave,
  turnOfPlan,
  planDaily,
  planDrill,
  specProblem,
  ticketSkills,
} from "./shiftGen";
import { LENS_SKILLS, MASTERY_SKILLS } from "./skills";
import type { AgentStep, BankTicket, HistoryEntry, MasterySkillId, PathwayProgress, ShiftSpec, SkillRecord } from "./types";

const TODAY = "2026-09-25";
const SEEDS = 600;
const byId = new Map(HELP_DESK_BANK.map((t) => [t.id, t]));
const stepById = new Map(HELP_DESK_BANK.flatMap((t) => t.steps.map((s) => [s.id, s] as const)));
const AGENT = HELP_DESK_ENCOUNTER.agent;
const OPTS = { agent: AGENT, skillCopy: (id: MasterySkillId) => HELP_DESK.skill(id) };

function progress(over: Partial<PathwayProgress> = {}): PathwayProgress {
  return { introSeen: true, hub: null, battle: null, pendingResult: null, best: null, attempts: 1, wins: 1, history: [], ...over };
}

function dailiesDone(n: number): HistoryEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    encounterId: `hd-daily-${i}`,
    status: "won" as const,
    stars: 0,
    at: "2026-09-20T10:00:00.000Z",
    catches: 0,
    falseAlarms: 0,
    misses: 0,
    mode: "daily" as const,
  }));
}

const ticketsOf = (spec: ShiftSpec): BankTicket[] => spec.ticketIds.map((id) => byId.get(id)!);
const stepsOf = (spec: ShiftSpec): AgentStep[] => spec.stepIds.map((id) => stepById.get(id)!);

/** Every ticket's plans are all there, once, in chain order. */
function expectIntact(spec: ShiftSpec) {
  const tickets = ticketsOf(spec);
  expect(tickets.every(Boolean), spec.id).toBe(true);
  expect(new Set(spec.ticketIds).size).toBe(spec.ticketIds.length);
  expect([...spec.stepIds].sort()).toEqual(tickets.flatMap((t) => t.steps.map((s) => s.id)).sort());
  for (const t of tickets) {
    const at = t.steps.map((s) => spec.stepIds.indexOf(s.id));
    expect(at, `${t.id} keeps its chain order`).toEqual([...at].sort((a, b) => a - b));
  }
}

describe("the ticket bank as the generator sees it", () => {
  it("has a stable version that changes when ids change", () => {
    expect(BANK_VERSION).toBe(bankVersionOf(HELP_DESK_BANK));
    const renamed = HELP_DESK_BANK.map((t, i) => (i === 0 ? { ...t, id: `${t.id}-x` } : t));
    expect(bankVersionOf(renamed)).not.toBe(BANK_VERSION);
  });

  it("the fallback daily is itself a valid daily", () => {
    const tickets = FALLBACK_DAILY.map((id) => byId.get(id)!);
    expect(tickets.every(Boolean)).toBe(true);
    expect(checkDaily(tickets)).toEqual({ ok: true, target: true });
    expect(tickets.every((t) => t.difficulty < 3)).toBe(true);
  });

  it("tags approve-checked on tickets with a scary-safe plan", () => {
    for (const t of HELP_DESK_BANK) {
      expect(ticketSkills(t).includes("approve-checked")).toBe(t.steps.some((s) => s.safe && s.twist === "scary-safe"));
    }
  });
});

describe("planDaily", () => {
  const specs = Array.from({ length: SEEDS }, (_, i) =>
    planDaily(HELP_DESK_BANK, progress(), { playerId: `player-${i}`, today: TODAY }),
  );
  const unlocked = Array.from({ length: SEEDS }, (_, i) =>
    planDaily(HELP_DESK_BANK, progress({ history: dailiesDone(2), dailyCount: 2 }), { playerId: `player-${i}`, today: TODAY }),
  );

  it("is deterministic: same player + same daily count = same shift", () => {
    const p = progress({ dailyCount: 3 });
    const a = planDaily(HELP_DESK_BANK, p, { playerId: "p1", today: TODAY });
    const b = planDaily(HELP_DESK_BANK, JSON.parse(JSON.stringify(p)) as PathwayProgress, { playerId: "p1", today: TODAY });
    expect(b).toEqual(a);
    expect(a.id).toBe("hd-daily-3");
    expect(a.n).toBe(3);
    expect(a.bankVersion).toBe(BANK_VERSION);
    const other = planDaily(HELP_DESK_BANK, progress({ dailyCount: 4 }), { playerId: "p1", today: TODAY });
    expect(other.seed).not.toBe(a.seed);
    const distinct = new Set(specs.map((s) => s.stepIds.join()));
    expect(distinct.size).toBeGreaterThan(SEEDS / 2);
  });

  it("keeps whole tickets, in chain order", () => {
    for (const spec of [...specs, ...unlocked]) expectIntact(spec);
  });

  it("is always valid: 7-10 plans, 50-70% safe, both twists, 2+ companies, a risky plan", () => {
    for (const spec of [...specs, ...unlocked]) {
      const steps = stepsOf(spec);
      expect(steps.length).toBeGreaterThanOrEqual(DAILY_MIN_PLANS);
      expect(steps.length).toBeLessThanOrEqual(DAILY_MAX_PLANS);
      expect(checkDaily(ticketsOf(spec)).ok, spec.stepIds.join()).toBe(true);
      expect(spec.ticketIds.length === 4 || spec.ticketIds.length === 3).toBe(true);
    }
  });

  it("aims for 55-65% safe, and gets there whenever the bank allows", () => {
    const inTarget = [...specs, ...unlocked].filter((s) => checkDaily(ticketsOf(s)).target).length;
    expect(inTarget / (2 * SEEDS)).toBeGreaterThanOrEqual(0.99);
  });

  it("orders plans with a warm-up safe plan first, no scary-safe plan in the first 2, never 3 risky in a row", () => {
    const ok = [...specs, ...unlocked].filter((s) => dailyOrderOk(stepsOf(s))).length;
    expect(ok / (2 * SEEDS)).toBeGreaterThanOrEqual(0.95);
    for (const spec of [...specs, ...unlocked]) expect(stepsOf(spec)[0].safe, spec.stepIds.join()).toBe(true);
  });

  it("never puts 2 risky plans on one turn (1 plan on turn 1, then 2 a turn)", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => turnOfPlan(i))).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
    const pairs = (spec: ShiftSpec) => {
      const turns = stepsOf(spec)
        .map((s, i) => (s.safe ? -1 : turnOfPlan(i)))
        .filter((t) => t >= 0);
      return turns.length - new Set(turns).size;
    };
    const all = [...specs, ...unlocked];
    const withPair = all.filter((s) => pairs(s) > 0).length;
    console.info(`dailies with 2 risky plans on one turn: ${withPair} of ${all.length}`);
    expect(withPair / all.length).toBeLessThanOrEqual(0.01);
    // The same risky-pair rule is part of dailyOrderOk.
    const risky = stepsOf(specs[0]).filter((s) => !s.safe);
    const safe = stepsOf(specs[0]).filter((s) => s.safe);
    expect(dailyOrderOk([safe[0], risky[0], risky[1], ...safe.slice(1)])).toBe(false);
  });

  it("tests a weak lead focus with a risky plan of that skill (80%+ of dailies)", () => {
    const strong: SkillRecord = { recent: "RrRrRr", n: 12, level: 3, days: [addDays(TODAY, -1), TODAY], last: TODAY, solidOn: addDays(TODAY, -1) };
    const skills: Partial<Record<MasterySkillId, SkillRecord>> = {};
    for (const s of MASTERY_SKILLS) skills[s] = strong;
    for (const lead of ["confirm-fix", "match-request", "check-approval", "guard-data"] as const) {
      // A risky plan of the skill got through lately (uppercase W), so it leads the focus.
      skills[lead] = { ...strong, recent: "RrrWrW", level: 1, solidOn: null };
      const lastDaily = HELP_DESK_BANK.filter((t) => t.steps.some((s) => !s.safe && s.skill === lead)).slice(0, 1).map((t) => t.id);
      const p = progress({ skills, recentTickets: [lastDaily], dailyCount: 1 });
      const list = Array.from({ length: 300 }, (_, i) => planDaily(HELP_DESK_BANK, p, { playerId: `w-${i}`, today: TODAY }));
      for (const spec of list) expect(spec.focus[0]).toBe(lead);
      const hit = list.filter((spec) => stepsOf(spec).some((s) => !s.safe && s.skill === lead)).length;
      console.info(`${lead}: a risky plan of the focus in ${hit} of ${list.length} dailies`);
      expect(hit / list.length, lead).toBeGreaterThanOrEqual(0.8);
      skills[lead] = strong;
    }
  });

  it("rarely needs the fallback (under 1% of seeds)", () => {
    const fallback = [...FALLBACK_DAILY].sort().join();
    const used = specs.filter((s) => [...s.ticketIds].sort().join() === fallback).length;
    expect(used / SEEDS).toBeLessThan(0.01);
  });

  it("D3 tickets wait until 2 dailies are finished, then at most 1 per shift", () => {
    for (const spec of specs) expect(ticketsOf(spec).filter((t) => t.difficulty === 3)).toHaveLength(0);
    const counts = unlocked.map((s) => ticketsOf(s).filter((t) => t.difficulty === 3).length);
    expect(Math.max(...counts)).toBe(1);
    expect(counts.filter((n) => n === 1).length).toBeGreaterThan(SEEDS / 10);
  });

  it("damps tickets from the last 2 dailies", () => {
    const recent = [["c-okafor-cleanup", "c-new-hire-ferreira", "c-romero-new-phone", "a-printer-queue"]];
    const flat = recent.flat();
    const hits = (list: ShiftSpec[]) => list.reduce((n, s) => n + s.ticketIds.filter((id) => flat.includes(id)).length, 0);
    const damped = Array.from({ length: SEEDS }, (_, i) =>
      planDaily(HELP_DESK_BANK, progress({ recentTickets: recent }), { playerId: `player-${i}`, today: TODAY }),
    );
    expect(hits(damped)).toBeLessThan(hits(specs) * 0.6);
  });

  it("focuses on the 2 weakest skills and picks tickets that train them", () => {
    const strong: SkillRecord = { recent: "RrRrRr", n: 12, level: 3, days: [addDays(TODAY, -1), TODAY], last: TODAY, solidOn: addDays(TODAY, -1) };
    const weak: SkillRecord = { ...strong, recent: "WwWwRr", level: 1, solidOn: null };
    const skills: Partial<Record<MasterySkillId, SkillRecord>> = {};
    for (const s of MASTERY_SKILLS) skills[s] = strong;
    skills["guard-data"] = weak;
    skills["confirm-fix"] = { ...weak, recent: "WwWwWr" };
    const p = progress({ skills });
    const focused = Array.from({ length: 200 }, (_, i) => planDaily(HELP_DESK_BANK, p, { playerId: `f-${i}`, today: TODAY }));
    for (const spec of focused) expect([...spec.focus].sort()).toEqual(["confirm-fix", "guard-data"]);
    const share = (list: ShiftSpec[]) =>
      list.reduce((n, s) => n + stepsOf(s).filter((x) => x.skill === "guard-data" || x.skill === "confirm-fix").length, 0) /
      list.reduce((n, s) => n + s.stepIds.length, 0);
    expect(share(focused)).toBeGreaterThan(share(specs.slice(0, 200)));
  });
});

describe("beginShift", () => {
  it("counts the daily, remembers its tickets (last 2), and keeps the spec", () => {
    let p = progress();
    const a = planDaily(HELP_DESK_BANK, p, { playerId: "p", today: TODAY });
    p = beginShift(p, a);
    expect(p.shift).toEqual(a);
    expect(p.dailyCount).toBe(1);
    const b = planDaily(HELP_DESK_BANK, p, { playerId: "p", today: TODAY });
    expect(b.id).toBe("hd-daily-1");
    p = beginShift(beginShift(p, b), planDaily(HELP_DESK_BANK, { ...p, dailyCount: 2 }, { playerId: "p", today: TODAY }));
    expect(p.recentTickets).toHaveLength(2);
    expect(p.dailyCount).toBe(3);
  });

  it("counts drills per skill", () => {
    const spec = planDrill(HELP_DESK_BANK, "guard-data", { playerId: "p", k: 0, today: TODAY });
    const p = beginShift(progress(), spec);
    expect(p.drillCount).toEqual({ "guard-data": 1 });
    expect(p.shift).toEqual(spec);
  });
});

describe("buildShift", () => {
  const spec = planDaily(HELP_DESK_BANK, progress(), { playerId: "build", today: TODAY });
  const enc = buildShift(HELP_DESK_BANK, spec, SHIFT_TEXT, OPTS);

  it("builds the same encounter from the same spec", () => {
    expect(buildShift(HELP_DESK_BANK, JSON.parse(JSON.stringify(spec)) as ShiftSpec, SHIFT_TEXT, OPTS)).toEqual(enc);
    expect(enc.steps.map((s) => s.id)).toEqual(spec.stepIds);
  });

  it("is a Daily practice shell: 2 plans at a time, 7 turns, Monday's deck, no breach", () => {
    expect(enc.id).toBe(spec.id);
    expect(enc.mode).toBe("daily");
    expect(enc.title).toBe("Daily practice");
    expect(enc.subtitle).toMatch(/^[34] tickets · Focus: /);
    expect(enc.setting).toMatch(/Fenwick IT Solutions/);
    expect(enc.actionsPerTurn).toEqual([1, 2]);
    expect(enc.maxTurns).toBe(7);
    expect(enc.energyPerTurn).toBe(3);
    expect(enc.handSize).toBe(5);
    expect(enc.unlocks ?? []).toEqual([]);
    const risky = enc.steps.filter((s) => !s.safe).reduce((n, s) => n + s.risk, 0);
    expect(enc.maxRisk).toBe(risky + 1);
    const hasCredential = enc.steps.some((s) => s.category === "credential");
    expect(enc.starterDeck.includes("policy-callback")).toBe(hasCredential);
    expect(deckAtTurn(HELP_DESK_ENCOUNTER, HELP_DESK_ENCOUNTER.maxTurns).filter((c) => c !== "policy-callback").sort()).toEqual(
      enc.starterDeck.filter((c) => c !== "policy-callback").sort(),
    );
    expect(enc.intro.map((l) => l.speaker)).toEqual(["coach", "agent"]);
    expect(enc.outro.win.length && enc.outro.timeout.length && enc.outro.breach.length && enc.outro.winWithMisses?.length).toBeTruthy();
    expect(enc.agent).toEqual(AGENT);
  });

  it("rotates Ollie's lines: back-to-back dailies and drills never repeat a line", () => {
    const at = (n: number) => buildShift(HELP_DESK_BANK, planDaily(HELP_DESK_BANK, progress({ dailyCount: n }), { playerId: "rot", today: TODAY }), SHIFT_TEXT, OPTS);
    for (let n = 0; n < 8; n++) {
      const a = at(n).outro;
      const b = at(n + 1).outro;
      expect(b.win[0].text).not.toBe(a.win[0].text);
      expect(b.winWithMisses?.[0].text).not.toBe(a.winWithMisses?.[0].text);
      expect(b.winWithOneMiss?.[0].text).not.toBe(a.winWithOneMiss?.[0].text);
    }
    const drill = (k: number) => buildShift(HELP_DESK_BANK, planDrill(HELP_DESK_BANK, "guard-data", { playerId: "rot", k, today: TODAY }), SHIFT_TEXT, OPTS);
    expect(drill(1).outro.drillWin?.[0].text).not.toBe(drill(0).outro.drillWin?.[0].text);
    expect(at(0).outro.drillWin).toBeUndefined();
  });

  it("adds Policy: Callback only when there is a credential plan", () => {
    const withCred = planDaily(HELP_DESK_BANK, progress(), { playerId: "cred", today: TODAY });
    const tickets = HELP_DESK_BANK.filter((t) => !t.steps.some((s) => s.category === "credential"));
    const noCred: ShiftSpec = { ...withCred, ticketIds: tickets.slice(0, 2).map((t) => t.id), stepIds: interleave(tickets.slice(0, 2)).map((s) => s.id) };
    expect(buildShift(HELP_DESK_BANK, noCred, SHIFT_TEXT, OPTS).starterDeck).not.toContain("policy-callback");
  });

  it("resumes: a saved battle rebuilt from progress.shift passes canResume", () => {
    let s = createBattle(enc, spec.seed);
    s = endTurn(s, enc);
    const saved = JSON.parse(JSON.stringify(s)) as typeof s;
    const again = encounterFor(saved.encounterId, { shift: JSON.parse(JSON.stringify(spec)) as ShiftSpec });
    expect(again.id).toBe(spec.id);
    expect(canResume(saved, again)).toBe(true);
    expect(encounterFor(spec.id, { shift: spec })).toBe(shiftEncounter(spec));
  });

  it("drops a spec from an older bank or with a missing step (falls back, so the battle starts fresh)", () => {
    expect(specProblem(HELP_DESK_BANK, spec)).toBeNull();
    const old = { ...spec, bankVersion: "b-old" };
    expect(specProblem(HELP_DESK_BANK, old)).not.toBeNull();
    const gone = { ...spec, stepIds: [...spec.stepIds.slice(1), "z-gone-1"] };
    expect(specProblem(HELP_DESK_BANK, gone)).not.toBeNull();
    const s = createBattle(enc, spec.seed);
    const fallback = encounterFor(spec.id, { shift: old });
    expect(fallback.id).not.toBe(spec.id);
    expect(canResume(s, fallback)).toBe(false);
  });
});

describe("planDrill", () => {
  const kinds = (skill: MasterySkillId, steps: AgentStep[]) =>
    steps.map((s) =>
      skill === "approve-checked"
        ? s.twist === "scary-safe" && s.safe
          ? "safe"
          : s.twist === "routine-risky" && !s.safe
            ? "risky"
            : null
        : s.skill === skill
          ? s.safe
            ? "safe"
            : "risky"
          : null,
    );

  it("is deterministic by player, skill and drill count", () => {
    const a = planDrill(HELP_DESK_BANK, "guard-data", { playerId: "p", k: 2, today: TODAY });
    expect(planDrill(HELP_DESK_BANK, "guard-data", { playerId: "p", k: 2, today: TODAY })).toEqual(a);
    expect(a.id).toBe("hd-drill-guard-data-2");
    expect(a.focus).toEqual(["guard-data"]);
  });

  for (const skill of MASTERY_SKILLS) {
    it(`${skill}: 2-3 whole tickets, 4-7 plans, 2+ safe and 2+ risky plans of the skill`, () => {
      for (let k = 0; k < 30; k++) {
        const spec = planDrill(HELP_DESK_BANK, skill, { playerId: `d-${k}`, k, today: TODAY });
        expectIntact(spec);
        expect(spec.ticketIds.length).toBeGreaterThanOrEqual(2);
        expect(spec.ticketIds.length).toBeLessThanOrEqual(3);
        expect(spec.stepIds.length).toBeGreaterThanOrEqual(4);
        expect(spec.stepIds.length).toBeLessThanOrEqual(7);
        const k2 = kinds(skill, stepsOf(spec));
        expect(k2.filter((x) => x === "safe").length).toBeGreaterThanOrEqual(2);
        expect(k2.filter((x) => x === "risky").length).toBeGreaterThanOrEqual(2);
      }
    });
  }

  it("scaffold fades: contrast at Learning, spacing from Practicing on (when the tickets allow)", () => {
    const contrastOk = (skill: MasterySkillId, steps: AgentStep[]) => {
      const k = kinds(skill, steps);
      return k.every((x, i) => x !== "risky" || k[i - 1] === "safe" || k[i + 1] === "safe");
    };
    const spacedOk = (skill: MasterySkillId, steps: AgentStep[]) => {
      const k = kinds(skill, steps);
      return k.every((x, i) => !x || !k[i + 1] || k[i + 1] === x);
    };
    let learning = 0;
    let practicing = 0;
    let total = 0;
    for (const skill of LENS_SKILLS) {
      for (let k = 0; k < 20; k++) {
        total++;
        const at = (level: SkillRecord["level"]) =>
          planDrill(HELP_DESK_BANK, skill, {
            playerId: "s",
            k,
            today: TODAY,
            progress: progress({ skills: { [skill]: { recent: "Rr", n: 2, level, days: [TODAY], last: TODAY, solidOn: null } } }),
          });
        if (contrastOk(skill, stepsOf(at(1)))) learning++;
        if (spacedOk(skill, stepsOf(at(2)))) practicing++;
      }
    }
    expect(learning / total).toBeGreaterThanOrEqual(0.9);
    expect(practicing / total).toBeGreaterThanOrEqual(0.6);
  });

  it("prefers tickets not played in the last 7 days", () => {
    const first = planDrill(HELP_DESK_BANK, "check-approval", { playerId: "r", k: 0, today: TODAY });
    const scored = Object.fromEntries(first.stepIds.map((id) => [id, addDays(TODAY, -1)]));
    const next = planDrill(HELP_DESK_BANK, "check-approval", { playerId: "r", k: 0, today: TODAY, progress: progress({ scored }) });
    const overlap = next.ticketIds.filter((id) => first.ticketIds.includes(id)).length;
    expect(overlap).toBeLessThan(first.ticketIds.length);
  });

  it("builds a one-plan-at-a-time drill with Inspect, Block and Escalate always in hand", () => {
    const spec = planDrill(HELP_DESK_BANK, "verify-identity", { playerId: "b", k: 1, today: TODAY });
    const enc = buildShift(HELP_DESK_BANK, spec, SHIFT_TEXT, OPTS);
    expect(enc.mode).toBe("drill");
    expect(enc.id).toBe("hd-drill-verify-identity-1");
    expect(enc.title).toBe("Drill: Check who's asking");
    expect(enc.actionsPerTurn).toEqual([1]);
    expect(enc.maxTurns).toBe(spec.stepIds.length + 3);
    expect(enc.handSize).toBe(3);
    expect(enc.energyPerTurn).toBe(3);
    expect([...enc.starterDeck].sort()).toEqual(["block", "escalate", "inspect"]);
    expect(enc.maxRisk).toBe(enc.steps.filter((s) => !s.safe).reduce((n, s) => n + s.risk, 0) + 1);
    let s = createBattle(enc, spec.seed);
    for (let turn = 0; s.status === "playing" && turn < 3; turn++) {
      expect(s.hand.map((c) => c.cardId).sort()).toEqual(["block", "escalate", "inspect"]);
      s = endTurn(s, enc);
    }
  });
});
