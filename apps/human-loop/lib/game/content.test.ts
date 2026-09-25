/**
 * Content checks for every pathway (describe.each over TEST_PATHWAYS): the fixed shifts, a few
 * generated shifts, the hub, pathway.json and skills.json. Per-pathway rules come from EXPECT
 * (lib/pathways/testing.ts).
 */
import { describe, expect, it } from "vitest";
import { EXPECT, TEST_PATHWAYS } from "@/lib/pathways/testing";
import type { PathwayBundle } from "@/lib/pathways/types";
import { SPRITES } from "./assets";
import { CARDS } from "./cards";
import { deckAtTurn, policyCardOf } from "./engine";
import { HUB_ICON_NAMES } from "./hub";
import { MASTERY_SKILLS, isSkillId } from "./skills";
import type { CardId, DialogueLine, Encounter, HeadlineKey, PathwayProgress } from "./types";

/** UI space limits (characters). */
const LIMITS = {
  intent: 48,
  quip: 110,
  evidenceLabel: 28,
  evidenceDetail: 140,
  outcome: 160,
  lesson: 160,
  tell: 80,
  dialogue: 160,
  debrief: 240,
  hubLabel: 40,
  hubDescription: 60,
  headline: 70,
  copy: 40,
  coachScript: 80,
  oneLiner: 100,
  whereToLook: 110,
  example: 120,
  questionHint: 80,
};

const SPEAKERS: DialogueLine["speaker"][] = ["coach", "agent", "narrator"];
const HEADLINE_KEYS: HeadlineKey[] = ["perfect", "sharp", "lucky", "jumpy", "leaky", "scraped", "breach", "timeout", "playing"];
/** Card and button words a plan's intent must not use (cybersecurity rule). */
export const CARD_WORD_RE = /\b(block|escalate|approve|inspect|roll ?back|undo)\b/i;
const ALLOWED_IP_RE = /^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d{1,3}$|^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export function allText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allText);
  if (value && typeof value === "object") return Object.values(value).flatMap(allText);
  return [];
}

function expectLines(lines: DialogueLine[], where: string) {
  for (const line of lines) {
    expect(SPEAKERS, where).toContain(line.speaker);
    expect(line.text.trim().length, where).toBeGreaterThan(0);
    expect(line.text.length, `${where}: "${line.text}"`).toBeLessThanOrEqual(LIMITS.dialogue);
  }
}

const EMPTY_PROGRESS: PathwayProgress = { introSeen: true, hub: null, battle: null, pendingResult: null, best: null, attempts: 1, wins: 1, history: [] };

/** A few generated shifts (Daily practice and one drill per skill). */
function generated(p: PathwayBundle): Encounter[] {
  return [
    ...[0, 1, 2].map((i) => p.shiftEncounter(p.planDaily({ ...EMPTY_PROGRESS, dailyCount: i }, { playerId: `c-${i}`, today: "2026-09-25" }))),
    ...MASTERY_SKILLS.map((skill) => p.shiftEncounter(p.planDrill(EMPTY_PROGRESS, skill, { playerId: "c", k: 0, today: "2026-09-25" }))),
  ];
}

