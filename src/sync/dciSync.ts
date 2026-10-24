// DCI-only remote backup. useProgress retains the local save/Preferences path.
import { Preferences } from "@capacitor/preferences";
import { labCatalog } from "../data/catalog";
import type { ThreatForgeProgress, LabProgress } from "../hooks/useProgress";
import { invalidateDciSession, getDciSession, getSessionEpoch, SYNC_STORAGE_KEY, type DciSession } from "./dciSession";
import { getDciInstallationId } from "./dciInstallation";

export const dciSyncUrl = (import.meta.env.VITE_DCI_SYNC_URL || "/api/dci").replace(/\/+$/, "");
export const CLOUD_PULL_EVENT = "threatforge:cloud-pull";

interface DciRecord {
  labId: string;
  labTitle: string;
  status: "Started" | "Completed";
  xpEarned: number;
  attempts: number;
  firstStartedAt: string | null;
  completedAt: string | null;
}

interface DciProgressResponse {
  records: DciRecord[];
  totals: { labsCompleted: number; totalXp: number };
}

interface SyncState {
  owner: string;
  // Remote XP has no attempt-level history. Offsets carry that baseline while
  // xpHistory remains this device's actual earned-XP history, never fabricated.
  xpOffsets: Record<string, number>;
  firstStarted: Record<string, string>;
  titles: Record<string, string>;
}

let syncUid: string | null = null;
let state: SyncState | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pending: ThreatForgeProgress | null = null;
// Keep this tail across sign-out/reset: an old in-flight POST must finish before
// another request from this installation can start against the same source row.
let progressPostTail: Promise<unknown> = Promise.resolve();

function emptyProgress(userId: string): ThreatForgeProgress {
  const now = new Date().toISOString();
  return { schemaVersion: 2, userId, labs: {}, xp: 0, xpHistory: [], streakDays: 0,
    longestStreak: 0, lastLabDate: null, judgmentTags: [], createdAt: now, updatedAt: now };
}

function readProgress(userId: string): ThreatForgeProgress {
  try {
    const raw = localStorage.getItem("threatforge_progress");
    const value = raw ? JSON.parse(raw) as ThreatForgeProgress : null;
    if (value && value.labs && Array.isArray(value.xpHistory) && (!value.userId || value.userId === userId)) return value;
  } catch { /* Corrupted local data does not prevent sign-in or cloud recovery. */ }
  return emptyProgress(userId);
}

function getState(): SyncState | null {
  const current = getDciSession();
  if (!current) return null;
  if (state?.owner === current.studentId) return state;
  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) as SyncState : null;
    if (saved?.owner === current.studentId && saved.xpOffsets && saved.firstStarted) {
      saved.titles ??= {};
      state = saved;
      return state;
    }
  } catch { /* Metadata can be rebuilt from the server and local history. */ }
  state = { owner: current.studentId, xpOffsets: {}, firstStarted: {}, titles: {} };
  return state;
}

function saveState(): void {
  const current = getDciSession();
  if (!state || current?.studentId !== state.owner) return;
  const value = JSON.stringify(state);
  try { localStorage.setItem(SYNC_STORAGE_KEY, value); } catch { /* Local progress remains authoritative. */ }
  void Preferences.set({ key: SYNC_STORAGE_KEY, value }).catch(() => {});
}

function historyXp(progress: ThreatForgeProgress, labId: string): number {
  return progress.xpHistory.reduce((sum, event) => sum +
    (event.labId === labId && Number.isFinite(event.amount) && event.amount > 0 ? event.amount : 0), 0);
}

function isoTimestamp(value: number): string | null {
  return Number.isFinite(value) && value > 0 ? new Date(value).toISOString() : null;
}

async function sendDci<T>(path: string, init: RequestInit, authenticated: boolean,
  current: DciSession | null, requestEpoch: number): Promise<T | null> {
  if (requestEpoch !== getSessionEpoch() || (authenticated && getDciSession()?.studentId !== current?.studentId)) return null;
  const controller = new AbortController();
  // Source-row verification and summary reconciliation can span several paced
  // Airtable calls. Keep the POST single-flight while those checks complete.
  const timeoutMs = authenticated && path === "/progress" && (init.method ?? "GET").toUpperCase() === "POST" ? 60_000 : 10_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${dciSyncUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(authenticated ? { Authorization: `Bearer ${current!.token}` } : {}), ...init.headers },
      signal: controller.signal,
      cache: "no-store",
    });
    if (requestEpoch !== getSessionEpoch()) return null;
    if (authenticated && response.status === 401) {
      resetDciSync();
      await invalidateDciSession();
      return null;
    }
    if (!response.ok) return null;
    const body = await response.json() as T;
    return requestEpoch === getSessionEpoch() ? body : null;
  } catch { return null; }
  finally { clearTimeout(timeout); }
}

