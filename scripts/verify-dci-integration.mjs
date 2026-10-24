// Real-base local integration. All credentials/codes/tokens stay out of output.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createServer } from "vite";
import { startDciLocalServer } from "./dci-local-server.mjs";
import { verifyDciClientAgainstLocalService } from "./dci-client-integration-probe.mjs";
import { seedTestRoster } from "./dci-seed-test-roster.mjs";
import { TABLES } from "../server/dci/config.js";
import { getRecord, listRecords, updateRecords, formulaString } from "../server/dci/airtable.js";
import { pilotUnit, studentProgress } from "../server/dci/progress.js";
import { issueSession } from "../server/dci/session.js";

const check = (condition, label) => { if (!condition) throw new Error(label); };
const evidence = { method: "loopback Node harness mounting the production handlers", checks: [], students: [], progress: [] };
function pass(label) { evidence.checks.push({ check: label, passed: true }); console.log(`PASS: ${label}`); }
let local;
let inactiveId;

async function request(path, { token, body, method = body ? "POST" : "GET", origin = "http://localhost:5173" } = {}) {
  const response = await fetch(`${local.url}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const result = response.status === 204 ? null : await response.json();
  return { status: response.status, body: result, headers: response.headers };
}

try {
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
  const roster = await seedTestRoster();
  const student = roster[0];
  evidence.students = roster.map(({ name, id }) => ({ name, recordId: id }));
  for (const row of roster) {
    const saved = await getRecord(TABLES.students, row.id);
    check(saved.fields.Status === "Active" && saved.fields["Pathway / Cohort"] === "Pilot test" &&
      saved.fields["Access Code Hash"] === createHash("sha256").update(row.code).digest("hex"), "Seed readback");
  }
  pass("three exact test roster records are Active with only SHA-256 access-code hashes");

  evidence.unitId = await pilotUnit();
  pass("pilot Unit resolved at runtime by Source App and confirmed name");
  const loader = await createServer({ configFile: false, envFile: false,
    server: { middlewareMode: true, watch: null, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] } });
  let labs;
  try {
    const { labCatalog } = await loader.ssrLoadModule("/src/data/catalog.ts");
    const { LabManifestSchema } = await loader.ssrLoadModule("/src/types/manifest.ts");
    for (const lab of labCatalog) LabManifestSchema.parse(lab);
    const published = labCatalog.filter((lab) => lab.status === "published");
    labs = [published.find((lab) => lab.accessLevel === "premium"), ...published.filter((lab) => lab.accessLevel === "free").slice(0, 2)];
    check(labs.length === 3 && labs.every(Boolean), "Three existing test labs including premium");
    pass(`${labCatalog.length} lab manifests pass the existing schema validation`);
  } finally { await loader.close(); }

  local = await startDciLocalServer();
  const wrong = await request("/signin", { body: { email: student.email, accessCode: "intentionally-wrong-test-value" } });
  check(wrong.status === 401, "Wrong-code sign-in must be 401");
  pass("wrong access code returns generic 401");
  const unknown = await request("/signin", { body: { email: "nonexistent-test-account@example.invalid", accessCode: "intentionally-wrong-test-value" } });
  check(unknown.status === 401 && JSON.stringify(unknown.body) === JSON.stringify(wrong.body), "Unknown email must be generic");
  pass("unknown email returns identical generic 401");
  const signed = await request("/signin", { body: { email: student.email, accessCode: student.code } });
  check(signed.status === 200 && typeof signed.body.token === "string" && signed.body.studentId === student.id &&
    signed.body.name === student.name && signed.body.pathway === "Pilot test", "Seeded sign-in");
  const token = signed.body.token;
  pass("seeded account signs in with 200, profile and signed session token");
  check((await request("/progress")).status === 401, "Missing bearer");
  const pieces = token.split(".");
  const badSignature = `${pieces[0]}.${pieces[1][0] === "A" ? "B" : "A"}${pieces[1].slice(1)}`;
  check((await request("/progress", { token: badSignature })).status === 401, "Tampered bearer");
  check((await request("/progress", { token: issueSession(student.id, Date.now() - 31 * 86400000).token })).status === 401, "Expired bearer");
  pass("missing, tampered and expired bearer sessions return 401");
  const preflight = await request("/progress", { method: "OPTIONS" });
  check(preflight.status === 204 && preflight.headers.get("access-control-allow-origin") === "http://localhost:5173", "Local CORS");
  check((await request("/progress", { token, origin: "https://unapproved.example.invalid" })).status === 401, "Foreign CORS");
  pass("local CORS preflight succeeds; unconfigured foreign origin is rejected");

  const before = await studentProgress(student.id);
  check(before.length === 0 || before.length === 3, "Unexpected prior test progress count; stop before writing");
  const now = Date.now();
  const firstStartedAt = new Date(now - 120000).toISOString();
  const completedAt = new Date(now - 60000).toISOString();
  const records = labs.map((lab, index) => ({ labId: lab.id, labTitle: lab.title,
    status: index < 2 ? "Completed" : "Started", xpEarned: [140, 130, 0][index], attempts: [2, 1, 0][index],
    firstStartedAt, completedAt: index < 2 ? completedAt : null }));
  if (before.length) check(before.every((row) => records.some((item) => item.labId === row.fields["Lab ID"])), "Prior test labs differ; do not overwrite");
  const pushed = await request("/progress", { token, body: { records } });
  check(pushed.status === 200 && pushed.body.records.length === 3, "Initial progress upsert");
  const written = await studentProgress(student.id);
  check(written.length === 3, "Exactly three destination rows");
  for (const expected of records) {
    const row = written.find((entry) => entry.fields["Lab ID"] === expected.labId);
    check(row && row.fields["Record Key"] === `${student.id}|${expected.labId}` &&
      row.fields.Student?.length === 1 && row.fields.Student[0] === student.id &&
      row.fields.Unit?.length === 1 && row.fields.Unit[0] === evidence.unitId &&
      row.fields["Lab Title"] === expected.labTitle && row.fields.Status === expected.status &&
      (row.fields["XP Earned"] ?? 0) === expected.xpEarned && (row.fields.Attempts ?? 0) === expected.attempts &&
      row.fields["First Started"] && row.fields["Last Updated"] &&
      (expected.completedAt ? Boolean(row.fields["Completed At"]) : !row.fields["Completed At"]), "Destination links/fields");
    evidence.progress.push({ recordId: row.id, labId: expected.labId });
  }
  const allKeys = await listRecords(TABLES.progress, { filterByFormula:
    `LEFT({Record Key},${student.id.length + 1})=${formulaString(`${student.id}|`)}` });
  check(allKeys.length === 3, "No unlinked duplicate keys");
  pass("three labs including premium upsert with correct values, Student and runtime Unit links");
  const lower = records.map((record) => ({ ...record, status: "Started", completedAt: null, xpEarned: 0, attempts: 0 }));
  const repeated = await request("/progress", { token, body: { records: lower } });
  check(repeated.status === 200 && repeated.body.records.length === 3 &&
    repeated.body.totals.totalXp === 270 && repeated.body.totals.labsCompleted === 2, "Monotonic retake totals");
  const after = await studentProgress(student.id);
  check(after.length === 3 && after.every((row) => written.some((entry) => entry.id === row.id &&
    entry.fields["XP Earned"] === row.fields["XP Earned"] && entry.fields.Attempts === row.fields.Attempts &&
    entry.fields.Status === row.fields.Status)), "Monotonic retake rows/IDs");
  check((await listRecords(TABLES.progress, { filterByFormula:
    `LEFT({Record Key},${student.id.length + 1})=${formulaString(`${student.id}|`)}` })).length === 3, "Retake duplicate count");
  pass("lower XP/attempts and Started retake preserve XP, attempts, Completed status and the same three row IDs");

  const pulled = await request("/progress", { token });
  check(pulled.status === 200 && pulled.body.records.length === 3 &&
    pulled.body.totals.totalXp === 270 && pulled.body.totals.labsCompleted === 2, "GET rows and totals");
  for (const row of pulled.body.records) {
    const saved = after.find((entry) => entry.id === row.recordId);
    check(saved && row.xpEarned === (saved.fields["XP Earned"] ?? 0) &&
      row.attempts === (saved.fields.Attempts ?? 0) && row.status === saved.fields.Status, "GET values");
  }
  const summary = await getRecord(TABLES.students, student.id);
  check(summary.fields["Labs Completed"] === 2 && summary.fields["Total XP"] === 270 &&
    Number.isFinite(Date.parse(summary.fields["Last Active"])), "Student summary");
  evidence.totals = pulled.body.totals;
  pass("GET returns matching three labs/totals; Student summary and Last Active match");

  evidence.client = await verifyDciClientAgainstLocalService({ baseUrl: local.url, signInReply: signed.body });
  pass("actual DCI client restores three labs on a fresh cache, posts unchanged progress and clears session/cache on sign-out");

  const other = roster[2];
  inactiveId = other.id;
  try {
    await updateRecords(TABLES.students, [{ id: other.id, fields: { Status: "Inactive" } }]);
    const inactive = await request("/signin", { body: { email: other.email, accessCode: other.code } });
    check(inactive.status === 401 && JSON.stringify(inactive.body) === JSON.stringify(wrong.body), "Inactive sign-in");
    pass("temporarily Inactive test account receives identical generic 401");
  } finally {
    await updateRecords(TABLES.students, [{ id: other.id, fields: { Status: "Active" } }]);
    check((await getRecord(TABLES.students, other.id)).fields.Status === "Active", "Restore Active readback");
    inactiveId = null;
  }
  pass("temporary Inactive test account restored to Active and read back");
  for (const row of roster.slice(1)) {
    const result = await request("/signin", { body: { email: row.email, accessCode: row.code } });
    check(result.status === 200 && result.body.studentId === row.id, "Other roster sign-in");
    const separate = await request("/progress", { token: result.body.token });
    check(separate.status === 200 && separate.body.records.length === 0 && separate.body.totals.totalXp === 0, "Student isolation");
  }
  pass("all three seeded accounts sign in; other students cannot read Kevin test progress");
  evidence.completedAt = new Date().toISOString();
  writeFileSync(new URL("../dci-integration-evidence.local", import.meta.url), JSON.stringify(evidence, null, 2) + "\n", { mode: 0o600 });
  console.log("EVIDENCE:", JSON.stringify(evidence));
} catch (error) {
  // Assertion text only; never print request/response objects or native errors.
  console.error(`FAIL: ${error instanceof assert.AssertionError ? "Integration assertion" : error.message === "Airtable request failed" ? "Airtable request failed; reconcile before retry" : error.message}`);
  process.exitCode = 1;
} finally {
  if (inactiveId) {
    try {
      await updateRecords(TABLES.students, [{ id: inactiveId, fields: { Status: "Active" } }]);
      check((await getRecord(TABLES.students, inactiveId)).fields.Status === "Active", "Recovery status");
      console.log("Temporary test account restored to Active during cleanup.");
    } catch { console.error(`Test account status requires review: ${inactiveId}`); process.exitCode = 1; }
  }
  if (local) await local.close();
}
