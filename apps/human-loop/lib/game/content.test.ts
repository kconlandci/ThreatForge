import { describe, expect, it } from "vitest";
import { SPRITES } from "./assets";
import { CARDS } from "./cards";
import { HELP_DESK_ENCOUNTER, HELP_DESK_HUB } from "./content";
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

  it("uses a sprite that exists", () => {
    expect(Object.keys(SPRITES)).toContain(enc.agent.spriteKey);
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

  it("has well-formed steps", () => {
    for (const s of enc.steps) {
      const where = `step ${s.id}`;
      expect(CATEGORIES, where).toContain(s.category);
      expect(s.ticket.trim(), where).not.toBe("");
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

  it("includes the rollback lesson: at least one unsafe step is irreversible, and most are reversible", () => {
    const unsafe = enc.steps.filter((s) => !s.safe);
    expect(unsafe.some((s) => !s.reversible)).toBe(true);
    expect(unsafe.some((s) => s.reversible)).toBe(true);
  });

  it("uses credential steps so the callback policy matters", () => {
    expect(enc.steps.filter((s) => s.category === "credential").length).toBeGreaterThanOrEqual(2);
  });

  it("has a valid starter deck", () => {
    expect(enc.starterDeck.length).toBeGreaterThanOrEqual(10);
    expect(enc.starterDeck.length).toBeLessThanOrEqual(12);
    for (const id of enc.starterDeck) expect(Object.keys(CARDS)).toContain(id);
    const count = (id: CardId) => enc.starterDeck.filter((c) => c === id).length;
    expect(count("inspect")).toBeGreaterThanOrEqual(3);
    expect(count("block")).toBeGreaterThanOrEqual(2);
    expect(count("escalate")).toBe(2);
    expect(count("rollback")).toBe(1);
    expect(count("policy-callback")).toBe(1);
    expect(count("coffee")).toBe(1);
  });

  it("has intro, outro and debrief lines within limits", () => {
    expect(enc.intro.length).toBeGreaterThan(0);
    expectLines(enc.intro, "intro");
    for (const key of ["win", "breach", "timeout"] as const) {
      expect(enc.outro[key].length, `outro.${key}`).toBeGreaterThan(0);
      expectLines(enc.outro[key], `outro.${key}`);
    }
    const speakers = new Set(enc.intro.map((l) => l.speaker));
    expect(speakers.has("dana") && speakers.has("agent")).toBe(true);
  });

  it("uses fictional companies and makes no unverified claims", () => {
    const text = allText(enc).join("\n");
    for (const re of BANNED) expect(text, `banned phrase ${re}`).not.toMatch(re);
    expect(text).toMatch(/Fenwick IT Solutions/);
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
    for (const word of ["Inspect", "Block", "Escalate", "End turn", "human in the loop"]) expect(dana).toContain(word);
    const board = hub.targets.whiteboard.lines.map((l) => l.text).join(" ");
    for (const q of ["Who asked?", "Does it match the record?", "Can we undo it?", "VP-04"]) expect(board).toContain(q);
  });

  it("makes no unverified claims", () => {
    const text = allText(hub).join("\n");
    for (const re of BANNED) expect(text, `banned phrase ${re}`).not.toMatch(re);
  });
});
