/**
 * Full-Stack Development app team hub: room layout for the Phaser stage (types and rules in lib/game/hubMap.ts).
 *
 * Same grid, wall height, door, rug and spawn as the Help Desk office, the SOC and the NOC, so the walk
 * feels the same. Grid coordinates are tile indices: x runs toward the lower right of the screen, y toward
 * the lower left. Tile (0,0) is the back corner where the two walls meet. The right back wall runs along
 * the y = 0 edge, the left back wall along x = 0. World units match lib/game/assets.ts.
 * Every target tile is walkable and reachable from the spawn (piper 3 steps, board 4, leo 5, box 5,
 * coffee 8).
 */
import type { HubMap } from "@/lib/game/hubMap";

export const FULL_STACK_HUB_MAP: HubMap = {
  cols: 8,
  rows: 8,
  wallHeight: 104,
  wallThickness: 0.2,
  door: { wall: "left", from: 5.25, to: 6.45 },
  rug: { x0: 3, y0: 4, x1: 5, y1: 6 },
  props: [
    // Along the right wall: the build server in the back corner, a water cooler, a bean bag under the
    // deploy board's left end (where the team watches deploys), coffee and a plant. The bean bag sits at
    // (2,0), not (3,0): (3,0) is straight above Piper on screen, so the "!" marker would sit on it.
    { id: "server-rack", sprite: "server-rack", tile: { x: 0, y: 0 } },
    { id: "water-cooler", sprite: "water-cooler", tile: { x: 1, y: 0 } },
    { id: "beanbag", sprite: "beanbag", tile: { x: 2, y: 0 } },
    { id: "coffee-machine", sprite: "coffee-machine", tile: { x: 6, y: 0 }, target: "coffee" },
    { id: "plant-right", sprite: "plant", tile: { x: 7, y: 0 } },
    // Along the left wall: a plant under the CODE FREEZE calendar (a light, low backdrop behind Leo),
    // the sprint board, a plant by the door.
    { id: "plant-left", sprite: "plant", tile: { x: 0, y: 1 } },
    {
      id: "sprint-board",
      sprite: "sprint-board",
      tile: { x: 0, y: 3 },
      offset: { x: 4, y: 0 },
      target: "board",
      // 80px wide: it also covers the tile behind it.
      blocks: [{ x: 0, y: 3 }, { x: 0, y: 2 }],
    },
    { id: "plant-door", sprite: "plant", tile: { x: 0, y: 7 } },
    // Piper's standing desk, and the box it packed to ship (a bug is climbing out), beside it.
    { id: "desk-piper", sprite: "desk-piper", tile: { x: 4, y: 3 }, target: "piper" },
    { id: "ship-box", sprite: "ship-box", tile: { x: 6, y: 3 }, target: "box" },
    { id: "desk-player", sprite: "desk-dev", tile: { x: 2, y: 5 } },
    { id: "chair-player", sprite: "chair", tile: { x: 2, y: 6 }, offset: { x: 6, y: -8 }, blocks: [] },
  ],
  characters: [
    { id: "piper", role: "agent", sprite: "piper", tile: { x: 5, y: 2 }, facing: "left", target: "piper" },
    { id: "leo", role: "coach", sprite: "leo", tile: { x: 1, y: 2 }, facing: "right", target: "leo" },
  ],
  decor: [
    { id: "deploy-board", sprite: "wall-deploy-board", wall: "right", along: 3.75, height: 72 },
    { id: "clock", sprite: "wall-clock", wall: "right", along: 5.95, height: 88 },
    { id: "sign-days", sprite: "wall-sign-days", wall: "right", along: 7.05, height: 74 },
    { id: "calendar-freeze", sprite: "wall-calendar-freeze", wall: "left", along: 1.02, height: 80 },
    { id: "poster-match", sprite: "wall-poster-match", wall: "left", along: 4.62, height: 64 },
  ],
  targets: {
    piper: { tile: { x: 4, y: 4 }, facing: "right", hotTiles: [{ x: 4, y: 3 }, { x: 5, y: 2 }] },
    leo: { tile: { x: 2, y: 2 }, facing: "left", hotTiles: [{ x: 1, y: 2 }] },
    board: { tile: { x: 1, y: 4 }, facing: "left", hotTiles: [{ x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }] },
    coffee: { tile: { x: 6, y: 1 }, facing: "right", hotTiles: [{ x: 6, y: 0 }] },
    box: { tile: { x: 6, y: 4 }, facing: "right", hotTiles: [{ x: 6, y: 3 }] },
  },
  spawn: { x: 3, y: 6 },
  spawnFacing: "right",
  blinkLights: [
    // Piper's near ear-cup light (piper.svg, 52 x 66): the one slow "antenna" pulse.
    { on: "piper", x: 12.15, y: 24.31, color: 0xff8a3d, radius: 2.4, kind: "antenna" },
    // Server rack status LEDs (server-rack.svg, 44 x 96), as in the other rooms.
    { on: "server-rack", x: 10.88, y: 19.88, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 34.88, color: 0xff8a3d, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 47.48, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 61.28, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 74.98, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 82.98, color: 0xff8a3d, radius: 1.3 },
    // Deploy board (wall-deploy-board.svg, 112 x 106; decor images are named by their id): the error
    // line's newest point (it jumped after the last deploy) and PD's app tile.
    { on: "deploy-board", x: 69.2, y: 44.5, color: 0xff8a3d, radius: 1.6 },
    { on: "deploy-board", x: 34.2, y: 49.6, color: 0xff8a3d, radius: 1.2 },
  ],
  // App team studio: a warm white floor with an orange edge band, a pale orange wainscot, deep-teal
  // baseboards (orange Piper stands out against them in the battle close-up), a graphite door with an
  // orange sign light, and a plain light switch (no keycard reader).
  theme: {
    tileA: 0xf8f6f3,
    tileB: 0xf0ece7,
    grout: 0xdfd8cf,
    rug: 0xe3efed,
    rugLine: 0x0f6a61,
    rugInner: 0xf26b1d,
    slabL: 0xd6cec4,
    slabR: 0xbdb2a5,
    slabBandL: 0xd9561a,
    slabBandR: 0xc2410c,
    wallR: 0xfbfaf8,
    bandR: 0xfbeee4,
    baseR: 0x0a4c45,
    wallL: 0xf4f1ed,
    bandL: 0xf3e2d5,
    baseL: 0x083b36,
    rail: 0xe8cfbe,
    door: 0x2b3238,
    doorPanel: 0x3a4149,
    doorGlass: 0xcfe8f0,
    mat: 0x2b3238,
    doorSignLight: 0xf26b1d,
    keycardReader: false,
  },
};
