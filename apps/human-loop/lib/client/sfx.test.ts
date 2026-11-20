/**
 * Sound effects in lib/client/sfx.ts: every stage effect has a short, soft recipe (pure data), the
 * on/off choice is off unless the player turns it on, and playing never throws, with or without
 * Web Audio. A tiny fake AudioContext counts the notes that would sound.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FxMessage, FxName, VignetteFamily } from "@/lib/game/bus";

const FX: FxName[] = ["inspect", "catch", "risk", "execute-safe", "false-alarm", "escalate", "rollback", "win", "lose"];
const VIGNETTES: VignetteFamily[] = ["leak", "report", "system"];

async function freshModule() {
  vi.resetModules();
  return import("./sfx");
}

/** Every message shape the stage sends (each fx, risk per vignette, a clean win), at several intensities. */
function allMessages(): FxMessage[] {
  const base: FxMessage[] = [
    ...FX.map((fx): FxMessage => ({ type: "fx", fx })),
    ...VIGNETTES.map((vignette): FxMessage => ({ type: "fx", fx: "risk", vignette })),
    { type: "fx", fx: "win", clean: true },
  ];
  return base.flatMap((m) => [m, ...[0, 0.5, 1, -3, 7, Number.NaN].map((intensity) => ({ ...m, intensity }))]);
}

/* ------------------------------------------------------------------ */
/* A minimal fake browser                                               */

class FakeParam {
  value = 0;
  setValueAtTime() {
    return this;
  }
  linearRampToValueAtTime() {
    return this;
  }
  exponentialRampToValueAtTime() {
    return this;
  }
}

class FakeNode {
  connect<T>(next: T): T {
    return next;
  }
  disconnect() {
    return undefined;
  }
}

let contexts: FakeAudioContext[];
let oscillators: number;
let visibility: "visible" | "hidden";

class FakeAudioContext {
  state: "running" | "suspended" | "closed" = "suspended";
  currentTime = 0;
  destination = new FakeNode();
  /** Set true to make every new note fail (a broken audio stack). */
  broken = false;
  constructor() {
    contexts.push(this);
  }
  createGain() {
    return Object.assign(new FakeNode(), { gain: new FakeParam() });
  }
  createOscillator() {
    if (this.broken) throw new Error("audio stack gone");
    oscillators += 1;
    return Object.assign(new FakeNode(), { type: "sine", frequency: new FakeParam(), onended: null, start() {}, stop() {} });
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
}

/** A browser window: storage "ok" (with an optional saved choice) or "throws" (blocked), Web Audio or not. */
function stubBrowser(opts: { storage?: "ok" | "throws"; saved?: "on" | "off"; audio?: boolean } = {}) {
  const store = new Map<string, string>();
  if (opts.saved) store.set("human-loop:sfx", opts.saved);
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
  const win: Record<string, unknown> = {};
  if (opts.storage === "throws") {
    Object.defineProperty(win, "localStorage", {
      get() {
        throw new Error("SecurityError: storage blocked");
      },
    });
  } else {
    win.localStorage = localStorage;
  }
  if (opts.audio) win.AudioContext = FakeAudioContext;
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    get visibilityState() {
      return visibility;
    },
  });
  return store;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-20T18:00:00.000Z"));
  contexts = [];
  oscillators = 0;
  visibility = "visible";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/* ------------------------------------------------------------------ */

