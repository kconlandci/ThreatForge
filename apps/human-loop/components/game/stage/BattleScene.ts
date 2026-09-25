/**
 * Battle close-up: the pathway's agent at its desk, with mood swaps and card fx.
 * World: Ollie's feet at (0, BATTLE_FEET_Y); the portrait is 220 x 220 world px.
 */
import * as Phaser from "phaser";
import type { SpriteKey } from "@/lib/game/assets";
import type { AgentMood, ToStage } from "@/lib/game/bus";
import { hubTheme, portraitKey } from "@/lib/game/hubMap";
import { BATTLE_BOX, BATTLE_FEET_Y, battleFit } from "./layout";
import type { StageRuntime } from "./runtime";
import { StageScene, type ArtRef } from "./StageScene";
import { FX, FX_SIZE, WORD_SIZE, wordTex, type WordKey } from "./textures";

export type FxName = Extract<ToStage, { type: "fx" }>["fx"];

const MOODS: AgentMood[] = ["idle", "eager", "busted", "sad", "celebrate"];

/** Handy anchor points on the portrait (world px). */
const P = {
  feet: { x: 0, y: BATTLE_FEET_Y },
  chest: { x: 0, y: BATTLE_FEET_Y - 70 },
  face: { x: 0, y: BATTLE_FEET_Y - 138 },
  top: { x: 0, y: BATTLE_FEET_Y - 205 },
};

export class BattleScene extends StageScene {
  private bgG!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Image;
  private portrait!: ArtRef;
  private shown: AgentMood = "idle";
  private transientUntil = 0;
  private pop = { x: 1, y: 1, hop: 0 };
  private vignette!: Phaser.GameObjects.Image;
  private flash!: Phaser.GameObjects.Rectangle;
  private temp: Phaser.GameObjects.GameObject[] = [];

  constructor(rt: StageRuntime) {
    super("battle", rt);
  }

  protected computeFit(cssW: number, cssH: number) {
    // Keep Ollie above the "Done" tray (at most 40% of a short stage goes to the tray).
    const inset = Math.min(this.rt.battleInset, cssH * 0.4);
    this.fit = battleFit(cssW, cssH - inset);
    this.focus = { x: BATTLE_BOX.cx, y: BATTLE_BOX.cy + inset / 2 / this.fit };
  }

  /** The covered area changed: refit the camera. */
  relayout() {
    if (this.sys.isActive()) this.layout();
  }

  create() {
    this.temp = [];
    this.pop = { x: 1, y: 1, hop: 0 };
    this.transientUntil = 0;
    this.bgG = this.add.graphics().setDepth(-100);
    this.glow = this.add.image(0, P.chest.y - 20, FX.glow).setDepth(-50).setAlpha(0.9);
    this.flash = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setDepth(900);
    this.vignette = this.add.image(0, 0, FX.vignette).setDepth(950).setAlpha(0).setVisible(false);
    this.initStage();

    this.shown = this.rt.mood;
    this.portrait = this.addArt(this.portraitKey(this.shown), P.feet.x, P.feet.y);
    this.portrait.img.setDepth(0);

    if (this.game.input.touch) this.game.input.touch.capture = false;
    this.fadeIn();
    this.rt.sceneReady("battle");
  }

  /** The pathway agent's portrait for a mood (`${agentSprite}-${mood}`). */
  private portraitKey(mood: AgentMood): SpriteKey {
    return portraitKey(this.rt.stage, mood);
  }

  /** Keep every mood portrait crisp, not just the one on screen. */
  protected rasterKeys() {
    const m = super.rasterKeys();
    for (const mood of MOODS) m.set(this.portraitKey(mood), 1);
    return m;
  }

  protected onLayout() {
    if (!this.bgG) return;
    const v = this.view();
    this.drawBackdrop(v);
    this.flash.setPosition(v.x + v.w / 2, v.y + v.h / 2).setSize(v.w + 40, v.h + 40);
    this.flash.setOrigin(0.5);
    this.vignette.setPosition(v.x + v.w / 2, v.y + v.h / 2).setDisplaySize(v.w + 8, v.h + 8);
    this.glow.setDisplaySize(330, 330);
  }

