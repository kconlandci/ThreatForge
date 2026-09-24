/**
 * Best-effort, in-memory, fixed-window rate limiting.
 *
 * On Vercel each server instance keeps its own counters, so this slows down scripted abuse; it is
 * not a hard global limit. Memory is bounded: expired windows are swept and the key count is capped.
 */

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export type RateLimiter = {
  check(key: string, now?: number): RateLimitResult;
  reset(): void;
};

export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }): RateLimiter {
  const { limit, windowMs } = opts;
  const maxKeys = opts.maxKeys ?? 5000;
  const windows = new Map<string, { count: number; resetAt: number }>();

  function sweep(now: number) {
    for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
    // Still full after the sweep: drop the oldest keys (Map keeps insertion order).
    while (windows.size >= maxKeys) {
      const oldest = windows.keys().next().value;
      if (oldest === undefined) break;
      windows.delete(oldest);
    }
  }

  return {
    check(key, now = Date.now()) {
      let w = windows.get(key);
      if (!w || w.resetAt <= now) {
        if (!w && windows.size >= maxKeys) sweep(now);
        w = { count: 0, resetAt: now + windowMs };
        windows.delete(key);
        windows.set(key, w);
      }
      w.count += 1;
      if (w.count > limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((w.resetAt - now) / 1000)) };
      return { ok: true };
    },
    reset() {
      windows.clear();
    },
  };
}

/**
 * The client's IP for rate limiting only (never stored). Vercel sets x-forwarded-for / x-real-ip
 * itself, so clients cannot spoof them there.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/**
 * Sign-ups per IP per 10 minutes. Default 30, not 10: at a demo or in a classroom, a whole room
 * often shares one Wi-Fi IP, and we do not want the 11th person to lose cloud save. Override with
 * LEAD_RATE_LIMIT_PER_10_MIN.
 */
export const leadLimiter = createRateLimiter({
  limit: envInt("LEAD_RATE_LIMIT_PER_10_MIN", 30, 1, 10_000),
  windowMs: 10 * 60 * 1000,
});

/** Cloud save writes per player per minute. The client debounces to one every 1.5 s at most. */
export const saveLimiter = createRateLimiter({ limit: 60, windowMs: 60 * 1000 });
