#!/usr/bin/env node
/**
 * Checks for the November features: trophies, the certificate, Share, Read aloud, sound effects,
 * Words to know, and Add to Home Screen. One guest plays practice and the first shift with known
 * answers (it reads content/<id>/*.json), like first-five does.
 *
 *   BASE=http://localhost:3141 npm run e2e:features
 *
 * Env: BASE, PW_MODULE, CHROMIUM, OUT (screenshots), PATHS (default help-desk,cybersecurity).
 * Exit code 1 on any fail.
 */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = (process.env.BASE || "http://localhost:3000").replace(/\/$/, "");
const { chromium } = require(process.env.PW_MODULE || "/tmp/pwrun/node_modules/playwright");
const OUT = process.env.OUT || join(tmpdir(), "features");
mkdirSync(OUT, { recursive: true });
const PATHS = (process.env.PATHS || "help-desk,cybersecurity").split(",").filter(Boolean);
const content = (id, file) => JSON.parse(readFileSync(join(APP, "content", id, file), "utf8"));

let failures = 0;
function check(id, scope, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${id.padEnd(4)} ${scope}${detail ? `  ${detail}` : ""}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

const sheet = (page) => page.locator("[role=dialog]").filter({ has: page.locator("[data-decide]") });
const onBoard = (page) => page.locator("[data-step]:not([data-tray] [data-step])").evaluateAll((els) => els.map((e) => e.getAttribute("data-step")));

/** Click through the agent's turn (toast Next buttons) until the board waits for the player again. */
async function advance(page) {
  for (let i = 0; i < 60; i++) {
    if (await page.getByRole("button", { name: "See how you did" }).count()) return;
    const next = page.locator("[data-toast-next]");
    if (await next.count()) {
      await next.first().click();
      await sleep(450);
      continue;
    }
    const nt = page.getByRole("button", { name: /^Next ticket/ });
    if ((await nt.count()) && (await nt.first().isEnabled())) {
      await nt.first().click();
      await sleep(500);
      continue;
    }
    if (!(await page.locator("[data-toast]").count())) return;
    await sleep(300);
  }
}

async function run(id) {
  const scope = `${id} 390x844`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const shot = (n) => page.screenshot({ path: join(OUT, `${id}-${n}.png`) });
  const prac = content(id, "practice.json");
  const story = content(id, "encounter-01.json");
  const glossary = content(id, "glossary.json").words;

  await page.goto(`${BASE}/play/${id}`);
  await page.getByRole("button", { name: "Play now" }).click();
  await page.locator("[data-coach-bar]").waitFor({ timeout: 30000 });
  await sleep(800);

  // Practice, played with the answers: mark the clue and block risky plans, let safe ones run.
  for (const step of prac.steps) {
    await page.locator(`[data-step="${step.id}"]:not([data-tray] [data-step])`).first().waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: /^Inspect/ }).first().click();
    await sheet(page).waitFor();
    await sleep(600);
    if (step.id === prac.steps[0].id) {
      const listen = await sheet(page).locator("[data-listen]").count();
      check("R1", `${scope}: the evidence sheet has a Listen button`, listen === 1, `${listen}`);
      const words = await sheet(page).locator("[data-words]").count();
      check("W1", `${scope}: no Words to know box on practice sheets`, words === 0, `${words}`);
    }
    if (step.safe) await sheet(page).locator("[data-decide=run]").click();
    else {
      await sheet(page).locator(`[data-row="${step.evidence.findIndex((e) => e.redFlag)}"]`).click();
      await sleep(300);
      await sheet(page).locator("[data-decide=block]").click();
    }
    await page.locator("[data-toast]").waitFor({ timeout: 10000 });
    await sleep(900);
    if (step.id === prac.steps[0].id) {
      const listen = await page.locator("[data-toast] [data-listen]").count();
      check("R2", `${scope}: the outcome message has a Listen button`, listen === 1, `${listen}`);
    }
    await advance(page);
  }
  await page.getByRole("button", { name: "See how you did" }).click();
  await page.locator("[data-practice-score]").waitFor({ timeout: 15000 });
  await sleep(1200);
  const pracTrophies = (await page.locator("[data-new-trophies]").getAttribute("data-new-trophies").catch(() => "")) ?? "";
  check("T1", `${scope}: practice result shows new trophies (first catch, proof, good work runs)`, ["first-catch", "proof", "let-it-run"].every((t) => pracTrophies.split(" ").includes(t)), JSON.stringify(pracTrophies));
  await shot("01-practice-result");

  // The first shift, with the answers: risky plans are inspected and blocked, safe plans run.
  await page.getByRole("button", { name: "Start the real shift" }).click();
  await page.locator("[data-coach-bar]").waitFor({ timeout: 20000 });
  await sleep(1200);
  const risky = new Set(story.steps.filter((s) => !s.safe).map((s) => s.id));
  let wordsSeen = null;
  for (let turn = 0; turn < 9; turn++) {
    if (await page.getByRole("button", { name: "See how you did" }).count()) break;
    for (const stepId of await onBoard(page)) {
      if (!risky.has(stepId) && wordsSeen) continue;
      await page.locator(`[data-step="${stepId}"]:not([data-tray] [data-step])`).first().click();
      await sheet(page).waitFor({ timeout: 8000 }).catch(() => {});
      await sleep(500);
      if (!(await sheet(page).count())) continue;
      if (!wordsSeen && (await sheet(page).locator("[data-words]").count())) {
        await sheet(page).locator("[data-words] summary").click();
        await sleep(400);
        wordsSeen = await sheet(page).locator("[data-words]").getAttribute("data-words");
        await shot("02-words-to-know");
      }
      if (risky.has(stepId)) {
        const big = sheet(page).getByRole("button", { name: /^Inspect/ });
        if (await big.count()) {
          await big.first().click();
          await sleep(700);
        }
        const block = sheet(page).locator("[data-decide=block]:not([aria-disabled])");
        if (await block.count()) {
          await block.first().click();
          await page.locator("[data-toast]").waitFor({ timeout: 8000 }).catch(() => {});
          await sleep(700);
          await advance(page);
          continue;
        }
      }
      await page.keyboard.press("Escape");
      await sleep(400);
    }
    const approve = page.getByRole("button", { name: /^(Approve|Next turn)/ });
    if (await approve.count()) {
      await approve.first().click();
      await sleep(900);
      await advance(page);
      await sleep(700);
    }
  }
  const known = new Set(glossary.flatMap((w) => [w.term]));
  check("W2", `${scope}: Words to know shows this pathway's words on a shift sheet`, !!wordsSeen && wordsSeen.split("|").every((t) => known.has(t)), JSON.stringify(wordsSeen));

  await page.getByRole("button", { name: "See how you did" }).click();
  await page.locator("#hl-result-title").waitFor({ timeout: 15000 });
  await sleep(1500);
  const won = (await page.locator("[data-certificate-open]").count()) > 0;
  const shiftTrophies = (await page.locator("[data-new-trophies]").getAttribute("data-new-trophies").catch(() => "")) ?? "";
  check("T2", `${scope}: a won first shift earns "First shift done"`, won && shiftTrophies.split(" ").includes("first-shift"), JSON.stringify({ won, shiftTrophies }));
  check("S1", `${scope}: the shift result has a Share button`, (await page.locator("[data-share]").count()) === 1);
  await shot("03-shift-result");

  // The certificate: a picture with the typed name, and Save picture.
  await page.locator("[data-certificate-open]").first().click();
  const cert = page.locator("[data-certificate]");
  await cert.waitFor({ timeout: 8000 });
  await cert.locator("input").fill("Ana Ruiz");
  await sleep(900);
  const pic = await cert.locator("canvas").evaluate((c) => {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let ink = 0;
    for (let i = 0; i < d.length; i += 4 * 97) if (d[i] < 80 && d[i + 1] < 80 && d[i + 2] < 80) ink++;
    return { w: c.width, h: c.height, ink, label: c.getAttribute("aria-label") };
  });
  check("C1", `${scope}: the certificate draws (1600x1131, text on it, the name in its label)`, pic.w === 1600 && pic.h === 1131 && pic.ink > 200 && /Ana Ruiz/.test(pic.label), JSON.stringify({ ...pic, label: pic.label.slice(0, 80) }));
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }).catch(() => null), cert.getByRole("button", { name: "Save picture" }).click()]);
  check("C2", `${scope}: Save picture gives a PNG file`, !!download && /certificate\.png$/.test(download.suggestedFilename()), download?.suggestedFilename() ?? "no download");
  await shot("04-certificate");
  await page.keyboard.press("Escape");
  await cert.waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
  await sleep(800);

  // Your skills: the trophy shelf and the certificate button.
  await page.getByRole("button", { name: "Back to the office" }).first().click();
  // A returning player's office: "Start today's practice" and Your skills.
  await page.getByRole("button", { name: /Start today.s practice/ }).first().waitFor({ timeout: 15000 });
  await sleep(800);
  await page.getByRole("button", { name: "Menu" }).click();
  await sleep(400);
  const menu = page.locator("[aria-label='Game menu']");
  const menuText = await menu.innerText();
  check("M1", `${scope}: Menu has Sound effects and Read aloud switches`, /Sound effects/.test(menuText) && /Read aloud/.test(menuText), menuText.replace(/\s+/g, " ").slice(0, 160));
  await menu.getByRole("switch", { name: "Sound effects" }).click();
  await sleep(300);
  check("M2", `${scope}: Sound effects turns on, and the speaker shows sound on`, (await menu.getByRole("switch", { name: "Sound effects" }).getAttribute("aria-checked")) === "true" && (await page.getByRole("button", { name: "Sound" }).getAttribute("aria-pressed")) === "true");
  await shot("05-menu");
  const skills = menu.getByRole("button", { name: /Your skills/ });
  if (await skills.count()) await skills.click();
  else await page.goto(`${BASE}/play/${id}?view=skills`);
  await page.locator("#hl-trophies").waitFor({ timeout: 15000 });
  await sleep(800);
  const earned = await page.locator("[data-trophy][data-earned=yes]").count();
  check("T3", `${scope}: Your skills shows the trophy shelf with earned trophies and the certificate`, earned >= 4 && (await page.locator("[data-certificate-open]").count()) === 1, `earned ${earned}`);
  await page.locator("#hl-trophies").scrollIntoViewIfNeeded();
  await shot("06-trophy-shelf");
  check("E1", `${scope}: 0 console errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

for (const id of PATHS) {
  try {
    await run(id);
  } catch (e) {
    check("ERR", `${id} run`, false, String(e?.message ?? e).split("\n")[0]);
  }
}

// Add to Home Screen, and the Field guide's word lists.
const ctx = await browser.newContext();
const page = await ctx.newPage();
const res = await page.goto(`${BASE}/manifest.webmanifest`);
const man = res?.ok() ? await res.json() : null;
check("H1", "manifest: name, start page and 192 + 512 icons", !!man && man.name === "Human Loop" && man.start_url === "/play" && ["192x192", "512x512"].every((s) => man.icons.some((i) => i.sizes === s)), JSON.stringify(man?.icons ?? null));
for (const icon of man?.icons ?? []) {
  const r = await page.request.get(`${BASE}${icon.src}`);
  check("H2", `icon ${icon.src} loads`, r.ok() && /image\/png/.test(r.headers()["content-type"] ?? ""));
}
await page.goto(`${BASE}/`);
check("H3", "the page links the manifest", (await page.locator("link[rel=manifest]").count()) === 1);
await page.goto(`${BASE}/guide`);
const guideWords = await page.getByText(/^Words to know \(\d+\)$/).count();
check("G1", "the Field guide has a Words to know list for each pathway", guideWords === 5, `${guideWords}`);
await ctx.close();
await browser.close();
console.log(`\nfeatures: ${failures ? `${failures} failed` : "all passed"}. Screenshots: ${OUT}`);
process.exit(failures ? 1 : 0);
