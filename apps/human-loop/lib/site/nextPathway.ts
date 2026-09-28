import { livePathways, type PathwayId } from "@/lib/types";

/**
 * `/play?next=<pathway>`: where to go after "Play now" or a sign-up. Only an exact live pathway id
 * passes (never a URL or a path), so the redirect can only go to `/play/<id>`.
 */
export function safeNextPathway(search: string): PathwayId | null {
  const next = new URLSearchParams(search).get("next");
  if (!next) return null;
  return livePathways().find((p) => p.id === next)?.id ?? null;
}
