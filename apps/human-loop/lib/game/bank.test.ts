/**
 * Every pathway's ticket bank (content/<pathway>/bank) and the shift text for generated shifts.
 * The copy itself was checked by the design lead's bank validator; these tests keep the rules the
 * generator and the UI depend on. Per-pathway rules come from EXPECT (lib/pathways/testing.ts).
 */
import { describe, expect, it } from "vitest";
import { EXPECT, TEST_PATHWAYS } from "@/lib/pathways/testing";
import { CARDS } from "./cards";
import { FALLBACK_DAILY, checkDaily } from "./shiftGen";
import { LENS_SKILLS } from "./skills";
import type { AgentStep, DialogueLine } from "./types";

const LIMITS = { intent: 48, quip: 110, label: 28, detail: 140, outcome: 160, lesson: 160, tell: 80, title: 40, ticketId: 24, dialogue: 160 };
const WEEKDAYS = /\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b/i;

function allText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allText);
  if (value && typeof value === "object") return Object.values(value).flatMap(allText);
  return [];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&");

describe.each(TEST_PATHWAYS.map((p) => [p.id, p] as const))("%s ticket bank", (_id, P) => {
  const E = EXPECT[P.id];
  const bank = P.bank;
  const steps: AgentStep[] = bank.flatMap((t) => t.steps);
  const reasonLabel = `${P.agent.name.split(" ")[0]}'s reason`;
  const confidenceRe = new RegExp(`${escapeRe(P.agent.name.split(" ")[0])}'s confidence[^:]*: \\d{1,3}%`);

  describe("ids and shape", () => {
    it("has unique ticket ids, titles and step ids across the bank and the fixed shifts", () => {
      const ticketIds = bank.map((t) => t.id);
      expect(new Set(ticketIds).size).toBe(ticketIds.length);
      const titles = [...bank.map((t) => t.title), ...P.encounters.map((e) => e.title)];
      expect(new Set(titles).size).toBe(titles.length);
      const all = [...steps.map((s) => s.id), ...P.encounters.flatMap((e) => e.steps.map((s) => s.id))];
      expect(new Set(all).size).toBe(all.length);
    });

    it("names tickets and steps by the convention", () => {
      for (const t of bank) {
        expect(t.id, t.id).toMatch(E.bankIdRe);
        expect(t.id.length, t.id).toBeLessThanOrEqual(LIMITS.ticketId);
        expect(E.companies).toContain(t.company);
        expect(t.title.trim().length, t.id).toBeGreaterThan(0);
        expect(t.title.length, t.id).toBeLessThanOrEqual(LIMITS.title);
        expect([1, 2, 3]).toContain(t.difficulty);
        expect(t.steps.length, t.id).toBeGreaterThanOrEqual(1);
        expect(t.steps.length, t.id).toBeLessThanOrEqual(3);
        const ticket = t.steps[0]?.ticket;
        t.steps.forEach((s, i) => {
          expect(s.id).toBe(`${t.id}-${i + 1}`);
          expect(s.ticket, s.id).toMatch(new RegExp(`^#\\d{5} · ${escapeRe(t.company)}$`));
          if (E.sameTicketString) expect(s.ticket, `${s.id}: one ticket string per ticket`).toBe(ticket);
        });
      }
    });
  });

  describe("every step", () => {
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
        expect(E.categories, s.id).toContain(s.category);
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
          expect(s.direction, s.id).toBeUndefined();
        } else {
          expect(s.risk, s.id).toBeGreaterThanOrEqual(2);
          expect(s.risk, s.id).toBeLessThanOrEqual(5);
          expect(s.progress, s.id).toBe(0);
          expect(flags[0], s.id).toBe(false);
          expect(flags.at(-1), s.id).toBe(true);
          expect(flags.indexOf(true), s.id).toBe(flags.length - flags.filter(Boolean).length);
          if (s.twist) expect(s.twist, s.id).toBe("routine-risky");
          if (E.requireDirection) expect(["over", "under"], s.id).toContain(s.direction);
        }
        if (s.reversible) expect(s.outcome.rolledBack?.trim(), s.id).toBeTruthy();
        else expect(s.outcome.rolledBack, s.id).toBeUndefined();
      }
    });

    it("makes no unverified claims, names no weekdays, and uses 555-01xx phones", () => {
      const text = allText(bank).join("\n");
      for (const re of E.banned) expect(text, `banned ${re}`).not.toMatch(re);
      expect(text).not.toMatch(E.letItRe);
      if (E.noWeekdaysInBank) expect(text).not.toMatch(WEEKDAYS);
      for (const phone of text.match(/\(\d{3}\) \d{3}-\d{4}/g) ?? []) expect(phone).toMatch(/555-01\d\d$/);
    });
  });

  describe("the mix the generator needs", () => {
    it("is in the safe band, with enough twists and policy-covered plans", () => {
      const safe = steps.filter((s) => s.safe).length / steps.length;
      expect(safe).toBeGreaterThanOrEqual(E.mix.safeMin);
      expect(safe).toBeLessThanOrEqual(E.mix.safeMax);
      expect(steps.filter((s) => s.twist === "scary-safe").length).toBeGreaterThanOrEqual(E.mix.scarySafeMin);
      expect(steps.filter((s) => s.twist === "routine-risky").length).toBeGreaterThanOrEqual(E.mix.routineRiskyMin);
      const covers = CARDS[E.policyCard].autoInspect ?? [];
      expect(steps.filter((s) => covers.includes(s.category)).length).toBeGreaterThanOrEqual(E.policyMinBank);
    });

    it("gives every lens skill enough safe and risky plans", () => {
      for (const skill of LENS_SKILLS) {
        const mine = steps.filter((s) => s.skill === skill);
        expect(mine.filter((s) => s.safe).length, skill).toBeGreaterThanOrEqual(E.mix.perSkillSafe);
        expect(mine.filter((s) => !s.safe).length, skill).toBeGreaterThanOrEqual(E.mix.perSkillRisky);
      }
    });

    it("has the agent err both ways", () => {
      if (!E.mix.directionsMin) return;
      for (const d of ["over", "under"] as const) {
        expect(steps.filter((s) => !s.safe && s.direction === d).length, d).toBeGreaterThanOrEqual(E.mix.directionsMin);
      }
    });

    it("does not leak the answer through the shape of the evidence", () => {
      const withReason = (ss: AgentStep[]) => ss.filter((s) => s.evidence.some((e) => e.label === reasonLabel)).length;
      const safeSteps = steps.filter((s) => s.safe);
      const riskySteps = steps.filter((s) => !s.safe);
      if (E.mix.safeReasonMin) expect(withReason(safeSteps), `safe plans with "${reasonLabel}"`).toBeGreaterThanOrEqual(E.mix.safeReasonMin);
      if (E.mix.riskyReasonShareMax < 1) {
        const rows = (ss: AgentStep[]) => ss.flatMap((s) => s.evidence).filter((e) => e.label === reasonLabel).length;
        const total = rows(safeSteps) + rows(riskySteps);
        expect(total).toBeGreaterThan(0);
        expect(rows(riskySteps) / total).toBeLessThanOrEqual(E.mix.riskyReasonShareMax);
      }
      if (Number.isFinite(E.mix.meanRowsDiffMax)) {
        const mean = (ss: AgentStep[]) => ss.reduce((n, s) => n + s.evidence.length, 0) / Math.max(1, ss.length);
        expect(Math.abs(mean(safeSteps) - mean(riskySteps))).toBeLessThanOrEqual(E.mix.meanRowsDiffMax);
      }
      if (E.mix.confidencePerWriter) {
        const writers = [...new Set(bank.map((t) => t.id.replace(`${E.idPrefix}-`, "").split("-")[0]))];
        for (const w of writers) {
          const mine = bank.filter((t) => t.id.startsWith(`${E.idPrefix}-${w}-`)).flatMap((t) => t.steps);
          const has = (s: AgentStep) => s.evidence.some((e) => !e.redFlag && confidenceRe.test(e.detail));
          expect(mine.filter((s) => s.safe && has(s)).length, `writer ${w}: safe`).toBeGreaterThanOrEqual(E.mix.confidencePerWriter);
          expect(mine.filter((s) => !s.safe && has(s)).length, `writer ${w}: risky`).toBeGreaterThanOrEqual(E.mix.confidencePerWriter);
        }
        // A confidence number is never evidence: never in a red row.
        for (const s of steps) for (const e of s.evidence) if (e.redFlag) expect(e.detail, s.id).not.toMatch(confidenceRe);
      }
    });

    it("has a fallback daily that passes the daily rules", () => {
      const ids = P.shiftText.fallbackDaily ?? FALLBACK_DAILY;
      const byId = new Map(bank.map((t) => [t.id, t]));
      for (const id of ids) expect(byId.has(id), id).toBe(true);
      expect(checkDaily(ids.map((id) => byId.get(id)!)).ok).toBe(true);
    });
  });

  describe("shift.json (daily and drill shells)", () => {
    const T = P.shiftText;
    const lines = (pools: DialogueLine[][]) => pools.flat();

    it("has intro and outro pools within the dialogue limit", () => {
      expect(T.version).toBe(1);
      expect(T.intros.length).toBeGreaterThanOrEqual(6);
      for (const intro of T.intros) expect(intro.map((l) => l.speaker)).toEqual(["coach", "agent"]);
      for (const key of ["win", "winWithMisses", "timeout", "breach"] as const) {
        expect(T.outros[key].length, key).toBeGreaterThan(0);
      }
      expect(T.outros.timeout.length).toBeGreaterThanOrEqual(2);
      // Enough lines that a week of shifts doesn't repeat the agent's jokes.
      for (const key of ["win", "winWithOneMiss", "winWithMisses", "drillWin"] as const) {
        expect(T.outros[key]?.length ?? 0, key).toBeGreaterThanOrEqual(6);
        for (const pair of T.outros[key] ?? []) expect(pair.map((l) => l.speaker), key).toEqual(["agent", "coach"]);
      }
      for (const pair of T.outros.breach) expect(pair[0].speaker).toBe("narrator");
      // "One of my plans": the one-miss lines never say "a few" or "some".
      for (const pair of T.outros.winWithOneMiss ?? []) expect(pair[0].text, pair[0].text).not.toMatch(/\b(a few|some|many)\b/i);
      const all = [...lines(T.intros), ...Object.values(T.outros).flatMap(lines)];
      for (const l of all) {
        expect(["coach", "agent", "narrator"]).toContain(l.speaker);
        expect(l.text.trim().length).toBeGreaterThan(0);
        expect(l.text.length, l.text).toBeLessThanOrEqual(LIMITS.dialogue);
      }
      const text = allText(T).join("\n");
      for (const re of E.banned) expect(text).not.toMatch(re);
      if (E.noWeekdaysInBank) expect(text).not.toMatch(WEEKDAYS);
    });

    it("has setting and career templates (own ones where required)", () => {
      if (E.requireShiftTemplates) {
        for (const key of ["settingDaily", "settingDrill", "careerInsight"] as const) expect(T[key]?.trim(), key).toBeTruthy();
        expect(T.fallbackDaily?.length).toBeGreaterThan(0);
      }
      for (const key of ["settingDaily", "settingDrill"] as const) {
        const t = T[key];
        if (!t) continue;
        expect(t.replace(/\{(n|companies|agent)\}/g, ""), `${key}: only {n} {companies} {agent}`).not.toMatch(/[{}]/);
        expect(t).toMatch(/\{companies\}/);
        expect(t).toMatch(/\{agent\}/);
      }
    });
  });
});
