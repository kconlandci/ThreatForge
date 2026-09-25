/**
 * Cloud save storage: Airtable (the "Human Loop — Players" base), over the Airtable Web API.
 *
 * - Turns on when AIRTABLE_TOKEN is set (and no Postgres URL is; see ./storage.ts). The base id
 *   comes from AIRTABLE_BASE_ID, or defaults to DCI's base.
 * - Tables and fields are addressed by ID everywhere (reads use returnFieldsByFieldId, formulas
 *   use {fldXXXX}), so DCI staff can rename tables and columns without breaking the game.
 *   Deleting a column does break it: the API then rejects our writes and saves degrade to
 *   "not stored" (the game keeps working from the browser's copy).
 * - Airtable allows 5 requests per second per base, and after a 429 it rejects every request for
 *   about 30 seconds. So each server instance paces itself (at most PACE_PER_SECOND requests per
 *   rolling second, queueing up to PACE_MAX_WAIT_MS), and after a 429 it stops calling Airtable
 *   for COOLDOWN_MS. A 429 is retried once only when Airtable sends a short Retry-After.
 * - Never throws. Failures are logged as HTTP status + Airtable error type only (never the token,
 *   names, emails or formula values). A temporary failure (429, 5xx, timeout, network, busy)
 *   is reported with `retryAfterSec`, so the routes can tell the browser to try again later;
 *   anything else is plain "not stored".
 * - Personal data (name, email, consent) lives only in the Players table's own columns. The save
 *   blob in "Save data" holds game progress with `profile: null`; GET rebuilds the profile.
 * - Every finished shift also becomes one row in Shift Results (linked to the player), so staff
 *   can see how people are doing without reading JSON. Rows per save and per player per day are
 *   capped, since history comes from the browser.
 */
import { LEVEL_NAMES } from "@/lib/game/mastery";
import { MASTERY_SKILLS, isMasterySkillId, skillName } from "@/lib/game/skills";
import type { BattleStatus, EncounterMode, MasterySkillId, SaveData, SaveProfile } from "@/lib/game/types";
import { PATHWAYS, type PathwayId } from "@/lib/types";
import type { CloudLoad } from "./db";
import { PURGE_EVERY_MS, RETENTION_MONTHS } from "./retention";
import { isPlainObject, isUuid, validateSave, type LeadInput } from "./validate";

export const AIRTABLE_API = "https://api.airtable.com/v0";
/** DCI's "Human Loop — Players" base. Used when AIRTABLE_BASE_ID is not set. */
export const DEFAULT_AIRTABLE_BASE_ID = "appp6a1BiX6qyMUkj";

export const PLAYERS_TABLE = "tblVJYIXEbxGsSsfc";
export const RESULTS_TABLE = "tbl5ZbLtXi5NIvw6x";

/** Players table columns (IDs never change when a column is renamed). */
export const PLAYER_FIELDS = {
  name: "fld3jrW3wsGa33crg", // singleLineText, primary
  email: "fldUentaR03ulU358", // email
  marketingOptIn: "fldP1zSAmAg626KhG", // checkbox
  signedUp: "fldMK5EgIJQ1diTNh", // dateTime
  lastPlayed: "fld3rXLCWOoDJbkbK", // dateTime
  shiftsPlayed: "fldPoVpCv9P9EA7BX", // number
  shiftsWon: "fldPnqFCRmgYYlsrK", // number
  bestStars: "fld86RDatQcASUv18", // rating 1-3 (empty for 0)
  playerId: "fldxQabu9nsfdp0EF", // singleLineText: the hl_pid cookie value
  saveData: "fldTx7vV1slId40Zr", // multilineText: the save JSON
  saveUpdated: "fld6JX5pZMOungE9g", // dateTime
  results: "fldOVdcW87pMwVwKT", // link to Shift Results (inverse of RESULT_FIELDS.player)
} as const;

/** Shift Results table columns. */
export const RESULT_FIELDS = {
  summary: "fldNiqE5r8anWXxwD", // singleLineText, primary: "Jamie R. · Help Desk · Won ★★★"
  pathway: "fldmIJPLGwavOzfpf", // singleSelect
  encounter: "flduAMyA9h3jZV1K0", // singleLineText
  outcome: "fldEWCCGikkixMF3H", // singleSelect: Won / Breach / Out of time
  stars: "fldmQHJB11V9LQC5R", // rating 1-3 (empty for 0)
  catches: "fld7Mq8G41rRGsrvv", // number
  falseAlarms: "fldpc8K13rPSv5HzT", // number
  misses: "fldIFyQerVWKgE926", // number
  playedAt: "fldsgel5IEIMLme6g", // dateTime
  player: "fld8TekR5hWVIeg26", // link to Players
} as const;

/**
 * Optional columns the base owner may add (M3 reporting). Each is written only when its field id is
 * set here; null means "not in the base yet", so nothing breaks before the column exists.
 * Mode: single select Story / Practice / Daily / Drill. Right, Partly, Missed: numbers.
 * Focus skill: text. Skill levels (Players): text, e.g. "Check who's asking: Solid; Confirm the fix: Learning".
 */
export const OPTIONAL_RESULT_FIELDS: Record<"mode" | "right" | "partly" | "missed" | "focus", string | null> = {
  mode: null,
  right: null,
  partly: null,
  missed: null,
  focus: null,
};
export const OPTIONAL_PLAYER_FIELDS: Record<"skillLevels", string | null> = {
  skillLevels: null,
};

/** Per-request timeout. A stuck API must not hang sign-up or saving. */
export const REQUEST_TIMEOUT_MS = 8000;
/** Airtable long text holds 100,000 characters; stay well under it. */
export const SAVE_DATA_MAX_CHARS = 95_000;
/** Airtable creates, updates and deletes at most 10 records per request. */
export const BATCH_SIZE = 10;
/** Requests per rolling second per server instance (Airtable's limit is 5 per base). */
export const PACE_PER_SECOND = 4;
/** Longest a request waits for a pacing slot; beyond that it gives up as "busy, try later". */
export const PACE_MAX_WAIT_MS = 4000;
/** After a 429, no Airtable calls from this instance for this long (Airtable's own penalty). */
export const COOLDOWN_MS = 30_000;
/** After Airtable's monthly API call cap is hit (429 PUBLIC_API_BILLING_LIMIT_EXCEEDED). */
export const BILLING_COOLDOWN_MS = 10 * 60_000;
const BILLING_LIMIT = "PUBLIC_API_BILLING_LIMIT_EXCEEDED";
/** A 429 is retried at most this many times, and only when Retry-After is at most MAX_RETRY_WAIT_MS. */
export const MAX_RETRIES = 1;
export const MAX_RETRY_WAIT_MS = 2000;
/** Retry-After sent to the browser for a temporary failure outside a cooldown. */
const DEFAULT_RETRY_AFTER_SEC = 30;
/**
 * New Shift Results rows written per save at most (the newest win). An honest browser adds one
 * per finished battle and pushes right away; history is browser-supplied, so this is capped.
 */
