import { describe, expect, it } from "vitest";
import { PATHWAYS, getPathway, livePathways, type PathwayMeta } from "@/lib/types";
import type { PathwayProgress } from "@/lib/game/types";
import { openNowSentence, pathwayCta, resumeKindOf, shiftsPlayed } from "./pathways";

const HD = getPathway("help-desk");
const CY = getPathway("cybersecurity");
const progress = (over: Partial<PathwayProgress> = {}): PathwayProgress => ({
  introSeen: true,
  hub: null,
  battle: null,
  best: null,
  attempts: 0,
  wins: 0,
  history: [],
  ...over,
});
const playing = (encounterId: string) => ({ status: "playing", encounterId }) as PathwayProgress["battle"];

describe("site pathway cards", () => {
  it("labels the button by what is saved, per pathway prefix", () => {
    expect(pathwayCta(null, HD)).toBe("Start shift");
    expect(pathwayCta(progress({ attempts: 2 }), HD)).toBe("Continue");
    expect(pathwayCta(progress({ battle: playing("hd-drill-guard-data-1") }), HD)).toBe("Resume drill");
    expect(pathwayCta(progress({ battle: playing("hd-daily-3") }), HD)).toBe("Resume practice");
    expect(pathwayCta(progress({ battle: playing("hd-00-practice") }), HD)).toBe("Resume practice");
    expect(pathwayCta(progress({ battle: playing("hd-01-monday") }), HD)).toBe("Resume shift");
    expect(pathwayCta(progress({ battle: playing("cy-drill-guard-data-0") }), CY)).toBe("Resume drill");
    expect(pathwayCta(progress({ battle: playing("cy-00-practice") }), CY)).toBe("Resume practice");
    expect(resumeKindOf("cy-01-friday", CY)).toBe("shift");
  });

  it("counts every shift played", () => {
    const h = (mode: "daily" | "drill" | "story") => ({ encounterId: "x", status: "won" as const, stars: 0, at: "", catches: 0, falseAlarms: 0, misses: 0, mode });
    expect(shiftsPlayed(progress({ attempts: 2, history: [h("story"), h("story"), h("daily"), h("drill")] }))).toBe(4);
  });

  it("says which pathways are open", () => {
    expect(openNowSentence([HD])).toBe("Help Desk is open now.");
    expect(openNowSentence([HD, CY])).toBe("Help Desk and Cybersecurity are open now.");
    expect(openNowSentence(livePathways())).toMatch(/Help Desk/);
  });

  it("works with a temporary local flip of Cybersecurity to live", () => {
    const flipped: PathwayMeta[] = PATHWAYS.map((p) => (p.id === "cybersecurity" ? { ...p, status: "live" } : p));
    const live = flipped.filter((p) => p.status === "live");
    expect(live.map((p) => p.id)).toEqual(["help-desk", "cybersecurity"]);
    expect(openNowSentence(live)).toBe("Help Desk and Cybersecurity are open now.");
    for (const p of live) {
      expect(p.agentSprite).toBeTruthy();
      expect(p.firstShift).toBeTruthy();
    }
  });
});
