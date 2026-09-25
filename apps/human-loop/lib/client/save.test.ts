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

describe("practiceDone (the practice shift before the real one)", () => {
  const KEY = "human-loop:save:v2";

  it("survives a save round trip and defaults to false for older saves", async () => {
    const save = await freshModule();
    save.continueAsGuest();
    expect(save.getPathwayProgress(save.loadSave(), "help-desk").practiceDone).toBe(false);
    save.updateSave((s) => ({
      ...s,
      pathways: { ...s.pathways, "help-desk": { ...save.emptyPathwayProgress(), introSeen: true, practiceDone: true } },
    }));

    // Reload the module: the save is read back from storage.
    const raw = window.localStorage.getItem(KEY);
    const again = await freshModule();
    window.localStorage.setItem(KEY, raw as string);
    expect(again.getPathwayProgress(again.loadSave(), "help-desk").practiceDone).toBe(true);

    // A save from before the practice shift existed has no field at all.
    const old = JSON.parse(raw as string) as SaveData;
    delete (old.pathways["help-desk"] as { practiceDone?: boolean }).practiceDone;
    const third = await freshModule();
    window.localStorage.setItem(KEY, JSON.stringify(old));
    expect(third.getPathwayProgress(third.loadSave(), "help-desk").practiceDone).toBe(false);
  });

  it("counts as done after a finish, a skip, or any real shift played before practice existed", async () => {
    const save = await freshModule();
    const empty = save.emptyPathwayProgress();
    expect(save.practiceDone(empty)).toBe(false);
    expect(save.practiceDone({ ...empty, practiceDone: true })).toBe(true);
    expect(save.practiceDone({ ...empty, attempts: 1 })).toBe(true);
    expect(
      save.practiceDone({
        ...empty,
        history: [{ encounterId: "hd-01-monday", status: "won", stars: 2, at: "", catches: 1, falseAlarms: 0, misses: 0 }],
      }),
    ).toBe(true);
  });
});

