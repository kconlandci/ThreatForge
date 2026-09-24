/**
 * Base class for the hub and battle scenes: HiDPI camera fit, custom shake (camera.shake
 * misbehaves with the DPR zoom), fades, and SVG art that is re-rasterized when the stage grows.
 *
 * HiDPI pattern (Phaser 4 bug #7351 workaround): the canvas is CSS size * DPR with scale mode
 * NONE and zoom 1/DPR; each camera zooms by DPR * fit, where fit = CSS px per world px.
 */
import * as Phaser from "phaser";
import { SPRITES, type SpriteKey } from "@/lib/game/assets";
import { rasterFor } from "./layout";
import type { StageRuntime } from "./runtime";
import { artTexKey, loadArt } from "./art";

export interface ArtRef {
  img: Phaser.GameObjects.Image;
  key: SpriteKey;
  /** World size multiplier (1 = the size in lib/game/assets.ts). */
  size: number;
  /** Base scale that maps the texture to its world size. */
  sx: number;
  sy: number;
}

const MAX_RASTER = 4.5;

export abstract class StageScene extends Phaser.Scene {
  protected rt: StageRuntime;
  protected fit = 1;
  protected focus = { x: 0, y: 0 };
  protected arts: ArtRef[] = [];
  private shakeLeft = 0;
  private shakeDur = 1;
  private shakeAmp = 0;
  private rasterTimer: Phaser.Time.TimerEvent | null = null;
  private rasterBusy = false;

  constructor(key: string, rt: StageRuntime) {
    super({ key, active: false });
    this.rt = rt;
  }

  /** Set this.fit and this.focus for the current canvas size. */
  protected abstract computeFit(cssW: number, cssH: number): void;
  /** Re-place anything that depends on the visible area. */
  protected onLayout(): void {}
  /** Called when reduced motion changes. */
  onReducedMotion(): void {}

  /** Call first in create(). */
  protected initStage() {
    this.arts = [];
    this.shakeLeft = 0;
    this.rasterBusy = false;
    this.rasterTimer = null;
    const onResize = () => this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      this.arts = [];
    });
    this.layout();
  }

  protected layout() {
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    this.computeFit(this.rt.cssW, this.rt.cssH);
    cam.setZoom(this.rt.dpr * this.fit);
    this.centerCamera(0, 0);
    this.onLayout();
    this.scheduleRasterCheck();
  }

  protected centerCamera(ox: number, oy: number) {
    this.cameras.main.centerOn(this.focus.x + ox, this.focus.y + oy);
  }

  /** Visible world rectangle. */
  protected view() {
    const z = this.rt.dpr * this.fit;
    const w = this.scale.width / z;
    const h = this.scale.height / z;
    return { x: this.focus.x - w / 2, y: this.focus.y - h / 2, w, h };
  }

  /** Screen shake in world px (skipped with reduced motion). */
  protected shake(amp: number, duration: number) {
    if (this.rt.reducedMotion) return;
    if (this.shakeLeft > 0 && this.shakeAmp > amp) return;
    this.shakeAmp = amp;
    this.shakeDur = duration;
    this.shakeLeft = duration;
  }

  protected isShaking(): boolean {
    return this.shakeLeft > 0;
  }

  /** Call from update(). */
  protected stepShake(delta: number) {
    if (this.shakeLeft <= 0) return;
    this.shakeLeft -= delta;
    if (this.shakeLeft <= 0 || this.rt.reducedMotion) {
      this.shakeLeft = 0;
      this.centerCamera(0, 0);
      return;
    }
    const k = this.shakeLeft / this.shakeDur;
    const a = this.shakeAmp * k * k;
    this.centerCamera((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a * 0.7);
  }

  fadeIn(done?: () => void) {
    const cam = this.cameras.main;
    cam.setAlpha(0);
    this.tweens.add({
      targets: cam,
      alpha: 1,
      duration: this.rt.reducedMotion ? 120 : 220,
      ease: "Sine.easeOut",
      onComplete: () => done?.(),
    });
  }

  fadeOut(done: () => void) {
    const cam = this.cameras.main;
    this.tweens.killTweensOf(cam);
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: this.rt.reducedMotion ? 100 : 180,
      ease: "Sine.easeIn",
      onComplete: () => done(),
    });
  }

  /* ---------------------------------------------------------------- */
  /* Art                                                               */
  /* ---------------------------------------------------------------- */

  protected addArt(key: SpriteKey, x: number, y: number, size = 1): ArtRef {
    const def = SPRITES[key];
    const tex = this.rt.art[key]?.tex ?? "__MISSING";
    const img = this.add.image(x, y, tex).setOrigin(def.originX, def.originY);
    const ref: ArtRef = { img, key, size, sx: 1, sy: 1 };
    this.fitArt(ref);
    this.arts.push(ref);
    return ref;
  }

  private fitArt(ref: ArtRef) {
    const def = SPRITES[ref.key];
    const frame = ref.img.frame;
    ref.sx = (def.w * ref.size) / Math.max(1, frame.realWidth);
    ref.sy = (def.h * ref.size) / Math.max(1, frame.realHeight);
    ref.img.setScale(ref.sx, ref.sy);
  }

  /** Swap an art image to another sprite key (e.g. a mood portrait) keeping its world size. */
  protected setArtKey(ref: ArtRef, key: SpriteKey) {
    ref.key = key;
    const tex = this.rt.art[key]?.tex;
    if (tex) ref.img.setTexture(tex);
    const def = SPRITES[key];
    ref.img.setOrigin(def.originX, def.originY);
    this.fitArt(ref);
  }

  private scheduleRasterCheck() {
    if (this.rasterTimer) this.rasterTimer.remove(false);
    this.rasterTimer = this.time.delayedCall(350, () => this.checkRaster());
  }

  /** Keys (with their world size) this scene wants crisp; defaults to what it has on screen. */
  protected rasterKeys(): Map<SpriteKey, number> {
    const m = new Map<SpriteKey, number>();
    for (const a of this.arts) m.set(a.key, Math.max(m.get(a.key) ?? 0, a.size));
    return m;
  }

  private checkRaster() {
    if (this.rasterBusy || this.rt.dead || !this.sys.isActive()) return;
    const want: { key: SpriteKey; scale: number }[] = [];
    for (const [key, size] of this.rasterKeys()) {
      const cur = this.rt.art[key];
      if (!cur || cur.placeholder) continue;
      const need = rasterFor(this.rt.dpr, this.fit, size, MAX_RASTER);
      if (need > cur.scale * 1.15) want.push({ key, scale: need });
    }
    if (!want.length) return;
    this.rasterBusy = true;
    loadArt(this, this.rt, want).then((ok) => {
      this.rasterBusy = false;
      if (this.rt.dead || !this.sys.isActive()) return;
      for (const w of want) {
        if (!ok.includes(w.key)) continue;
        const tex = artTexKey(w.key, w.scale);
        const old = this.rt.art[w.key]?.tex;
        this.rt.art[w.key] = { tex, scale: w.scale, placeholder: false };
        for (const a of this.arts) {
          if (a.key !== w.key) continue;
          a.img.setTexture(tex);
          this.fitArt(a);
        }
        if (old && old !== tex && this.textures.exists(old)) this.textures.remove(old);
      }
      this.onArtSwapped();
    });
  }

  /** Called after textures were re-rasterized (animated scales should re-apply). */
  protected onArtSwapped(): void {}
}
