// Production smoke checks use only the existing local test roster. Credentials,
// access codes, session tokens and installation IDs never enter logs or files.
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { readLocalRoster } from "./dci-seed-test-roster.mjs";
import { readState } from "./dci-vercel-admin.mjs";

const check = (condition, label) => { if (!condition) throw new Error(label); };
const state = readState();
const origin = state.productionOrigin;
const evidence = { productionOrigin: origin, checks: [], sourceRecordIds: [] };
const sensitive = [];
const pass = label => { evidence.checks.push({ check: label, passed: true }); console.log(`PASS LIVE: ${label}`); };
function audit(text) { check(sensitive.every(value => !value || !text.includes(value)), "Sensitive response suppressed"); }

async function api(path, { token, body, method = body ? "POST" : "GET" } = {}) {
  const response = await fetch(`${origin}/api/dci${path}`, {
    method, headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(90000),
  });
  let result;
  try { result = await response.json(); } catch { throw new Error("Live API returned a non-JSON response"); }
  return { status: response.status, body: result, headers: response.headers };
}

try {
  check(origin === "https://dci-cybersecurity-judgment-labs.vercel.app", "Unexpected deployment origin");
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
  const roster = readLocalRoster();
  const student = roster[0];
  const clientId = randomUUID();
  sensitive.push(...Object.entries(process.env).filter(([key]) => /^(?:AIRTABLE_PAT|DCI_SESSION_SECRET|VERCEL_OIDC_TOKEN)$/.test(key)).map(([,value]) => value),
    ...roster.map(row => row.code), clientId);
  const wrong = await api("/signin", { body: { email: student.email, accessCode: "intentionally-wrong-test-value" } });
  check(wrong.status === 401 && wrong.body.error === "Unauthorized" && Object.keys(wrong.body).length === 1, "Wrong-code generic 401");
  pass("wrong access code returns generic401");
  const signed = await api("/signin", { body: { email: student.email, accessCode: student.code } });
  check(signed.status === 200 && signed.body.name === student.name && signed.body.studentId === student.id &&
    typeof signed.body.token === "string", "Valid test sign-in");
  sensitive.push(signed.body.token);
  const token = signed.body.token;
  pass("valid existing test account signs in and returns a session token");
  const before = await api("/progress", { token });
  check(before.status === 200 && before.body.records.length === 3, "Existing three logical test labs");
  const lab = before.body.records.find(row => row.labId === "network-segmentation-plan");
  check(lab, "Existing premium test lab required");
  const record = Object.fromEntries(["labId", "labTitle", "status", "xpEarned", "attempts", "firstStartedAt", "completedAt"].map(key => [key, lab[key]]));
  const idsBefore = new Set(before.body.records.flatMap(row => row.recordIds));
  const posted = await api("/progress", { token, body: { clientId, records: [record] } });
  check(posted.status === 200, "Live source upsert");
  const repeated = await api("/progress", { token, body: { clientId, records: [record] } });
  check(repeated.status === 200, "Identical live source replay");
  const after = await api("/progress", { token });
  check(after.status === 200 && after.body.records.length === 3 &&
    new Set(after.body.records.map(row => row.labId)).size === 3, "No duplicate logical labs");
  check(JSON.stringify(after.body.totals) === JSON.stringify(before.body.totals), "Round-trip totals unchanged");
  const returned = after.body.records.find(row => row.labId === record.labId);
  for (const [key, value] of Object.entries(record)) {
    check(returned?.[key] === value, "Round-trip lab fields unchanged");
  }
  const idsAfter = after.body.records.flatMap(row => row.recordIds);
  check([...idsBefore].every(id => idsAfter.includes(id)), "Existing source rows preserved");
  const rowIds = result => result.records.flatMap(row => row.recordIds).sort().join("|");
  check(rowIds(posted.body) === rowIds(repeated.body) && rowIds(repeated.body) === rowIds(after.body), "Replay creates no additional source rows");
  const logicalTotals = {
    labsCompleted: after.body.records.filter(row => row.status === "Completed").length,
    totalXp: after.body.records.reduce((sum, row) => sum + row.xpEarned, 0),
  };
  check(after.body.totals.labsCompleted === logicalTotals.labsCompleted &&
    after.body.totals.totalXp === logicalTotals.totalXp, "Totals match merged logical labs");
  const added = idsAfter.filter(id => !idsBefore.has(id));
  check(added.length === 1, "Exactly one source row created for repeated payload");
  evidence.sourceRecordIds = added;
  evidence.studentRecordId = student.id;
  evidence.totals = after.body.totals;
  evidence.lab = record;
  // Preserve successful API evidence even if a later asset/UI check fails.
  const checkpoint = JSON.stringify(evidence, null, 2); audit(checkpoint);
  writeFileSync(new URL("../dci-live-evidence.local", import.meta.url), checkpoint + "\n");
  pass("production POST/replay/GET round-trip preserves logical labs and totals with one new source row");
  check(posted.headers.get("access-control-allow-origin") === origin, "Production CORS origin readback");
  pass("production API allows its assigned origin");

  const legalSource = readFileSync(new URL("../src/data/legal.ts", import.meta.url), "utf8");
  const legal = await import(`data:text/javascript;base64,${Buffer.from(legalSource).toString("base64")}`);
  const markers = [legal.privacyPolicy, legal.termsOfService, legal.disclaimer].map(text => text.split("\n")[0]);
  const mainResponse = await fetch(origin, { signal: AbortSignal.timeout(30000) });
  check(mainResponse.ok, "Production root page");
  const html = await mainResponse.text(); audit(html);
  const assets = new Set([...html.matchAll(/(?:src|href)="([^\"]+\.(?:js|css))"/g)].map(match => new URL(match[1], origin).href));
  const visited = new Set();
  let allAssetText = "";
  while (assets.size) {
    const url = assets.values().next().value; assets.delete(url);
    if (visited.has(url)) continue;
    check(new URL(url).origin === origin, "Unexpected asset origin");
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    check(response.ok, "Live build asset fetch");
    const text = await response.text(); audit(text);
    for (const marker of markers) check(!text.includes(marker), "Consumer legal text in live output");
    visited.add(url); allAssetText += text;
    for (const match of text.matchAll(/["'](\.?\/?[^"'\s]+\.(?:js|css))["']/g)) {
      // Vite preload tables use root-relative assets/... entries; dynamic
      // imports use ./chunk.js relative to the importing asset.
      const target = new URL(match[1].startsWith("assets/") ? `/${match[1]}` : match[1], url);
      if (target.origin === origin && target.pathname.startsWith("/assets/")) assets.add(target.href);
    }
  }
  check(allAssetText.includes("Cybersecurity Judgment Labs") && allAssetText.includes("DCI Resources — Student Edition"), "Live DCI branding");
  check(!allAssetText.includes("No progress data is transmitted to external servers."), "Consumer privacy prose absent");
  for (const path of ["/settings/privacy", "/settings/terms", "/settings/disclaimer", "/privacy-policy.html", "/data-deletion.html", "/docs/privacy-policy.html", "/docs/data-deletion.html"]) {
    const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(30000) });
    const text = await response.text(); audit(text);
    for (const marker of markers) check(!text.includes(marker), "Legal document reachable on production");
  }
  evidence.scannedAssets = visited.size;
  pass("live DCI assets and old legal URLs contain no consumer legal documents");
  const result = JSON.stringify(evidence, null, 2); audit(result);
  writeFileSync(new URL("../dci-live-evidence.local", import.meta.url), result + "\n");
  console.log("LIVE EVIDENCE:", JSON.stringify(evidence));
} catch (error) {
  console.error(`Live smoke stopped: ${error.message}`);
  process.exitCode = 1;
}
