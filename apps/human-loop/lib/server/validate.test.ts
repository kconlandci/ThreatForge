import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import {
  isUuid,
  LEAD_MAX_BYTES,
  normalizeEmail,
  normalizeName,
  readJsonBody,
  SAVE_MAX_DEPTH,
  tooDeep,
  validateLead,
  validateSave,
} from "./validate";
import { clearPlayerCookie, newPlayerId, PLAYER_COOKIE_MAX_AGE, readPlayerId, setPlayerCookie } from "./player-cookie";
import { clientIp, createRateLimiter } from "./rate-limit";

const lead = { name: "Dana Ortiz", email: "dana@example.com", marketingOptIn: false, ageConfirmed: true };

describe("validateLead", () => {
  it("accepts a normal sign-up and returns a clean copy", () => {
    const r = validateLead({ ...lead, extra: "ignored" });
    expect(r).toEqual({ ok: true, value: { name: "Dana Ortiz", email: "dana@example.com", marketingOptIn: false } });
  });

  it("trims, collapses spaces and strips control characters from names", () => {
    const r = validateLead({ ...lead, name: "  Dana \t  Ortiz\u0007\u202e " });
    expect(r.ok && r.value.name).toBe("Dana Ortiz");
  });

  it("keeps real-world names intact", () => {
    for (const name of ["José Núñez", "O'Brien-Smith", "李小龍", "Nguyễn Thị Minh Khai"]) {
      const r = validateLead({ ...lead, name });
      expect(r.ok && r.value.name).toBe(name);
    }
  });

  it("requires a name of 1-80 characters", () => {
    expect(validateLead({ ...lead, name: "   " }).ok).toBe(false);
    expect(validateLead({ ...lead, name: 42 }).ok).toBe(false);
    expect(validateLead({ ...lead, name: "a".repeat(80) }).ok).toBe(true);
    const long = validateLead({ ...lead, name: "a".repeat(81) });
    expect(long).toEqual({ ok: false, error: expect.stringContaining("80") });
  });

  it("validates email like the sign-up form, max 254 chars", () => {
    expect(validateLead({ ...lead, email: "  Dana@Example.COM " })).toMatchObject({
      ok: true,
      value: { email: "Dana@example.com" },
    });
    for (const email of ["", "dana", "dana@", "@example.com", "dana@example", "da na@example.com", "dana@@x.com"]) {
      expect(validateLead({ ...lead, email }).ok, email).toBe(false);
    }
    const local = "a".repeat(64);
    const domain = `${"b".repeat(180)}.com`;
    expect(validateLead({ ...lead, email: `${local}@${domain}` }).ok).toBe(true); // 249 chars
    expect(validateLead({ ...lead, email: `${local}@${"b".repeat(186)}.com` }).ok).toBe(false); // 255 chars
  });

  it("requires ageConfirmed === true and a boolean marketingOptIn", () => {
    expect(validateLead({ ...lead, ageConfirmed: false }).ok).toBe(false);
    expect(validateLead({ ...lead, ageConfirmed: "true" }).ok).toBe(false);
    const { ageConfirmed: _drop, ...noAge } = lead;
    void _drop;
    expect(validateLead(noAge).ok).toBe(false);
    expect(validateLead({ ...lead, marketingOptIn: "yes" }).ok).toBe(false);
    expect(validateLead({ ...lead, marketingOptIn: true })).toMatchObject({ ok: true, value: { marketingOptIn: true } });
  });

  it("rejects non-objects", () => {
    for (const body of [null, "x", 1, [], [lead]]) expect(validateLead(body).ok).toBe(false);
  });
});

describe("normalizers", () => {
  it("normalizeName / normalizeEmail", () => {
    expect(normalizeName("\u200b Ana\u00a0 Lima ")).toBe("Ana Lima");
    expect(normalizeEmail(" Ana.Lima@Bramwell-Logistics.EXAMPLE ")).toBe("Ana.Lima@bramwell-logistics.example");
  });
});

