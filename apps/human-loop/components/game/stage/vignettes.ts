/**
 * Outcome vignettes (Phase 1a): where each piece of a vignette sits on the battle stage.
 * Pure math, no Phaser, so tests can prove every piece stays inside the visible stage (above the
 * DOM "Done" tray) at every stage size, and clear of the agent's face on normal phone stages.
 *
 * World: the agent's feet at (0, BATTLE_FEET_Y); the portrait is 220 x 220 world px. Vignettes
 * play to the agent's right (its desk side), between the agent and the backdrop's desk monitor on
 * wide stages, and pulled in from the edge on narrow ones. Positions here are END FRAMES: the reduced-motion
 * version shows exactly these, still; the animated version moves pieces into them.
 */
import type { VignetteFamily } from "@/lib/game/bus";
import { BATTLE_BOX, BATTLE_FEET_Y, battleFit } from "./layout";

/** World sizes of the vignette textures (drawn in textures.ts at fxRes px per unit). */
export const VIG_SIZE = {
  envelope: { w: 26, h: 18 },
  paper: { w: 20, h: 26 },
  stranger: { w: 62, h: 62 },
  chart: { w: 72, h: 58 },
  monitor: { w: 66, h: 58 },
  phone: { w: 36, h: 26 },
  ringwave: { w: 64, h: 30 },
} as const;

/** The number chips that spill out of a flipped report (baked as pop words). */
export const SPILL_WORDS = ["n1", "n2", "n3", "n4"] as const;
export type SpillWord = (typeof SPILL_WORDS)[number];
/** Their world size budget (the baked words are smaller than this). */
export const SPILL_SIZE = { w: 40, h: 30 } as const;

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Part {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees. */
  angle?: number;
}

/** Most pieces (game objects) one vignette may add, the pop word included. */
export const VIGNETTE_MAX_OBJECTS = 8;

/** The agent's face and head (world px): vignettes keep clear of it when the stage is wide enough. */
export const FACE_BOX: Rect = { x0: -72, y0: BATTLE_FEET_Y - 212, x1: 72, y1: BATTLE_FEET_Y - 100 };

const MARGIN = 6;

/**
 * The world rectangle the player can see on the battle stage, minus the bottom band the DOM tray
 * covers. Mirrors BattleScene.computeFit + StageScene.view().
 */
export function battleSafeRect(cssW: number, cssH: number, inset: number): Rect {
  const cover = Math.min(Math.max(0, inset), cssH * 0.4);
  const fit = battleFit(cssW, cssH - cover);
  const focusY = BATTLE_BOX.cy + cover / 2 / fit;
  const w = cssW / fit;
  const h = cssH / fit;
  const y0 = focusY - h / 2;
  return {
    x0: BATTLE_BOX.cx - w / 2 + MARGIN,
    x1: BATTLE_BOX.cx + w / 2 - MARGIN,
    y0: y0 + MARGIN,
    y1: y0 + h - cover / fit - MARGIN,
  };
}

const clamp = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));

/** Centre x for a piece of half-width hw on the agent's right, as near `prefer` as fits. */
function rightX(r: Rect, hw: number, prefer: number) {
  return clamp(prefer, r.x0 + hw, r.x1 - hw);
}

function fitY(r: Rect, hh: number, prefer: number) {
  return clamp(prefer, r.y0 + hh, r.y1 - hh);
}

/** The desk top on the agent's right (BattleScene.drawRightSide): things "sit" on it. */
const DESK_TOP = BATTLE_FEET_Y - 34 + 16 - 4;

export interface LeakPlan {
  family: "leak";
  /** Where the papers start: the agent's hands. */
  from: { x: number; y: number };
  /** The faceless grey "?" person (an unknown-user badge) the papers fly into. */
  stranger: Part;
  /** End frame: the 5 envelopes/papers fanned in front of the silhouette. */
  papers: Part[];
}

export interface ReportPlan {
  family: "report";
  /** The mini bar chart (end frame: upside down, angle 180). */
  chart: Part;
  /** End frame: the 4 numbers lying under the chart. */
  nums: Part[];
}

