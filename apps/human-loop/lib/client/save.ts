"use client";

/**
 * Client save — localStorage first, optional cloud sync via /api/progress.
 *
 * API contract (implemented in app/api/*):
 * - POST   /api/lead      {name, email, marketingOptIn, ageConfirmed: true}
 *                         -> {stored: boolean, playerId: string}; sets the httpOnly "hl_pid" cookie.
 * - GET    /api/progress  -> {cloud: boolean, save: SaveData | null, profile?: SaveProfile | null}
 * - PUT    /api/progress  {save: SaveData} -> {stored: boolean, retry?: true}
 * - DELETE /api/progress  -> {ok: true}; deletes the player's data and clears the cookie
 *                         (503 {ok: false} when the database can't be reached; the cookie is kept).
 * - POST   /api/logout    -> {ok: true}; clears the cookie only (the server data stays).
 * `cloud: false` / `stored: false` mean the database is not configured (or unreachable).
 * `retry: true` (with Retry-After) means storage is only temporarily unavailable: ask again later.
 */
import type { PathwayId } from "@/lib/types";
import type { BattleState, PathwayProgress, SaveData, SaveProfile } from "@/lib/game/types";

const KEY = "human-loop:save:v2";
/**
 * Cloud push pacing, per tab: at most one routine push a minute (trailing, so the newest save
 * always goes out). Airtable allows 5 requests per second per base (with a 30 s penalty when
 * exceeded) and counts calls against a monthly cap, and each push costs 1-4 calls. Finished
 * battles and a tab being hidden or closed push right away.
 */
const PUSH_INTERVAL_MS = 60_000;
/** Short wait even when the interval has passed, so a burst of updates becomes one push. */
const PUSH_SETTLE_MS = 1500;
/** After a push that the server could not store for now: try again after 45-75 s (past Airtable's 30 s penalty). */
const PUSH_RETRY_MIN_MS = 45_000;
const PUSH_RETRY_JITTER_MS = 30_000;

let memory: SaveData | null = null;
let cloudAvailable = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushAt = 0;
let listening = false;
let leadRetryTimer: ReturnType<typeof setTimeout> | null = null;
let syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
let syncRetries = 0;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function freshSave(): SaveData {
  return {
    version: 2,
    playerId: randomId(),
    profile: null,
    pathways: {},
    settings: { reducedMotion: null },
    updatedAt: new Date().toISOString(),
  };
}

function isObj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSave(value: unknown): value is SaveData {
  return (
    isObj(value) &&
    value.version === 2 &&
    typeof value.playerId === "string" &&
    isObj(value.pathways) &&
    isObj(value.settings) &&
    (value.profile === null || value.profile === undefined || isObj(value.profile))
  );
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toProfile(value: unknown): SaveProfile | null {
  if (!isObj(value)) return null;
  return {
    name: typeof value.name === "string" ? value.name : "",
    email: typeof value.email === "string" ? value.email : "",
    guest: value.guest === true,
    consentAt: typeof value.consentAt === "string" ? value.consentAt : null,
    marketingOptIn: value.marketingOptIn === true,
  };
}

/** Fill in and type-check one pathway's progress, so a damaged save can't crash the game. */
function toProgress(value: unknown): PathwayProgress {
  const p = emptyPathwayProgress();
  if (!isObj(value)) return p;
  const hub = value.hub;
  const best = value.best;
  return {
    introSeen: value.introSeen === true,
    hub: isObj(hub) && typeof hub.x === "number" && typeof hub.y === "number" ? { x: hub.x, y: hub.y } : null,
    // Battles are checked in depth (engine canResume) before they are used.
    battle: isObj(value.battle) ? (value.battle as unknown as BattleState) : null,
    pendingResult: isObj(value.pendingResult) ? (value.pendingResult as unknown as BattleState) : null,
    best: isObj(best) && typeof best.stars === "number" ? { stars: best.stars, completedAt: String(best.completedAt ?? "") } : null,
    attempts: num(value.attempts),
    wins: num(value.wins),
    history: Array.isArray(value.history) ? (value.history.filter(isObj) as unknown as PathwayProgress["history"]) : [],
  };
}

function normalize(save: SaveData): SaveData {
  const pathways: SaveData["pathways"] = {};
  for (const [id, p] of Object.entries(save.pathways)) pathways[id as PathwayId] = toProgress(p);
  const rm = (save.settings as Record<string, unknown>).reducedMotion;
  const lead = save.pendingLead;
  return {
    version: 2,
    playerId: save.playerId,
    profile: toProfile(save.profile),
    pathways,
    settings: { reducedMotion: typeof rm === "boolean" ? rm : null },
    updatedAt: typeof save.updatedAt === "string" ? save.updatedAt : new Date(0).toISOString(),
    pendingLead:
      isObj(lead) && typeof lead.name === "string" && typeof lead.email === "string"
        ? {
            name: lead.name,
            email: lead.email,
            marketingOptIn: lead.marketingOptIn === true,
            consentAt: typeof lead.consentAt === "string" ? lead.consentAt : new Date().toISOString(),
          }
        : null,
  };
}

/** The copy in localStorage, or null (missing, damaged, or storage blocked). */
function readStored(): SaveData | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isSave(parsed) ? normalize(parsed) : null;
  } catch {
    return null;
  }
}

