/**
 * End-to-end against a REAL local Postgres: route handlers -> lib/server/db -> Neon driver ->
 * (fake HTTP transport that runs each query through `psql`) -> Postgres.
 *
 * Skipped unless HL_TEST_PG_URL is set, e.g.
 *   HL_TEST_PG_URL=postgresql://hl:hl@localhost:5432/hl_test npx vitest run lib/server
 * The database must be disposable: this test drops and recreates the players/saves tables.
 *
 * The transport mimics Neon's HTTP API (POST {query, params} or {queries}; replies with
 * {fields, rows} in raw-text array mode), so the driver's own parameter encoding and result
 * parsing are exercised too.
 */
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { neonConfig } from "@neondatabase/serverless";

const PG_URL = process.env.HL_TEST_PG_URL ?? "";

const US = "\x1f"; // field separator
const RS = "\x1e"; // record separator
const NUL = "\x18"; // NULL marker

const TYPE_OIDS: Record<string, number> = {
  boolean: 16,
  bigint: 20,
  integer: 23,
  text: 25,
  json: 114,
  "timestamp with time zone": 1184,
  uuid: 2950,
  jsonb: 3802,
};

function psql(url: string, script: string): string {
  return execFileSync(
    "psql",
    [url, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-F", US, "-R", RS, "-P", `null=${NUL}`, "-f", "-"],
    { input: script, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  const text = String(value);
  let tag = "hl";
  while (text.includes(`$${tag}$`)) tag += "x";
  return `$${tag}$${text}$${tag}$`;
}

function records(section: string): string[] {
  return section
    .split(RS)
    .map((r) => r.replace(/\n$/, ""))
    .filter((r) => r.length > 0);
}

type Query = { query: string; params: unknown[] };

/** Run queries in one psql session (one transaction for batches) and answer like Neon's HTTP API. */
function runQueries(url: string, queries: Query[], transaction: boolean) {
  let script = transaction ? "BEGIN;\n" : "";
  queries.forEach((q, i) => {
    if (/^\s*(CREATE|ALTER|DROP)\b/i.test(q.query)) {
      script += `\\echo __HL_DESC_${i}__\n\\echo __HL_ROWS_${i}__\n${q.query};\n`;
      return;
    }
    const args = q.params.length ? `(${q.params.map(literal).join(", ")})` : "";
    script += `PREPARE hl_q${i} AS ${q.query};\n`;
    script += `\\echo __HL_DESC_${i}__\nEXECUTE hl_q${i}${args} \\gdesc\n`;
    script += `\\echo __HL_ROWS_${i}__\nEXECUTE hl_q${i}${args};\nDEALLOCATE hl_q${i};\n`;
  });
  if (transaction) script += "COMMIT;\n";

  const out = psql(url, script);
  return queries.map((_, i) => {
    const desc = out.split(`__HL_DESC_${i}__\n`)[1]?.split(`__HL_ROWS_${i}__\n`)[0] ?? "";
    const rowsText = out.split(`__HL_ROWS_${i}__\n`)[1]?.split(/__HL_DESC_\d+__\n/)[0] ?? "";
    const fields = records(desc)
      .filter((r) => r.includes(US))
      .map((r) => {
        const [name, type] = r.split(US);
        return { name, dataTypeID: TYPE_OIDS[type] ?? 25 };
      });
    const rows = fields.length
      ? records(rowsText).map((r) => r.split(US).map((v) => (v === NUL ? null : v)))
      : [];
    return { fields, rows };
  });
}

async function psqlFetch(_url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const url = headers.get("Neon-Connection-String") ?? "";
  const body = JSON.parse(String(init?.body)) as Query | { queries: Query[] };
  try {
    const payload =
      "queries" in body
        ? { results: runQueries(url, body.queries, true) }
        : runQueries(url, [{ query: body.query, params: body.params ?? [] }], false)[0];
    return Response.json(payload);
  } catch (err) {
    const stderr = String((err as { stderr?: string }).stderr ?? err);
    const m = /ERROR:\s+([0-9A-Z]{5}):\s*(.*)/.exec(stderr);
    return Response.json({ message: m?.[2] ?? stderr, code: m?.[1] }, { status: 400 });
  }
}

function sqlValue(text: string): string {
  return psql(PG_URL, text).split(RS)[0]?.replace(/\n$/, "") ?? "";
}

const lead = {
  name: "Robert'); DROP TABLE players;--",
  email: "bobby.tables@bramwell-logistics.example",
  marketingOptIn: true,
  ageConfirmed: true,
};

function request(url: string, method: string, opts: { cookie?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { "x-forwarded-for": "192.0.2.10" };
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`http://localhost${url}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

describe.skipIf(!PG_URL)("real Postgres via the Neon driver", () => {
  beforeAll(() => {
    psql(PG_URL, "DROP TABLE IF EXISTS saves; DROP TABLE IF EXISTS players;");
    neonConfig.fetchFunction = psqlFetch;
  });

  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", PG_URL);
    vi.spyOn(console, "error");
  });

  afterAll(() => {
    neonConfig.fetchFunction = undefined;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("runs the full sign-up -> save -> load -> delete flow", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/lead/route");
    const progress = await import("@/app/api/progress/route");

    // Sign up: tables are created lazily, the player is stored, the cookie is set.
    const signUp = await POST(request("/api/lead", "POST", { body: lead }));
    const { stored, playerId } = (await signUp.json()) as { stored: boolean; playerId: string };
    expect(stored).toBe(true);
    const cookie = `hl_pid=${playerId}`;
    expect(sqlValue(`SELECT name || '|' || email || '|' || marketing_opt_in FROM players WHERE id = '${playerId}'`)).toBe(
      `${lead.name}|${lead.email}|true`,
    );
    expect(sqlValue("SELECT count(*) FROM players")).toBe("1"); // the name did not drop anything

    // Nothing saved yet.
    expect(await (await progress.GET(request("/api/progress", "GET", { cookie }))).json()).toEqual({ cloud: true, save: null });

    // Save, then save again (upsert).
    const save = {
      version: 2,
      playerId,
      profile: { name: lead.name, email: lead.email, guest: false, consentAt: null, marketingOptIn: true },
      pathways: { "help-desk": { introSeen: true, hub: { x: 4, y: 2 }, battle: null, best: null, attempts: 1, wins: 0, history: [] } },
      settings: { reducedMotion: null },
      updatedAt: "2026-09-24T18:30:00.000Z",
    };
    const put1 = await progress.PUT(request("/api/progress", "PUT", { cookie, body: { save } }));
    expect(await put1.json()).toEqual({ stored: true });
    const later = { ...save, updatedAt: "2026-09-24T18:31:00.000Z", pathways: { "help-desk": { ...save.pathways["help-desk"], wins: 1 } } };
    const put2 = await progress.PUT(request("/api/progress", "PUT", { cookie, body: { save: later } }));
    expect(await put2.json()).toEqual({ stored: true });
    expect(sqlValue("SELECT count(*) FROM saves")).toBe("1");

    // The stored blob has no personal data.
    const blob = sqlValue(`SELECT data::text FROM saves WHERE player_id = '${playerId}'`);
    expect(blob).not.toContain(lead.email);
    expect(blob).not.toContain("Robert");
    expect(JSON.parse(blob)).toMatchObject({ profile: null, playerId });

    // Load: newest save, profile rebuilt from the players row.
    const got = (await (await progress.GET(request("/api/progress", "GET", { cookie }))).json()) as {
      cloud: boolean;
      save: typeof save;
    };
    expect(got.cloud).toBe(true);
    expect(got.save.pathways["help-desk"].wins).toBe(1);
    expect(got.save.updatedAt).toBe(later.updatedAt);
    expect(got.save.profile).toMatchObject({ name: lead.name, email: lead.email, guest: false, marketingOptIn: true });
    expect(Number.isNaN(Date.parse(String(got.save.profile.consentAt)))).toBe(false);

    // A cookie for a player that does not exist cannot create a save.
    const ghost = "hl_pid=9d3c1c1e-0000-4000-8000-000000000000";
    expect(await (await progress.PUT(request("/api/progress", "PUT", { cookie: ghost, body: { save } }))).json()).toEqual({
      stored: false,
    });
    expect(await (await progress.GET(request("/api/progress", "GET", { cookie: ghost }))).json()).toEqual({
      cloud: false,
      save: null,
    });

    // Delete: player and save are gone, cookie cleared.
    const del = await progress.DELETE(request("/api/progress", "DELETE", { cookie }));
    expect(await del.json()).toEqual({ ok: true });
    expect(del.headers.get("set-cookie")).toMatch(/^hl_pid=;/);
    expect(sqlValue("SELECT count(*) FROM players")).toBe("0");
    expect(sqlValue("SELECT count(*) FROM saves")).toBe("0");
    expect(await (await progress.GET(request("/api/progress", "GET", { cookie }))).json()).toEqual({ cloud: false, save: null });

    // Nothing personal was logged along the way.
    const logged = JSON.stringify((console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls);
    expect(logged).not.toContain(lead.email);
  });

  it("creates the schema idempotently (a second instance and a raw re-run are fine)", async () => {
    vi.resetModules();
    const db = await import("./db");
    expect(await db.createPlayer("5a0f6f36-2a39-4e57-9a0c-8b1d7f5b0b11", { name: "Ana", email: "ana@x.example", marketingOptIn: false })).toBe(true);
    for (const statement of db.SCHEMA_SQL) psql(PG_URL, `${statement};`);
    const cols = sqlValue(
      "SELECT string_agg(table_name || '.' || column_name || ':' || data_type, ',' ORDER BY table_name, ordinal_position) FROM information_schema.columns WHERE table_name IN ('players','saves')",
    );
    expect(cols).toBe(
      [
        "players.id:uuid",
        "players.name:text",
        "players.email:text",
        "players.marketing_opt_in:boolean",
        "players.consent_at:timestamp with time zone",
        "players.created_at:timestamp with time zone",
        "saves.player_id:uuid",
        "saves.data:jsonb",
        "saves.updated_at:timestamp with time zone",
      ].join(","),
    );
    psql(PG_URL, "DELETE FROM players;");
  });

  it("purges players inactive for 24 months, keeping anyone who played recently", async () => {
    psql(
      PG_URL,
      `INSERT INTO players (id, name, email, created_at) VALUES
         ('00000000-0000-4000-8000-000000000001', 'Old', 'old@x.example', now() - interval '25 months'),
         ('00000000-0000-4000-8000-000000000002', 'Old but active', 'active@x.example', now() - interval '30 months'),
         ('00000000-0000-4000-8000-000000000003', 'New', 'new@x.example', now());
       INSERT INTO saves (player_id, data, updated_at) VALUES
         ('00000000-0000-4000-8000-000000000001', '{}', now() - interval '25 months'),
         ('00000000-0000-4000-8000-000000000002', '{}', now() - interval '3 days');`,
    );
    vi.resetModules();
    const db = await import("./db");
    await db.maybePurgeStalePlayers();
    expect(sqlValue("SELECT string_agg(name, ',' ORDER BY name) FROM players")).toBe("New,Old but active");
    expect(sqlValue("SELECT count(*) FROM saves")).toBe("1");
    psql(PG_URL, "DELETE FROM players;");
  });
});
