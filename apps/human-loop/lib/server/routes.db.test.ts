/**
 * Route handlers with a database present (lib/server/db mocked): the right player id reaches the
 * database, input is validated first, and database outcomes map to the contract.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  createPlayer: vi.fn(async () => true),
  loadCloudSave: vi.fn(async () => ({ cloud: true, save: null as unknown })),
  storeCloudSave: vi.fn(async () => true),
  deletePlayer: vi.fn(async () => true),
  maybePurgeStalePlayers: vi.fn(async () => undefined),
}));
vi.mock("@/lib/server/db", () => db);

import { POST as leadPOST } from "@/app/api/lead/route";
import { DELETE as progressDELETE, GET as progressGET, PUT as progressPUT } from "@/app/api/progress/route";
import { leadLimiter, saveLimiter } from "./rate-limit";

const PID = "0b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c2d";
const cookie = `hl_pid=${PID}`;
const save = {
  version: 2,
  playerId: "local-xyz",
  profile: { name: "Dana", email: "dana@example.com", guest: false, consentAt: null, marketingOptIn: false },
  pathways: { "help-desk": { introSeen: true, hub: null, battle: null, best: null, attempts: 0, wins: 0, history: [] } },
  settings: { reducedMotion: null },
  updatedAt: "2026-09-24T18:30:00.000Z",
};

function req(url: string, method: string, opts: { cookie?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`http://localhost${url}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

beforeEach(() => {
  leadLimiter.reset();
  saveLimiter.reset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/lead", () => {
  it("stores the lead under the same id it puts in the cookie", async () => {
    const res = await leadPOST(
      req("/api/lead", "POST", {
        body: { name: " Dana  Ortiz ", email: "Dana@Example.com", marketingOptIn: true, ageConfirmed: true },
      }),
    );
    const body = (await res.json()) as { stored: boolean; playerId: string };
    expect(body.stored).toBe(true);
    expect(res.headers.get("set-cookie")).toContain(`hl_pid=${body.playerId}`);
    expect(db.createPlayer).toHaveBeenCalledWith(body.playerId, {
      name: "Dana Ortiz",
      email: "Dana@example.com",
      marketingOptIn: true,
    });
    expect(db.maybePurgeStalePlayers).toHaveBeenCalled();
  });

  it("still returns 200 + cookie when the database write fails", async () => {
    db.createPlayer.mockResolvedValueOnce(false);
    const res = await leadPOST(
      req("/api/lead", "POST", { body: { name: "Dana", email: "d@example.com", marketingOptIn: false, ageConfirmed: true } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stored: false });
    expect(res.headers.get("set-cookie")).toMatch(/^hl_pid=[0-9a-f-]{36};/);
  });

  it("does not touch the database for invalid input", async () => {
    await leadPOST(req("/api/lead", "POST", { body: { name: "Dana", email: "nope", marketingOptIn: false, ageConfirmed: true } }));
    expect(db.createPlayer).not.toHaveBeenCalled();
  });
});

describe("/api/progress", () => {
  it("GET passes the cookie's player id and returns the database answer", async () => {
    db.loadCloudSave.mockResolvedValueOnce({ cloud: true, save: { ...save, playerId: PID } });
    const res = await progressGET(req("/api/progress", "GET", { cookie }));
    expect(db.loadCloudSave).toHaveBeenCalledWith(PID);
    expect(await res.json()).toEqual({ cloud: true, save: { ...save, playerId: PID } });
  });

  it("GET without a cookie skips the database", async () => {
    const res = await progressGET(req("/api/progress", "GET"));
    expect(await res.json()).toEqual({ cloud: false, save: null });
    expect(db.loadCloudSave).not.toHaveBeenCalled();
  });

  it("PUT stores a cleaned save (profile stripped) for the cookie's player", async () => {
    const res = await progressPUT(req("/api/progress", "PUT", { cookie, body: { save } }));
    expect(await res.json()).toEqual({ stored: true });
    expect(db.storeCloudSave).toHaveBeenCalledWith(PID, expect.objectContaining({ profile: null, version: 2 }));
  });

  it("PUT reports stored:false when the player row is missing", async () => {
    db.storeCloudSave.mockResolvedValueOnce(false);
    const res = await progressPUT(req("/api/progress", "PUT", { cookie, body: { save } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stored: false });
  });

  it("PUT validates before touching the database", async () => {
    const res = await progressPUT(req("/api/progress", "PUT", { cookie, body: { save: { ...save, version: 3 } } }));
    expect(res.status).toBe(400);
    expect(db.storeCloudSave).not.toHaveBeenCalled();
  });

  it("DELETE removes the player and clears the cookie", async () => {
    const res = await progressDELETE(req("/api/progress", "DELETE", { cookie }));
    expect(db.deletePlayer).toHaveBeenCalledWith(PID);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("set-cookie")).toMatch(/^hl_pid=;.*Max-Age=0/);
  });

  it("DELETE is honest when the database is unreachable: 503 and the cookie is kept", async () => {
    db.deletePlayer.mockResolvedValueOnce(false);
    const res = await progressDELETE(req("/api/progress", "DELETE", { cookie }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: expect.any(String) });
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