export const MAX_NEW_RESULTS_PER_SAVE = 5;
/** New Shift Results rows per player per UTC day at most. */
export const RESULT_ROWS_PER_DAY = 40;
/** History entries dated further ahead than this are ignored (not real finished shifts yet). */
const FUTURE_SLACK_MS = 5 * 60_000;
/** Linked result rows checked at most when looking for rows a failed save already wrote. */
const MAX_ROW_LOOKUP = 30;
/** Players deleted per retention run at most; the next daily run continues. */
const PURGE_MAX_PLAYERS = 300;
/** Unlinked Shift Results rows deleted per retention run at most. */
const PURGE_MAX_RESULTS = 500;
const PURGE_PAGE_SIZE = 50;
/** Per-instance memory of a player's record id and stored save (skips the lookup on routine pushes). */
const KNOWN_TTL_MS = 10 * 60_000;
const KNOWN_MAX = 2000;

/** Extra key kept in the stored save blob only (dropped by validateSave on the way out). */
const META_KEY = "serverMeta";

const BASE_ID_RE = /^app[A-Za-z0-9]{14}$/;
const RECORD_ID_RE = /^rec[A-Za-z0-9]{14}$/;
const ERROR_TYPE_RE = /^[A-Z][A-Z0-9_]{0,63}$/;
// Control characters (C0, DEL, C1) and bidi/format controls, as in validate.ts.
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

const PATHWAY_NAMES = new Map<string, string>(PATHWAYS.map((p) => [p.id, p.name]));
const OUTCOMES: Partial<Record<BattleStatus, string>> = {
  won: "Won",
  "lost-breach": "Breach",
  "lost-timeout": "Out of time",
};
/** Each pathway's story shift title by encounter id (from the registry; no content is imported). */
const ENCOUNTER_TITLES = new Map<string, string>(
  PATHWAYS.flatMap((p) => (p.storyId && p.storyTitle ? [[p.storyId, p.storyTitle] as [string, string]] : [])),
);
const MODE_NAMES: Record<EncounterMode, string> = { story: "Story", practice: "Practice", daily: "Daily", drill: "Drill" };
const ID_PREFIXES = PATHWAYS.flatMap((p) => (p.idPrefix ? [p.idPrefix] : [])).join("|");
/** "hd-daily-7", "cy-daily-2". */
const DAILY_ID_RE = new RegExp(`^(${ID_PREFIXES})-daily-\\d+$`);
/** "hd-drill-verify-identity-2": group 2 is the skill. */
const DRILL_ID_RE = new RegExp(`^(${ID_PREFIXES})-drill-([a-z-]+)-\\d+$`);

/**
 * The Encounter column: the fixed shift's title ("Monday, 8:57 AM"), else the id itself
 * ("hd-daily-7", "hd-drill-verify-identity-2").
 */
function encounterColumn(encounterId: string): string {
  return ENCOUNTER_TITLES.get(encounterId) ?? encounterId;
}

/** A readable shift name for summaries: "Daily practice", "Drill: Check who's asking", or null for fixed shifts. */
export function generatedShiftTitle(encounterId: string): string | null {
  if (DAILY_ID_RE.test(encounterId)) return "Daily practice";
  const drill = DRILL_ID_RE.exec(encounterId);
  if (drill && isMasterySkillId(drill[2])) return `Drill: ${skillName(drill[2])}`;
  return null;
}

/** Swappable in tests so pacing, retries and cooldowns run on a virtual clock. */
export const airtableTiming = {
  now: () => Date.now(),
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

type Config = { token: string; baseId: string };
type AirtableRecord = { id: string; createdTime?: string; fields: Record<string, unknown> };
type ListResponse = { records?: AirtableRecord[]; offset?: string };
type Query = [string, string][];

/** A write's result. `retryAfterSec` is set only for a temporary failure (try again later). */
export type WriteOutcome = { stored: boolean; retryAfterSec?: number };
/** A load's result. `retryAfterSec` is set only for a temporary failure (try again later). */
export type LoadOutcome = CloudLoad & { retryAfterSec?: number };

export class AirtableError extends Error {
  constructor(
    readonly status: number,
    readonly type?: string,
  ) {
    super(`Airtable HTTP ${status}${type ? ` ${type}` : ""}`);
    this.name = "AirtableError";
  }
}

/** This instance is cooling down after a 429, or its request queue is full. Temporary. */
export class AirtableBusy extends Error {
  constructor() {
    super("Airtable busy");
    this.name = "AirtableBusy";
  }
}

let warnedBadBase = false;
let lastPurgeAt = 0;
/** Start times of recent and queued requests (sorted), for pacing. */
let slots: number[] = [];
let coolUntil = 0;

/** Token + base id, or null when Airtable is off (no token, or a malformed base id). */
export function airtableConfig(): Config | null {
  const token = (process.env.AIRTABLE_TOKEN ?? "").trim();
  if (!token) return null;
  const baseId = (process.env.AIRTABLE_BASE_ID ?? "").trim() || DEFAULT_AIRTABLE_BASE_ID;
  if (!BASE_ID_RE.test(baseId)) {
    if (!warnedBadBase) {
      warnedBadBase = true;
      console.error("[human-loop] AIRTABLE_BASE_ID is not a base id (appXXXXXXXXXXXXXX); Airtable cloud save is off.");
    }
    return null;
  }
  return { token, baseId };
}

export function isAirtableConfigured(): boolean {
  return airtableConfig() !== null;
}

/* ------------------------------------------------------------------ */
/* HTTP: pacing, cooldown, retries                                     */
/* ------------------------------------------------------------------ */

function coolDown(ms: number) {
  coolUntil = Math.max(coolUntil, airtableTiming.now() + ms);
}

/** Seconds the browser should wait before trying again. */
function retryAfterSec(): number {
  const left = coolUntil - airtableTiming.now();
  return left > 0 ? Math.max(1, Math.ceil(left / 1000)) : DEFAULT_RETRY_AFTER_SEC;
}

/** Wait for a request slot (FIFO), or throw AirtableBusy when cooling down or the queue is too long. */
async function pace(): Promise<void> {
  const now = airtableTiming.now();
  if (now < coolUntil) throw new AirtableBusy();
  while (slots.length && slots[0] <= now - 1000) slots.shift();
  let at = Math.max(now, slots.length ? slots[slots.length - 1] : now);
  if (slots.length >= PACE_PER_SECOND) at = Math.max(at, slots[slots.length - PACE_PER_SECOND] + 1000);
  if (at - now > PACE_MAX_WAIT_MS) throw new AirtableBusy();
  slots.push(at);
  if (at > now) {
    await airtableTiming.sleep(at - now);
    if (airtableTiming.now() < coolUntil) throw new AirtableBusy();
  }
}

/** Retry-After in ms when it is short enough to wait for inside a request, else null. */
function shortRetryWaitMs(header: string | null): number | null {
  if (header === null || header.trim() === "") return null;
  const sec = Number(header);
  if (!Number.isFinite(sec) || sec < 0) return null;
  const ms = Math.ceil(sec * 1000);
  return ms > MAX_RETRY_WAIT_MS ? null : Math.max(ms, 200);
}

/** How long to stop calling Airtable after a 429: Retry-After if longer than the default, capped. */
function cooldownMs(header: string | null): number {
  const sec = Number(header ?? "");
  const ms = Number.isFinite(sec) && sec > 0 ? Math.ceil(sec * 1000) : 0;
  return Math.min(4 * COOLDOWN_MS, Math.max(COOLDOWN_MS, ms));
}

/** Airtable's error type (e.g. INVALID_VALUE_FOR_COLUMN). Messages can quote values, so never those. */
async function errorType(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { error?: unknown; errors?: unknown };
    const e = body?.error ?? (Array.isArray(body?.errors) ? body.errors[0] : undefined);
    const type = typeof e === "string" ? e : isPlainObject(e) ? (e.type ?? e.error) : undefined;
    return typeof type === "string" && ERROR_TYPE_RE.test(type) ? type : undefined;
  } catch {
    return undefined;
  }
}

