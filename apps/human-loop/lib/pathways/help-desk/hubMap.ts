/**
 * Help Desk office hub: room layout for the Phaser stage (types and rules in lib/game/hubMap.ts).
 *
 * Grid coordinates are tile indices: x runs toward the lower right of the screen, y toward the
 * lower left. Tile (0,0) is the back corner where the two walls meet. The right back wall runs
 * along the y = 0 edge, the left back wall along x = 0. World units match lib/game/assets.ts.
 * No theme: the office uses DEFAULT_HUB_THEME.
 */
import type { HubMap } from "@/lib/game/hubMap";

export const HELP_DESK_HUB_MAP: HubMap = {
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
    { id: "desk-ollie", sprite: "desk-ollie", tile: { x: 4, y: 3 }, target: "ollie" },
    { id: "desk-player", sprite: "desk-monitor", tile: { x: 2, y: 5 } },
    { id: "chair-player", sprite: "chair", tile: { x: 2, y: 6 }, offset: { x: 6, y: -8 }, blocks: [] },
  ],
  characters: [
    { id: "ollie", role: "agent", sprite: "ollie", tile: { x: 5, y: 2 }, facing: "left", target: "ollie" },
    { id: "dana", role: "coach", sprite: "dana", tile: { x: 1, y: 2 }, facing: "right", target: "dana" },
  ],
  decor: [
    { id: "window-r1", sprite: "wall-window-right", wall: "right", along: 1.5, height: 60 },
    { id: "poster", sprite: "wall-poster", wall: "right", along: 3.15, height: 62 },
    { id: "clock", sprite: "wall-clock", wall: "right", along: 4.55, height: 84 },
    { id: "window-r2", sprite: "wall-window-right", wall: "right", along: 6.2, height: 60 },
    { id: "window-l1", sprite: "wall-window-left", wall: "left", along: 1.9, height: 60 },
  ],
  targets: {
    ollie: { tile: { x: 4, y: 4 }, facing: "right", hotTiles: [{ x: 4, y: 3 }, { x: 5, y: 2 }] },
    dana: { tile: { x: 2, y: 2 }, facing: "left", hotTiles: [{ x: 1, y: 2 }] },
    whiteboard: { tile: { x: 1, y: 4 }, facing: "left", hotTiles: [{ x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }] },
    coffee: { tile: { x: 3, y: 1 }, facing: "right", hotTiles: [{ x: 4, y: 0 }] },
    printer: { tile: { x: 2, y: 1 }, facing: "right", hotTiles: [{ x: 2, y: 0 }] },
  },
  spawn: { x: 3, y: 6 },
  spawnFacing: "right",
  blinkLights: [
    // Ollie's antenna (ollie.svg, 52 x 66).
    { on: "ollie", x: 22, y: 3.4, color: 0xff8a3d, radius: 3.2, kind: "antenna" },
    // Server rack status LEDs (server-rack.svg, 44 x 96: front face is skewed, y += 0.5 * x).
    { on: "server-rack", x: 10.88, y: 19.88, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 34.88, color: 0xff8a3d, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 47.48, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 61.28, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 10.88, y: 74.98, color: 0x43e0c4, radius: 1.3 },
    { on: "server-rack", x: 13.08, y: 82.98, color: 0xff8a3d, radius: 1.3 },
  ],
};