describe.each(TEST_PATHWAYS.map((p) => [p.id, p] as const))("%s content", (_id, P) => {
  const E = EXPECT[P.id];

  /** Checks every encounter's steps and copy must pass (fixed and generated). */
  describe.each([...P.encounters, ...generated(P)].map((e) => [e.id, e] as const))("%s: shared checks", (_eid, enc) => {
    it("has well-formed steps", () => {
      for (const s of enc.steps) {
        const where = `step ${s.id}`;
        expect(E.categories, where).toContain(s.category);
        expect(s.ticket, `${where}: ticket reads "#12345 · Company"`).toMatch(/^#\d{5} · (.+)$/);
        expect(E.companies, where).toContain(s.ticket.replace(/^#\d{5} · /, ""));
        expect(s.intent.length, `${where} intent`).toBeLessThanOrEqual(LIMITS.intent);
        expect(s.quip.length, `${where} quip`).toBeLessThanOrEqual(LIMITS.quip);
        expect(s.lesson.length, `${where} lesson`).toBeLessThanOrEqual(LIMITS.lesson);
        expect(s.intent.trim() && s.quip.trim() && s.lesson.trim(), where).toBeTruthy();
        if (E.cardWordIntent) expect(s.intent, `${where}: no card words in the intent`).not.toMatch(CARD_WORD_RE);

        expect(s.evidence.length, `${where} evidence`).toBeGreaterThanOrEqual(2);
        expect(s.evidence.length, `${where} evidence`).toBeLessThanOrEqual(4);
        for (const e of s.evidence) {
          expect(e.label.trim(), where).not.toBe("");
          expect(e.detail.trim(), where).not.toBe("");
          expect(e.label.length, `${where} label "${e.label}"`).toBeLessThanOrEqual(LIMITS.evidenceLabel);
          expect(e.detail.length, `${where} detail "${e.detail}"`).toBeLessThanOrEqual(LIMITS.evidenceDetail);
        }

        for (const key of ["executed", "blocked", "escalated"] as const) {
          expect(s.outcome[key].trim(), `${where} outcome.${key}`).not.toBe("");
          expect(s.outcome[key].length, `${where} outcome.${key}`).toBeLessThanOrEqual(LIMITS.outcome);
        }
        // Reversible steps can be rolled back, so they need a rollback story; irreversible ones can't.
        if (s.reversible) {
          expect(s.outcome.rolledBack?.trim(), `${where} outcome.rolledBack`).toBeTruthy();
          expect(s.outcome.rolledBack!.length, `${where} outcome.rolledBack`).toBeLessThanOrEqual(LIMITS.outcome);
        } else {
          expect(s.outcome.rolledBack, `${where} outcome.rolledBack`).toBeUndefined();
        }

        // Every plan (fixed or bank) tests one lens skill and has a tell for the result screen.
        expect(isSkillId(s.skill), `${where} skill`).toBe(true);
        expect(s.tell?.trim(), `${where} tell`).toBeTruthy();
        expect(s.tell!.length, `${where} tell`).toBeLessThanOrEqual(LIMITS.tell);
        expect(s.tell, `${where} tell`).not.toBe(s.lesson);
        if (s.twist) expect(s.twist, `${where} twist`).toBe(s.safe ? "scary-safe" : "routine-risky");
        if (s.safe) expect(s.direction, `${where}: safe plans have no direction`).toBeUndefined();
        else if (E.requireDirection) expect(["over", "under"], `${where} direction`).toContain(s.direction);

        expect(s.progress, where).toBeGreaterThanOrEqual(0);
        expect(s.risk, where).toBeGreaterThanOrEqual(0);
        if (s.safe) {
          expect(s.progress, `${where}: safe steps give progress`).toBeGreaterThan(0);
          expect(s.risk, `${where}: safe steps carry no risk`).toBe(0);
        } else {
          expect(s.risk, `${where}: unsafe steps carry risk`).toBeGreaterThan(0);
          expect(s.progress, `${where}: unsafe steps give no progress`).toBe(0);
        }
      }
    });

    it("keeps red flags truthful and ordered least-to-most telling", () => {
      for (const s of enc.steps) {
        const flags = s.evidence.map((e) => e.redFlag);
        if (s.safe) {
          expect(flags.some(Boolean), `${s.id}: a safe step has no red flags`).toBe(false);
        } else {
          expect(flags.some(Boolean), `${s.id}: an unsafe step needs a red flag`).toBe(true);
          expect(flags[0], `${s.id}: first evidence should not give it away`).toBe(false);
          expect(flags.at(-1), `${s.id}: last evidence should be the most telling`).toBe(true);
          // Once evidence turns red, it stays red.
          expect(flags.indexOf(true)).toBe(flags.length - flags.filter(Boolean).length);
        }
      }
    });

    it("has intro, outro and debrief lines within limits", () => {
      expect(enc.intro.length).toBeGreaterThan(0);
      expectLines(enc.intro, "intro");
      for (const key of ["win", "breach", "timeout"] as const) {
        expect(enc.outro[key].length, `outro.${key}`).toBeGreaterThan(0);
        expectLines(enc.outro[key], `outro.${key}`);
      }
      for (const key of ["winWithMisses", "winWithOneMiss", "drillWin"] as const) {
        if (enc.outro[key]) expectLines(enc.outro[key]!, `outro.${key}`);
      }
      const speakers = new Set(enc.intro.map((l) => l.speaker));
      expect(speakers.has("coach") && speakers.has("agent")).toBe(true);
      for (const key of ["skillTag", "takeaway", "careerInsight"] as const) {
        expect(enc.debrief[key].trim(), key).not.toBe("");
        expect(enc.debrief[key].length, key).toBeLessThanOrEqual(LIMITS.debrief);
      }
    });

    it("uses fictional companies, makes no unverified claims, and says Approve (not proceed)", () => {
      const text = allText(enc).join("\n");
      for (const re of E.banned) expect(text, `banned phrase ${re}`).not.toMatch(re);
      expect(text).toMatch(/Fenwick IT Solutions/);
      expect(text).not.toMatch(E.letItRe);
      if (E.ipRule) for (const ip of text.match(/\b\d{1,3}(\.\d{1,3}){3}\b/g) ?? []) expect(ip, `IP ${ip}`).toMatch(ALLOWED_IP_RE);
    });

    it("has the pathway's agent and coach, a sprite that exists and only known cards", () => {
      expect(enc.pathwayId).toBe(P.id);
      expect(enc.agent).toEqual(P.agent);
      expect(enc.agent.name).toBe(E.agentName);
      expect(enc.coach?.name).toBe(E.coachName);
      expect(Object.keys(SPRITES)).toContain(enc.agent.spriteKey);
      for (const id of deckAtTurn(enc, enc.maxTurns)) expect(Object.keys(CARDS)).toContain(id);
      const policy = policyCardOf(enc);
      if (policy) expect(policy, "the pathway's own policy card").toBe(E.policyCard);
    });
  });

  describe("encounter registry", () => {
    it("finds each encounter by id and falls back to the story shift", () => {
      expect(P.practice.id).toBe(E.practiceId);
      expect(P.story.id).toBe(E.storyId);
      expect(P.encounter(E.practiceId)).toBe(P.practice);
      expect(P.encounter(E.storyId)).toBe(P.story);
      expect(P.encounter("nope")).toBe(P.story);
      expect(P.encounter(null)).toBe(P.story);
      expect(P.meta.storyTitle).toBe(P.story.title);
      expect(P.meta.practiceId).toBe(P.practice.id);
      expect(P.meta.idPrefix).toBe(E.idPrefix);
      expect(P.meta.agentName).toBe(P.agent.name);
      expect(P.meta.agentSprite).toBe(P.agent.spriteKey);
    });

    it("encounterFor finds a generated shift through progress.shift, else the fixed shift", () => {
      const spec = P.planDaily(EMPTY_PROGRESS, { playerId: "reg", today: "2026-09-25" });
      expect(spec.id).toBe(`${E.idPrefix}-daily-0`);
      expect(P.encounterFor(spec.id, { shift: spec }).id).toBe(spec.id);
      expect(P.encounterFor(spec.id, { shift: null })).toBe(P.story);
      expect(P.encounterFor(E.practiceId, { shift: spec })).toBe(P.practice);
      expect(P.encounterFor(E.storyId)).toBe(P.story);
    });

    it("marks each fixed shift's mode, and practice's two coached steps", () => {
      expect(P.practice.mode).toBe("practice");
      expect(P.practice.guidedSteps).toBe(2);
      expect(P.story.mode).toBe("story");
      expect(P.story.guidedSteps ?? 0).toBe(0);
    });

    it("prefixes every fixed step id", () => {
      if (!E.fixedStepPrefix) return;
      for (const enc of P.encounters) for (const s of enc.steps) expect(s.id.startsWith(E.fixedStepPrefix), s.id).toBe(true);
    });
  });

  describe("the story shift", () => {
    const enc = P.story;

    it("has the basics filled in", () => {
      expect(enc.title.trim()).not.toBe("");
      expect(enc.subtitle.trim()).not.toBe("");
      expect(enc.setting.trim()).not.toBe("");
      expect(enc.agent.role.trim()).not.toBe("");
      expect(enc.agent.personality.trim()).not.toBe("");
    });

    it("has sane numbers", () => {
      expect(enc.maxRisk).toBeGreaterThan(0);
      expect(enc.maxTurns).toBeGreaterThan(0);
      expect(enc.energyPerTurn).toBeGreaterThan(0);
      expect(enc.handSize).toBeGreaterThan(0);
      expect(enc.actionsPerTurn.length).toBeGreaterThan(0);
      for (const n of enc.actionsPerTurn) expect(Number.isInteger(n) && n >= 1 && n <= 3).toBe(true);
      // Enough announce slots for every step, with some slack for mistakes.
      let slots = 0;
      for (let t = 1; t <= enc.maxTurns; t++) slots += enc.actionsPerTurn[Math.min(t - 1, enc.actionsPerTurn.length - 1)];
      expect(slots).toBeGreaterThan(enc.steps.length);
    });

    it("has 8-10 steps with unique ids, about 55-65% safe", () => {
      expect(enc.steps.length).toBeGreaterThanOrEqual(8);
      expect(enc.steps.length).toBeLessThanOrEqual(10);
      const ids = enc.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      const safeShare = enc.steps.filter((s) => s.safe).length / enc.steps.length;
      expect(safeShare).toBeGreaterThanOrEqual(0.55);
      expect(safeShare).toBeLessThanOrEqual(0.65);
    });

    it("spreads steps across 3-4 tickets", () => {
      const tickets = new Set(enc.steps.map((s) => s.ticket));
      expect(tickets.size).toBeGreaterThanOrEqual(3);
      expect(tickets.size).toBeLessThanOrEqual(4);
    });

    it("includes the rollback lesson: at least one unsafe step is irreversible, and most are reversible", () => {
      const unsafe = enc.steps.filter((s) => !s.safe);
      expect(unsafe.some((s) => !s.reversible)).toBe(true);
      expect(unsafe.some((s) => s.reversible)).toBe(true);
    });

    it("has plans the policy card inspects, so it matters", () => {
      const covers = CARDS[E.policyCard].autoInspect ?? [];
      expect(covers.length).toBeGreaterThan(0);
      expect(enc.steps.filter((s) => covers.includes(s.category)).length).toBeGreaterThanOrEqual(E.policyMinStory);
    });

    it("has a starter deck of only Inspect and Block, and unlocks the rest one turn at a time", () => {
      for (const id of enc.starterDeck) expect(["inspect", "block"]).toContain(id);
      const count = (deck: CardId[], id: CardId) => deck.filter((c) => c === id).length;
      expect(count(enc.starterDeck, "inspect")).toBeGreaterThanOrEqual(3);
      expect(count(enc.starterDeck, "block")).toBeGreaterThanOrEqual(2);

      const unlocks = enc.unlocks ?? [];
      expect(unlocks.length).toBeGreaterThan(0);
      const turns = unlocks.map((u) => u.turn);
      for (let i = 0; i < turns.length; i++) {
        expect(turns[i]).toBeGreaterThanOrEqual(2);
        expect(turns[i]).toBeLessThanOrEqual(enc.maxTurns);
        if (i > 0) expect(turns[i], "unlock turns rise").toBeGreaterThan(turns[i - 1]);
      }
      // One new card per turn, so each gets its own tip.
      for (const u of unlocks) expect(u.cards).toHaveLength(1);
      // The policy card comes first, on turn 2.
      expect(unlocks.find((u) => u.cards.includes(E.policyCard))?.turn).toBe(2);

      const deck = deckAtTurn(enc, enc.maxTurns);
      expect(deck.length).toBeGreaterThanOrEqual(10);
      expect(deck.length).toBeLessThanOrEqual(12);
      expect(count(deck, "escalate")).toBeGreaterThanOrEqual(1);
      expect(count(deck, "rollback")).toBe(1);
      expect(count(deck, E.policyCard)).toBe(1);
      expect(policyCardOf(enc)).toBe(E.policyCard);
      expect(new Set(deck.filter((id) => CARDS[id].autoInspect)).size, "exactly one policy card").toBe(1);
      expect(count(deck, "coffee")).toBe(1);
      // Hand: at most handSize + one unlock, and at most 6 stacks (one per card type).
      expect(enc.handSize + Math.max(...unlocks.map((u) => u.cards.length))).toBeLessThanOrEqual(6);
    });
  });

  describe("the practice shift", () => {
    const enc = P.practice;
    const cost = (ids: CardId[]) => ids.reduce((n, id) => n + CARDS[id].cost, 0);

    it("is a practice shift with the same agent", () => {
      expect(enc.practice).toBe(true);
      expect(enc.agent).toEqual(P.story.agent);
      expect(P.story.practice).toBeFalsy();
    });

    it("shows one plan at a time with exactly Inspect and Block, both always affordable", () => {
      expect(enc.steps).toHaveLength(4);
      expect(new Set(enc.steps.map((s) => s.id)).size).toBe(4);
      for (const n of enc.actionsPerTurn) expect(n).toBe(1);
      expect(enc.starterDeck).toEqual(["inspect", "block"]);
      expect(enc.unlocks ?? []).toEqual([]);
      expect(enc.handSize).toBeGreaterThanOrEqual(2);
      expect(enc.energyPerTurn).toBeGreaterThanOrEqual(cost(enc.starterDeck));
    });

    it("can never end in a breach, and has spare turns for a mistake", () => {
      const unsafeRisk = enc.steps.filter((s) => !s.safe).reduce((n, s) => n + s.risk, 0);
      expect(unsafeRisk).toBeLessThan(enc.maxRisk);
      expect(enc.maxTurns).toBeGreaterThanOrEqual(enc.steps.length + 2);
    });

    it("teaches in order: a safe plan, then a risky one, then one of each for the player to judge", () => {
      expect(enc.steps[0].safe).toBe(true);
      expect(enc.steps[1].safe).toBe(false);
      const rest = enc.steps.slice(2);
      expect(rest.filter((s) => s.safe).length).toBeGreaterThanOrEqual(1);
      expect(rest.filter((s) => !s.safe).length).toBeGreaterThanOrEqual(1);
    });

    it("is set at Fenwick IT Solutions, before the story shift", () => {
      expect(allText(enc).join(" ")).toMatch(/Fenwick IT Solutions/);
      expect(enc.title).not.toBe(P.story.title);
    });

    it("scripts the coach's first two evidence sheets", () => {
      if (E.requireCoachScript) expect(enc.coachScript).toBeTruthy();
      if (!enc.coachScript) return;
      const { firstSafeSheet, firstRiskySheet } = enc.coachScript;
      expect(firstSafeSheet.length).toBeLessThanOrEqual(LIMITS.coachScript);
      expect(firstRiskySheet.length).toBeLessThanOrEqual(LIMITS.coachScript);
      expect(firstSafeSheet).toContain("**Looks OK**");
      expect(firstRiskySheet).toContain("**Block**");
      expect(P.story.coachScript, "practice only").toBeUndefined();
    });
  });

  describe("hub.json", () => {
    const hub = P.hub;

    it("names the office", () => {
      expect(hub.officeName.trim()).not.toBe("");
      expect(hub.officeName).toMatch(/^Fenwick IT Solutions · /);
    });

    it("has exactly the pathway's hub targets, in order, with the right actions", () => {
      expect(Object.keys(hub.targets)).toEqual([E.hub.battle, E.hub.talk, ...E.hub.looks]);
      expect(hub.targets[E.hub.battle].action).toBe("battle");
      expect(hub.targets[E.hub.talk].action).toBe("talk");
      for (const id of E.hub.looks) expect(hub.targets[id].action, id).toBe("look");
      const links = Object.keys(hub.targets).filter((id) => hub.targets[id].skillsLink);
      expect(links).toEqual([E.skillsLink]);
      expect(hub.targets[E.skillsLink].action).toBe("look");
      for (const [id, t] of Object.entries(hub.targets)) expect(HUB_ICON_NAMES as readonly string[], id).toContain(t.icon);
    });

    it("has labels, descriptions and lines within limits", () => {
      for (const [id, t] of Object.entries(hub.targets)) {
        expect(t.label.trim(), id).not.toBe("");
        expect(t.label.length, id).toBeLessThanOrEqual(LIMITS.hubLabel);
        expect(t.description.trim(), id).not.toBe("");
        expect(t.description.length, id).toBeLessThanOrEqual(LIMITS.hubDescription);
        expect(t.lines.length, id).toBeGreaterThan(0);
        expectLines(t.lines, `hub.${id}`);
        if (t.returningLines) expectLines(t.returningLines, `hub.${id}.returning`);
      }
      // Returning players don't get the first-day welcome from the agent and the coach.
      expect(hub.targets[E.hub.battle].returningLines?.length).toBeGreaterThan(0);
      expect(hub.targets[E.hub.talk].returningLines?.map((l) => l.text).join(" ")).toMatch(/Your skills/);
    });

    it("teaches the basics", () => {
      const coach = hub.targets[E.hub.talk].lines.map((l) => l.text).join(" ");
      for (const word of ["Inspect", "Block", "Escalate", "Approve", "human in the loop"]) expect(coach).toContain(word);
      expect(allText(hub).join(" ")).not.toMatch(/proceed|let it run/i);
      const board = hub.targets[E.skillsLink].lines.map((l) => l.text).join(" ");
      for (const q of ["Who asked?", "Does it match the record?", "Can we undo it?", E.hub.boardCode]) expect(board).toContain(q);
    });

    it("makes no unverified claims", () => {
      const text = allText(hub).join("\n");
      for (const re of E.banned) expect(text, `banned phrase ${re}`).not.toMatch(re);
    });
  });

  describe("pathway.json", () => {
    const c = P.config;

    it("matches the registry", () => {
      expect(c.id).toBe(P.id);
      expect(c.coach.name).toBe(E.coachName);
      expect(c.coach.role.trim()).not.toBe("");
      expect(Object.keys(SPRITES)).toContain(c.coach.spriteKey);
      expect(c.categories).toEqual(E.categories);
      expect(c.companies).toEqual(E.companies);
      expect(c.policyCard).toBe(E.policyCard);
      expect(CARDS[c.policyCard].autoInspect?.length).toBeGreaterThan(0);
    });

    it("keeps the copy short", () => {
      const { resultHeading, ...rest } = c.copy;
      for (const [k, v] of Object.entries({ ...rest, won: resultHeading.won, lost: resultHeading.lost })) {
        expect(v.trim(), k).not.toBe("");
        expect(v.length, k).toBeLessThanOrEqual(LIMITS.copy);
      }
    });

    it("rewords only known cards, never their mechanics", () => {
      for (const [id, over] of Object.entries(c.cards ?? {})) {
        expect(Object.keys(CARDS), id).toContain(id);
        for (const key of Object.keys(over ?? {})) expect(["name", "text", "short", "flavor"], `${id}.${key}`).toContain(key);
      }
    });

    it("has headline pools within limits", () => {
      if (E.requireHeadlines) expect(Object.keys(c.headlines ?? {}).sort()).toEqual([...HEADLINE_KEYS].sort());
      for (const [k, lines] of Object.entries(c.headlines ?? {})) {
        expect(HEADLINE_KEYS, k).toContain(k);
        expect(lines.length, k).toBeGreaterThan(0);
        for (const l of lines) {
          expect(l.length, l).toBeLessThanOrEqual(LIMITS.headline);
          expect(l.replace(/\{agent\}/g, ""), `only {agent} may be a placeholder: ${l}`).not.toMatch(/[{}]/);
        }
      }
    });
  });

  describe("skills.json", () => {
    const s = P.skills;

    it("has copy for all 7 skills within limits", () => {
      expect(Object.keys(s.skills).sort()).toEqual([...MASTERY_SKILLS].sort());
      for (const id of MASTERY_SKILLS) {
        const copy = s.skills[id];
        expect(copy.oneLiner.length, id).toBeLessThanOrEqual(LIMITS.oneLiner);
        expect(copy.whereToLook.length, id).toBeLessThanOrEqual(LIMITS.whereToLook);
        if (E.requireExample) expect(copy.example?.trim(), `${id} example`).toBeTruthy();
        if (copy.example) expect(copy.example.length, id).toBeLessThanOrEqual(LIMITS.example);
        expect(P.skill(id).name.trim()).not.toBe("");
      }
    });

    it("has question hints when required", () => {
      if (E.requireQuestionHints) expect(Object.keys(s.questionHints ?? {}).sort()).toEqual(["record", "undo", "who"]);
      for (const hint of Object.values(s.questionHints ?? {})) expect(hint!.length).toBeLessThanOrEqual(LIMITS.questionHint);
    });

    it("names only evidence labels that exist on plans of that skill", () => {
      const steps = [...P.encounters.flatMap((e) => e.steps), ...P.bank.flatMap((t) => t.steps)];
      for (const id of MASTERY_SKILLS) {
        for (const label of s.skills[id].lookFor ?? []) {
          const found = steps.some((st) => st.skill === id && st.evidence.some((e) => e.label === label));
          expect(found, `${id}: "${label}" is on a ${id} plan`).toBe(true);
        }
      }
    });

    it("makes no unverified claims", () => {
      const text = allText([s, P.config]).join("\n");
      for (const re of E.banned) expect(text, `banned phrase ${re}`).not.toMatch(re);
    });
  });
});
