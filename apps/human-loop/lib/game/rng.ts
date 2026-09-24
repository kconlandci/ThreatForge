/**
 * Seeded RNG (mulberry32). The whole generator state is one uint32, so it fits in
 * BattleState.rng and survives JSON round-trips. Every function is pure: it takes a
 * state and returns the next state alongside the value.
 */

/** Turn any number (or string) into a well-mixed uint32 starting state. */
export function seedState(seed: number | string): number {
  let h: number;
  if (typeof seed === "string") {
    // FNV-1a over the UTF-16 code units.
    h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  } else {
    h = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
  }
  // murmur3 finalizer, so nearby seeds (1, 2, 3...) start far apart.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** One mulberry32 step: returns a float in [0, 1) and the next state. */
export function nextFloat(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}

/** Integer in [0, n). */
export function nextInt(state: number, n: number): { value: number; state: number } {
  const r = nextFloat(state);
  return { value: Math.floor(r.value * n), state: r.state };
}

/** Fisher-Yates shuffle into a new array. The input array is not touched. */
export function shuffle<T>(items: readonly T[], state: number): { items: T[]; state: number } {
  const out = items.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextInt(s, i + 1);
    s = r.state;
    const j = r.value;
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return { items: out, state: s };
}

/** A fresh, non-deterministic seed for starting a new battle (UI convenience). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