const goodSave = {
  version: 2,
  playerId: "0b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c2d",
  profile: { name: "Dana", email: "dana@example.com", guest: false, consentAt: null, marketingOptIn: false },
  pathways: {
    "help-desk": { introSeen: true, hub: { x: 3, y: 4 }, battle: null, best: null, attempts: 1, wins: 0, history: [] },
  },
  settings: { reducedMotion: true },
  updatedAt: "2026-09-24T18:30:00.000Z",
};

describe("validateSave", () => {
  it("accepts a v2 save and strips the profile (PII lives only in the players table)", () => {
    const r = validateSave({ save: goodSave });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.profile).toBeNull();
    expect(r.value.pathways["help-desk"]).toEqual(goodSave.pathways["help-desk"]);
    expect(r.value.settings).toEqual({ reducedMotion: true });
    expect(r.value.updatedAt).toBe(goodSave.updatedAt);
    expect(JSON.stringify(r.value)).not.toContain("dana@example.com");
  });

  it("rejects bad shapes", () => {
    expect(validateSave(null).ok).toBe(false);
    expect(validateSave({}).ok).toBe(false);
    expect(validateSave({ save: [] }).ok).toBe(false);
    expect(validateSave({ save: { ...goodSave, version: 1 } }).ok).toBe(false);
    expect(validateSave({ save: { ...goodSave, playerId: 7 } }).ok).toBe(false);
    expect(validateSave({ save: { ...goodSave, playerId: "" } }).ok).toBe(false);
    expect(validateSave({ save: { ...goodSave, pathways: null } }).ok).toBe(false);
    expect(validateSave({ save: { ...goodSave, pathways: [] } }).ok).toBe(false);
    expect(validateSave({ save: { ...goodSave, pathways: { "help-desk": "done" } } }).ok).toBe(false);
  });

  it("drops unknown pathways and repairs settings / updatedAt", () => {
    const r = validateSave({
      save: { ...goodSave, pathways: { "help-desk": {}, "time-travel": {} }, settings: "x", updatedAt: "yesterday" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.value.pathways)).toEqual(["help-desk"]);
    expect(r.value.settings).toEqual({ reducedMotion: null });
    expect(Number.isNaN(Date.parse(r.value.updatedAt))).toBe(false);
  });

  it("rejects absurdly deep nesting without overflowing the stack", () => {
    const deep = JSON.parse(`{"help-desk":${"[".repeat(120_000)}${"]".repeat(120_000)}}`) as unknown;
    expect(validateSave({ save: { ...goodSave, pathways: deep } })).toEqual({ ok: false, error: "Save is nested too deeply." });
    expect(tooDeep({ a: { b: [1, { c: 2 }] } }, 3)).toBe(true);
    expect(tooDeep({ a: { b: [1, { c: 2 }] } }, 4)).toBe(false);
    expect(tooDeep(goodSave, SAVE_MAX_DEPTH)).toBe(false);
  });

  it("validates a bare save when envelope is false (database read-back)", () => {
    expect(validateSave(goodSave, { envelope: false }).ok).toBe(true);
    expect(validateSave({ save: goodSave }, { envelope: false }).ok).toBe(false);
  });
});

