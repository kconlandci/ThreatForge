import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { VignetteFamily } from "@/lib/game/bus";
import { BATTLE_FEET_Y } from "./layout";
import {
  FACE_BOX,
  SPILL_WORDS,
  VIGNETTE_MAX_OBJECTS,
  battleSafeRect,
  overlaps,
  partRect,
  planParts,
  vignettePlan,
  type Rect,
} from "./vignettes";

const FAMILIES: VignetteFamily[] = ["leak", "report", "system"];

/**
 * Battle stage boxes (CSS px): the fixed game stage (clamp(170px, 30svh, 280px), and
 * clamp(150px, 26svh, 280px) under 700 px tall), a short landscape phone, desktop strips, and the
 * tall stage-lab box. Each with and without the DOM tray over the bottom.
 */
const STAGES: [number, number][] = [
  [390, 253],
  [390, 170],
  [390, 280],
  [375, 173],
  [375, 150],
  [320, 150],
  [360, 200],
  [412, 280],
  [740, 150],
  [900, 280],
  [1200, 340],
  [390, 600],
];
const INSETS = [0, 44, 90];

/** Stages as tall as the game ever makes them, at phone width and up. */
const PHONE_GAME = (w: number, h: number) => w >= 360 && h <= 280;

const inside = (a: Rect, r: Rect) => a.x0 >= r.x0 - 0.01 && a.x1 <= r.x1 + 0.01 && a.y0 >= r.y0 - 0.01 && a.y1 <= r.y1 + 0.01;

describe("battleSafeRect", () => {
  it("is the visible world box above the tray", () => {
    const r = battleSafeRect(390, 253, 0);
    // fit = min(390/300, 253/244) = 1.037: 376 world px wide, 244 tall, centred on the battle box.
    expect(r.x1 - r.x0).toBeCloseTo(390 / (253 / 244) - 12, 3);
    expect(r.y1 - r.y0).toBeCloseTo(244 - 12, 3);
    const t = battleSafeRect(390, 253, 44);
    // The tray shrinks the fit; the agent's feet stay above it.
    expect(t.y1).toBeGreaterThan(BATTLE_FEET_Y);
  });
});

describe.each(FAMILIES)("%s vignette layout", (family) => {
  it(`has at most ${VIGNETTE_MAX_OBJECTS} pieces (with the pop word and a spark emitter)`, () => {
    const n = planParts(vignettePlan(family, battleSafeRect(390, 253, 0))).length;
    // leak: stranger + 5 papers; report: chart + 4 numbers; system: monitor + red screen + phone
    // + waves + sparks. Plus one pop word.
    const extra = family === "system" ? 2 : 0;
    expect(n + extra + 1).toBeLessThanOrEqual(VIGNETTE_MAX_OBJECTS);
  });

  it("stays on screen, above the tray, at every stage size", () => {
    for (const [w, h] of STAGES) {
      for (const inset of INSETS) {
        const r = battleSafeRect(w, h, inset);
        for (const p of planParts(vignettePlan(family, r))) {
          expect(inside(partRect(p), r), `${w}x${h} inset ${inset}: ${JSON.stringify(p)} in ${JSON.stringify(r)}`).toBe(true);
        }
      }
    }
  });

  it("keeps clear of the agent's face on game-sized phone stages", () => {
    for (const [w, h] of STAGES.filter(([w, h]) => PHONE_GAME(w, h))) {
      for (const inset of INSETS) {
        const r = battleSafeRect(w, h, inset);
        for (const p of planParts(vignettePlan(family, r))) {
          expect(overlaps(partRect(p), FACE_BOX), `${w}x${h} inset ${inset}: ${JSON.stringify(p)}`).toBe(false);
        }
      }
    }
  });
});

describe("vignette end frames", () => {
  it("shows the report upside down, and the papers at the stranger", () => {
    const r = battleSafeRect(390, 253, 0);
    const rep = vignettePlan("report", r);
    if (rep.family !== "report") throw new Error("report");
    expect(rep.chart.angle).toBe(180);
    expect(rep.nums).toHaveLength(SPILL_WORDS.length);
    for (const n of rep.nums) expect(n.y).toBeGreaterThan(rep.chart.y);
    const leak = vignettePlan("leak", r);
    if (leak.family !== "leak") throw new Error("leak");
    expect(leak.papers).toHaveLength(5);
    for (const p of leak.papers) expect(Math.abs(p.x - leak.stranger.x)).toBeLessThan(leak.stranger.w);
    expect(leak.from.x).toBeLessThan(leak.stranger.x);
  });

  it("puts the phone in front of and below the red monitor", () => {
    const sys = vignettePlan("system", battleSafeRect(390, 253, 0));
    if (sys.family !== "system") throw new Error("system");
    expect(sys.phone.y).toBeGreaterThan(sys.monitor.y);
  });
});

describe("battle scene source", () => {
  const src = readFileSync(join(process.cwd(), "components/game/stage/BattleScene.ts"), "utf8");
  const body = (name: string) => {
    const start = src.indexOf(`private ${name}(`);
    expect(start, name).toBeGreaterThan(-1);
    const next = src.indexOf("\n  private ", start + 10);
    return src.slice(start, next === -1 ? undefined : next);
  };

  it("reduced motion vignettes return before any movement, particles or shake", () => {
    for (const fn of ["vigLeak", "vigReport", "vigSystem"]) {
      const b = body(fn);
      const calm = b.indexOf("this.rt.reducedMotion");
      expect(calm, fn).toBeGreaterThan(-1);
      const before = b.slice(0, calm);
      for (const moving of ["tweens.add", "addCounter", "particles(", "shake(", "tweens.chain"]) {
        expect(before.includes(moving), `${fn}: ${moving} before the reduced-motion return`).toBe(false);
      }
    }
  });

  it("only throws confetti on a clean win, and never a cheer word on a win with misses", () => {
    const b = body("fxWin");
    const notClean = b.indexOf("if (!clean)");
    expect(notClean).toBeGreaterThan(-1);
    // The confetti and "celebrate" live in fxWinClean, reached only after the !clean return.
    expect(notClean).toBeLessThan(b.indexOf("this.fxWinClean()"));
    expect(b.includes("FX.confetti")).toBe(false);
    const nc = b.slice(notClean, b.indexOf("return;", notClean));
    expect(nc.includes("this.word(")).toBe(false);
    const clean = body("fxWinClean");
    expect(clean.includes("FX.confetti")).toBe(true);
    expect(clean.includes('"celebrate"')).toBe(true);
    expect(src.split("this.fxWinClean()").length - 1, "called only from fxWin").toBe(2);
  });

  it("lets a catch play first when it wins the shift", () => {
    expect(body("fxCatch").includes("this.lastCatchAt = this.time.now")).toBe(true);
    expect(body("fxWin").includes("VIGNETTE_MS")).toBe(true);
  });
});
