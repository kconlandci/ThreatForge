#!/usr/bin/env node
/**
 * After `next build`: each pathway's route ships only its own content.
 *
 * Reads the app build manifest and checks the JS chunks each /play/<pathway> page loads:
 * - /play/help-desk never contains the Cybersecurity marker ("When in doubt, lock it out"), the
 *   Cloud & Network marker ("Relax. I have root."), the Full-Stack marker ("read the docs later.")
 *   or the Business Analyst marker ("to the right, in bold").
 * - Each other game route (/play/cybersecurity, /play/cloud-network, /play/full-stack,
 *   /play/business-analyst) never contains any of the other four pathways' markers.
 * - /play and / carry none of them.
 * - Each game route does contain its own marker (so the check is really looking at the content).
 *
 * Usage: npm run build && npm run check:bundles   (honours NEXT_DIST_DIR, default .next)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = process.env.NEXT_DIST_DIR || ".next";
const HD = "Off-and-On-Again";
const CY = "When in doubt, lock it out";
const CN = "Relax. I have root.";
// No apostrophe: the build escapes ' as \' inside JSON.parse('...'), so Piper's "I'll read the docs
// later." would never match as written.
const FS = "read the docs later.";
// Quill's "Up and to the right, in bold!" (no apostrophe in the marker either, for the same reason).
const BA = "to the right, in bold";
const ROUTES = [
  { page: "/play/help-desk/page", own: HD, others: [CY, CN, FS, BA], required: true },
  { page: "/play/cybersecurity/page", own: CY, others: [HD, CN, FS, BA], required: true },
  { page: "/play/cloud-network/page", own: CN, others: [HD, CY, FS, BA], required: true },
  { page: "/play/full-stack/page", own: FS, others: [HD, CY, CN, BA], required: true },
  { page: "/play/business-analyst/page", own: BA, others: [HD, CY, CN, FS], required: true },
  // The picker and the landing page carry no game content at all.
  { page: "/play/page", own: null, others: [HD, CY, CN, FS, BA], required: true },
  { page: "/page", own: null, others: [HD, CY, CN, FS, BA], required: true },
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
