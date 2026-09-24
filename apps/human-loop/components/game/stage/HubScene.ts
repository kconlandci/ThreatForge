/**
 * The Help Desk office: an isometric diorama you can walk around by tapping.
 */
import * as Phaser from "phaser";
import { SPRITES } from "@/lib/game/assets";
import type { HubTargetId } from "@/lib/game/hub";
import {
  HUB_MAP,
  HUB_WALKABLE,
  isWalkable,
  targetAtTile,
  type Facing,
  type GridPos,
} from "@/lib/game/hubMap";
import { isoDepth, tileDiamond, tileToWorld, vertexToWorld, worldToGridFloat, worldToTile, type Vec } from "./iso";
import { HUB_BOUNDS, HUB_SLAB, hubFit, hubFocus, hubPortraitZoom } from "./layout";
import { findPath, nearestWalkable } from "./pathfind";
import type { StageRuntime } from "./runtime";
import { StageScene, type ArtRef } from "./StageScene";
import { FX, FX_SIZE } from "./textures";

const WALK_SPEED = 3.5; // tiles per second
const TEAL = 0x0f6a61;
const TEAL_DARK = 0x0a4c45;

type Pt = { x: number; y: number };
const up = (p: Pt, h: number): Pt => ({ x: p.x, y: p.y - h });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
// Graphics only reads x/y from its points; plain objects are fine at runtime.
const fillPts = (g: Phaser.GameObjects.Graphics, pts: Pt[], close = true) =>
  g.fillPoints(pts as unknown as Phaser.Math.Vector2[], close);
const strokePts = (g: Phaser.GameObjects.Graphics, pts: Pt[], close = true) =>
  g.strokePoints(pts as unknown as Phaser.Math.Vector2[], close);

interface Npc {
  ref: ArtRef;
  facing: Facing;
  phase: number;
  hopAt: number;
}

interface Light {
  img: Phaser.GameObjects.Image;
  owner: ArtRef;
  lx: number;
  ly: number;
  kind: "antenna" | "led";
  on: boolean;
  next: number;
}

export class HubScene extends StageScene {
  private hoverG!: Phaser.GameObjects.Graphics;
  private player!: ArtRef;
  private npcs: Npc[] = [];
  private hotspots: { target: HubTargetId; ref: ArtRef }[] = [];
  private exclaim!: ArtRef;
  private exclaimBase = { x: 0, y: 0 };
  private ring!: ArtRef;
  private blinkers: Light[] = [];

  /** Avatar position in fractional grid coords. */
  private pos: Vec = { x: 0, y: 0 };
  private path: GridPos[] = [];
  private moving = false;
  private goalTarget: HubTargetId | null = null;
  private facing: Facing = "right";
  private walkPhase = 0;
  private teleporting = false;
  /** Walk requested while a reduced-motion teleport was fading. */
  private queued: { goal: GridPos; target: HubTargetId | null } | null = null;
  private down: { x: number; y: number; t: number } | null = null;
  private hoverKey = "";

  constructor(rt: StageRuntime) {
    super("hub", rt);
  }

  /** Portrait phones: zoomed in, camera follows the avatar sideways. */
  private follow = false;

  protected computeFit(cssW: number, cssH: number) {
    const zoom = hubPortraitZoom(cssW, cssH);
    this.fit = hubFit(cssW, cssH) * zoom;
    this.follow = zoom > 1.01;
    this.focus = hubFocus();
    if (this.follow) this.focus.x = this.followX();
  }

  /** Camera x that keeps the avatar in view without showing past the room's edges. */
  private followX(): number {
    const half = this.rt.cssW / this.fit / 2;
    const lo = HUB_BOUNDS.minX + half;
    const hi = HUB_BOUNDS.maxX - half;
    if (lo >= hi) return (HUB_BOUNDS.minX + HUB_BOUNDS.maxX) / 2;
    // Lean toward the avatar but stay near the middle, so ResetBot's desk stays in view.
    const mid = (HUB_BOUNDS.minX + HUB_BOUNDS.maxX) / 2;
    const ax = mid + ((this.pos.x - this.pos.y) * 32 - mid) * 0.6;
    return Math.min(hi, Math.max(lo, ax));
  }

