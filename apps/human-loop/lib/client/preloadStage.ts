"use client";

/**
 * Start downloading the Phaser stage early (it is ~350 KB gzipped), so it is parsed by the
 * time the game screen mounts. Safe to call many times; a failed preload is retried later.
 */
import { SHARED_SPRITES, prefetchSvgs } from "@/components/game/stage/svgCache";

let pending: Promise<unknown> | null = null;

export function preloadStage(): void {
  if (typeof window === "undefined" || pending) return;
  pending = Promise.all([
    import("@/components/game/PhaserStage"),
    import("@/components/game/stage/createStage"),
  ]).catch(() => {
    pending = null;
  });
  // The shared sprite files are small; fetch them alongside the Phaser chunk instead of after it.
  // The game shell prefetches its own pathway's art (stageSprites), never another pathway's.
  prefetchSvgs(SHARED_SPRITES);
}

/** Preload when the browser is idle (falls back to a short timeout). */
export function preloadStageWhenIdle(): () => void {
  if (typeof window === "undefined") return () => {};
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(preloadStage, { timeout: 2500 });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(preloadStage, 1200);
  return () => window.clearTimeout(t);
}
