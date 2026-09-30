// Prints .build/kit.html to .build/raw.pdf with Chromium (Playwright).
// Env: PW_MODULE (default /tmp/pwrun/node_modules/playwright), CHROMIUM (default /opt/pw-browsers/chromium).
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_MODULE || "/tmp/pwrun/node_modules/playwright");
const build = join(dirname(fileURLToPath(import.meta.url)), ".build");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.setContent(readFileSync(join(build, "kit.html"), "utf8"), { waitUntil: "load" });
await page.pdf({ path: join(build, "raw.pdf"), format: "Letter", printBackground: true, preferCSSPageSize: true });
// Every page must fit its box (content is clipped, not wrapped, if it does not).
const boxes = await page.evaluate(() => [...document.querySelectorAll(".page")].map((p, i) => ({ page: i + 1, scrollH: p.scrollHeight, boxH: p.clientHeight })));
await browser.close();
const bad = boxes.filter((b) => b.scrollH > b.boxH);
console.log(JSON.stringify(boxes));
if (bad.length) { console.error("OVERFLOW on page(s):", bad.map((b) => b.page).join(", ")); process.exit(1); }
