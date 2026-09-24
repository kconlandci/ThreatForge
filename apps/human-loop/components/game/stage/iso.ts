/**
 * Isometric (2:1 dimetric) math for the hub. Pure functions, no Phaser.
 * Tile (0,0)'s top vertex sits at world (0,0); +x goes down-right, +y goes down-left.
 */
import { ISO_TILE } from "@/lib/game/assets";
import type { GridPos } from "@/lib/game/hubMap";

export const HALF_W = ISO_TILE.w / 2; // 32
export const HALF_H = ISO_TILE.h / 2; // 16

export interface Vec {
  x: number;
  y: number;
}

/** World position of a (possibly fractional) grid point's floor centre. */
export function tileToWorld(gx: number, gy: number): Vec {
  return { x: (gx - gy) * HALF_W, y: (gx + gy + 1) * HALF_H };
}

/** Grid vertex (tile corner) position: vertex (0,0) is the room's back corner. */
export function vertexToWorld(gx: number, gy: number): Vec {
  return { x: (gx - gy) * HALF_W, y: (gx + gy) * HALF_H };
}

/** Fractional grid coords of a world point (inverse of tileToWorld). */
export function worldToGridFloat(wx: number, wy: number): Vec {
  const a = wx / HALF_W; // gx - gy
  const b = wy / HALF_H - 1; // gx + gy
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Tile containing a world point (the diamond it falls in). */
export function worldToTile(wx: number, wy: number): GridPos {
  const g = worldToGridFloat(wx, wy);
  // "+ 0" turns -0 into 0.
  return { x: Math.round(g.x) + 0, y: Math.round(g.y) + 0 };
}

/** Depth for iso sorting: the floor point's world y (plus a tiny x tie-breaker). */
export function isoDepth(wx: number, wy: number): number {
  return wy + wx * 0.001;
}

/** The four corners of a tile's floor diamond (top, right, bottom, left). */
export function tileDiamond(gx: number, gy: number, inset = 0): Vec[] {
  const c = tileToWorld(gx, gy);
  const hw = HALF_W - inset * 2;
  const hh = HALF_H - inset;
  return [
    { x: c.x, y: c.y - hh },
    { x: c.x + hw, y: c.y },
    { x: c.x, y: c.y + hh },
    { x: c.x - hw, y: c.y },
  ];
}