describe("sfxRecipe", () => {
  it("gives every effect a short, soft recipe", async () => {
    const { sfxRecipe } = await freshModule();
    for (const msg of allMessages()) {
      const r = sfxRecipe(msg);
      const label = JSON.stringify(msg);
      expect(r, label).not.toBeNull();
      if (!r) continue;
      expect(r.notes.length, label).toBeGreaterThan(0);
      const long = msg.fx === "win" || msg.fx === "lose";
      for (const n of r.notes) {
        expect(n.freq, label).toBeGreaterThanOrEqual(40);
        expect(n.freq, label).toBeLessThanOrEqual(5000);
        if (n.slideTo !== undefined) {
          expect(n.slideTo, label).toBeGreaterThanOrEqual(40);
          expect(n.slideTo, label).toBeLessThanOrEqual(5000);
        }
        expect(n.at, label).toBeGreaterThanOrEqual(0);
        expect(n.dur, label).toBeGreaterThan(0);
        expect(n.at + n.dur, label).toBeLessThanOrEqual(long ? 1.3 : 0.6);
        expect(n.gain, label).toBeGreaterThan(0);
        expect(n.gain, label).toBeLessThanOrEqual(0.5);
        // Friendly timbres only: no square or sawtooth.
        expect(["sine", "triangle"], label).toContain(n.type);
      }
    }
  });

  it("adds a sparkle to a clean win", async () => {
    const { sfxRecipe } = await freshModule();
    const win = sfxRecipe({ type: "fx", fx: "win" });
    const clean = sfxRecipe({ type: "fx", fx: "win", clean: true });
    expect(clean?.notes.length).toBeGreaterThan(win?.notes.length ?? Infinity);
    expect(clean?.name).toBe("win:clean");
    expect(win?.name).toBe("win");
  });

  it("sounds a little different for each risk vignette", async () => {
    const { sfxRecipe } = await freshModule();
    const recipes = [undefined, ...VIGNETTES].map((vignette) => sfxRecipe({ type: "fx", fx: "risk", vignette }));
    expect(recipes.map((r) => r?.name)).toEqual(["risk", "risk:leak", "risk:report", "risk:system"]);
    expect(new Set(recipes.map((r) => JSON.stringify(r?.notes))).size).toBe(4);
    // Low and muted: each risk sound is built on a note under 200 Hz.
    for (const r of recipes) expect(Math.min(...(r?.notes ?? []).map((n) => n.freq))).toBeLessThan(200);
  });

  it("scales the level gently with intensity, and clamps it", async () => {
    const { sfxRecipe } = await freshModule();
    const level = (intensity?: number) => sfxRecipe({ type: "fx", fx: "catch", intensity })?.notes[0].gain ?? 0;
    expect(level(1) / level(0)).toBeCloseTo(1.1 / 0.8);
    expect(level(5)).toBeCloseTo(level(1));
    expect(level(-1)).toBeCloseTo(level(0));
    expect(level(Number.NaN)).toBeCloseTo(level());
  });

  it("is pure: the same message gives the same notes", async () => {
    const { sfxRecipe } = await freshModule();
    const msg: FxMessage = { type: "fx", fx: "risk", vignette: "leak", intensity: 0.4 };
    expect(sfxRecipe(msg)).toEqual(sfxRecipe({ ...msg }));
  });
});

describe("sfxPref", () => {
  it("is off without a window (server)", async () => {
    const { sfxPref, setSfxPref } = await freshModule();
    expect(sfxPref()).toBe(false);
    expect(() => setSfxPref(false)).not.toThrow();
  });

  it("is off when storage is blocked, and a choice made in the page still holds", async () => {
    stubBrowser({ storage: "throws" });
    const { sfxPref, setSfxPref } = await freshModule();
    expect(sfxPref()).toBe(false);
    expect(() => setSfxPref(true)).not.toThrow();
    expect(sfxPref()).toBe(true);
  });

  it("is off by default and remembers the choice on the device", async () => {
    const store = stubBrowser();
    const first = await freshModule();
    expect(first.sfxPref()).toBe(false);
    first.setSfxPref(true);
    expect(store.get("human-loop:sfx")).toBe("on");
    const reload = await freshModule();
    expect(reload.sfxPref()).toBe(true);
    reload.setSfxPref(false);
    expect(store.get("human-loop:sfx")).toBe("off");
    expect(reload.sfxPref()).toBe(false);
  });
});