/** Shared client transport: no token, routing ID, logs or visible sync errors. */
export async function requestDci<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T | null> {
  const current = getDciSession();
  if (authenticated && !current) return null;
  const requestEpoch = getSessionEpoch();
  const progressPost = authenticated && path === "/progress" && (init.method ?? "GET").toUpperCase() === "POST";
  if (!progressPost) return sendDci<T>(path, init, authenticated, current, requestEpoch);

  const operation = async (): Promise<T | null> => {
    if (requestEpoch !== getSessionEpoch() || getDciSession()?.studentId !== current?.studentId) return null;
    try {
      if (typeof init.body !== "string") return null;
      const body = JSON.parse(init.body) as unknown;
      if (!body || typeof body !== "object" || Array.isArray(body)) return null;
      const clientId = await getDciInstallationId();
      if (requestEpoch !== getSessionEpoch() || getDciSession()?.studentId !== current?.studentId) return null;
      return sendDci<T>(path, {
        ...init,
        body: JSON.stringify({ ...body, clientId }),
      }, authenticated, current, requestEpoch);
    } catch { return null; }
  };
  const result = progressPostTail.then(operation, operation);
  progressPostTail = result.then(() => undefined, () => undefined);
  return result;
}

export function resetDciSync(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  pending = null;
  state = null;
  syncUid = null;
}

export function setSyncUid(uid: string | null): void {
  if (uid !== syncUid) resetDciSync();
  syncUid = uid;
}

function fromCloud(reply: DciProgressResponse, userId: string): ThreatForgeProgress {
  if (!Array.isArray(reply.records) || !reply.totals || !Number.isFinite(reply.totals.totalXp)) throw new Error("Invalid sync response");
  const local = readProgress(userId);
  const metadata = getState();
  const remote = emptyProgress(userId);
  for (const record of reply.records) {
    if (typeof record.labId !== "string" || !["Started", "Completed"].includes(record.status) ||
      !Number.isFinite(record.xpEarned) || record.xpEarned < 0 || !Number.isFinite(record.attempts) || record.attempts < 0) throw new Error("Invalid progress row");
    if (metadata) {
      metadata.titles[record.labId] = record.labTitle;
      metadata.xpOffsets[record.labId] = Math.max(metadata.xpOffsets[record.labId] ?? 0, record.xpEarned - historyXp(local, record.labId), 0);
      if (record.firstStartedAt && (!metadata.firstStarted[record.labId] || record.firstStartedAt < metadata.firstStarted[record.labId])) {
        metadata.firstStarted[record.labId] = record.firstStartedAt;
      }
    }
    const completedAt = record.completedAt ? Date.parse(record.completedAt) : 0;
    remote.labs[record.labId] = {
      labId: record.labId, completed: record.status === "Completed", attempts: record.attempts,
      completedAt: Number.isFinite(completedAt) ? completedAt : 0,
      lastAttemptDate: record.completedAt?.slice(0, 10) ?? "",
      // Scores/scenario results/streaks are device-only for this pilot. These
      // schema defaults do not claim that the server has an assessment score.
      bestScore: 0, scenarioResults: [],
    };
  }
  remote.xp = Math.max(0, reply.totals.totalXp);
  saveState();
  return remote;
}

export async function pullCloudProgress(uid: string): Promise<ThreatForgeProgress | null> {
  if (getDciSession()?.studentId !== uid) return null;
  const reply = await requestDci<DciProgressResponse>("/progress");
  if (!reply || getDciSession()?.studentId !== uid) return null;
  try { return fromCloud(reply, uid); } catch { return null; }
}

/** Max/union applies only to synced fields; preserve this device's detail. */
export function mergeProgress(local: ThreatForgeProgress, remote: ThreatForgeProgress): ThreatForgeProgress {
  const labs: Record<string, LabProgress> = { ...local.labs };
  for (const [id, cloud] of Object.entries(remote.labs)) {
    const device = labs[id];
    labs[id] = device ? {
      ...device, completed: device.completed || cloud.completed,
      attempts: Math.max(device.attempts, cloud.attempts),
      completedAt: Math.max(device.completedAt, cloud.completedAt),
      lastAttemptDate: device.lastAttemptDate > cloud.lastAttemptDate ? device.lastAttemptDate : cloud.lastAttemptDate,
    } : cloud;
  }
  const metadata = getState();
  const labIds = new Set([
    ...Object.keys(labs), ...Object.keys(metadata?.xpOffsets ?? {}),
    ...local.xpHistory.map(event => event.labId), ...remote.xpHistory.map(event => event.labId),
  ]);
  const unionXp = [...labIds].reduce((sum, labId) => sum + Math.max(
    historyXp(local, labId) + (metadata?.xpOffsets[labId] ?? 0),
    historyXp(remote, labId),
  ), 0);
  return { ...local, userId: remote.userId ?? local.userId, labs, xp: Math.max(local.xp, remote.xp, unionXp), updatedAt: new Date().toISOString() };
}

