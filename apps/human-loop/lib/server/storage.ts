/**
 * Picks where sign-ups and cloud saves are stored. The one place that decides; routes call this
 * module, never ./db or ./airtable directly.
 *
 * 1. DATABASE_URL or POSTGRES_URL set -> Neon Postgres (./db).
 * 2. else AIRTABLE_TOKEN set          -> Airtable (./airtable), DCI's recommended setup.
 * 3. else                             -> "no-op mode": nothing is stored on the server and the
 *                                        game saves progress in the browser only.
 *
 * Both backends share one contract: they never throw, and report failures as "not stored".
 * Airtable also reports a temporary failure (rate limit, outage, timeout) with `retryAfterSec`,
 * so the routes can ask the browser to try again later; Postgres failures are plain "not stored".
 */
import type { SaveData } from "@/lib/game/types";
import * as airtable from "./airtable";
import * as postgres from "./db";
import type { LoadOutcome, WriteOutcome } from "./airtable";
import type { CloudLoad } from "./db";
import type { LeadInput } from "./validate";

export type StorageBackend = "postgres" | "airtable" | "none";
export type { CloudLoad, LoadOutcome, WriteOutcome };

/** Read on every call, so a changed environment (or a test stub) takes effect right away. */
export function storageBackend(): StorageBackend {
  if (postgres.isDatabaseConfigured()) return "postgres";
  if (airtable.isAirtableConfigured()) return "airtable";
  return "none";
}

export function isStorageConfigured(): boolean {
  return storageBackend() !== "none";
}

export async function createPlayer(playerId: string, lead: LeadInput): Promise<WriteOutcome> {
  const backend = storageBackend();
  if (backend === "postgres") return { stored: await postgres.createPlayer(playerId, lead) };
  if (backend === "airtable") return airtable.createPlayer(playerId, lead);
  return { stored: false };
}

export function loadCloudSave(playerId: string): Promise<LoadOutcome> {
  const backend = storageBackend();
  if (backend === "postgres") return postgres.loadCloudSave(playerId);
  if (backend === "airtable") return airtable.loadCloudSave(playerId);
  return Promise.resolve({ cloud: false, save: null });
}

export async function storeCloudSave(playerId: string, save: SaveData): Promise<WriteOutcome> {
  const backend = storageBackend();
  if (backend === "postgres") return { stored: await postgres.storeCloudSave(playerId, save) };
  if (backend === "airtable") return airtable.storeCloudSave(playerId, save);
  return { stored: false };
}

/** True when the data is gone (or nothing is stored server-side); false when the store is unreachable. */
export function deletePlayer(playerId: string): Promise<boolean> {
  const backend = storageBackend();
  if (backend === "postgres") return postgres.deletePlayer(playerId);
  if (backend === "airtable") return airtable.deletePlayer(playerId);
  return Promise.resolve(true);
}

export async function maybePurgeStalePlayers(now = Date.now(), force = false): Promise<number> {
  const backend = storageBackend();
  if (backend === "postgres") return (await postgres.maybePurgeStalePlayers(now, force)) ?? 0;
  if (backend === "airtable") return airtable.maybePurgeStalePlayers(now, force);
  return 0;
}