function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("readJsonBody", () => {
  it("parses JSON", async () => {
    await expect(readJsonBody(jsonRequest('{"a":1}'), 100)).resolves.toEqual({ ok: true, value: { a: 1 } });
  });

  it("accepts a charset parameter but requires JSON content type", async () => {
    const withCharset = jsonRequest("{}", { "content-type": "application/json; charset=utf-8" });
    expect((await readJsonBody(withCharset, 100)).ok).toBe(true);
    const text = jsonRequest("{}", { "content-type": "text/plain" });
    expect(await readJsonBody(text, 100)).toMatchObject({ ok: false, status: 415 });
  });

  it("rejects invalid JSON with 400", async () => {
    expect(await readJsonBody(jsonRequest("{nope"), 100)).toMatchObject({ ok: false, status: 400 });
  });

  it("caps the body size even without a Content-Length header", async () => {
    const big = JSON.stringify({ pad: "x".repeat(LEAD_MAX_BYTES) });
    expect(await readJsonBody(jsonRequest(big), LEAD_MAX_BYTES)).toMatchObject({ ok: false, status: 413 });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 10; i++) controller.enqueue(new TextEncoder().encode("x".repeat(1000)));
        controller.close();
      },
    });
    const chunked = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await readJsonBody(chunked, 5000)).toMatchObject({ ok: false, status: 413 });
  });

  it("rejects a declared Content-Length over the cap before reading", async () => {
    const r = jsonRequest("{}", { "content-length": String(LEAD_MAX_BYTES + 1) });
    expect(await readJsonBody(r, LEAD_MAX_BYTES)).toMatchObject({ ok: false, status: 413 });
  });
});

describe("player cookie", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("issues random v4 UUIDs", () => {
    const a = newPlayerId();
    expect(isUuid(a)).toBe(true);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/);
    expect(newPlayerId()).not.toBe(a);
  });

  it("reads only a valid hl_pid", () => {
    const id = newPlayerId();
    const req = (cookie: string) => new Request("http://localhost/", { headers: { cookie } });
    expect(readPlayerId(req(`theme=dark; hl_pid=${id}; other=1`))).toBe(id);
    expect(readPlayerId(req(`hl_pid=${id.toUpperCase()}`))).toBe(id);
    expect(readPlayerId(req("hl_pid=not-a-uuid"))).toBeNull();
    expect(readPlayerId(req("hl_pid=%E0%A4%A"))).toBeNull();
    expect(readPlayerId(req(`xhl_pid=${id}`))).toBeNull();
    expect(readPlayerId(new Request("http://localhost/"))).toBeNull();
  });

  it("sets httpOnly, SameSite=Lax, path /, 1 year; Secure only in production", () => {
    const id = newPlayerId();
    const dev = NextResponse.json({});
    setPlayerCookie(dev, id);
    const devCookie = dev.headers.get("set-cookie") ?? "";
    expect(devCookie).toContain(`hl_pid=${id}`);
    expect(devCookie).toMatch(/HttpOnly/i);
    expect(devCookie).toMatch(/SameSite=lax/i);
    expect(devCookie).toMatch(/Path=\//);
    expect(devCookie).toContain(`Max-Age=${PLAYER_COOKIE_MAX_AGE}`);
    expect(devCookie).not.toMatch(/Secure/i);

    vi.stubEnv("NODE_ENV", "production");
    const prod = NextResponse.json({});
    setPlayerCookie(prod, id);
    expect(prod.headers.get("set-cookie")).toMatch(/Secure/i);
  });

  it("clears the cookie", () => {
    const res = NextResponse.json({});
    clearPlayerCookie(res);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^hl_pid=;/);
    expect(cookie).toMatch(/Max-Age=0/);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

describe("rate limiter", () => {
  it("allows `limit` hits per window, then 429s with Retry-After, then resets", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000 });
    const t0 = 1_000_000;
    expect(rl.check("ip", t0).ok).toBe(true);
    expect(rl.check("ip", t0 + 1).ok).toBe(true);
    expect(rl.check("ip", t0 + 2).ok).toBe(true);
    expect(rl.check("ip", t0 + 3)).toEqual({ ok: false, retryAfterSec: 60 });
    expect(rl.check("other", t0 + 3).ok).toBe(true);
    expect(rl.check("ip", t0 + 60_000).ok).toBe(true);
  });

  it("keeps memory bounded", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 10 });
    for (let i = 0; i < 1000; i++) rl.check(`k${i}`, 0);
    // The newest keys are still tracked; the oldest were evicted.
    expect(rl.check("k999", 1).ok).toBe(false);
    expect(rl.check("k0", 1).ok).toBe(true);
  });

  it("finds the client IP", () => {
    const req = (h: Record<string, string>) => new Request("http://localhost/", { headers: h });
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