async function request<T>(
  cfg: Config,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  table: string,
  opts: { recordId?: string; query?: Query; body?: unknown } = {},
): Promise<T> {
  const url = new URL(`${AIRTABLE_API}/${cfg.baseId}/${table}${opts.recordId ? `/${opts.recordId}` : ""}`);
  for (const [key, value] of opts.query ?? []) url.searchParams.append(key, value);
  const headers: Record<string, string> = { Authorization: `Bearer ${cfg.token}` };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const body = opts.body === undefined ? undefined : JSON.stringify(opts.body);

  for (let attempt = 0; ; attempt++) {
    await pace();
    const res = await fetch(url.toString(), {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      const type = await errorType(res);
      if (type === BILLING_LIMIT) {
        // The workspace's monthly API calls are used up: retrying soon cannot help.
        coolDown(BILLING_COOLDOWN_MS);
        throw new AirtableError(429, type);
      }
      const wait = shortRetryWaitMs(retryAfter);
      if (wait !== null && attempt < MAX_RETRIES) {
        await airtableTiming.sleep(wait);
        continue;
      }
      // Airtable's penalty lasts about 30 s: stop calling it instead of making it worse.
      coolDown(cooldownMs(retryAfter));
      throw new AirtableError(429, type);
    }
    if (!res.ok) throw new AirtableError(res.status, await errorType(res));
    return (await res.json()) as T;
  }
}

/** Worth trying again later: rate limits, server errors, timeouts, network errors, busy. */
function isTransient(err: unknown): boolean {
  if (err instanceof AirtableError) return err.status === 429 || err.status >= 500;
  return true;
}

function logAirtableError(op: string, err: unknown) {
  const detail =
    err instanceof AirtableError
      ? `HTTP ${err.status}${err.type ? ` ${err.type}` : ""}`
      : err instanceof Error
        ? err.name
        : typeof err;
  const hint = err instanceof AirtableError && err.type === BILLING_LIMIT ? " (monthly API call limit reached; see README)" : "";
  console.error(`[human-loop] airtable ${op} failed: ${detail}${hint}`);
}

/** Run `fn`; on failure log it and answer `fallback`, or `unavailable(sec)` for a temporary failure. */
async function withAirtable<T>(
  op: string,
  fallback: T,
  fn: (cfg: Config) => Promise<T>,
  unavailable?: (retryAfterSec: number) => T,
): Promise<T> {
  const cfg = airtableConfig();
  if (!cfg) return fallback;
  try {
    return await fn(cfg);
  } catch (err) {
    logAirtableError(op, err);
    return unavailable && isTransient(err) ? unavailable(retryAfterSec()) : fallback;
  }
}

/** One player's writes and deletes run one at a time on this instance (no duplicate result rows). */
const locks = new Map<string, Promise<unknown>>();
function serialize<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => undefined);
  locks.set(key, tail);
  void tail.then(() => {
    if (locks.get(key) === tail) locks.delete(key);
  });
  return run;
}

function chunks<T>(items: T[], size = BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function createRecords(cfg: Config, table: string, records: Record<string, unknown>[]): Promise<void> {
  for (const batch of chunks(records)) {
    await request(cfg, "POST", table, {
      body: { records: batch.map((fields) => ({ fields })), returnFieldsByFieldId: true },
    });
  }
}

async function deleteRecords(cfg: Config, table: string, ids: string[]): Promise<void> {
  for (const batch of chunks([...new Set(ids.filter((id) => RECORD_ID_RE.test(id)))])) {
    await request(cfg, "DELETE", table, { query: batch.map((id) => ["records[]", id]) });
  }
}

/* ------------------------------------------------------------------ */
/* Formulas and lookups                                                */
/* ------------------------------------------------------------------ */

/** A double-quoted Airtable formula string literal. */
export function formulaString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, " ")}"`;
}

/** The lookup formula for one player, or null when the id is not a UUID (nothing is sent then). */
export function playerFormula(playerId: string): string | null {
  if (!isUuid(playerId)) return null;
  return `{${PLAYER_FIELDS.playerId}}=${formulaString(playerId.toLowerCase())}`;
}

