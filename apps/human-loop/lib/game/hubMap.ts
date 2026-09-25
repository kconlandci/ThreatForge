/**
 * Hub room layout types for the Phaser stage (components/game/stage/HubScene). Each pathway has
 * its own map (lib/pathways/<id>/hubMap.ts).
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
import type { AgentMood } from "./bus";
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
  id: string;
  /** "agent" hops, wears the exclaim marker and its tap target starts the shift; "coach" talks. */
  role: "agent" | "coach";
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
  /** "antenna": a slow pulse (exactly one, on the agent). "led" (default): random blinks. */
  kind?: "antenna" | "led";
}

/** Colours of the room shell (HubScene draws the floor, walls and door with them). */
export interface HubTheme {
  tileA: number;
  tileB: number;
  grout: number;
  rug: number;
  rugLine: number;
  rugInner: number;
  slabL: number;
  slabR: number;
  slabBandL: number;
  slabBandR: number;
  wallR: number;
  bandR: number;
  baseR: number;
  wallL: number;
  bandL: number;
  baseL: number;
  rail: number;
  door: number;
  doorPanel: number;
  doorGlass: number;
  mat: number;
  doorSignLight: number;
  /** A keycard reader beside the door instead of a light switch. */
  keycardReader: boolean;
}

/** The Help Desk office colours (what HubScene has always drawn). */
export const DEFAULT_HUB_THEME: HubTheme = {
  tileA: 0xf5f8f7,
  tileB: 0xedf3f1,
  grout: 0xdbe5e2,
  rug: 0xd6e8e4,
  rugLine: 0x0f6a61,
  rugInner: 0xf26b1d,
  slabL: 0xc9d8d4,
  slabR: 0xadc1bc,
  slabBandL: 0x0f6a61,
  slabBandR: 0x0a4c45,
  wallR: 0xf8fafb,
  bandR: 0xe7f1ef,
  baseR: 0x0f6a61,
  wallL: 0xeef2f4,
  bandL: 0xdbe9e5,
  baseL: 0x0a4c45,
  rail: 0xc3d6d1,
  door: 0x0f6a61,
  doorPanel: 0x1b7a70,
  doorGlass: 0xcfe8f0,
  mat: 0x0a4c45,
  doorSignLight: 0x43e0c4,
  keycardReader: false,
};

export function hubTheme(map: HubMap): HubTheme {
  return { ...DEFAULT_HUB_THEME, ...(map.theme ?? {}) };
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
  /** Room colours over DEFAULT_HUB_THEME. */
  theme?: Partial<HubTheme>;
}

const key = (p: GridPos) => `${p.x},${p.y}`;

/** walkable[y][x]: true where the avatar may stand. */
export function buildWalkable(map: HubMap): boolean[][] {
  const grid = Array.from({ length: map.rows }, () => Array.from({ length: map.cols }, () => true));
  const block = (p: GridPos) => {
    if (p.y >= 0 && p.y < map.rows && p.x >= 0 && p.x < map.cols) grid[p.y][p.x] = false;
  };
  for (const prop of map.props) (prop.blocks ?? [prop.tile]).forEach(block);
  for (const c of map.characters) block(c.tile);
  return grid;
}

export function isWalkable(p: GridPos, walkable: boolean[][]): boolean {
  return p.y >= 0 && p.y < walkable.length && p.x >= 0 && p.x < walkable[0].length && walkable[p.y][p.x];
}

/** Target whose hot tile is p, if any. */
export function targetAtTile(p: GridPos, map: HubMap): HubTargetId | null {
  for (const [id, spot] of Object.entries(map.targets) as [HubTargetId, HubTargetSpot][]) {
    if (spot.hotTiles.some((t) => key(t) === key(p))) return id;
  }
  return null;
}

/** The hub character with this role (the agent NPC, or the coach). */
export function characterByRole(map: HubMap, role: HubCharacter["role"]): HubCharacter | undefined {
  return map.characters.find((c) => c.role === role);
}

/** What the Phaser stage needs from a pathway: its room, and whose art to show. */
export interface StageSetup {
  hubMap: HubMap;
  /** The agent's sprite key; battle portraits are `${agentSprite}-${mood}`. */
  agentSprite: SpriteKey;
  coachSprite: SpriteKey;
}

export const AGENT_MOODS: AgentMood[] = ["idle", "eager", "busted", "sad", "celebrate"];

/** The battle portrait for a mood. */
export function portraitKey(setup: Pick<StageSetup, "agentSprite">, mood: AgentMood): SpriteKey {
  return `${setup.agentSprite}-${mood}` as SpriteKey;
}

/**
 * Every sprite a pathway's stage draws: the map's props, characters and decor, the agent's 5
 * portraits, the player and the markers. The stage fetches and rasterizes only these.
 */
export function stageSprites(setup: StageSetup): SpriteKey[] {
  const keys = new Set<SpriteKey>();
  for (const p of setup.hubMap.props) keys.add(p.sprite);
  for (const c of setup.hubMap.characters) keys.add(c.sprite);
  for (const d of setup.hubMap.decor) keys.add(d.sprite);
  for (const m of AGENT_MOODS) keys.add(portraitKey(setup, m));
  keys.add(setup.coachSprite);
  keys.add("player");
  keys.add("marker-exclaim");
  keys.add("tap-ring");
  return [...keys];
}
