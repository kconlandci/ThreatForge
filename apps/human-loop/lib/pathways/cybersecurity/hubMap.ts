/**
 * Cybersecurity SOC hub: room layout for the Phaser stage (types and rules in lib/game/hubMap.ts).
 *
 * Same grid, wall height, door and rug as the Help Desk office, so the walk feels the same.
 * Grid coordinates are tile indices: x runs toward the lower right of the screen, y toward the
 * lower left. Tile (0,0) is the back corner where the two walls meet. The right back wall runs
 * along the y = 0 edge, the left back wall along x = 0. World units match lib/game/assets.ts.
 * Every target tile is walkable and reachable from the spawn (patch 3 steps, board 4, kofi 5,
 * locker 7, coffee 8).
 */
import type { HubMap } from "@/lib/game/hubMap";

export const CYBERSECURITY_HUB_MAP: HubMap = {
  cols: 8,
  rows: 8,
  wallHeight: 104,
  wallThickness: 0.2,
  door: { wall: "left", from: 5.25, to: 6.45 },
  rug: { x0: 3, y0: 4, x1: 5, y1: 6 },
  props: [
    // Along the right wall (fronts face into the room).
    { id: "server-rack", sprite: "server-rack", tile: { x: 0, y: 0 } },
    { id: "evidence-locker", sprite: "evidence-locker", tile: { x: 1, y: 0 }, target: "locker" },
    { id: "coffee-machine", sprite: "coffee-machine", tile: { x: 6, y: 0 }, target: "coffee" },
    { id: "plant-right", sprite: "plant", tile: { x: 7, y: 0 } },
    // Along the left wall. A plant (not a second rack) behind Kofi: his graphite jacket needs a light backdrop.
    { id: "plant-left", sprite: "plant", tile: { x: 0, y: 1 } },
    {
      id: "playbook-board",
      sprite: "playbook-board",
      tile: { x: 0, y: 3 },
      offset: { x: 4, y: 0 },
      target: "board",
      // 80px wide: it also covers the tile behind it.
      blocks: [{ x: 0, y: 3 }, { x: 0, y: 2 }],
    },
    { id: "plant-door", sprite: "plant", tile: { x: 0, y: 7 } },
    // Desks, and the tote of things Patch "quarantined", beside its desk.
    { id: "desk-patch", sprite: "desk-patch", tile: { x: 4, y: 3 }, target: "patch" },
    { id: "quarantine-tote", sprite: "quarantine-tote", tile: { x: 6, y: 3 }, target: "patch" },
    { id: "desk-player", sprite: "desk-soc", tile: { x: 2, y: 5 } },
    { id: "chair-player", sprite: "chair", tile: { x: 2, y: 6 }, offset: { x: 6, y: -8 }, blocks: [] },
  ],
  characters: [
    { id: "patch", role: "agent", sprite: "patch", tile: { x: 5, y: 2 }, facing: "left", target: "patch" },
    { id: "kofi", role: "coach", sprite: "kofi", tile: { x: 1, y: 2 }, facing: "right", target: "kofi" },
  ],
  decor: [
    { id: "clock", sprite: "wall-clock", wall: "right", along: 1.55, height: 86 },
    { id: "video-wall", sprite: "wall-video-wall", wall: "right", along: 3.75, height: 72 },
    { id: "alert-light", sprite: "wall-alert-light", wall: "right", along: 5.95, height: 88 },
    { id: "sign-lockout", sprite: "wall-sign-lockout", wall: "right", along: 7.05, height: 74 },
    { id: "poster-check", sprite: "wall-poster-check", wall: "left", along: 4.62, height: 64 },
  ],
  targets: {
    patch: { tile: { x: 4, y: 4 }, facing: "right", hotTiles: [{ x: 4, y: 3 }, { x: 5, y: 2 }, { x: 6, y: 3 }] },
    kofi: { tile: { x: 2, y: 2 }, facing: "left", hotTiles: [{ x: 1, y: 2 }] },
    board: { tile: { x: 1, y: 4 }, facing: "left", hotTiles: [{ x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }] },
    coffee: { tile: { x: 6, y: 1 }, facing: "right", hotTiles: [{ x: 6, y: 0 }] },
    locker: { tile: { x: 1, y: 1 }, facing: "right", hotTiles: [{ x: 1, y: 0 }] },
  },
  spawn: { x: 3, y: 6 },
  spawnFacing: "right",
  blinkLights: [
    // Patch's siren (patch.svg, 52 x 66).
    { on: "patch", x: 25.6, y: 7.4, color: 0xff8a3d, radius: 3.2, kind: "antenna" },
    // Alert beacon dome (wall-alert-light.svg, 24 x 32; decor images are named by their id).
    { on: "alert-light", x: 12.6, y: 12.4, color: 0xff8a3d, radius: 3.6 },
    // Video wall alert dots (wall-video-wall.svg, 112 x 106).
    { on: "video-wall", x: 31.4, y: 27.8, color: 0xff8a3d, radius: 1.6 },
    { on: "video-wall", x: 58.1, y: 38.95, color: 0xff8a3d, radius: 1.6 },
    // Evidence locker keypad LEDs (evidence-locker.svg, 52 x 94; door 3 is the sealed one).
    { on: "evidence-locker", x: 13, y: 35.5, color: 0x43e0c4, radius: 1.1 },
    { on: "evidence-locker", x: 13, y: 51.3, color: 0xff8a3d, radius: 1.1 },
    { on: "evidence-locker", x: 25.6, y: 57.6, color: 0x43e0c4, radius: 1.1 },
    { on: "evidence-locker", x: 25.6, y: 73.4, color: 0x43e0c4, radius: 1.1 },
    // Server rack status LEDs (server-rack.svg, 44 x 96), as in the Help Desk map.
    { on: "server-rack", x: 10.88, y: 19.88, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 34.88, color: 0xff8a3d, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 47.48, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 61.28, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 74.98, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 82.98, color: 0xff8a3d, radius: 1.3 },
  ],
  // SOC: a cooler raised floor with ink trim, still a bright white room; an orange door light and a keycard reader.
  theme: {
    tileA: 0xf3f6f8,
    tileB: 0xeaeff2,
    grout: 0xd5dde2,
    rug: 0xdde5e9,
    rugLine: 0x2b3238,
    rugInner: 0xf26b1d,
    slabL: 0xcdd6db,
    slabR: 0xb2bfc6,
    slabBandL: 0x2b3238,
    slabBandR: 0x1c2126,
    wallR: 0xf7f9fa,
    bandR: 0xe4eaee,
    baseR: 0x2b3238,
    wallL: 0xedf1f3,
    bandL: 0xd9e1e6,
    baseL: 0x1c2126,
    rail: 0xc8d2d8,
    door: 0x2b3238,
    doorPanel: 0x3a4149,
    doorGlass: 0xcfe8f0,
    mat: 0x1c2126,
    doorSignLight: 0xf26b1d,
    keycardReader: true,
  },
};
