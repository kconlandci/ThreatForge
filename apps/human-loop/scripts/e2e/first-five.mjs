#!/usr/bin/env node
/**
 * Phase 1a acceptance checks ("a real choice in the first minute, and results you can see").
 * Spec: fun/build/phase1a-spec.md section 8.2 (A1-A17), for all 5 pathways at 390x844 and 375x667.
 *
 * Runs against a production server:
 *   NEXT_DIST_DIR=.next-alt npx next build && NEXT_DIST_DIR=.next-alt npx next start -p 3141
 *   BASE=http://localhost:3141 npm run e2e:first-five
 *
 * Env:
 *   BASE (or BASE_URL)  server to test (default http://localhost:3000)
 *   PW_MODULE           playwright package (default /tmp/pwrun/node_modules/playwright)
 *   CHROMIUM            chromium binary (default /opt/pw-browsers/chromium)
 *   OUT                 screenshot folder (default <os tmp>/first-five)
 *   PATHS               comma list of pathway ids (default: all 5)
 *   SIZES               comma list like 390x844,375x667 (default: both)
 *   SKIP_AXE=1          skip the axe scans (faster local runs)
 *   RUNS                comma list of landing,miss,rm,fa,keyboard,story (default: all)
 *
 * The script knows the practice content (it reads content/<id>/practice.json), as the spec allows:
 * it marks the first red-flag row of a risky plan and lets safe plans run. Exit code 1 on any fail.
 */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = (process.env.BASE || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const { chromium } = require(process.env.PW_MODULE || "/tmp/pwrun/node_modules/playwright");
const { default: AxeBuilder } = await import(join(APP, "node_modules/@axe-core/playwright/dist/index.mjs"));
const OUT = process.env.OUT || join(tmpdir(), "first-five");
mkdirSync(OUT, { recursive: true });

const ALL = ["help-desk", "cybersecurity", "cloud-network", "full-stack", "business-analyst"];
const PATHS = (process.env.PATHS || ALL.join(",")).split(",").filter(Boolean);
const SIZES = (process.env.SIZES || "390x844,375x667").split(",").map((s) => s.split("x").map(Number));
const SKIP_AXE = process.env.SKIP_AXE === "1";
/** Which runs to do: landing, miss, rm (reduced-motion miss), fa (false alarm + requeue), keyboard, story. Default: all. */
const RUNS = new Set((process.env.RUNS || "landing,miss,rm,fa,keyboard,story").split(","));

/* ------------------------------------------------------------------ */
/* Content the script is allowed to know                               */
/* ------------------------------------------------------------------ */

const content = (id, file) => JSON.parse(readFileSync(join(APP, "content", id, file), "utf8"));
const vignetteFor = (s) => (s.vignette ? s.vignette : s.skill === "guard-data" ? "leak" : s.category === "report" ? "report" : "system");
const plain = (t) => String(t).replace(/\*\*/g, "");
/** Button names the coach must never dictate in a "Where do I look?" line. */
const BUTTON_RE = /\b(Inspect|Block|Let it run|Looks OK|Escalate|Roll Back|Next ticket|Show me|Approve)\b/;

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

const results = [];
let failures = 0;
function check(id, scope, ok, detail = "") {
  results.push({ id, scope, ok: !!ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${id.padEnd(4)} ${scope}${detail ? `  ${detail}` : ""}`);
}
const metrics = [];

/* ------------------------------------------------------------------ */
/* Page helpers                                                        */
/* ------------------------------------------------------------------ */

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

/** Every context a run opens; closed after the run even when it throws (a leftover page keeps
 * its stage animating and slows every later timing check). */
const openContexts = new Set();

async function open(W, H, reduced = false) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  openContexts.add(ctx);
  ctx.on("close", () => openContexts.delete(ctx));
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return { ctx, page, errors };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Visible words (same token rule as lib/game/reveal.ts wordCount): text a player can see, no sr-only, optionally only in the viewport. */
function visibleWords(page, selector = "body", viewportOnly = false) {
  return page.evaluate(
    ([sel, vpOnly]) => {
      const root = document.querySelector(sel);
      if (!root) return { n: 0, text: "" };
      const hidden = (el) => {
        for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
          if (/(^|\s)(sr-only)(\s|$)/.test(e.className?.baseVal ?? e.className ?? "")) return true;
          if (String(e.className?.baseVal ?? e.className ?? "").includes("srOnly")) return true;
          if (e.getAttribute("aria-hidden") === "true" && e.tagName !== "svg" && !e.textContent.trim().length) return true;
          const cs = getComputedStyle(e);
          if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return true;
        }
        return false;
      };
      const out = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = n.textContent;
        if (!t || !t.trim()) continue;
        const p = n.parentElement;
        if (!p || hidden(p)) continue;
        const r = document.createRange();
        r.selectNodeContents(n);
        const rects = [...r.getClientRects()];
        if (!rects.length) continue;
        if (vpOnly && !rects.some((b) => b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth)) continue;
        out.push(t.trim());
      }
      const text = out.join(" ");
      return { n: text.replace(/\*\*/g, "").split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length, text };
    },
    [selector, viewportOnly],
  );
}

async function axe(page, name, scope) {
  if (SKIP_AXE) return;
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  check("A12", `${scope} axe ${name}`, bad.length === 0, bad.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0].target}`).join("; "));
}

/** Reduced motion: nothing on the page may be moving (no running transform/position animation). */
async function noMovement(page, scope, name) {
  const moving = await page.evaluate(() => {
    const MOVE = /transform|translate|rotate|scale|^top$|^left$|^right$|^bottom$|offset|motion/i;
    const out = [];
    for (const a of document.getAnimations()) {
      if (a.playState !== "running") continue;
      const eff = a.effect;
      const t = eff?.getComputedTiming?.();
      if (!t || (Number(t.duration) || 0) <= 20) continue;
      const frames = eff.getKeyframes?.() ?? [];
      const props = new Set(frames.flatMap((f) => Object.keys(f)).filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)));
      if ([...props].some((p) => MOVE.test(p))) out.push(`${a.animationName ?? a.id ?? "anim"}:${[...props].join("+")}`);
    }
    return out;
  });
  check("RM", `${scope} no movement: ${name}`, moving.length === 0, moving.slice(0, 4).join(", "));
}

