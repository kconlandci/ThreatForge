import { describe, expect, it } from "vitest";
import { SPRITES } from "./assets";
import { CARDS } from "./cards";
import { HELP_DESK_ENCOUNTER, HELP_DESK_ENCOUNTERS, HELP_DESK_HUB, HELP_DESK_PRACTICE, helpDeskEncounter } from "./content";
import { deckAtTurn } from "./engine";
import { HUB_TARGET_IDS } from "./hub";
import type { CardId, DialogueLine, Encounter, StepCategory } from "./types";

/** UI space limits (characters). */
const LIMITS = {
  intent: 48,
  quip: 110,
  evidenceLabel: 28,
  evidenceDetail: 140,
  outcome: 160,
  lesson: 160,
  dialogue: 160,
};

const CATEGORIES: StepCategory[] = ["lookup", "credential", "comms", "ticket", "access", "data"];
const SPEAKERS: DialogueLine["speaker"][] = ["dana", "agent", "narrator"];

/** Claims we must never make in game copy. */
const BANNED = [/placement rate/i, /\bISO\b/, /\bWIOA\b/, /guarantee/i, /certif/i, /\bhired\b/i];

function allText(value: unknown): string[] {
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

/** Checks every encounter's steps and copy must pass (the real shift and the practice shift). */
function describeSharedChecks(enc: Encounter) {
  describe(`${enc.id}: shared checks`, () => {
    it("has well-formed steps", () => {
      for (const s of enc.steps) {
        const where = `step ${s.id}`;
        expect(CATEGORIES, where).toContain(s.category);
        expect(s.ticket.trim(), where).not.toBe("");
        expect(s.ticket, `${where}: ticket reads "#12345 · Company"`).toMatch(/^#\d+ · \S/);
        expect(s.intent.length, `${where} intent`).toBeLessThanOrEqual(LIMITS.intent);
        expect(s.quip.length, `${where} quip`).toBeLessThanOrEqual(LIMITS.quip);
        expect(s.lesson.length, `${where} lesson`).toBeLessThanOrEqual(LIMITS.lesson);
        expect(s.intent.trim() && s.quip.trim() && s.lesson.trim(), where).toBeTruthy();

        expect(s.evidence.length, `${where} evidence`).toBeGreaterThan(0);
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
      if (enc.outro.winWithMisses) expectLines(enc.outro.winWithMisses, "outro.winWithMisses");
      const speakers = new Set(enc.intro.map((l) => l.speaker));
      expect(speakers.has("dana") && speakers.has("agent")).toBe(true);
      expect(enc.debrief.skillTag.trim() && enc.debrief.takeaway.trim() && enc.debrief.careerInsight.trim()).toBeTruthy();
    });

    it("uses fictional companies, makes no unverified claims, and says Approve (not proceed)", () => {
      const text = allText(enc).join("\n");
      for (const re of BANNED) expect(text, `banned phrase ${re}`).not.toMatch(re);
      expect(text).toMatch(/Fenwick IT Solutions/);
      expect(text).not.toMatch(/let (it|ResetBot) (proceed|run)/i);
    });

    it("uses a sprite that exists and only known cards", () => {
      expect(Object.keys(SPRITES)).toContain(enc.agent.spriteKey);
      for (const id of deckAtTurn(enc, enc.maxTurns)) expect(Object.keys(CARDS)).toContain(id);
    });
  });
}

for (const enc of HELP_DESK_ENCOUNTERS) describeSharedChecks(enc);

describe("encounter registry", () => {
  it("finds each encounter by id and falls back to the real shift", () => {
    expect(helpDeskEncounter("hd-00-practice")).toBe(HELP_DESK_PRACTICE);
    expect(helpDeskEncounter("hd-01-monday")).toBe(HELP_DESK_ENCOUNTER);
    expect(helpDeskEncounter("nope")).toBe(HELP_DESK_ENCOUNTER);
    expect(helpDeskEncounter(null)).toBe(HELP_DESK_ENCOUNTER);
    expect(new Set(HELP_DESK_ENCOUNTERS.map((e) => e.id)).size).toBe(HELP_DESK_ENCOUNTERS.length);
  });
});

describe("encounter-01 (help desk)", () => {
  const enc: Encounter = HELP_DESK_ENCOUNTER;

  it("has the basics filled in", () => {
    expect(enc.id).toBeTruthy();
    expect(enc.id).not.toBe("placeholder");
    expect(enc.pathwayId).toBe("help-desk");
    expect(enc.title.trim()).not.toBe("");
    expect(enc.subtitle.trim()).not.toBe("");
    expect(enc.setting.trim()).not.toBe("");
    expect(enc.agent.name).toBe("ResetBot 3000");
    expect(enc.agent.role.trim()).not.toBe("");
    expect(enc.agent.personality.trim()).not.toBe("");
    expect(enc.debrief.skillTag.trim()).not.toBe("");
    expect(enc.debrief.takeaway.trim()).not.toBe("");
    expect(enc.debrief.careerInsight.trim()).not.toBe("");
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

  it("uses credential steps so the callback policy matters", () => {
    expect(enc.steps.filter((s) => s.category === "credential").length).toBeGreaterThanOrEqual(2);
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

    const deck = deckAtTurn(enc, enc.maxTurns);
    expect(deck.length).toBeGreaterThanOrEqual(10);
    expect(deck.length).toBeLessThanOrEqual(12);
    expect(count(deck, "escalate")).toBeGreaterThanOrEqual(1);
    expect(count(deck, "rollback")).toBe(1);
    expect(count(deck, "policy-callback")).toBe(1);
    expect(count(deck, "coffee")).toBe(1);
    // Hand: at most handSize + one unlock, and at most 6 stacks (one per card type).
    expect(enc.handSize + Math.max(...unlocks.map((u) => u.cards.length))).toBeLessThanOrEqual(6);
  });

});

describe("practice.json (the 4-ticket practice shift)", () => {
  const enc: Encounter = HELP_DESK_PRACTICE;
  const cost = (ids: CardId[]) => ids.reduce((n, id) => n + CARDS[id].cost, 0);

  it("is a practice help desk shift with the same agent", () => {
    expect(enc.id).toBe("hd-00-practice");
    expect(enc.practice).toBe(true);
    expect(enc.pathwayId).toBe("help-desk");
    expect(enc.agent.name).toBe(HELP_DESK_ENCOUNTER.agent.name);
    expect(HELP_DESK_ENCOUNTER.practice).toBeFalsy();
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

  it("is set at Fenwick IT Solutions, before the real shift", () => {
    expect(allText(enc).join(" ")).toMatch(/Fenwick IT Solutions/);
    expect(enc.title).not.toBe(HELP_DESK_ENCOUNTER.title);
  });
});

describe("hub.json (help desk office)", () => {
  const hub = HELP_DESK_HUB;

  it("names the office", () => {
    expect(hub.officeName.trim()).not.toBe("");
  });

  it("has exactly the five hub targets with the right actions", () => {
    expect(Object.keys(hub.targets).sort()).toEqual([...HUB_TARGET_IDS].sort());
    expect(hub.targets.resetbot.action).toBe("battle");
    expect(hub.targets.dana.action).toBe("talk");
    expect(hub.targets.whiteboard.action).toBe("look");
    expect(hub.targets.coffee.action).toBe("look");
    expect(hub.targets.printer.action).toBe("look");
  });

  it("has labels, descriptions and lines within limits", () => {
    for (const id of HUB_TARGET_IDS) {
      const t = hub.targets[id];
      expect(t.label.trim(), id).not.toBe("");
      expect(t.label.length, id).toBeLessThanOrEqual(40);
      expect(t.description.trim(), id).not.toBe("");
      expect(t.description.length, id).toBeLessThanOrEqual(60);
      expect(t.lines.length, id).toBeGreaterThan(0);
      expectLines(t.lines, `hub.${id}`);
    }
  });

  it("teaches the basics", () => {
    const dana = hub.targets.dana.lines.map((l) => l.text).join(" ");
    for (const word of ["Inspect", "Block", "Escalate", "Approve", "human in the loop"]) expect(dana).toContain(word);
    expect(allText(hub).join(" ")).not.toMatch(/proceed|let it run/i);
    const board = hub.targets.whiteboard.lines.map((l) => l.text).join(" ");
    for (const q of ["Who asked?", "Does it match the record?", "Can we undo it?", "VP-04"]) expect(board).toContain(q);
  });

  it("makes no unverified claims", () => {
    const text = allText(hub).join("\n");
    for (const re of BANNED) expect(text, `banned phrase ${re}`).not.toMatch(re);
  });
});
