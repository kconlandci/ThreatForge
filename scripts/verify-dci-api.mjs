// Pure server checks. Fixture credentials only; no env files or network.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hashAccessCode, matchesAccessCode, issueSession, verifySession, bearerStudent } from "../server/dci/session.js";
import { validateRecords, mergeFields, progressResponse, withStudentLock } from "../server/dci/progress.js";
import { validateClientId, deriveSourceKey } from "../server/dci/source.js";
import progressHandler from "../api/dci/progress.js";
import { readJson, prepareRequest } from "../server/dci/http.js";
import { isAllowedOrigin, SESSION_LIFETIME_SECONDS, PRODUCTION_ORIGIN } from "../server/dci/config.js";

process.env.DCI_SESSION_SECRET = "public-unit-fixture-only-not-a-deployed-session-secret";
globalThis.fetch = () => { throw new Error("Network forbidden in pure API verification"); };
const student = "rec00000000000001";
const unit = "rec00000000000002";
// Runtime-only installation identifiers. Never print or embed them in fixtures.
const clientA = randomUUID();
const clientB = randomUUID();
assert.ok(validateClientId(clientA) === clientA, "Canonical installation ID must validate");
const sourceA = deriveSourceKey(student, clientA);
const sourceB = deriveSourceKey(student, clientB);
assert.match(sourceA, /^[a-f0-9]{32}$/);
assert.ok(sourceA !== sourceB && sourceA !== deriveSourceKey(unit, clientA), "Source routing must bind student and installation");
assert.ok(!sourceA.includes(clientA) && !sourceB.includes(clientB), "A source key must never contain an installation ID");
for (const invalid of [undefined, null, "", "invalid", "../source", "x".repeat(1000), 12, {}, clientA.toUpperCase()]) {
  assert.throws(() => validateClientId(invalid));
}
const now = Date.now();
const issued = issueSession(student, now);
const payload = verifySession(issued.token, now);
assert.equal(payload.studentId, student);
assert.equal(payload.exp, Math.floor(now / 1000) + SESSION_LIFETIME_SECONDS);
assert.equal(Date.parse(issued.expiresAt), payload.exp * 1000);
assert.equal(verifySession(issued.token, payload.exp * 1000), null);
assert.equal(verifySession(`${issued.token}x`, now), null);
const [encoded, signature] = issued.token.split(".");
const changed = Buffer.from(JSON.stringify({ ...payload, studentId: unit })).toString("base64url");
assert.equal(verifySession(`${changed}.${signature}`, now), null);
assert.equal(verifySession(`${encoded}.bad`, now), null);
assert.equal(verifySession("not-a-token", now), null);
assert.equal(bearerStudent({ headers: { authorization: `Bearer ${issued.token}` } }), student);
assert.equal(bearerStudent({ headers: { authorization: issued.token } }), null);
assert.equal(bearerStudent({ headers: {} }), null);
const digest = hashAccessCode("public-unit-code-fixture");
assert.match(digest, /^[a-f0-9]{64}$/);
assert.equal(matchesAccessCode("public-unit-code-fixture", digest), true);
assert.equal(matchesAccessCode("wrong-unit-fixture", digest), false);
assert.equal(matchesAccessCode("public-unit-code-fixture", "not-a-digest"), false);
assert.equal(matchesAccessCode("public-unit-code-fixture", undefined), false);
console.log("PASS API authentication: SHA-256, signed identity, 30-day expiry, tamper rejection, bearer validation");

