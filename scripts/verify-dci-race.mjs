// Decisive real-base race test. Raw installation IDs and credentials stay only
// in memory; no request/response/worker output is logged before a leak check.
import { fork, spawn, execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readLocalRoster } from "./dci-seed-test-roster.mjs";
import { getRecord } from "../server/dci/airtable.js";
import { TABLES } from "../server/dci/config.js";
import { pilotUnit, studentProgress, progressResponse } from "../server/dci/progress.js";
import { deriveSourceKey } from "../server/dci/source.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const rounds = 10;
const workers = [];
const capturedOutput = [];
let sensitive = [];
let phase = "preflight";
class CheckFailure extends Error {}
const check = (ok, message) => { if (!ok) throw new CheckFailure(message); };
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const digest = value => createHash("sha256").update(value).digest("hex");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function assertNoSensitive(text) {
  check(sensitive.every(value => !text.includes(value)), "Sensitive-value scan failed; values suppressed");
}

async function worker() {
  const child = fork(fileURLToPath(new URL("./dci-local-server.mjs", import.meta.url)), [], {
    cwd: root, stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  const entry = { child, output: "", exited: false };
  workers.push(entry);
  child.stdout.on("data", chunk => { entry.output += chunk.toString(); });
  child.stderr.on("data", chunk => { entry.output += chunk.toString(); });
  child.on("exit", () => { entry.exited = true; });
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new CheckFailure("Worker startup timeout")), 30000);
    child.once("error", () => { clearTimeout(timer); reject(new CheckFailure("Worker startup error")); });
    child.once("exit", () => { clearTimeout(timer); reject(new CheckFailure("Worker exited before ready")); });
    child.once("message", message => {
      clearTimeout(timer);
      if (message?.type === "ready" && message.pid === child.pid && /^http:\/\/127\.0\.0\.1:\d+\/api\/dci$/.test(message.url)) resolve(message);
      else reject(new CheckFailure("Invalid worker lifecycle reply"));
    });
  });
  return { ...ready, entry };
}

async function request(server, path, { token, body, method = body ? "POST" : "GET" } = {}) {
  const response = await fetch(`${server.url}${path}`, {
    method, headers: { Origin: "http://localhost:5173", ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(180000),
  });
  const reply = await response.json();
  assertNoSensitive(JSON.stringify(reply));
  return { status: response.status, body: reply };
}

function logicalLab(reply, labId) {
  check(reply.status === 200 && Array.isArray(reply.body.records), "Logical GET failed");
  const records = reply.body.records.filter(record => record.labId === labId);
  check(records.length === 1, "Expected exactly one logical lab");
  return records[0];
}

async function post(server, token, clientId, records) {
  const reply = await request(server, "/progress", { token, body: { clientId, records,
    // Deliberately untrusted identity. Routing must use the verified token.
    studentId: "rec00000000000000" } });
  check(reply.status === 200, `Source POST did not acknowledge verified success (HTTP ${reply.status})`);
  return reply;
}

async function pair(left, right) {
  const start = performance.now();
  const a = left();
  const second = performance.now();
  const b = right();
  await Promise.all([a, b]);
  return second - start;
}

async function build(flavor) {
  const env = { ...process.env };
  if (flavor === "consumer") delete env.VITE_EDITION;
  else env.VITE_EDITION = "dci";
  const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm run build"] : ["run", "build"];
  const result = await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk.toString(); });
    child.stderr.on("data", chunk => { output += chunk.toString(); });
    child.once("error", () => reject(new CheckFailure("Build command failed to start")));
    child.once("exit", code => resolve({ code, output }));
  });
  assertNoSensitive(result.output);
  capturedOutput.push(result.output);
  console.log(`BUILD ${flavor}: npm run build (exit ${result.code})`);
  check(result.code === 0, `${flavor} production build failed`);
  console.log(result.output.trim());
  auditArtifacts();
}

function auditArtifacts() {
  const files = readdirSync(new URL("../dist/assets/", import.meta.url));
  for (const file of files.filter(name => /\.(js|css)$/.test(name))) {
    assertNoSensitive(readFileSync(new URL(`../dist/assets/${file}`, import.meta.url), "utf8"));
  }
}

