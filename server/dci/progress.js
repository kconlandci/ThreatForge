import { TABLES } from "./config.js";
import { getRecord, listRecords, updateRecords, upsertRecords, formulaString, AirtableError } from "./airtable.js";
import { RequestError } from "./http.js";

const studentTails = new Map();

// Prevent overlapping reads/merges/writes for one student in this Node process.
// Airtable has no compare-and-swap API. Multiple deployed instances would need
// shared coordination for a strict concurrent max guarantee (deployment later).
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
  try {
    student = await getRecord(TABLES.students, studentId);
  } catch (error) {
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

export async function studentProgress(studentId) {
  // Linked field arrays in the API contain record IDs; Airtable formula ARRAYJOIN
  // on a linked field contains names, so do not filter that field by record ID.
  const student = await getRecord(TABLES.students, studentId);
  const ids = student.fields?.["Lab Progress"] ?? [];
  if (!Array.isArray(ids) || ids.some((id) => !/^rec[A-Za-z0-9]{14}$/.test(id))) {
    throw new Error("Invalid progress links");
  }
  const records = [];
  for (let i = 0; i < ids.length; i += 50) {
    const filterByFormula = `OR(${ids.slice(i, i + 50).map((id) => `RECORD_ID()=${formulaString(id)}`).join(",")})`;
    records.push(...await listRecords(TABLES.progress, { filterByFormula }));
  }
  if (records.length !== ids.length || records.some((record) => !record.fields?.Student?.includes(studentId))) {
    throw new Error("Progress links require review");
  }
  return records;
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

function earliest(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

export function validateRecords(body) {
  if (!Array.isArray(body.records) || body.records.length > 1000) throw new RequestError();
  const byLab = new Map();
  for (const record of body.records) {
    if (!record || typeof record !== "object" || Array.isArray(record) ||
        typeof record.labId !== "string" || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(record.labId) ||
        typeof record.labTitle !== "string" || record.labTitle.length < 1 || record.labTitle.length > 300 ||
        !["Started", "Completed"].includes(record.status) ||
        !Number.isSafeInteger(record.xpEarned) || record.xpEarned < 0 ||
        !Number.isSafeInteger(record.attempts) || record.attempts < 0) {
      throw new RequestError();
    }
    const next = {
      labId: record.labId, labTitle: record.labTitle, status: record.status,
      xpEarned: record.xpEarned, attempts: record.attempts,
      firstStartedAt: timestamp(record.firstStartedAt), completedAt: timestamp(record.completedAt),
    };
    if (next.status === "Started" && next.completedAt) throw new RequestError();
    const prior = byLab.get(next.labId);
    byLab.set(next.labId, prior ? {
      ...next, xpEarned: Math.max(prior.xpEarned, next.xpEarned),
      attempts: Math.max(prior.attempts, next.attempts),
      status: prior.status === "Completed" ? "Completed" : next.status,
      firstStartedAt: earliest(prior.firstStartedAt, next.firstStartedAt),
      completedAt: earliest(prior.completedAt, next.completedAt),
    } : next);
  }
  return [...byLab.values()];
}

export function mergeFields(studentId, unitId, incoming, existing, now) {
  const fields = existing?.fields ?? {};
  if (fields.Status !== undefined && !["Started", "Completed"].includes(fields.Status)) {
    throw new Error("Invalid stored status");
  }
  return {
    "Record Key": `${studentId}|${incoming.labId}`,
    Student: [studentId], Unit: [unitId],
    "Lab ID": incoming.labId, "Lab Title": incoming.labTitle,
    Status: fields.Status === "Completed" ? "Completed" : incoming.status,
    "XP Earned": Math.max(storedNumber(fields["XP Earned"]), incoming.xpEarned),
    Attempts: Math.max(storedNumber(fields.Attempts), incoming.attempts),
    "First Started": earliest(timestamp(fields["First Started"], true), incoming.firstStartedAt),
    "Completed At": earliest(timestamp(fields["Completed At"], true), incoming.completedAt),
    "Last Updated": now,
  };
}

export function progressResponse(records) {
  let labsCompleted = 0;
  let totalXp = 0;
  const responseRecords = records.map(({ id, fields }) => {
    if (!["Started", "Completed"].includes(fields.Status)) throw new Error("Invalid stored status");
    if (fields.Status === "Completed") labsCompleted += 1;
    totalXp += storedNumber(fields["XP Earned"]);
    if (!Number.isSafeInteger(totalXp)) throw new Error("Invalid stored total");
    return {
      recordId: id, labId: fields["Lab ID"], labTitle: fields["Lab Title"], status: fields.Status,
      xpEarned: storedNumber(fields["XP Earned"]), attempts: storedNumber(fields.Attempts),
      firstStartedAt: timestamp(fields["First Started"], true), completedAt: timestamp(fields["Completed At"], true),
    };
  });
  return { records: responseRecords, totals: { labsCompleted, totalXp } };
}

export async function saveProgress(studentId, incoming, now = new Date().toISOString()) {
  const unitId = await pilotUnit();
  const existing = await studentProgress(studentId);
  const byKey = new Map();
  for (const record of existing) {
    const key = record.fields["Record Key"];
    if (byKey.has(key)) throw new Error("Duplicate progress requires review");
    byKey.set(key, record);
  }
  const writes = incoming.map((record) => {
    const prior = byKey.get(`${studentId}|${record.labId}`);
    // Explicit id on an existing row plus performUpsert's merge key protects
    // retries from creating a second row for an already-known record.
    return {
      ...(prior ? { id: prior.id } : {}),
      fields: mergeFields(studentId, unitId, record, prior, now),
    };
  });
  await upsertRecords(TABLES.progress, writes);
  const result = progressResponse(await studentProgress(studentId));
  await updateRecords(TABLES.students, [{ id: studentId, fields: {
    "Labs Completed": result.totals.labsCompleted, "Total XP": result.totals.totalXp, "Last Active": now,
  } }]);
  return result;
}
