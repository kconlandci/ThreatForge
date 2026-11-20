/**
 * The certificate of practice: one picture (1600 x 1131, A4 landscape) drawn on a canvas, so the
 * preview, the saved image and a print all match. It is earned by finishing a pathway's first real
 * shift (trophy "first-shift"). The name is typed on this device and never sent anywhere.
 *
 * It says what it is: a record of practice in a free training game, not a job licence.
 */

export const CERT_W = 1600;
export const CERT_H = 1131;
const NAME_KEY = "human-loop:cert-name";

export interface CertificateData {
  /** The player's name as they typed it (may be empty: a line is drawn instead). */
  name: string;
  /** Pathway title, e.g. "Help Desk". */
  pathway: string;
  /** Skill names met in this pathway, in display order. */
  skills: string[];
  /** Best stars on the first shift (0-3). */
  stars: number;
  /** YYYY-MM-DD, the day the first shift was finished. */
  day: string;
  /** The game's address without https://, e.g. "humanloop.dciworkforce.com". */
  site: string;
}

const TEAL = "#0f6a61";
const TEAL_TINT = "#e7f1ef";
const INK = "#111418";
const INK_SOFT = "#3a4149";
const MUTED = "#5f6b76";
const ORANGE = "#f26b1d";

/** "November 20, 2026" from "2026-11-20" (no time zone shift: the day is already local). */
export function longDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** The certificate's words, in drawing order (also the screen-reader text). */
export function certificateText(data: CertificateData): string[] {
  return [
    "Certificate of practice",
    "This certifies that",
    data.name.trim() || "(your name)",
    `finished the ${data.pathway} shift in Human Loop,`,
    "practicing how to check an AI coworker's work before it runs.",
    data.skills.length ? `Skills practiced: ${data.skills.join(", ")}.` : "",
    `${data.stars} of 3 stars · ${longDay(data.day)}`,
    `Human Loop, a free training game by DCI Resources · ${data.site}`,
    "A record of practice in a training game, not a job licence.",
  ].filter(Boolean);
}

/** The name typed last time on this device ("" when none, or storage is blocked). */
export function savedCertName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveCertName(name: string): void {
  try {
    window.localStorage.setItem(NAME_KEY, name.slice(0, 60));
  } catch {
    /* private mode: the name lasts until the page closes */
  }
}

/** A CSS font family from a next/font variable on <html>, with a fallback. */
function family(variable: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return v ? `${v}, ${fallback}` : fallback;
  } catch {
    return fallback;
  }
}

/** Draw `text` centred at y, shrinking the font until it fits maxWidth. Returns the size used. */
function fitCentered(ctx: CanvasRenderingContext2D, text: string, y: number, weight: number, size: number, fam: string, maxWidth: number): number {
  let s = size;
  ctx.font = `${weight} ${s}px ${fam}`;
  while (s > 18 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${fam}`;
  }
  ctx.fillText(text, CERT_W / 2, y);
  return s;
}

/** Word-wrap centred text; returns the y after the last line. */
function wrapCentered(ctx: CanvasRenderingContext2D, text: string, y: number, lineHeight: number, maxWidth: number): number {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, CERT_W / 2, y);
      y += lineHeight;
      line = w;
    } else line = test;
  }
  if (line) ctx.fillText(line, CERT_W / 2, y);
  return y + lineHeight;
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, on: boolean) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = on ? ORANGE : "#ffffff";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** Load the DCI logo for the certificate (resolves null if it can't load). */
export function loadLogo(src = "/brand/dci-logo-720.png"): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Draw the whole certificate onto a CERT_W x CERT_H canvas. */
export function drawCertificate(canvas: HTMLCanvasElement, data: CertificateData, logo: HTMLImageElement | null): void {
  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const display = family("--font-lexend", "system-ui, sans-serif");
  const body = family("--font-atkinson", "system-ui, sans-serif");

  // Paper, a teal frame and a thin inner line.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CERT_W, CERT_H);
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, CERT_W, 28);
  ctx.fillRect(0, CERT_H - 28, CERT_W, 28);
  ctx.fillRect(0, 0, 28, CERT_H);
  ctx.fillRect(CERT_W - 28, 0, 28, CERT_H);
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 3;
  ctx.strokeRect(56, 56, CERT_W - 112, CERT_H - 112);
  ctx.fillStyle = TEAL_TINT;
  ctx.fillRect(59, 59, CERT_W - 118, 150);

  if (logo) {
    const h = 110;
    const w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, CERT_W / 2 - w / 2, 80, w, h);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const [title, intro, , finished, practiced] = certificateText(data);

  ctx.fillStyle = TEAL;
  fitCentered(ctx, title.toUpperCase(), 300, 800, 64, display, 1300);

  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 34px ${body}`;
  ctx.fillText(intro, CERT_W / 2, 378);

  // The name on a line (or an empty line to write on, when no name was typed).
  ctx.fillStyle = INK;
  const name = data.name.trim();
  if (name) fitCentered(ctx, name, 480, 800, 84, display, 1200);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CERT_W / 2 - 480, 512);
  ctx.lineTo(CERT_W / 2 + 480, 512);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = `700 40px ${display}`;
  ctx.fillText(finished, CERT_W / 2, 590);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 34px ${body}`;
  let y = wrapCentered(ctx, practiced, 645, 44, 1250);

  if (data.skills.length) {
    ctx.fillStyle = TEAL;
    ctx.font = `700 30px ${body}`;
    y = wrapCentered(ctx, `Skills practiced: ${data.skills.join(" · ")}`, y + 18, 42, 1250);
  }

  // Stars and the day.
  const starsY = Math.max(y + 40, 840);
  for (let i = 0; i < 3; i++) star(ctx, CERT_W / 2 - 70 + i * 70, starsY, 28, i < data.stars);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `700 32px ${body}`;
  ctx.fillText(longDay(data.day), CERT_W / 2, starsY + 78);

  ctx.fillStyle = MUTED;
  ctx.font = `400 26px ${body}`;
  ctx.fillText(`Human Loop, a free training game by DCI Resources · ${data.site}`, CERT_W / 2, CERT_H - 120);
  ctx.font = `400 22px ${body}`;
  ctx.fillText("A record of practice in a training game, not a job licence. All names in the game are made up.", CERT_W / 2, CERT_H - 84);
}

/** The canvas as a PNG file, for saving or sharing. */
export function certificateFile(canvas: HTMLCanvasElement, pathway: string): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null);
      const slug = pathway.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      resolve(new File([blob], `human-loop-${slug}-certificate.png`, { type: "image/png" }));
    }, "image/png");
  });
}

/** Share the picture where the phone can (its share sheet has "Save image"), else download it. */
export async function saveCertificate(file: File): Promise<"shared" | "downloaded" | "cancelled"> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Human Loop certificate" });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