/** Players whose Last played (or, if empty, Signed up) is more than RETENTION_MONTHS ago. */
export function purgeFormula(months = RETENTION_MONTHS): string {
  const last = `{${PLAYER_FIELDS.lastPlayed}}`;
  const signed = `{${PLAYER_FIELDS.signedUp}}`;
  const n = Math.max(1, Math.floor(months));
  return `AND(OR(${last}, ${signed}), IS_BEFORE(IF(${last}, ${last}, ${signed}), DATEADD(NOW(), -${n}, 'months')))`;
}

/**
 * Shift Results rows linked to no player, created more than a day ago. They are left behind when
 * staff delete a Players row by hand, and still carry a first name, so the retention job removes them.
 */
export function unlinkedResultsFormula(): string {
  return `AND(NOT({${RESULT_FIELDS.player}}), IS_BEFORE(CREATED_TIME(), DATEADD(NOW(), -1, 'days')))`;
}

/** Rows by record id (ids are checked against the record id pattern before they go in). */
export function recordIdsFormula(ids: string[]): string | null {
  const terms = ids.filter((id) => RECORD_ID_RE.test(id)).map((id) => `RECORD_ID()=${formulaString(id)}`);
  if (!terms.length) return null;
  return terms.length === 1 ? terms[0] : `OR(${terms.join(", ")})`;
}

async function findPlayers(cfg: Config, playerId: string, fields: string[]): Promise<AirtableRecord[]> {
  const formula = playerFormula(playerId);
  if (!formula) return [];
  const query: Query = [
    ["filterByFormula", formula],
    ["returnFieldsByFieldId", "true"],
    ["pageSize", "10"],
    ...fields.map((f): [string, string] => ["fields[]", f]),
  ];
  const res = await request<ListResponse>(cfg, "GET", PLAYERS_TABLE, { query });
  return Array.isArray(res.records) ? res.records.filter((r) => typeof r?.id === "string" && isPlainObject(r.fields)) : [];
}

/** Record ids from a link field (the REST API returns strings; be lenient about {id} objects). */
function linkIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v : isPlainObject(v) && typeof v.id === "string" ? v.id : ""))
    .filter((id) => RECORD_ID_RE.test(id));
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toIso(value: unknown): string | null {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

/* ------------------------------------------------------------------ */
/* Save shaping                                                        */
/* ------------------------------------------------------------------ */

function count(value: unknown, max = 1_000_000): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0;
}

/** A rating cell: 1-3, or null for 0 (Airtable rejects 0 for a rating). */
function rating(stars: number): number | null {
  return stars > 0 ? Math.min(3, stars) : null;
}

export type ShiftResult = {
  pathway: PathwayId;
  encounterId: string;
  status: BattleStatus;
  stars: number;
  catches: number;
  falseAlarms: number;
  misses: number;
  at: string;
  /* M3, optional (older clients don't send them). */
  mode?: EncounterMode;
  right?: number;
  partly?: number;
  missed?: number;
  focus?: MasterySkillId;
};

function resultKey(r: { pathway: string; at: string; encounterId: string }): string {
  return `${r.pathway}|${r.at}|${r.encounterId}`;
}

/** How a Shift Results row identifies its shift: display names and Played at to the second. */
function rowKey(pathwayName: string, at: string, encounterTitle: string): string {
  return `${pathwayName}|${at.slice(0, 19)}|${encounterTitle}`;
}

function resultRowKey(r: ShiftResult): string {
  return rowKey(PATHWAY_NAMES.get(r.pathway) ?? r.pathway, r.at, encounterColumn(r.encounterId));
}

/** A history entry checked and cleaned, or null (unfinished, malformed, or no valid time). */
function cleanEntry(pathway: PathwayId, raw: unknown): ShiftResult | null {
  if (!isPlainObject(raw)) return null;
  const status = raw.status as BattleStatus;
  if (typeof raw.status !== "string" || !OUTCOMES[status]) return null;
  const encounterId = typeof raw.encounterId === "string" ? raw.encounterId.replace(CONTROL_RE, "").trim().slice(0, 100) : "";
  const at = toIso(raw.at);
  if (!encounterId || !at) return null;
  const out: ShiftResult = {
    pathway,
    encounterId,
    status,
    stars: count(raw.stars, 3),
    catches: count(raw.catches),
    falseAlarms: count(raw.falseAlarms),
    misses: count(raw.misses),
    at,
  };
  if (typeof raw.mode === "string" && Object.prototype.hasOwnProperty.call(MODE_NAMES, raw.mode)) {
    out.mode = raw.mode as EncounterMode;
  }
  for (const key of ["right", "partly", "missed"] as const) {
    if (typeof raw[key] === "number" && Number.isFinite(raw[key])) out[key] = count(raw[key], 20);
  }
  if (isMasterySkillId(raw.focus)) out.focus = raw.focus;
  return out;
}

function pathwayHistories(pathways: unknown): [PathwayId, unknown[]][] {
  if (!isPlainObject(pathways)) return [];
  const out: [PathwayId, unknown[]][] = [];
  for (const [id, progress] of Object.entries(pathways)) {
    if (!PATHWAY_NAMES.has(id) || !isPlainObject(progress) || !Array.isArray(progress.history)) continue;
    out.push([id as PathwayId, progress.history]);
  }
  return out;
}

type TrimmedThrough = Partial<Record<PathwayId, string>>;
/** Server-only bookkeeping kept in the stored save blob under META_KEY. */
export type ServerMeta = {
  /** Per pathway: history at or before this time was trimmed away (old, not new shifts). */
  historyTrimmedThrough?: TrimmedThrough;
  /** Shift Results rows linked to the player after the last successful save. */
  resultRows?: number;
  /** UTC day (YYYY-MM-DD) and the rows written on it, for RESULT_ROWS_PER_DAY. */
  rowsDay?: string;
  rowsToday?: number;
};
type StoredInfo = { keys: Set<string>; meta: ServerMeta };

