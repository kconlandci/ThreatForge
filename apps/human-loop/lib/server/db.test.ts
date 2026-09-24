/**
 * lib/server/db.ts through the real Neon driver, with its HTTP transport replaced by a fake
 * (neonConfig.fetchFunction). Checks what goes over the wire (parameterized SQL, timeouts), how
 * results are parsed, that failures degrade to "not stored", and that logs carry no personal data.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { neonConfig } from "@neondatabase/serverless";

type Sent = { url: string; body: { query?: string; params?: unknown[]; queries?: { query: string; params: unknown[] }[] }; init: RequestInit };
type Reply = { status?: number; json: unknown };

const DB_URL = "postgresql://hl_user:SuperSecretPw@ep-test-123.us-east-2.aws.neon.tech/neondb?sslmode=require";
const PID = "0b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c2d";
const lead = { name: "Dana Ortiz", email: "dana.ortiz@example.com", marketingOptIn: false };
const save = {
  version: 2 as const,
  playerId: "local-abc",
  profile: { name: "Dana Ortiz", email: "dana.ortiz@example.com", guest: false, consentAt: null, marketingOptIn: false },
  pathways: { "help-desk": { introSeen: true, hub: { x: 2, y: 5 }, battle: null, best: null, attempts: 1, wins: 1, history: [] } },
  settings: { reducedMotion: false },
  updatedAt: "2026-09-24T18:30:00.000Z",
};

let sent: Sent[] = [];
let replies: Reply[] = [];
let logs: string[] = [];

const EMPTY: Reply = { json: { fields: [], rows: [] } };
const SCHEMA_OK: Reply = { json: { results: [{ fields: [], rows: [] }, { fields: [], rows: [] }] } };

async function fakeFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  sent.push({ url: String(url), body: JSON.parse(String(init?.body)), init: init ?? {} });
  const reply = replies.shift() ?? EMPTY;
  return new Response(JSON.stringify(reply.json), {
    status: reply.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

async function freshDb() {
  vi.resetModules();
  return import("./db");
}

beforeEach(() => {
  sent = [];
  replies = [];
  logs = [];
  neonConfig.fetchFunction = fakeFetch;
  vi.stubEnv("DATABASE_URL", DB_URL);
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});

afterEach(() => {
  neonConfig.fetchFunction = undefined;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("no-op mode", () => {
  it("does nothing and makes no requests without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("POSTGRES_URL", "");
    const db = await freshDb();
    expect(db.isDatabaseConfigured()).toBe(false);
    expect(await db.createPlayer(PID, lead)).toBe(false);
    expect(await db.loadCloudSave(PID)).toEqual({ cloud: false, save: null });
    expect(await db.storeCloudSave(PID, { ...save, profile: null })).toBe(false);
    expect(await db.deletePlayer(PID)).toBe(true);
    await db.maybePurgeStalePlayers();
    expect(sent).toHaveLength(0);
  });

  it("falls back to POSTGRES_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("POSTGRES_URL", DB_URL);
    const db = await freshDb();
    expect(db.databaseUrl()).toBe(DB_URL);
  });
});

describe("with a database", () => {
  it("creates the schema once (in one transaction), then inserts with parameters only", async () => {
    const db = await freshDb();
    replies = [SCHEMA_OK, EMPTY, EMPTY];
    expect(await db.createPlayer(PID, lead)).toBe(true);
    expect(await db.createPlayer("1b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c2d", lead)).toBe(true);

    expect(sent).toHaveLength(3);
    const schema = sent[0].body.queries ?? [];
    expect(schema).toHaveLength(2);
    expect(schema[0].query).toMatch(/CREATE TABLE IF NOT EXISTS players/);
    expect(schema[1].query).toMatch(/CREATE TABLE IF NOT EXISTS saves[\s\S]*ON DELETE CASCADE/);

    const insert = sent[1].body;
    expect(insert.query).toMatch(/^INSERT INTO players/);
    expect(insert.params).toEqual([PID, "Dana Ortiz", "dana.ortiz@example.com", "false"]);
    // Values travel as parameters, never inside the SQL text.
    for (const s of sent) {
      const text = JSON.stringify(s.body.query ?? s.body.queries?.map((q) => q.query));
      expect(text).not.toContain("Dana");
      expect(text).not.toContain("example.com");
    }
    // Every round trip has a timeout.
    for (const s of sent) expect(s.init.signal).toBeInstanceOf(AbortSignal);
  });

  it("does not cache a failed schema setup; the next request retries", async () => {
    const db = await freshDb();
    replies = [{ status: 500, json: { message: "boom" } }, SCHEMA_OK, EMPTY];
    expect(await db.createPlayer(PID, lead)).toBe(false);
    expect(await db.createPlayer(PID, lead)).toBe(true);
    expect(sent.map((s) => (s.body.queries ? "schema" : "query"))).toEqual(["schema", "schema", "query"]);
  });

  it("treats a concurrent CREATE TABLE race as success", async () => {
    const db = await freshDb();
    replies = [{ status: 400, json: { message: "duplicate key value violates unique constraint", code: "23505" } }, EMPTY];
    expect(await db.createPlayer(PID, lead)).toBe(true);
  });

  it("never logs personal data, SQL values or the connection string on errors", async () => {
    const db = await freshDb();
    replies = [
      SCHEMA_OK,
      {
        status: 400,
        json: {
          message: 'value "Dana Ortiz" / "dana.ortiz@example.com" is bad',
          code: "22001",
          detail: "Key (email)=(dana.ortiz@example.com)",
        },
      },
    ];
    expect(await db.createPlayer(PID, lead)).toBe(false);
    const text = logs.join("\n");
    expect(text).toContain("SQLSTATE 22001");
    for (const secret of ["Dana", "dana.ortiz@example.com", "SuperSecretPw", "hl_user", PID]) expect(text).not.toContain(secret);
  });

  it("survives a malformed connection string without logging it", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://root:SuperSecretPw@db/x");
    const db = await freshDb();
    expect(await db.createPlayer(PID, lead)).toBe(false);
    expect(await db.loadCloudSave(PID)).toEqual({ cloud: false, save: null });
    expect(sent).toHaveLength(0);
    expect(logs.join("\n")).not.toContain("SuperSecretPw");
  });

  it("reports network failures as not stored", async () => {
    const db = await freshDb();
    neonConfig.fetchFunction = async () => {
      throw new TypeError("fetch failed");
    };
    expect(await db.createPlayer(PID, lead)).toBe(false);
    expect(await db.storeCloudSave(PID, { ...save, profile: null })).toBe(false);
    expect(await db.loadCloudSave(PID)).toEqual({ cloud: false, save: null });
    expect(await db.deletePlayer(PID)).toBe(false);
  });

  it("stores saves without the profile, under the cookie's player id", async () => {
    const db = await freshDb();
    replies = [SCHEMA_OK, { json: { fields: [{ name: "player_id", dataTypeID: 2950 }], rows: [[PID]] } }, EMPTY];
    expect(await db.storeCloudSave(PID, save)).toBe(true);
    const [id, json] = sent[1].body.params ?? [];
    expect(id).toBe(PID);
    const stored = JSON.parse(String(json)) as typeof save;
    expect(stored.playerId).toBe(PID);
    expect(stored.profile).toBeNull();
    expect(String(json)).not.toContain("dana.ortiz@example.com");
    expect(sent[1].body.query).toMatch(/WHERE p\.id = \$1::uuid/);
    // No player row: nothing returned, not stored.
    expect(await db.storeCloudSave(PID, save)).toBe(false);
  });

  it("loads a save and rebuilds the profile from the players row", async () => {
    const db = await freshDb();
    const data = { ...save, playerId: PID, profile: null };
    replies = [
      SCHEMA_OK,
      {
        json: {
          fields: [
            { name: "name", dataTypeID: 25 },
            { name: "email", dataTypeID: 25 },
            { name: "marketing_opt_in", dataTypeID: 16 },
            { name: "consent_at", dataTypeID: 1184 },
            { name: "data", dataTypeID: 3802 },
          ],
          rows: [["Dana Ortiz", "dana.ortiz@example.com", "t", "2026-09-20 14:05:06.789+00", JSON.stringify(data)]],
        },
      },
    ];
    const result = await db.loadCloudSave(PID);
    expect(result.cloud).toBe(true);
    expect(result.save).toEqual({
      ...data,
      playerId: PID,
      profile: {
        name: "Dana Ortiz",
        email: "dana.ortiz@example.com",
        guest: false,
        consentAt: "2026-09-20T14:05:06.789Z",
        marketingOptIn: true,
      },
    });
  });

  it("GET semantics: no player -> cloud:false; player without save -> cloud:true, save:null", async () => {
    const db = await freshDb();
    const fields = [
      { name: "name", dataTypeID: 25 },
      { name: "email", dataTypeID: 25 },
      { name: "marketing_opt_in", dataTypeID: 16 },
      { name: "consent_at", dataTypeID: 1184 },
      { name: "data", dataTypeID: 3802 },
    ];
    replies = [
      SCHEMA_OK,
      { json: { fields, rows: [] } },
      { json: { fields, rows: [["A", "a@b.co", "f", "2026-09-20 14:05:06+00", null]] } },
      { json: { fields, rows: [["A", "a@b.co", "f", "2026-09-20 14:05:06+00", '{"version":1}']] } },
    ];
    expect(await db.loadCloudSave(PID)).toEqual({ cloud: false, save: null });
    // No save row yet (or an unreadable one): the profile still comes back, so a wiped browser can restore it.
    const profile = { name: "A", email: "a@b.co", guest: false, consentAt: "2026-09-20T14:05:06.000Z", marketingOptIn: false };
    expect(await db.loadCloudSave(PID)).toEqual({ cloud: true, save: null, profile });
    expect(await db.loadCloudSave(PID)).toEqual({ cloud: true, save: null, profile });
  });

  it("deletes the player row (the save cascades)", async () => {
    const db = await freshDb();
    replies = [SCHEMA_OK, EMPTY];
    expect(await db.deletePlayer(PID)).toBe(true);
    expect(sent[1].body).toMatchObject({ query: expect.stringMatching(/^DELETE FROM players WHERE id = \$1::uuid/), params: [PID] });
  });

  it("purges inactive players at most once a day per instance", async () => {
    const db = await freshDb();
    replies = [SCHEMA_OK, { json: { fields: [{ name: "n", dataTypeID: 23 }], rows: [["2"]] } }, EMPTY];
    const now = Date.now();
    await db.maybePurgeStalePlayers(now);
    await db.maybePurgeStalePlayers(now + 60_000);
    expect(sent).toHaveLength(2);
    expect(sent[1].body.params).toEqual(["24"]);
    expect(logs.join("\n")).toContain("deleted 2 inactive player(s)");
    await db.maybePurgeStalePlayers(now + 25 * 60 * 60 * 1000);
    expect(sent).toHaveLength(3);
  });
});