try {
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
  const roster = readLocalRoster();
  const student = roster[0];
  check(student.id && roster.length === 3, "Existing test roster required; no seeding in race test");
  const deviceA = randomUUID();
  const deviceB = randomUUID();
  check(deviceA !== deviceB, "Independent installation generation failed");
  sensitive = [process.env.AIRTABLE_PAT, process.env.DCI_SESSION_SECRET, ...roster.map(row => row.code), deviceA, deviceB];
  check(sensitive.every(value => typeof value === "string" && value.length), "Local credentials missing");
  const studentRow = await getRecord(TABLES.students, student.id);
  check(studentRow.fields.Name === student.name && studentRow.fields.Status === "Active" &&
    studentRow.fields["Pathway / Cohort"] === "Pilot test" && studentRow.fields["Access Code Hash"] === digest(student.code), "Exact existing test account required");
  const unitId = await pilotUnit();
  const before = await studentProgress(student.id, unitId);
  const legacy = before.filter(row => row.fields["Record Key"].split("|").length === 2);
  check(legacy.length === 3, "Expected three existing legacy test labs");
  const baseline = progressResponse(before);
  const labsById = new Map(baseline.records.map(row => [row.labId, row]));
  const [challenge, disjointA, disjointB] = ["network-segmentation-plan", "firewall-rule-hardening", "password-spraying-detection"].map(id => labsById.get(id));
  check(baseline.records.length === 3 && challenge && disjointA && disjointB, "Only the three existing test labs may be used");
  const sources = { A: deriveSourceKey(student.id, deviceA), B: deriveSourceKey(student.id, deviceB) };
  const [a, b] = await Promise.all([worker(), worker()]);
  check(a.pid !== b.pid && a.url !== b.url && a.pid !== process.pid && b.pid !== process.pid, "Two independent endpoint processes required");
  console.log("PASS: two separately spawned Node endpoint processes; no shared process-local lock.");

  phase = "authentication regressions";
  const wrong = await request(a, "/signin", { body: { email: student.email, accessCode: "intentionally-wrong-test-value" } });
  check(wrong.status === 401 && canonical(wrong.body) === canonical({ error: "Unauthorized" }), "Wrong-code generic 401 regression");
  // Sign-in token values are never printed or persisted. The sensitive scanner
  // begins checking them after successful replies have been captured in RAM.
  const signedA = await request(a, "/signin", { body: { email: student.email, accessCode: student.code } });
  const signedB = await request(b, "/signin", { body: { email: student.email, accessCode: student.code } });
  check(signedA.status === 200 && signedB.status === 200 && typeof signedA.body.token === "string" && typeof signedB.body.token === "string", "Existing test account sign-in failed");
  const tokenA = signedA.body.token;
  const tokenB = signedB.body.token;
  sensitive.push(tokenA, tokenB);
  const missing = await request(a, "/progress", { token: tokenA, body: { records: [] } });
  const malformed = await request(b, "/progress", { token: tokenB, body: { clientId: "invalid", records: [] } });
  check(missing.status === 400 && malformed.status === 400, "Missing/malformed installation ID must be rejected");
  console.log("PASS: generic wrong-code401, valid sessions, missing/malformed clientId400, authenticated routing.");

  const firstStartedAt = new Date(Date.now() - 60000).toISOString();
  const row = (lab, status, xpEarned, attempts, completedAt) => ({ labId: lab.labId, labTitle: lab.labTitle,
    status, xpEarned, attempts, firstStartedAt, completedAt });
  const skews = [];
  let finalExpected;
  for (let round = 1; round <= rounds; round += 1) {
    phase = `round ${round}`;
    const completedAt = new Date().toISOString();
    const left = row(disjointA, "Completed", disjointA.xpEarned + 5 * round, disjointA.attempts + round, completedAt);
    const right = row(disjointB, "Completed", disjointB.xpEarned + 7 * round, disjointB.attempts + round, completedAt);
    skews.push(await pair(() => post(a, tokenA, deviceA, [left]), () => post(b, tokenB, deviceB, [right])));
    const disjoint = await request(a, "/progress", { token: tokenA });
    check(logicalLab(disjoint, left.labId).xpEarned >= left.xpEarned && logicalLab(disjoint, right.labId).xpEarned >= right.xpEarned, "Disjoint pushes lost a lab/value");

    const high = row(challenge, "Completed", challenge.xpEarned + 10 * round, challenge.attempts + round + 1, completedAt);
    const low = row(challenge, "Started", challenge.xpEarned + round, challenge.attempts + round, null);
    skews.push(await pair(() => post(a, tokenA, deviceA, [high]), () => post(b, tokenB, deviceB, [low])));
    const verifyHigh = async () => {
      const reply = await request(b, "/progress", { token: tokenB });
      const lab = logicalLab(reply, challenge.labId);
      check(lab.status === "Completed" && lab.xpEarned === high.xpEarned && lab.attempts === high.attempts &&
        Date.parse(lab.completedAt) >= Date.parse(completedAt), "Same-lab logical maximum regressed");
      return reply;
    };
    await verifyHigh();
    await post(b, tokenB, deviceB, [low]);
    await verifyHigh();
    await post(a, tokenA, deviceA, [high]);
    const current = await verifyHigh();
    check(current.body.records.length === 3 && new Set(current.body.records.map(lab => lab.labId)).size === 3, "Logical duplicate created");
    const raw = await studentProgress(student.id, unitId);
    const aRows = raw.filter(entry => entry.fields["Record Key"] === `${student.id}|${challenge.labId}|${sources.A}`);
    const bRows = raw.filter(entry => entry.fields["Record Key"] === `${student.id}|${challenge.labId}|${sources.B}`);
    check(aRows.length === 1 && bRows.length === 1, "Duplicate source rows created");
    check(aRows[0].fields.Status === "Completed" && bRows[0].fields.Status === "Started" &&
      aRows[0].fields["XP Earned"] === high.xpEarned && bRows[0].fields["XP Earned"] === low.xpEarned, "Cross-source overwrite detected");
    for (const original of legacy) {
      check(canonical(raw.find(entry => entry.id === original.id)) === canonical(original), "Legacy row changed");
    }
    finalExpected = [high, left, right];
    console.log(`PASS round ${round}/${rounds}: paired disjoint pushes, paired high/low same lab, lower replay, identical replay, source uniqueness and immutable legacy.`);
  }

  phase = "final reconciliation";
  const finalGet = await request(a, "/progress", { token: tokenA });
  check(finalGet.status === 200, "Final reconciliation GET failed");
  const raw = await studentProgress(student.id, unitId);
  const logical = progressResponse(raw);
  check(canonical(finalGet.body.totals) === canonical(logical.totals), "GET totals differ from raw-row logical merge");
  for (const expected of finalExpected) {
    const saved = logicalLab(finalGet, expected.labId);
    check(saved.status === "Completed" && saved.xpEarned === expected.xpEarned && saved.attempts === expected.attempts, "Final logical value mismatch");
  }
  let summaryMatches = false;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const stored = await getRecord(TABLES.students, student.id);
    summaryMatches = stored.fields["Labs Completed"] === logical.totals.labsCompleted && stored.fields["Total XP"] === logical.totals.totalXp;
    if (summaryMatches) break;
    await delay(1000);
  }
  check(summaryMatches, "Stored summary did not settle after reconciliation GET");
  const sourceRows = raw.filter(entry => [sources.A, sources.B].some(key => entry.fields["Record Key"].endsWith(`|${key}`)));
  check(sourceRows.length === 4, "Expected four A/B source rows across the three existing labs");
  const evidence = { rounds, processIds: [a.pid, b.pid], studentRecordId: student.id, unitRecordId: unitId,
    pairStartSkewMsMaximum: Math.max(...skews), sourceRows: sourceRows.map(entry => ({ recordId: entry.id,
      labId: entry.fields["Lab ID"], sourceKey: entry.fields["Record Key"].split("|")[2], status: entry.fields.Status,
      xpEarned: entry.fields["XP Earned"] ?? 0, attempts: entry.fields.Attempts ?? 0 })),
    legacyRecordIdsUnchanged: legacy.map(entry => entry.id), logical: finalGet.body.records, totals: logical.totals,
    summaryVerified: true, completedAt: new Date().toISOString() };
  const evidenceText = JSON.stringify(evidence, null, 2);
  assertNoSensitive(evidenceText);
  writeFileSync(new URL("../dci-race-evidence.local", import.meta.url), evidenceText + "\n", { mode: 0o600 });
  console.log("PASS: final logical GET and stored Student summary match; all legacy rows unchanged.");
  console.log("EVIDENCE:", JSON.stringify(evidence));

  if (process.argv.includes("--build")) {
    phase = "consumer build"; await build("consumer");
    phase = "DCI build"; await build("dci");
  }
  phase = "sensitive-value audit";
  const staged = execFileSync("git", ["diff", "--cached", "--binary"], { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  assertNoSensitive(staged);
  const changes = execFileSync("git", ["diff", "HEAD", "--binary"], { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  assertNoSensitive(changes);
  auditArtifacts();
  for (const entry of workers) assertNoSensitive(entry.output);
  for (const output of capturedOutput) assertNoSensitive(output);
  console.log("PASS: raw installation IDs, roster codes, tokens, PAT and session secret absent from captured logs, staged changes and generated assets.");
} catch (error) {
  console.error(`FAIL during ${phase}: ${error instanceof CheckFailure ? error.message : "runtime error; sensitive details suppressed"}`);
  process.exitCode = 1;
} finally {
  await Promise.all(workers.map(async ({ child, exited }) => {
    if (exited || child.exitCode !== null) return;
    await new Promise(resolve => {
      const timer = setTimeout(() => { child.kill(); resolve(); }, 10000);
      child.once("exit", () => { clearTimeout(timer); resolve(); });
      child.send({ type: "close" }, () => {});
    });
  }));
}
