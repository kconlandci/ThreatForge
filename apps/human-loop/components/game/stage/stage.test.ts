import { describe, expect, it } from "vitest";
import { HUB_TARGET_IDS } from "@/lib/game/hub";
import { HUB_MAP, HUB_WALKABLE, isWalkable } from "@/lib/game/hubMap";
import { tileToWorld, worldToTile, worldToGridFloat } from "./iso";
import { findPath, nearestWalkable } from "./pathfind";

describe("iso math", () => {
  it("round-trips tile centres and diamond edges", () => {
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const c = tileToWorld(x, y);
        expect(worldToTile(c.x, c.y)).toEqual({ x, y });
        // Just inside each diamond corner still maps to the same tile.
        expect(worldToTile(c.x, c.y - 15)).toEqual({ x, y });
        expect(worldToTile(c.x + 31, c.y)).toEqual({ x, y });
        expect(worldToTile(c.x - 31, c.y)).toEqual({ x, y });
        expect(worldToTile(c.x, c.y + 15)).toEqual({ x, y });
      }
    }
    const g = worldToGridFloat(0, 16);
    expect(g.x).toBeCloseTo(0);
    expect(g.y).toBeCloseTo(0);
  });
});

describe("pathfinding", () => {
  const grid = [
    [true, true, true],
    [true, false, true],
    [true, true, true],
  ];
  it("walks around blocks without cutting corners", () => {
    const p = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 });
    expect(p).not.toBeNull();
    expect(p![0]).toEqual({ x: 0, y: 0 });
    expect(p![p!.length - 1]).toEqual({ x: 2, y: 2 });
    for (let i = 1; i < p!.length; i++) {
      const a = p![i - 1];
      const b = p![i];
      expect(Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1).toBe(true);
      expect(grid[b.y][b.x]).toBe(true);
      if (a.x !== b.x && a.y !== b.y) {
        expect(grid[a.y][b.x] && grid[b.y][a.x]).toBe(true);
      }
    }
  });
  it("returns null for blocked goals", () => {
    expect(findPath(grid, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });
  it("finds the nearest walkable tile", () => {
    expect(nearestWalkable(grid, { x: 1, y: 1 }, { x: 0, y: 1 })).toEqual({ x: 0, y: 1 });
  });
  it("skips walkable tiles that cannot be reached", () => {
    const pocket = [
      [true, false, true],
      [false, false, true],
      [true, true, true],
    ];
    // (0,0) is walkable but sealed off; the nearest reachable tile to (0,1) is (0,2).
    expect(nearestWalkable(pocket, { x: 0, y: 1 }, { x: 2, y: 2 })).toEqual({ x: 0, y: 2 });
  });
});

describe("hub map", () => {
  it("has a walkable spawn", () => {
    expect(isWalkable(HUB_MAP.spawn)).toBe(true);
  });
  it("can reach every target's interaction tile from spawn", () => {
    for (const id of HUB_TARGET_IDS) {
      const spot = HUB_MAP.targets[id];
      expect(isWalkable(spot.tile), id).toBe(true);
      expect(findPath(HUB_WALKABLE, HUB_MAP.spawn, spot.tile), id).not.toBeNull();
    }
  });
  it("keeps every walkable tile connected", () => {
    for (let y = 0; y < HUB_MAP.rows; y++) {
      for (let x = 0; x < HUB_MAP.cols; x++) {
        if (!HUB_WALKABLE[y][x]) continue;
        expect(findPath(HUB_WALKABLE, HUB_MAP.spawn, { x, y }), `${x},${y}`).not.toBeNull();
      }
    }
  });
});
