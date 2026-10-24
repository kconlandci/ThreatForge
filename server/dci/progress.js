import { TABLES } from "./config.js";
import { getRecord, listRecords, updateRecords, upsertRecords, formulaString, AirtableError } from "./airtable.js";
import { RequestError } from "./http.js";

const studentTails = new Map();
const MAX_VERIFICATION_ATTEMPTS = 3;

// A local optimization only: cross-device safety comes from disjoint source
// rows, never this process-local queue or retries against a shared lab row.
export async function withStudentLock(studentId, operation) {
  const previous = studentTails.get(studentId) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  studentTails.set(studentId, current);
  try { return await current; } finally {
    if (studentTails.get(studentId) === current) studentTails.delete(studentId);
  }
}

export async function activeStudent(studentId) {
  let student;
  try { student = await getRecord(TABLES.students, studentId); } catch (error) {
    if (error instanceof AirtableError && error.status === 404) throw new RequestError(401);
    throw error;
  }
  if (student.fields?.Status !== "Active") throw new RequestError(401);
  return student;
}

export async function pilotUnit() {
  const units = await listRecords(TABLES.units, { filterByFormula: `{Source App}=${formulaString("ThreatForge")}` });
  if (units.length !== 1 || units[0].fields?.["DCI Unit Name"] !== "Cybersecurity Judgment Labs") {
    throw new Error("Pilot unit requires review");
  }
  return units[0].id;
}

function scopedRows(records, studentId, unitId) {
  const keys = new Set();
  return records.filter(record => {
    const fields = record.fields ?? {};
    if (!Array.isArray(fields.Student) || !fields.Student.includes(studentId)) throw new Error("Progress links require review");
    if (!Array.isArray(fields.Unit)) throw new Error("Progress links require review");
    if (!fields.Unit.includes(unitId)) return false;
    if (fields.Student.length !== 1 || fields.Unit.length !== 1) throw new Error("Progress links require review");
    const prefix = `${studentId}|${fields["Lab ID"]}`;
    const key = fields["Record Key"];
    const suffix = typeof key === "string" && key.startsWith(prefix + "|") ? key.slice(prefix.length + 1) : null;
    if (typeof fields["Lab ID"] !== "string" || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(fields["Lab ID"]) ||
        typeof key !== "string" || (key !== prefix && !/^[a-f0-9]{32}$/.test(suffix ?? ""))) {
      throw new Error("Progress key requires review");
    }
    if (keys.has(key)) throw new Error("Duplicate source progress requires review");
    keys.add(key);
    return true;
  });
}

export async function studentProgress(studentId, unitId) {
  const selectedUnit = unitId ?? await pilotUnit();
  const prefix = `${studentId}|`;
  // Linked-field formulas expose display names. A key-prefix query plus link
  // validation also avoids depending on inverse-link propagation after create.
  const records = await listRecords(TABLES.progress, {
    filterByFormula: `LEFT({Record Key},${prefix.length})=${formulaString(prefix)}`,
  });
  return scopedRows(records, studentId, selectedUnit);
}

function storedNumber(value) {
  if (value === undefined || value === null) return 0;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid stored total");
  return value;
}

function timestamp(value, stored = false) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    if (stored) throw new Error("Invalid stored timestamp");
    throw new RequestError();
  }
  return new Date(value).toISOString();
}

function earliest(a, b) { return !a ? b : !b ? a : a < b ? a : b; }
function latest(a, b) { return !a ? b : !b ? a : a > b ? a : b; }