const incoming = {
  labId: "fixture-lab", labTitle: "Fixture lab", status: "Completed",
  xpEarned: 140, attempts: 2, firstStartedAt: "2026-10-24T01:00:00Z", completedAt: "2026-10-24T02:00:00Z",
};
const lower = { ...incoming, status: "Started", xpEarned: 10, attempts: 1, firstStartedAt: "2026-10-24T03:00:00Z", completedAt: null };
const normalized = validateRecords({ records: [incoming, lower] });
assert.equal(normalized.length, 1);
assert.equal(normalized[0].status, "Completed");
assert.equal(normalized[0].xpEarned, 140);
assert.equal(normalized[0].attempts, 2);
assert.equal(normalized[0].firstStartedAt, "2026-10-24T01:00:00.000Z");
const original = mergeFields(student, unit, normalized[0], undefined, "2026-10-24T04:00:00.000Z", sourceA);
const merged = mergeFields(student, unit, validateRecords({ records: [lower] })[0], { fields: original }, "2026-10-24T05:00:00.000Z", sourceA);
assert.equal(merged["Record Key"], `${student}|fixture-lab|${sourceA}`);
assert.ok(!JSON.stringify(merged).includes(clientA), "Raw installation ID must not enter Airtable fields");
assert.deepEqual(merged.Student, [student]);
assert.deepEqual(merged.Unit, [unit]);
assert.equal(merged.Status, "Completed");
assert.equal(merged["XP Earned"], 140);
assert.equal(merged.Attempts, 2);
assert.equal(merged["First Started"], original["First Started"]);
assert.equal(merged["Completed At"], original["Completed At"]);
const second = mergeFields(student, unit, { ...lower, labId: "other-fixture" }, undefined, "2026-10-24T05:00:00.000Z", sourceA);
const readback = progressResponse([{ id: "rec00000000000003", fields: merged }, { id: "rec00000000000004", fields: second }]);
assert.deepEqual(readback.totals, { labsCompleted: 1, totalXp: 150 });
assert.equal(readback.records.length, 2);
assert.equal(readback.records[0].attempts, 2);
for (const invalid of [
  { records: [{}] }, { records: [{ ...incoming, xpEarned: -1 }] },
  { records: [{ ...incoming, attempts: 0.5 }] }, { records: [{ ...incoming, status: "Inactive" }] },
  { records: [{ ...incoming, labId: "../other" }] }, { records: [{ ...incoming, firstStartedAt: "bad" }] },
  { records: [{ ...incoming, status: "Started" }] }, { records: Array(1001).fill(incoming) },
]) assert.throws(() => validateRecords(invalid));
assert.equal(validateRecords({ records: Array.from({ length: 101 }, (_, index) => ({ ...incoming, labId: `fixture-${index}` })) }).length, 101);
console.log("PASS API progress: exact links/key, deduplication, monotonic XP/attempts/status, timestamps, totals and rejected malformed input");

const legacy = { id: "rec00000000000005", fields: {
  ...original, "Record Key": `${student}|fixture-lab`, "XP Earned": 300, Attempts: 7,
  "First Started": "2026-10-22T01:00:00.000Z", "Completed At": "2026-10-23T02:00:00.000Z",
  "Last Updated": "2026-10-23T03:00:00.000Z",
} };
const legacySnapshot = JSON.stringify(legacy);
const high = { id: "rec00000000000006", fields: { ...merged, "XP Earned": 400, Attempts: 9,
  "Completed At": "2026-10-24T02:00:00.000Z", "Last Updated": "2026-10-24T03:00:00.000Z" } };
const low = { id: "rec00000000000007", fields: {
  ...mergeFields(student, unit, lower, undefined, "2026-10-25T03:00:00.000Z", sourceB),
  "First Started": "2026-10-21T01:00:00.000Z",
} };
const logical = progressResponse([legacy, high, low, { id: "rec00000000000008", fields: second }]);
assert.equal(logical.records.length, 2, "Multiple sources must return one logical row per lab");
assert.deepEqual(logical.totals, { labsCompleted: 1, totalXp: 410 });
const logicalLab = logical.records.find(record => record.labId === "fixture-lab");
assert.equal(logicalLab.status, "Completed");
assert.equal(logicalLab.xpEarned, 400);
assert.equal(logicalLab.attempts, 9);
assert.equal(logicalLab.firstStartedAt, "2026-10-21T01:00:00.000Z");
assert.equal(logicalLab.completedAt, "2026-10-24T02:00:00.000Z");
assert.equal(logicalLab.lastUpdated, "2026-10-25T03:00:00.000Z");
assert.equal(JSON.stringify(legacy), legacySnapshot, "Logical merges must not modify legacy input");
assert.ok(!JSON.stringify(logical).includes(clientA) && !JSON.stringify(logical).includes(clientB), "Responses cannot expose raw installation IDs");
assert.throws(() => mergeFields(student, unit, incoming, undefined, new Date().toISOString()));
console.log("PASS API sources: student-bound HMAC routing, legacy/source logical maxima, earliest start/latest completion, max update, logical totals and no raw installation IDs");