/** Hydrate before mounting the catalog, avoiding missed cloud-pull events. */
export async function applyCloudProgress(remote: ThreatForgeProgress, notify = false): Promise<ThreatForgeProgress | null> {
  const current = getDciSession();
  if (!current || remote.userId !== current.studentId) return null;
  const savedEpoch = getSessionEpoch();
  const merged = mergeProgress(readProgress(current.studentId), remote);
  const value = JSON.stringify(merged);
  try { localStorage.setItem("threatforge_progress", value); } catch { /* Native backup remains available. */ }
  try { await Preferences.set({ key: "threatforge_progress", value }); } catch { /* Keep the on-device local save. */ }
  if (savedEpoch !== getSessionEpoch()) return null;
  if (notify && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CLOUD_PULL_EVENT, { detail: remote }));
  return merged;
}

export async function pushCloudProgress(uid: string, progress: ThreatForgeProgress): Promise<void> {
  if (getDciSession()?.studentId !== uid || (progress.userId && progress.userId !== uid)) return;
  const metadata = getState();
  if (!metadata) return;
  const ids = new Set([...Object.keys(progress.labs), ...Object.keys(metadata.firstStarted)]);
  const records = [...ids].flatMap<DciRecord>(labId => {
    const lab = progress.labs[labId];
    const title = labCatalog.find(item => item.id === labId)?.title ?? metadata.titles[labId];
    // Preserve known titles; never invent content for an unknown historical ID.
    if (!title) return [];
    return [{
      labId, labTitle: title,
      status: lab?.completed ? "Completed" : "Started",
      xpEarned: historyXp(progress, labId) + (metadata.xpOffsets[labId] ?? 0),
      attempts: lab?.attempts ?? 0,
      firstStartedAt: metadata.firstStarted[labId] ?? null,
      completedAt: lab?.completed ? isoTimestamp(lab.completedAt) : null,
    }];
  });
  if (!records.length) return;
  const reply = await requestDci<DciProgressResponse>("/progress", { method: "POST", body: JSON.stringify({ records }) });
  if (reply && getDciSession()?.studentId === uid) {
    try {
      const remote = fromCloud(reply, uid);
      const current = readProgress(uid);
      const merged = mergeProgress(current, remote);
      const changed = merged.xp > current.xp || Object.entries(merged.labs).some(([id, lab]) => {
        const old = current.labs[id];
        return !old || lab.attempts > old.attempts || (lab.completed && !old.completed) || lab.completedAt > old.completedAt;
      });
      // Notify only material server maxima, not an unchanged acknowledgement;
      // useProgress queues saves after notifications, so this prevents a loop.
      if (changed) await applyCloudProgress(remote, true);
    } catch { /* A response problem never invalidates local work. */ }
  }
}

export function queueCloudPush(progress: ThreatForgeProgress): void {
  const current = getDciSession();
  if (!current || syncUid !== current.studentId) return;
  pending = progress;
  if (pushTimer) clearTimeout(pushTimer);
  const queuedEpoch = getSessionEpoch();
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const next = pending;
    pending = null;
    if (next && queuedEpoch === getSessionEpoch()) void pushCloudProgress(current.studentId, next);
  }, 2000);
}

export function queueSavedProgress(): void {
  const current = getDciSession();
  if (current) queueCloudPush(readProgress(current.studentId));
}

export function mirrorEventToCloud(event: Record<string, unknown>): void {
  const current = getDciSession();
  if (!current || syncUid !== current.studentId || event.type !== "lab_started" || typeof event.labId !== "string" || typeof event.timestamp !== "number") return;
  const metadata = getState();
  const startedAt = isoTimestamp(event.timestamp);
  if (!metadata || !startedAt) return;
  const previous = metadata.firstStarted[event.labId];
  if (!previous || startedAt < previous) metadata.firstStarted[event.labId] = startedAt;
  saveState();
  queueCloudPush(readProgress(current.studentId));
}
