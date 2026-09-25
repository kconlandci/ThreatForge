/**
 * SVG art -> crisp canvas textures, without Phaser's SVG loader (it throws on malformed files,
 * which would take the whole stage down while art is still being edited).
 *
 * Each sprite is fetched, validated with DOMParser, rasterized at w*scale x h*scale into a
 * canvas and added to the texture manager. Anything that fails gets a placeholder.
 */
import type * as Phaser from "phaser";
import { SPRITES, type SpriteKey } from "@/lib/game/assets";
import type { StageRuntime } from "./runtime";
import { fetchSvg } from "./svgCache";
import { drawPlaceholder } from "./textures";

/** Rasterizes an SVG file to a canvas of exactly w x h device pixels, or null on any failure. */
export async function rasterizeSvg(url: string, viewW: number, viewH: number, w: number, h: number) {
  const text = await fetchSvg(url);
  if (!text || typeof DOMParser === "undefined") return null;
  try {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) return null;
    if (!svg.hasAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${viewW} ${viewH}`);
    svg.setAttribute("width", `${w}px`);
    svg.setAttribute("height", `${h}px`);
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
    const src = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.decoding = "async";
      const loaded = new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
      img.src = src;
      if (!(await loaded)) return null;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      return canvas;
    } finally {
      URL.revokeObjectURL(src);
    }
  } catch {
    return null;
  }
}

export const artTexKey = (key: SpriteKey, scale: number) => `${key}@${scale.toFixed(2)}`;

/**
 * Loads (or re-rasterizes) sprites at the given scales. Resolves with the keys that loaded.
 * Textures are only added while the game is alive.
 */
export async function loadArt(
  scene: Phaser.Scene,
  rt: StageRuntime,
  wants: { key: SpriteKey; scale: number }[],
): Promise<SpriteKey[]> {
  const done: SpriteKey[] = [];
  await Promise.all(
    wants.map(async ({ key, scale }) => {
      const def = SPRITES[key];
      const w = Math.max(1, Math.round(def.w * scale));
      const h = Math.max(1, Math.round(def.h * scale));
      const canvas = await rasterizeSvg(def.file, def.w, def.h, w, h);
      if (!canvas || rt.dead) return;
      const tex = artTexKey(key, scale);
      // addImage (not addCanvas): a CanvasTexture reads every pixel back with getImageData.
      if (!scene.textures.exists(tex)) scene.textures.addImage(tex, canvas as unknown as HTMLImageElement);
      done.push(key);
    }),
  );
  return done;
}

/** First load: these sprites at their starting scale; placeholders for failures. */
export async function loadAllArt(
  scene: Phaser.Scene,
  rt: StageRuntime,
  scaleFor: (key: SpriteKey) => number,
  keys: SpriteKey[],
) {
  const wants = keys.map((key) => ({ key, scale: scaleFor(key) }));
  const ok = new Set(await loadArt(scene, rt, wants));
  if (rt.dead) return;
  for (const { key, scale } of wants) {
    if (ok.has(key)) {
      rt.art[key] = { tex: artTexKey(key, scale), scale, placeholder: false };
      continue;
    }
    console.warn(`[stage] could not load ${SPRITES[key].file}; using a placeholder`);
    const s = Math.min(3, scale);
    const tex = `${key}@placeholder`;
    drawPlaceholder(scene, tex, SPRITES[key], s);
    rt.art[key] = { tex, scale: s, placeholder: true };
  }
}
