/**
 * Generated shifts and balance for every pathway (describe.each over TEST_PATHWAYS). The Help Desk
 * also has its detailed suites in lib/game/shiftGen.test.ts and balance.test.ts.
 */
import { describe, expect, it } from "vitest";
import { CARDS } from "@/lib/game/cards";
import { createBattle, endTurn, playCard, policyCardOf, scoreBattle } from "@/lib/game/engine";
import { MASTERY_SKILLS } from "@/lib/game/skills";
import { checkDaily } from "@/lib/game/shiftGen";
import type { BattleState, CardId, Encounter, PathwayProgress } from "@/lib/game/types";
import { EXPECT, TEST_PATHWAYS } from "./testing";

const TODAY = "2026-09-25";
const SEEDS = 150;
const fresh = (over: Partial<PathwayProgress> = {}): PathwayProgress => ({
  introSeen: true,
  hub: null,
  battle: null,
  pendingResult: null,
  best: null,
  attempts: 1,
  wins: 1,
  history: [],
  ...over,
});

function play(s: BattleState, enc: Encounter, id: CardId, target?: string): BattleState | null {
  const card = s.hand.find((c) => c.cardId === id);
  if (!card) return null;
  const r = playCard(s, enc, card.uid, target);
  return r.ok ? r.state : null;
}

type Bot = (s: BattleState, enc: Encounter) => BattleState;

function run(enc: Encounter, seed: number, bot: Bot): BattleState {
  let s = createBattle(enc, seed);
  for (let i = 0; i < 40 && s.status === "playing"; i++) {
    s = bot(s, enc);
    if (s.status === "playing") s = endTurn(s, enc);
  }
  return s;
}

/** Plays the policy card, inspects what it can, blocks what shows a red flag, escalates what it can't see. */
const careful: Bot = (start, enc) => {
  let s = start;
  const policy = policyCardOf(enc);
  if (policy) s = play(s, enc, policy) ?? s;
  for (const id of s.announced.slice()) if (!s.steps[id].inspected) s = play(s, enc, "inspect", id) ?? s;
  for (const id of s.announced.slice()) {
    const step = enc.steps.find((x) => x.id === id)!;
    if (s.steps[id].inspected ? step.evidence.some((e) => e.redFlag) : false) s = play(s, enc, "block", id) ?? play(s, enc, "escalate", id) ?? s;
    else if (!s.steps[id].inspected) s = play(s, enc, "escalate", id) ?? s;
  }
  return s;
};

const SCARY = /isolate|disable|wipe|deny|purge|quarantine|uninstall/i;
/** Blocks plans whose intent sounds scary, without looking. */
const scaryVerb: Bot = (start, enc) => {
  let s = start;
  for (const id of s.announced.slice()) if (SCARY.test(enc.steps.find((x) => x.id === id)!.intent)) s = play(s, enc, "block", id) ?? s;
  return s;
};
/** Blocks every Close / Mute, without looking. */
const closeBot: Bot = (start, enc) => {
  let s = start;
  for (const id of s.announced.slice()) if (/^(Close|Mute)\b/.test(enc.steps.find((x) => x.id === id)!.intent)) s = play(s, enc, "block", id) ?? s;
  return s;
};

describe.each(TEST_PATHWAYS.map((p) => [p.id, p] as const))("%s generated shifts and balance", (_id, P) => {
  const E = EXPECT[P.id];
  const policy = E.policyCard;
  const covers = CARDS[policy].autoInspect ?? [];

  it("plans valid dailies with the pathway's ids, agent, coach and policy card", () => {
    let dailies = 0;
    for (let p = 0; p < 30; p++) {
      for (let n = 0; n < 4; n++) {
        const spec = P.planDaily(fresh({ dailyCount: n }), { playerId: `pw-${p}`, today: TODAY });
        expect(spec.id).toBe(`${E.idPrefix}-daily-${n}`);
        expect(P.shiftUsable(spec)).toBe(true);
        const tickets = spec.ticketIds.map((id) => P.bank.find((t) => t.id === id)!);
        expect(checkDaily(tickets).ok, spec.ticketIds.join(",")).toBe(true);
        const enc = P.shiftEncounter(spec);
        expect(enc.pathwayId).toBe(P.id);
        expect(enc.agent).toEqual(P.agent);
        expect(enc.coach?.name).toBe(E.coachName);
        expect(enc.setting).toMatch(/Fenwick IT Solutions/);
        expect(enc.setting).toContain(P.agent.name.split(" ")[0]);
        const deckPolicies = [...new Set(enc.starterDeck.filter((c) => CARDS[c].autoInspect))];
        const needs = enc.steps.some((s) => covers.includes(s.category));
        expect(deckPolicies).toEqual(needs ? [policy] : []);
        expect(enc.debrief.takeaway).toBe(P.skill(spec.focus[0] ?? "approve-checked").oneLiner);
        dailies++;
      }
    }
    expect(dailies).toBe(120);
  });

  it("plans drills with the pathway's ids and no policy card", () => {
    for (const skill of MASTERY_SKILLS) {
      const spec = P.planDrill(fresh(), skill, { playerId: "d", today: TODAY, k: 0 });
      expect(spec.id).toBe(`${E.idPrefix}-drill-${skill}-0`);
      const enc = P.shiftEncounter(spec);
      expect(enc.mode).toBe("drill");
      expect(enc.agent).toEqual(P.agent);
      expect(enc.starterDeck.some((c) => CARDS[c].autoInspect)).toBe(false);
    }
  });

  it("the careful player (using the pathway's policy card) wins the story on >= 80% of seeds", () => {
    let wins = 0;
    for (let seed = 1; seed <= SEEDS; seed++) if (run(P.story, seed, careful).status === "won") wins++;
    expect(wins / SEEDS).toBeGreaterThanOrEqual(0.8);
  });

  it("guessing from the wording never earns 3 stars on the story (SOC bots)", () => {
    if (!E.socBots) return;
    for (const bot of [scaryVerb, closeBot]) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const s = run(P.story, seed, bot);
        expect(scoreBattle(s, P.story).stars).toBeLessThan(3);
      }
    }
  });

  it("guessing from the wording never passes a daily cleanly (SOC bots)", () => {
    if (!E.socBots) return;
    for (let p = 0; p < 20; p++) {
      const spec = P.planDaily(fresh({ dailyCount: p % 3 }), { playerId: `soc-${p}`, today: TODAY });
      const enc = P.shiftEncounter(spec);
      for (const bot of [scaryVerb, closeBot]) expect(scoreBattle(run(enc, spec.seed, bot), enc).stars).toBeLessThan(3);
    }
  });
});
