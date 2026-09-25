#!/usr/bin/env node
/**
 * After `next build`: each pathway's route ships only its own content.
 *
 * Reads the app build manifest and checks the JS chunks each /play/<pathway> page loads:
 * - /play/help-desk never contains the Cybersecurity marker ("When in doubt, lock it out").
 * - /play/cybersecurity never contains the Help Desk marker ("Off-and-On-Again").
 * - /play and / carry neither.
 * - Each game route does contain its own marker (so the check is really looking at the content).
 *
 * Usage: npm run build && npm run check:bundles   (honours NEXT_DIST_DIR, default .next)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = process.env.NEXT_DIST_DIR || ".next";
const HD = "Off-and-On-Again";
const CY = "When in doubt, lock it out";
const ROUTES = [
  { page: "/play/help-desk/page", own: HD, others: [CY], required: true },
  { page: "/play/cybersecurity/page", own: CY, others: [HD], required: true },
  // The picker and the landing page carry no game content at all.
  { page: "/play/page", own: null, others: [HD, CY], required: true },
  { page: "/page", own: null, others: [HD, CY], required: true },
];

const manifestPath = join(dist, "app-build-manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`check:bundles: ${manifestPath} not found. Run \`next build\` first.`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const pages = manifest.pages ?? {};

let failed = false;
for (const route of ROUTES) {
  const chunks = pages[route.page];
  if (!chunks) {
    if (route.required) {
      console.error(`check:bundles: ${route.page} is missing from the build.`);
      failed = true;
    } else {
      console.log(`check:bundles: ${route.page} not built yet (skipped).`);
    }
    continue;
  }
  const js = chunks.filter((c) => c.endsWith(".js")).map((c) => readFileSync(join(dist, c), "utf8")).join("\n");
  const leaked = route.others.filter((m) => js.includes(m));
  const hasOther = leaked.length > 0;
  const hasOwn = route.own === null || js.includes(route.own);
  if (hasOther) {
    console.error(`check:bundles: ${route.page} ships pathway content it should not ("${leaked.join('", "')}").`);
    failed = true;
  }
  if (!hasOwn) {
    console.error(`check:bundles: ${route.page} does not contain its own content ("${route.own}"). Is the check still valid?`);
    failed = true;
  }
  if (!hasOther && hasOwn) console.log(`check:bundles: ${route.page} ok (${chunks.length} chunks).`);
}
process.exit(failed ? 1 : 0);