export function validateRecords(body) {
  if (!Array.isArray(body.records) || body.records.length > 1000) throw new RequestError();
  const byLab = new Map();
  for (const record of body.records) {
    if (!record || typeof record !== "object" || Array.isArray(record) ||
        typeof record.labId !== "string" || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(record.labId) ||
        typeof record.labTitle !== "string" || record.labTitle.length < 1 || record.labTitle.length > 300 ||
        !["Started", "Completed"].includes(record.status) ||
        !Number.isSafeInteger(record.xpEarned) || record.xpEarned < 0 ||
        !Number.isSafeInteger(record.attempts) || record.attempts < 0) throw new RequestError();
    const next = {
      labId: record.labId, labTitle: record.labTitle, status: record.status,
      xpEarned: record.xpEarned, attempts: record.attempts,
      firstStartedAt: timestamp(record.firstStartedAt), completedAt: timestamp(record.completedAt),
    };
    if (next.status === "Started" && next.completedAt) throw new RequestError();
    const prior = byLab.get(next.labId);
    byLab.set(next.labId, prior ? {
      ...next, xpEarned: Math.max(prior.xpEarned, next.xpEarned), attempts: Math.max(prior.attempts, next.attempts),
      status: prior.status === "Completed" ? "Completed" : next.status,
      firstStartedAt: earliest(prior.firstStartedAt, next.firstStartedAt),
      completedAt: latest(prior.completedAt, next.completedAt),
    } : next);
  }
  return [...byLab.values()];
}

export function mergeFields(studentId, unitId, incoming, existing, now, sourceKey) {
  if (!/^[a-f0-9]{32}$/.test(sourceKey ?? "")) throw new RequestError();
  const fields = existing?.fields ?? {};
  const key = `${studentId}|${incoming.labId}|${sourceKey}`;
  if (fields["Record Key"] !== undefined && fields["Record Key"] !== key) throw new Error("Source key mismatch");
  if (existing && !["Started", "Completed"].includes(fields.Status)) throw new Error("Invalid stored status");
  return {
    "Record Key": key, Student: [studentId], Unit: [unitId],
    "Lab ID": incoming.labId, "Lab Title": incoming.labTitle,
    Status: fields.Status === "Completed" ? "Completed" : incoming.status,
    "XP Earned": Math.max(storedNumber(fields["XP Earned"]), incoming.xpEarned),
    Attempts: Math.max(storedNumber(fields.Attempts), incoming.attempts),
    "First Started": earliest(timestamp(fields["First Started"], true), incoming.firstStartedAt),
    "Completed At": latest(fields.Status === "Completed" ? timestamp(fields["Completed At"], true) : null,
      incoming.status === "Completed" ? incoming.completedAt : null),
    "Last Updated": latest(timestamp(fields["Last Updated"], true), timestamp(now)),
  };
}

export function progressResponse(records) {
  const labs = new Map();
  for (const { id, fields } of records) {
    if (typeof fields["Lab ID"] !== "string" || !["Started", "Completed"].includes(fields.Status)) throw new Error("Invalid stored progress");
    const next = {
      recordId: id, recordIds: [id], labId: fields["Lab ID"], labTitle: fields["Lab Title"], status: fields.Status,
      xpEarned: storedNumber(fields["XP Earned"]), attempts: storedNumber(fields.Attempts),
      firstStartedAt: timestamp(fields["First Started"], true),
      completedAt: fields.Status === "Completed" ? timestamp(fields["Completed At"], true) : null,
      lastUpdated: timestamp(fields["Last Updated"], true),
    };
    const old = labs.get(next.labId);
    if (!old) { labs.set(next.labId, next); continue; }
    const recordIds = [...old.recordIds, id].sort();
    labs.set(next.labId, {
      ...old, recordId: recordIds[0], recordIds,
      labTitle: (next.lastUpdated ?? "") > (old.lastUpdated ?? "") ? next.labTitle : old.labTitle,
      status: old.status === "Completed" || next.status === "Completed" ? "Completed" : "Started",
      xpEarned: Math.max(old.xpEarned, next.xpEarned), attempts: Math.max(old.attempts, next.attempts),
      firstStartedAt: earliest(old.firstStartedAt, next.firstStartedAt),
      completedAt: latest(old.completedAt, next.completedAt), lastUpdated: latest(old.lastUpdated, next.lastUpdated),
    });
  }
  const responseRecords = [...labs.values()].sort((a, b) => a.labId.localeCompare(b.labId));
  const totals = responseRecords.reduce((result, lab) => ({
    labsCompleted: result.labsCompleted + (lab.status === "Completed" ? 1 : 0), totalXp: result.totalXp + lab.xpEarned,
  }), { labsCompleted: 0, totalXp: 0 });
  if (!Number.isSafeInteger(totals.totalXp)) throw new Error("Invalid stored total");
  return { records: responseRecords, totals };
}

