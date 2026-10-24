// DCI-only Vite alias. Serialize native cache access so an in-flight save or
// recovery cannot resurrect a signed-out student's data on a shared device.
import { Preferences as NativePreferences, type PreferencesPlugin } from "@capacitor/preferences/dist/esm/index.js";

let owner: string | null = null;
let generation = 0;
let work: Promise<unknown> = Promise.resolve();
const protectedKeys = new Set(["threatforge_progress", "threatforge_analytics", "dci_sync_state_v1"]);

export function setDciStorageOwner(next: string | null): void {
  owner = next;
  ++generation;
}

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = work.catch(() => {}).then(operation);
  work = result;
  return result;
}

function belongsToOwner(key: string, value: string, expectedOwner: string | null): boolean {
  if (!expectedOwner) return false;
  try {
    const data = JSON.parse(value) as Record<string, unknown>;
    if (key === "dci_sync_state_v1") return data.owner === expectedOwner;
    if (key === "threatforge_progress") {
      return data.userId === expectedOwner || (!data.userId && data.labs !== null &&
        typeof data.labs === "object" && !Array.isArray(data.labs) && Object.keys(data.labs).length === 0);
    }
    return true;
  } catch { return false; }
}

const get: PreferencesPlugin["get"] = options => {
  const startedGeneration = generation;
  const startedOwner = owner;
  return serialized(async () => {
    if (protectedKeys.has(options.key) && (!startedOwner || startedGeneration !== generation)) return { value: null };
    const result = await NativePreferences.get(options);
    if (protectedKeys.has(options.key) && (startedGeneration !== generation || !result.value || !belongsToOwner(options.key, result.value, startedOwner))) return { value: null };
    return result;
  });
};

const set: PreferencesPlugin["set"] = options => {
  const startedGeneration = generation;
  const startedOwner = owner;
  return serialized(async () => {
    if (protectedKeys.has(options.key) && (startedGeneration !== generation || !belongsToOwner(options.key, options.value, startedOwner))) return;
    await NativePreferences.set(options);
  });
};

const remove: PreferencesPlugin["remove"] = options => serialized(() => NativePreferences.remove(options));

export const Preferences: PreferencesPlugin = new Proxy(NativePreferences, {
  get(target, property, receiver) {
    if (property === "get") return get;
    if (property === "set") return set;
    if (property === "remove") return remove;
    return Reflect.get(target, property, receiver);
  },
});
