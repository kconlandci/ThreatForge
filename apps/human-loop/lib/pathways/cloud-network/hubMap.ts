/**
 * Cloud & Network NOC hub: room layout for the Phaser stage (types and rules in lib/game/hubMap.ts).
 *
 * Same grid, wall height, door, rug and spawn as the Help Desk office and the SOC, so the walk feels
 * the same. Grid coordinates are tile indices: x runs toward the lower right of the screen, y toward
 * the lower left. Tile (0,0) is the back corner where the two walls meet. The right back wall runs
 * along the y = 0 edge, the left back wall along x = 0. World units match lib/game/assets.ts.
 * Every target tile is walkable and reachable from the spawn (nimbus 3 steps, board 4, nadia 5,
 * cart 5, coffee 8).
 */
import type { HubMap } from "@/lib/game/hubMap";

export const CLOUD_NETWORK_HUB_MAP: HubMap = {
  cols: 8,
  rows: 8,
  wallHeight: 104,
  wallThickness: 0.2,
  door: { wall: "left", from: 5.25, to: 6.45 },
  rug: { x0: 3, y0: 4, x1: 5, y1: 6 },
  props: [
    // Along the right wall: two racks side by side in the back corner, then coffee and a plant.
    { id: "server-rack", sprite: "server-rack", tile: { x: 0, y: 0 } },
    { id: "network-rack", sprite: "network-rack", tile: { x: 1, y: 0 } },
    { id: "coffee-machine", sprite: "coffee-machine", tile: { x: 6, y: 0 }, target: "coffee" },
    { id: "plant-right", sprite: "plant", tile: { x: 7, y: 0 } },
    // Along the left wall. The pale cooling unit (not a rack) stands behind Nadia: her dark teal hijab needs a light backdrop.
    { id: "cooling-unit", sprite: "cooling-unit", tile: { x: 0, y: 1 } },
    {
      id: "change-board",
      sprite: "change-board",
      tile: { x: 0, y: 3 },
      offset: { x: 4, y: 0 },
      target: "board",
      // 80px wide: it also covers the tile behind it.
      blocks: [{ x: 0, y: 3 }, { x: 0, y: 2 }],
    },
    { id: "plant-door", sprite: "plant", tile: { x: 0, y: 7 } },
    // Desks, and the cart of things Nimbus wants to delete, beside its desk.
    { id: "desk-nimbus", sprite: "desk-nimbus", tile: { x: 4, y: 3 }, target: "nimbus" },
    { id: "cleanup-cart", sprite: "cleanup-cart", tile: { x: 6, y: 3 }, target: "cart" },
    { id: "desk-player", sprite: "desk-noc", tile: { x: 2, y: 5 } },
    { id: "chair-player", sprite: "chair", tile: { x: 2, y: 6 }, offset: { x: 6, y: -8 }, blocks: [] },
  ],
  characters: [
    { id: "nimbus", role: "agent", sprite: "nimbus", tile: { x: 5, y: 2 }, facing: "left", target: "nimbus" },
    { id: "nadia", role: "coach", sprite: "nadia", tile: { x: 1, y: 2 }, facing: "right", target: "nadia" },
  ],
  decor: [
    { id: "status-wall", sprite: "wall-status-wall", wall: "right", along: 3.75, height: 72 },
    { id: "clock", sprite: "wall-clock", wall: "right", along: 5.95, height: 88 },
    { id: "sign-window", sprite: "wall-sign-window", wall: "right", along: 7.05, height: 76 },
    { id: "poster-undo", sprite: "wall-poster-undo", wall: "left", along: 4.62, height: 64 },
  ],
  targets: {
    nimbus: { tile: { x: 4, y: 4 }, facing: "right", hotTiles: [{ x: 4, y: 3 }, { x: 5, y: 2 }] },
    nadia: { tile: { x: 2, y: 2 }, facing: "left", hotTiles: [{ x: 1, y: 2 }] },
    board: { tile: { x: 1, y: 4 }, facing: "left", hotTiles: [{ x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }] },
    coffee: { tile: { x: 6, y: 1 }, facing: "right", hotTiles: [{ x: 6, y: 0 }] },
    cart: { tile: { x: 6, y: 4 }, facing: "right", hotTiles: [{ x: 6, y: 3 }] },
  },
  spawn: { x: 3, y: 6 },
  spawnFacing: "right",
  blinkLights: [
    // Nimbus's crown gem (nimbus.svg, 52 x 66): the one slow "antenna" pulse.
    { on: "nimbus", x: 24.39, y: 10.42, color: 0xff8a3d, radius: 2.6, kind: "antenna" },
    // Network rack (network-rack.svg, 44 x 96): switch ports, router, UPS.
    { on: "network-rack", x: 10.33, y: 28.01, color: 0x43e0c4, radius: 1.1 },
    { on: "network-rack", x: 13.01, y: 29.35, color: 0xff8a3d, radius: 1.1 },
    { on: "network-rack", x: 15.69, y: 48.09, color: 0xff8a3d, radius: 1.1 },
    { on: "network-rack", x: 18.37, y: 49.43, color: 0x43e0c4, radius: 1.1 },
    { on: "network-rack", x: 12.68, y: 70.58, color: 0xff8a3d, radius: 1.1 },
    { on: "network-rack", x: 18.48, y: 81.38, color: 0x43e0c4, radius: 1.1 },
    // Server rack status LEDs (server-rack.svg, 44 x 96), as in the other rooms.
    { on: "server-rack", x: 10.88, y: 19.88, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 34.88, color: 0xff8a3d, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 47.48, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 61.28, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 74.98, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 82.98, color: 0xff8a3d, radius: 1.3 },
    // Status wall (wall-status-wall.svg, 112 x 106; decor images are named by their id): the rising
    // ERRORS line and the degraded PD link.
    { on: "status-wall", x: 103.2, y: 61.1, color: 0xff8a3d, radius: 1.6 },
    { on: "status-wall", x: 66.4, y: 48.7, color: 0xff8a3d, radius: 1.4 },
    // CHANGE WINDOW sign lamp (wall-sign-window.svg, 40 x 44) and the cooling unit's LED (40 x 82).
    { on: "sign-window", x: 34.4, y: 21.1, color: 0xff8a3d, radius: 1.8 },
    { on: "cooling-unit", x: 31.6, y: 22.96, color: 0x43e0c4, radius: 1 },
  ],
  // NOC: a cool raised floor with deep-teal trim, still a bright white room; a teal door light and a keycard reader.
  theme: {
    tileA: 0xf2f6f7,
    tileB: 0xe6eef0,
    grout: 0xcfdbdf,
    rug: 0xd8e8e6,
    rugLine: 0x083b36,
    rugInner: 0xf26b1d,
    slabL: 0xc4d3d6,
    slabR: 0xa7bbbf,
    slabBandL: 0x083b36,
    slabBandR: 0x062b27,
    wallR: 0xf6f9fa,
    bandR: 0xdfebeb,
    baseR: 0x083b36,
    wallL: 0xecf2f3,
    bandL: 0xd1e1e1,
    baseL: 0x062b27,
    rail: 0xbdd2d2,
    door: 0x083b36,
    doorPanel: 0x0a4c45,
    doorGlass: 0xcfe8f0,
    mat: 0x062b27,
    doorSignLight: 0x43e0c4,
    keycardReader: true,
  },
};
