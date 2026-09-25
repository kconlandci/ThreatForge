/**
 * Runtime-drawn textures: tidy placeholders for art that failed to load, and small fx sprites.
 * Everything is drawn with Canvas 2D at a raster scale so it stays crisp at the camera zoom.
 */
import type * as Phaser from "phaser";
import { BRAND } from "@/lib/brand";
import type { SpriteDef } from "@/lib/game/assets";

type Ctx = CanvasRenderingContext2D;

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, res: number, draw: (ctx: Ctx) => void) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  // A plain canvas added as an image: Phaser's CanvasTexture would call getImageData on every
  // texture, which cost ~0.6 s of main thread on a throttled phone profile.
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w * res));
  canvas.height = Math.max(1, Math.ceil(h * res));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(res, res);
  draw(ctx);
  scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
}

function poly(ctx: Ctx, pts: [number, number][], fill: string) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function shadow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(17,20,24,0.12)";
  ctx.fill();
}

/** Draws a clean stand-in for a sprite whose SVG did not load, so the stage never breaks. */
export function drawPlaceholder(scene: Phaser.Scene, texKey: string, def: SpriteDef, res: number) {
  const { w, h } = def;
  const ox = def.originX * w;
  const oy = def.originY * h;
  canvasTexture(scene, texKey, w, h, res, (ctx) => {
    if (def.kind === "character" || def.kind === "portrait") {
      // Capsule character: body + head, brand colours by who it is.
      const agent = def.tone === "agent";
      const body = def.tone === "player" ? BRAND.ink : def.tone === "coach" ? BRAND.orange : BRAND.teal;
      const bw = w * 0.5;
      const bh = (oy - h * 0.08) * 0.55;
      shadow(ctx, ox, oy, w * 0.3, w * 0.09);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(ox - bw / 2, oy - bh - 2, bw, bh, bw * 0.35);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ox, oy - bh - bw * 0.55, bw * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = agent ? BRAND.tealDark : "#C98B63";
      ctx.fill();
      if (agent) {
        ctx.fillStyle = BRAND.orange;
        ctx.beginPath();
        ctx.arc(ox, oy - bh / 2 - 2, bw * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (def.kind === "decor") {
      ctx.fillStyle = BRAND.line;
      ctx.beginPath();
      ctx.roundRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8, 4);
      ctx.fill();
      ctx.fillStyle = BRAND.tealTint;
      ctx.beginPath();
      ctx.roundRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64, 3);
      ctx.fill();
      return;
    }
    if (def.kind === "marker") {
      ctx.fillStyle = def.key === "tap-ring" ? "rgba(15,106,97,0.35)" : BRAND.orange;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.45, h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // Iso box sitting on its floor anchor.
    const hw = Math.min(w * 0.42, 30);
    const hh = hw / 2;
    const top = Math.max(12, oy - hh - h * 0.12);
    const height = oy - top - hh;
    shadow(ctx, ox, oy, hw * 1.05, hh * 1.05);
    poly(ctx, [[ox - hw, oy - height], [ox, oy + hh - height], [ox, oy + hh], [ox - hw, oy]], "#B9C6C3");
    poly(ctx, [[ox, oy + hh - height], [ox + hw, oy - height], [ox + hw, oy], [ox, oy + hh]], "#94A6A2");
    poly(ctx, [[ox, oy - hh - height], [ox + hw, oy - height], [ox, oy + hh - height], [ox - hw, oy - height]], "#D8E3E0");
  });
}

/** Names of the generated fx textures. */
export const FX = {
  dot: "fx-dot",
  star: "fx-star",
  tri: "fx-tri",
  check: "fx-check",
  arrow: "fx-arrow",
  swirl: "fx-swirl",
  mag: "fx-mag",
  scan: "fx-scan",
  vignette: "fx-vignette",
  glow: "fx-glow",
  confetti: "fx-confetti",
  streak: "fx-streak",
  led: "fx-led",
  ring: "fx-ring",
} as const;

/** World-unit sizes of the fx textures (textures are drawn at res px per unit). */
export const FX_SIZE = {
  dot: 8,
  star: 14,
  tri: 18,
  check: 34,
  arrow: { w: 48, h: 64 },
  swirl: 150,
  mag: 64,
  scan: { w: 256, h: 48 },
  vignette: 256,
  glow: 128,
  confetti: { w: 8, h: 4 },
  streak: { w: 3, h: 30 },
  led: 8,
  ring: 64,
} as const;

export function makeFxTextures(scene: Phaser.Scene, res: number) {
  canvasTexture(scene, FX.dot, FX_SIZE.dot, FX_SIZE.dot, res, (c) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(4, 4, 3.6, 0, Math.PI * 2);
    c.fill();
  });

  canvasTexture(scene, FX.star, FX_SIZE.star, FX_SIZE.star, res, (c) => {
    const m = FX_SIZE.star / 2;
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(m, 0.5);
    c.quadraticCurveTo(m, m, FX_SIZE.star - 0.5, m);
    c.quadraticCurveTo(m, m, m, FX_SIZE.star - 0.5);
    c.quadraticCurveTo(m, m, 0.5, m);
    c.quadraticCurveTo(m, m, m, 0.5);
    c.fill();
  });

  canvasTexture(scene, FX.tri, FX_SIZE.tri, FX_SIZE.tri, res, (c) => {
    const s = FX_SIZE.tri;
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(s / 2, 1.5);
    c.lineTo(s - 1.5, s - 2);
    c.lineTo(1.5, s - 2);
    c.closePath();
    c.fillStyle = BRAND.orange;
    c.strokeStyle = BRAND.ink;
    c.lineWidth = 1.6;
    c.fill();
    c.stroke();
    c.fillStyle = BRAND.ink;
    c.beginPath();
    c.roundRect(s / 2 - 1, 6, 2, 6, 1);
    c.fill();
    c.beginPath();
    c.arc(s / 2, 13.6, 1.2, 0, Math.PI * 2);
    c.fill();
  });

  canvasTexture(scene, FX.check, FX_SIZE.check, FX_SIZE.check, res, (c) => {
    const s = FX_SIZE.check;
    c.fillStyle = "rgba(10,76,69,0.25)";
    c.beginPath();
    c.arc(s / 2, s / 2 + 1.5, s / 2 - 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = BRAND.teal;
    c.beginPath();
    c.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#fff";
    c.lineWidth = 3.4;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(s * 0.3, s * 0.52);
    c.lineTo(s * 0.45, s * 0.66);
    c.lineTo(s * 0.72, s * 0.36);
    c.stroke();
  });

  canvasTexture(scene, FX.arrow, FX_SIZE.arrow.w, FX_SIZE.arrow.h, res, (c) => {
    const { w, h } = FX_SIZE.arrow;
    c.lineJoin = "round";
    const pts: [number, number][] = [
      [w / 2, 2],
      [w - 3, h * 0.46],
      [w * 0.68, h * 0.46],
      [w * 0.68, h - 3],
      [w * 0.32, h - 3],
      [w * 0.32, h * 0.46],
      [3, h * 0.46],
    ];
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fillStyle = BRAND.teal;
    c.fill();
    c.strokeStyle = BRAND.tealDark;
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.beginPath();
    c.moveTo(w / 2, 8);
    c.lineTo(w * 0.24, h * 0.4);
    c.lineTo(w * 0.4, h * 0.4);
    c.closePath();
    c.fill();
  });

  canvasTexture(scene, FX.swirl, FX_SIZE.swirl, FX_SIZE.swirl, res, (c) => {
    const s = FX_SIZE.swirl;
    const r = s / 2 - 12;
    c.lineCap = "round";
    // Counter-clockwise "rewind" ring with an arrowhead, in two teal tones.
    c.strokeStyle = BRAND.teal;
    c.lineWidth = 7;
    c.beginPath();
    c.arc(s / 2, s / 2, r, Math.PI * 1.1, Math.PI * 2.75);
    c.stroke();
    c.strokeStyle = "rgba(15,106,97,0.35)";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(s / 2, s / 2, r - 9, Math.PI * 1.25, Math.PI * 2.55);
    c.stroke();
    const a = Math.PI * 1.1;
    const ax = s / 2 + Math.cos(a) * r;
    const ay = s / 2 + Math.sin(a) * r;
    c.fillStyle = BRAND.teal;
    c.beginPath();
    c.moveTo(ax - 12, ay + 5);
    c.lineTo(ax + 9, ay + 9);
    c.lineTo(ax + 1, ay - 13);
    c.closePath();
    c.fill();
  });

  canvasTexture(scene, FX.mag, FX_SIZE.mag, FX_SIZE.mag, res, (c) => {
    const cx = 25;
    const cy = 25;
    c.lineCap = "round";
    c.strokeStyle = BRAND.ink;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(cx + 15, cy + 15);
    c.lineTo(58, 58);
    c.stroke();
    c.strokeStyle = BRAND.orange;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx + 22, cy + 22);
    c.lineTo(57, 57);
    c.stroke();
    c.fillStyle = "rgba(231,241,239,0.55)";
    c.beginPath();
    c.arc(cx, cy, 19, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = BRAND.ink;
    c.lineWidth = 5;
    c.stroke();
    c.strokeStyle = "rgba(255,255,255,0.9)";
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(cx, cy, 12, Math.PI * 1.1, Math.PI * 1.6);
    c.stroke();
  });

  canvasTexture(scene, FX.scan, FX_SIZE.scan.w, FX_SIZE.scan.h, res, (c) => {
    const { w, h } = FX_SIZE.scan;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(67,224,196,0)");
    g.addColorStop(0.85, "rgba(67,224,196,0.28)");
    g.addColorStop(0.93, "rgba(67,224,196,0.9)");
    g.addColorStop(1, "rgba(15,106,97,0)");
    const fade = c.createLinearGradient(0, 0, w, 0);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // Soften the ends.
    c.globalCompositeOperation = "destination-in";
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(0.15, "rgba(0,0,0,1)");
    fade.addColorStop(0.85, "rgba(0,0,0,1)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = fade;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
  });

  // Vignette and glow are soft gradients: a low res is plenty.
  canvasTexture(scene, FX.vignette, FX_SIZE.vignette, FX_SIZE.vignette, 1, (c) => {
    const s = FX_SIZE.vignette;
    const g = c.createRadialGradient(s / 2, s / 2, s * 0.22, s / 2, s / 2, s * 0.72);
    g.addColorStop(0, "rgba(180,35,24,0)");
    g.addColorStop(0.55, "rgba(180,35,24,0.28)");
    g.addColorStop(1, "rgba(150,20,12,0.85)");
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });

  canvasTexture(scene, FX.glow, FX_SIZE.glow, FX_SIZE.glow, 1, (c) => {
    const s = FX_SIZE.glow;
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });

  canvasTexture(scene, FX.confetti, FX_SIZE.confetti.w, FX_SIZE.confetti.h, res, (c) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.roundRect(0, 0, FX_SIZE.confetti.w, FX_SIZE.confetti.h, 1);
    c.fill();
  });

  canvasTexture(scene, FX.streak, FX_SIZE.streak.w, FX_SIZE.streak.h, res, (c) => {
    const { w, h } = FX_SIZE.streak;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(0, 0, w, h, w / 2);
    c.fill();
  });

  canvasTexture(scene, FX.led, FX_SIZE.led, FX_SIZE.led, res, (c) => {
    const s = FX_SIZE.led;
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });

  canvasTexture(scene, FX.ring, FX_SIZE.ring, FX_SIZE.ring / 2, res, (c) => {
    const s = FX_SIZE.ring;
    c.strokeStyle = BRAND.teal;
    c.lineWidth = 2.2;
    c.beginPath();
    c.ellipse(s / 2, s / 4, s / 2 - 2, s / 4 - 1.5, 0, 0, Math.PI * 2);
    c.stroke();
  });
}

/** Pop words shown by battle fx, baked once (after the web font loads) instead of live Text. */
export const WORDS = {
  busted: { text: "Busted!", color: BRAND.tealDark, size: 30 },
  yikes: { text: "Yikes!", color: BRAND.danger, size: 30 },
  oops: { text: "Oops!", color: BRAND.danger, size: 30 },
  saved: { text: "Shift saved!", color: BRAND.tealDark, size: 30 },
  question: { text: "?", color: BRAND.orangeText, size: 38 },
} as const;
export type WordKey = keyof typeof WORDS;
export const wordTex = (k: WordKey) => `fx-word-${k}`;

/** World size of each baked word (filled in by makeWordTextures). */
export const WORD_SIZE: Partial<Record<WordKey, { w: number; h: number }>> = {};

export function makeWordTextures(scene: Phaser.Scene, res: number, family: string) {
  const probe = document.createElement("canvas").getContext("2d");
  for (const k of Object.keys(WORDS) as WordKey[]) {
    const { text, color, size } = WORDS[k];
    const font = `700 ${size}px ${family}`;
    let tw = size * text.length * 0.6;
    if (probe) {
      probe.font = font;
      tw = probe.measureText(text).width;
    }
    const stroke = size * 0.24;
    const w = Math.ceil(tw + stroke * 2 + 4);
    const h = Math.ceil(size * 1.3 + stroke * 2);
    WORD_SIZE[k] = { w, h };
    canvasTexture(scene, wordTex(k), w, h, res, (c) => {
      c.font = font;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineJoin = "round";
      c.lineWidth = stroke * 2;
      c.strokeStyle = "#ffffff";
      c.fillStyle = "rgba(17,20,24,0.12)";
      c.fillText(text, w / 2, h / 2 + 2.5);
      c.strokeText(text, w / 2, h / 2);
      c.fillStyle = color;
      c.fillText(text, w / 2, h / 2);
    });
  }
}
