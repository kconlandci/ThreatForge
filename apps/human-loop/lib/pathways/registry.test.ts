/**
 * The pathway registry, save compatibility across the multi-pathway refactor, and the rule that
 * shared code never names a pathway's cast.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { toProgress } from "@/lib/client/save";
import { canResume, endTurn } from "@/lib/game/engine";
import { reasonText } from "@/lib/game/mastery";
import type { SaveData } from "@/lib/game/types";
import { validateSave } from "@/lib/server/validate";
import { PATHWAYS, getPathway, isLivePathwayId, livePathways, pathwayOfEncounterId } from "@/lib/types";
import { HELP_DESK } from "./help-desk";
import { EXPECT, TEST_PATHWAYS } from "./testing";

const ROOT = join(__dirname, "..", "..");

describe("pathway registry", () => {
  it("has Help Desk live, and every live pathway has a bundle under test", () => {
    const live = livePathways().map((p) => p.id);
    expect(live).toContain("help-desk");
    for (const id of live) {
      expect(isLivePathwayId(id), id).toBe(true);
      expect(TEST_PATHWAYS.map((b) => b.id), `${id} is live, so TEST_PATHWAYS must include it`).toContain(id);
    }
    expect(isLivePathwayId("nope")).toBe(false);
    expect(isLivePathwayId("business-analyst")).toBe(true);
    expect(isLivePathwayId("full-stack")).toBe(true);
    expect(isLivePathwayId("cybersecurity")).toBe(true);
    expect(isLivePathwayId("cloud-network")).toBe(true);
  });

  it("fills in the metadata every live-able pathway needs", () => {
    for (const id of ["help-desk", "cybersecurity", "cloud-network", "full-stack", "business-analyst"] as const) {
      const m = getPathway(id);
      const e = EXPECT[id];
      expect(m.idPrefix).toBe(e.idPrefix);
      expect(m.practiceId).toBe(e.practiceId);
      expect(m.storyId).toBe(e.storyId);
      expect(m.agentName).toBe(e.agentName);
      for (const key of ["agentSprite", "firstShift", "storyTitle", "pageTitle", "pageDescription"] as const) {
        expect(m[key]?.trim(), `${id}.${key}`).toBeTruthy();
      }
    }
    // The Airtable "Pathway" single-select option is the pathway's name, exactly.
    expect(getPathway("cybersecurity").name).toBe("Cybersecurity");
    expect(getPathway("help-desk").name).toBe("Help Desk");
    expect(getPathway("cloud-network").name).toBe("Cloud & Network");
    expect(getPathway("full-stack").name).toBe("Full-Stack Development");
    expect(getPathway("business-analyst").name).toBe("Business Analyst");
    const prefixes = PATHWAYS.flatMap((p) => (p.idPrefix ? [p.idPrefix] : []));
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("finds a pathway from an encounter id", () => {
    expect(pathwayOfEncounterId("hd-daily-3")?.id).toBe("help-desk");
    expect(pathwayOfEncounterId("hd-01-monday")?.id).toBe("help-desk");
    expect(pathwayOfEncounterId("cy-drill-guard-data-0")?.id).toBe("cybersecurity");
    expect(pathwayOfEncounterId("cn-01-tuesday")?.id).toBe("cloud-network");
    expect(pathwayOfEncounterId("cn-daily-4")?.id).toBe("cloud-network");
    expect(pathwayOfEncounterId("fs-01-thursday")?.id).toBe("full-stack");
    expect(pathwayOfEncounterId("fs-daily-4")?.id).toBe("full-stack");
    expect(pathwayOfEncounterId("ba-01-wednesday")?.id).toBe("business-analyst");
    expect(pathwayOfEncounterId("ba-daily-4")?.id).toBe("business-analyst");
    expect(pathwayOfEncounterId("x-1")).toBeUndefined();
  });

  it.each(TEST_PATHWAYS.map((b) => [b.id, b] as const))("%s bundle agrees with its metadata", (_id, B) => {
    expect(B.meta.agentName).toBe(B.agent.name);
    expect(B.meta.storyTitle).toBe(B.story.title);
    expect(B.meta.storyId).toBe(B.story.id);
    expect(B.meta.practiceId).toBe(B.practice.id);
    expect(B.stage.agentSprite).toBe(B.meta.agentSprite);
    expect(B.coach).toEqual(B.config.coach);
    expect(B.practice.coach).toEqual(B.coach);
    // Card wording: mechanics never change.
    for (const id of ["inspect", "block", "escalate", "rollback", "coffee"] as const) {
      const c = B.cardCopy(id);
      expect(c.cost).toBeGreaterThanOrEqual(0);
      expect(c.id).toBe(id);
    }
  });
});

describe("save compatibility (an M3 Help Desk save)", () => {
  const raw = JSON.parse(readFileSync(join(__dirname, "..", "game", "__golden__", "m3-save.json"), "utf8")) as SaveData;

  it("validates on the server and loads on the client", () => {
    expect(validateSave(raw, { envelope: false }).ok).toBe(true);
    const p = toProgress(raw.pathways["help-desk"]);
    expect(p.battle).toBeTruthy();
    expect(p.skills?.["verify-identity"]?.missWhy).toBe("Dana did the check");
  });

  it("resumes the mid-Monday battle, and Policy: Callback keeps auto-inspecting credential plans", () => {
    const p = toProgress(raw.pathways["help-desk"]);
    const enc = HELP_DESK.encounterFor(p.battle!.encounterId, p);
    expect(enc.id).toBe("hd-01-monday");
    expect(canResume(p.battle, enc)).toBe(true);
    expect(p.battle!.powers.callbackPolicy).toBe(true);
    let s = p.battle!;
    let checked = 0;
    for (let i = 0; i < 6 && s.status === "playing"; i++) {
      s = endTurn(s, enc);
      for (const id of s.announced) {
        if (enc.steps.find((x) => x.id === id)!.category === "credential") {
          expect(s.steps[id].inspected, id).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("keeps the saved daily usable, and shows stored reasons with the pathway's coach", () => {
    const p = toProgress(raw.pathways["help-desk"]);
    expect(HELP_DESK.shiftUsable(p.shift)).toBe(true);
    expect(HELP_DESK.shiftEncounter(p.shift!).id).toBe("hd-daily-1");
    const why = p.skills!["verify-identity"]!.missWhy!;
    expect(reasonText(why, "Kofi")).toBe("Kofi did the check");
    expect(reasonText(why, "Dana")).toBe("Dana did the check");
    expect(reasonText("Dana didn't need this one", "Kofi")).toBe("Kofi didn't need this one");
    expect(reasonText("Lucky guess", "Kofi")).toBe("Lucky guess");
    expect(HELP_DESK.step(p.skills!["verify-identity"]!.miss)?.id).toBe("romero-mfa-reset");
  });
});

/* ------------------------------------------------------------------ */
/* No hard-coded cast in shared code                                   */
/* ------------------------------------------------------------------ */