/** Waits until every finite CSS/Web animation on the page is done (so fading text is counted). */
async function settle(page) {
  await page
    .waitForFunction(
      () =>
        document.getAnimations().every((a) => {
          const t = a.effect?.getComputedTiming?.();
          return a.playState !== "running" || !t || t.iterations === Infinity || t.endTime === Infinity;
        }),
      null,
      { timeout: 5000, polling: 100 },
    )
    .catch(() => {});
}

const stage = (page) => page.locator("[data-agent-mood]").first();
const sheetLoc = (page) => page.locator("[role=dialog]").filter({ has: page.locator("[data-decide]") });

async function stageBox(page) {
  return stage(page).boundingBox();
}

/** The "decision screen": sheet open on an inspected, unresolved plan, both choices enabled. */
async function decisionScreen(page) {
  const sheet = sheetLoc(page);
  if (!(await sheet.count())) return { ok: false, why: "no sheet" };
  return page.evaluate(() => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.querySelector("[data-decide]"));
    if (!d) return { ok: false, why: "no sheet" };
    const block = d.querySelector("[data-decide=block]");
    const approve = d.querySelector("[data-decide=run],[data-decide=ok]");
    const coach = d.querySelector("[data-coach]");
    const locked = document.querySelector("[class*=isLocked],[class*=cardLocked]");
    const ok = !!block && !block.disabled && !!approve && !approve.disabled && !coach && !locked && !!d.querySelector("[data-row]");
    return { ok, why: `block=${!!block} approve=${approve?.getAttribute("data-decide")} coach=${!!coach} locked=${!!locked}` };
  });
}

/** A5: rows + both buttons inside the sheet box with no inner scroll (390x844); buttons visible (375x667). */
async function sheetFit(page) {
  return page.evaluate(() => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.querySelector("[data-decide]"));
    const box = d.getBoundingClientRect();
    const sc = d.querySelector("[class*=sheetScroll]") ?? d;
    const scBox = sc.getBoundingClientRect();
    const inView = (r) => r.top >= Math.max(box.top, 0) - 1 && r.bottom <= Math.min(box.bottom, innerHeight) + 1;
    const btns = [...d.querySelectorAll("[data-decide]")].map((b) => b.getBoundingClientRect());
    const rows = [...d.querySelectorAll("[data-row]")].map((b) => b.getBoundingClientRect());
    const wide = [...d.querySelectorAll("button, h2, h3, p")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.left < Math.max(box.left, 0) - 1 || r.right > Math.min(box.right, innerWidth) + 1);
    });
    return {
      innerScroll: Math.max(0, sc.scrollHeight - sc.clientHeight),
      clipped: wide.map((el) => (el.textContent || "").trim().slice(0, 24)),
      btnsVisible: btns.length >= 2 && btns.every(inView),
      rowsVisible: rows.every((r) => r.top >= scBox.top - 1 && r.bottom <= scBox.bottom + 1 && inView(r)),
    };
  });
}

/**
 * Starts an in-page recorder BEFORE the action: a MutationObserver stamps performance.now() when the
 * stage's data-fx-n changes and when a toast appears. Measuring inside the page keeps A8/A11 exact
 * under CPU load (no Node polling lag).
 */
async function armOutcome(page) {
  await page.evaluate(() => {
    const rec = { fxAt: 0, fx: null, toastAt: 0, t0: performance.now() };
    window.__hlOutcome = rec;
    const st = document.querySelector("[data-agent-mood]");
    const n0 = st?.dataset.fxN ?? null;
    // A toast still up from before does not count: only a new toast id does.
    const id0 = document.querySelector("[data-toast]")?.getAttribute("data-toast-id") ?? null;
    const look = () => {
      const s = document.querySelector("[data-agent-mood]");
      if (!rec.fxAt && s && s.dataset.fxN !== n0 && s.dataset.lastFx) {
        rec.fxAt = performance.now();
        rec.fx = s.dataset.lastFx;
      }
      const t = document.querySelector("[data-toast]");
      if (!rec.toastAt && t && t.getAttribute("data-toast-id") !== id0) rec.toastAt = performance.now();
      if (rec.fxAt && rec.toastAt) obs.disconnect();
    };
    const obs = new MutationObserver(look);
    obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-fx-n", "data-toast", "data-toast-id"] });
  });
}

/** Waits until the recorder saw the fx and the toast; returns ms from the action to the fx, and fx to toast. */
async function watchOutcome(page) {
  await page
    .waitForFunction(() => window.__hlOutcome && window.__hlOutcome.fxAt && window.__hlOutcome.toastAt, null, { timeout: 6000, polling: 50 })
    .catch(() => {});
  const r = await page.evaluate(() => window.__hlOutcome ?? null);
  if (!r) return { fx: null, fxMs: -1, toastDelay: -1 };
  return {
    fx: r.fx,
    fxMs: r.fxAt ? Math.round(r.fxAt - r.t0) : -1,
    toastDelay: r.fxAt && r.toastAt ? Math.round(r.toastAt - r.fxAt) : -1,
  };
}

/** A8: toast below the stage, stage height stable. */
async function toastLayout(page, turnStartH, scope, name) {
  await sleep(1000 - 0);
  const sb = await stageBox(page);
  const tb = await page.locator("[data-toast]").first().boundingBox();
  check("A8", `${scope} ${name}: toast below stage`, tb && sb && tb.y >= sb.y + sb.height - 1, `toast top ${tb?.y.toFixed(1)} stage bottom ${(sb.y + sb.height).toFixed(1)}`);
  check("A8", `${scope} ${name}: stage height stable`, Math.abs(sb.height - turnStartH) <= 2, `${turnStartH.toFixed(1)} -> ${sb.height.toFixed(1)}`);
}

