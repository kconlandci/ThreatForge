// Installation routing metadata is independent of student/session/progress.
// This key is deliberately outside the keys removed by DCI Sign out.
import { Preferences } from "@capacitor/preferences";

export const DCI_INSTALLATION_STORAGE_KEY = "dci_installation_v1";
const installationShape = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
let installationWork: Promise<string> | null = null;

function localInstallation(): string | null {
  try {
    const value = localStorage.getItem(DCI_INSTALLATION_STORAGE_KEY);
    return value && installationShape.test(value) ? value : null;
  } catch { return null; }
}

function createInstallation(): string {
  // UUIDv4 uses only the platform's cryptographic random source. No identifier
  // is generated at module import or during the web build.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function loadInstallation(): Promise<string> {
  let native: string | null = null;
  try {
    const { value } = await Preferences.get({ key: DCI_INSTALLATION_STORAGE_KEY });
    if (value && installationShape.test(value)) native = value;
  } catch { /* Browser storage can still preserve this installation. */ }
  // Recheck after the asynchronous native read. Another browser tab may have
  // established this installation while that read was outstanding.
  const local = localInstallation();
  const value = local ?? native ?? createInstallation();
  let persisted = local === value || native === value;
  try {
    localStorage.setItem(DCI_INSTALLATION_STORAGE_KEY, value);
    persisted = true;
  } catch { /* Native preferences may still be available. */ }
  try {
    await Preferences.set({ key: DCI_INSTALLATION_STORAGE_KEY, value });
    persisted = true;
  } catch { /* A durable browser copy is sufficient. */ }
  // Do not create a new server source on every launch if neither storage works.
  if (!persisted) throw new Error("Installation storage unavailable");
  return value;
}

/** Internal transport metadata only: never log or add it to progress records. */
export function getDciInstallationId(): Promise<string> {
  if (!installationWork) {
    installationWork = loadInstallation().catch(() => {
      installationWork = null;
      throw new Error("Installation storage unavailable");
    });
  }
  return installationWork;
}