function persist(save: SaveData) {
  memory = save;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage blocked or full: keep playing from memory.
  }
}

/** Seconds from a Retry-After header, or 0. */
function retryAfterSec(res: Response): number {
  const n = Number(res.headers.get("retry-after"));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * A push was not stored for a temporary reason: send the newest save again later (unless a push
 * is already waiting). A hidden or closed tab flushes it sooner.
 */
function schedulePushRetry(afterSec = 0) {
  if (pushTimer || !cloudAvailable) return;
  const wait = Math.max(PUSH_RETRY_MIN_MS, afterSec * 1000) + Math.random() * PUSH_RETRY_JITTER_MS;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    sendPush();
  }, wait);
}

function sendPush() {
  const latest = memory;
  if (!latest?.profile || latest.profile.guest || !cloudAvailable) return;
  lastPushAt = Date.now();
  const body = JSON.stringify({ save: latest });
  fetch("/api/progress", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
    // Browsers cap keepalive bodies at 64 KB; bigger saves go as a normal request.
    keepalive: body.length < 60_000,
  })
    .then(async (res) => {
      let retry = res.status === 429 || res.status >= 500;
      if (res.ok) {
        const reply = (await res.json().catch(() => null)) as { retry?: unknown } | null;
        retry = reply?.retry === true;
      }
      if (retry) schedulePushRetry(retryAfterSec(res));
    })
    .catch(() => {
      // Offline: try again later (or with the next update).
      schedulePushRetry();
    });
}

/** Send a waiting cloud push now (the tab is being hidden or closed). */
function flushPush() {
  if (!pushTimer) return;
  clearTimeout(pushTimer);
  pushTimer = null;
  sendPush();
}

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pagehide", flushPush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPush();
  });
  // Another tab changed the save: read it again next time instead of writing back a stale copy.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY || e.key === null) memory = null;
  });
  window.addEventListener("online", () => {
    void retryPendingLead();
  });
}

export function emptyPathwayProgress(): PathwayProgress {
  return {
    introSeen: false,
    hub: null,
    battle: null,
    pendingResult: null,
    best: null,
    attempts: 0,
    wins: 0,
    history: [],
  };
}

export function loadSave(): SaveData {
  if (memory) return memory;
  if (typeof window === "undefined") return freshSave();
  listen();
  const stored = readStored();
  if (stored) {
    memory = stored;
    return stored;
  }
  const save = freshSave();
  persist(save);
  return save;
}

/**
 * Queue a cloud push. Routine updates share one trailing push at most every PUSH_INTERVAL_MS
 * (the timer sends whatever the newest save is when it fires). `immediate` (a battle just ended)
 * sends now and cancels the queued one.
 */
function schedulePush(immediate = false) {
  const save = memory;
  if (!save?.profile || save.profile.guest || !cloudAvailable) return;
  if (immediate) {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = null;
    sendPush();
    return;
  }
  if (pushTimer) return;
  const wait = Math.max(PUSH_SETTLE_MS, lastPushAt + PUSH_INTERVAL_MS - Date.now());
  pushTimer = setTimeout(() => {
    pushTimer = null;
    sendPush();
  }, wait);
}

/** True when `next` has a finished-battle history entry that `prev` does not. */
function addsHistory(prev: SaveData, next: SaveData): boolean {
  const seen = new Set<string>();
  for (const p of Object.values(prev.pathways)) for (const h of p?.history ?? []) seen.add(`${h.at}|${h.encounterId}`);
  for (const p of Object.values(next.pathways)) {
    for (const h of p?.history ?? []) if (!seen.has(`${h.at}|${h.encounterId}`)) return true;
  }
  return false;
}

