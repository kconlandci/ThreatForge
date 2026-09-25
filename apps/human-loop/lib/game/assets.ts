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
  /**
   * What the sprite is: hub characters, large battle portraits (rasterized at battle scale),
   * iso props, flat wall decor, or small UI markers. Placeholders are drawn by kind and tone.
   */
  kind?: "character" | "portrait" | "prop" | "decor" | "marker";
  /** Characters and portraits: who it is (sets the placeholder colours). */
  tone?: "agent" | "coach" | "player";
}

const S = "/game/sprites/";

export const SPRITES = {
  // Characters (hub scale). Drawn facing south-east (toward the viewer, to the right); the stage flips X for south-west.
  player: { key: "player", file: `${S}player.svg`, w: 40, h: 72, originX: 0.5, originY: 0.94, kind: "character", tone: "player" },
  dana: { key: "dana", file: `${S}dana.svg`, w: 40, h: 74, originX: 0.5, originY: 0.94, kind: "character", tone: "coach" },
  ollie: { key: "ollie", file: `${S}ollie.svg`, w: 52, h: 66, originX: 0.5, originY: 0.92, kind: "character", tone: "agent" },
  // Cybersecurity (SOC) cast. Patch has Ollie's exact size and origin, so the exclaim marker and hop work unchanged.
  patch: { key: "patch", file: `${S}patch.svg`, w: 52, h: 66, originX: 0.5, originY: 0.92, kind: "character", tone: "agent" },
  kofi: { key: "kofi", file: `${S}kofi.svg`, w: 40, h: 74, originX: 0.5, originY: 0.94, kind: "character", tone: "coach" },

  // Ollie battle portraits (large, same framing so they can be swapped in place).
  "ollie-idle": { key: "ollie-idle", file: `${S}ollie-idle.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "ollie-eager": { key: "ollie-eager", file: `${S}ollie-eager.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "ollie-busted": { key: "ollie-busted", file: `${S}ollie-busted.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "ollie-sad": { key: "ollie-sad", file: `${S}ollie-sad.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "ollie-celebrate": { key: "ollie-celebrate", file: `${S}ollie-celebrate.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },

  // Patch battle portraits (same 220 x 220 framing as Ollie's, feet at y 209, so they swap in place).
  "patch-idle": { key: "patch-idle", file: `${S}patch-idle.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "patch-eager": { key: "patch-eager", file: `${S}patch-eager.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "patch-busted": { key: "patch-busted", file: `${S}patch-busted.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "patch-sad": { key: "patch-sad", file: `${S}patch-sad.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "patch-celebrate": { key: "patch-celebrate", file: `${S}patch-celebrate.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },

  // Office props (isometric, lit from the upper left: top face lightest, left face mid, right face darkest).
  "desk-monitor": { key: "desk-monitor", file: `${S}desk-monitor.svg`, w: 84, h: 78, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },
  "desk-ollie": { key: "desk-ollie", file: `${S}desk-ollie.svg`, w: 84, h: 78, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },
  chair: { key: "chair", file: `${S}chair.svg`, w: 34, h: 44, originX: 0.5, originY: 0.85, kind: "prop" },
  plant: { key: "plant", file: `${S}plant.svg`, w: 36, h: 64, originX: 0.5, originY: 0.92, footprint: { w: 1, h: 1 }, kind: "prop" },
  "coffee-machine": { key: "coffee-machine", file: `${S}coffee-machine.svg`, w: 48, h: 76, originX: 0.5, originY: 0.9, footprint: { w: 1, h: 1 }, kind: "prop" },
  whiteboard: { key: "whiteboard", file: `${S}whiteboard.svg`, w: 80, h: 84, originX: 0.5, originY: 0.9, footprint: { w: 1, h: 1 }, kind: "prop" },
  printer: { key: "printer", file: `${S}printer.svg`, w: 60, h: 56, originX: 0.5, originY: 0.85, footprint: { w: 1, h: 1 }, kind: "prop" },
  "server-rack": { key: "server-rack", file: `${S}server-rack.svg`, w: 44, h: 96, originX: 0.5, originY: 0.92, footprint: { w: 1, h: 1 }, kind: "prop" },
  "water-cooler": { key: "water-cooler", file: `${S}water-cooler.svg`, w: 30, h: 70, originX: 0.5, originY: 0.92, footprint: { w: 1, h: 1 }, kind: "prop" },

  // SOC props (iso, lit from the upper left; the anchor is the floor point under the footprint's middle).
  "desk-patch": { key: "desk-patch", file: `${S}desk-patch.svg`, w: 84, h: 78, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },
  "desk-soc": { key: "desk-soc", file: `${S}desk-soc.svg`, w: 84, h: 78, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },
  "evidence-locker": { key: "evidence-locker", file: `${S}evidence-locker.svg`, w: 52, h: 94, originX: 0.5, originY: 0.83, footprint: { w: 1, h: 1 }, kind: "prop" },
  "quarantine-tote": { key: "quarantine-tote", file: `${S}quarantine-tote.svg`, w: 50, h: 56, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },
  "playbook-board": { key: "playbook-board", file: `${S}playbook-board.svg`, w: 80, h: 84, originX: 0.5, originY: 0.9, footprint: { w: 1, h: 1 }, kind: "prop" },

  // Wall decor, drawn flat against the back walls.
  "wall-window-left": { key: "wall-window-left", file: `${S}wall-window-left.svg`, w: 72, h: 76, originX: 0.5, originY: 0.5, kind: "decor" },
  "wall-window-right": { key: "wall-window-right", file: `${S}wall-window-right.svg`, w: 72, h: 76, originX: 0.5, originY: 0.5, kind: "decor" },
  "wall-poster": { key: "wall-poster", file: `${S}wall-poster.svg`, w: 44, h: 58, originX: 0.5, originY: 0.5, kind: "decor" },
  "wall-clock": { key: "wall-clock", file: `${S}wall-clock.svg`, w: 30, h: 34, originX: 0.5, originY: 0.5, kind: "decor" },

  // SOC wall decor. Right wall: video wall, alert light, lockout sign. Left wall: check-first poster.
  "wall-video-wall": { key: "wall-video-wall", file: `${S}wall-video-wall.svg`, w: 112, h: 106, originX: 0.491, originY: 0.5, kind: "decor" },
  "wall-alert-light": { key: "wall-alert-light", file: `${S}wall-alert-light.svg`, w: 24, h: 32, originX: 0.5, originY: 0.66, kind: "decor" },
  "wall-sign-lockout": { key: "wall-sign-lockout", file: `${S}wall-sign-lockout.svg`, w: 40, h: 50, originX: 0.5, originY: 0.5, kind: "decor" },
  "wall-poster-check": { key: "wall-poster-check", file: `${S}wall-poster-check.svg`, w: 44, h: 58, originX: 0.5, originY: 0.5, kind: "decor" },

  // Cloud & Network (NOC) cast. Nimbus has Ollie's and Patch's exact size and origin, so the exclaim
  // marker and hop work unchanged. It floats: the floor shadow sits at the origin, the cloud above it.
  nimbus: { key: "nimbus", file: `${S}nimbus.svg`, w: 52, h: 66, originX: 0.5, originY: 0.92, kind: "character", tone: "agent" },
  nadia: { key: "nadia", file: `${S}nadia.svg`, w: 40, h: 74, originX: 0.5, originY: 0.94, kind: "character", tone: "coach" },

  // Nimbus battle portraits (same 220 x 220 framing as Ollie's and Patch's, floor at y 209, so they swap in place).
  "nimbus-idle": { key: "nimbus-idle", file: `${S}nimbus-idle.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "nimbus-eager": { key: "nimbus-eager", file: `${S}nimbus-eager.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "nimbus-busted": { key: "nimbus-busted", file: `${S}nimbus-busted.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "nimbus-sad": { key: "nimbus-sad", file: `${S}nimbus-sad.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "nimbus-celebrate": { key: "nimbus-celebrate", file: `${S}nimbus-celebrate.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },

  // NOC props (iso, lit from the upper left; the anchor is the floor point under the footprint's middle).
  "desk-nimbus": { key: "desk-nimbus", file: `${S}desk-nimbus.svg`, w: 84, h: 78, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },
  "desk-noc": { key: "desk-noc", file: `${S}desk-noc.svg`, w: 84, h: 78, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },
  // Same box as server-rack (front on the SW face: right wall), so the two stand side by side.
  "network-rack": { key: "network-rack", file: `${S}network-rack.svg`, w: 44, h: 96, originX: 0.5, originY: 0.92, footprint: { w: 1, h: 1 }, kind: "prop" },
  // Left wall only: its front is the SE face.
  "cooling-unit": { key: "cooling-unit", file: `${S}cooling-unit.svg`, w: 40, h: 82, originX: 0.5, originY: 0.88, footprint: { w: 1, h: 1 }, kind: "prop" },
  "cleanup-cart": { key: "cleanup-cart", file: `${S}cleanup-cart.svg`, w: 52, h: 60, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },
  "change-board": { key: "change-board", file: `${S}change-board.svg`, w: 80, h: 84, originX: 0.5, originY: 0.9, footprint: { w: 1, h: 1 }, kind: "prop" },

  // NOC wall decor. Right wall: status wall, CHANGE WINDOW sign. Left wall: "Can we undo it?" poster.
  "wall-status-wall": { key: "wall-status-wall", file: `${S}wall-status-wall.svg`, w: 112, h: 106, originX: 0.491, originY: 0.5, kind: "decor" },
  "wall-sign-window": { key: "wall-sign-window", file: `${S}wall-sign-window.svg`, w: 40, h: 44, originX: 0.5, originY: 0.5, kind: "decor" },
  "wall-poster-undo": { key: "wall-poster-undo", file: `${S}wall-poster-undo.svg`, w: 44, h: 58, originX: 0.5, originY: 0.5, kind: "decor" },

  // Full-Stack Development (app team) cast. Piper has Ollie's, Patch's and Nimbus's exact size and origin,
  // so the exclaim marker and hop work unchanged. It rolls on one ball: the ball's floor point is the origin.
  piper: { key: "piper", file: `${S}piper.svg`, w: 52, h: 66, originX: 0.5, originY: 0.92, kind: "character", tone: "agent" },
  leo: { key: "leo", file: `${S}leo.svg`, w: 40, h: 74, originX: 0.5, originY: 0.94, kind: "character", tone: "coach" },

  // Piper battle portraits (same 220 x 220 framing as the other agents, floor at y 209, so they swap in place).
  "piper-idle": { key: "piper-idle", file: `${S}piper-idle.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "piper-eager": { key: "piper-eager", file: `${S}piper-eager.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "piper-busted": { key: "piper-busted", file: `${S}piper-busted.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "piper-sad": { key: "piper-sad", file: `${S}piper-sad.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },
  "piper-celebrate": { key: "piper-celebrate", file: `${S}piper-celebrate.svg`, w: 220, h: 220, originX: 0.5, originY: 0.95, kind: "portrait", tone: "agent" },

  // App team props (iso, lit from the upper left; the anchor is the floor point under the footprint's middle).
  // Piper's desk is a standing desk: taller than the other desks (84 x 92), same desk top and footprint.
  "desk-piper": { key: "desk-piper", file: `${S}desk-piper.svg`, w: 84, h: 92, originX: 0.5, originY: 0.83, footprint: { w: 1, h: 1 }, kind: "prop" },
  "desk-dev": { key: "desk-dev", file: `${S}desk-dev.svg`, w: 84, h: 78, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },
  "sprint-board": { key: "sprint-board", file: `${S}sprint-board.svg`, w: 80, h: 84, originX: 0.5, originY: 0.9, footprint: { w: 1, h: 1 }, kind: "prop" },
  "ship-box": { key: "ship-box", file: `${S}ship-box.svg`, w: 52, h: 60, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },
  beanbag: { key: "beanbag", file: `${S}beanbag.svg`, w: 44, h: 40, originX: 0.5, originY: 0.8, footprint: { w: 1, h: 1 }, kind: "prop" },

  // App team wall decor. Right wall: deploy board, DAYS SINCE A BROKEN BUILD sign. Left wall: CODE FREEZE
  // calendar and the "Does it match?" poster.
  "wall-deploy-board": { key: "wall-deploy-board", file: `${S}wall-deploy-board.svg`, w: 112, h: 106, originX: 0.491, originY: 0.5, kind: "decor" },
  "wall-sign-days": { key: "wall-sign-days", file: `${S}wall-sign-days.svg`, w: 40, h: 50, originX: 0.5, originY: 0.5, kind: "decor" },
  "wall-calendar-freeze": { key: "wall-calendar-freeze", file: `${S}wall-calendar-freeze.svg`, w: 40, h: 50, originX: 0.5, originY: 0.5, kind: "decor" },
  "wall-poster-match": { key: "wall-poster-match", file: `${S}wall-poster-match.svg`, w: 44, h: 58, originX: 0.5, originY: 0.5, kind: "decor" },

  // Small UI markers used in the stage.
  "marker-exclaim": { key: "marker-exclaim", file: `${S}marker-exclaim.svg`, w: 24, h: 30, originX: 0.5, originY: 1, kind: "marker" },
  "tap-ring": { key: "tap-ring", file: `${S}tap-ring.svg`, w: 48, h: 24, originX: 0.5, originY: 0.5, kind: "marker" },
} as const satisfies Record<string, SpriteDef>;

export type SpriteKey = keyof typeof SPRITES;

export const ISO_TILE = { w: 64, h: 32 } as const;
