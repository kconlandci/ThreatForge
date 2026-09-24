/**
 * Tests only: an in-memory stand-in for the Airtable Web API, used as `fetch`. It understands just
 * what lib/server/airtable.ts sends (field-ID keys, returnFieldsByFieldId, the player lookup and
 * retention formulas, batch create/delete, PATCH by record id) and records every request.
 */
import { PLAYER_FIELDS, PLAYERS_TABLE, RESULT_FIELDS, RESULTS_TABLE } from "./airtable";

export type SentRequest = {
  method: string;
  url: URL;
  table: string;
  recordId?: string;
  body?: unknown;
  headers: Record<string, string>;
  signal?: AbortSignal | null;
};

type Rec = { id: string; createdTime: string; fields: Record<string, unknown> };
type Failure = { status: number; headers?: Record<string, string>; body?: unknown };

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;

export class FakeAirtable {
  readonly tables = new Map<string, Map<string, Rec>>([
    [PLAYERS_TABLE, new Map()],
    [RESULTS_TABLE, new Map()],
  ]);
  readonly sent: SentRequest[] = [];
  private failures: Failure[] = [];
  private seq = 0;
  /** "Now" for the retention formula. */
  now = Date.parse("2026-09-24T18:30:00.000Z");

  constructor(readonly baseId: string) {}

  /** The next requests answer with these errors, in order (before touching any data). */
  failNext(...failures: Failure[]) {
    this.failures.push(...failures);
  }

  players(): Rec[] {
    return [...this.tables.get(PLAYERS_TABLE)!.values()];
  }

  results(): Rec[] {
    return [...this.tables.get(RESULTS_TABLE)!.values()];
  }

  newId(): string {
    this.seq += 1;
    return `rec${String(this.seq).padStart(14, "0")}`;
  }

  /** Seed a record directly (no request recorded). */
  seed(table: string, fields: Record<string, unknown>, id = this.newId(), createdTime = new Date(this.now).toISOString()): string {
    this.tables.get(table)!.set(id, { id, createdTime, fields: { ...fields } });
    this.relink();
    return id;
  }

  fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input));
    const method = (init.method ?? "GET").toUpperCase();
    const headers = Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>));
    const parts = url.pathname.split("/").filter(Boolean); // v0, base, table, record?
    const req: SentRequest = {
      method,
      url,
      table: parts[2] ?? "",
      recordId: parts[3],
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      headers,
      signal: init.signal,
    };
    this.sent.push(req);

    const fail = this.failures.shift();
    if (fail) return json(fail.body ?? { error: { type: "FAKE_FAILURE", message: "nope" } }, fail.status, fail.headers);

    if (url.origin !== "https://api.airtable.com" || parts[0] !== "v0") return json({ error: "NOT_FOUND" }, 404);
    if (parts[1] !== this.baseId) return json({ error: { type: "NOT_AUTHORIZED" } }, 403);
    if (!headers.Authorization?.startsWith("Bearer ")) return json({ error: "AUTHENTICATION_REQUIRED" }, 401);
    const table = this.tables.get(req.table);
    if (!table) return json({ error: "NOT_FOUND" }, 404);

    if (method === "GET" && !req.recordId) return this.list(table, url);
    if (method === "POST" && !req.recordId) return this.create(table, req.body);
    if (method === "PATCH" && req.recordId) return this.patch(table, req.recordId, req.body);
    if (method === "DELETE" && !req.recordId) return this.remove(table, url.searchParams.getAll("records[]"));
    return json({ error: "NOT_FOUND" }, 404);
  };

  private list(table: Map<string, Rec>, url: URL): Response {
    if (url.searchParams.get("returnFieldsByFieldId") !== "true") return json({ error: "TEST_EXPECTS_FIELD_IDS" }, 422);
    const formula = url.searchParams.get("filterByFormula") ?? "";
    const fields = url.searchParams.getAll("fields[]");
    const pageSize = Number(url.searchParams.get("pageSize") ?? 100);
    const records = [...table.values()].filter((r) => this.matches(r, formula)).slice(0, pageSize);
    return json({
      records: records.map((r) => ({
        id: r.id,
        createdTime: r.createdTime,
        fields: fields.length ? Object.fromEntries(Object.entries(r.fields).filter(([k]) => fields.includes(k))) : r.fields,
      })),
    });
  }

  private matches(rec: Rec, formula: string): boolean {
    if (!formula) return true;
    const lookup = /^\{(fld[A-Za-z0-9]{14})\}="((?:[^"\\]|\\.)*)"$/.exec(formula);
    if (lookup) return rec.fields[lookup[1]] === lookup[2].replace(/\\(.)/g, "$1");
    // RECORD_ID()="rec…", or OR() of those.
    const byId = /^(?:OR\()?(RECORD_ID\(\)="rec[A-Za-z0-9]{14}"(?:, RECORD_ID\(\)="rec[A-Za-z0-9]{14}")*)\)?$/.exec(formula);
    if (byId) return [...byId[1].matchAll(/"(rec[A-Za-z0-9]{14})"/g)].some((m) => m[1] === rec.id);
    const unlinked = /^AND\(NOT\(\{(fld\w+)\}\), IS_BEFORE\(CREATED_TIME\(\), DATEADD\(NOW\(\), -(\d+), 'days'\)\)\)$/.exec(formula);
    if (unlinked) {
      const link = rec.fields[unlinked[1]] as unknown[] | undefined;
      return !link?.length && Date.parse(rec.createdTime) < this.now - Number(unlinked[2]) * 24 * 60 * 60 * 1000;
    }
    const purge = /IS_BEFORE\(IF\(\{(fld\w+)\}, \{fld\w+\}, \{(fld\w+)\}\), DATEADD\(NOW\(\), -(\d+), 'months'\)\)/.exec(formula);
    if (purge) {
      const when = (rec.fields[purge[1]] ?? rec.fields[purge[2]]) as string | undefined;
      if (!when) return false;
      return Date.parse(when) < this.now - Number(purge[3]) * MONTH_MS;
    }
    throw new Error(`FakeAirtable does not understand formula: ${formula}`);
  }

  private create(table: Map<string, Rec>, body: unknown): Response {
    const records = (body as { records?: { fields: Record<string, unknown> }[] }).records ?? [];
    if (records.length < 1 || records.length > 10) return json({ error: { type: "INVALID_RECORDS" } }, 422);
    for (const r of records) {
      for (const value of [r.fields[PLAYER_FIELDS.bestStars], r.fields[RESULT_FIELDS.stars]]) {
        // Like the real API: a rating cell rejects 0.
        if (value === 0) return json({ error: { type: "INVALID_VALUE_FOR_COLUMN" } }, 422);
      }
    }
    const created = records.map((r) => {
      const id = this.newId();
      const rec = { id, createdTime: new Date(this.now).toISOString(), fields: { ...r.fields } };
      table.set(id, rec);
      return rec;
    });
    this.relink();
    return json({ records: created });
  }

  private patch(table: Map<string, Rec>, id: string, body: unknown): Response {
    const rec = table.get(id);
    if (!rec) return json({ error: "NOT_FOUND" }, 404);
    const fields = (body as { fields?: Record<string, unknown> }).fields ?? {};
    if (fields[PLAYER_FIELDS.bestStars] === 0) return json({ error: { type: "INVALID_VALUE_FOR_COLUMN" } }, 422);
    for (const [k, v] of Object.entries(fields)) {
      if (v === null) delete rec.fields[k];
      else rec.fields[k] = v;
    }
    return json({ id, createdTime: rec.createdTime, fields: rec.fields });
  }

  private remove(table: Map<string, Rec>, ids: string[]): Response {
    if (ids.length < 1 || ids.length > 10) return json({ error: { type: "INVALID_RECORDS" } }, 422);
    for (const id of ids) if (!table.has(id)) return json({ error: "NOT_FOUND" }, 404);
    for (const id of ids) table.delete(id);
    this.relink();
    return json({ records: ids.map((id) => ({ id, deleted: true })) });
  }

  /** Keep the Players -> Shift Results inverse link in step, like Airtable does. */
  private relink() {
    const results = this.tables.get(RESULTS_TABLE)!;
    const players = this.tables.get(PLAYERS_TABLE)!;
    // A deleted player drops out of its results' link cells.
    for (const r of results.values()) {
      const link = r.fields[RESULT_FIELDS.player] as string[] | undefined;
      if (!link) continue;
      const kept = link.filter((id) => players.has(id));
      if (kept.length) r.fields[RESULT_FIELDS.player] = kept;
      else delete r.fields[RESULT_FIELDS.player];
    }
    for (const player of this.tables.get(PLAYERS_TABLE)!.values()) {
      const linked = [...results.values()]
        .filter((r) => ((r.fields[RESULT_FIELDS.player] as string[] | undefined) ?? []).includes(player.id))
        .map((r) => r.id);
      if (linked.length) player.fields[PLAYER_FIELDS.results] = linked;
      else delete player.fields[PLAYER_FIELDS.results];
    }
  }
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}