/** What the stored save already covers: its history keys and its server bookkeeping. */
function readStored(raw: unknown): StoredInfo {
  const info: StoredInfo = { keys: new Set(), meta: {} };
  if (typeof raw !== "string" || !raw.trim()) return info;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return info;
  }
  if (!isPlainObject(data)) return info;
  for (const [pathway, history] of pathwayHistories(data.pathways)) {
    for (const entry of history) {
      const clean = cleanEntry(pathway, entry);
      if (clean) info.keys.add(resultKey(clean));
    }
  }
  const meta = data[META_KEY];
  if (!isPlainObject(meta)) return info;
  const through = meta.historyTrimmedThrough;
  if (isPlainObject(through)) {
    const out: TrimmedThrough = {};
    for (const [pathway, at] of Object.entries(through)) {
      const iso = toIso(at);
      if (PATHWAY_NAMES.has(pathway) && iso) out[pathway as PathwayId] = iso;
    }
    if (Object.keys(out).length) info.meta.historyTrimmedThrough = out;
  }
  if (typeof meta.resultRows === "number") info.meta.resultRows = count(meta.resultRows);
  if (typeof meta.rowsDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(meta.rowsDay)) {
    info.meta.rowsDay = meta.rowsDay;
    info.meta.rowsToday = count(meta.rowsToday);
  }
  return info;
}

/** Finished shifts in `save` that `stored` does not cover, oldest first (no caps applied). */
function freshResults(save: SaveData, stored: StoredInfo, now: number): ShiftResult[] {
  const seen = new Set<string>();
  const out: ShiftResult[] = [];
  const latest = new Date(now + FUTURE_SLACK_MS).toISOString();
  for (const [pathway, history] of pathwayHistories(save.pathways)) {
    const through = stored.meta.historyTrimmedThrough?.[pathway];
    for (const entry of history) {
      const clean = cleanEntry(pathway, entry);
      if (!clean || clean.at > latest) continue;
      const key = resultKey(clean);
      if (stored.keys.has(key) || seen.has(key) || (through && clean.at <= through)) continue;
      seen.add(key);
      out.push(clean);
    }
  }
  out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return out;
}

/**
 * Finished shifts in `save` that the stored save does not have yet, oldest first. Matched by
 * pathway + time + encounter (not by count: both the client and this server trim history), and
 * anything at or before a pathway's trim point is old history, not a new shift. Entries dated
 * more than a few minutes in the future are ignored.
 */
export function newShiftResults(save: SaveData, storedSaveData: unknown, now = airtableTiming.now()): ShiftResult[] {
  return freshResults(save, readStored(storedSaveData), now);
}

/** Shifts played / won, and best stars, across all pathways. */
export function saveSummary(save: SaveData): { played: number; won: number; bestStars: number } {
  let played = 0;
  let won = 0;
  let bestStars = 0;
  for (const progress of Object.values(save.pathways) as unknown[]) {
    if (!isPlainObject(progress)) continue;
    played += count(progress.attempts);
    won += count(progress.wins);
    if (isPlainObject(progress.best)) bestStars = Math.max(bestStars, count(progress.best.stars, 3));
  }
  return { played, won, bestStars };
}

type Packed = { json: string; trimmed: number; droppedBattles: boolean };

function stringifySave(save: SaveData, meta: ServerMeta): string {
  const clean: ServerMeta = {};
  if (meta.historyTrimmedThrough && Object.keys(meta.historyTrimmedThrough).length) clean.historyTrimmedThrough = meta.historyTrimmedThrough;
  if (meta.resultRows !== undefined) clean.resultRows = meta.resultRows;
  if (meta.rowsDay !== undefined) {
    clean.rowsDay = meta.rowsDay;
    clean.rowsToday = meta.rowsToday ?? 0;
  }
  return JSON.stringify({ ...save, [META_KEY]: Object.keys(clean).length ? clean : undefined });
}

/** Remove the `k` oldest history entries (across pathways) and serialize. */
function withoutOldest(save: SaveData, order: { pathway: PathwayId; index: number; at: string | null }[], k: number, meta: ServerMeta) {
  const drop = new Map<PathwayId, Set<number>>();
  const through: TrimmedThrough = { ...meta.historyTrimmedThrough };
  for (const e of order.slice(0, k)) {
    if (!drop.has(e.pathway)) drop.set(e.pathway, new Set());
    drop.get(e.pathway)!.add(e.index);
    if (e.at && (!through[e.pathway] || e.at > through[e.pathway]!)) through[e.pathway] = e.at;
  }
  const pathways: SaveData["pathways"] = {};
  for (const [id, progress] of Object.entries(save.pathways) as [PathwayId, unknown][]) {
    const gone = drop.get(id);
    if (gone && isPlainObject(progress) && Array.isArray(progress.history)) {
      const history = progress.history.filter((_, i) => !gone.has(i));
      pathways[id] = { ...progress, history } as unknown as NonNullable<SaveData["pathways"][PathwayId]>;
    } else {
      pathways[id] = progress as NonNullable<SaveData["pathways"][PathwayId]>;
    }
  }
  return stringifySave({ ...save, pathways }, { ...meta, historyTrimmedThrough: through });
}

/** Fit `save` under the limit by trimming the oldest history entries, or null if even no history is too big. */
function fitByTrimming(save: SaveData, meta: ServerMeta, max: number): { json: string; trimmed: number } | null {
  const full = stringifySave(save, meta);
  if (full.length <= max) return { json: full, trimmed: 0 };

  const order: { pathway: PathwayId; index: number; at: string | null }[] = [];
  for (const [pathway, history] of pathwayHistories(save.pathways)) {
    history.forEach((entry, index) => {
      order.push({ pathway, index, at: isPlainObject(entry) ? toIso(entry.at) : null });
    });
  }
  // Oldest first; entries without a valid time go first of all.
  order.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));

  const all = withoutOldest(save, order, order.length, meta);
  if (all.length > max) return null;
  // Smallest k that fits (size shrinks as k grows).
  let lo = 1;
  let hi = order.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (withoutOldest(save, order, mid, meta).length <= max) hi = mid;
    else lo = mid + 1;
  }
  for (let k = lo; k <= order.length; k++) {
    const json = withoutOldest(save, order, k, meta);
    if (json.length <= max) return { json, trimmed: k };
  }
  return { json: all, trimmed: order.length };
}

/**
 * The "Save data" cell for a save, never longer than `max` characters:
 * 1. the whole save;
 * 2. else without the oldest history entries (their trim point is remembered, see newShiftResults);
 * 3. else also without in-progress battle state (the finished record is what matters);
 * 4. else null: store the summary columns only.
 */
