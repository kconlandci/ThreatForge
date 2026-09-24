/**
 * Sprite manifest — the contract between the art (SVG files in public/game/sprites)
 * and the Phaser stage.
 *
 * World units: the isometric tile is 64 x 32 world px (2:1 dimetric). Phaser renders at
 * devicePixelRatio, so each SVG is rasterized at w*dpr x h*dpr (see PhaserStage); SVGs must
 * therefore use viewBox="0 0 w h" with exactly these w/h so they stay crisp at 3x.
 *
 * origin: the anchor (0..1) that sits on the object's floor point: for props and characters
 * this is the middle of their footprint on the floor (usually near the bottom).
 */
export interface SpriteDef {
  key: string;
  file: string;
  w: number;
  h: number;
  originX: number;
  originY: number;
  /** Grid footprint in tiles (props only), used to block walking. */
  footprint?: { w: number; h: number };
}

const S = "/game/sprites/";

export const SPRITES = {
  // Characters (hub scale). Drawn facing south-east (toward the viewer, to the right); the stage flips X for south-west.
  player: { key: "player", file: `${S}player.svg`, w: 40, h: 72, originX: 0.5, originY: 0.94 },
  dana: { key: "dana", file: `${S}dana.svg`, w: 40, h: 74, originX: 0.5, originY: 0.94 },
  resetbot: { key: "resetbot", file: `${S}resetbot.svg`, w: 52, h: 66, originX: 0.5, originY: 0.92 },

  // ResetBot battle portraits (large, same framing so they can be swapped in place).
  "resetbot-idle": { key: "resetbot-idle", file: `${S}resetbot-idle.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95 },
  "resetbot-eager": { key: "resetbot-eager", file: `${S}resetbot-eager.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95 },
  "resetbot-busted": { key: "resetbot-busted", file: `${S}resetbot-busted.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95 },
  "resetbot-sad": { key: "resetbot-sad", file: `${S}resetbot-sad.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95 },
  "resetbot-celebrate": { key: "resetbot-celebrate", file: `${S}resetbot-celebrate.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95 },

  // Office props (isometric, lit from the upper left: top face lightest, left face mid, right face darkest).
  "desk-monitor": { key: "desk-monitor", file: `${S}desk-monitor.svg`, w: 84, h: 78, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 } },
  "desk-resetbot": { key: "desk-resetbot", file: `${S}desk-resetbot.svg`, w: 84, h: 78, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 } },
  chair: { key: "chair", file: `${S}chair.svg`, w: 34, h: 44, originX: 0.5, originY: 0.85 },
  plant: { key: "plant", file: `${S}plant.svg`, w: 36, h: 64, originX: 0.5, originY: 0.92, footprint: { w: 1, h: 1 } },
  "coffee-machine": { key: "coffee-machine", file: `${S}coffee-machine.svg`, w: 48, h: 76, originX: 0.5, originY: 0.9, footprint: { w: 1, h: 1 } },
  whiteboard: { key: "whiteboard", file: `${S}whiteboard.svg`, w: 80, h: 84, originX: 0.5, originY: 0.9, footprint: { w: 1, h: 1 } },
  printer: { key: "printer", file: `${S}printer.svg`, w: 60, h: 56, originX: 0.5, originY: 0.85, footprint: { w: 1, h: 1 } },
  "server-rack": { key: "server-rack", file: `${S}server-rack.svg`, w: 44, h: 96, originX: 0.5, originY: 0.92, footprint: { w: 1, h: 1 } },
  "water-cooler": { key: "water-cooler", file: `${S}water-cooler.svg`, w: 30, h: 70, originX: 0.5, originY: 0.92, footprint: { w: 1, h: 1 } },

  // Wall decor, drawn flat against the back walls.
  "wall-window-left": { key: "wall-window-left", file: `${S}wall-window-left.svg`, w: 72, h: 76, originX: 0.5, originY: 0.5 },
  "wall-window-right": { key: "wall-window-right", file: `${S}wall-window-right.svg`, w: 72, h: 76, originX: 0.5, originY: 0.5 },
  "wall-poster": { key: "wall-poster", file: `${S}wall-poster.svg`, w: 44, h: 58, originX: 0.5, originY: 0.5 },
  "wall-clock": { key: "wall-clock", file: `${S}wall-clock.svg`, w: 30, h: 34, originX: 0.5, originY: 0.5 },

  // Small UI markers used in the stage.
  "marker-exclaim": { key: "marker-exclaim", file: `${S}marker-exclaim.svg`, w: 24, h: 30, originX: 0.5, originY: 1 },
  "tap-ring": { key: "tap-ring", file: `${S}tap-ring.svg`, w: 48, h: 24, originX: 0.5, originY: 0.5 },
} as const satisfies Record<string, SpriteDef>;

export type SpriteKey = keyof typeof SPRITES;

export const ISO_TILE = { w: 64, h: 32 } as const;