export interface SystemPlan {
  family: "system";
  /** The small monitor (its red twin sits on top of it). */
  monitor: Part;
  /** The desk phone that rings, with its ring waves around it. */
  phone: Part;
  waves: Part;
  /** Where the 3 sparks burst from (the monitor's top right corner). */
  sparkFrom: { x: number; y: number };
}

export type VignettePlan = LeakPlan | ReportPlan | SystemPlan;

export function vignettePlan(family: VignetteFamily, r: Rect): VignettePlan {
  switch (family) {
    case "leak": {
      const S = VIG_SIZE.stranger;
      const sx = rightX(r, S.w / 2 + 6, 142);
      // It floats at chest height; the papers pile up in front of its lower half.
      const sy = fitY(r, S.h / 2 + 12, BATTLE_FEET_Y - 78);
      const papers: Part[] = [];
      for (let k = 0; k < 5; k++) {
        const size = k % 2 ? VIG_SIZE.paper : VIG_SIZE.envelope;
        papers.push({
          x: sx - 14 + k * 7,
          y: sy + 20 - Math.abs(k - 2) * 3,
          w: size.w,
          h: size.h,
          angle: -26 + k * 13,
        });
      }
      return {
        family,
        from: { x: 34, y: BATTLE_FEET_Y - 76 },
        stranger: { x: sx, y: sy, w: S.w, h: S.h },
        papers,
      };
    }
    case "report": {
      const C = VIG_SIZE.chart;
      // The chart turns through 90 degrees on its way upside down: keep its diagonal on screen.
      const half = Math.hypot(C.w, C.h) / 2;
      const cx = rightX(r, half, 140);
      const cy = fitY(r, half, BATTLE_FEET_Y - 88);
      // Tilted numbers: bound them by their diagonal.
      const nh = Math.hypot(SPILL_SIZE.w, SPILL_SIZE.h) / 2;
      const floor = Math.min(BATTLE_FEET_Y - 10, r.y1 - nh);
      const offs = [-40, -16, 6, 33];
      const nums = offs.map((dx, k) => ({
        x: clamp(cx + dx, r.x0 + nh, r.x1 - nh),
        y: floor - (k % 2) * 4,
        w: SPILL_SIZE.w,
        h: SPILL_SIZE.h,
        angle: [-14, 9, -6, 16][k],
      }));
      return { family, chart: { x: cx, y: cy, w: C.w, h: C.h, angle: 180 }, nums };
    }
    case "system": {
      const M = VIG_SIZE.monitor;
      const Ph = VIG_SIZE.phone;
      const W = VIG_SIZE.ringwave;
      const mx = rightX(r, M.w / 2, 142);
      // The phone sits on the desk; the monitor stands behind it, higher up.
      const py = fitY(r, Ph.h / 2, DESK_TOP - Ph.h / 2);
      const my = fitY(r, M.h / 2, py - Ph.h / 2 - M.h / 2 + 8);
      const px = rightX(r, W.w / 2, mx + 2);
      return {
        family,
        monitor: { x: mx, y: my, w: M.w, h: M.h },
        phone: { x: px, y: py, w: Ph.w, h: Ph.h },
        waves: { x: px, y: py - 2, w: W.w, h: W.h },
        sparkFrom: { x: mx + M.w / 2 - 8, y: my - M.h / 2 + 6 },
      };
    }
  }
}

/** Every piece of a plan with its box (rotated pieces use their diagonal as a square). */
export function planParts(p: VignettePlan): Part[] {
  switch (p.family) {
    case "leak":
      return [p.stranger, ...p.papers];
    case "report":
      return [p.chart, ...p.nums];
    case "system":
      return [p.monitor, p.phone, p.waves];
  }
}

/** Axis-aligned bounds of a part (a rotated part is bounded by a square of its diagonal). */
export function partRect(p: Part): Rect {
  const turned = p.angle !== undefined && Math.abs(p.angle % 180) > 0.01;
  const hw = turned ? Math.hypot(p.w, p.h) / 2 : p.w / 2;
  const hh = turned ? Math.hypot(p.w, p.h) / 2 : p.h / 2;
  return { x0: p.x - hw, y0: p.y - hh, x1: p.x + hw, y1: p.y + hh };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}