export function packSaveData(save: SaveData, meta: ServerMeta = {}, max = SAVE_DATA_MAX_CHARS): Packed | null {
  const first = fitByTrimming(save, meta, max);
  if (first) return { ...first, droppedBattles: false };
  const pathways: SaveData["pathways"] = {};
  for (const [id, progress] of Object.entries(save.pathways) as [PathwayId, unknown][]) {
    pathways[id] = (isPlainObject(progress) ? { ...progress, battle: null, pendingResult: null } : progress) as NonNullable<
      SaveData["pathways"][PathwayId]
    >;
  }
  const second = fitByTrimming({ ...save, pathways }, meta, max);
  return second ? { ...second, droppedBattles: true } : null;
}

/** "Jamie R." from "Jamie Rivera": first name and last initial only. */
export function shortName(name: string): string {
  const parts = name.replace(CONTROL_RE, "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Player";
  const first = Array.from(parts[0]).slice(0, 40).join("");
  if (parts.length === 1) return first;
  const initial = Array.from(parts[parts.length - 1])[0]?.toLocaleUpperCase() ?? "";
  return initial ? `${first} ${initial}.` : first;
}

/** The summary's tail: "Won ★★★", or "Daily practice · 7/9 right" for a generated shift. */
function summaryTail(result: ShiftResult): string {
  const outcome = OUTCOMES[result.status] ?? result.status;
  const generated = generatedShiftTitle(result.encounterId);
  if (generated) {
    const judged = (result.right ?? 0) + (result.partly ?? 0) + (result.missed ?? 0);
    return typeof result.right === "number" && judged > 0
      ? `${generated} · ${result.right}/${judged} right`
      : `${generated} · ${outcome}`;
  }
  return `${outcome}${result.stars > 0 ? ` ${"★".repeat(result.stars)}` : ""}`;
}

/** The optional M3 columns that exist in the base (field id set) and have a value. */
function optionalResultFields(result: ShiftResult): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const put = (field: string | null, value: unknown) => {
    if (field && value !== undefined && value !== null) out[field] = value;
  };
  put(OPTIONAL_RESULT_FIELDS.mode, result.mode ? MODE_NAMES[result.mode] : undefined);
  put(OPTIONAL_RESULT_FIELDS.right, result.right);
  put(OPTIONAL_RESULT_FIELDS.partly, result.partly);
  put(OPTIONAL_RESULT_FIELDS.missed, result.missed);
  put(OPTIONAL_RESULT_FIELDS.focus, result.focus ? skillName(result.focus) : undefined);
  return out;
}

/** The Skill levels column is kept to this many characters. */
export const SKILL_LEVELS_MAX = 1000;

/** "Check who's asking: Solid; Confirm the fix: Learning" for one pathway's skills in a save. */
function pathwaySkillLevels(save: SaveData, pathwayId: string): string {
  const progress = (save.pathways as Record<string, unknown>)[pathwayId];
  const skills = isPlainObject(progress) && isPlainObject(progress.skills) ? progress.skills : {};
  const parts: string[] = [];
  for (const id of MASTERY_SKILLS) {
    const rec = skills[id];
    const level = isPlainObject(rec) ? count(rec.level, 4) : 0;
    if (level > 0) parts.push(`${skillName(id)}: ${LEVEL_NAMES[level as 1 | 2 | 3 | 4]}`);
  }
  return parts.join("; ");
}

/**
 * The Skill levels column. Only Help Desk skills: "Check who's asking: Solid; Confirm the fix:
 * Learning" (as before). Skills in more than one pathway: "Help Desk — …; … | Cybersecurity — …",
 * trimmed to SKILL_LEVELS_MAX.
 */
export function skillLevelsText(save: SaveData): string {
  const per = PATHWAYS.map((p) => ({ name: p.name, id: p.id, text: pathwaySkillLevels(save, p.id) })).filter((x) => x.text);
  if (per.length === 0) return "";
  if (per.length === 1 && per[0].id === "help-desk") return per[0].text;
  const text = per.map((x) => `${x.name} — ${x.text}`).join(" | ");
  return text.length <= SKILL_LEVELS_MAX ? text : `${text.slice(0, SKILL_LEVELS_MAX - 1)}…`;
}

export function resultFields(result: ShiftResult, playerName: string, playerRecordId: string): Record<string, unknown> {
  const pathway = PATHWAY_NAMES.get(result.pathway) ?? result.pathway;
  const outcome = OUTCOMES[result.status] ?? result.status;
  return {
    [RESULT_FIELDS.summary]: `${shortName(playerName)} · ${pathway} · ${summaryTail(result)}`,
    [RESULT_FIELDS.pathway]: pathway,
    [RESULT_FIELDS.encounter]: encounterColumn(result.encounterId),
    [RESULT_FIELDS.outcome]: outcome,
    [RESULT_FIELDS.stars]: rating(result.stars),
    [RESULT_FIELDS.catches]: result.catches,
    [RESULT_FIELDS.falseAlarms]: result.falseAlarms,
    [RESULT_FIELDS.misses]: result.misses,
    [RESULT_FIELDS.playedAt]: result.at,
    [RESULT_FIELDS.player]: [playerRecordId],
    ...optionalResultFields(result),
  };
}

/**
 * Keys of the player's Shift Results rows among `ids` (the newest linked rows). Used when an
 * earlier save wrote rows but then failed before recording them, so they are not written twice.
 */
async function existingRowKeys(cfg: Config, playerRecordId: string, ids: string[]): Promise<Set<string>> {
  const keys = new Set<string>();
  const formula = recordIdsFormula(ids);
  if (!formula) return keys;
  const res = await request<ListResponse>(cfg, "GET", RESULTS_TABLE, {
    query: [
      ["filterByFormula", formula],
      ["returnFieldsByFieldId", "true"],
      ["pageSize", "100"],
      ["fields[]", RESULT_FIELDS.player],
      ["fields[]", RESULT_FIELDS.pathway],
      ["fields[]", RESULT_FIELDS.encounter],
      ["fields[]", RESULT_FIELDS.playedAt],
    ],
  });
  for (const r of res.records ?? []) {
    if (!isPlainObject(r?.fields) || !linkIds(r.fields[RESULT_FIELDS.player]).includes(playerRecordId)) continue;
    const at = toIso(r.fields[RESULT_FIELDS.playedAt]);
    if (at) keys.add(rowKey(str(r.fields[RESULT_FIELDS.pathway]), at, str(r.fields[RESULT_FIELDS.encounter])));
  }
  return keys;
}

