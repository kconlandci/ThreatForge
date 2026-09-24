/**
 * Help Desk office hub: room layout data for the Phaser stage (components/game/stage/HubScene).
 *
 * Pure typed data (no Phaser). Grid coordinates are tile indices: x runs toward the lower
 * right of the screen, y toward the lower left. Tile (0,0) is the back corner where the two
 * walls meet. The right back wall runs along the y = 0 edge, the left back wall along x = 0.
 *
 * World units match lib/game/assets.ts (tile 64 x 32). A tile's floor centre is at
 *   worldX = (x - y) * 32,  worldY = (x + y + 1) * 16
 * (see components/game/stage/iso.ts).
 */
import type { SpriteKey } from "./assets";
import type { HubTargetId } from "./hub";

export interface GridPos {
  x: number;
  y: number;
}

/** Screen direction a character faces. The art faces right; "left" flips it. */
export type Facing = "left" | "right";

export interface HubProp {
  id: string;
  sprite: SpriteKey;
  /** Tile the sprite's floor anchor sits on. */
  tile: GridPos;
  /** Fine offset in world px from the tile centre. */
  offset?: { x: number; y: number };
  flipX?: boolean;
  /** Tiles this prop blocks. Defaults to its own tile. Empty array = walk-through (e.g. a chair). */
  blocks?: GridPos[];
  /** Tapping the prop means tapping this target. */
  target?: HubTargetId;
  /** Nudges depth sorting (world px) when a sprite overhangs its tile. */
  depthBias?: number;
}

export interface HubCharacter {
  id: "resetbot" | "dana";
  sprite: SpriteKey;
  tile: GridPos;
  offset?: { x: number; y: number };
  facing: Facing;
  target: HubTargetId;
}

export interface HubWallDecor {
  id: string;
  sprite: SpriteKey;
  wall: "left" | "right";
  /** Distance along the wall from the back corner, in tiles (0..cols / 0..rows). */
  along: number;
  /** Height of the sprite centre above the floor, world px. */
  height: number;
}

export interface HubTargetSpot {
  /** Walkable tile the avatar walks to. */
  tile: GridPos;
  /** Direction the avatar faces on arrival. */
  facing: Facing;
  /** Extra tiles that count as tapping this target (besides its sprites). */
  hotTiles: GridPos[];
}

/** A small light drawn over a sprite for idle life (sprite-local px, from the SVG viewBox). */
export interface HubBlinkLight {
  on: string;
  x: number;
  y: number;
  color: number;
  radius: number;
}

export interface HubMap {
  cols: number;
  rows: number;
  /** Wall height above the floor, world px. */
  wallHeight: number;
  /** Wall thickness, in tiles. */
  wallThickness: number;
  /** A closed door drawn on the left wall, from/to in tiles along the wall. */
  door: { wall: "left"; from: number; to: number };
  /** Rug drawn on the floor (inclusive tile rectangle). */
  rug: { x0: number; y0: number; x1: number; y1: number };
  props: HubProp[];
  characters: HubCharacter[];
  decor: HubWallDecor[];
  targets: Record<HubTargetId, HubTargetSpot>;
  spawn: GridPos;
  spawnFacing: Facing;
  blinkLights: HubBlinkLight[];
}

