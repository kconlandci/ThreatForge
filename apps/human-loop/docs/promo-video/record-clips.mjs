// Records short, real gameplay clips of Human Loop at phone size, for the promo video.
//
//   BASE=http://localhost:3141 OUT=/tmp/promo-clips node docs/promo-video/record-clips.mjs
//
// Needs a running production build (`npx next build && npx next start -p 3141`), Playwright
// (PW_MODULE), Chromium (CHROMIUM) and ffmpeg (FFMPEG). Nothing is saved to a server: a local
// build has no cloud storage, and the script plays as a guest.
//
// Playwright's own video is low resolution, so this captures frames straight from Chromium
// (CDP screencast) at 2x and stitches them with ffmpeg. Each clip comes out twice: portrait
// (phone size) and 16:9 (the phone centred on a teal background, ready for a YouTube timeline).
// There is no sound. A soft orange ring shows each tap; it is added by this script, not the game.
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_MODULE || "/tmp/pwrun/node_modules/playwright");
const BASE = process.env.BASE || "http://localhost:3141";
const OUT = process.env.OUT || "/tmp/promo-clips";
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const W = 390;
const H = 844;
const DSF = 2;
const TEAL = "0x0f6a61";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium",
  // The 2x flag (not a context setting) is what makes Chromium's screencast frames full size.
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--force-device-scale-factor=${DSF}`],
});
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "no-preference",
});
await ctx.addInitScript(() => {
  addEventListener(
    "pointerdown",
    (e) => {
      if (!document.getElementById("hl-tap-style")) {
        const s = document.createElement("style");
        s.id = "hl-tap-style";
        s.textContent = "@keyframes hl-tap{from{transform:scale(.5);opacity:1}to{transform:scale(1.35);opacity:0}}";
        document.head.appendChild(s);
      }
      const d = document.createElement("div");
      d.style.cssText = `position:fixed;left:${e.clientX - 24}px;top:${e.clientY - 24}px;width:48px;height:48px;border-radius:50%;border:3px solid rgba(242,107,29,.95);background:rgba(242,107,29,.22);pointer-events:none;z-index:2147483647;animation:hl-tap .6s ease-out forwards`;
      d.addEventListener("animationend", () => d.remove());
      document.body.appendChild(d);
    },
    true,
  );
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

/** One clip: frames come from Chromium with their timestamps, then ffmpeg holds each frame until the next. */
async function clip(name, run) {
  const dir = join(OUT, `.frames-${name}`);
  mkdirSync(dir, { recursive: true });
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", async (f) => {
    const file = join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W * DSF, maxHeight: H * DSF, everyNthFrame: 1 });
  // A static screen sends no frames, so nudge one repaint to get the first frame.
  await page.evaluate(() => {
    document.documentElement.style.opacity = "0.999";
    requestAnimationFrame(() => (document.documentElement.style.opacity = ""));
  });
  const t0 = Date.now() / 1000;
  await run();
  const t1 = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
  await cdp.detach();
  if (frames.length < 2) throw new Error(`${name}: only ${frames.length} frames captured`);

  const list = ["ffconcat version 1.0"];
  frames.forEach((f, i) => {
    const end = i + 1 < frames.length ? frames[i + 1].t : Math.max(f.t + 0.3, t1);
    list.push(`file '${f.file}'`, `duration ${Math.max(0.02, end - f.t).toFixed(4)}`);
  });
  list.push(`file '${frames[frames.length - 1].file}'`);
  const listFile = join(dir, "list.txt");
  writeFileSync(listFile, list.join("\n"));

  const run2 = (args) => {
    const r = spawnSync(FFMPEG, ["-y", "-loglevel", "error", ...args], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(`ffmpeg failed for ${name}: ${r.stderr}`);
  };
  const enc = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart"];
  const portrait = join(OUT, `${name}-phone.mp4`);
  run2(["-f", "concat", "-safe", "0", "-i", listFile, "-r", "30", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", ...enc, portrait]);
  run2([
    "-i", portrait,
    "-f", "lavfi", "-i", `color=c=${TEAL}:s=1920x1080:r=30`,
    "-filter_complex", "[0:v]scale=-2:1000[fg];[1:v][fg]overlay=(W-w)/2:(H-h)/2:shortest=1",
    ...enc, join(OUT, `${name}-16x9.mp4`),
  ]);
  const secs = (t1 - t0).toFixed(1);
  const fps = (frames.length / (t1 - t0)).toFixed(1);
  console.log(`${name}: ${secs} s, ${frames.length} frames (${fps} per second)`);
  rmSync(dir, { recursive: true, force: true });
}

const hold = (ms) => sleep(ms);
const sheet = () => page.locator("[role=dialog]").filter({ has: page.locator("[data-decide]") });
const planOnBoard = (id) => page.locator(`[data-step="${id}"]:not([data-tray] [data-step])`).first().waitFor({ state: "visible", timeout: 15000 });

// Before any clip: load the landing page and let it settle.
await page.goto(`${BASE}/`);
await page.waitForLoadState("load");
await sleep(1500);

// 1. The front door: landing, Play free, Play now.
await clip("1-the-front-door", async () => {
  await hold(2500);
  await page.getByRole("link", { name: "Play free" }).first().click();
  const play = page.getByRole("button", { name: "Play now" });
  await play.waitFor();
  await hold(2000);
  await play.click();
  await page.getByRole("heading", { name: "Choose your pathway" }).waitFor();
  await hold(2000);
});

// 2. Pick a career path: a slow tour of every pathway card, back to the first, then start it.
await clip("2-pick-a-career-path", async () => {
  const scrollTo = async (y, ms) => {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "smooth" }), y);
    await sleep(ms);
  };
  // Each card's top edge sits near the top of the screen. Positions come from the page itself.
  const tops = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="/play/"]')].map((a) => Math.round(a.getBoundingClientRect().top + scrollY - 423)),
  );
  await hold(1200);
  for (const y of tops) await scrollTo(Math.max(0, y), 2000);
  await scrollTo(Math.max(0, tops[0]), 2200);
  await page.locator('a[href="/play/help-desk"]').first().click();
  await page.locator("[data-coach-bar]").waitFor({ timeout: 30000 });
  await planOnBoard("client-list-assistant");
  await hold(1500);
});

// 3. Read the plan: the AI coworker's plan on the board, then open its evidence.
await clip("3-read-the-plan", async () => {
  await hold(3500);
  await page.getByRole("button", { name: /^Inspect/ }).first().click();
  await sheet().waitFor();
  await hold(3500);
});

// 4. Check the evidence, mark the line that is wrong, block the plan.
await clip("4-check-the-evidence-and-block", async () => {
  await hold(2500);
  await sheet().locator('[data-row="1"]').click();
  await hold(2200);
  await sheet().locator("[data-decide=block]").click();
  await page.locator("[data-toast]").waitFor({ timeout: 15000 });
  await hold(3800);
});

// Move on to the next plan (a safe one) without recording.
for (let i = 0; i < 20; i++) {
  if (await page.locator('[data-step="reyes-jam-guide"]:not([data-tray] [data-step])').count()) break;
  const next = page.locator("[data-toast-next]");
  const nt = page.getByRole("button", { name: /^Next ticket/ });
  if (await next.count()) await next.first().click();
  else if ((await nt.count()) && (await nt.first().isEnabled())) await nt.first().click();
  await sleep(600);
}
await planOnBoard("reyes-jam-guide");
await sleep(800);

// 5. A safe plan: read it, check it, let it run.
await clip("5-a-safe-plan-let-it-run", async () => {
  await hold(2500);
  await page.getByRole("button", { name: /^Inspect/ }).first().click();
  await sheet().waitFor();
  await hold(3500);
  await sheet().locator("[data-decide=run]").click();
  await page.locator("[data-toast]").waitFor({ timeout: 15000 });
  await hold(3500);
});

await ctx.close();
await browser.close();
console.log(errors.length ? `page errors: ${errors.join(" | ")}` : "no page errors");
console.log(`clips are in ${OUT}`);
