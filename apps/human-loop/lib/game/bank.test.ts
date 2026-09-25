/**
 * The help desk ticket bank (content/help-desk/bank) and the shift text for generated shifts.
 * The copy itself was checked by the design lead's bank validator; these tests keep the rules the
 * generator and the UI depend on.
 */
import { describe, expect, it } from "vitest";
import { HELP_DESK_BANK, HELP_DESK_ENCOUNTERS, SHIFT_TEXT } from "./content";
import { LENS_SKILLS } from "./skills";
import type { AgentStep, DialogueLine, StepCategory } from "./types";

const LIMITS = { intent: 48, quip: 110, label: 28, detail: 140, outcome: 160, lesson: 160, tell: 80, title: 40, ticketId: 24, dialogue: 160 };
const CATEGORIES: StepCategory[] = ["lookup", "credential", "comms", "ticket", "access", "data"];
const COMPANIES = ["Harlow & Cole", "Bramwell Logistics", "Pinecrest Dental"];
const BANNED = [/placement rate/i, /\bISO\b/, /\bWIOA\b/, /guarantee/i, /certif/i, /\bhired\b/i, /let (it|Ollie) (proceed|run)/i];
const WEEKDAYS = /\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b/i;

function allText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allText);
  if (value && typeof value === "object") return Object.values(value).flatMap(allText);
  return [];
}

const steps: AgentStep[] = HELP_DESK_BANK.flatMap((t) => t.steps);