const SCAN_DIRS = ["components/battle", "components/hub", "components/skills", "components/game", "lib/game"];
/** Shared files allowed to name the Help Desk cast: its defaults, the legacy re-export and fixtures. */
const SCAN_ALLOW = new Set([
  "lib/game/helpDeskDefaults.ts",
  "lib/game/content.ts",
  "lib/game/fixtures.ts",
  // The sprite manifest lists every pathway's art by design.
  "lib/game/assets.ts",
]);
const CAST_RE = /\bDana\b|\bOllie\b|ollie-|dana\.svg/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "__golden__" ? [] : sourceFiles(full);
    return /\.tsx?$/.test(name) && !/\.test\.ts$/.test(name) ? [full] : [];
  });
}

/** Every string the code can show or use: string literals, template parts and JSX text (not comments). */
function literals(file: string): string[] {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateLiteralToken(node)) out.push(node.text);
    else if (ts.isJsxText(node)) out.push(node.text);
    node.forEachChild(visit);
  };
  visit(src);
  return out;
}

describe("no hard-coded cast in shared code", () => {
  it("never names Dana or Ollie (or their art) in components and lib/game strings", () => {
    const hits: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        const rel = relative(ROOT, file);
        if (SCAN_ALLOW.has(rel)) continue;
        for (const text of literals(file)) if (CAST_RE.test(text)) hits.push(`${rel}: ${JSON.stringify(text)}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
