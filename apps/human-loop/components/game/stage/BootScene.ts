/**
 * Rasterizes all SVG art at a scale that suits the current stage size, draws fx textures,
 * waits briefly for the display font, then hands over to the hub or battle scene.
 */
import * as Phaser from "phaser";
import { SPRITES, type SpriteKey } from "@/lib/game/assets";
import { battleFit, hubFit, hubPortraitZoom, rasterFor } from "./layout";
import type { StageRuntime } from "./runtime";
import { loadAllArt } from "./art";
import { makeFxTextures, makeWordTextures } from "./textures";

export class BootScene extends Phaser.Scene {
  private rt: StageRuntime;

  constructor(rt: StageRuntime) {
    super({ key: "boot" });
    this.rt = rt;
  }

  create() {
    const { dpr, cssW, cssH } = this.rt;
    const hub = rasterFor(dpr, hubFit(cssW, cssH) * hubPortraitZoom(cssW, cssH), 1, 4.5);
    const battle = rasterFor(dpr, battleFit(cssW, cssH), 1, 4);
    this.rt.fxRes = Math.min(6, Math.max(2, Math.ceil(dpr * battleFit(cssW, cssH))));
    makeFxTextures(this, this.rt.fxRes);

    // Pop words are baked with the web font; do not wait long for it.
    const family = this.rt.fonts.display;
    const fontReady: Promise<unknown> =
      typeof document !== "undefined" && document.fonts
        ? Promise.race([
            Promise.all([document.fonts.load(`700 32px ${family}`), document.fonts.load(`600 32px ${family}`)]),
            new Promise((r) => setTimeout(r, 1200)),
          ]).catch(() => undefined)
        : Promise.resolve();

    // Only the starting mode's art blocks the first frame; the rest (the big battle portraits,
    // or the office props) rasterizes just after, before the first mode switch needs it.
    const scaleFor = (key: SpriteKey) => (key.startsWith("resetbot-") ? battle : hub);
    const all = Object.keys(SPRITES) as SpriteKey[];
    const forBattle = (key: SpriteKey) => key.startsWith("resetbot-");
    const now = all.filter((k) => forBattle(k) === (this.rt.mode === "battle"));
    const later = all.filter((k) => !now.includes(k));
    const art = loadAllArt(this, this.rt, scaleFor, now);
    Promise.all([art, fontReady]).then(() => {
      if (this.rt.dead || !this.sys.settings || !this.sys.isActive()) return;
      makeWordTextures(this, this.rt.fxRes, family);
      const textures = this.textures;
      const rt = this.rt;
      rt.artPending = new Promise<void>((r) => setTimeout(r, 250))
        .then(() => (rt.dead ? undefined : loadAllArt({ textures } as Phaser.Scene, rt, scaleFor, later)))
        .catch(() => undefined)
        .then(() => {
          rt.artPending = null;
        });
      this.rt.switching = true;
      this.scene.start(this.rt.mode);
    });
  }
}