/**
 * Apply an update, persist it, and return the new save. The update applies to the newest copy:
 * another tab may have written localStorage since this tab last read it.
 */
export function updateSave(update: (save: SaveData) => SaveData): SaveData {
  const mine = loadSave();
  const stored = typeof window === "undefined" ? null : readStored();
  const base = stored && stored.updatedAt >= mine.updatedAt ? stored : mine;
  const next = { ...update(base), updatedAt: new Date().toISOString() };
  persist(next);
  schedulePush(addsHistory(base, next));
  return next;
}

export function getPathwayProgress(save: SaveData, id: PathwayId): PathwayProgress {
  return save.pathways[id] ?? emptyPathwayProgress();
}

type LeadResult = { stored: boolean; playerId: string | null; retry: boolean; retryAfterSec: number };

async function postLead(lead: { name: string; email: string; marketingOptIn: boolean }): Promise<LeadResult> {
  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...lead, ageConfirmed: true }),
    });
    if (res.ok) {
      const body = (await res.json()) as { stored?: boolean; playerId?: string };
      return {
        stored: body.stored === true,
        playerId: typeof body.playerId === "string" ? body.playerId : null,
        retry: false,
        retryAfterSec: 0,
      };
    }
    // Rate limited (a room on one Wi-Fi) or server trouble: keep the sign-up and send it later.
    const retry = res.status === 429 || res.status >= 500;
    const after = Number(res.headers.get("retry-after"));
    return { stored: false, playerId: null, retry, retryAfterSec: Number.isFinite(after) && after > 0 ? after : 60 };
  } catch {
    // Offline: keep the profile locally and send the sign-up later.
    return { stored: false, playerId: null, retry: true, retryAfterSec: 60 };
  }
}

function scheduleLeadRetry(sec: number) {
  if (typeof window === "undefined") return;
  if (leadRetryTimer) clearTimeout(leadRetryTimer);
  // Jitter, so a classroom that signed up together does not retry in the same second.
  leadRetryTimer = setTimeout(
    () => {
      leadRetryTimer = null;
      void retryPendingLead();
    },
    Math.min(sec, 15 * 60) * 1000 * (1 + Math.random() * 0.5),
  );
}

/**
 * The cloud check could not reach storage for now: check again later (30 s doubling to 5 min,
 * with jitter). Only for a signed-up profile whose sign-up already went through.
 */
function scheduleSyncRetry(afterSec = 0) {
  if (typeof window === "undefined" || syncRetryTimer) return;
  const local = loadSave();
  if (!local.profile || local.profile.guest || local.pendingLead) return;
  const base = Math.min(300, Math.max(afterSec, 30 * 2 ** syncRetries));
  syncRetries += 1;
  syncRetryTimer = setTimeout(
    () => {
      syncRetryTimer = null;
      void syncFromCloud({ adopt: false });
    },
    base * 1000 * (1 + Math.random() * 0.5),
  );
}

/**
 * Sign up: POST /api/lead. Stores the profile locally either way; returns whether the server
 * stored it (false when the database is not configured or the request failed). A sign-up that
 * failed for a temporary reason is kept and sent again later (see retryPendingLead).
 */
export async function signUp(input: {
  name: string;
  email: string;
  marketingOptIn: boolean;
}): Promise<{ stored: boolean; save: SaveData }> {
  const r = await postLead(input);
  cloudAvailable = r.stored;
  const consentAt = new Date().toISOString();
  const profile: SaveProfile = {
    name: input.name,
    email: input.email,
    guest: false,
    consentAt,
    marketingOptIn: input.marketingOptIn,
  };
  const save = updateSave((s) => ({
    ...s,
    playerId: r.playerId ?? s.playerId,
    profile,
    pendingLead: r.retry ? { ...input, consentAt } : null,
  }));
  if (r.retry) scheduleLeadRetry(r.retryAfterSec);
  return { stored: r.stored, save };
}

let leadInFlight: Promise<SaveData | null> | null = null;