const events = [];
await Promise.all([
  withStudentLock(student, async () => { events.push("first-start"); await new Promise(resolve => setTimeout(resolve, 5)); events.push("first-end"); }),
  withStudentLock(student, async () => { events.push("second"); }),
]);
assert.deepEqual(events, ["first-start", "first-end", "second"]);
await assert.rejects(withStudentLock(student, async () => { throw new Error("fixture failure"); }));
assert.equal(await withStudentLock(student, async () => 7), 7);
console.log("PASS API concurrency: same-process student writes serialize and recover after failure");

assert.equal(PRODUCTION_ORIGIN, null);
for (const origin of ["http://localhost:5173", "http://127.0.0.1:3000", "https://localhost"]) assert.equal(isAllowedOrigin(origin), true);
for (const origin of ["http://localhost.example.invalid", "https://example.invalid", "null", "http://localhost:5173/path"]) assert.equal(isAllowedOrigin(origin), false);
const response = () => ({ headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(body) { this.body = body; } });
for (const invalid of [undefined, "invalid", "x".repeat(1000)]) {
  const rejected = response();
  await progressHandler({ method: "POST", headers: { authorization: `Bearer ${issued.token}` },
    body: { records: [incoming], ...(invalid === undefined ? {} : { clientId: invalid }) } }, rejected);
  assert.equal(rejected.statusCode, 400, "Missing/malformed installation routing must be rejected before any write");
}
const denied = response();
assert.equal(prepareRequest({ method: "POST", headers: { origin: "https://example.invalid" } }, denied, ["POST"]), false);
assert.equal(denied.statusCode, 401);
const options = response();
assert.equal(prepareRequest({ method: "OPTIONS", headers: { origin: "http://localhost:5173" } }, options, ["POST"]), false);
assert.equal(options.statusCode, 204);
assert.equal(options.headers["Access-Control-Allow-Origin"], "http://localhost:5173");
assert.deepEqual(await readJson({ headers: {}, body: '{"records":[]}' }), { records: [] });
await assert.rejects(readJson({ headers: {}, body: "not-json" }));
await assert.rejects(readJson({ headers: { "content-length": String(128 * 1024 + 1) }, body: {} }));
console.log("PASS API HTTP: local-only CORS, no production origin, preflight and body limits");

// Fixture-only Airtable responses prove cached Student totals cannot corrupt
// a logical GET, and failed best-effort repair does not delay its response.
const blockedNetwork = globalThis.fetch;
process.env.AIRTABLE_PAT = "public-unit-fixture-token";
let responseEnded = false, repairObserved = false, repairBeforeResponse = false;
globalThis.fetch = async (url, options = {}) => {
  const address = new URL(url);
  assert.ok(address.origin === "https://api.airtable.com", "Only in-memory API fixtures are allowed");
  if (options.method === "PATCH") {
    repairObserved = true;
    repairBeforeResponse ||= !responseEnded;
    return new Response("{}", { status: 503 });
  }
  if (address.pathname.endsWith(`/${student}`)) return new Response(JSON.stringify({ id: student,
    fields: { Status: "Active", "Labs Completed": 0, "Total XP": 0 } }));
  if (address.pathname.includes("/tble5Ke2MTWdS8VyR")) return new Response(JSON.stringify({
    records: [{ id: unit, fields: { "Source App": "ThreatForge", "DCI Unit Name": "Cybersecurity Judgment Labs" } }],
  }));
  if (address.pathname.includes("/tblzcw3zC53G1tHv6")) return new Response(JSON.stringify({
    records: [legacy, high, low, { id: "rec00000000000008", fields: second }],
  }));
  throw new Error("Unexpected in-memory API fixture route");
};
try {
  const logicalResponse = response();
  logicalResponse.end = body => { logicalResponse.body = body; responseEnded = true; };
  await progressHandler({ method: "GET", headers: { authorization: `Bearer ${issued.token}` } }, logicalResponse);
  assert.equal(logicalResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(logicalResponse.body).totals, { labsCompleted: 1, totalXp: 410 });
  assert.ok(repairObserved && !repairBeforeResponse, "GET must respond before failed summary repair");
  console.log("PASS API GET: fresh logical totals ignore stale Student cache; repair failure occurs after successful response");
} finally {
  globalThis.fetch = blockedNetwork;
  delete process.env.AIRTABLE_PAT;
}

