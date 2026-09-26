/**
 * Business Analyst analytics and business team room: room layout for the Phaser stage (types and rules in
 * lib/game/hubMap.ts).
 *
 * Same grid, wall height, door, rug and spawn as the Help Desk office, the SOC, the NOC and the app team
 * room, so the walk feels the same. Grid coordinates are tile indices: x runs toward the lower right of
 * the screen, y toward the lower left. Tile (0,0) is the back corner where the two walls meet. The right
 * back wall runs along the y = 0 edge, the left back wall along x = 0. World units match lib/game/assets.ts.
 * Every target tile is walkable and reachable from the spawn (findPath moves: quill 2, board 4,
 * marisol 4, coffee 5, cabinet 6). 50 walkable tiles, all connected.
 */
import type { HubMap } from "@/lib/game/hubMap";

export const BUSINESS_ANALYST_HUB_MAP: HubMap = {
  cols: 8,
  rows: 8,
  wallHeight: 104,
  wallThickness: 0.2,
  door: { wall: "left", from: 5.25, to: 6.45 },
  rug: { x0: 3, y0: 4, x1: 5, y1: 6 },
  props: [
    // Along the right wall: the database server in the back corner, the DATA filing cabinet (drawers RAW,
    // CLEAN, BACKUP), the OUTLIERS shredder under the KPI board's left end, coffee and a plant. (3,0) stays
    // empty: it is straight above Quill on screen, so the "!" marker would sit on it.
    { id: "server-rack", sprite: "server-rack", tile: { x: 0, y: 0 } },
    { id: "data-cabinet", sprite: "data-cabinet", tile: { x: 1, y: 0 }, target: "cabinet" },
    { id: "shredder", sprite: "shredder", tile: { x: 2, y: 0 } },
    { id: "coffee-machine", sprite: "coffee-machine", tile: { x: 6, y: 0 }, target: "coffee" },
    { id: "plant-right", sprite: "plant", tile: { x: 7, y: 0 } },
    // Along the left wall: a plant under the projector screen, the requirements board, a plant by the door.
    { id: "plant-left", sprite: "plant", tile: { x: 0, y: 1 } },
    {
      id: "requirements-board",
      sprite: "requirements-board",
      tile: { x: 0, y: 3 },
      offset: { x: 4, y: 0 },
      target: "board",
      // 80px wide: it also covers the tile behind it.
      blocks: [{ x: 0, y: 3 }, { x: 0, y: 2 }],
    },
    { id: "plant-door", sprite: "plant", tile: { x: 0, y: 7 } },
    // Quill's desk (the OUT tray is already full).
    { id: "desk-quill", sprite: "desk-quill", tile: { x: 4, y: 3 }, target: "quill" },
    // The round meeting table in the front right corner, with a chair on each of its two far sides
    // (walk-through, like the player's chair; the flipped one faces the table from behind).
    { id: "chair-table-a", sprite: "chair", tile: { x: 7, y: 4 }, offset: { x: -2, y: -4 }, flipX: true, blocks: [] },
    { id: "chair-table-b", sprite: "chair", tile: { x: 6, y: 5 }, offset: { x: 2, y: -4 }, blocks: [] },
    { id: "meeting-table", sprite: "meeting-table", tile: { x: 7, y: 5 } },
    { id: "desk-player", sprite: "desk-analyst", tile: { x: 2, y: 5 } },
    { id: "chair-player", sprite: "chair", tile: { x: 2, y: 6 }, offset: { x: 6, y: -8 }, blocks: [] },
  ],
  characters: [
    { id: "quill", role: "agent", sprite: "quill", tile: { x: 5, y: 2 }, facing: "left", target: "quill" },
    { id: "marisol", role: "coach", sprite: "marisol", tile: { x: 1, y: 2 }, facing: "right", target: "marisol" },
  ],
  decor: [
    { id: "kpi-board", sprite: "wall-kpi-board", wall: "right", along: 3.75, height: 72 },
    { id: "clock", sprite: "wall-clock", wall: "right", along: 5.95, height: 88 },
    { id: "sign-pie", sprite: "wall-sign-pie", wall: "right", along: 7.05, height: 74 },
    { id: "slide-screen", sprite: "wall-slide-screen", wall: "left", along: 1.02, height: 76 },
    { id: "poster-who", sprite: "wall-poster-who", wall: "left", along: 4.62, height: 64 },
  ],
  targets: {
    quill: { tile: { x: 4, y: 4 }, facing: "right", hotTiles: [{ x: 4, y: 3 }, { x: 5, y: 2 }] },
    marisol: { tile: { x: 2, y: 2 }, facing: "left", hotTiles: [{ x: 1, y: 2 }] },
    board: { tile: { x: 1, y: 4 }, facing: "left", hotTiles: [{ x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }] },
    coffee: { tile: { x: 6, y: 1 }, facing: "right", hotTiles: [{ x: 6, y: 0 }] },
    cabinet: { tile: { x: 1, y: 1 }, facing: "right", hotTiles: [{ x: 1, y: 0 }] },
  },
  spawn: { x: 3, y: 6 },
  spawnFacing: "right",
  blinkLights: [
    // Quill's inkwell light (quill.svg, 52 x 66): the one slow "antenna" pulse.
    { on: "quill", x: 19.37, y: 14.37, color: 0x43e0c4, radius: 2.2, kind: "antenna" },
    // Server rack status LEDs (server-rack.svg, 44 x 96), as in the other rooms.
    { on: "server-rack", x: 10.88, y: 19.88, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 34.88, color: 0xff8a3d, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 47.48, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 61.28, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 74.98, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 82.98, color: 0xff8a3d, radius: 1.3 },
    // KPI board (wall-kpi-board.svg, 112 x 106; decor images are named by their id): the ON TIME live dot
    // and the DATA AS OF warning dot (the data is 12 days old).
    { on: "kpi-board", x: 35.4, y: 22.5, color: 0x43e0c4, radius: 1.2 },
    { on: "kpi-board", x: 103.4, y: 79.5, color: 0xff8a3d, radius: 1.2 },
  ],
  // Analytics meeting room: a warm paper floor with a gold edge band (Quill's colour), a pale gold
  // wainscot, teal baseboards (gold Quill stands out against them in the battle close-up), a deep-teal
  // door with a gold sign light, and a plain light switch (no keycard reader).
  theme: {
    tileA: 0xf8f7f3,
    tileB: 0xf0eee7,
    grout: 0xe0dcd0,
    rug: 0xf6eed9,
    rugLine: 0x0f6a61,
    rugInner: 0xf26b1d,
    slabL: 0xd9d3c3,
    slabR: 0xc0b8a4,
    slabBandL: 0xd9a53a,
    slabBandR: 0xb7862a,
    wallR: 0xfcfbf7,
    bandR: 0xf8f0dc,
    baseR: 0x0f6a61,
    wallL: 0xf5f3ee,
    bandL: 0xf2e6c8,
    baseL: 0x0a4c45,
    rail: 0xe6d3a3,
    door: 0x0a4c45,
    doorPanel: 0x0f6a61,
    doorGlass: 0xcfe8f0,
    mat: 0x0a4c45,
    doorSignLight: 0xf2c14e,
    keycardReader: false,
  },
};