/* ------------------------------------------------------------------ */
/* Per-instance memory of known players                                */
/* ------------------------------------------------------------------ */

type Known = { recordId: string; info: StoredInfo; at: number };
const known = new Map<string, Known>();

function knownKey(cfg: Config, playerId: string): string {
  return `${cfg.baseId}:${playerId}`;
}

function remember(key: string, value: Known) {
  known.delete(key);
  known.set(key, value);
  while (known.size > KNOWN_MAX) {
    const oldest = known.keys().next().value;
    if (oldest === undefined) break;
    known.delete(oldest);
  }
}

/* ------------------------------------------------------------------ */
/* Storage API (same shape as ./db)                                    */
/* ------------------------------------------------------------------ */

/** Store a new player. Every sign-up is a new row: emails are unverified, so we never merge by email. */
export function createPlayer(playerId: string, lead: LeadInput, now = new Date(airtableTiming.now())): Promise<WriteOutcome> {
  if (!isUuid(playerId)) return Promise.resolve({ stored: false });
  return withAirtable<WriteOutcome>(
    "create-player",
    { stored: false },
    async (cfg) => {
      const at = now.toISOString();
      await createRecords(cfg, PLAYERS_TABLE, [
        {
          [PLAYER_FIELDS.name]: lead.name,
          [PLAYER_FIELDS.email]: lead.email,
          [PLAYER_FIELDS.marketingOptIn]: lead.marketingOptIn,
          [PLAYER_FIELDS.signedUp]: at,
          [PLAYER_FIELDS.lastPlayed]: at,
          [PLAYER_FIELDS.shiftsPlayed]: 0,
          [PLAYER_FIELDS.shiftsWon]: 0,
          [PLAYER_FIELDS.playerId]: playerId.toLowerCase(),
        },
      ]);
      return { stored: true };
    },
    (sec) => ({ stored: false, retryAfterSec: sec }),
  );
}

/**
 * Load a player's save. `cloud` is true only when Airtable answered and the player exists, so the
 * client pushes saves only when they can actually be stored. A temporary failure also carries
 * `retryAfterSec` (the player may well exist).
 */
export function loadCloudSave(playerId: string): Promise<LoadOutcome> {
  if (!isUuid(playerId)) return Promise.resolve({ cloud: false, save: null });
  return withAirtable<LoadOutcome>(
    "load-save",
    { cloud: false, save: null },
    async (cfg) => {
      const [rec] = await findPlayers(cfg, playerId, [
        PLAYER_FIELDS.name,
        PLAYER_FIELDS.email,
        PLAYER_FIELDS.marketingOptIn,
        PLAYER_FIELDS.signedUp,
        PLAYER_FIELDS.saveData,
      ]);
      if (!rec) return { cloud: false, save: null };
      const f = rec.fields;
      const profile: SaveProfile = {
        name: str(f[PLAYER_FIELDS.name]),
        email: str(f[PLAYER_FIELDS.email]),
        guest: false,
        consentAt: toIso(f[PLAYER_FIELDS.signedUp]) ?? toIso(rec.createdTime),
        marketingOptIn: f[PLAYER_FIELDS.marketingOptIn] === true,
      };
      const raw = f[PLAYER_FIELDS.saveData];
      if (typeof raw !== "string" || !raw.trim()) return { cloud: true, save: null, profile };
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        return { cloud: true, save: null, profile };
      }
      const checked = validateSave(data, { envelope: false });
      if (!checked.ok) return { cloud: true, save: null, profile };
      return { cloud: true, save: { ...checked.value, playerId, profile }, profile };
    },
    (sec) => ({ cloud: false, save: null, retryAfterSec: sec }),
  );
}

async function patchPlayer(cfg: Config, recordId: string, blob: SaveData, packed: Packed | null, now: Date): Promise<void> {
  const at = now.toISOString();
  const summary = saveSummary(blob);
  await request(cfg, "PATCH", PLAYERS_TABLE, {
    recordId,
    body: {
      fields: {
        [PLAYER_FIELDS.lastPlayed]: at,
        [PLAYER_FIELDS.shiftsPlayed]: summary.played,
        [PLAYER_FIELDS.shiftsWon]: summary.won,
        [PLAYER_FIELDS.bestStars]: rating(summary.bestStars),
        ...(OPTIONAL_PLAYER_FIELDS.skillLevels ? { [OPTIONAL_PLAYER_FIELDS.skillLevels]: skillLevelsText(blob) } : {}),
        ...(packed ? { [PLAYER_FIELDS.saveData]: packed.json, [PLAYER_FIELDS.saveUpdated]: at } : {}),
      },
      returnFieldsByFieldId: true,
    },
  });
}

/**
 * Store a save for an existing player: the save blob, the summary columns, and one Shift Results
 * row per newly finished shift. Not stored when there is no such player, Airtable is off, or a
 * request failed (then with `retryAfterSec` if worth retrying; the client keeps its copy).
 *
 * Result rows are written before the save. If the save write then fails, the rows exist but the
 * stored save does not list them; the save's `resultRows` count then trails the player's linked
 * rows, and the next push checks those newest rows first so nothing is written twice.
 */
