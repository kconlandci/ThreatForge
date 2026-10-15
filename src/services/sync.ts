// ============================================================
// ThreatForge — Cloud Sync Service (Phase 1)
// Firestore-backed progress sync + analytics event mirroring.
//
// Offline-first: localStorage remains the fast path; Firestore
// is the durable backup. Anonymous-auth UIDs are per-install,
// so this protects against storage eviction / data-clear on the
// same install — it does NOT restore progress after a reinstall
// (that needs an identity upgrade, e.g. optional Google sign-in).
// ============================================================

import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import type { ThreatForgeProgress, LabProgress } from "../hooks/useProgress";

/** DOM event fired when a cloud pull completes (consumed by useProgress). */
export const CLOUD_PULL_EVENT = "threatforge:cloud-pull";

// --- UID registry (set once Firebase auth is ready) ---

let syncUid: string | null = null;

export function setSyncUid(uid: string | null): void {
  syncUid = uid;
}

// --- Progress pull / push ---

const USERS_COLLECTION = "users";

/** Fetch the user's cloud progress doc. Returns null when absent or offline. */
export async function pullCloudProgress(
  uid: string
): Promise<ThreatForgeProgress | null> {
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (!snap.exists()) return null;
    return snap.data() as ThreatForgeProgress;
  } catch (err) {
    console.warn("[ThreatForge] Cloud pull failed (offline?)", err);
    return null;
  }
}

/** Write the full progress doc. Client merges first; this overwrites. */
export async function pushCloudProgress(
  uid: string,
  progress: ThreatForgeProgress
): Promise<void> {
  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), { ...progress, userId: uid });
  } catch (err) {
    console.warn("[ThreatForge] Cloud push failed (offline?)", err);
  }
}

// Debounced push — coalesces rapid successive saves. No-op until auth is ready.
let pushTimer: ReturnType<typeof setTimeout> | null = null;
const PUSH_DEBOUNCE_MS = 2000;

export function queueCloudPush(progress: ThreatForgeProgress): void {
  if (!syncUid) return;
  const uid = syncUid;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushCloudProgress(uid, progress);
  }, PUSH_DEBOUNCE_MS);
}

// --- Merge ---
//
// Conflicts are rare in Phase 1 (anonymous UID is per-install), so this
// favors safety over cleverness: per-lab max() for scores/attempts,
// union for tags/history, and the newer record wins for time-dependent
// fields like streaks.

export function mergeProgress(
  local: ThreatForgeProgress,
  remote: ThreatForgeProgress
): ThreatForgeProgress {
  const mergedLabs: Record<string, LabProgress> = { ...local.labs };

  for (const [labId, rLab] of Object.entries(remote.labs)) {
    const lLab = mergedLabs[labId];
    if (!lLab) {
      mergedLabs[labId] = rLab;
      continue;
    }
    const remoteAttemptNewer = rLab.completedAt >= lLab.completedAt;
    mergedLabs[labId] = {
      ...rLab,
      labId,
      completed: lLab.completed || rLab.completed,
      bestScore: Math.max(lLab.bestScore, rLab.bestScore),
      attempts: Math.max(lLab.attempts, rLab.attempts),
      lastAttemptDate:
        rLab.lastAttemptDate > lLab.lastAttemptDate
          ? rLab.lastAttemptDate
          : lLab.lastAttemptDate,
      completedAt: Math.max(lLab.completedAt, rLab.completedAt),
      scenarioResults: remoteAttemptNewer
        ? rLab.scenarioResults
        : lLab.scenarioResults,
    };
  }

  const remoteNewer =
    new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime();
  const base = remoteNewer ? remote : local;

  // xpHistory: union by unique key (date|labId|amount)
  const seen = new Set<string>();
  const xpHistory = [...local.xpHistory, ...remote.xpHistory].filter((e) => {
    const key = `${e.date}|${e.labId}|${e.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // judgmentTags: union
  const judgmentTags = Array.from(
    new Set([...local.judgmentTags, ...remote.judgmentTags])
  );

  return {
    ...base,
    schemaVersion: Math.max(local.schemaVersion, remote.schemaVersion),
    userId: local.userId ?? remote.userId,
    labs: mergedLabs,
    // XP only ever grows; take max to avoid double-counting across devices
    xp: Math.max(local.xp, remote.xp),
    xpHistory,
    // Streaks are time-dependent — trust the newer record, but never shrink the best
    streakDays: base.streakDays,
    longestStreak: Math.max(local.longestStreak, remote.longestStreak),
    lastLabDate:
      (remote.lastLabDate ?? "") > (local.lastLabDate ?? "")
        ? remote.lastLabDate
        : local.lastLabDate,
    judgmentTags,
    createdAt:
      local.createdAt < remote.createdAt ? local.createdAt : remote.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

// --- Analytics mirroring (Phase 1b) ---
//
// Same pipe, new destination: analytics events land in the user's
// `events` subcollection so funnel/drop-off become visible in the
// Firebase console. Fire-and-forget — never blocks UI, never throws.

export function mirrorEventToCloud(event: Record<string, unknown>): void {
  if (!syncUid) return;
  const uid = syncUid;
  addDoc(collection(db, USERS_COLLECTION, uid, "events"), {
    ...event,
    receivedAt: Date.now(),
  }).catch((err) => {
    console.warn("[ThreatForge] Cloud event mirror failed", err);
  });
}