export const HUB_MAP: HubMap = {
  cols: 8,
  rows: 8,
  wallHeight: 104,
  wallThickness: 0.2,
  door: { wall: "left", from: 5.25, to: 6.45 },
  rug: { x0: 3, y0: 4, x1: 5, y1: 6 },
  props: [
    // Along the right wall (fronts face into the room).
    { id: "server-rack", sprite: "server-rack", tile: { x: 0, y: 0 } },
    { id: "printer", sprite: "printer", tile: { x: 2, y: 0 }, target: "printer" },
    { id: "coffee-machine", sprite: "coffee-machine", tile: { x: 4, y: 0 }, target: "coffee" },
    { id: "water-cooler", sprite: "water-cooler", tile: { x: 5, y: 0 } },
    { id: "plant-right", sprite: "plant", tile: { x: 7, y: 0 } },
    // Along the left wall.
    { id: "plant-left", sprite: "plant", tile: { x: 0, y: 1 } },
    {
      id: "whiteboard",
      sprite: "whiteboard",
      tile: { x: 0, y: 3 },
      offset: { x: 4, y: 0 },
      target: "whiteboard",
      // 80px wide: it also covers the tile behind it.
      blocks: [{ x: 0, y: 3 }, { x: 0, y: 2 }],
    },
    { id: "plant-door", sprite: "plant", tile: { x: 0, y: 7 } },
    // Desks.
    { id: "desk-resetbot", sprite: "desk-resetbot", tile: { x: 4, y: 3 }, target: "resetbot" },
    { id: "desk-player", sprite: "desk-monitor", tile: { x: 2, y: 5 } },
    { id: "chair-player", sprite: "chair", tile: { x: 2, y: 6 }, offset: { x: 6, y: -8 }, blocks: [] },
  ],
  characters: [
    { id: "resetbot", sprite: "resetbot", tile: { x: 5, y: 2 }, facing: "left", target: "resetbot" },
    { id: "dana", sprite: "dana", tile: { x: 1, y: 2 }, facing: "right", target: "dana" },
  ],
  decor: [
    { id: "window-r1", sprite: "wall-window-right", wall: "right", along: 1.5, height: 60 },
    { id: "poster", sprite: "wall-poster", wall: "right", along: 3.15, height: 62 },
    { id: "clock", sprite: "wall-clock", wall: "right", along: 4.55, height: 84 },
    { id: "window-r2", sprite: "wall-window-right", wall: "right", along: 6.2, height: 60 },
    { id: "window-l1", sprite: "wall-window-left", wall: "left", along: 1.9, height: 60 },
  ],
  targets: {
    resetbot: { tile: { x: 4, y: 4 }, facing: "right", hotTiles: [{ x: 4, y: 3 }, { x: 5, y: 2 }] },
    dana: { tile: { x: 2, y: 2 }, facing: "left", hotTiles: [{ x: 1, y: 2 }] },
    whiteboard: { tile: { x: 1, y: 4 }, facing: "left", hotTiles: [{ x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }] },
    coffee: { tile: { x: 3, y: 1 }, facing: "right", hotTiles: [{ x: 4, y: 0 }] },
    printer: { tile: { x: 2, y: 1 }, facing: "right", hotTiles: [{ x: 2, y: 0 }] },
  },
  spawn: { x: 3, y: 6 },
  spawnFacing: "right",
  blinkLights: [
    // ResetBot's antenna (resetbot.svg, 52 x 66).
    { on: "resetbot", x: 22, y: 3.4, color: 0xff8a3d, radius: 3.2 },
    // Server rack status LEDs (server-rack.svg, 44 x 96: front face is skewed, y += 0.5 * x).
    { on: "server-rack", x: 10.88, y: 19.88, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 34.88, color: 0xff8a3d, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 47.48, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 61.28, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 74.98, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 82.98, color: 0xff8a3d, radius: 1.3 },
  ],
};

const key = (p: GridPos) => `${p.x},${p.y}`;

/** walkable[y][x]: true where the avatar may stand. */
export function buildWalkable(map: HubMap = HUB_MAP): boolean[][] {
  const grid = Array.from({ length: map.rows }, () => Array.from({ length: map.cols }, () => true));
  const block = (p: GridPos) => {
    if (p.y >= 0 && p.y < map.rows && p.x >= 0 && p.x < map.cols) grid[p.y][p.x] = false;
  };
  for (const prop of map.props) (prop.blocks ?? [prop.tile]).forEach(block);
  for (const c of map.characters) block(c.tile);
  return grid;
}

export const HUB_WALKABLE: boolean[][] = buildWalkable();

export function isWalkable(p: GridPos, walkable: boolean[][] = HUB_WALKABLE): boolean {
  return p.y >= 0 && p.y < walkable.length && p.x >= 0 && p.x < walkable[0].length && walkable[p.y][p.x];
}

/** Target whose hot tile is p, if any. */
export function targetAtTile(p: GridPos, map: HubMap = HUB_MAP): HubTargetId | null {
  for (const [id, spot] of Object.entries(map.targets) as [HubTargetId, HubTargetSpot][]) {
    if (spot.hotTiles.some((t) => key(t) === key(p))) return id;
  }
  return null;
}