  private drawBackdrop(v: { x: number; y: number; w: number; h: number }) {
    const g = this.bgG;
    g.clear();
    const x0 = v.x - 20;
    const x1 = v.x + v.w + 20;
    const y0 = v.y - 20;
    const y1 = v.y + v.h + 20;
    const horizon = BATTLE_FEET_Y - 34;
    // A themed room (the SOC) tints the backdrop with its hub colours; the office keeps its own.
    const th = this.rt.stage.hubMap.theme ? hubTheme(this.rt.stage.hubMap) : null;

    // Wall.
    g.fillStyle(th ? th.wallR : 0xf6f9f9, 1);
    g.fillRect(x0, y0, x1 - x0, horizon - y0);
    // Wainscot band + chair rail + baseboard, echoing the hub walls.
    g.fillStyle(th ? th.bandR : 0xe7f1ef, 1);
    g.fillRect(x0, horizon - 46, x1 - x0, 46);
    g.fillStyle(0xffffff, 1);
    g.fillRect(x0, horizon - 48, x1 - x0, 3);
    g.fillStyle(th ? th.rail : 0xc9dcd7, 1);
    g.fillRect(x0, horizon - 45, x1 - x0, 1);
    g.fillStyle(th ? th.baseR : 0x0f6a61, 1);
    g.fillRect(x0, horizon - 7, x1 - x0, 7);

    // Floor with soft perspective stripes.
    g.fillStyle(th ? th.tileB : 0xeef4f2, 1);
    g.fillRect(x0, horizon, x1 - x0, y1 - horizon);
    g.lineStyle(1, th ? th.grout : 0xdce6e3, 1);
    for (let i = -12; i <= 12; i++) {
      g.lineBetween(i * 34, horizon, i * 120, y1 + 40);
    }
    g.lineBetween(x0, horizon + 22, x1, horizon + 22);
    g.lineBetween(x0, horizon + 58, x1, horizon + 58);
    g.lineBetween(x0, horizon + 108, x1, horizon + 108);

    // Side dressing scales with the room left beside Ollie and is skipped on narrow stages,
    // so nothing is ever cut off at the edges.
    const side = v.w / 2 - 118;
    if (side >= 58) this.drawLeftSide(g, horizon, side);
    if (side >= 58) this.drawRightSide(g, horizon, side);

    // Platform under Ollie: a teal spotlight ellipse.
    g.fillStyle(0x0f6a61, 0.1);
    g.fillEllipse(0, BATTLE_FEET_Y - 4, 250, 40);
    g.fillStyle(0x0f6a61, 0.12);
    g.fillEllipse(0, BATTLE_FEET_Y - 4, 190, 28);
    g.lineStyle(2, 0x0f6a61, 0.35);
    g.strokeEllipse(0, BATTLE_FEET_Y - 4, 250, 40);
  }

  /** Window on the wall and a potted plant, left of Ollie. `side` = free width, world px. */
  private drawLeftSide(g: Phaser.GameObjects.Graphics, horizon: number, side: number) {
    const cx = -118 - side / 2;
    const ww = Math.min(128, side - 18);
    const wh = Math.min(118, ww * 0.95);
    const wx = cx - ww / 2;
    const wy = horizon - 70 - wh;
    g.fillStyle(0x111418, 0.05);
    g.fillRoundedRect(wx - 5, wy - 3, ww + 10, wh + 10, 6);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(wx - 6, wy - 6, ww + 12, wh + 12, 6);
    g.fillStyle(0xd7ecf2, 1);
    g.fillRect(wx, wy, ww, wh);
    g.fillStyle(0xc0dfe8, 1);
    g.fillRect(wx, wy + wh * 0.62, ww, wh * 0.38);
    g.fillStyle(0xaecfd9, 1);
    g.fillRect(wx + ww * 0.08, wy + wh * 0.52, ww * 0.18, wh * 0.48);
    g.fillRect(wx + ww * 0.32, wy + wh * 0.4, ww * 0.15, wh * 0.6);
    g.fillRect(wx + ww * 0.7, wy + wh * 0.58, ww * 0.22, wh * 0.42);
    g.fillStyle(0xffffff, 1);
    g.fillRect(wx + ww / 2 - 2, wy, 4, wh);
    g.fillRect(wx, wy + wh * 0.48, ww, 4);
    g.fillStyle(0xffffff, 0.55);
    g.fillTriangle(wx + 5, wy + 5, wx + ww * 0.3, wy + 5, wx + 5, wy + wh * 0.3);

    // Plant on the floor, nearer the viewer.
    const s = Math.min(1, side / 110);
    const px = cx + (side > 150 ? side * 0.18 : 0);
    const py = horizon + 40;
    g.fillStyle(0x111418, 0.08);
    g.fillEllipse(px, py + 3, 64 * s, 11 * s);
    g.fillStyle(0x2f8a5f, 1);
    for (const [ax, bx, by] of [
      [-6, -26, -98],
      [-2, -7, -116],
      [3, 17, -104],
      [5, 32, -80],
      [-4, -34, -72],
    ]) {
      g.fillTriangle(px + (ax - 5) * s, py - 38 * s, px + (ax + 5) * s, py - 38 * s, px + bx * s, py + by * s);
    }
    g.fillStyle(0x3fa374, 1);
    g.fillTriangle(px - 3 * s, py - 38 * s, px + 3 * s, py - 38 * s, px - 7 * s, py - 116 * s);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(px - 20 * s, py - 40 * s, 40 * s, 42 * s, 6 * s);
    g.fillStyle(0x0f6a61, 1);
    g.fillRect(px - 20 * s, py - 27 * s, 40 * s, 8 * s);
    g.fillStyle(0x111418, 0.06);
    g.fillRect(px + 8 * s, py - 40 * s, 12 * s, 42 * s);
  }

