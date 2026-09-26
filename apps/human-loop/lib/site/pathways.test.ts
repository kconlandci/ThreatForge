import { describe, expect, it } from "vitest";
import { PATHWAYS, getPathway, livePathways } from "@/lib/types";
import type { PathwayProgress } from "@/lib/game/types";
import { openNowSentence, pathwayCta, resumeKindOf, shiftsPlayed } from "./pathways";

const HD = getPathway("help-desk");
const CY = getPathway("cybersecurity");
const CN = getPathway("cloud-network");
const FS = getPathway("full-stack");
const BA = getPathway("business-analyst");
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
    expect(pathwayCta(progress({ battle: playing("cn-daily-2") }), CN)).toBe("Resume practice");
    expect(pathwayCta(progress({ battle: playing("cn-drill-guard-data-0") }), CN)).toBe("Resume drill");
    expect(resumeKindOf("cn-01-tuesday", CN)).toBe("shift");
    expect(pathwayCta(progress({ battle: playing("fs-daily-2") }), FS)).toBe("Resume practice");
    expect(pathwayCta(progress({ battle: playing("fs-drill-guard-data-0") }), FS)).toBe("Resume drill");
    expect(resumeKindOf("fs-01-thursday", FS)).toBe("shift");
    expect(pathwayCta(progress({ battle: playing("ba-daily-2") }), BA)).toBe("Resume practice");
    expect(pathwayCta(progress({ battle: playing("ba-drill-guard-data-0") }), BA)).toBe("Resume drill");
    expect(pathwayCta(progress({ battle: playing("ba-00-practice") }), BA)).toBe("Resume practice");
    expect(resumeKindOf("ba-01-wednesday", BA)).toBe("shift");
  });

  it("counts every shift played", () => {
    const h = (mode: "daily" | "drill" | "story") => ({ encounterId: "x", status: "won" as const, stars: 0, at: "", catches: 0, falseAlarms: 0, misses: 0, mode });
    expect(shiftsPlayed(progress({ attempts: 2, history: [h("story"), h("story"), h("daily"), h("drill")] }))).toBe(4);
  });

  it("says which pathways are open", () => {
    expect(openNowSentence([HD])).toBe("Help Desk is open now.");
    expect(openNowSentence([HD, CY])).toBe("Help Desk and Cybersecurity are open now.");
    expect(openNowSentence([HD, CY, CN])).toBe("Help Desk, Cybersecurity and Cloud & Network are open now.");
    expect(openNowSentence(livePathways())).toBe(
      "Help Desk, Cybersecurity, Cloud & Network, Full-Stack Development and Business Analyst are open now.",
    );
  });

  it("has five live pathways, in registry order, and none coming soon", () => {
    const live = livePathways();
    expect(live.map((p) => p.id)).toEqual(["help-desk", "cybersecurity", "cloud-network", "full-stack", "business-analyst"]);
    expect(PATHWAYS.filter((p) => p.status === "soon").map((p) => p.id)).toEqual([]);
    for (const p of live) {
      expect(p.agentSprite).toBeTruthy();
      expect(p.firstShift).toBeTruthy();
    }
  });
});
