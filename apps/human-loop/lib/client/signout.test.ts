/** A sign-out that could not reach the server (offline) is finished before any cloud restore or sign-up. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Listener = () => void;
let online: boolean;
let calls: string[];
let cookie: string | null;
let windowListeners: Record<string, Listener[]>;
const PROFILE = { name: "Maria Lopez", email: "maria@example.com", guest: false, consentAt: "2026-09-25T10:00:00.000Z", marketingOptIn: false };

async function freshModule() {
  vi.resetModules();
  return import("./save");
}

beforeEach(() => {
  online = true;
  calls = [];
  cookie = null;
  windowListeners = {};
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    addEventListener: (type: string, fn: Listener) => void (windowListeners[type] ??= []).push(fn),
  });
  vi.stubGlobal("document", { visibilityState: "visible", addEventListener: () => {} });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const m = init.method ?? "GET";
    if (!online) throw new TypeError("Failed to fetch");
    calls.push(`${m} ${url}`);
    if (url === "/api/lead") {
      cookie = "new-player";
      return new Response(JSON.stringify({ stored: true, playerId: "0b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c2d" }), { status: 200 });
    }
    if (url === "/api/logout") {
      cookie = null;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (url === "/api/progress" && m === "GET") {
      if (cookie === "maria") return new Response(JSON.stringify({ cloud: true, save: null, profile: PROFILE }), { status: 200 });
      return new Response(JSON.stringify({ cloud: false, save: null }), { status: 200 });
    }
    return new Response(JSON.stringify({ stored: true }), { status: 200 });
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("offline sign-out", () => {
  it("online sign-out is finished at once", async () => {
    const save = await freshModule();
    save.updateSave((s) => ({ ...s, profile: PROFILE }));
    cookie = "maria";
    const r = await save.signOut();
    expect(r.finished).toBe(true);
    expect(cookie).toBeNull();
    expect(r.save.profile).toBeNull();
  });

  it("the next load signs out first and restores nothing", async () => {
    let save = await freshModule();
    save.updateSave((s) => ({ ...s, profile: PROFILE }));
    cookie = "maria";
    online = false;
    const r = await save.signOut();
    expect(r.finished).toBe(false);
    expect(r.save.profile).toBeNull();
    expect(cookie).toBe("maria");

    // Still offline on the next load: no restore, flag kept.
    save = await freshModule();
    expect((await save.syncFromCloud()).restored).toBe(false);

    // Online: the next person opens /play.
    online = true;
    save = await freshModule();
    await save.retryPendingLead();
    const s = await save.syncFromCloud();
    expect(s.restored).toBe(false);
    expect(s.save.profile).toBeNull();
    expect(calls).toEqual(["POST /api/logout", "GET /api/progress"]);
    // Once finished, it is not repeated.
    calls = [];
    await save.syncFromCloud();
    expect(calls).toEqual(["GET /api/progress"]);
  });

  it("a sign-up made while the sign-out waits sends the sign-out first", async () => {
    let save = await freshModule();
    save.updateSave((s) => ({ ...s, profile: PROFILE }));
    cookie = "maria";
    online = false;
    await save.signOut();
    // Next person signs up while still offline (kept as a pending lead).
    await save.signUp({ name: "Sam Diaz", email: "sam@example.com", marketingOptIn: false });
    online = true;
    save = await freshModule();
    await save.retryPendingLead();
    await save.syncFromCloud({ adopt: false });
    expect(calls.slice(0, 2)).toEqual(["POST /api/logout", "POST /api/lead"]);
    expect(cookie).toBe("new-player");
  });
});