  private stepFollow(dt: number) {
    if (!this.follow) return;
    const target = this.followX();
    const dx = target - this.focus.x;
    if (Math.abs(dx) < 0.05) return;
    this.focus.x = this.rt.reducedMotion ? target : this.focus.x + dx * Math.min(1, dt * 3.2);
    if (!this.isShaking()) this.centerCamera(0, 0);
  }

  create() {
    this.npcs = [];
    this.hotspots = [];
    this.blinkers = [];
    this.path = [];
    this.moving = false;
    this.goalTarget = null;
    this.teleporting = false;
    this.queued = null;
    this.down = null;
    this.hoverKey = "";
    this.initStage();

    this.drawFloor();
    this.drawWalls();
    this.hoverG = this.add.graphics().setDepth(-800);
    this.placeDecor();
    this.placeProps();
    this.placeCharacters();
    this.placeLights();
    this.placeMarkers();
    this.bindInput();
    // The avatar is placed now: aim the follow camera at it.
    if (this.follow) {
      this.focus.x = this.followX();
      this.centerCamera(0, 0);
    }

    if (this.game.input.touch) this.game.input.touch.capture = true;
    this.fadeIn();
    this.rt.sceneReady("hub");
  }

  /* ---------------------------------------------------------------- */
  /* Room                                                              */
  /* ---------------------------------------------------------------- */