function containsIntended(actual, intended) {
  if (!actual) return false;
  const fields = actual.fields;
  return ["Started", "Completed"].includes(fields.Status) && fields["Record Key"] === intended["Record Key"] &&
    fields.Student?.length === 1 && fields.Student[0] === intended.Student[0] &&
    fields.Unit?.length === 1 && fields.Unit[0] === intended.Unit[0] &&
    fields["Lab ID"] === intended["Lab ID"] && fields["Lab Title"] === intended["Lab Title"] &&
    storedNumber(fields["XP Earned"]) >= intended["XP Earned"] && storedNumber(fields.Attempts) >= intended.Attempts &&
    (intended.Status !== "Completed" || fields.Status === "Completed") &&
    (!intended["First Started"] || (timestamp(fields["First Started"], true) ?? "~") <= intended["First Started"]) &&
    (!intended["Completed At"] || (timestamp(fields["Completed At"], true) ?? "") >= intended["Completed At"]) &&
    (timestamp(fields["Last Updated"], true) ?? "") >= intended["Last Updated"];
}

async function sourceRow(studentId, unitId, key) {
  const records = await listRecords(TABLES.progress, { filterByFormula: `{Record Key}=${formulaString(key)}` });
  const scoped = scopedRows(records, studentId, unitId);
  if (scoped.length !== records.length || scoped.length > 1) throw new Error("Source links require review");
  return scoped[0];
}

async function writeSource(studentId, unitId, incoming, sourceKey, now) {
  const key = `${studentId}|${incoming.labId}|${sourceKey}`;
  let required = incoming;
  for (let attempt = 0; attempt < MAX_VERIFICATION_ATTEMPTS; attempt += 1) {
    const prior = await sourceRow(studentId, unitId, key);
    const intended = mergeFields(studentId, unitId, required, prior, now, sourceKey);
    required = { ...required, status: intended.Status, xpEarned: intended["XP Earned"], attempts: intended.Attempts,
      firstStartedAt: intended["First Started"], completedAt: intended["Completed At"] };
    try {
      await upsertRecords(TABLES.progress, [{ ...(prior ? { id: prior.id } : {}), fields: intended }]);
    } catch (error) {
      if (!(error instanceof AirtableError)) throw error;
      // Reconcile an uncertain mutation by exact source key before retrying.
    }
    if (containsIntended(await sourceRow(studentId, unitId, key), intended)) return;
  }
  throw new RequestError(503);
}

function sameTotals(fields, totals) {
  return storedNumber(fields["Labs Completed"]) === totals.labsCompleted && storedNumber(fields["Total XP"]) === totals.totalXp;
}

export async function reconcileSummary(studentId, unitId, now = new Date().toISOString()) {
  const selectedUnit = unitId ?? await pilotUnit();
  let result;
  for (let attempt = 0; attempt < MAX_VERIFICATION_ATTEMPTS; attempt += 1) {
    result = progressResponse(await studentProgress(studentId, selectedUnit));
    await updateRecords(TABLES.students, [{ id: studentId, fields: {
      "Labs Completed": result.totals.labsCompleted, "Total XP": result.totals.totalXp, "Last Active": now,
    } }]);
    const fresh = progressResponse(await studentProgress(studentId, selectedUnit));
    const stored = await getRecord(TABLES.students, studentId);
    if (sameTotals(stored.fields, fresh.totals)) return { result: fresh, verified: true };
    result = fresh;
  }
  return { result, verified: false };
}

export async function readProgress(studentId) {
  const unitId = await pilotUnit();
  // The handler sends these logical totals before any best-effort summary
  // repair, so a cached-summary failure or delay cannot block a valid GET.
  return progressResponse(await studentProgress(studentId, unitId));
}

export async function saveProgress(studentId, incoming, sourceKey, now = new Date().toISOString()) {
  if (!/^[a-f0-9]{32}$/.test(sourceKey ?? "")) throw new RequestError();
  const unitId = await pilotUnit();
  for (const record of incoming) await writeSource(studentId, unitId, record, sourceKey, now);
  const reconciliation = await reconcileSummary(studentId, unitId, now);
  if (!reconciliation.verified) throw new RequestError(503);
  return reconciliation.result;
}