export function storeCloudSave(playerId: string, save: SaveData, now = new Date(airtableTiming.now())): Promise<WriteOutcome> {
  if (!isUuid(playerId)) return Promise.resolve({ stored: false });
  const id = playerId.toLowerCase();
  return serialize(id, () =>
    withAirtable<WriteOutcome>(
      "store-save",
      { stored: false },
      async (cfg) => {
        const key = knownKey(cfg, id);
        const blob: SaveData = { ...save, playerId: id, profile: null };
        const nowMs = now.getTime();

        // Routine push (no newly finished shift) for a player this instance stored recently:
        // one PATCH, no lookup. A deleted player makes the PATCH fail (404), never recreates a row.
        const cached = known.get(key);
        if (cached && nowMs - cached.at < KNOWN_TTL_MS && freshResults(blob, cached.info, nowMs).length === 0) {
          const packed = packSaveData(blob, cached.info.meta);
          try {
            await patchPlayer(cfg, cached.recordId, blob, packed, now);
          } catch (err) {
            known.delete(key);
            throw err;
          }
          if (packed) remember(key, { ...cached, info: readStored(packed.json) });
          return { stored: true };
        }

        const [rec] = await findPlayers(cfg, id, [PLAYER_FIELDS.name, PLAYER_FIELDS.saveData, PLAYER_FIELDS.results]);
        if (!rec) {
          known.delete(key);
          return { stored: false };
        }
        const stored = readStored(rec.fields[PLAYER_FIELDS.saveData]);
        const linked = linkIds(rec.fields[PLAYER_FIELDS.results]);

        // Browser-supplied history: cap rows per save (newest win) and per player per day.
        let fresh = freshResults(blob, stored, nowMs);
        const day = now.toISOString().slice(0, 10);
        const today = stored.meta.rowsDay === day ? (stored.meta.rowsToday ?? 0) : 0;
        const room = Math.max(0, Math.min(MAX_NEW_RESULTS_PER_SAVE, RESULT_ROWS_PER_DAY - today));
        if (fresh.length > room) {
          console.warn(`[human-loop] airtable store-save: skipped ${fresh.length - room} Shift Results row(s) over the per-save or daily cap.`);
          fresh = room > 0 ? fresh.slice(-room) : [];
        }

        // An earlier save may have written rows and then failed: skip shifts already in the table.
        const recorded = stored.meta.resultRows ?? 0;
        if (fresh.length && linked.length > recorded) {
          const tail = linked.slice(-Math.min(MAX_ROW_LOOKUP, linked.length - recorded + MAX_NEW_RESULTS_PER_SAVE));
          const existing = await existingRowKeys(cfg, rec.id, tail);
          fresh = fresh.filter((r) => !existing.has(resultRowKey(r)));
        }

        const meta: ServerMeta = {
          ...stored.meta,
          resultRows: linked.length + fresh.length,
          rowsDay: day,
          rowsToday: today + fresh.length,
        };
        const packed = packSaveData(blob, meta);
        if (packed) {
          const name = str(rec.fields[PLAYER_FIELDS.name]);
          await createRecords(
            cfg,
            RESULTS_TABLE,
            fresh.map((r) => resultFields(r, name, rec.id)),
          );
        } else {
          console.warn("[human-loop] airtable store-save: save too large for Airtable, stored the summary only.");
        }

        await patchPlayer(cfg, rec.id, blob, packed, now);
        remember(key, { recordId: rec.id, info: packed ? readStored(packed.json) : stored, at: nowMs });
        return { stored: true };
      },
      (sec) => ({ stored: false, retryAfterSec: sec }),
    ),
  );
}

/**
 * Delete a player, their save and their Shift Results rows. True when the data is gone (or
 * Airtable is off); false only when Airtable could not be reached, so the caller can say so.
 */
export function deletePlayer(playerId: string): Promise<boolean> {
  const config = airtableConfig();
  if (!config || !isUuid(playerId)) return Promise.resolve(true);
  const id = playerId.toLowerCase();
  known.delete(knownKey(config, id));
  return serialize(id, () =>
    withAirtable("delete-player", false, async (cfg) => {
      known.delete(knownKey(cfg, id));
      const recs = await findPlayers(cfg, id, [PLAYER_FIELDS.results]);
      await deleteRecords(
        cfg,
        RESULTS_TABLE,
        recs.flatMap((r) => linkIds(r.fields[PLAYER_FIELDS.results])),
      );
      await deleteRecords(
        cfg,
        PLAYERS_TABLE,
        recs.map((r) => r.id),
      );
      return true;
    }),
  );
}

/**
 * Enforce the retention promise: delete players (and their Shift Results) whose Last played is
 * more than RETENTION_MONTHS ago, and Shift Results rows no longer linked to any player. Runs at
 * most once a day per server instance, unless `force` (the daily cron). Returns how many players
 * were deleted.
 */
export async function maybePurgeStalePlayers(now = Date.now(), force = false): Promise<number> {
  if (!airtableConfig() || (!force && now - lastPurgeAt < PURGE_EVERY_MS)) return 0;
  lastPurgeAt = now;
  let purged = 0;
  let orphans = 0;
  await withAirtable("purge", undefined, async (cfg) => {
    const query: Query = [
      ["filterByFormula", purgeFormula()],
      ["returnFieldsByFieldId", "true"],
      ["pageSize", String(PURGE_PAGE_SIZE)],
      ["fields[]", PLAYER_FIELDS.results],
    ];
    // Deleted rows drop out of the filter, so each round asks for the first page again.
    while (purged < PURGE_MAX_PLAYERS) {
      const res = await request<ListResponse>(cfg, "GET", PLAYERS_TABLE, { query });
      const recs = (res.records ?? []).filter((r) => typeof r?.id === "string" && RECORD_ID_RE.test(r.id));
      if (!recs.length) break;
      await deleteRecords(
        cfg,
        RESULTS_TABLE,
        recs.flatMap((r) => linkIds(isPlainObject(r.fields) ? r.fields[PLAYER_FIELDS.results] : undefined)),
      );
      await deleteRecords(
        cfg,
        PLAYERS_TABLE,
        recs.map((r) => r.id),
      );
      for (const k of [...known.keys()]) if (k.startsWith(`${cfg.baseId}:`)) known.delete(k);
      purged += recs.length;
      if (recs.length < PURGE_PAGE_SIZE) break;
    }

    const orphanQuery: Query = [
      ["filterByFormula", unlinkedResultsFormula()],
      ["returnFieldsByFieldId", "true"],
      ["pageSize", String(PURGE_PAGE_SIZE)],
      ["fields[]", RESULT_FIELDS.player],
    ];
    while (orphans < PURGE_MAX_RESULTS) {
      const res = await request<ListResponse>(cfg, "GET", RESULTS_TABLE, { query: orphanQuery });
      const ids = (res.records ?? []).map((r) => r?.id).filter((rid): rid is string => typeof rid === "string" && RECORD_ID_RE.test(rid));
      if (!ids.length) break;
      await deleteRecords(cfg, RESULTS_TABLE, ids);
      orphans += ids.length;
      if (ids.length < PURGE_PAGE_SIZE) break;
    }
  });
  if (purged > 0) console.info(`[human-loop] retention: deleted ${purged} inactive player(s) from Airtable.`);
  if (orphans > 0) console.info(`[human-loop] retention: deleted ${orphans} Shift Results row(s) with no player.`);
  return purged;
}

/** Tests only: forget per-instance state (purge timestamp, pacing, cooldown, known players). */
export function resetAirtableStateForTests(): void {
  lastPurgeAt = 0;
  warnedBadBase = false;
  locks.clear();
  known.clear();
  slots = [];
  coolUntil = 0;
}
