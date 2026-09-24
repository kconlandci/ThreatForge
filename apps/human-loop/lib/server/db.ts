/**
 * Cloud save storage: Neon Postgres over HTTP (@neondatabase/serverless).
 *
 * - Turns on when DATABASE_URL (or POSTGRES_URL) is set. Without it every function here is a
 *   no-op that reports "not stored", and the game keeps saving in the browser.
 * - Tables are created lazily and idempotently on first use (once per server instance).
 * - Parameterized queries only.
 * - Never throws: database problems are logged (error code only, never names, emails or query
 *   values) and reported as "not stored" so the game keeps working.
 * - Personal data (name, email, consent) lives only in `players`. The save blob in `saves` holds
 *   game progress with `profile: null`; GET rebuilds the profile from `players`.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { SaveData, SaveProfile } from "@/lib/game/types";
import { validateSave, type LeadInput } from "./validate";

/** Per-request timeout for each database round trip. A stuck database must not hang sign-up. */
const QUERY_TIMEOUT_MS = 6000;
/** Matches the privacy notice: data is deleted 24 months after the player last played. */
export const RETENTION_MONTHS = 24;
const PURGE_EVERY_MS = 24 * 60 * 60 * 1000;

export const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS players (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    marketing_opt_in boolean NOT NULL DEFAULT false,
    consent_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS saves (
    player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
] as const;

export const SQL = {
  /** $1 id, $2 name, $3 email, $4 marketing opt-in. */
  insertPlayer: `INSERT INTO players (id, name, email, marketing_opt_in, consent_at)
    VALUES ($1::uuid, $2::text, $3::text, $4::boolean, now())`,
  /** $1 player id, $2 save JSON. Writes only when the player row exists; returns a row if stored. */
  upsertSave: `INSERT INTO saves (player_id, data, updated_at)
    SELECT p.id, $2::jsonb, now() FROM players p WHERE p.id = $1::uuid
    ON CONFLICT (player_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    RETURNING player_id`,
  /** $1 player id. No row = no such player; `data` null = player without a cloud save yet. */
  selectSave: `SELECT p.name, p.email, p.marketing_opt_in, p.consent_at, s.data
    FROM players p LEFT JOIN saves s ON s.player_id = p.id
    WHERE p.id = $1::uuid`,
  /** $1 player id. The save goes with it (ON DELETE CASCADE). */
  deletePlayer: `DELETE FROM players WHERE id = $1::uuid RETURNING id`,
  /** $1 months. Deletes players whose last sign-up or save is older than that; returns the count. */
  purgeStale: `WITH gone AS (
      DELETE FROM players p
      WHERE GREATEST(p.created_at, COALESCE((SELECT s.updated_at FROM saves s WHERE s.player_id = p.id), p.created_at))
        < now() - make_interval(months => $1::int)
      RETURNING 1
    )
    SELECT count(*)::int AS n FROM gone`,
} as const;

type Sql = NeonQueryFunction<false, false>;
type Row = Record<string, unknown>;

let client: { url: string; sql: Sql | null } | null = null;
let schemaReady: Promise<void> | null = null;
let lastPurgeAt = 0;

/** The connection string, or null for no-op mode. */
export function databaseUrl(): string | null {
  const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();
  return url || null;
}

export function isDatabaseConfigured(): boolean {
  return databaseUrl() !== null;
}

function getSql(): Sql | null {
  const url = databaseUrl();
  if (!url) return null;
  if (client?.url === url) return client.sql;
  schemaReady = null;
  try {
    client = { url, sql: neon(url) };
  } catch (err) {
    // A malformed URL. The error message contains the URL (and password), so log the name only.
    logDbError("config", err);
    client = { url, sql: null };
  }
  return client.sql;
}

function timeout() {
  return { fetchOptions: { signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) } };
}

function query(sql: Sql, text: string, params: unknown[] = []): Promise<Row[]> {
  return sql.query(text, params, timeout()) as Promise<Row[]>;
}

function errorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : undefined;
}

/**
 * Log a database failure without personal data. Postgres and driver messages can quote values
 * (and the connection string), so only the SQLSTATE code and error class names are logged.
 */
