/**
 * World bounds and camera fit for each scene. Pure math, shared by the boot scene (to pick
 * raster scales before loading art) and the scenes themselves.
 */
import type { HubMap } from "@/lib/game/hubMap";
import { HALF_H, HALF_W } from "./iso";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Floor slab thickness under the room, world px. */
export const HUB_SLAB = 12;

/** World bounds of a hub room (walls, floor and slab included). */
export function hubBounds(map: Pick<HubMap, "cols" | "rows" | "wallHeight" | "wallThickness">): Bounds {
  const cap = map.wallThickness;
  return {
    minX: -map.rows * HALF_W - cap * HALF_W - 4,
    maxX: map.cols * HALF_W + cap * HALF_W + 4,
    minY: -map.wallHeight - cap * HALF_H * 2 - 6,
    maxY: (map.cols + map.rows) * HALF_H + HUB_SLAB + 10,
  };
}

/** Largest zoom (CSS px per world px) at which the room fits with margins. */
export function hubFit(cssW: number, cssH: number, bounds: Bounds): number {
  const m = Math.min(28, Math.max(8, Math.min(cssW, cssH) * 0.035));
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  const fit = Math.min((cssW - m * 2) / bw, (cssH - m * 2) / bh);
  return Math.min(2.6, Math.max(0.2, fit));
}

/**
 * Tall phone boxes: the whole-room fit leaves the room small with empty bands above and below.
 * Zoom in (up to 1.55x) and let the camera follow the avatar sideways instead (the player can also
 * drag to look around, and every spot is in the Office list).
 */
export function hubPortraitZoom(cssW: number, cssH: number, bounds: Bounds): number {
  if (cssH < cssW * 1.25) return 1;
  const base = hubFit(cssW, cssH, bounds);
  const m = Math.min(28, Math.max(8, Math.min(cssW, cssH) * 0.035));
  const heightFit = ((cssH - m * 2) / (bounds.maxY - bounds.minY)) * 0.78;
  return Math.max(1, Math.min(1.55, heightFit / base));
}

export function hubFocus(bounds: Bounds) {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

/** Battle: the agent's feet sit at (0, BATTLE_FEET_Y); the portrait is 220 world px tall. */
export const BATTLE_FEET_Y = 110;
export const BATTLE_BOX = { w: 300, h: 244, cx: 0, cy: 6 };

export function battleFit(cssW: number, cssH: number): number {
  const fit = Math.min(cssW / BATTLE_BOX.w, cssH / BATTLE_BOX.h);
  return Math.min(3, Math.max(0.2, fit));
}

/** Raster scale (device px per world px) for art shown at `worldScale`, rounded up to 0.25 steps. */
export function rasterFor(dpr: number, fit: number, worldScale = 1, max = 4): number {
  const s = dpr * fit * worldScale;
  return Math.min(max, Math.max(1, Math.ceil(s * 4) / 4));
}
