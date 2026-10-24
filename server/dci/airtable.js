import { AIRTABLE_BASE_ID, TABLES } from "./config.js";

const ALLOWED_TABLES = new Set(Object.values(TABLES));
const MIN_REQUEST_INTERVAL_MS = 210; // Stay below Airtable's five requests/sec/base.
let requestTail = Promise.resolve();
let lastRequestAt = 0;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class AirtableError extends Error {
  constructor(status = 503) {
    super("Airtable request failed");
    this.status = status;
  }
}

export function formulaString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function queueRequest(operation) {
  const next = requestTail.then(operation, operation);
  requestTail = next.catch(() => {});
  return next;
}

// Every Airtable call, including local seeding and evidence reads, uses this
// helper. Never log request headers, request bodies, responses, or credentials.
export async function airtableRequest(tableId, { method = "GET", recordId, query, body } = {}) {
  if (!ALLOWED_TABLES.has(tableId) || (recordId && !/^rec[A-Za-z0-9]{14}$/.test(recordId))) {
    throw new AirtableError();
  }
  const token = process.env.AIRTABLE_PAT;
  if (!token) throw new AirtableError();
  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}${recordId ? `/${recordId}` : ""}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return queueRequest(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await delay(Math.max(0, lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now()));
      lastRequestAt = Date.now();
      let response;
      try {
        response = await fetch(url, {
          method,
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
          redirect: "error",
        });
      } catch {
        // An interrupted mutation may already have happened. Do not blindly retry.
        throw new AirtableError();
      }
      if (response.status === 429 && attempt < 2) {
        // A rate-limited request was rejected, so retrying it cannot duplicate it.
        await response.body?.cancel();
        await delay(1000 * (attempt + 1));
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new AirtableError(response.status);
      }
      try {
        return await response.json();
      } catch {
        throw new AirtableError();
      }
    }
    throw new AirtableError();
  });
}

export async function listRecords(tableId, query = {}) {
  const records = [];
  let offset;
  do {
    const page = await airtableRequest(tableId, { query: { ...query, pageSize: 100, offset } });
    if (!Array.isArray(page.records)) throw new AirtableError();
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
}

export function getRecord(tableId, recordId) {
  return airtableRequest(tableId, { recordId });
}

export async function updateRecords(tableId, records) {
  const result = [];
  for (let i = 0; i < records.length; i += 10) {
    const page = await airtableRequest(tableId, { method: "PATCH", body: { records: records.slice(i, i + 10) } });
    result.push(...page.records);
  }
  return result;
}

export async function upsertRecords(tableId, records, key = "Record Key") {
  const result = [];
  for (let i = 0; i < records.length; i += 10) {
    const page = await airtableRequest(tableId, {
      method: "PATCH",
      body: { performUpsert: { fieldsToMergeOn: [key] }, records: records.slice(i, i + 10) },
    });
    result.push(...page.records);
  }
  return result;
}

export async function createRecords(tableId, records) {
  const result = [];
  for (let i = 0; i < records.length; i += 10) {
    const page = await airtableRequest(tableId, { method: "POST", body: { records: records.slice(i, i + 10) } });
    result.push(...page.records);
  }
  return result;
}
