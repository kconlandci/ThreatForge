import { Preferences } from "@capacitor/preferences";
import { setDciStorageOwner } from "./dciPreferences";

export interface DciSession {
  token: string;
  studentId: string;
  name: string;
  pathway: string;
  expiresAt: number;
}

export const SESSION_STORAGE_KEY = "dci_session_v1";
export const OWNER_STORAGE_KEY = "dci_progress_owner_v1";
export const SYNC_STORAGE_KEY = "dci_sync_state_v1";
export const SESSION_CHANGED_EVENT = "dci:session-changed";
const SIGNED_OUT_KEY = "dci_signed_out_v1";
const DEVICE_CACHE_KEYS = [
  "threatforge_progress",
  "threatforge_analytics",
  SYNC_STORAGE_KEY,
];

// These declarations have no storage/network side effects in consumer builds.
let session: DciSession | null = null;
let epoch = 0;
let storageWork: Promise<void> = Promise.resolve();

function readLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* Preferences remains the native-device fallback. */ }
}

function notifySessionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
  }
}

/** Decode only for local expiry/ownership. The API verifies the HMAC. */
export function sessionFromSignIn(value: unknown): DciSession | null {
  try {
    if (!value || typeof value !== "object") return null;
    const data = value as Record<string, unknown>;
    if (typeof data.token !== "string" || typeof data.name !== "string" || typeof data.pathway !== "string") return null;
    const parts = data.token.split(".");
    if (parts.length !== 2) return null;
    const encoded = parts[0].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")), c => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    if (typeof payload.studentId !== "string" || !/^rec[A-Za-z0-9]{14}$/.test(payload.studentId)) return null;
    if (typeof payload.exp !== "number" || !Number.isSafeInteger(payload.exp) || payload.exp * 1000 <= Date.now()) return null;
    return { token: data.token, name: data.name, pathway: data.pathway, studentId: payload.studentId, expiresAt: payload.exp * 1000 };
  } catch { return null; }
}

export function getDciSession(): DciSession | null {
  return session && session.expiresAt > Date.now() ? session : null;
}

export function getSessionEpoch(): number { return epoch; }

async function readPreference(key: string): Promise<string | null> {
  try { return (await Preferences.get({ key })).value; } catch { return null; }
}

async function removePreference(key: string): Promise<void> {
  try { await Preferences.remove({ key }); } catch { /* Local tombstone prevents stale session recovery. */ }
}

function serializeStorage(work: () => Promise<void>): Promise<void> {
  storageWork = storageWork.catch(() => {}).then(work);
  return storageWork;
}

async function clearDeviceCache(): Promise<void> {
  for (const key of DEVICE_CACHE_KEYS) writeLocal(key, null);
  await Promise.all(DEVICE_CACHE_KEYS.map(removePreference));
}

async function restoreDeviceCache(expectedEpoch: number): Promise<void> {
  for (const key of DEVICE_CACHE_KEYS) {
    if (readLocal(key) !== null) continue;
    const value = await readPreference(key);
    if (expectedEpoch !== epoch) return;
    if (value !== null) writeLocal(key, value);
  }
}

export async function restoreDciSession(): Promise<DciSession | null> {
  const startEpoch = epoch;
  await storageWork;
  if (readLocal(SIGNED_OUT_KEY) === "true") return null;
  const raw = readLocal(SESSION_STORAGE_KEY) ?? await readPreference(SESSION_STORAGE_KEY);
  if (startEpoch !== epoch) return null;
  let restored: DciSession | null = null;
  try { restored = raw ? sessionFromSignIn(JSON.parse(raw)) : null; } catch { /* Invalid saved session. */ }
  if (!restored) {
    await invalidateDciSession();
    return null;
  }
  const owner = readLocal(OWNER_STORAGE_KEY) ?? await readPreference(OWNER_STORAGE_KEY);
  if (startEpoch !== epoch) return null;
  if (owner !== restored.studentId) await clearDeviceCache();
  if (startEpoch !== epoch) return null;
  setDciStorageOwner(restored.studentId);
  session = restored;
  writeLocal(OWNER_STORAGE_KEY, restored.studentId);
  writeLocal(SESSION_STORAGE_KEY, JSON.stringify(restored));
  await restoreDeviceCache(startEpoch);
  if (startEpoch !== epoch) return null;
  return restored;
}

export async function saveDciSession(next: DciSession): Promise<void> {
  const nextEpoch = ++epoch;
  session = null;
  setDciStorageOwner(null);
  // A missing owner includes consumer progress, which must never be uploaded
  // as a student's DCI work. Switching accounts also clears device-only detail.
  await serializeStorage(async () => {
    const owner = readLocal(OWNER_STORAGE_KEY) ?? await readPreference(OWNER_STORAGE_KEY);
    if (owner !== next.studentId) await clearDeviceCache();
    if (nextEpoch !== epoch) return;
    setDciStorageOwner(next.studentId);
    await restoreDeviceCache(nextEpoch);
    if (nextEpoch !== epoch) return;
    const raw = JSON.stringify(next);
    writeLocal(SESSION_STORAGE_KEY, raw);
    writeLocal(OWNER_STORAGE_KEY, next.studentId);
    try {
      await Preferences.set({ key: SESSION_STORAGE_KEY, value: raw });
      await Preferences.set({ key: OWNER_STORAGE_KEY, value: next.studentId });
    } catch { /* Web/local storage still permits an on-device session. */ }
    if (nextEpoch !== epoch) return;
    writeLocal(SIGNED_OUT_KEY, null);
    session = next;
  });
}

export async function clearDciSession(): Promise<void> {
  ++epoch;
  session = null;
  setDciStorageOwner(null);
  // Clear synchronously before any in-flight request or React effect can save.
  writeLocal(SIGNED_OUT_KEY, "true");
  writeLocal(SESSION_STORAGE_KEY, null);
  writeLocal(OWNER_STORAGE_KEY, null);
  for (const key of DEVICE_CACHE_KEYS) writeLocal(key, null);
  notifySessionChanged();
  await serializeStorage(async () => {
    await Promise.all([SESSION_STORAGE_KEY, OWNER_STORAGE_KEY, ...DEVICE_CACHE_KEYS].map(removePreference));
  });
}

/** Expired/rejected credentials gate the app without discarding unsynced work.
 * Ownership remains attached to the cache; only that student's reauthentication
 * may reuse it. Explicit Sign out still clears the device via clearDciSession.
 */
export async function invalidateDciSession(): Promise<void> {
  ++epoch;
  const cacheOwner = session?.studentId ?? readLocal(OWNER_STORAGE_KEY);
  session = null;
  // Bump the wrapper generation to reject stale reads, retaining its owner.
  setDciStorageOwner(cacheOwner);
  writeLocal(SIGNED_OUT_KEY, "true");
  writeLocal(SESSION_STORAGE_KEY, null);
  notifySessionChanged();
  await serializeStorage(() => removePreference(SESSION_STORAGE_KEY));
}
