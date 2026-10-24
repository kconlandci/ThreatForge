// Pure server checks. Fixture credentials only; no env files or network.
import assert from "node:assert/strict";
import { hashAccessCode, matchesAccessCode, issueSession, verifySession, bearerStudent } from "../server/dci/session.js";
import { validateRecords, mergeFields, progressResponse, withStudentLock } from "../server/dci/progress.js";
import { readJson, prepareRequest } from "../server/dci/http.js";
import { isAllowedOrigin, SESSION_LIFETIME_SECONDS, PRODUCTION_ORIGIN } from "../server/dci/config.js";

process.env.DCI_SESSION_SECRET = "public-unit-fixture-only-not-a-deployed-session-secret";
globalThis.fetch = () => { throw new Error("Network forbidden in pure API verification"); };
const student = "rec00000000000001";
const unit = "rec00000000000002";
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
const original = mergeFields(student, unit, normalized[0], undefined, "2026-10-24T04:00:00.000Z");
const merged = mergeFields(student, unit, validateRecords({ records: [lower] })[0], { fields: original }, "2026-10-24T05:00:00.000Z");
assert.equal(merged["Record Key"], `${student}|fixture-lab`);
assert.deepEqual(merged.Student, [student]);
assert.deepEqual(merged.Unit, [unit]);
assert.equal(merged.Status, "Completed");
assert.equal(merged["XP Earned"], 140);
assert.equal(merged.Attempts, 2);
assert.equal(merged["First Started"], original["First Started"]);
assert.equal(merged["Completed At"], original["Completed At"]);
const second = mergeFields(student, unit, { ...lower, labId: "other-fixture" }, undefined, "2026-10-24T05:00:00.000Z");
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