/** Outcome toasts never auto-hide: no timer on them (and, once per pathway, still there after 7 s). */
async function toastNoTimer(page, scope, name, wait = false) {
  const ms = await page.locator("[data-toast]").first().evaluate((el) => el.style.getPropertyValue("--ms"));
  const timer = await page.locator("[data-toast] [class*=toastTimer]").count();
  let still = true;
  if (wait) {
    await sleep(7000);
    still = (await page.locator("[data-toast]").count()) > 0;
  }
  check("A8", `${scope} ${name}: outcome toast does not auto-hide`, (ms === "0ms" || ms === "") && timer === 0 && still, `--ms=${ms} timer=${timer}${wait ? ` after 7s=${still}` : ""}`);
}

/** Waits for a plan of the practice to be on the board (its IntentCard). */
async function waitPlan(page, stepId) {
  await page.locator(`[data-step="${stepId}"]:not([data-tray] [data-step])`).first().waitFor({ state: "visible", timeout: 15000 });
  // Let the deal animation settle.
  await sleep(700);
}

/** From the outcome of a plan to the next plan (or the end). Returns the taps used. */
async function advance(page) {
  let taps = 0;
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("button", { name: "See how you did" }).count()) return taps;
    const next = page.locator("[data-toast-next]");
    if (await next.count()) {
      await next.first().click();
      taps++;
      await sleep(500);
      continue;
    }
    const nt = page.getByRole("button", { name: /^Next ticket/ });
    if ((await nt.count()) && (await nt.first().isEnabled())) {
      await nt.first().click();
      taps++;
      await sleep(600);
      continue;
    }
    if (taps > 0 && !(await page.locator("[data-toast]").count())) return taps;
    await sleep(300);
  }
  return taps;
}

/* ------------------------------------------------------------------ */
/* Run 1: from the landing page, perfect scripted practice, hub bark   */
/* ------------------------------------------------------------------ */