  /** Wall clock and the corner of Ollie's desk (monitor + mug), right of Ollie. */
  private drawRightSide(g: Phaser.GameObjects.Graphics, horizon: number, side: number) {
    const cx = 118 + side / 2;
    // Clock.
    const cr = Math.min(20, side * 0.2);
    const ccy = horizon - 150;
    g.fillStyle(0x0f6a61, 1);
    g.fillCircle(cx, ccy, cr);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, ccy, cr * 0.8);
    g.lineStyle(2.2, 0x111418, 1);
    g.lineBetween(cx, ccy, cx, ccy - cr * 0.55);
    g.lineBetween(cx, ccy, cx + cr * 0.4, ccy + cr * 0.15);
    g.fillStyle(0xf26b1d, 1);
    g.fillCircle(cx, ccy, 2);

    // Desk: its right end runs off-stage on purpose only when there is lots of room.
    const x0 = 132;
    const w = Math.min(230, side + 6);
    const top = horizon + 16;
    g.fillStyle(0x111418, 0.08);
    g.fillEllipse(x0 + w / 2, top + 60, w + 20, 16);
    g.fillStyle(0xc9d1d6, 1);
    g.fillRect(x0 + 12, top + 6, 7, 54);
    if (w > 150) g.fillRect(x0 + w - 22, top + 6, 7, 54);
    // Drawer unit.
    g.fillStyle(0xe9edf0, 1);
    g.fillRect(x0 + (w > 150 ? w - 70 : w - 52), top + 6, 46, 50);
    g.lineStyle(1, 0xc9d1d6, 1);
    g.lineBetween(x0 + (w > 150 ? w - 70 : w - 52), top + 22, x0 + (w > 150 ? w - 24 : w - 6), top + 22);
    g.lineBetween(x0 + (w > 150 ? w - 70 : w - 52), top + 38, x0 + (w > 150 ? w - 24 : w - 6), top + 38);
    g.fillStyle(0xe6d6b8, 1);
    g.fillRoundedRect(x0, top - 8, w, 14, 3);
    g.fillStyle(0xd2bf9c, 1);
    g.fillRect(x0, top + 3, w, 4);

