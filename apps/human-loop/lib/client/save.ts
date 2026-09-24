"use client";

/**
 * Client save — localStorage first, optional cloud sync via /api/progress.
 *
 * API contract (implemented in app/api/*):
 * - POST   /api/lead      {name, email, marketingOptIn, ageConfirmed: true}
 *                         -> {stored: boolean, playerId: string}; sets the httpOnly "hl_pid" cookie.
 * - GET    /api/progress  -> {cloud: boolean, save: SaveData | null}
 * - PUT    /api/progress  {save: SaveData} -> {stored: boolean}
 * - DELETE /api/progress  -> {ok: true}; deletes the player's data and clears the cookie
 *                         (503 {ok: false} when the database can't be reached; the cookie is kept).
 * `cloud: false` / `stored: false` mean the database is not configured (or unreachable).
 */
import type { PathwayId } from "@/lib/types";
import type { PathwayProgress, SaveData, SaveProfile } from "@/lib/game/types";

const KEY = "human-loop:save:v2";
const PUSH_DELAY_MS = 1500;

let memory: SaveData | null = null;
let cloudAvailable = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

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

function isSave(value: unknown): value is SaveData {
  const v = value as SaveData | null;
  return !!v && v.version === 2 && typeof v.playerId === "string" && typeof v.pathways === "object";
}

function persist(save: SaveData) {
  memory = save;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage blocked or full: keep playing from memory.
  }
}

export function emptyPathwayProgress(): PathwayProgress {
  return { introSeen: false, hub: null, battle: null, best: null, attempts: 0, wins: 0, history: [] };
}

export function loadSave(): SaveData {
  if (memory) return memory;
  if (typeof window === "undefined") return freshSave();
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isSave(parsed)) {
      memory = parsed;
      return parsed;
    }
  } catch {
    // Corrupt or blocked storage: start fresh.
  }
  const save = freshSave();
  persist(save);
  return save;
}

function schedulePush() {
  const save = memory;
  if (!save?.profile || save.profile.guest || !cloudAvailable) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const latest = memory;
    if (!latest) return;
    const body = JSON.stringify({ save: latest });
    fetch("/api/progress", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body,
      // Browsers cap keepalive bodies at 64 KB; bigger saves go as a normal request.
      keepalive: body.length < 60_000,
    }).catch(() => {
      // Offline: the next update retries.
    });
  }, PUSH_DELAY_MS);
}

/** Apply an update, persist it, and return the new save. */
export function updateSave(update: (save: SaveData) => SaveData): SaveData {
  const next = { ...update(loadSave()), updatedAt: new Date().toISOString() };
  persist(next);
  schedulePush();
  return next;
}

export function getPathwayProgress(save: SaveData, id: PathwayId): PathwayProgress {
  return save.pathways[id] ?? emptyPathwayProgress();
}

/**
 * Sign up: POST /api/lead. Stores the profile locally either way; returns whether the server
 * stored it (false when the database is not configured or the request failed).
 */
export async function signUp(input: {
  name: string;
  email: string;
  marketingOptIn: boolean;
}): Promise<{ stored: boolean; save: SaveData }> {
  let stored = false;
  let playerId: string | null = null;
  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, ageConfirmed: true }),
    });
    if (res.ok) {
      const body = (await res.json()) as { stored?: boolean; playerId?: string };
      stored = body.stored === true;
      playerId = typeof body.playerId === "string" ? body.playerId : null;
    }
  } catch {
    // Offline: keep the profile locally.
  }
  cloudAvailable = stored;
  const profile: SaveProfile = {
    name: input.name,
    email: input.email,
    guest: false,
    consentAt: new Date().toISOString(),
    marketingOptIn: input.marketingOptIn,
  };
  const save = updateSave((s) => ({ ...s, playerId: playerId ?? s.playerId, profile }));
  return { stored, save };
}

/** Play as a guest: progress stays on this device. */
export function continueAsGuest(): SaveData {
  const profile: SaveProfile = { name: "", email: "", guest: true, consentAt: null, marketingOptIn: false };
  return updateSave((s) => ({ ...s, profile }));
}

/** On app start: if signed up, pull the cloud save and keep whichever is newer. */
export async function syncFromCloud(): Promise<SaveData> {
  const local = loadSave();
  if (!local.profile || local.profile.guest) return local;
  try {
    const res = await fetch("/api/progress", { cache: "no-store" });
    if (!res.ok) return local;
    const body = (await res.json()) as { cloud?: boolean; save?: unknown };
    cloudAvailable = body.cloud === true;
    if (isSave(body.save) && body.save.updatedAt > local.updatedAt) {
      persist(body.save);
      return body.save;
    }
    if (cloudAvailable) {
      memory = local;
      schedulePush();
    }
  } catch {
    // Offline: local save wins.
  }
  return loadSave();
}

/**
 * Forget everything on this device (and the player cookie / server copy).
 * `serverDeleted` is false when the server could not confirm the delete (offline or database down).
 */
export async function resetSave(): Promise<{ save: SaveData; serverDeleted: boolean }> {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  let serverDeleted = false;
  try {
    const res = await fetch("/api/progress", { method: "DELETE" });
    serverDeleted = res.ok;
  } catch {
    // Offline: local reset still happens.
  }
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  memory = null;
  cloudAvailable = false;
  return { save: loadSave(), serverDeleted };
}

export type { SaveData, SaveProfile };
