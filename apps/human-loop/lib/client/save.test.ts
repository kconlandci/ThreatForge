/**
 * Cloud push pacing in lib/client/save.ts (fake timers and a minimal fake browser): routine
 * updates push at most once a minute per tab, a finished battle pushes right away, a hidden or
 * closed tab flushes the waiting push, and pushes, cloud checks and sign-ups that storage could
 * not take for now are sent again later.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SaveData } from "@/lib/game/types";

type Listener = () => void;

let puts: SaveData[];
let gets: number;
let leads: number;
/** How the fake server answers: "ok", or "busy" (storage temporarily unavailable). */
let server: { put: "ok" | "busy"; get: "ok" | "busy"; lead: "ok" | "busy" };
let windowListeners: Record<string, Listener[]>;
let docListeners: Record<string, Listener[]>;
let visibility: "visible" | "hidden";

async function freshModule() {
  vi.resetModules();
  return import("./save");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-24T18:00:00.000Z"));
  puts = [];
  gets = 0;
  leads = 0;
  server = { put: "ok", get: "ok", lead: "ok" };
  windowListeners = {};
  docListeners = {};
  visibility = "visible";
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    addEventListener: (type: string, fn: Listener) => void (windowListeners[type] ??= []).push(fn),
  });
  vi.stubGlobal("document", {
    get visibilityState() {
      return visibility;
    },
    addEventListener: (type: string, fn: Listener) => void (docListeners[type] ??= []).push(fn),
  });
  const retry = { "Retry-After": "30" };
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    if (url === "/api/lead") {
      leads += 1;
      if (server.lead === "busy") return new Response(JSON.stringify({ error: "later" }), { status: 503, headers: retry });
      return new Response(JSON.stringify({ stored: true, playerId: "0b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c2d" }), { status: 200 });
    }
    if (url === "/api/progress" && init.method === "PUT") {
      puts.push((JSON.parse(String(init.body)) as { save: SaveData }).save);
      if (server.put === "busy") return new Response(JSON.stringify({ stored: false, retry: true }), { status: 200, headers: retry });
      return new Response(JSON.stringify({ stored: true }), { status: 200 });
    }
    if (url === "/api/progress" && !init.method) {
      gets += 1;
      if (server.get === "busy") return new Response(JSON.stringify({ cloud: false, save: null, retry: true }), { status: 200, headers: retry });
      return new Response(JSON.stringify({ cloud: true, save: null }), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function moveHub(save: SaveData, x: number): SaveData {
  const p = save.pathways["help-desk"];
  return {
    ...save,
    pathways: {
      ...save.pathways,
      "help-desk": {
        introSeen: true,
        battle: null,
        best: null,
        attempts: 0,
        wins: 0,
        history: [],
        ...p,
        hub: { x, y: 1 },
      },
    },
  };
}

function finishBattle(save: SaveData): SaveData {
  const p = save.pathways["help-desk"] ?? {
    introSeen: true,
    hub: null,
    battle: null,
    pendingResult: null,
    best: null,
    attempts: 0,
    wins: 0,
    history: [],
  };
  return {
    ...save,
    pathways: {
      ...save.pathways,
      "help-desk": {
        ...p,
        attempts: p.attempts + 1,
        wins: p.wins + 1,
        history: [
          ...p.history,
          { encounterId: "hd-01-monday", status: "won", stars: 3, at: new Date().toISOString(), catches: 1, falseAlarms: 0, misses: 0 },
        ],
      },
    },
  };
}

describe("cloud push pacing", () => {
  it("pushes routine updates at most once a minute (trailing, newest save)", async () => {
    const save = await freshModule();
    await save.signUp({ name: "Jamie Rivera", email: "jamie@example.com", marketingOptIn: false });
    await vi.advanceTimersByTimeAsync(1500);
    expect(puts).toHaveLength(1);

    for (let x = 1; x <= 10; x++) {
      save.updateSave((s) => moveHub(s, x));
      await vi.advanceTimersByTimeAsync(1000);
    }
    // 10 s after the first push: still waiting.
    expect(puts).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(49_900);
    expect(puts).toHaveLength(1);
    // 60 s after the first push: one push with the newest save.
    await vi.advanceTimersByTimeAsync(100);
    expect(puts).toHaveLength(2);
    expect(puts[1].pathways["help-desk"]?.hub).toEqual({ x: 10, y: 1 });

    // Nothing changed since: no more pushes.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(puts).toHaveLength(2);
  });

  it("pushes right away when a battle ends", async () => {
    const save = await freshModule();
    await save.signUp({ name: "Jamie Rivera", email: "jamie@example.com", marketingOptIn: false });
    await vi.advanceTimersByTimeAsync(1500);
    save.updateSave((s) => moveHub(s, 3));
    expect(puts).toHaveLength(1);

    save.updateSave(finishBattle);
    await vi.advanceTimersByTimeAsync(0);
    expect(puts).toHaveLength(2);
    expect(puts[1].pathways["help-desk"]?.history).toHaveLength(1);

    // The waiting routine push was folded into that one.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(puts).toHaveLength(2);
  });

  it("flushes the waiting push when the tab is hidden or closed", async () => {
    const save = await freshModule();
    await save.signUp({ name: "Jamie Rivera", email: "jamie@example.com", marketingOptIn: false });
    await vi.advanceTimersByTimeAsync(1500);
    save.updateSave((s) => moveHub(s, 4));
    visibility = "hidden";
    for (const fn of docListeners.visibilitychange ?? []) fn();
    await vi.advanceTimersByTimeAsync(0);
    expect(puts).toHaveLength(2);

    save.updateSave((s) => moveHub(s, 5));
    for (const fn of windowListeners.pagehide ?? []) fn();
    await vi.advanceTimersByTimeAsync(0);
    expect(puts).toHaveLength(3);
  });

  it("sends a push that storage could not take again later (after its penalty), and on tab close", async () => {
    const save = await freshModule();
    await save.signUp({ name: "Jamie Rivera", email: "jamie@example.com", marketingOptIn: false });
    await vi.advanceTimersByTimeAsync(1500);
    expect(puts).toHaveLength(1);

    server.put = "busy";
    save.updateSave(finishBattle);
    await vi.advanceTimersByTimeAsync(0);
    expect(puts).toHaveLength(2);
    // Not before 45 s (Airtable's penalty is 30 s), and within 75 s.
    await vi.advanceTimersByTimeAsync(44_000);
    expect(puts).toHaveLength(2);
    server.put = "ok";
    await vi.advanceTimersByTimeAsync(31_000);
    expect(puts).toHaveLength(3);
    expect(puts[2].pathways["help-desk"]?.history).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(puts).toHaveLength(3);

    // A failed battle-end push followed by closing the tab: the close sends it again.
    server.put = "busy";
    save.updateSave(finishBattle);
    await vi.advanceTimersByTimeAsync(0);
    expect(puts).toHaveLength(4);
    server.put = "ok";
    for (const fn of windowListeners.pagehide ?? []) fn();
    await vi.advanceTimersByTimeAsync(0);
    expect(puts).toHaveLength(5);
    expect(puts[4].pathways["help-desk"]?.history).toHaveLength(2);
  });

  it("a busy cloud check does not switch backups off; it checks again later", async () => {
    const save = await freshModule();
    await save.signUp({ name: "Jamie Rivera", email: "jamie@example.com", marketingOptIn: false });
    await vi.advanceTimersByTimeAsync(1500);
    const before = puts.length;

    server.get = "busy";
    await save.syncFromCloud({ adopt: false });
    expect(gets).toBe(1);
    // Backups keep going.
    save.updateSave(finishBattle);
    await vi.advanceTimersByTimeAsync(0);
    expect(puts).toHaveLength(before + 1);

    // And the check runs again (30-45 s later).
    server.get = "ok";
    await vi.advanceTimersByTimeAsync(46_000);
    expect(gets).toBe(2);
  });

  it("after a reload, a busy cloud check turns backups on once storage answers", async () => {
    let save = await freshModule();
    await save.signUp({ name: "Jamie Rivera", email: "jamie@example.com", marketingOptIn: false });
    await vi.advanceTimersByTimeAsync(1500);
    const before = puts.length;

    save = await freshModule(); // page reload: cloud state unknown until the check answers
    server.get = "busy";
    await save.syncFromCloud({ adopt: false });
    save.updateSave(finishBattle);
    await vi.advanceTimersByTimeAsync(0);
    expect(puts).toHaveLength(before);

    server.get = "ok";
    await vi.advanceTimersByTimeAsync(46_000);
    expect(gets).toBe(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(puts).toHaveLength(before + 1);
    expect(puts[puts.length - 1].pathways["help-desk"]?.history).toHaveLength(1);
  });

  it("keeps a sign-up the server could not store for now and sends it again", async () => {
    const save = await freshModule();
    server.lead = "busy";
    const first = await save.signUp({ name: "Jamie Rivera", email: "jamie@example.com", marketingOptIn: false });
    expect(first.stored).toBe(false);
    expect(first.save.pendingLead?.email).toBe("jamie@example.com");
    expect(leads).toBe(1);

    server.lead = "ok";
    // Retry-After 30 s, plus up to 50% jitter.
    await vi.advanceTimersByTimeAsync(29_000);
    expect(leads).toBe(1);
    await vi.advanceTimersByTimeAsync(17_000);
    expect(leads).toBe(2);
    expect(save.loadSave().pendingLead).toBeNull();
    // Now signed up for real: progress is backed up.
    await vi.advanceTimersByTimeAsync(2000);
    expect(puts.length).toBeGreaterThan(0);
  });

  it("never pushes for guests", async () => {
    const save = await freshModule();
    save.continueAsGuest();
    save.updateSave((s) => moveHub(s, 2));
    save.updateSave(finishBattle);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(puts).toHaveLength(0);
  });
});