describe("playSfx", () => {
  it("never throws without a window, document or Web Audio", async () => {
    const m = await freshModule();
    expect(() => m.unlockSfx()).not.toThrow();
    expect(() => m.playTestBeep()).not.toThrow();
    for (const msg of allMessages()) expect(() => m.playSfx(msg)).not.toThrow();

    stubBrowser({ saved: "on" });
    const n = await freshModule();
    expect(() => n.unlockSfx()).not.toThrow();
    expect(() => n.playTestBeep()).not.toThrow();
    for (const msg of allMessages()) expect(() => n.playSfx(msg)).not.toThrow();
  });

  it("stays silent (and makes no audio context) while effects are off", async () => {
    stubBrowser({ audio: true });
    const { unlockSfx, playSfx, playTestBeep } = await freshModule();
    unlockSfx();
    playSfx({ type: "fx", fx: "catch" });
    playTestBeep();
    expect(contexts).toHaveLength(0);
    expect(oscillators).toBe(0);
  });

  it("plays once unlocked, with one shared context and the 120 ms repeat limit", async () => {
    stubBrowser({ saved: "on", audio: true });
    const { unlockSfx, playSfx, sfxRecipe } = await freshModule();
    const msg: FxMessage = { type: "fx", fx: "catch" };
    playSfx(msg);
    expect(oscillators).toBe(0); // not unlocked yet

    unlockSfx();
    unlockSfx();
    expect(contexts).toHaveLength(1);
    expect(contexts[0].state).toBe("running");

    playSfx(msg);
    expect(oscillators).toBe(sfxRecipe(msg)?.notes.length);
    playSfx(msg);
    vi.advanceTimersByTime(100);
    playSfx(msg);
    expect(oscillators).toBe(sfxRecipe(msg)?.notes.length);

    // A different effect is not held back.
    playSfx({ type: "fx", fx: "inspect" });
    expect(oscillators).toBe(5);

    vi.advanceTimersByTime(30);
    playSfx(msg);
    expect(oscillators).toBe(8);
  });

  it("stays silent while the page is hidden or the context is asleep", async () => {
    stubBrowser({ saved: "on", audio: true });
    const { unlockSfx, playSfx } = await freshModule();
    unlockSfx();
    visibility = "hidden";
    playSfx({ type: "fx", fx: "win" });
    expect(oscillators).toBe(0);

    visibility = "visible";
    contexts[0].state = "suspended";
    playSfx({ type: "fx", fx: "win" });
    expect(oscillators).toBe(0);

    unlockSfx();
    playSfx({ type: "fx", fx: "win" });
    expect(oscillators).toBeGreaterThan(0);
  });

  it("turning effects off silences them and lets the context rest", async () => {
    stubBrowser({ saved: "on", audio: true });
    const { unlockSfx, playSfx, setSfxPref } = await freshModule();
    unlockSfx();
    setSfxPref(false);
    expect(contexts[0].state).toBe("suspended");
    playSfx({ type: "fx", fx: "lose" });
    expect(oscillators).toBe(0);
  });

  it("never throws when the audio stack fails mid-play", async () => {
    stubBrowser({ saved: "on", audio: true });
    const { unlockSfx, playSfx, playTestBeep } = await freshModule();
    unlockSfx();
    contexts[0].broken = true;
    for (const msg of allMessages()) expect(() => playSfx(msg)).not.toThrow();
    expect(() => playTestBeep()).not.toThrow();
  });

  it("plays the test beep once the context runs", async () => {
    stubBrowser({ saved: "on", audio: true });
    const { playTestBeep, sfxRecipe } = await freshModule();
    playTestBeep();
    await Promise.resolve();
    expect(contexts).toHaveLength(1);
    expect(oscillators).toBe(sfxRecipe({ type: "fx", fx: "execute-safe" })?.notes.length);
  });
});