describe("M3 mastery fields (skills, shift spec, counters)", () => {
  const KEY = "human-loop:save:v2";
  const spec = {
    kind: "daily" as const,
    id: "hd-daily-3",
    seed: 123456789,
    n: 3,
    ticketIds: ["a-pdf-editor", "c-lost-phone"],
    stepIds: ["a-pdf-editor-1", "c-lost-phone-1", "a-pdf-editor-2", "c-lost-phone-2"],
    focus: ["guard-data" as const, "approve-checked" as const],
    createdOn: "2026-09-24",
    bankVersion: "b1x2y3",
  };
  const full = {
    skills: {
      "verify-identity": { recent: "RrPWr", n: 9, level: 2 as const, days: ["2026-09-22", "2026-09-24"], last: "2026-09-24", solidOn: null, miss: "romero-mfa-reset" },
      "approve-checked": { recent: "rrrrrr", n: 12, level: 3 as const, days: ["2026-09-20", "2026-09-23", "2026-09-24"], last: "2026-09-24", solidOn: "2026-09-23" },
      "confirm-fix": { recent: "Rrp", n: 3, level: 1 as const, days: ["2026-09-24"], last: "2026-09-24", solidOn: null, miss: "a-queue-cleanup-1", missWhy: "Fixed it later" },
    },
    shift: spec,
    dailyCount: 4,
    drillCount: { "guard-data": 2 },
    recentTickets: [["a-pdf-editor", "c-lost-phone"], ["b-tablet-swap"]],
    scored: { "a-pdf-editor-1": "2026-09-24", "romero-lookup": "2026-09-20" },
    applied: ["hd-01-monday:42", "hd-daily-3:123456789"],
    days: ["2026-09-20", "2026-09-24"],
  };

  it("round-trips every new field", async () => {
    const save = await freshModule();
    save.continueAsGuest();
    const history = [
      { encounterId: "hd-daily-3", status: "won" as const, stars: 0, at: "2026-09-24T10:00:00.000Z", catches: 2, falseAlarms: 0, misses: 1, mode: "daily" as const, right: 6, partly: 1, missed: 1, focus: "guard-data" as const },
    ];
    save.updateSave((s) => ({
      ...s,
      pathways: { ...s.pathways, "help-desk": { ...save.emptyPathwayProgress(), introSeen: true, history, ...full } },
    }));
    const raw = window.localStorage.getItem(KEY);
    const again = await freshModule();
    window.localStorage.setItem(KEY, raw as string);
    const p = again.getPathwayProgress(again.loadSave(), "help-desk");
    expect(p.skills).toEqual(full.skills);
    expect(p.shift).toEqual(spec);
    expect(p.dailyCount).toBe(4);
    expect(p.drillCount).toEqual({ "guard-data": 2 });
    expect(p.recentTickets).toEqual(full.recentTickets);
    expect(p.scored).toEqual(full.scored);
    expect(p.applied).toEqual(full.applied);
    expect(p.days).toEqual(full.days);
    expect(p.history).toEqual(history);
    // Far below the Airtable save limit.
    expect(JSON.stringify(full).length).toBeLessThan(3000);
  });

  it("drops junk field by field and caps sizes", async () => {
    const save = await freshModule();
    const p = save.toProgress({
      introSeen: true,
      attempts: 2,
      wins: 1,
      history: [
        { encounterId: "hd-01-monday", status: "won", stars: 3, at: "x", catches: 1, falseAlarms: 0, misses: 0, mode: "boss", right: 99, partly: -3, missed: "2", focus: "hacking" },
        "not an entry",
      ],
      skills: {
        "verify-identity": { recent: "RrXXzzPW<>!", n: 1, level: 9, days: ["2026-09-24", "nope", "2026-02-30", "2026-09-24"], last: "yesterday", solidOn: "2026-09-01", miss: "<script>", missWhy: "Fixed it later" },
        "guard-data": { recent: "", n: 0, level: 2 },
        hacking: { recent: "RRR", n: 3, level: 4, days: [], last: "2026-09-24", solidOn: null },
        "match-request": "strong",
      },
      shift: { ...spec, seed: -5 },
      dailyCount: "lots",
      drillCount: { "guard-data": 3.7, hacking: 2, "confirm-fix": "x" },
      recentTickets: [["a-ok"], ["BAD ID"], ["b-ok"], ["c-ok"]],
      scored: { "a-pdf-editor-1": "2026-09-24", "bad id!": "2026-09-24", "b-x-1": "Tuesday" },
      applied: Array.from({ length: 15 }, (_, i) => `hd-daily-${i}:1`).concat([7 as unknown as string]),
      days: Array.from({ length: 20 }, (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}`).concat(["junk"]),
    });
    expect(p.attempts).toBe(2);
    expect(p.history).toHaveLength(1);
    const h = p.history[0];
    expect(h.mode).toBeUndefined();
    expect(h.right).toBe(20);
    expect(h.partly).toBe(0);
    expect(h.missed).toBeUndefined();
    expect(h.focus).toBeUndefined();
    expect(Object.keys(p.skills ?? {})).toEqual(["verify-identity"]);
    expect(p.skills?.["verify-identity"]).toEqual({
      recent: "RrPW",
      n: 4,
      level: 4,
      days: ["2026-09-24"],
      last: "2026-09-24",
      solidOn: "2026-09-01",
    });
    expect(p.shift).toBeNull();
    expect(p.dailyCount).toBe(0);
    expect(p.drillCount).toEqual({ "guard-data": 3 });
    expect(p.recentTickets).toEqual([["b-ok"], ["c-ok"]]);
    expect(p.scored).toEqual({ "a-pdf-editor-1": "2026-09-24" });
    expect(p.applied).toHaveLength(10);
    expect(p.applied?.every((k) => typeof k === "string")).toBe(true);
    expect(p.days).toHaveLength(14);
    expect(p.days?.[13]).toBe("2026-09-20");
  });

  it("rejects a drill spec without exactly one skill, and a spec with too many steps", async () => {
    const save = await freshModule();
    expect(save.toShiftSpec({ ...spec, kind: "drill", id: "hd-drill-guard-data-0" })).toBeNull();
    expect(save.toShiftSpec({ ...spec, kind: "drill", id: "hd-drill-guard-data-0", focus: ["guard-data"] })).not.toBeNull();
    expect(save.toShiftSpec({ ...spec, stepIds: Array.from({ length: 21 }, (_, i) => `a-x-${i}`) })).toBeNull();
    expect(save.toShiftSpec({ ...spec, createdOn: "today" })).toBeNull();
    expect(save.toShiftSpec(null)).toBeNull();
  });

  it("loads an old save (before M3) with empty defaults and nothing back-filled", async () => {
    const old = {
      version: 2,
      playerId: "local-abc",
      profile: { name: "", email: "", guest: true, consentAt: null, marketingOptIn: false },
      pathways: {
        "help-desk": {
          introSeen: true,
          hub: { x: 3, y: 4 },
          battle: null,
          pendingResult: null,
          best: { stars: 2, completedAt: "2026-09-01T10:00:00.000Z" },
          attempts: 3,
          wins: 2,
          practiceDone: true,
          history: [{ encounterId: "hd-01-monday", status: "won", stars: 2, at: "2026-09-01T10:00:00.000Z", catches: 3, falseAlarms: 1, misses: 1 }],
        },
      },
      settings: { reducedMotion: null },
      updatedAt: "2026-09-01T10:00:00.000Z",
    };
    const save = await freshModule();
    window.localStorage.setItem(KEY, JSON.stringify(old));
    const p = save.getPathwayProgress(save.loadSave(), "help-desk");
    expect(p.attempts).toBe(3);
    expect(p.best?.stars).toBe(2);
    expect(p.history).toEqual(old.pathways["help-desk"].history);
    expect(p.skills).toEqual({});
    expect(p.shift).toBeNull();
    expect(p.dailyCount).toBe(0);
    expect(p.drillCount).toEqual({});
    expect(p.recentTickets).toEqual([]);
    expect(p.scored).toEqual({});
    expect(p.applied).toEqual([]);
    expect(p.days).toEqual([]);
  });
});
