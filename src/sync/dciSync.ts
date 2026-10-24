// DCI progress sync adapter. On-device persistence remains in useProgress.
import type { ThreatForgeProgress } from "../hooks/useProgress";

// TODO: Connect the real DCI sync endpoint in a later step. Until then, all
// remote operations intentionally no-op, even when this URL is configured.
export const dciSyncUrl: string | undefined = import.meta.env.VITE_DCI_SYNC_URL;

export const CLOUD_PULL_EVENT = "threatforge:cloud-pull";

export function setSyncUid(_uid: string | null): void {
  // Remote identity is not used by the stub adapter.
}

export async function pullCloudProgress(
  _uid: string
): Promise<ThreatForgeProgress | null> {
  return null;
}

export async function pushCloudProgress(
  _uid: string,
  _progress: ThreatForgeProgress
): Promise<void> {
  // Local progress is already saved by useProgress.
}

export function queueCloudPush(_progress: ThreatForgeProgress): void {
  // No remote work is scheduled while the endpoint is a stub.
}

export function mergeProgress(
  local: ThreatForgeProgress,
  _remote: ThreatForgeProgress
): ThreatForgeProgress {
  return local;
}

export function mirrorEventToCloud(_event: Record<string, unknown>): void {
  // Analytics continue to be stored locally by useAnalytics.
}