async function verifyBoundedSourceWrite(converges) {
  const initialFields = mergeFields(student, unit, lower, undefined, "2026-10-24T00:00:00.000Z", sourceA);
  let storedSource = { id: "rec00000000000009", fields: initialFields };
  let sourceWrites = 0, sourceReads = 0, legacyWrites = 0;
  let studentFields = { Status: "Active", "Labs Completed": 0, "Total XP": 0 };
  const originalLegacy = JSON.stringify(legacy);
  process.env.AIRTABLE_PAT = "public-unit-fixture-token";
  globalThis.fetch = async (url, options = {}) => {
    const address = new URL(url);
    assert.ok(address.origin === "https://api.airtable.com", "Only in-memory source fixtures are permitted");
    if (address.pathname.includes("/tblzcw3zC53G1tHv6")) {
      if (options.method === "PATCH") {
        const payload = JSON.parse(options.body);
        for (const row of payload.records) {
          if (row.fields["Record Key"] === legacy.fields["Record Key"]) legacyWrites += 1;
          assert.ok(row.fields["Record Key"] === `${student}|${incoming.labId}|${sourceA}` &&
            row.fields.Student[0] === student && !JSON.stringify(row).includes(clientA),
          "Writes must target only the authenticated installation's derived source row");
          sourceWrites += 1;
          // The first accepted write is deliberately lost. In the failure
          // case every reread remains lower; in the recovery case attempt two
          // finally exposes the intended row for the verification read.
          if (converges && sourceWrites >= 2) storedSource = { id: storedSource.id, fields: row.fields };
        }
        return new Response(JSON.stringify({ records: [{ id: storedSource.id }] }));
      }
      if (address.searchParams.get("filterByFormula")?.startsWith("{Record Key}=")) {
        sourceReads += 1;
        return new Response(JSON.stringify({ records: [storedSource] }));
      }
      return new Response(JSON.stringify({ records: [legacy, storedSource] }));
    }
    if (address.pathname.includes("/tble5Ke2MTWdS8VyR")) return new Response(JSON.stringify({
      records: [{ id: unit, fields: { "Source App": "ThreatForge", "DCI Unit Name": "Cybersecurity Judgment Labs" } }],
    }));
    if (address.pathname.includes("/tblAhHfBLMV0lfaEP")) {
      if (options.method === "PATCH") {
        const payload = JSON.parse(options.body);
        assert.ok(payload.records.every(row => row.id === student), "Summary writes must use the authenticated student");
        studentFields = { ...studentFields, ...payload.records[0].fields };
        return new Response(JSON.stringify({ records: [{ id: student, fields: studentFields }] }));
      }
      return new Response(JSON.stringify({ id: student, fields: studentFields }));
    }
    throw new Error("Unexpected in-memory source fixture route");
  };
  try {
    const sourceResponse = response();
    await progressHandler({ method: "POST", headers: { authorization: `Bearer ${issued.token}` },
      // A conflicting body identity is intentionally ignored by the handler.
      body: { studentId: unit, clientId: clientA, records: [incoming] } }, sourceResponse);
    assert.equal(sourceResponse.statusCode, converges ? 200 : 503);
    assert.equal(sourceWrites, converges ? 2 : 3, "Source writes must stop at the bounded verification limit");
    assert.equal(sourceReads, converges ? 4 : 6, "Each attempt must freshly read and then verify its source row");
    assert.equal(legacyWrites, 0);
    assert.equal(JSON.stringify(legacy), originalLegacy, "Source retries must never alter legacy data");
    if (converges) {
      assert.deepEqual(JSON.parse(sourceResponse.body).totals, { labsCompleted: 1, totalXp: 300 });
      assert.equal(storedSource.fields.Status, "Completed");
      assert.equal(storedSource.fields["XP Earned"], 140);
      assert.equal(storedSource.fields.Attempts, 2);
    } else {
      assert.equal(storedSource.fields.Status, "Started");
      assert.equal(storedSource.fields["XP Earned"], 10);
      assert.equal(storedSource.fields.Attempts, 1);
    }
  } finally {
    globalThis.fetch = blockedNetwork;
    delete process.env.AIRTABLE_PAT;
  }
}
await verifyBoundedSourceWrite(false);
await verifyBoundedSourceWrite(true);
console.log("PASS API bounded source verification: three stale write/readback attempts return retryable503; a second-attempt convergence returns200; legacy rows remain untouched");