    // Monitor asking the eternal question (when it fits).
    if (w >= 120) {
      const mx = x0 + 18;
      g.fillStyle(0x3a4149, 1);
      g.fillRect(mx + 42, top - 26, 10, 20);
      g.fillRoundedRect(mx + 26, top - 10, 42, 5, 2);
      g.fillStyle(0x111418, 1);
      g.fillRoundedRect(mx, top - 90, 94, 66, 6);
      g.fillStyle(0x16323a, 1);
      g.fillRect(mx + 6, top - 84, 82, 54);
      g.lineStyle(4, 0xf26b1d, 1);
      g.beginPath();
      g.arc(mx + 47, top - 57, 13, Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(250), false);
      g.strokePath();
      g.fillStyle(0xf26b1d, 1);
      g.fillTriangle(mx + 56, top - 71, mx + 66, top - 63, mx + 54, top - 59);
    }
    // Mug with a sticky note.
    const ux = w >= 120 ? x0 + 128 : x0 + 14;
    if (ux + 30 < x0 + w) {
      g.fillStyle(0xf26b1d, 1);
      g.fillRoundedRect(ux, top - 26, 22, 20, 4);
      g.lineStyle(3, 0xf26b1d, 1);
      g.strokeCircle(ux + 25, top - 17, 6);
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(ux + 4, top - 22, 4, 12);
    }
    if (w >= 180) {
      g.fillStyle(0xffe08a, 1);
      g.fillRect(x0 + 168, top - 20, 22, 14);
      g.fillStyle(0xd9b44a, 1);
      g.fillRect(x0 + 171, top - 16, 14, 1.5);
      g.fillRect(x0 + 171, top - 12, 10, 1.5);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Mood                                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Explicit moods (from React) show right away unless an fx mood is still playing; in that case
   * the fx mood finishes first and update() then settles on rt.mood. Fx pass transientMs.
   */
  setMood(mood: AgentMood, transientMs = 0) {
    if (transientMs > 0) {
      this.transientUntil = this.time.now + transientMs;
      this.showMood(mood);
      return;
    }
    if (this.transientUntil && this.time.now < this.transientUntil) return;
    this.showMood(mood);
  }

  private showMood(mood: AgentMood) {
    if (mood === this.shown) return;
    this.shown = mood;
    const img = this.portrait.img;
    if (this.rt.reducedMotion) {
      this.tweens.killTweensOf(img);
      this.tweens.add({
        targets: img,
        alpha: 0.35,
        duration: 70,
        onComplete: () => {
          this.setArtKey(this.portrait, this.portraitKey(mood));
          this.tweens.add({ targets: img, alpha: 1, duration: 110 });
        },
      });
      return;
    }
    this.setArtKey(this.portrait, this.portraitKey(mood));
    this.tweens.killTweensOf(this.pop);
    this.pop.x = 1.14;
    this.pop.y = 0.86;
    this.pop.hop = 0;
    this.tweens.add({ targets: this.pop, x: 1, y: 1, duration: 380, ease: "Back.easeOut" });
    this.tweens.add({ targets: this.pop, hop: 8, duration: 120, yoyo: true, ease: "Sine.easeOut" });
  }

  /* ---------------------------------------------------------------- */
  /* Fx                                                                */
  /* ---------------------------------------------------------------- */

  playFx(fx: FxName, intensity = 0.6) {
    const i = Phaser.Math.Clamp(intensity, 0, 1);
    switch (fx) {
      case "inspect":
        return this.fxInspect();
      case "catch":
        return this.fxCatch();
      case "risk":
        return this.fxRisk(i);
      case "execute-safe":
        return this.fxSafe();
      case "false-alarm":
        return this.fxFalseAlarm();
      case "escalate":
        return this.fxEscalate();
      case "rollback":
        return this.fxRollback();
      case "win":
        return this.fxWin();
      case "lose":
        return this.fxLose();
    }
  }

  private track<T extends Phaser.GameObjects.GameObject>(o: T, lifeMs: number): T {
    this.temp.push(o);
    this.time.delayedCall(lifeMs, () => {
      o.destroy();
      this.temp = this.temp.filter((x) => x !== o);
    });
    return o;
  }

  private img(key: string, x: number, y: number, w: number, h: number, life: number) {
    const im = this.add.image(x, y, key);
    im.setDisplaySize(w, h);
    return this.track(im, life);
  }

  /** Short fade in / hold / fade out used by every reduced-motion variant. */
  private calmShow(o: Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.GameObject, hold = 500) {
    o.setAlpha(0);
    this.tweens.chain({
      targets: o,
      tweens: [
        { alpha: 1, duration: 140 },
        { alpha: 1, duration: hold },
        { alpha: 0, duration: 200 },
      ],
    });
  }

  private flashColor(color: number, alpha: number, duration: number) {
    this.tweens.killTweensOf(this.flash);
    this.flash.setFillStyle(color, 1).setAlpha(alpha);
    this.tweens.add({ targets: this.flash, alpha: 0, duration, ease: "Quad.easeOut" });
  }

  /** Pops a baked word (see makeWordTextures) above Ollie. */
  private word(key: WordKey, y: number, life = 1100) {
    const size = WORD_SIZE[key] ?? { w: 120, h: 44 };
    const t = this.img(wordTex(key), 0, y, size.w, size.h, life);
    t.setDepth(800);
    if (this.rt.reducedMotion) {
      this.calmShow(t, life - 400);
      return t;
    }
    const s = t.scale;
    t.setScale(s * 0.3).setAngle(-8);
    this.tweens.add({ targets: t, scale: s, angle: -4, duration: 320, ease: "Back.easeOut" });
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, delay: life - 380, duration: 360, ease: "Sine.easeIn" });
    return t;
  }

  private particles(key: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, count: number, x: number, y: number, life: number) {
    const e = this.add.particles(0, 0, key, { emitting: false, ...cfg });
    e.setDepth(700);
    e.explode(count, x, y);
    return this.track(e, life + 100);
  }

  private fxInspect() {
    const scanW = 230;
    if (this.rt.reducedMotion) {
      this.flashColor(0x43e0c4, 0.18, 400);
      this.calmShow(this.img(FX.mag, 36, P.face.y + 10, FX_SIZE.mag, FX_SIZE.mag, 1000), 400);
      return;
    }
    // Scanline sweeping down.
    const scan = this.img(FX.scan, 0, P.top.y, scanW, 36, 900);
    scan.setAlpha(0.95);
    this.tweens.add({ targets: scan, y: P.feet.y - 6, duration: 760, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: scan, alpha: 0, delay: 640, duration: 180 });
    // Magnifier sweeping across the face.
    const mag = this.img(FX.mag, -110, P.face.y + 30, FX_SIZE.mag, FX_SIZE.mag, 1300);
    mag.setDepth(810).setAlpha(0).setAngle(-12);
    this.tweens.add({ targets: mag, alpha: 1, duration: 140 });
    this.tweens.add({ targets: mag, x: 70, duration: 900, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: mag, y: P.face.y - 4, duration: 450, yoyo: true, ease: "Sine.easeOut" });
    this.tweens.add({ targets: mag, angle: 10, duration: 900, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: mag, alpha: 0, scale: mag.scale * 1.2, delay: 1000, duration: 240 });
  }

  private fxCatch() {
    this.setMood("busted", 1700);
    this.word("busted", P.top.y + 10, 1300);
    if (this.rt.reducedMotion) return;
    this.shake(4, 240);
    this.flashColor(0x43e0c4, 0.22, 260);
    this.particles(
      FX.dot,
      {
        speed: { min: 110, max: 260 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 450, max: 800 },
        gravityY: 260,
        scale: { start: 1.3 / this.rt.fxRes, end: 0 },
        tint: [0x0f6a61, 0x43e0c4, 0x1b7a70, 0xffffff],
      },
      30,
      P.chest.x,
      P.chest.y,
      900,
    );
    this.particles(
      FX.star,
      {
        speed: { min: 60, max: 170 },
        angle: { min: 200, max: 340 },
        lifespan: 700,
        scale: { start: 1.1 / this.rt.fxRes, end: 0 },
        rotate: { start: 0, end: 180 },
        tint: [0x43e0c4, 0x0f6a61],
      },
      8,
      P.face.x,
      P.face.y,
      800,
    );
  }

  private fxRisk(i: number) {
    this.setMood("eager", 1400);
    this.flashColor(i >= 0.6 ? 0xb42318 : 0xf26b1d, 0.16 + 0.2 * i, 380 + 220 * i);
    this.word(i >= 0.5 ? "yikes" : "oops", P.top.y + 12, 1100);
    if (this.rt.reducedMotion) return;
    this.shake(5 + 11 * i, 340 + 180 * i);
    const n = Math.round(4 + 7 * i);
    const cfg = (min: number, max: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig => ({
      speed: { min: 150, max: 280 + 160 * i },
      angle: { min, max },
      lifespan: { min: 800, max: 1250 },
      gravityY: 480,
      delay: { min: 0, max: 140 },
      rotate: { start: -35, end: 35 },
      scale: { start: (1.3 + 0.5 * i) / this.rt.fxRes, end: 0.7 / this.rt.fxRes },
      alpha: { start: 1, end: 0 },
      emitZone: { type: "random", source: new Phaser.Geom.Circle(0, 0, 26), quantity: 1 },
    });
    // Two sprays from Ollie's shoulders, fanning away from its face.
    this.particles(FX.tri, cfg(185, 265), n, -64, P.chest.y - 24, 1400);
    this.particles(FX.tri, cfg(275, 355), n, 64, P.chest.y - 24, 1400);
  }

  private fxSafe() {
    const cy = P.face.y - 38;
    const check = this.img(FX.check, 78, cy, FX_SIZE.check, FX_SIZE.check, 1200);
    check.setDepth(820);
    if (this.rt.reducedMotion) {
      this.calmShow(check, 500);
      return;
    }
    const s = check.scale;
    check.setScale(s * 0.3).setAlpha(0);
    this.tweens.add({ targets: check, scale: s, alpha: 1, duration: 260, ease: "Back.easeOut" });
    this.tweens.add({ targets: check, y: cy - 22, delay: 200, duration: 800, ease: "Sine.easeOut" });
    this.tweens.add({ targets: check, alpha: 0, delay: 820, duration: 300 });
    this.particles(
      FX.star,
      {
        speed: { min: 30, max: 90 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 400, max: 700 },
        scale: { start: 1 / this.rt.fxRes, end: 0 },
        tint: [0x43e0c4, 0x0f6a61, 0xffffff],
      },
      10,
      78,
      cy,
      800,
    );
  }

  private fxFalseAlarm() {
    this.setMood("sad", 1700);
    const marks = [
      { x: -86, y: P.face.y - 14, d: 0, a: -14 },
      { x: -48, y: P.face.y - 62, d: 150, a: -4 },
      { x: 88, y: P.face.y - 30, d: 300, a: 14 },
    ];
    for (const m of marks) {
      const qs = WORD_SIZE.question ?? { w: 30, h: 56 };
      const q = this.add.image(m.x, m.y, wordTex("question")).setDisplaySize(qs.w, qs.h).setDepth(820).setAngle(m.a);
      this.track(q, 1500);
      if (this.rt.reducedMotion) {
        this.calmShow(q, 700);
        continue;
      }
      const qScale = q.scale;
      q.setAlpha(0).setScale(qScale * 0.4);
      this.tweens.add({ targets: q, alpha: 1, scale: qScale, delay: m.d, duration: 240, ease: "Back.easeOut" });
      this.tweens.add({ targets: q, y: m.y - 14, delay: m.d, duration: 1200, ease: "Sine.easeOut" });
      this.tweens.add({ targets: q, angle: m.a + (m.a < 0 ? -10 : 10), delay: m.d, duration: 300, yoyo: true, repeat: 1 });
      this.tweens.add({ targets: q, alpha: 0, delay: m.d + 950, duration: 300 });
    }
  }

  private fxEscalate() {
    const arrow = this.img(FX.arrow, 82, P.chest.y + 10, FX_SIZE.arrow.w * 1.25, FX_SIZE.arrow.h * 1.25, 1100);
    arrow.setDepth(820);
    if (this.rt.reducedMotion) {
      arrow.setPosition(82, P.face.y);
      this.calmShow(arrow, 500);
      return;
    }
    const v = this.view();
    const sy = arrow.scaleY;
    arrow.setAlpha(0);
    this.tweens.add({ targets: arrow, alpha: 1, duration: 120 });
    this.tweens.add({ targets: arrow, y: P.chest.y + 30, duration: 160, ease: "Sine.easeOut" });
    this.tweens.add({
      targets: arrow,
      y: v.y - 60,
      scaleY: sy * 1.35,
      delay: 180,
      duration: 520,
      ease: "Cubic.easeIn",
    });
    this.particles(
      FX.streak,
      {
        x: { min: -24, max: 24 },
        speedY: { min: -520, max: -300 },
        speedX: 0,
        lifespan: 520,
        scaleX: 1 / this.rt.fxRes,
        scaleY: { start: 1.6 / this.rt.fxRes, end: 0.4 / this.rt.fxRes },
        alpha: { start: 0.9, end: 0 },
        tint: [0x0f6a61, 0x43e0c4],
        delay: { min: 150, max: 420 },
      },
      14,
      82,
      P.chest.y + 20,
      1000,
    );
  }

  private fxRollback() {
    const swirl = this.img(FX.swirl, 0, P.chest.y - 30, FX_SIZE.swirl * 1.4, FX_SIZE.swirl * 1.4, 1200);
    swirl.setDepth(820);
    if (this.rt.reducedMotion) {
      this.calmShow(swirl, 450);
      return;
    }
    const s = swirl.scale;
    swirl.setScale(s * 0.5).setAlpha(0);
    this.tweens.add({ targets: swirl, alpha: 0.95, scale: s, duration: 260, ease: "Back.easeOut" });
    this.tweens.add({ targets: swirl, angle: -540, duration: 1000, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: swirl, alpha: 0, scale: s * 1.25, delay: 820, duration: 260 });
    this.flashColor(0xe7f1ef, 0.5, 500);
    // Ollie gets "rewound": a quick wobble.
    this.tweens.add({ targets: this.pop, x: 0.92, duration: 90, yoyo: true, repeat: 2 });
  }

  private fxWin() {
    this.setMood("celebrate", 3200);
    this.flashColor(0xffffff, 0.6, 500);
    if (this.rt.reducedMotion) {
      this.word("saved", P.top.y + 4, 1800);
      return;
    }
    const v = this.view();
    const k = 1.4 / this.rt.fxRes;
    const confetti = (depth: number, count: number, again: number) => {
      const e = this.add.particles(v.x + v.w / 2, v.y - 12, FX.confetti, {
        emitting: false,
        x: { min: -v.w / 2, max: v.w / 2 },
        speedY: { min: 60, max: 180 },
        speedX: { min: -50, max: 50 },
        gravityY: 90,
        lifespan: { min: 2200, max: 3200 },
        rotate: {
          onEmit: () => Math.random() * 360,
          onUpdate: (_p: Phaser.GameObjects.Particles.Particle, _k: string, _t: number, value: number) => value + 7,
        },
        // Flip like paper: squash X over time with a per-piece phase.
        scaleX: {
          onEmit: () => k,
          onUpdate: (p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) =>
            k * Math.abs(Math.cos(t * 26 + p.x * 0.05)),
        },
        scaleY: k,
        tint: [0x0f6a61, 0xf26b1d, 0x43e0c4, 0x111418, 0xffc19a],
      });
      e.setDepth(depth);
      e.explode(count);
      this.time.delayedCall(260, () => e.active && e.explode(again));
      this.track(e, 3700);
    };
    const n = Math.min(90, 40 + v.w * 0.12);
    // Some confetti falls behind Ollie, some in front, for depth.
    confetti(-10, Math.round(n * 0.6), 30);
    confetti(760, Math.round(n * 0.5), 20);
  }

  private fxLose() {
    this.setMood("sad", 2800);
    const v = this.vignette;
    this.tweens.killTweensOf(v);
    v.setVisible(true).setAlpha(0);
    this.tweens.chain({
      targets: v,
      tweens: [
        { alpha: 1, duration: this.rt.reducedMotion ? 200 : 420, ease: "Sine.easeOut" },
        { alpha: 0.75, duration: this.rt.reducedMotion ? 1600 : 380, yoyo: !this.rt.reducedMotion, repeat: this.rt.reducedMotion ? 0 : 1 },
        { alpha: 0, delay: 600, duration: 900, ease: "Sine.easeIn" },
      ],
      onComplete: () => v.setVisible(false),
    });
    if (!this.rt.reducedMotion) this.shake(3, 300);
  }

  onReducedMotion() {
    if (this.rt.reducedMotion) {
      this.pop = { x: 1, y: 1, hop: 0 };
      for (const o of this.temp) if (o instanceof Phaser.GameObjects.Particles.ParticleEmitter) o.killAll();
    }
  }

  /* ---------------------------------------------------------------- */
  /* Frame                                                             */
  /* ---------------------------------------------------------------- */

  update(time: number, delta: number) {
    this.stepShake(delta);
    if (this.transientUntil && time > this.transientUntil) {
      this.transientUntil = 0;
      this.showMood(this.rt.mood);
    }
    const calm = this.rt.reducedMotion;
    const t = time / 1000;
    const b = calm ? 0 : Math.sin(t * 2.6) * 0.016;
    const img = this.portrait.img;
    img.setScale(this.portrait.sx * this.pop.x * (1 - b * 0.5), this.portrait.sy * this.pop.y * (1 + b));
    img.y = P.feet.y - this.pop.hop;
    this.glow.setAlpha(calm ? 0.85 : 0.8 + Math.sin(t * 1.3) * 0.08);
  }
}
