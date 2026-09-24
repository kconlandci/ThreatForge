/**
 * Route handlers in "no-op mode": no DATABASE_URL / POSTGRES_URL. The game must keep working:
 * sign-up still issues a player id + cookie, progress reads return cloud:false, writes stored:false.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as leadPOST } from "@/app/api/lead/route";
import { DELETE as progressDELETE, GET as progressGET, PUT as progressPUT } from "@/app/api/progress/route";
import { leadLimiter, saveLimiter } from "./rate-limit";
import { isUuid, SAVE_MAX_BYTES } from "./validate";

const BASE = "http://localhost:3104";
const PID = "0b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c2d";
const lead = { name: "Dana Ortiz", email: "dana.ortiz@example.com", marketingOptIn: true, ageConfirmed: true };
const save = {
  version: 2,
  playerId: PID,
  profile: null,
  pathways: { "help-desk": { introSeen: true, hub: null, battle: null, best: null, attempts: 0, wins: 0, history: [] } },
  settings: { reducedMotion: null },
  updatedAt: "2026-09-24T18:30:00.000Z",
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${BASE}/api/lead`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function progress(method: "GET" | "PUT" | "DELETE", opts: { cookie?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`${BASE}/api/progress`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  });
}

let logs: unknown[][] = [];

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("POSTGRES_URL", "");
  leadLimiter.reset();
  saveLimiter.reset();
  logs = [];
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args));
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/lead (no database)", () => {
  it("returns stored:false with a server-issued playerId and sets the hl_pid cookie", async () => {
    const res = await leadPOST(post(lead));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stored: boolean; playerId: string };
    expect(body.stored).toBe(false);
    expect(isUuid(body.playerId)).toBe(true);

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`hl_pid=${body.playerId}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toContain("Max-Age=31536000");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("issues a new player for every sign-up (no linking by email)", async () => {
    const a = (await (await leadPOST(post(lead))).json()) as { playerId: string };
    const b = (await (await leadPOST(post(lead))).json()) as { playerId: string };
    expect(a.playerId).not.toBe(b.playerId);
  });

  it("ignores a client-supplied playerId", async () => {
    const res = await leadPOST(post({ ...lead, playerId: PID }));
    const body = (await res.json()) as { playerId: string };
    expect(body.playerId).not.toBe(PID);
  });

  it.each([
    ["missing name", { ...lead, name: "" }],
    ["long name", { ...lead, name: "x".repeat(81) }],
    ["bad email", { ...lead, email: "dana@" }],
    ["long email", { ...lead, email: `${"a".repeat(250)}@x.com` }],
    ["no age confirmation", { ...lead, ageConfirmed: false }],
    ["non-boolean opt-in", { ...lead, marketingOptIn: "yes" }],
    ["array body", [lead]],
  ])("400 {error} for %s, and no cookie", async (_label, body) => {
    const res = await leadPOST(post(body));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(typeof json.error).toBe("string");
    expect(json.error.length).toBeGreaterThan(0);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("400 for invalid JSON, 415 for non-JSON, 413 for oversized bodies", async () => {
    expect((await leadPOST(post("{oops"))).status).toBe(400);
    expect((await leadPOST(post(JSON.stringify(lead), { "content-type": "text/plain" }))).status).toBe(415);
    expect((await leadPOST(post({ ...lead, pad: "x".repeat(5000) }))).status).toBe(413);
  });

  it("rate-limits sign-ups per IP with 429 + Retry-After", async () => {
    for (let i = 0; i < 30; i++) expect((await leadPOST(post(lead))).status).toBe(200);
    const limited = await leadPOST(post(lead));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(((await limited.json()) as { error: string }).error).toBeTruthy();
    // Another network is unaffected.
    expect((await leadPOST(post(lead, { "x-forwarded-for": "198.51.100.1" }))).status).toBe(200);
  });

  it("never logs names or emails", async () => {
    await leadPOST(post(lead));
    await leadPOST(post({ ...lead, email: "bad" }));
    const text = JSON.stringify(logs);
    expect(text).not.toContain("Dana");
    expect(text).not.toContain("dana.ortiz@example.com");
  });
});

describe("/api/progress (no database)", () => {
  it("GET returns cloud:false, save:null with or without a cookie", async () => {
    for (const cookie of [undefined, `hl_pid=${PID}`]) {
      const res = await progressGET(progress("GET", { cookie }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ cloud: false, save: null });
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("PUT without a cookie is 401", async () => {
    const res = await progressPUT(progress("PUT", { body: { save } }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ stored: false });
  });

  it("PUT with a malformed cookie is 401", async () => {
    const res = await progressPUT(progress("PUT", { cookie: "hl_pid=abc", body: { save } }));
    expect(res.status).toBe(401);
  });

  it("PUT with a cookie and a valid save returns stored:false", async () => {
    const res = await progressPUT(progress("PUT", { cookie: `hl_pid=${PID}`, body: { save } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stored: false });
  });

  it("PUT validates the save shape and caps the body at 256 KB", async () => {
    const cookie = `hl_pid=${PID}`;
    for (const bad of [{}, { save: { ...save, version: 1 } }, { save: { ...save, pathways: null } }, { save: { ...save, playerId: 1 } }]) {
      const res = await progressPUT(progress("PUT", { cookie, body: bad }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ stored: false, error: expect.any(String) });
    }
    const big = { save: { ...save, pad: "x".repeat(SAVE_MAX_BYTES) } };
    expect((await progressPUT(progress("PUT", { cookie, body: big }))).status).toBe(413);
    const justUnder = { save: { ...save, pad: "x".repeat(SAVE_MAX_BYTES - 1000) } };
    expect((await progressPUT(progress("PUT", { cookie, body: justUnder }))).status).toBe(200);
  });

  it("PUT answers 400 (not 500) for a deeply nested save under the size cap", async () => {
    const body = `{"save":{"version":2,"playerId":"x","pathways":{"help-desk":${"[".repeat(100_000)}${"]".repeat(100_000)}}}}`;
    const res = await progressPUT(progress("PUT", { cookie: `hl_pid=${PID}`, body }));
    expect(res.status).toBe(400);
  });

  it("PUT is rate-limited per player", async () => {
    const cookie = `hl_pid=${PID}`;
    for (let i = 0; i < 60; i++) expect((await progressPUT(progress("PUT", { cookie, body: { save } }))).status).toBe(200);
    expect((await progressPUT(progress("PUT", { cookie, body: { save } }))).status).toBe(429);
  });

  it("DELETE returns ok and clears the cookie, with or without one", async () => {
    for (const cookie of [undefined, `hl_pid=${PID}`, "hl_pid=garbage"]) {
      const res = await progressDELETE(progress("DELETE", { cookie }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toMatch(/^hl_pid=;/);
      expect(setCookie).toMatch(/Max-Age=0/);
    }
  });

  it("POSTGRES_URL alone is enough to count as configured", async () => {
    const { isDatabaseConfigured } = await import("./db");
    expect(isDatabaseConfigured()).toBe(false);
    vi.stubEnv("POSTGRES_URL", "postgresql://u:p@host.example/db");
    expect(isDatabaseConfigured()).toBe(true);
  });
});
