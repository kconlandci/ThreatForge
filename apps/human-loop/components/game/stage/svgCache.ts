/**
 * Shared SVG text cache for the stage art. No Phaser here, so the game page can start these
 * fetches (lib/client/preloadStage.ts) while the Phaser chunk is still downloading.
 */
import { SPRITES } from "@/lib/game/assets";

const FETCH_TIMEOUT_MS = 8000;
const svgCache = new Map<string, Promise<string | null>>();

export function fetchSvg(url: string): Promise<string | null> {
  let p = svgCache.get(url);
  if (!p) {
    p = (async () => {
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = setTimeout(() => ctrl?.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(url, { signal: ctrl?.signal });
        if (!res.ok) return null;
        return await res.text();
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    })();
    svgCache.set(url, p);
    // Let a failed file be retried on the next load (the artist may have fixed it).
    p.then((t) => t === null && svgCache.delete(url));
  }
  return p;
}

/** Start fetching every sprite file (safe to call more than once). */
export function prefetchAllSvgs(): void {
  for (const def of Object.values(SPRITES)) void fetchSvg(def.file);
}