function logDbError(op: string, err: unknown) {
  const code = errorCode(err);
  const name = err instanceof Error ? err.name : typeof err;
  const source = (err as { sourceError?: unknown } | null)?.sourceError;
  const cause = source instanceof Error ? ` / ${source.name}` : "";
  console.error(`[human-loop] database ${op} failed: ${code ? `SQLSTATE ${code}` : name}${cause}`);
}

/** Create tables once per instance. A failure is not cached, so the next request retries. */
function ensureSchema(sql: Sql): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql
      .transaction((txn) => SCHEMA_SQL.map((text) => txn.query(text)), timeout())
      .then(() => undefined)
      .catch((err: unknown) => {
        // Two instances racing on CREATE TABLE IF NOT EXISTS: the other one won, tables exist.
        const code = errorCode(err);
        if (code === "23505" || code === "42P07") return;
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

async function withDb<T>(op: string, fallback: T, fn: (sql: Sql) => Promise<T>): Promise<T> {
  const sql = getSql();
  if (!sql) return fallback;
  try {
    await ensureSchema(sql);
    return await fn(sql);
  } catch (err) {
    logDbError(op, err);
    return fallback;
  }
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return null;
}

/** Store a new player. Every sign-up is a new row: emails are unverified, so we never merge by email. */
export function createPlayer(playerId: string, lead: LeadInput): Promise<boolean> {
  return withDb("create-player", false, async (sql) => {
    await query(sql, SQL.insertPlayer, [playerId, lead.name, lead.email, lead.marketingOptIn]);
    return true;
  });
}

export type CloudLoad = {
  cloud: boolean;
  save: SaveData | null;
  /** The player's profile, also sent when they have no save row yet (so a wiped browser can restore it). */
  profile?: SaveProfile | null;
};

/**
 * Load a player's save. `cloud` is true only when the database answered and the player exists,
 * so the client pushes saves only when they can actually be stored.
 */
export function loadCloudSave(playerId: string): Promise<CloudLoad> {
  return withDb<CloudLoad>("load-save", { cloud: false, save: null }, async (sql) => {
    const [row] = await query(sql, SQL.selectSave, [playerId]);
    if (!row) return { cloud: false, save: null };

    const profile: SaveProfile = {
      name: typeof row.name === "string" ? row.name : "",
      email: typeof row.email === "string" ? row.email : "",
      guest: false,
      consentAt: toIso(row.consent_at),
      marketingOptIn: row.marketing_opt_in === true,
    };
    if (row.data === null || row.data === undefined) return { cloud: true, save: null, profile };

    const data: unknown = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
    const checked = validateSave(data, { envelope: false });
    if (!checked.ok) return { cloud: true, save: null, profile };

    return { cloud: true, save: { ...checked.value, playerId, profile }, profile };
  });
}

/** Upsert a save for an existing player. False when there is no such player or no database. */
export function storeCloudSave(playerId: string, save: SaveData): Promise<boolean> {
  return withDb("store-save", false, async (sql) => {
    const data = JSON.stringify({ ...save, playerId, profile: null });
    const rows = await query(sql, SQL.upsertSave, [playerId, data]);
    return rows.length > 0;
  });
}

/**
 * Delete a player and their save. True when the data is gone (or there was never a database);
 * false only when the database could not be reached, so the caller can say so honestly.
 */
export async function deletePlayer(playerId: string): Promise<boolean> {
  if (!getSql()) return true;
  return withDb("delete-player", false, async (sql) => {
    await query(sql, SQL.deletePlayer, [playerId]);
    return true;
  });
}

/**
 * Enforce the retention promise. Runs at most once a day per server instance, unless `force`
 * (the daily cron, app/api/cron/purge). Returns how many players were deleted.
 */
export async function maybePurgeStalePlayers(now = Date.now(), force = false): Promise<number> {
  if (!getSql() || (!force && now - lastPurgeAt < PURGE_EVERY_MS)) return 0;
  lastPurgeAt = now;
  const purged = await withDb("purge", 0, async (sql) => {
    const [row] = await query(sql, SQL.purgeStale, [RETENTION_MONTHS]);
    return typeof row?.n === "number" ? row.n : 0;
  });
  if (purged > 0) console.info(`[human-loop] retention: deleted ${purged} inactive player(s).`);
  return purged;
}
