/**
 * Route handlers in Airtable mode: AIRTABLE_TOKEN set, no Postgres URL. The real storage module
 * and Airtable backend run against the in-memory fake (./airtable.fake) used as `fetch`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as cronGET } from "@/app/api/cron/purge/route";
import { POST as leadPOST } from "@/app/api/lead/route";
import { DELETE as progressDELETE, GET as progressGET, PUT as progressPUT } from "@/app/api/progress/route";
import { airtableTiming, DEFAULT_AIRTABLE_BASE_ID, PLAYER_FIELDS, RESULT_FIELDS, resetAirtableStateForTests } from "./airtable";
import { FakeAirtable } from "./airtable.fake";
import { airtableSaveLimiter, leadLimiter, saveIpLimiter, saveLimiter } from "./rate-limit";
import { storageBackend } from "./storage";

const TOKEN = "patFAKE123.SuperSecretTokenValue";
const lead = { name: "Jamie Rivera", email: "jamie.rivera@example.com", marketingOptIn: false, ageConfirmed: true };

function save(history: unknown[] = []) {
  return {
    version: 2,
    playerId: "local-xyz",
    profile: { name: "Jamie Rivera", email: "jamie.rivera@example.com", guest: false, consentAt: null, marketingOptIn: false },
    pathways: {
      "help-desk": { introSeen: true, hub: null, battle: null, best: null, attempts: history.length, wins: history.length, history },
    },
    settings: { reducedMotion: null },
    updatedAt: "2026-09-24T18:30:00.000Z",
  };
}

const START = Date.parse("2026-09-24T18:30:00.000Z");
const won = {
  encounterId: "hd-01-monday",
  status: "won",
  stars: 2,
  at: "2026-09-24T18:29:00.000Z",
  catches: 3,
  falseAlarms: 0,
  misses: 1,
};

function req(url: string, method: string, opts: { cookie?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { "x-forwarded-for": "203.0.113.7", ...opts.headers };
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`http://localhost${url}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

let fake: FakeAirtable;
let logs: string[];
let clock: number;
const realTiming = { ...airtableTiming };

beforeEach(() => {
  resetAirtableStateForTests();
  leadLimiter.reset();
  saveLimiter.reset();
  airtableSaveLimiter.reset();
  saveIpLimiter.reset();
  fake = new FakeAirtable(DEFAULT_AIRTABLE_BASE_ID);
  vi.stubGlobal("fetch", fake.fetch);
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("POSTGRES_URL", "");
  vi.stubEnv("AIRTABLE_TOKEN", TOKEN);
  vi.stubEnv("AIRTABLE_BASE_ID", "");
  // A virtual clock: only sleeping (pacing, retries) moves time.
  clock = START;
  airtableTiming.now = () => clock;
  airtableTiming.sleep = async (ms: number) => {
    clock += ms;
  };
  logs = [];
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});

afterEach(() => {
  Object.assign(airtableTiming, realTiming);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function signUp(): Promise<string> {
  const res = await leadPOST(req("/api/lead", "POST", { body: lead }));
  expect(res.status).toBe(200);
  const body = (await res.json()) as { stored: boolean; playerId: string };
  expect(body.stored).toBe(true);
  // Let the background retention check that follows a sign-up finish first.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return `hl_pid=${body.playerId}`;
}

describe("backend selection", () => {
  it("Postgres wins when both are set; Airtable when only the token is; else no-op", () => {
    expect(storageBackend()).toBe("airtable");
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@host.example/db");
    expect(storageBackend()).toBe("postgres");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AIRTABLE_TOKEN", "");
    expect(storageBackend()).toBe("none");
  });
});

describe("routes with Airtable", () => {
  it("sign up -> load -> save -> load -> delete, end to end", async () => {
    const cookie = await signUp();
    const pid = cookie.split("=")[1];
    expect(fake.players()).toHaveLength(1);
    expect(fake.players()[0].fields[PLAYER_FIELDS.playerId]).toBe(pid);

    // Before any save: cloud is on and the profile comes back (restore on a wiped browser).
    let res = await progressGET(req("/api/progress", "GET", { cookie }));
    expect(await res.json()).toMatchObject({ cloud: true, save: null, profile: { name: "Jamie Rivera", guest: false } });

    res = await progressPUT(req("/api/progress", "PUT", { cookie, body: { save: save([won]) } }));
    expect(await res.json()).toEqual({ stored: true });
    expect(fake.results().map((r) => r.fields[RESULT_FIELDS.summary])).toEqual(["Jamie R. · Help Desk · Won ★★"]);
    expect(fake.players()[0].fields[PLAYER_FIELDS.shiftsWon]).toBe(1);

    // A periodic push of the same save adds no more rows.
    await progressPUT(req("/api/progress", "PUT", { cookie, body: { save: save([won]) } }));
    expect(fake.results()).toHaveLength(1);

    res = await progressGET(req("/api/progress", "GET", { cookie }));
    const loaded = (await res.json()) as { cloud: boolean; save: { playerId: string; pathways: Record<string, { history: unknown[] }> } };
    expect(loaded.cloud).toBe(true);
    expect(loaded.save.playerId).toBe(pid);
    expect(loaded.save.pathways["help-desk"].history).toEqual([won]);

    res = await progressDELETE(req("/api/progress", "DELETE", { cookie }));
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("set-cookie")).toMatch(/^hl_pid=;.*Max-Age=0/);
    expect(fake.players()).toHaveLength(0);
    expect(fake.results()).toHaveLength(0);

    // Nothing personal or secret in the logs.
    const all = logs.join("\n");
    for (const secret of [TOKEN, lead.email, "Rivera", pid]) expect(all).not.toContain(secret);
  });

  it("PUT for a cookie with no Players row stores nothing", async () => {
    const res = await progressPUT(
      req("/api/progress", "PUT", { cookie: "hl_pid=0b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c2d", body: { save: save([won]) } }),
    );
    expect(await res.json()).toEqual({ stored: false });
    expect(fake.results()).toHaveLength(0);
  });

  it("keeps the game working when Airtable is rate limiting: 200 stored:false + retry, never a 500", async () => {
    const cookie = await signUp();
    fake.failNext({ status: 429 });
    const res = await progressPUT(req("/api/progress", "PUT", { cookie, body: { save: save([won]) } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("retry-after")).toBe("30");
    expect(await res.json()).toEqual({ stored: false, retry: true });

    // After Airtable's penalty the same push goes through.
    clock += 30_000;
    const again = await progressPUT(req("/api/progress", "PUT", { cookie, body: { save: save([won]) } }));
    expect(await again.json()).toEqual({ stored: true });
    expect(fake.results()).toHaveLength(1);
  });

  it("a sign-up during an outage answers 503 + Retry-After (no cookie), so the browser sends it again", async () => {
    fake.failNext({ status: 503 });
    const res = await leadPOST(req("/api/lead", "POST", { body: lead }));
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("30");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(fake.players()).toHaveLength(0);

    // The retry is stored, and the failed attempt did not use up the network's sign-up allowance.
    const cookie = await signUp();
    expect(fake.players()).toHaveLength(1);
    expect(cookie).toMatch(/^hl_pid=[0-9a-f-]{36}$/);
  });

  it("a sign-up rate limited by Airtable answers 503 with the cooldown as Retry-After", async () => {
    fake.failNext({ status: 429 });
    const res = await leadPOST(req("/api/lead", "POST", { body: lead }));
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("30");
  });

  it("failed sign-ups do not count toward the network's sign-up limit", async () => {
    vi.stubEnv("LEAD_RATE_LIMIT_PER_10_MIN", "30");
    for (let i = 0; i < 35; i++) {
      fake.failNext({ status: 500 });
      const res = await leadPOST(req("/api/lead", "POST", { body: lead }));
      expect(res.status).toBe(503);
    }
    await signUp();
  });

  it("sign-up with a permanent Airtable error (bad token) still answers 200 + cookie, stored:false", async () => {
    fake.failNext({ status: 401, body: { error: { type: "AUTHENTICATION_REQUIRED" } } });
    const res = await leadPOST(req("/api/lead", "POST", { body: lead }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stored: false });
    expect(res.headers.get("set-cookie")).toMatch(/^hl_pid=[0-9a-f-]{36};/);
  });

  it("GET during an outage says retry (not 'no cloud'), so the browser keeps backing up", async () => {
    const cookie = await signUp();
    fake.failNext({ status: 500 });
    const res = await progressGET(req("/api/progress", "GET", { cookie }));
    expect(res.status).toBe(200);
    expect(res.headers.get("retry-after")).toBe("30");
    expect(await res.json()).toEqual({ cloud: false, save: null, retry: true });
  });

  it("GET for a cookie with no Players row is a plain cloud:false", async () => {
    const res = await progressGET(req("/api/progress", "GET", { cookie: "hl_pid=0b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c2d" }));
    expect(await res.json()).toEqual({ cloud: false, save: null });
  });

  it("one visitor cannot mass-create Shift Results rows", async () => {
    const cookie = await signUp();
    const history: (typeof won)[] = [];
    let accepted = 0;
    for (let push = 0; push < 20; push++) {
      for (let i = 0; i < 50; i++) history.push({ ...won, at: new Date(START - 1e9 + (push * 50 + i) * 60_000).toISOString() });
      const res = await progressPUT(req("/api/progress", "PUT", { cookie, body: { save: save(history.slice(-50)) } }));
      if (res.status === 200) accepted += 1;
      else expect(res.status).toBe(429);
    }
    // 12 saves a minute per player with Airtable; at most 5 new rows per save.
    expect(accepted).toBe(12);
    expect(fake.results().length).toBeLessThanOrEqual(12 * 5);
    expect(fake.results().length).toBeGreaterThan(0);
  });

  it("DELETE answers 503 and keeps the cookie when Airtable cannot be reached", async () => {
    const cookie = await signUp();
    fake.failNext({ status: 500 });
    const res = await progressDELETE(req("/api/progress", "DELETE", { cookie }));
    expect(res.status).toBe(503);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(fake.players()).toHaveLength(1);
  });

  it("the daily cron purges inactive Airtable players", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret-value");
    fake.seed("tblVJYIXEbxGsSsfc", { [PLAYER_FIELDS.name]: "Old", [PLAYER_FIELDS.lastPlayed]: "2023-01-01T00:00:00.000Z" });
    fake.now = Date.now();
    const res = await cronGET(req("/api/cron/purge", "GET", { headers: { authorization: "Bearer cron-secret-value" } }));
    expect(await res.json()).toEqual({ ok: true, purged: 1 });
    expect(fake.players()).toHaveLength(0);
  });
});