describe("ticket bank: ids and shape", () => {
  it("has unique ticket and step ids across the bank and the fixed shifts", () => {
    const ticketIds = HELP_DESK_BANK.map((t) => t.id);
    expect(new Set(ticketIds).size).toBe(ticketIds.length);
    const all = [...steps.map((s) => s.id), ...HELP_DESK_ENCOUNTERS.flatMap((e) => e.steps.map((s) => s.id))];
    expect(new Set(all).size).toBe(all.length);
  });

  it("names tickets and steps by the convention", () => {
    for (const t of HELP_DESK_BANK) {
      expect(t.id, t.id).toMatch(/^[abc]-[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(t.id.length, t.id).toBeLessThanOrEqual(LIMITS.ticketId);
      expect(COMPANIES).toContain(t.company);
      expect(t.title.trim().length, t.id).toBeGreaterThan(0);
      expect(t.title.length, t.id).toBeLessThanOrEqual(LIMITS.title);
      expect([1, 2, 3]).toContain(t.difficulty);
      expect(t.steps.length, t.id).toBeGreaterThanOrEqual(1);
      expect(t.steps.length, t.id).toBeLessThanOrEqual(3);
      t.steps.forEach((s, i) => {
        expect(s.id).toBe(`${t.id}-${i + 1}`);
        expect(s.ticket, s.id).toMatch(new RegExp(`^#\\d{5} · ${t.company.replace(/[&]/g, "\\&")}$`));
      });
    }
  });
});

describe("ticket bank: every step", () => {
  it("has a lens skill and a tell (at most 80 characters, not the lesson)", () => {
    for (const s of steps) {
      expect(LENS_SKILLS, s.id).toContain(s.skill);
      expect(s.tell?.trim(), s.id).toBeTruthy();
      expect(s.tell!.length, s.id).toBeLessThanOrEqual(LIMITS.tell);
      expect(s.tell, s.id).not.toBe(s.lesson);
    }
  });

  it("keeps text within the UI limits", () => {
    for (const s of steps) {
      expect(CATEGORIES, s.id).toContain(s.category);
      expect(s.intent.length, s.id).toBeLessThanOrEqual(LIMITS.intent);
      expect(s.quip.length, s.id).toBeLessThanOrEqual(LIMITS.quip);
      expect(s.lesson.length, s.id).toBeLessThanOrEqual(LIMITS.lesson);
      expect(s.evidence.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.evidence.length, s.id).toBeLessThanOrEqual(4);
      for (const e of s.evidence) {
        expect(e.label.length, `${s.id} ${e.label}`).toBeLessThanOrEqual(LIMITS.label);
        expect(e.detail.length, `${s.id} ${e.label}`).toBeLessThanOrEqual(LIMITS.detail);
      }
      for (const text of Object.values(s.outcome)) expect(text.length, s.id).toBeLessThanOrEqual(LIMITS.outcome);
    }
  });

  it("follows the safe / risky rules, with truthful red flags", () => {
    for (const s of steps) {
      const flags = s.evidence.map((e) => e.redFlag);
      if (s.safe) {
        expect(flags.some(Boolean), s.id).toBe(false);
        expect(s.risk, s.id).toBe(0);
        expect(s.progress, s.id).toBeGreaterThanOrEqual(1);
        expect(s.progress, s.id).toBeLessThanOrEqual(2);
        if (s.twist) expect(s.twist, s.id).toBe("scary-safe");
      } else {
        expect(s.risk, s.id).toBeGreaterThanOrEqual(2);
        expect(s.risk, s.id).toBeLessThanOrEqual(5);
        expect(s.progress, s.id).toBe(0);
        expect(flags[0], s.id).toBe(false);
        expect(flags.at(-1), s.id).toBe(true);
        expect(flags.indexOf(true), s.id).toBe(flags.length - flags.filter(Boolean).length);
        if (s.twist) expect(s.twist, s.id).toBe("routine-risky");
      }
      if (s.reversible) expect(s.outcome.rolledBack?.trim(), s.id).toBeTruthy();
      else expect(s.outcome.rolledBack, s.id).toBeUndefined();
    }
  });

  it("makes no unverified claims, names no weekdays, and uses 555-01xx phones", () => {
    const text = allText(HELP_DESK_BANK).join("\n");
    for (const re of BANNED) expect(text, `banned ${re}`).not.toMatch(re);
    expect(text).not.toMatch(WEEKDAYS);
    for (const phone of text.match(/\(\d{3}\) \d{3}-\d{4}/g) ?? []) expect(phone).toMatch(/555-01\d\d$/);
  });
});

describe("ticket bank: the mix the generator needs", () => {
  it("is 55-65% safe, with enough twists and credential plans", () => {
    const safe = steps.filter((s) => s.safe).length / steps.length;
    expect(safe).toBeGreaterThanOrEqual(0.55);
    expect(safe).toBeLessThanOrEqual(0.65);
    expect(steps.filter((s) => s.twist === "scary-safe").length).toBeGreaterThanOrEqual(6);
    expect(steps.filter((s) => s.twist === "routine-risky").length).toBeGreaterThanOrEqual(8);
    expect(steps.filter((s) => s.category === "credential").length).toBeGreaterThanOrEqual(4);
  });

  it("gives every lens skill at least 3 safe and 2 risky plans", () => {
    for (const skill of LENS_SKILLS) {
      const mine = steps.filter((s) => s.skill === skill);
      expect(mine.filter((s) => s.safe).length, skill).toBeGreaterThanOrEqual(3);
      expect(mine.filter((s) => !s.safe).length, skill).toBeGreaterThanOrEqual(2);
    }
  });

  it("tags every fixed-shift step with a lens skill too", () => {
    for (const enc of HELP_DESK_ENCOUNTERS) for (const s of enc.steps) expect(LENS_SKILLS, s.id).toContain(s.skill);
  });
});

describe("shift.json (daily and drill shells)", () => {
  const lines = (pools: DialogueLine[][]) => pools.flat();

  it("has intro and outro pools within the dialogue limit", () => {
    expect(SHIFT_TEXT.version).toBe(1);
    expect(SHIFT_TEXT.intros.length).toBeGreaterThan(0);
    for (const intro of SHIFT_TEXT.intros) expect(intro.map((l) => l.speaker)).toEqual(["dana", "agent"]);
    for (const key of ["win", "winWithMisses", "timeout", "breach"] as const) {
      expect(SHIFT_TEXT.outros[key].length, key).toBeGreaterThan(0);
    }
    // Enough lines that a week of shifts doesn't repeat Ollie's jokes.
    for (const key of ["win", "winWithOneMiss", "winWithMisses", "drillWin"] as const) {
      expect(SHIFT_TEXT.outros[key]?.length ?? 0, key).toBeGreaterThanOrEqual(6);
    }
    // "One of my plans": the one-miss lines never say "a few" or "some".
    for (const pair of SHIFT_TEXT.outros.winWithOneMiss ?? []) expect(pair[0].text, pair[0].text).not.toMatch(/\b(a few|some|many)\b/i);
    const all = [...lines(SHIFT_TEXT.intros), ...Object.values(SHIFT_TEXT.outros).flatMap(lines)];
    for (const l of all) {
      expect(["dana", "agent", "narrator"]).toContain(l.speaker);
      expect(l.text.trim().length).toBeGreaterThan(0);
      expect(l.text.length, l.text).toBeLessThanOrEqual(LIMITS.dialogue);
    }
    const text = allText(SHIFT_TEXT).join("\n");
    for (const re of BANNED) expect(text).not.toMatch(re);
    expect(text).not.toMatch(WEEKDAYS);
  });
});