  private drawFloor() {
    const { cols, rows, rug, door } = HUB_MAP;
    const g = this.add.graphics().setDepth(-1000);
    const T = vertexToWorld(0, 0);
    const R = vertexToWorld(cols, 0);
    const B = vertexToWorld(cols, rows);
    const L = vertexToWorld(0, rows);
    const S = HUB_SLAB;

    // Soft drop shadow under the diorama.
    g.fillStyle(0x111418, 0.035);
    fillPts(g, [add(T, { x: 0, y: 18 }), add(R, { x: 16, y: 20 }), add(B, { x: 0, y: 30 }), add(L, { x: -16, y: 20 })], true);
    g.fillStyle(0x111418, 0.05);
    fillPts(g, [add(T, { x: 0, y: 12 }), add(R, { x: 6, y: 14 }), add(B, { x: 0, y: 20 }), add(L, { x: -6, y: 14 })], true);

    // Slab edges.
    g.fillStyle(0xc9d8d4, 1);
    fillPts(g, [L, B, add(B, { x: 0, y: S }), add(L, { x: 0, y: S })], true);
    g.fillStyle(0xadc1bc, 1);
    fillPts(g, [B, R, add(R, { x: 0, y: S }), add(B, { x: 0, y: S })], true);
    g.fillStyle(TEAL, 1);
    fillPts(g, [add(L, { x: 0, y: S - 3 }), add(B, { x: 0, y: S - 3 }), add(B, { x: 0, y: S }), add(L, { x: 0, y: S })], true);
    g.fillStyle(TEAL_DARK, 1);
    fillPts(g, [add(B, { x: 0, y: S - 3 }), add(R, { x: 0, y: S - 3 }), add(R, { x: 0, y: S }), add(B, { x: 0, y: S })], true);

    // Tiles.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        g.fillStyle((x + y) % 2 === 0 ? 0xf5f8f7 : 0xedf3f1, 1);
        fillPts(g, tileDiamond(x, y), true);
      }
    }
    // Grout.
    g.lineStyle(1, 0xdbe5e2, 1);
    for (let i = 1; i < cols; i++) g.lineBetween(vertexToWorld(i, 0).x, vertexToWorld(i, 0).y, vertexToWorld(i, rows).x, vertexToWorld(i, rows).y);
    for (let j = 1; j < rows; j++) g.lineBetween(vertexToWorld(0, j).x, vertexToWorld(0, j).y, vertexToWorld(cols, j).x, vertexToWorld(cols, j).y);

    // Rug.
    const inset = 0.18;
    const rugPts = (d: number) => [
      vertexToWorld(rug.x0 + d, rug.y0 + d),
      vertexToWorld(rug.x1 + 1 - d, rug.y0 + d),
      vertexToWorld(rug.x1 + 1 - d, rug.y1 + 1 - d),
      vertexToWorld(rug.x0 + d, rug.y1 + 1 - d),
    ];
    g.fillStyle(0x111418, 0.05);
    fillPts(g, rugPts(inset - 0.04).map((p) => add(p, { x: 0, y: 1.5 })), true);
    g.fillStyle(0xd6e8e4, 1);
    fillPts(g, rugPts(inset), true);
    g.lineStyle(2, TEAL, 0.55);
    strokePts(g, rugPts(inset + 0.12), true);
    g.lineStyle(1.2, 0xf26b1d, 0.55);
    strokePts(g, rugPts(inset + 0.22), true);
    // Woven stripes.
    g.lineStyle(1, TEAL, 0.12);
    for (let k = 1; k < 6; k++) {
      const t = rug.y0 + inset + 0.3 + ((rug.y1 + 1 - rug.y0 - 2 * inset - 0.6) * k) / 6;
      const a = vertexToWorld(rug.x0 + inset + 0.3, t);
      const b = vertexToWorld(rug.x1 + 1 - inset - 0.3, t);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }

    // Ambient occlusion where floor meets walls.
    for (const d of [0.1, 0.22, 0.36]) {
      g.fillStyle(0x0a4c45, 0.035);
      fillPts(g, [vertexToWorld(0, 0), vertexToWorld(cols, 0), vertexToWorld(cols, d), vertexToWorld(0, d)], true);
      fillPts(g, [vertexToWorld(0, 0), vertexToWorld(0, rows), vertexToWorld(d, rows), vertexToWorld(d, 0)], true);
    }

    // Door mat.
    const a = door.from + 0.08;
    const b = door.to - 0.08;
    g.fillStyle(TEAL_DARK, 0.9);
    fillPts(g, [vertexToWorld(0.08, a), vertexToWorld(0.62, a), vertexToWorld(0.62, b), vertexToWorld(0.08, b)], true);
    g.lineStyle(1, 0xffffff, 0.25);
    strokePts(g, [vertexToWorld(0.16, a + 0.08), vertexToWorld(0.54, a + 0.08), vertexToWorld(0.54, b - 0.08), vertexToWorld(0.16, b - 0.08)], true);

    // Crisp top edge of the slab.
    g.lineStyle(1.2, 0xffffff, 0.9);
    strokePts(g, [L, B, R], false);
  }

  private drawWalls() {
    const { cols, rows, wallHeight: H, wallThickness: th, door } = HUB_MAP;
    const g = this.add.graphics().setDepth(-950);
    const T = vertexToWorld(0, 0);
    const R = vertexToWorld(cols, 0);
    const L = vertexToWorld(0, rows);
    const S = HUB_SLAB;
    const rOff = { x: 32 * th, y: -16 * th };
    const lOff = { x: -32 * th, y: -16 * th };
    const band = 34;

    // Right wall (lit side).
    g.fillStyle(0xf8fafb, 1);
    fillPts(g, [T, R, up(R, H), up(T, H)], true);
    g.fillStyle(0xe7f1ef, 1);
    fillPts(g, [T, R, up(R, band), up(T, band)], true);
    g.fillStyle(TEAL, 1);
    fillPts(g, [T, R, up(R, 6), up(T, 6)], true);
    // Left wall (a touch darker).
    g.fillStyle(0xeef2f4, 1);
    fillPts(g, [T, L, up(L, H), up(T, H)], true);
    g.fillStyle(0xdbe9e5, 1);
    fillPts(g, [T, L, up(L, band), up(T, band)], true);
    g.fillStyle(TEAL_DARK, 1);
    fillPts(g, [T, L, up(L, 6), up(T, 6)], true);

    // Chair rails.
    g.lineStyle(2.4, 0xffffff, 1);
    g.lineBetween(T.x, T.y - band, R.x, R.y - band);
    g.lineBetween(T.x, T.y - band, L.x, L.y - band);
    g.lineStyle(1, 0xc3d6d1, 1);
    g.lineBetween(T.x, T.y - band + 1.6, R.x, R.y - band + 1.6);
    g.lineBetween(T.x, T.y - band + 1.6, L.x, L.y - band + 1.6);

    // Caps (wall thickness) and end faces.
    const TH = up(T, H);
    const back = add(add(TH, rOff), lOff);
    g.fillStyle(0xd9e0e4, 1);
    fillPts(g, [TH, up(R, H), add(up(R, H), rOff), back], true);
    g.fillStyle(0xe2e8eb, 1);
    fillPts(g, [TH, up(L, H), add(up(L, H), lOff), back], true);
    g.fillStyle(0xc2ccd1, 1);
    fillPts(g, [add(R, { x: 0, y: S }), up(R, H), add(up(R, H), rOff), add(add(R, rOff), { x: 0, y: S })], true);
    g.fillStyle(0xd3dbdf, 1);
    fillPts(g, [add(L, { x: 0, y: S }), up(L, H), add(up(L, H), lOff), add(add(L, lOff), { x: 0, y: S })], true);
    g.fillStyle(TEAL_DARK, 1);
    fillPts(g, [add(R, { x: 0, y: S - 3 }), add(R, { x: 0, y: S }), add(add(R, rOff), { x: 0, y: S }), add(add(R, rOff), { x: 0, y: S - 3 })], true);
    g.fillStyle(TEAL, 1);
    fillPts(g, [add(L, { x: 0, y: S - 3 }), add(L, { x: 0, y: S }), add(add(L, lOff), { x: 0, y: S }), add(add(L, lOff), { x: 0, y: S - 3 })], true);

    // Edges.
    g.lineStyle(1, 0xffffff, 1);
    g.lineBetween(TH.x, TH.y, up(R, H).x, up(R, H).y);
    g.lineBetween(TH.x, TH.y, up(L, H).x, up(L, H).y);
    g.lineStyle(1, 0xd3dcdf, 1);
    g.lineBetween(T.x, T.y - 6, TH.x, TH.y);

    // Door on the left wall.
    const W = (t: number, h: number): Pt => ({ x: -t * 32, y: t * 16 - h });
    const a = door.from;
    const b = door.to;
    const quad = (t0: number, t1: number, h0: number, h1: number) => [W(t0, h0), W(t1, h0), W(t1, h1), W(t0, h1)];
    g.fillStyle(0xffffff, 1);
    fillPts(g, quad(a - 0.07, b + 0.07, 0, 81), true);
    g.lineStyle(1, 0xc9d1d6, 1);
    strokePts(g, quad(a - 0.07, b + 0.07, 0, 81), true);
    g.fillStyle(TEAL, 1);
    fillPts(g, quad(a, b, 0, 76), true);
    g.fillStyle(0x1b7a70, 1);
    fillPts(g, quad(a + 0.12, b - 0.12, 10, 34), true);
    g.fillStyle(0xcfe8f0, 1);
    fillPts(g, quad(a + 0.12, b - 0.12, 44, 68), true);
    g.fillStyle(0xffffff, 0.8);
    fillPts(g, quad(a + 0.2, a + 0.36, 50, 64), true);
    g.fillStyle(0xf26b1d, 1);
    g.fillCircle(W(b - 0.14, 38).x, W(b - 0.14, 38).y, 2.3);
    // Little sign above the door, and a light switch.
    g.fillStyle(0x111418, 1);
    fillPts(g, quad(a + 0.28, b - 0.28, 86, 95), true);
    g.fillStyle(0x43e0c4, 1);
    fillPts(g, quad(a + 0.36, b - 0.36, 89.5, 91.5), true);
    g.fillStyle(0xffffff, 1);
    fillPts(g, quad(b + 0.22, b + 0.34, 42, 52), true);
    g.lineStyle(0.8, 0xb8c2c8, 1);
    strokePts(g, quad(b + 0.22, b + 0.34, 42, 52), true);
  }

  private placeDecor() {
    for (const d of HUB_MAP.decor) {
      const base = d.wall === "right" ? { x: d.along * 32, y: d.along * 16 } : { x: -d.along * 32, y: d.along * 16 };
      const ref = this.addArt(d.sprite, base.x, base.y - d.height);
      ref.img.setDepth(-900);
    }
  }

  private placeProps() {
    for (const p of HUB_MAP.props) {
      const c = tileToWorld(p.tile.x, p.tile.y);
      const x = c.x + (p.offset?.x ?? 0);
      const y = c.y + (p.offset?.y ?? 0);
      const ref = this.addArt(p.sprite, x, y);
      ref.img.setFlipX(!!p.flipX).setDepth(isoDepth(c.x, c.y) + (p.depthBias ?? 0));
      ref.img.setName(p.id);
      if (p.target) this.hotspots.push({ target: p.target, ref });
    }
  }

  private placeCharacters() {
    HUB_MAP.characters.forEach((c, i) => {
      const w = tileToWorld(c.tile.x, c.tile.y);
      const ref = this.addArt(c.sprite, w.x + (c.offset?.x ?? 0), w.y + (c.offset?.y ?? 0));
      ref.img.setName(c.id).setDepth(isoDepth(w.x, w.y)).setFlipX(c.facing === "left");
      this.npcs.push({ ref, facing: c.facing, phase: i * 1.7, hopAt: 2500 + i * 1800 });
      this.hotspots.push({ target: c.target, ref });
    });

    // Avatar.
    const saved = this.rt.hubPos;
    let start: GridPos = saved && isWalkable(saved) ? saved : HUB_MAP.spawn;
    if (!isWalkable(start)) start = nearestWalkable(HUB_WALKABLE, start) ?? HUB_MAP.spawn;
    this.pos = { x: start.x, y: start.y };
    this.rt.hubPos = { ...start };
    this.facing = saved ? this.facing : HUB_MAP.spawnFacing;
    const w = tileToWorld(start.x, start.y);
    this.player = this.addArt("player", w.x, w.y);
    this.player.img.setName("player").setDepth(isoDepth(w.x, w.y)).setFlipX(this.facing === "left");
  }

  private placeLights() {
    for (const l of HUB_MAP.blinkLights) {
      const owner = this.arts.find((a) => a.img.name === l.on);
      if (!owner) continue;
      const img = this.add.image(0, 0, FX.led).setTint(l.color);
      const size = l.on === "resetbot" ? l.radius * 3.4 : l.radius * 3;
      img.setDisplaySize(size, size);
      this.blinkers.push({
        img,
        owner,
        lx: l.x,
        ly: l.y,
        kind: l.on === "resetbot" ? "antenna" : "led",
        on: true,
        next: Math.random() * 1500,
      });
    }
  }

  private placeMarkers() {
    const rb = this.npcs.find((n) => n.ref.img.name === "resetbot");
    const head = rb ? { x: rb.ref.img.x, y: rb.ref.img.y - SPRITES.resetbot.h * SPRITES.resetbot.originY - 1 } : { x: 0, y: 0 };
    this.exclaimBase = head;
    this.exclaim = this.addArt("marker-exclaim", head.x, head.y);
    this.exclaim.img.setDepth(5000);
    this.hotspots.push({ target: "resetbot", ref: this.exclaim });

    this.ring = this.addArt("tap-ring", 0, 0);
    this.ring.img.setDepth(-700).setVisible(false);
  }

  /* ---------------------------------------------------------------- */
  /* Input                                                             */
  /* ---------------------------------------------------------------- */

  private bindInput() {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.down = { x: p.x, y: p.y, t: this.time.now };
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      const d = this.down;
      this.down = null;
      if (!d) return;
      const moved = Math.hypot(p.x - d.x, p.y - d.y) / this.rt.dpr;
      if (moved > 14 || this.time.now - d.t > 900) return;
      this.handleTap(p.x, p.y);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) return;
      this.updateHover(p.x, p.y);
    });
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.clearHover());
  }

  private toWorld(px: number, py: number): Vec {
    const w = this.cameras.main.getWorldPoint(px, py);
    return { x: w.x, y: w.y };
  }

  /** Tile under a screen point (in game pixels); used by the harness to verify tap mapping. */
  tileAt(px: number, py: number): GridPos & { inside: boolean } {
    const w = this.toWorld(px, py);
    const t = worldToTile(w.x, w.y);
    return { ...t, inside: t.x >= 0 && t.y >= 0 && t.x < HUB_MAP.cols && t.y < HUB_MAP.rows };
  }

  private pickTarget(w: Vec): HubTargetId | null {
    let best: { target: HubTargetId; depth: number } | null = null;
    for (const h of this.hotspots) {
      const b = h.ref.img.getBounds();
      const pad = 6;
      if (w.x >= b.x - pad && w.x <= b.right + pad && w.y >= b.y - pad && w.y <= b.bottom + pad) {
        if (!best || h.ref.img.depth > best.depth) best = { target: h.target, depth: h.ref.img.depth };
      }
    }
    if (best) return best.target;
    const t = worldToTile(w.x, w.y);
    return targetAtTile(t);
  }

  private handleTap(px: number, py: number) {
    const w = this.toWorld(px, py);
    const target = this.pickTarget(w);
    if (target) {
      this.goToTarget(target);
      return;
    }
    const t = worldToTile(w.x, w.y);
    if (t.x < 0 || t.y < 0 || t.x >= HUB_MAP.cols || t.y >= HUB_MAP.rows) return;
    const goal = isWalkable(t) ? t : nearestWalkable(HUB_WALKABLE, t, this.currentTile());
    if (goal) this.walkTo(goal, null);
  }

  private updateHover(px: number, py: number) {
    const w = this.toWorld(px, py);
    const target = this.pickTarget(w);
    const t = worldToTile(w.x, w.y);
    const inside = t.x >= 0 && t.y >= 0 && t.x < HUB_MAP.cols && t.y < HUB_MAP.rows;
    const key = target ? `t:${target}` : inside && isWalkable(t) ? `f:${t.x},${t.y}` : "";
    if (key === this.hoverKey) return;
    this.hoverKey = key;
    const g = this.hoverG;
    g.clear();
    this.input.setDefaultCursor(target ? "pointer" : "default");
    this.highlight(target);
    if (target) {
      const spot = HUB_MAP.targets[target];
      g.fillStyle(TEAL, 0.14);
      fillPts(g, tileDiamond(spot.tile.x, spot.tile.y, 2), true);
      g.lineStyle(1.5, TEAL, 0.7);
      strokePts(g, tileDiamond(spot.tile.x, spot.tile.y, 2), true);
    } else if (key) {
      g.lineStyle(1.2, TEAL, 0.35);
      strokePts(g, tileDiamond(t.x, t.y, 2), true);
    }
  }

  private clearHover() {
    this.hoverKey = "";
    this.hoverG?.clear();
    this.highlight(null);
    this.input.setDefaultCursor("default");
  }

  /** Brightens the sprites of the hovered target (a tint, no filters: cheap on weak GPUs). */
  private highlight(target: HubTargetId | null) {
    for (const h of this.hotspots) {
      if (h.ref.key === "marker-exclaim") continue;
      if (h.target === target) h.ref.img.setTintMode(Phaser.TintModes.ADD).setTint(0x1e2624);
      else h.ref.img.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
    }
  }

  /* ---------------------------------------------------------------- */
  /* Walking                                                           */
  /* ---------------------------------------------------------------- */

  private currentTile(): GridPos {
    return { x: Math.round(this.pos.x), y: Math.round(this.pos.y) };
  }

  /** Walk to an interactable (tap or keyboard room list). */
  goToTarget(target: HubTargetId) {
    const spot = HUB_MAP.targets[target];
    this.rt.emit({ type: "hub-tap", target });
    const here = this.currentTile();
    if (!this.moving && here.x === spot.tile.x && here.y === spot.tile.y) {
      this.goalTarget = target;
      this.arrive();
      return;
    }
    this.walkTo(spot.tile, target);
  }

  private walkTo(goal: GridPos, target: HubTargetId | null) {
    if (this.teleporting) {
      this.queued = { goal, target };
      return;
    }
    this.goalTarget = target;
    this.showRing(goal);
    if (this.rt.reducedMotion) {
      this.teleport(goal);
      return;
    }
    const from = this.moving && this.path.length ? this.path[0] : this.currentTile();
    const p = findPath(HUB_WALKABLE, from, goal);
    if (!p) {
      this.goalTarget = null;
      this.hideRing();
      return;
    }
    // If we are standing exactly on `from`, skip it; mid-step we keep heading to it first.
    const standing = !this.moving && Math.abs(this.pos.x - from.x) < 0.01 && Math.abs(this.pos.y - from.y) < 0.01;
    this.path = standing ? p.slice(1) : p;
    if (!this.path.length) {
      this.arrive();
      return;
    }
    this.moving = true;
  }

  /** Reduced motion: short fade out, jump, fade in. */
  private teleport(goal: GridPos) {
    this.teleporting = true;
    this.moving = false;
    this.path = [];
    const img = this.player.img;
    this.tweens.add({
      targets: img,
      alpha: 0,
      duration: 110,
      onComplete: () => {
        this.pos = { x: goal.x, y: goal.y };
        this.placePlayer(0);
        this.tweens.add({
          targets: img,
          alpha: 1,
          duration: 130,
          onComplete: () => {
            this.teleporting = false;
            this.arrive();
            const next = this.queued;
            this.queued = null;
            if (next) this.walkTo(next.goal, next.target);
          },
        });
      },
    });
  }

  private arrive() {
    this.moving = false;
    this.path = [];
    const tile = this.currentTile();
    this.pos = { x: tile.x, y: tile.y };
    this.placePlayer(0);
    this.hideRing();
    const moved = !this.rt.hubPos || this.rt.hubPos.x !== tile.x || this.rt.hubPos.y !== tile.y;
    this.rt.hubPos = { ...tile };
    if (moved) this.rt.emit({ type: "hub-moved", x: tile.x, y: tile.y });
    const target = this.goalTarget;
    this.goalTarget = null;
    if (target) {
      this.setFacing(HUB_MAP.targets[target].facing);
      this.rt.emit({ type: "hub-arrived", target });
    }
  }

  private setFacing(f: Facing) {
    this.facing = f;
    this.player.img.setFlipX(f === "left");
  }

  private showRing(tile: GridPos) {
    const c = tileToWorld(tile.x, tile.y);
    const img = this.ring.img;
    this.tweens.killTweensOf(img);
    img.setPosition(c.x, c.y).setVisible(true).setAlpha(1);
    if (this.rt.reducedMotion) {
      img.setScale(this.ring.sx, this.ring.sy);
      return;
    }
    img.setScale(this.ring.sx * 0.4, this.ring.sy * 0.4);
    this.tweens.add({ targets: img, scaleX: this.ring.sx, scaleY: this.ring.sy, duration: 260, ease: "Back.easeOut" });
  }

  private hideRing() {
    const img = this.ring.img;
    this.tweens.killTweensOf(img);
    this.tweens.add({
      targets: img,
      alpha: 0,
      duration: 220,
      onComplete: () => img.setVisible(false),
    });
  }

  private placePlayer(bob: number) {
    const w = tileToWorld(this.pos.x, this.pos.y);
    this.player.img.setPosition(w.x, w.y - bob).setDepth(isoDepth(w.x, w.y));
  }

  /** Walk target requested from React (keyboard / screen-reader room list). */
  externalWalk(target: HubTargetId) {
    this.goToTarget(target);
  }

  onReducedMotion() {
    if (this.rt.reducedMotion && this.moving) {
      const last = this.path[this.path.length - 1];
      if (last) this.teleport(last);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Frame                                                             */
  /* ---------------------------------------------------------------- */

  update(time: number, delta: number) {
    const dt = Math.min(delta, 66) / 1000;
    this.stepFollow(dt);
    this.stepShake(delta);
    const calm = this.rt.reducedMotion;

    // Avatar movement.
    let bob = 0;
    if (this.moving && this.path.length) {
      let budget = WALK_SPEED * dt;
      while (budget > 0 && this.path.length) {
        const next = this.path[0];
        const dx = next.x - this.pos.x;
        const dy = next.y - this.pos.y;
        const dist = Math.hypot(dx, dy);
        const sdx = dx - dy; // screen-space x direction
        if (Math.abs(sdx) > 0.05) this.setFacing(sdx > 0 ? "right" : "left");
        if (dist <= budget) {
          this.pos = { x: next.x, y: next.y };
          this.path.shift();
          budget -= dist;
        } else {
          this.pos = { x: this.pos.x + (dx / dist) * budget, y: this.pos.y + (dy / dist) * budget };
          budget = 0;
        }
      }
      this.walkPhase += dt * WALK_SPEED * Math.PI * 1.6;
      bob = Math.abs(Math.sin(this.walkPhase)) * 3;
      this.player.img.setRotation(Math.sin(this.walkPhase) * 0.05);
      this.placePlayer(bob);
      if (!this.path.length) {
        this.player.img.setRotation(0);
        this.arrive();
      }
    } else {
      this.player.img.setRotation(0);
    }

    // Breathing (characters stretch a hair taller from the feet).
    const t = time / 1000;
    const breathe = (phase: number) => (calm ? 0 : Math.sin(t * 3.4 + phase) * 0.014);
    const pb = this.moving ? 0 : breathe(0.6);
    this.player.img.setScale(this.player.sx * (1 - pb * 0.4), this.player.sy * (1 + pb));

    for (const n of this.npcs) {
      const b = breathe(n.phase);
      let hop = 0;
      if (!calm && n.ref.img.name === "resetbot") {
        // An eager little double-hop every few seconds.
        n.hopAt -= delta;
        if (n.hopAt < 0) n.hopAt = 3800 + Math.random() * 2200;
        const k = n.hopAt < 520 ? (520 - n.hopAt) / 520 : -1;
        if (k >= 0) hop = Math.abs(Math.sin(k * Math.PI * 2)) * 4;
      }
      n.ref.img.setScale(n.ref.sx * (1 - b * 0.4), n.ref.sy * (1 + b));
      const home = HUB_MAP.characters.find((c) => c.id === n.ref.img.name)!;
      const w = tileToWorld(home.tile.x, home.tile.y);
      n.ref.img.y = w.y + (home.offset?.y ?? 0) - hop;
      // Turn to face the avatar when it is close.
      const g = worldToGridFloat(n.ref.img.x, w.y);
      const near = Math.hypot(g.x - this.pos.x, g.y - this.pos.y) < 2.6;
      const want: Facing = near ? (this.player.img.x < n.ref.img.x ? "left" : "right") : home.facing;
      if (want !== n.facing) {
        n.facing = want;
        n.ref.img.setFlipX(want === "left");
      }
    }

    // Exclaim marker bob.
    const eb = calm ? 0 : Math.abs(Math.sin(t * 3.1)) * 5;
    this.exclaim.img.setPosition(this.exclaimBase.x, this.exclaimBase.y - eb - (this.npcHop("resetbot") ?? 0));

    // Lights.
    for (const l of this.blinkers) {
      const o = l.owner.img;
      const def = SPRITES[l.owner.key];
      const sx = o.scaleX / (def.w / o.frame.realWidth);
      const sy = o.scaleY / (def.h / o.frame.realHeight);
      const lx = o.flipX ? def.w - l.lx : l.lx;
      l.img.setPosition(o.x + (lx - def.w * def.originX) * sx, o.y + (l.ly - def.h * def.originY) * sy);
      l.img.setDepth(o.depth + 0.01);
      if (l.kind === "antenna") {
        const s = Math.sin(t * (calm ? 2 : 4.2));
        l.img.setAlpha(s > 0.1 ? 0.95 : 0.15);
      } else {
        l.next -= delta;
        if (l.next < 0) {
          l.on = !l.on;
          l.next = (l.on ? 500 : 140) + Math.random() * (calm ? 2400 : 1400);
          l.img.setAlpha(l.on ? 0.9 : 0);
        }
      }
    }
  }

  private npcHop(name: string) {
    const n = this.npcs.find((x) => x.ref.img.name === name);
    if (!n) return 0;
    const home = HUB_MAP.characters.find((c) => c.id === name)!;
    const w = tileToWorld(home.tile.x, home.tile.y);
    return w.y + (home.offset?.y ?? 0) - n.ref.img.y;
  }

  /** Harness/test hook: current avatar tile and facing. */
  debugState() {
    return { tile: this.currentTile(), moving: this.moving, facing: this.facing, size: FX_SIZE.led };
  }
}