/** Send a sign-up that could not reach the server before. Returns the new save when it went through. */
export function retryPendingLead(): Promise<SaveData | null> {
  if (leadInFlight) return leadInFlight;
  const pending = loadSave().pendingLead;
  if (!pending) return Promise.resolve(null);
  leadInFlight = (async () => {
    const r = await postLead({ name: pending.name, email: pending.email, marketingOptIn: pending.marketingOptIn });
    if (r.retry) {
      scheduleLeadRetry(r.retryAfterSec);
      return null;
    }
    cloudAvailable = r.stored;
    const save = updateSave((s) =>
      s.pendingLead && s.pendingLead.email === pending.email
        ? { ...s, playerId: r.playerId ?? s.playerId, pendingLead: null }
        : s,
    );
    schedulePush();
    return save;
  })().finally(() => {
    leadInFlight = null;
  });
  return leadInFlight;
}

/** Play as a guest: progress stays on this device. */
export function continueAsGuest(): SaveData {
  const profile: SaveProfile = { name: "", email: "", guest: true, consentAt: null, marketingOptIn: false };
  return updateSave((s) => ({ ...s, profile }));
}

/**
 * On app start: ask the server for this browser's cloud save (the httpOnly cookie is invisible to
 * scripts, so always ask). With `adopt` (the /play page):
 * - no local profile (storage wiped, cookie kept): restore the cloud save, or at least the profile;
 * - signed-up local save: keep whichever is newer.
 * A guest's local progress is never replaced. `restored` is true when the cloud copy was taken.
 */
export async function syncFromCloud(opts: { adopt?: boolean } = {}): Promise<{ save: SaveData; restored: boolean }> {
  const adopt = opts.adopt ?? true;
  try {
    const res = await fetch("/api/progress", { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) scheduleSyncRetry(retryAfterSec(res));
      return { save: loadSave(), restored: false };
    }
    const body = (await res.json()) as { cloud?: boolean; save?: unknown; profile?: unknown; retry?: unknown };
    const local = loadSave();
    if (body.retry === true) {
      // Storage is busy for now, not gone: keep pushing if we were, and check again later.
      scheduleSyncRetry(retryAfterSec(res));
      return { save: local, restored: false };
    }
    syncRetries = 0;
    cloudAvailable = body.cloud === true && !local.profile?.guest;
    if (body.cloud !== true) return { save: local, restored: false };

    const cloud = isSave(body.save) ? normalize(body.save) : null;
    const cloudProfile = toProfile(cloud?.profile ?? body.profile);
    if (adopt && !local.profile && cloudProfile && !cloudProfile.guest) {
      cloudAvailable = true;
      if (cloud) {
        persist({ ...cloud, profile: cloudProfile });
        return { save: memory as SaveData, restored: true };
      }
      return { save: updateSave((s) => ({ ...s, profile: cloudProfile })), restored: true };
    }
    if (local.profile?.guest || !local.profile) return { save: local, restored: false };
    if (adopt && cloud && cloud.updatedAt > local.updatedAt) {
      persist({ ...cloud, profile: cloud.profile ?? local.profile });
      return { save: memory as SaveData, restored: false };
    }
    schedulePush();
  } catch {
    // Offline: local save wins; check again later.
    scheduleSyncRetry();
  }
  return { save: loadSave(), restored: false };
}

function clearLocal(): SaveData {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  if (syncRetryTimer) clearTimeout(syncRetryTimer);
  syncRetryTimer = null;
  syncRetries = 0;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  memory = null;
  cloudAvailable = false;
  return loadSave();
}

/**
 * Delete this player's data: the server copy (for signed-up players) and this device's save.
 * `serverDeleted` is false when the server could not confirm the delete (offline or database
 * down). A signed-up player's local save is then KEPT, so they can try again (nothing is lost
 * and the cookie still points at the server row).
 */
export async function resetSave(): Promise<{ save: SaveData; serverDeleted: boolean }> {
  const current = loadSave();
  const signedUp = !!current.profile && !current.profile.guest;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  let serverDeleted = false;
  try {
    const res = await fetch("/api/progress", { method: "DELETE" });
    serverDeleted = res.ok;
  } catch {
    // Offline.
  }
  if (signedUp && !serverDeleted) return { save: current, serverDeleted: false };
  return { save: clearLocal(), serverDeleted };
}

/**
 * Sign out on this device (a shared classroom or library computer): forget the local save and
 * the player cookie. The server copy and the sign-up are left alone.
 */
export async function signOut(): Promise<SaveData> {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch {
    // Offline: the cookie stays, but this device no longer shows the profile.
  }
  return clearLocal();
}

export type { SaveData, SaveProfile };
