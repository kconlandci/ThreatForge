import { describe, expect, it } from "vitest";
import { EXPECT, PRACTICE_VERDICT_RE, TEST_PATHWAYS } from "@/lib/pathways/testing";
import { wordsIn, type GlossaryWord } from "./glossary";
import { wordCount } from "./reveal";

const W = (term: string, also?: string[]): GlossaryWord => ({ term, also, meaning: `${term} means something.` });

describe("wordsIn", () => {
  const words = [W("key"), W("key vault"), W("MFA", ["multi-factor"]), W("read-only"), W("VPN", ["VPNs"])];

  it("finds whole words in order, any case, once each", () => {
    expect(wordsIn(["Reset mfa now. Then MFA again.", "The vpn is down"], words).map((w) => w.term)).toEqual(["MFA", "VPN"]);
    expect(wordsIn(["Keyboard and monkey"], words)).toEqual([]);
    expect(wordsIn(["Set it read-only."], words).map((w) => w.term)).toEqual(["read-only"]);
    expect(wordsIn(["Two VPNs, one multi-factor prompt"], words).map((w) => w.term)).toEqual(["VPN", "MFA"]);
  });

  it("lets a longer phrase win where two overlap", () => {
    expect(wordsIn(["Move the key vault"], words).map((w) => w.term)).toEqual(["key vault"]);
    expect(wordsIn(["Move the key vault, then rotate the key"], words).map((w) => w.term)).toEqual(["key vault", "key"]);
  });

  it("handles empty input", () => {
    expect(wordsIn([null, undefined, ""], words)).toEqual([]);
  });
});

// Meanings say what a thing is, never whether a plan is safe.
const VERDICT_RE = /\b(suspicious|red flag|should|safe|risky|dangerous|wrong|fake|scam|bad|good)\b/i;

for (const P of TEST_PATHWAYS) {
  describe(`${P.id} words to know`, () => {
    const all = [
      ...[P.practice, P.story].flatMap((e) => e.steps.flatMap((s) => [s.intent, s.quip, ...s.evidence.flatMap((ev) => [ev.label, ev.detail, ev.gloss ?? ""])])),
      ...P.bank.flatMap((t) => t.steps.flatMap((s) => [s.intent, s.quip, ...s.evidence.flatMap((ev) => [ev.label, ev.detail, ev.gloss ?? ""])])),
    ];

    it("has 15-25 unique words with short, plain meanings that give nothing away", () => {
      expect(P.glossary.length).toBeGreaterThanOrEqual(15);
      expect(P.glossary.length).toBeLessThanOrEqual(25);
      const terms = P.glossary.map((w) => w.term.toLowerCase());
      expect(new Set(terms).size).toBe(terms.length);
      for (const w of P.glossary) {
        expect(w.meaning.trim(), w.term).not.toBe("");
        expect(wordCount(w.meaning), w.term).toBeLessThanOrEqual(18);
        expect(w.meaning, w.term).not.toMatch(VERDICT_RE);
        expect(w.meaning, w.term).not.toMatch(PRACTICE_VERDICT_RE);
        for (const re of EXPECT[P.id].banned) expect(w.meaning, `${w.term}: banned ${re}`).not.toMatch(re);
      }
    });

    it("lists only words the plans actually use (each shows on some evidence sheet)", () => {
      for (const w of P.glossary) expect(wordsIn(all, [w]), w.term).toHaveLength(1);
    });
  });
}