async function landingRun(id, W, H) {
  const scope = `${id} ${W}x${H} landing`;
  const tag = `${id}-${W}x${H}-landing`;
  const prac = content(id, "practice.json");
  const story = content(id, "encounter-01.json");
  const { ctx, page, errors } = await open(W, H);
  const shot = (n) => page.screenshot({ path: join(OUT, `${tag}-${n}.png`) });
  let taps = 0;
  const readWords = [];

  await page.goto(`${BASE}/`);
  await page.waitForLoadState("load");
  const t0 = Date.now();
  await sleep(800);
  readWords.push((await settle(page), await visibleWords(page, "body", true)).n);
  if (id === PATHS[0]) await axe(page, "landing", `${W}x${H}`);
  await shot("01-landing");
  await page.getByRole("link", { name: "Play free" }).first().click();
  taps++;
  await page.waitForURL(/\/play$/);
  const play = page.getByRole("button", { name: "Play now" });
  await play.waitFor();
  await sleep(800);
  const pb = await play.boundingBox();
  const scrollY = await page.evaluate(() => scrollY);
  check("A3", `${scope}: Play now above the fold`, scrollY === 0 && pb.y + pb.height <= H, `bottom ${Math.round(pb.y + pb.height)} <= ${H}`);
  readWords.push((await settle(page), await visibleWords(page, "body", true)).n);
  if (id === PATHS[0]) await axe(page, "/play", `${W}x${H}`);
  await shot("02-play");
  await play.click();
  taps++;
  await page.getByRole("heading", { name: "Choose your pathway" }).waitFor();
  await sleep(800);
  readWords.push((await settle(page), await visibleWords(page, "body", true)).n);
  check("A1", `${scope}: no "Start over" for a new guest`, (await page.getByRole("button", { name: "Start over" }).count()) === 0);
  if (id === PATHS[0]) await axe(page, "picker", `${W}x${H}`);
  await shot("03-picker");
  await page.locator(`a[href="/play/${id}"]`).first().click();
  taps++;
  await page.waitForURL(`**/play/${id}`);
  await page.locator("[data-coach-bar]").waitFor({ timeout: 20000 });
  await waitPlan(page, prac.steps[0].id);
  const introShown = await page.getByRole("dialog", { name: "Intro" }).count();
  const bar = await page.locator("[data-coach-bar]").innerText();
  check("A17", `${scope}: no intro, cold open in the coach bar`, !introShown && bar.includes(plain(prac.coldOpen)) && /check/.test(bar), JSON.stringify(bar.replace(/\s+/g, " ")));
  await settle(page);
  const board = await visibleWords(page, "#hl-game-root");
  check("A4", `${scope}: board words <= 140`, board.n <= 140, `${board.n}`);
  readWords.push(board.n);
  await shot("04-board");
  if (W === 375) {
    const a16 = await page.evaluate(() => {
      const r = (el) => el?.getBoundingClientRect();
      const st = r(document.querySelector("[data-agent-mood]"));
      const list = r(document.querySelector("[class*=intents]"));
      const card = r(document.querySelector("[data-step]"));
      const hand = r(document.querySelector("[role=group][aria-label^='Your hand']"));
      const inVp = (b) => !!b && b.top >= -1 && b.bottom <= innerHeight + 1;
      const el = document.querySelector("[class*=intents]");
      // The whole plan card, quip included, fits without scrolling (the list's scroll fade starts at 4 px).
      const fits = !!el && el.scrollHeight - el.clientHeight <= 4;
      return { stage: inVp(st), card: inVp(card), hand: inVp(hand), listH: list ? Math.round(list.height) : 0, fits };
    });
    check("A16", `${scope}: stage, plan and hand in view; plan list >= 88px; the quip is not cut off`, a16.stage && a16.card && a16.hand && a16.listH >= 88 && a16.fits, JSON.stringify(a16));
  }
  if (!SKIP_AXE) await axe(page, "practice board", scope);

  // The first real decision.
  await page.getByRole("button", { name: /^Inspect/ }).first().click();
  taps++;
  await sheetLoc(page).waitFor();
  await sleep(700);
  const ds = await decisionScreen(page);
  const secs = (Date.now() - t0) / 1000;
  check("A1", `${scope}: decision screen in <= 4 taps and <= 20 s`, ds.ok && taps <= 4 && secs <= 20, `taps ${taps}, ${secs.toFixed(1)} s, ${ds.why}`);
  await settle(page);
  const sheetW = await visibleWords(page, "[role=dialog]");
  check("A4", `${scope}: first sheet <= 90 words`, sheetW.n <= 90, `${sheetW.n}`);
  readWords.push(sheetW.n);
  const totalWords = readWords.reduce((a, b) => a + b, 0);
  metrics.push({ scope, taps, seconds: +secs.toFixed(1), words: readWords, totalWords, readSecondsAt110wpm: Math.round((totalWords / 110) * 60) });
  if (id === "business-analyst") {
    const gloss = await sheetLoc(page).locator("[class*=evGloss]").count();
    check("A14", `${scope}: BA first sheet: no "Tap" anywhere on it, <= 90 words, gloss shown`, !/\bTap\b/.test(sheetW.text) && sheetW.n <= 90 && gloss > 0, `words ${sheetW.n}, gloss ${gloss}`);
  }
  await shot("05-sheet-t1");

  // A6: scripted perfect practice. A5 and A9 on every sheet.
  const perPlan = [];
  let turnH = (await stageBox(page)).height;
  for (let k = 0; k < prac.steps.length; k++) {
    const step = prac.steps[k];
    let planTaps = 0;
    if (k > 0) {
      await waitPlan(page, step.id);
      turnH = (await stageBox(page)).height;
      await page.getByRole("button", { name: /^Inspect/ }).first().click();
      planTaps++;
      await sheetLoc(page).waitFor();
      await sleep(700);
      const d = await decisionScreen(page);
      check("A9", `${scope} t${k + 1}: decision screen, no coach ring, no lock`, d.ok, d.why);
    } else planTaps++;
    const title = await sheetLoc(page).locator("h2").first().innerText();
    check("A6", `${scope} t${k + 1}: plan order`, title.trim() === step.intent, JSON.stringify(title));
    const fit = await sheetFit(page);
    if (W === 390) check("A5", `${scope} t${k + 1}: rows + buttons fit, no inner scroll`, fit.innerScroll <= 1 && fit.rowsVisible && fit.btnsVisible, JSON.stringify(fit));
    else check("A5", `${scope} t${k + 1}: both decision buttons visible`, fit.btnsVisible, JSON.stringify(fit));
    check("A5", `${scope} t${k + 1}: nothing on the sheet cut off at the sides`, fit.clipped.length === 0, fit.clipped.join(" | "));
    check("A9", `${scope} t${k + 1}: "Where do I look?" offered`, (await sheetLoc(page).getByRole("button", { name: "Where do I look?" }).count()) === 1);
    if (k > 0) await shot(`06-sheet-t${k + 1}`);
    // Spec §3: nothing on the decision screen gives the answer away before the plan resolves.
    const leak = await sheetLoc(page).evaluate((d) => ({ clue: d.querySelectorAll("[data-clue]").length, words: /Checks out|\bClue\b/.test(d.innerText) }));
    check("A6", `${scope} t${k + 1}: no clue marks on the decision screen`, leak.clue === 0 && !leak.words, JSON.stringify(leak));
    let name;
    if (step.safe) {
      await armOutcome(page);
      await sheetLoc(page).locator("[data-decide=run]").click();
      planTaps++;
      name = `t${k + 1} Let it run`;
    } else {
      const flag = step.evidence.findIndex((e) => e.redFlag);
      await sheetLoc(page).locator(`[data-row="${flag}"]`).click();
      planTaps++;
      await sleep(400);
      const pressed = await sheetLoc(page).locator(`[data-row="${flag}"]`).getAttribute("aria-pressed");
      const blockTxt = await sheetLoc(page).locator("[data-decide=block]").innerText();
      const clue = await sheetLoc(page).getByText(`Your clue: ${step.evidence[flag].label}`).count();
      check("A6", `${scope} t${k + 1}: mark shows "Block it" and "Your clue"`, pressed === "true" && /Block it/.test(blockTxt) && clue > 0, `pressed=${pressed} block="${blockTxt.trim()}" clue=${clue}`);
      if (k === 0) {
        await shot("05b-sheet-marked");
        await axe(page, "sheet with a marked row", scope);
      }
      await armOutcome(page);
      await sheetLoc(page).locator("[data-decide=block]").click();
      planTaps++;
      name = `t${k + 1} Block`;
    }
    const o = await watchOutcome(page);
    check("A8", `${scope} ${name}: toast >= 500 ms after the stage fx`, o.toastDelay >= 500, `fx ${o.fx} at ${o.fxMs} ms, toast +${o.toastDelay} ms`);
    await toastLayout(page, turnH, scope, name);
    if (!step.safe) {
      const toast = await page.locator("[data-toast]").innerText();
      check("A6", `${scope} ${name}: "Caught with proof!"`, /Caught with proof!/.test(toast), JSON.stringify(toast.split("\n")[0]));
    }
    await toastNoTimer(page, scope, name, k === 0 && W === 390);
    await shot(`07-outcome-t${k + 1}`);
    if (k === 0) {
      // A15: Menu has Replay intro and Skip practice; the battle top bar has no Skip practice.
      const topSkip = await page.locator("#hl-game-root").getByRole("button", { name: "Skip practice" }).count();
      await page.getByRole("button", { name: "Menu" }).click();
      const menu = page.locator("[aria-label='Game menu']");
      await menu.waitFor();
      const mt = await menu.innerText();
      check("A15", `${scope}: no Skip practice on the top bar; Menu has Replay intro + Skip practice`, topSkip === 0 && /Replay intro/.test(mt) && /Skip practice/.test(mt), mt.replace(/\s+/g, " "));
      await page.keyboard.press("Escape");
      await sleep(300);
      if (await menu.isVisible().catch(() => false)) await page.getByRole("button", { name: "Menu" }).click();
      await sleep(300);
    }
    planTaps += await advance(page);
    perPlan.push(planTaps);
    const budget = step.safe ? 3 : 4;
    check("A6", `${scope} t${k + 1}: taps ${step.safe ? "safe <= 3" : "risky <= 4"}`, planTaps <= budget, `${planTaps}`);
  }
  await page.getByRole("button", { name: "See how you did" }).click();
  await page.locator("[data-practice-score]").waitFor({ timeout: 15000 });
  await sleep(1200);
  const score = await page.locator("[data-practice-score]").innerText();
  check("A6", `${scope}: result "4 of 4 right. 2 caught with proof."`, /4 of 4 right\./.test(score) && /2 caught with proof\./.test(score), JSON.stringify(score));
  check("A6", `${scope}: practiced line`, (await page.getByText("You practiced: checking an AI agent's work before it runs.").count()) > 0);
  await shot("08-result");
  await axe(page, "practice result", scope);

  // A13: Start the real shift -> hub with one bark, focus on the main button, then the story.
  await page.getByRole("button", { name: "Start the real shift" }).first().click();
  await page.locator("[data-hub-main]").first().waitFor({ timeout: 15000 });
  await sleep(1500);
  const focus = await page.evaluate(() => document.activeElement?.hasAttribute("data-hub-main") ?? false);
  const barkTxt = prac.hubBark ? plain(prac.hubBark) : null;
  const barkShown = barkTxt ? await page.getByText(barkTxt, { exact: false }).count() : await page.getByText(/starts here/).count();
  const counter = await page.getByText(/^\s*\d+ of [2-9]\d*\s*$/).count();
  check("A13", `${scope}: hub bark (one line), focus on the main button`, barkShown > 0 && counter === 0 && focus, `bark=${barkShown} counter=${counter} focus=${focus}`);
  await shot("09-hub-bark");
  await axe(page, "hub with the bark", scope);
  await page.locator("[data-hub-main]").first().click();
  await page.locator("[data-coach-bar]").waitFor({ timeout: 20000 });
  await sleep(1500);
  const cards = await page.locator("[data-step]:not([data-tray] [data-step])").evaluateAll((els) => els.map((e) => e.getAttribute("data-step")));
  const storyIds = new Set(story.steps.map((s) => s.id));
  const turn = await page.locator("#hl-game-root").innerText();
  check("A13", `${scope}: story opens at turn 1 with story plans`, cards.length > 0 && cards.every((c) => storyIds.has(c)) && /Turn 1\b/.test(turn), `plans ${cards.join(",")}`);
  await shot("10-story");
  check("A6", `${scope}: 0 console errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

/* ------------------------------------------------------------------ */
/* Run 2: deep link, deliberate misses, Show me (A2, A7, A9, A11)      */
/* ------------------------------------------------------------------ */

async function missRun(id, W, H, reduced) {
  const scope = `${id} ${W}x${H} deep-link${reduced ? " reduced-motion" : ""}`;
  const tag = `${id}-${W}x${H}-miss${reduced ? "-rm" : ""}`;
  const prac = content(id, "practice.json");
  const agent = prac.agent.name.split(/\s+/)[0];
  const { ctx, page, errors } = await open(W, H, reduced);
  const shot = (n) => page.screenshot({ path: join(OUT, `${tag}-${n}.png`) });
  let taps = 0;

  await page.goto(`${BASE}/play/${id}`);
  await page.waitForURL(new RegExp(`/play\\?next=${id}`), { timeout: 15000 });
  const t0 = Date.now();
  await page.getByRole("button", { name: "Play now" }).waitFor();
  await sleep(800);
  const deepWords = [(await settle(page), await visibleWords(page, "body", true)).n];
  const play = page.getByRole("button", { name: "Play now" });
  await play.waitFor();
  const pb = await play.boundingBox();
  check("A3", `${scope}: Play now above the fold`, pb.y + pb.height <= H, `bottom ${Math.round(pb.y + pb.height)}`);
  await play.click();
  taps++;
  await page.waitForURL(`**/play/${id}`);
  await page.locator("[data-coach-bar]").waitFor({ timeout: 20000 });
  await waitPlan(page, prac.steps[0].id);
  const intro = await page.getByRole("dialog", { name: "Intro" }).count();
  const bar0 = await page.locator("[data-coach-bar]").innerText();
  check("A17", `${scope}: first screen is the practice board with the cold open`, !intro && /check/.test(bar0), JSON.stringify(bar0.replace(/\s+/g, " ")));
  deepWords.push((await settle(page), await visibleWords(page, "#hl-game-root")).n);
  if (reduced) {
    const rm = await page.locator("#hl-game-root.hl-rm").count();
    check("RM", `${scope}: game root runs in reduced motion`, rm === 1);
    await noMovement(page, scope, "board");
  }
  const turnH = (await stageBox(page)).height;
  await page.getByRole("button", { name: /^Inspect/ }).first().click();
  taps++;
  await sheetLoc(page).waitFor();
  await sleep(700);
  const ds = await decisionScreen(page);
  check("A2", `${scope}: decision screen in <= 3 taps, URL /play/${id}`, ds.ok && taps <= 3 && page.url().includes(`/play/${id}`), `taps ${taps}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await sleep(600);
  deepWords.push((await settle(page), await visibleWords(page, "[role=dialog]")).n);
  const dw = deepWords.reduce((a, b) => a + b, 0);
  metrics.push({ scope, taps, words: deepWords, totalWords: dw, readSecondsAt110wpm: Math.round((dw / 110) * 60) });

  const misses = [0, prac.steps.length - 1]; // ticket 1 and ticket 4 (both risky) run on purpose
  let wrongBefore = false;
  for (let k = 0; k < prac.steps.length; k++) {
    const step = prac.steps[k];
    let th = turnH;
    if (k > 0) {
      await waitPlan(page, step.id);
      th = (await stageBox(page)).height;
      await page.getByRole("button", { name: /^Inspect/ }).first().click();
      await sheetLoc(page).waitFor();
      await sleep(700);
    }
    // A9: the pull hint. After a wrong call it is already on.
    const line = sheetLoc(page).locator("[class*=pullHintLine]");
    if (wrongBefore) {
      check("A9", `${scope} t${k + 1}: hint shown by itself after a wrong call`, (await line.count()) === 1);
    } else {
      await sheetLoc(page).getByRole("button", { name: "Where do I look?" }).click();
      await sleep(300);
    }
    const lt = (await line.count()) ? await line.innerText() : "";
    const want = prac.coachScript?.idle?.[k];
    check("A9", `${scope} t${k + 1}: hint line = idle[${k}], no button names`, !!want && lt.includes(plain(want)) && !BUTTON_RE.test(lt), JSON.stringify(lt.trim()));
    const fit = await sheetFit(page);
    check("A5", `${scope} t${k + 1} (hint on): decision buttons visible`, fit.btnsVisible, JSON.stringify(fit));
    if (k === 0) await shot("01-sheet-hint");
    if (reduced && k === 0) await noMovement(page, scope, "sheet");

    await armOutcome(page);
    await sheetLoc(page).locator("[data-decide=run]").click();
    const o = await watchOutcome(page);
    wrongBefore = !step.safe;
    if (misses.includes(k)) {
      const want = `risk:${vignetteFor(step)}`;
      check("A7", `${scope} t${k + 1} miss: stage fx ${want} within 1000 ms`, o.fx === want && o.fxMs >= 0 && o.fxMs <= 1000, `${o.fx} at ${o.fxMs} ms`);
      const minDelay = reduced ? 350 : 500;
      check(reduced ? "A11" : "A8", `${scope} t${k + 1} miss: toast >= ${minDelay} ms after the fx`, o.toastDelay >= minDelay, `+${o.toastDelay} ms`);
      if (k === 0) await shot("02-vignette");
      if (reduced) await noMovement(page, scope, "vignette");
      let mood = null;
      for (let i = 0; i < 40 && mood !== "sad"; i++) {
        mood = await stage(page).getAttribute("data-agent-mood");
        if (mood !== "sad") await sleep(50);
      }
      check("A7", `${scope} t${k + 1} miss: agent holds "sad" within 2000 ms`, mood === "sad", `${mood}`);
      await toastLayout(page, th, scope, `t${k + 1} miss`);
      await toastNoTimer(page, scope, `t${k + 1} miss`);
      await shot(`03-oops-t${k + 1}`);
      // Show me -> the clue.
      await page.locator("[data-show-me]").first().click();
      await page.locator("[data-review]").waitFor();
      await sleep(900);
      const flags = await page.locator("[data-clue=flag]").count();
      const ell = page.locator("[data-clue=flag] [data-pen]").first();
      // The pen loop is closed and wraps the whole row (not a partial arc).
      const ellVisible = (await ell.count())
        ? await ell.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const row = el.closest("[data-clue]").getBoundingClientRect();
            return r.width >= row.width * 0.95 && r.height >= row.height * 0.9;
          })
        : false;
      const heading = await page.evaluate(() => document.activeElement?.textContent?.trim());
      check("A7", `${scope} t${k + 1}: Show me circles the clue`, flags >= 1 && ellVisible, `flags ${flags}, pen loop ${ellVisible}, focus "${heading}"`);
      if (k === 0) {
        await shot("04-review");
        await axe(page, "review sheet", scope);
      }
      await page.locator("[data-review=got-it]").click();
      await sleep(500);
      const onNext = await page.evaluate(() => document.activeElement?.hasAttribute("data-toast-next") ?? false);
      check("A7", `${scope} t${k + 1}: "Got it" returns focus to Next`, onNext);
      // The agent's turn ends on Next; then the coach bar carries the reveal line until a card play.
      await advance(page);
      await sleep(600);
      const cb = await page.locator("[data-coach-bar]").innerText().catch(() => "");
      check("A7", `${scope} t${k + 1} miss: coach bar "${agent} didn't check:"`, cb.includes(`${agent} didn't check:`), JSON.stringify(cb.replace(/\s+/g, " ")));
      if (k === 0) await shot("04b-reveal-bar");
      continue;
    } else {
      check("A8", `${scope} t${k + 1} Let it run: toast >= ${reduced ? 350 : 500} ms after the fx`, o.toastDelay >= (reduced ? 350 : 500), `fx ${o.fx} +${o.toastDelay} ms`);
      await toastLayout(page, th, scope, `t${k + 1} Let it run`);
    }
    await advance(page);
  }
  // The battle stage after a win with misses: no confetti, not "celebrate".
  const endFx = await stage(page).getAttribute("data-last-fx");
  const endMood = await stage(page).getAttribute("data-agent-mood");
  await page.getByRole("button", { name: "See how you did" }).click();
  await page.locator("[data-practice-score]").waitFor({ timeout: 15000 });
  await sleep(1200);
  const score = await page.locator("[data-practice-score]").innerText();
  const resultMood = await page.locator("[data-result-mood]").first().getAttribute("data-result-mood", { timeout: 5000 }).catch(() => "missing");
  const imgs = await page.locator("#hl-game-root img").evaluateAll((els) => els.map((e) => e.getAttribute("src") ?? ""));
  const confettiDom = await page.locator("[class*=confetti], [data-confetti]").count();
  check(
    "A7",
    `${scope}: result after misses: no confetti, no celebrate`,
    /2 of 4 right\./.test(score) && endFx === "win" && endMood !== "celebrate" && resultMood === "idle" && !imgs.some((s) => s.endsWith("-celebrate.svg")) && confettiDom === 0,
    `score "${score}", stage fx ${endFx}/${endMood}, result mood ${resultMood}`,
  );
  await shot("05-result");
  if (reduced) await noMovement(page, scope, "result");
  check("A7", `${scope}: 0 console errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

/* ------------------------------------------------------------------ */
/* Run 2b: a false alarm, its Show me, and the plan coming back        */
/* ------------------------------------------------------------------ */

async function falseAlarmRun(id, W, H) {
  const scope = `${id} ${W}x${H} false-alarm`;
  const tag = `${id}-${W}x${H}-fa`;
  const prac = content(id, "practice.json");
  const agent = prac.agent.name.split(/\s+/)[0];
  const { ctx, page, errors } = await open(W, H);
  const shot = (n) => page.screenshot({ path: join(OUT, `${tag}-${n}.png`) });
  const bar = async () => (await page.locator("[data-coach-bar]").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  const inspect = async (stepId) => {
    await waitPlan(page, stepId);
    await page.getByRole("button", { name: /^Inspect/ }).first().click();
    await sheetLoc(page).waitFor();
    await sleep(700);
  };
  await page.goto(`${BASE}/play/${id}`);
  await page.getByRole("button", { name: "Play now" }).click();
  await page.locator("[data-coach-bar]").waitFor({ timeout: 20000 });

  // Ticket 1: mark the clue, Block. The bar starts at what the agent missed (the toast says "Caught").
  const [t1, t2, t3, t4] = prac.steps;
  await inspect(t1.id);
  await sheetLoc(page).locator(`[data-row="${t1.evidence.findIndex((e) => e.redFlag)}"]`).click();
  await sleep(300);
  await sheetLoc(page).locator("[data-decide=block]").click();
  await page.locator("[data-toast]").waitFor({ timeout: 5000 });
  await sleep(800);
  const b1 = await bar();
  check("R1", `${scope} t1 caught: the bar does not repeat the toast title`, b1.startsWith(`${agent} didn't check:`) && !/Caught/.test(b1), JSON.stringify(b1));
  await page.getByRole("button", { name: /^Next ticket/ }).click();

  // Ticket 2 (safe): Block = a false alarm. One Show me; Got it goes to the main button.
  await inspect(t2.id);
  await sheetLoc(page).locator("[data-decide=block]").click();
  await page.locator("[data-toast]").waitFor({ timeout: 5000 });
  await sleep(900);
  const showMes = await page.getByRole("button", { name: "Show me" }).count();
  check("R2", `${scope} t2 false alarm: one Show me on screen`, showMes === 1, `${showMes}`);
  await shot("01-false-alarm");
  await page.locator("[data-show-me]").first().click();
  await page.locator("[data-review]").waitFor();
  await sleep(700);
  const key = await page.locator("[data-clue=key]").count();
  await page.locator("[data-review=got-it]").click();
  await sleep(600);
  const fAfter = await page.evaluate(() => {
    const a = document.activeElement;
    return !a || a === document.body ? "BODY" : (a.textContent || "").trim().slice(0, 30);
  });
  check("R2", `${scope} t2: Show me ticks the key row; Got it returns focus to the main button`, key === 1 && /^Next ticket/.test(fAfter), `key ${key}, focus "${fAfter}"`);
  const b2 = await bar();
  check("R2", `${scope} t2: after Show me, the bar stops asking for it`, !/Show me/.test(b2), JSON.stringify(b2));
  await page.getByRole("button", { name: /^Next ticket/ }).click();

  // Ticket 3 (safe): Let it run. Ticket 4 (risky): Let it run (a miss). Then ticket 2 comes back, checked.
  await inspect(t3.id);
  await sheetLoc(page).locator("[data-decide=run]").click();
  await advance(page);
  await inspect(t4.id);
  await sheetLoc(page).locator("[data-decide=run]").click();
  await advance(page);
  await waitPlan(page, t2.id);
  await sleep(600);
  const b3 = await bar();
  const ring = await page.evaluate(() => {
    const on = [...document.querySelectorAll("[data-coach='on']")];
    return on.map((el) => el.querySelector("[data-step]")?.getAttribute("data-step") ?? el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 20));
  });
  check(
    "R3",
    `${scope}: the plan comes back checked: one instruction, at the plan, never at Inspect`,
    /It's back\. Tap the plan to look again\./.test(b3) && !/Inspect|Tap Show me/.test(b3) && ring.length > 0 && ring.every((r) => r === t2.id),
    `${JSON.stringify(b3)} ring ${JSON.stringify(ring)}`,
  );
  await shot("02-back");
  // Tap the plan: the sheet opens, already checked; Let it run ends practice.
  await page.locator(`[data-step="${t2.id}"]`).first().click();
  await sheetLoc(page).waitFor();
  await sleep(700);
  await sheetLoc(page).locator("[data-decide=run]").click();
  await advance(page); // the last beat's "Finish"
  await page.getByRole("button", { name: "See how you did" }).waitFor({ timeout: 15000 });
  await sleep(2600);
  const end = await page.evaluate(() => ({
    overlay: document.querySelectorAll("[class*=endOverlay]").length,
    live: [...document.querySelectorAll("#hl-game-root [aria-live]")].map((el) => el.textContent || "").join(" | "),
  }));
  check("R4", `${scope}: at the end, nothing covers the agent (no stage end card in practice)`, end.overlay === 0, `${end.overlay}`);
  check("R4", `${scope}: the last reveal line reaches screen readers`, /See how you did/.test(end.live), JSON.stringify(end.live.slice(0, 160)));
  await shot("03-end");
  check("R4", `${scope}: 0 console errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

/* ------------------------------------------------------------------ */
/* Run 3: keyboard only (A10), Help Desk                               */
/* ------------------------------------------------------------------ */

async function keyboardRun(W, H) {
  const scope = `help-desk ${W}x${H} keyboard`;
  const prac = content("help-desk", "practice.json");
  const { ctx, page, errors } = await open(W, H);
  const focused = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      if (!a) return "none";
      if (a.hasAttribute("data-row")) return `row${a.getAttribute("data-row")}`;
      return a.getAttribute("data-decide") || a.getAttribute("aria-label") || (a.textContent || "").trim().slice(0, 30);
    });
  await page.goto(`${BASE}/play`);
  await page.getByRole("button", { name: "Play now" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Choose your pathway" }).waitFor();
  await page.goto(`${BASE}/play/help-desk`);
  await page.locator("[data-coach-bar]").waitFor({ timeout: 20000 });
  await waitPlan(page, prac.steps[0].id);
  let found = false;
  const seen = [];
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press("Tab");
    const f = await focused();
    seen.push(f);
    found = /^Inspect/.test(f);
  }
  if (!found) {
    await page.screenshot({ path: join(OUT, `help-desk-${W}x${H}-keyboard-no-inspect.png`) });
    throw new Error(`Tab never reached Inspect: ${seen.join(" > ")}`);
  }
  await page.keyboard.press("Enter");
  await sheetLoc(page).waitFor({ timeout: 10000 });
  await sleep(800);
  const path = [];
  for (let i = 0; i < 8; i++) {
    const f = await focused();
    path.push(f);
    if (f.startsWith("row")) break;
    await page.keyboard.press("Tab");
  }
  const flag = prac.steps[0].evidence.findIndex((e) => e.redFlag);
  let cur = Number((await focused()).replace("row", ""));
  while (cur < flag) {
    await page.keyboard.press("ArrowDown");
    cur = Number((await focused()).replace("row", ""));
  }
  await page.keyboard.press(" ");
  await sleep(500);
  const pressed = await page.locator(`[data-row="${flag}"]`).getAttribute("aria-pressed");
  await page.keyboard.press("Tab");
  const afterRows = await focused();
  await page.keyboard.press("Tab");
  const second = await focused();
  await page.keyboard.press("Shift+Tab");
  await page.screenshot({ path: join(OUT, `help-desk-${W}x${H}-keyboard-marked.png`) });
  await page.keyboard.press("Enter");
  await page.locator("[data-toast]").waitFor({ timeout: 5000 });
  const toast = await page.locator("[data-toast]").innerText();
  await sleep(1000);
  const afterBlock = await page.evaluate(() => {
    const a = document.activeElement;
    return !a || a === document.body ? "BODY" : a.tagName === "BUTTON" ? `button:${(a.textContent || "").trim().slice(0, 30)}` : a.tagName;
  });
  check("A10", `${scope}: 1 s after Block, focus is on a button (not <body>)`, afterBlock.startsWith("button:"), afterBlock);
  check(
    "A10",
    `${scope}: Tab/Enter/arrows/Space: rows, then Block, then Let it run; Caught with proof!`,
    found && pressed === "true" && afterRows === "block" && second === "run" && /Caught with proof!/.test(toast),
    `path ${path.join(" > ")}; after rows ${afterRows} > ${second}; toast "${toast.split("\n")[0]}"`,
  );
  check("A10", `${scope}: 0 console errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

/* ------------------------------------------------------------------ */
/* Run 4: one story-mode run with a Roll Back (A8 stable stage)        */
/* ------------------------------------------------------------------ */

async function storyRollbackRun(W, H) {
  const scope = `help-desk ${W}x${H} story`;
  const { ctx, page, errors } = await open(W, H);
  const stageH = async () => (await stageBox(page)).height;
  await page.goto(`${BASE}/play/help-desk`);
  await page.getByRole("button", { name: "Play now" }).click();
  await page.locator("[data-coach-bar]").waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Skip practice" }).click();
  await page.locator("[data-hub-main]").first().waitFor({ timeout: 15000 });
  await sleep(1200);
  await page.locator("[data-hub-main]").first().click();
  await page.locator("[data-coach-bar]").waitFor({ timeout: 20000 });
  await sleep(1500);
  const h0 = await stageH();
  let maxDev = 0;
  let rolled = false;
  for (let turn = 0; turn < 6 && !rolled; turn++) {
    const approve = page.getByRole("button", { name: /^(Approve|Next turn)/ });
    if (!(await approve.count())) break;
    await approve.first().click();
    for (let i = 0; i < 10; i++) {
      await sleep(1000);
      maxDev = Math.max(maxDev, Math.abs((await stageH()) - h0));
      const nx = page.locator("[data-toast-next]");
      if (!(await nx.count())) break;
      const lbl = await nx.innerText();
      await nx.click();
      if (/turn|Finish/i.test(lbl)) break;
    }
    await sleep(1200);
    const tray = page.locator("[data-tray] button");
    if (await tray.count()) {
      await tray.first().click();
      await sleep(700);
      const rb = page.getByRole("dialog").getByRole("button", { name: /^Roll Back/ });
      if (await rb.count()) {
        await rb.click();
        await sleep(1000);
        maxDev = Math.max(maxDev, Math.abs((await stageH()) - h0));
        rolled = true;
        await page.screenshot({ path: join(OUT, `help-desk-${W}x${H}-story-rollback.png`) });
      } else {
        await page.keyboard.press("Escape");
        await sleep(400);
      }
    }
  }
  check("A8", `${scope}: stage height stable through turns and a Roll Back`, rolled && maxDev <= 2, `rolled back ${rolled}, max change ${maxDev.toFixed(1)} px`);
  check("A8", `${scope}: 0 console errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

/* ------------------------------------------------------------------ */

const safe = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    check("ERR", name, false, String(e?.message ?? e).split("\n")[0]);
  } finally {
    for (const ctx of [...openContexts]) await ctx.close().catch(() => {});
  }
};

const started = Date.now();
for (const [W, H] of SIZES) {
  for (const id of PATHS) {
    if (RUNS.has("landing")) await safe(`${id} ${W}x${H} landing run`, () => landingRun(id, W, H));
    if (RUNS.has("miss")) await safe(`${id} ${W}x${H} deep-link miss run`, () => missRun(id, W, H, false));
    if (RUNS.has("rm")) await safe(`${id} ${W}x${H} deep-link miss run (reduced motion)`, () => missRun(id, W, H, true));
    if (RUNS.has("fa")) await safe(`${id} ${W}x${H} false-alarm run`, () => falseAlarmRun(id, W, H));
  }
  if (PATHS.includes("help-desk")) {
    if (RUNS.has("keyboard")) await safe(`keyboard ${W}x${H}`, () => keyboardRun(W, H));
    if (RUNS.has("story")) await safe(`story roll back ${W}x${H}`, () => storyRollbackRun(W, H));
  }
}
await browser.close();

console.log("\nFirst decision (taps, seconds, words seen per screen, read time at 110 wpm):");
for (const m of metrics) console.log(`  ${m.scope}: ${m.taps} taps${m.seconds ? `, ${m.seconds} s` : ""}, words ${m.words.join("+")}=${m.totalWords}, ~${m.readSecondsAt110wpm} s reading`);
const passed = results.filter((r) => r.ok).length;
console.log(`\nfirst-five: ${passed} passed, ${failures} failed (${((Date.now() - started) / 1000).toFixed(0)} s). Screenshots: ${OUT}`);
process.exit(failures ? 1 : 0);
