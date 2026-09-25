/**
 * lib/server/airtable.ts against an in-memory fake of the Airtable Web API (./airtable.fake).
 * Checks what goes over the wire (URLs, table and field IDs, formulas, batching, retries,
 * timeouts), how saves are trimmed and summarized, which finished shifts become Shift Results
 * rows, and that failures degrade to "not stored" without logging secrets or personal data.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SaveData } from "@/lib/game/types";
import {
  airtableTiming,
  createPlayer,
  DEFAULT_AIRTABLE_BASE_ID,
  deletePlayer,
  formulaString,
  isAirtableConfigured,
  loadCloudSave,
  MAX_NEW_RESULTS_PER_SAVE,
  maybePurgeStalePlayers,
  PACE_MAX_WAIT_MS,
  PACE_PER_SECOND,
  RESULT_ROWS_PER_DAY,
  unlinkedResultsFormula,
  newShiftResults,
  OPTIONAL_PLAYER_FIELDS,
  OPTIONAL_RESULT_FIELDS,
  packSaveData,
  resultFields,
  skillLevelsText,
  PLAYER_FIELDS,
  PLAYERS_TABLE,
  playerFormula,
  purgeFormula,
  resetAirtableStateForTests,
  RESULT_FIELDS,
  RESULTS_TABLE,
  SAVE_DATA_MAX_CHARS,
  shortName,
  storeCloudSave,
} from "./airtable";
import { FakeAirtable } from "./airtable.fake";

const TOKEN = "patFAKE123.SuperSecretTokenValue";
const PID = "0b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c2d";
const OTHER = "9f1d2c3b-4a5e-4f60-8a7b-6c5d4e3f2a1b";
const lead = { name: "Jamie Rivera", email: "jamie.rivera@example.com", marketingOptIn: true };

type Entry = SaveData["pathways"]["help-desk"] extends infer P ? (P extends { history: (infer E)[] } ? E : never) : never;

function entry(at: string, over: Partial<Entry> = {}): Entry {
  return { encounterId: "hd-01-monday", status: "won", stars: 3, at, catches: 4, falseAlarms: 1, misses: 0, ...over };
}

function minutes(n: number): string {
  return new Date(Date.parse("2026-09-01T12:00:00.000Z") + n * 60_000).toISOString();
}

function makeSave(history: Entry[], extra: Record<string, unknown> = {}): SaveData {
  const wins = history.filter((h) => h.status === "won").length;
  return {
    version: 2,
    playerId: "local-abc",
    profile: null,
    pathways: {
      "help-desk": {
        introSeen: true,
        hub: { x: 2, y: 5 },
        battle: null,
        pendingResult: null,
        best: wins ? { stars: 3, completedAt: history[history.length - 1].at } : null,
        attempts: history.length,
        wins,
        history,
        ...extra,
      },
    },
    settings: { reducedMotion: false },
    updatedAt: "2026-09-24T18:30:00.000Z",
  };
}

let fake: FakeAirtable;
let logs: string[];
let sleeps: number[];
let clock: number;
const realTiming = { ...airtableTiming };

beforeEach(() => {
  resetAirtableStateForTests();
  fake = new FakeAirtable(DEFAULT_AIRTABLE_BASE_ID);
  vi.stubGlobal("fetch", fake.fetch);
  vi.stubEnv("AIRTABLE_TOKEN", TOKEN);
  vi.stubEnv("AIRTABLE_BASE_ID", "");
  logs = [];
  sleeps = [];
  // A virtual clock: only sleeping (pacing, retries) moves time.
  clock = Date.parse("2026-09-24T18:30:00.000Z");
  airtableTiming.now = () => clock;
  airtableTiming.sleep = async (ms: number) => {
    sleeps.push(ms);
    clock += ms;
  };
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});

afterEach(() => {
  vi.useRealTimers();
  Object.assign(airtableTiming, realTiming);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function expectCleanLogs() {
  const all = logs.join("\n");
  for (const secret of [TOKEN, "SuperSecret", lead.email, "Rivera", PID]) expect(all).not.toContain(secret);
}

async function signUp(id = PID, l = lead) {
  expect(await createPlayer(id, l)).toEqual({ stored: true });
  return fake.players().find((p) => p.fields[PLAYER_FIELDS.playerId] === id)!;
}

describe("configuration", () => {
  it("is off without a token, and then sends nothing", async () => {
    vi.stubEnv("AIRTABLE_TOKEN", "  ");
    expect(isAirtableConfigured()).toBe(false);
    expect((await createPlayer(PID, lead)).stored).toBe(false);
    expect(await loadCloudSave(PID)).toEqual({ cloud: false, save: null });
    expect(await storeCloudSave(PID, makeSave([]))).toEqual({ stored: false });
    expect(await deletePlayer(PID)).toBe(true);
    expect(await maybePurgeStalePlayers(Date.now(), true)).toBe(0);
    expect(fake.sent).toHaveLength(0);
  });

  it("uses DCI's base by default and AIRTABLE_BASE_ID when set", async () => {
    await createPlayer(PID, lead);
    expect(fake.sent[0].url.pathname).toBe(`/v0/${DEFAULT_AIRTABLE_BASE_ID}/${PLAYERS_TABLE}`);

    vi.stubEnv("AIRTABLE_BASE_ID", "appAAAAAAAAAAAAAA");
    const other = new FakeAirtable("appAAAAAAAAAAAAAA");
    vi.stubGlobal("fetch", other.fetch);
    expect((await createPlayer(OTHER, lead)).stored).toBe(true);
    expect(other.sent[0].url.pathname).toBe(`/v0/appAAAAAAAAAAAAAA/${PLAYERS_TABLE}`);
  });

  it("turns off (and says why, without the token) for a malformed base id", async () => {
    vi.stubEnv("AIRTABLE_BASE_ID", "https://airtable.com/appXYZ");
    expect(isAirtableConfigured()).toBe(false);
    expect((await createPlayer(PID, lead)).stored).toBe(false);
    expect(fake.sent).toHaveLength(0);
    expect(logs.join("\n")).toMatch(/AIRTABLE_BASE_ID/);
    expectCleanLogs();
  });
});

describe("createPlayer", () => {
  it("POSTs one Players row keyed by field IDs, with the bearer token and a timeout", async () => {
    const now = new Date("2026-09-24T18:30:00.000Z");
    expect((await createPlayer(PID.toUpperCase(), lead, now)).stored).toBe(true);
    expect(fake.sent).toHaveLength(1);
    const [req] = fake.sent;
    expect(req.method).toBe("POST");
    expect(req.url.toString()).toBe(`https://api.airtable.com/v0/${DEFAULT_AIRTABLE_BASE_ID}/${PLAYERS_TABLE}`);
    expect(req.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(req.headers["Content-Type"]).toBe("application/json");
    expect(req.signal).toBeInstanceOf(AbortSignal);
    expect(req.body).toEqual({
      records: [
        {
          fields: {
            [PLAYER_FIELDS.name]: "Jamie Rivera",
            [PLAYER_FIELDS.email]: "jamie.rivera@example.com",
            [PLAYER_FIELDS.marketingOptIn]: true,
            [PLAYER_FIELDS.signedUp]: now.toISOString(),
            [PLAYER_FIELDS.lastPlayed]: now.toISOString(),
            [PLAYER_FIELDS.shiftsPlayed]: 0,
            [PLAYER_FIELDS.shiftsWon]: 0,
            [PLAYER_FIELDS.playerId]: PID,
          },
        },
      ],
      returnFieldsByFieldId: true,
    });
  });

  it("refuses a non-UUID id without calling Airtable", async () => {
    expect((await createPlayer("not-a-uuid", lead)).stored).toBe(false);
    expect(fake.sent).toHaveLength(0);
  });

  it("reports stored:false (not worth retrying) on an API error and logs only the status and error type", async () => {
    fake.failNext({ status: 422, body: { error: { type: "INVALID_VALUE_FOR_COLUMN", message: `bad "${lead.email}"` } } });
    expect(await createPlayer(PID, lead)).toEqual({ stored: false });
    expect(logs.join("\n")).toContain("airtable create-player failed: HTTP 422 INVALID_VALUE_FOR_COLUMN");
    expectCleanLogs();
  });

  it("reports a temporary failure (retry later) when the network fails or times out", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    expect(await createPlayer(PID, lead)).toEqual({ stored: false, retryAfterSec: 30 });
    expect(logs.join("\n")).toContain("airtable create-player failed: TimeoutError");
    expectCleanLogs();
  });
});

describe("player lookup", () => {
  it("filters on the Player ID field by ID, with field IDs returned", async () => {
    await signUp();
    fake.sent.length = 0;
    await loadCloudSave(PID);
    const q = fake.sent[0].url.searchParams;
    expect(fake.sent[0].method).toBe("GET");
    expect(fake.sent[0].table).toBe(PLAYERS_TABLE);
    expect(q.get("filterByFormula")).toBe(`{fldxQabu9nsfdp0EF}="${PID}"`);
    expect(q.get("returnFieldsByFieldId")).toBe("true");
    expect(q.getAll("fields[]")).toContain(PLAYER_FIELDS.saveData);
  });

  it("never puts a non-UUID into a formula", async () => {
    const evil = `${PID}" , TRUE(), "`;
    expect(playerFormula(evil)).toBeNull();
    expect(await loadCloudSave(evil)).toEqual({ cloud: false, save: null });
    expect(await storeCloudSave(evil, makeSave([]))).toEqual({ stored: false });
    expect(await deletePlayer(evil)).toBe(true);
    expect(fake.sent).toHaveLength(0);
  });

  it("escapes quotes and backslashes in formula strings", () => {
    expect(formulaString(`a"b\\c`)).toBe(`"a\\"b\\\\c"`);
    expect(formulaString("line\nbreak")).toBe(`"line break"`);
  });
});

describe("loadCloudSave", () => {
  it("returns cloud:false for an unknown player", async () => {
    expect(await loadCloudSave(PID)).toEqual({ cloud: false, save: null });
  });

  it("returns the profile (from the columns) before any save exists", async () => {
    await signUp();
    const res = await loadCloudSave(PID);
    expect(res).toEqual({
      cloud: true,
      save: null,
      profile: {
        name: "Jamie Rivera",
        email: "jamie.rivera@example.com",
        guest: false,
        consentAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        marketingOptIn: true,
      },
    });
  });

  it("round-trips a stored save, with the server's player id and profile", async () => {
    await signUp();
    const save = makeSave([entry(minutes(1))]);
    expect((await storeCloudSave(PID, save)).stored).toBe(true);
    const res = await loadCloudSave(PID);
    expect(res.cloud).toBe(true);
    expect(res.save?.playerId).toBe(PID);
    expect(res.save?.profile?.email).toBe(lead.email);
    expect(res.save?.pathways["help-desk"]?.history).toEqual(save.pathways["help-desk"]!.history);
    // The stored blob never holds personal data.
    const blob = String(fake.players()[0].fields[PLAYER_FIELDS.saveData]);
    expect(blob).not.toContain(lead.email);
    expect(blob).not.toContain("Rivera");
    expect(JSON.parse(blob).profile).toBeNull();
  });

  it("treats damaged Save data as no save (profile still returned)", async () => {
    const rec = await signUp();
    rec.fields[PLAYER_FIELDS.saveData] = "{not json";
    expect(await loadCloudSave(PID)).toMatchObject({ cloud: true, save: null, profile: { name: "Jamie Rivera" } });
  });
});

describe("storeCloudSave", () => {
  it("returns false (and writes nothing) for an unknown player", async () => {
    expect((await storeCloudSave(PID, makeSave([entry(minutes(1))]))).stored).toBe(false);
    expect(fake.sent.map((r) => r.method)).toEqual(["GET"]);
    expect(fake.results()).toHaveLength(0);
  });

  it("writes the save, Save updated, Last played and the summary columns", async () => {
    const rec = await signUp();
    const now = new Date("2026-09-25T10:00:00.000Z");
    const save = makeSave([entry(minutes(1)), entry(minutes(2), { status: "lost-breach", stars: 0 })]);
    save.pathways.cybersecurity = { ...save.pathways["help-desk"]!, attempts: 3, wins: 1, best: { stars: 2, completedAt: minutes(3) }, history: [] };
    fake.sent.length = 0;
    expect((await storeCloudSave(PID, save, now)).stored).toBe(true);

    const patch = fake.sent.find((r) => r.method === "PATCH")!;
    expect(patch.url.pathname).toBe(`/v0/${DEFAULT_AIRTABLE_BASE_ID}/${PLAYERS_TABLE}/${rec.id}`);
    const fields = (patch.body as { fields: Record<string, unknown> }).fields;
    expect(fields[PLAYER_FIELDS.lastPlayed]).toBe(now.toISOString());
    expect(fields[PLAYER_FIELDS.saveUpdated]).toBe(now.toISOString());
    expect(fields[PLAYER_FIELDS.shiftsPlayed]).toBe(5);
    expect(fields[PLAYER_FIELDS.shiftsWon]).toBe(2);
    expect(fields[PLAYER_FIELDS.bestStars]).toBe(3);
    expect(JSON.parse(String(fields[PLAYER_FIELDS.saveData]))).toMatchObject({ playerId: PID, profile: null, version: 2 });
  });

  it("sends an empty Best stars (not 0, which Airtable rejects) when nothing was won yet", async () => {
    await signUp();
    const save = makeSave([entry(minutes(1), { status: "lost-timeout", stars: 0 })]);
    expect((await storeCloudSave(PID, save)).stored).toBe(true);
    const patch = fake.sent.find((r) => r.method === "PATCH")!;
    expect((patch.body as { fields: Record<string, unknown> }).fields[PLAYER_FIELDS.bestStars]).toBeNull();
  });

  it("creates one Shift Results row per finished shift, linked to the player", async () => {
    const rec = await signUp();
    const save = makeSave([
      entry(minutes(1)),
      entry(minutes(2), { status: "lost-breach", stars: 0, catches: 1, falseAlarms: 2, misses: 3 }),
      entry(minutes(3), { status: "lost-timeout", stars: 1 }),
    ]);
    expect((await storeCloudSave(PID, save)).stored).toBe(true);

    const rows = fake.results().map((r) => r.fields);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      [RESULT_FIELDS.summary]: "Jamie R. · Help Desk · Won ★★★",
      [RESULT_FIELDS.pathway]: "Help Desk",
      [RESULT_FIELDS.encounter]: "Monday, 8:57 AM",
      [RESULT_FIELDS.outcome]: "Won",
      [RESULT_FIELDS.stars]: 3,
      [RESULT_FIELDS.catches]: 4,
      [RESULT_FIELDS.falseAlarms]: 1,
      [RESULT_FIELDS.misses]: 0,
      [RESULT_FIELDS.playedAt]: minutes(1),
      [RESULT_FIELDS.player]: [rec.id],
    });
    expect(rows[1]).toMatchObject({
      [RESULT_FIELDS.summary]: "Jamie R. · Help Desk · Breach",
      [RESULT_FIELDS.outcome]: "Breach",
      [RESULT_FIELDS.stars]: null,
      [RESULT_FIELDS.catches]: 1,
      [RESULT_FIELDS.falseAlarms]: 2,
      [RESULT_FIELDS.misses]: 3,
    });
    expect(rows[2]).toMatchObject({ [RESULT_FIELDS.summary]: "Jamie R. · Help Desk · Out of time ★", [RESULT_FIELDS.outcome]: "Out of time" });
    // The result rows went out before the save itself (so a failed row write is retried next push).
    const methods = fake.sent.slice(1).map((r) => `${r.method} ${r.table}`);
    expect(methods).toEqual([`GET ${PLAYERS_TABLE}`, `POST ${RESULTS_TABLE}`, `PATCH ${PLAYERS_TABLE}`]);
    expect(fake.players()[0].fields[PLAYER_FIELDS.results]).toHaveLength(3);
  });

  it("uses the encounter id when the encounter is not in the game content", async () => {
    await signUp();
    await storeCloudSave(PID, makeSave([entry(minutes(1), { encounterId: "hd-99-future" })]));
    expect(fake.results()[0].fields[RESULT_FIELDS.encounter]).toBe("hd-99-future");
  });

  it("only adds rows for shifts it has not seen, even after the client trims its history", async () => {
    await signUp();
    const all = Array.from({ length: 6 }, (_, i) => entry(minutes(i)));
    await storeCloudSave(PID, makeSave(all.slice(0, 4)));
    expect(fake.results()).toHaveLength(4);

    // Same history again (a periodic push with no new battle): nothing new.
    await storeCloudSave(PID, makeSave(all.slice(0, 4)));
    expect(fake.results()).toHaveLength(4);

    // The client keeps only its newest entries: two old ones fall off, two new ones arrive.
    // Same length as before, but two new shifts.
    await storeCloudSave(PID, makeSave(all.slice(2, 6)));
    expect(fake.results().map((r) => r.fields[RESULT_FIELDS.playedAt])).toEqual(all.map((e) => e.at));
  });

  it(`writes at most ${MAX_NEW_RESULTS_PER_SAVE} rows per save (the newest), in one request`, async () => {
    await signUp();
    const history = Array.from({ length: 50 }, (_, i) => entry(minutes(i)));
    fake.sent.length = 0;
    expect(await storeCloudSave(PID, makeSave(history))).toEqual({ stored: true });
    const posts = fake.sent.filter((r) => r.method === "POST" && r.table === RESULTS_TABLE);
    expect(posts.map((p) => (p.body as { records: unknown[] }).records.length)).toEqual([MAX_NEW_RESULTS_PER_SAVE]);
    const at = fake.results().map((r) => r.fields[RESULT_FIELDS.playedAt]);
    expect(at).toEqual(history.slice(-MAX_NEW_RESULTS_PER_SAVE).map((e) => e.at));
    // Only a count is logged.
    expect(logs.join("\n")).toContain("skipped 45 Shift Results row(s)");
    expectCleanLogs();

    // The same history again adds nothing: the skipped entries are part of the stored save.
    expect(await storeCloudSave(PID, makeSave(history))).toEqual({ stored: true });
    expect(fake.results()).toHaveLength(MAX_NEW_RESULTS_PER_SAVE);
  });

  it(`writes at most ${RESULT_ROWS_PER_DAY} rows per player per day, however many pushes`, async () => {
    await signUp();
    const history: Entry[] = [];
    for (let push = 0; push < 20; push++) {
      for (let i = 0; i < 50; i++) history.push(entry(minutes(push * 50 + i)));
      expect(await storeCloudSave(PID, makeSave(history.slice(-50)))).toEqual({ stored: true });
    }
    expect(fake.results()).toHaveLength(RESULT_ROWS_PER_DAY);

    // A new day, a new allowance.
    clock += 24 * 60 * 60 * 1000;
    history.push(entry(minutes(5000)));
    await storeCloudSave(PID, makeSave(history.slice(-50)));
    expect(fake.results()).toHaveLength(RESULT_ROWS_PER_DAY + 1);
  });

  it("ignores history entries dated in the future", async () => {
    await signUp();
    const soon = new Date(clock + 60_000).toISOString();
    const later = new Date(clock + 60 * 60_000).toISOString();
    await storeCloudSave(PID, makeSave([entry(soon), entry(later)]));
    expect(fake.results().map((r) => r.fields[RESULT_FIELDS.playedAt])).toEqual([soon]);
  });

  it("does not write the save when result rows fail, so the next push retries them", async () => {
    await signUp();
    const save = makeSave([entry(minutes(1))]);
    const original = fake.fetch;
    let calls = 0;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      calls += 1;
      // 1st: player lookup (OK). 2nd: the Shift Results POST fails.
      if (calls === 2) return new Response(JSON.stringify({ error: { type: "INVALID_MULTIPLE_CHOICE_OPTIONS" } }), { status: 422 });
      return original(input, init);
    });
    expect((await storeCloudSave(PID, save)).stored).toBe(false);
    expect(fake.players()[0].fields[PLAYER_FIELDS.saveData]).toBeUndefined();

    vi.stubGlobal("fetch", original);
    expect((await storeCloudSave(PID, save)).stored).toBe(true);
    expect(fake.results()).toHaveLength(1);
    expect(logs.join("\n")).toContain("HTTP 422 INVALID_MULTIPLE_CHOICE_OPTIONS");
    expectCleanLogs();
  });

  it("does not write rows twice when the save write fails after the rows went in", async () => {
    await signUp();
    await storeCloudSave(PID, makeSave([entry(minutes(1))]));
    expect(fake.results()).toHaveLength(1);
    resetAirtableStateForTests(); // as if on another server instance: nothing cached

    // Battle end: the rows are written, then the PATCH is rate limited (Airtable's 30 s penalty).
    const save = makeSave([entry(minutes(1)), entry(minutes(2)), entry(minutes(3), { status: "lost-breach", stars: 0 })]);
    const original = fake.fetch;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "PATCH") return new Response("{}", { status: 429 });
      return original(input, init);
    });
    expect(await storeCloudSave(PID, save)).toEqual({ stored: false, retryAfterSec: 30 });
    expect(fake.results()).toHaveLength(3);

    // After the penalty, the next push finds those rows and only writes the save.
    vi.stubGlobal("fetch", original);
    clock += 31_000;
    fake.sent.length = 0;
    expect(await storeCloudSave(PID, save)).toEqual({ stored: true });
    expect(fake.results()).toHaveLength(3);
    const lookup = fake.sent.find((r) => r.method === "GET" && r.table === RESULTS_TABLE)!;
    expect(lookup.url.searchParams.get("filterByFormula")).toMatch(
      /^OR\(RECORD_ID\(\)="rec[A-Za-z0-9]{14}"(, RECORD_ID\(\)="rec[A-Za-z0-9]{14}")*\)$/,
    );
    expect(lookup.url.searchParams.get("returnFieldsByFieldId")).toBe("true");
    expect(lookup.url.searchParams.getAll("fields[]")).toEqual([
      RESULT_FIELDS.player,
      RESULT_FIELDS.pathway,
      RESULT_FIELDS.encounter,
      RESULT_FIELDS.playedAt,
    ]);
    expect(JSON.parse(String(fake.players()[0].fields[PLAYER_FIELDS.saveData])).serverMeta.resultRows).toBe(3);

    // A later battle adds exactly one row, with no extra lookup.
    fake.sent.length = 0;
    await storeCloudSave(PID, makeSave([...save.pathways["help-desk"]!.history, entry(minutes(4))]));
    expect(fake.results()).toHaveLength(4);
    expect(fake.sent.some((r) => r.method === "GET" && r.table === RESULTS_TABLE)).toBe(false);
  });

  it("does not write rows twice when Airtable wrote them but the answer never arrived", async () => {
    await signUp();
    const save = makeSave([entry(minutes(1)), entry(minutes(2))]);
    const original = fake.fetch;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const res = await original(input, init);
      if (init?.method === "POST") throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      return res;
    });
    expect(await storeCloudSave(PID, save)).toEqual({ stored: false, retryAfterSec: 30 });
    expect(fake.results()).toHaveLength(2);

    vi.stubGlobal("fetch", original);
    expect(await storeCloudSave(PID, save)).toEqual({ stored: true });
    expect(fake.results()).toHaveLength(2);
  });

  it("routine pushes from a known player cost one request (no lookup)", async () => {
    const rec = await signUp();
    await storeCloudSave(PID, makeSave([entry(minutes(1))]));
    fake.sent.length = 0;
    const moved = makeSave([entry(minutes(1))], { hub: { x: 9, y: 9 } });
    expect(await storeCloudSave(PID, moved)).toEqual({ stored: true });
    expect(fake.sent.map((r) => `${r.method} ${r.table}`)).toEqual([`PATCH ${PLAYERS_TABLE}`]);
    expect(fake.sent[0].recordId).toBe(rec.id);
    expect(JSON.parse(String(fake.players()[0].fields[PLAYER_FIELDS.saveData])).pathways["help-desk"].hub).toEqual({ x: 9, y: 9 });
  });

  it("a known player deleted meanwhile (by staff) is not stored or recreated", async () => {
    await signUp();
    await storeCloudSave(PID, makeSave([entry(minutes(1))]));
    fake.tables.get(PLAYERS_TABLE)!.delete(fake.players()[0].id);
    expect(await storeCloudSave(PID, makeSave([entry(minutes(1))]))).toEqual({ stored: false });
    expect(await storeCloudSave(PID, makeSave([entry(minutes(1))]))).toEqual({ stored: false });
    expect(fake.players()).toHaveLength(0);
  });

  it("runs one player's saves one at a time, so overlapping pushes add each shift once", async () => {
    await signUp();
    const save = makeSave([entry(minutes(1)), entry(minutes(2))]);
    const [a, b] = await Promise.all([storeCloudSave(PID, save), storeCloudSave(PID, save)]);
    expect([a, b]).toEqual([{ stored: true }, { stored: true }]);
    expect(fake.results()).toHaveLength(2);
  });
});

describe("429 handling (5 requests per second per base, 30 s penalty)", () => {
  it("retries once after a short Retry-After and then succeeds", async () => {
    fake.failNext({ status: 429, headers: { "Retry-After": "1" } });
    expect(await createPlayer(PID, lead)).toEqual({ stored: true });
    expect(sleeps).toEqual([1000]);
    expect(fake.sent).toHaveLength(2);
    expect(fake.players()).toHaveLength(1);
  });

  it("without Retry-After: no retry inside the penalty, a temporary failure, then a 30 s cooldown", async () => {
    fake.failNext({ status: 429 });
    await expect(createPlayer(PID, lead)).resolves.toEqual({ stored: false, retryAfterSec: 30 });
    expect(fake.sent).toHaveLength(1);
    expect(sleeps).toEqual([]);
    expect(logs.join("\n")).toContain("HTTP 429");
    expectCleanLogs();

    // During the cooldown nothing is sent, and callers are told when to come back.
    clock += 10_000;
    expect(await createPlayer(OTHER, lead)).toEqual({ stored: false, retryAfterSec: 20 });
    expect(await loadCloudSave(PID)).toEqual({ cloud: false, save: null, retryAfterSec: 20 });
    expect(fake.sent).toHaveLength(1);
    expect(logs.join("\n")).toContain("AirtableBusy");

    clock += 20_000;
    expect(await createPlayer(OTHER, lead)).toEqual({ stored: true });
  });

  it("gives up after one retry (never an exception)", async () => {
    fake.failNext({ status: 429, headers: { "Retry-After": "0.5" } }, { status: 429, headers: { "Retry-After": "0.5" } });
    await expect(createPlayer(PID, lead)).resolves.toEqual({ stored: false, retryAfterSec: 30 });
    expect(fake.sent).toHaveLength(2);
    expect(sleeps).toEqual([500]);
  });

  it("does not wait out a long Retry-After inside a request, and cools down for it", async () => {
    fake.failNext({ status: 429, headers: { "Retry-After": "45" } });
    expect(await createPlayer(PID, lead)).toEqual({ stored: false, retryAfterSec: 45 });
    expect(sleeps).toEqual([]);
    expect(fake.sent).toHaveLength(1);
  });

  it("recognizes the monthly API call cap: no retry, a long cooldown, a clear log line", async () => {
    fake.failNext({ status: 429, body: { errors: [{ error: "PUBLIC_API_BILLING_LIMIT_EXCEEDED", message: "..." }] } });
    expect(await createPlayer(PID, lead)).toEqual({ stored: false, retryAfterSec: 600 });
    expect(fake.sent).toHaveLength(1);
    expect(logs.join("\n")).toContain("HTTP 429 PUBLIC_API_BILLING_LIMIT_EXCEEDED (monthly API call limit reached");
  });

  it("does not retry other errors; 5xx is temporary, 4xx is not", async () => {
    fake.failNext({ status: 503 });
    expect(await createPlayer(PID, lead)).toEqual({ stored: false, retryAfterSec: 30 });
    expect(fake.sent).toHaveLength(1);
    fake.failNext({ status: 403, body: { error: { type: "INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND" } } });
    expect(await createPlayer(PID, lead)).toEqual({ stored: false });
  });
});

describe("pacing (per server instance)", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `0b7c6f0e-1b7e-4a53-9a44-2a8a7a3b1c${String(i).padStart(2, "0")}`);

  it(`sends at most ${PACE_PER_SECOND} requests in any rolling second`, async () => {
    // Concurrent waits need a real (fake-timer) clock rather than the sequential virtual one.
    vi.useFakeTimers();
    Object.assign(airtableTiming, realTiming);
    const times: number[] = [];
    const original = fake.fetch;
    vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) => {
      times.push(Date.now());
      return original(input, init);
    });
    const all = Promise.all(ids(12).map((id) => createPlayer(id, lead)));
    await vi.runAllTimersAsync();
    const results = await all;
    vi.useRealTimers();
    expect(results.every((r) => r.stored)).toBe(true);
    expect(times).toHaveLength(12);
    for (let i = PACE_PER_SECOND; i < times.length; i++) expect(times[i] - times[i - PACE_PER_SECOND]).toBeGreaterThanOrEqual(1000);
  });

  it(`gives up (temporarily) instead of queueing longer than ${PACE_MAX_WAIT_MS / 1000} s`, async () => {
    // Queued requests never wake up here, so the queue only grows.
    airtableTiming.sleep = () => new Promise(() => undefined);
    const pending = ids(40).map((id) => createPlayer(id, lead));
    const last = await Promise.race([Promise.all(pending.slice(-10)), new Promise((r) => setTimeout(() => r("hung"), 200))]);
    expect(last).toEqual(Array(10).fill({ stored: false, retryAfterSec: 30 }));
    expect(fake.sent).toHaveLength(PACE_PER_SECOND);
  });
});

describe("Save data size (Airtable long text: 100,000 characters)", () => {
  const pad = "x".repeat(150);

  it("keeps a normal save whole", () => {
    const packed = packSaveData(makeSave([entry(minutes(1))]));
    expect(packed?.trimmed).toBe(0);
    expect(JSON.parse(packed!.json).serverMeta).toBeUndefined();
  });

  it("trims the oldest history entries to fit, and remembers where it trimmed", async () => {
    const history = Array.from({ length: 600 }, (_, i) => entry(minutes(i), { encounterId: `hd-01-monday-${pad}` }));
    const save = makeSave(history);
    expect(JSON.stringify(save).length).toBeGreaterThan(SAVE_DATA_MAX_CHARS);

    await signUp();
    expect((await storeCloudSave(PID, save)).stored).toBe(true);
    const blob = String(fake.players()[0].fields[PLAYER_FIELDS.saveData]);
    expect(blob.length).toBeLessThanOrEqual(SAVE_DATA_MAX_CHARS);
    const stored = JSON.parse(blob);
    const kept = stored.pathways["help-desk"].history as Entry[];
    expect(kept.length).toBeLessThan(600);
    expect(kept[kept.length - 1].at).toBe(minutes(599));
    expect(kept[0].at).toBe(minutes(600 - kept.length));
    expect(stored.serverMeta.historyTrimmedThrough["help-desk"]).toBe(minutes(599 - kept.length));
    expect(stored.pathways["help-desk"].attempts).toBe(600);

    // Pushing the same long history again adds no rows for the trimmed-away entries.
    const before = fake.results().length;
    expect((await storeCloudSave(PID, save)).stored).toBe(true);
    expect(fake.results()).toHaveLength(before);

    // The trimmed save still loads.
    const loaded = await loadCloudSave(PID);
    expect(loaded.save?.pathways["help-desk"]?.history).toHaveLength(kept.length);
    expect(loaded.save).not.toHaveProperty("serverMeta");
  });

  it("drops in-progress battle state before giving up on the history", () => {
    const save = makeSave([entry(minutes(1))], { battle: { huge: "y".repeat(120_000) } });
    const packed = packSaveData(save)!;
    expect(packed.droppedBattles).toBe(true);
    expect(packed.trimmed).toBe(0);
    expect(packed.json.length).toBeLessThanOrEqual(SAVE_DATA_MAX_CHARS);
    expect(JSON.parse(packed.json).pathways["help-desk"].battle).toBeNull();
  });

  it("stores the summary columns only when nothing else fits (and adds no rows)", async () => {
    await signUp();
    const save = makeSave([entry(minutes(1))], { notes: "z".repeat(120_000) });
    expect((await storeCloudSave(PID, save)).stored).toBe(true);
    const patch = fake.sent.find((r) => r.method === "PATCH")!;
    const fields = (patch.body as { fields: Record<string, unknown> }).fields;
    expect(fields).not.toHaveProperty(PLAYER_FIELDS.saveData);
    expect(fields[PLAYER_FIELDS.shiftsPlayed]).toBe(1);
    expect(fake.results()).toHaveLength(0);
    expect(logs.join("\n")).toMatch(/summary only/);
  });
});

describe("newShiftResults", () => {
  it("matches by time + encounter, skips unfinished or malformed entries", () => {
    const stored = JSON.stringify(makeSave([entry(minutes(1))]));
    const incoming = makeSave([
      entry(minutes(1)),
      entry(minutes(1), { encounterId: "hd-02" }),
      entry(minutes(2), { status: "playing" as never }),
      entry("yesterday"),
      entry(minutes(3)),
      entry(minutes(3)),
    ]);
    expect(newShiftResults(incoming, stored).map((r) => [r.at, r.encounterId])).toEqual([
      [minutes(1), "hd-02"],
      [minutes(3), "hd-01-monday"],
    ]);
  });

  it("treats everything as new when nothing is stored yet", () => {
    expect(newShiftResults(makeSave([entry(minutes(1)), entry(minutes(2))]), undefined)).toHaveLength(2);
  });
});

describe("generated shifts (Daily practice, drills) and the optional M3 columns", () => {
  const daily = entry(minutes(1), {
    encounterId: "hd-daily-7",
    stars: 0,
    mode: "daily",
    right: 7,
    partly: 1,
    missed: 1,
    focus: "verify-identity",
  });
  const drill = entry(minutes(2), { encounterId: "hd-drill-verify-identity-2", stars: 0, mode: "drill", right: 5, partly: 0, missed: 1, focus: "verify-identity" });

  afterEach(() => {
    for (const key of Object.keys(OPTIONAL_RESULT_FIELDS) as (keyof typeof OPTIONAL_RESULT_FIELDS)[]) OPTIONAL_RESULT_FIELDS[key] = null;
    OPTIONAL_PLAYER_FIELDS.skillLevels = null;
  });

  it("summarizes a daily and a drill with right counts, and keeps their ids in Encounter", () => {
    const [d, r] = newShiftResults(makeSave([daily, drill]), undefined);
    expect(d).toMatchObject({ mode: "daily", right: 7, partly: 1, missed: 1, focus: "verify-identity" });
    const df = resultFields(d, "Jamie Rivera", "recAAAAAAAAAAAAAA");
    expect(df[RESULT_FIELDS.summary]).toBe("Jamie R. · Help Desk · Daily practice · 7/9 right");
    expect(df[RESULT_FIELDS.encounter]).toBe("hd-daily-7");
    expect(df[RESULT_FIELDS.outcome]).toBe("Won");
    expect(df[RESULT_FIELDS.stars]).toBeNull();
    const rf = resultFields(r, "Jamie Rivera", "recAAAAAAAAAAAAAA");
    expect(rf[RESULT_FIELDS.summary]).toBe("Jamie R. · Help Desk · Drill: Check who's asking · 5/6 right");
    expect(rf[RESULT_FIELDS.encounter]).toBe("hd-drill-verify-identity-2");
    // Nothing is written to columns the base doesn't have yet.
    expect(Object.keys(df).sort()).toEqual(Object.values(RESULT_FIELDS).sort());
  });

  it("cleans the new history fields (bounded 0-20, known modes and skills only)", () => {
    const junk = entry(minutes(3), {
      encounterId: "hd-daily-8",
      mode: "boss" as never,
      right: 999,
      partly: -4,
      missed: Number.NaN,
      focus: "<script>" as never,
    });
    const [r] = newShiftResults(makeSave([junk]), undefined);
    expect(r.mode).toBeUndefined();
    expect(r.right).toBe(20);
    expect(r.partly).toBe(0);
    expect(r.missed).toBeUndefined();
    expect(r.focus).toBeUndefined();
    // Older clients send no counts: the summary falls back to the outcome.
    const [old] = newShiftResults(makeSave([entry(minutes(4), { encounterId: "hd-daily-9", stars: 0 })]), undefined);
    expect(resultFields(old, "Jamie Rivera", "recAAAAAAAAAAAAAA")[RESULT_FIELDS.summary]).toBe("Jamie R. · Help Desk · Daily practice · Won");
  });

  it("writes the optional columns only when their field ids are configured", async () => {
    OPTIONAL_RESULT_FIELDS.mode = "fldMODEAAAAAAAAAA";
    OPTIONAL_RESULT_FIELDS.right = "fldRIGHTAAAAAAAAA";
    OPTIONAL_RESULT_FIELDS.focus = "fldFOCUSAAAAAAAAA";
    OPTIONAL_PLAYER_FIELDS.skillLevels = "fldSKILLSAAAAAAAA";
    await signUp();
    const save = makeSave([daily], {
      skills: {
        "verify-identity": { recent: "RrRr", n: 4, level: 3, days: [], last: "2026-09-24", solidOn: "2026-09-24" },
        "confirm-fix": { recent: "W", n: 1, level: 1, days: [], last: "2026-09-24", solidOn: null },
        "guard-data": "junk",
      },
    });
    expect((await storeCloudSave(PID, save)).stored).toBe(true);
    const [row] = fake.results().map((x) => x.fields);
    expect(row.fldMODEAAAAAAAAAA).toBe("Daily");
    expect(row.fldRIGHTAAAAAAAAA).toBe(7);
    expect(row.fldFOCUSAAAAAAAAA).toBe("Check who's asking");
    expect(row).not.toHaveProperty("null");
    const patch = fake.sent.find((x) => x.method === "PATCH")!;
    expect((patch.body as { fields: Record<string, unknown> }).fields.fldSKILLSAAAAAAAA).toBe(
      "Check who's asking: Solid; Confirm the fix: Learning",
    );
    expect(skillLevelsText(makeSave([]))).toBe("");
  });
});

describe("shortName", () => {
  it("keeps the first name and the last initial only", () => {
    expect(shortName("Jamie Rivera")).toBe("Jamie R.");
    expect(shortName("  mary  ann   smith ")).toBe("mary S.");
    expect(shortName("Cher")).toBe("Cher");
    expect(shortName("José Ávila")).toBe("José Á.");
    expect(shortName("")).toBe("Player");
  });
});

describe("deletePlayer", () => {
  it("deletes the player and their Shift Results rows, and nobody else's", async () => {
    await signUp();
    await signUp(OTHER, { ...lead, name: "Sam Lee" });
    const mine = fake.players().find((p) => p.fields[PLAYER_FIELDS.playerId] === PID)!;
    for (let i = 0; i < 12; i++) fake.seed(RESULTS_TABLE, { [RESULT_FIELDS.summary]: `Jamie R. #${i}`, [RESULT_FIELDS.player]: [mine.id] });
    await storeCloudSave(OTHER, makeSave([entry(minutes(1))]));
    expect(fake.results()).toHaveLength(13);
    fake.sent.length = 0;

    expect(await deletePlayer(PID)).toBe(true);
    expect(fake.players().map((p) => p.fields[PLAYER_FIELDS.playerId])).toEqual([OTHER]);
    expect(fake.results()).toHaveLength(1);
    const deletes = fake.sent.filter((r) => r.method === "DELETE");
    expect(deletes.map((d) => [d.table, d.url.searchParams.getAll("records[]").length])).toEqual([
      [RESULTS_TABLE, 10],
      [RESULTS_TABLE, 2],
      [PLAYERS_TABLE, 1],
    ]);
  });

  it("is true when there is nothing to delete", async () => {
    expect(await deletePlayer(PID)).toBe(true);
    expect(fake.sent.map((r) => r.method)).toEqual(["GET"]);
  });

  it("is false when Airtable cannot be reached", async () => {
    await signUp();
    fake.failNext({ status: 500 });
    expect(await deletePlayer(PID)).toBe(false);
    expect(fake.players()).toHaveLength(1);
  });
});

describe("retention purge", () => {
  it("uses a field-ID formula on Last played (Signed up as a fallback)", () => {
    expect(purgeFormula(24)).toBe(
      "AND(OR({fld3rXLCWOoDJbkbK}, {fldMK5EgIJQ1diTNh}), IS_BEFORE(IF({fld3rXLCWOoDJbkbK}, {fld3rXLCWOoDJbkbK}, {fldMK5EgIJQ1diTNh}), DATEADD(NOW(), -24, 'months')))",
    );
  });

  it("deletes inactive players and their results; keeps active ones; once a day unless forced", async () => {
    const old = fake.seed(PLAYERS_TABLE, {
      [PLAYER_FIELDS.name]: "Old Player",
      [PLAYER_FIELDS.playerId]: OTHER,
      [PLAYER_FIELDS.lastPlayed]: "2024-01-01T00:00:00.000Z",
    });
    fake.seed(RESULTS_TABLE, { [RESULT_FIELDS.summary]: "Old P. · Help Desk · Won", [RESULT_FIELDS.player]: [old] });
    fake.seed(PLAYERS_TABLE, { [PLAYER_FIELDS.name]: "Signed Only", [PLAYER_FIELDS.signedUp]: "2023-05-01T00:00:00.000Z" });
    fake.seed(PLAYERS_TABLE, { [PLAYER_FIELDS.name]: "Recent", [PLAYER_FIELDS.lastPlayed]: "2026-01-01T00:00:00.000Z" });

    const now = Date.parse("2026-09-24T18:30:00.000Z");
    expect(await maybePurgeStalePlayers(now)).toBe(2);
    expect(fake.players().map((p) => p.fields[PLAYER_FIELDS.name])).toEqual(["Recent"]);
    expect(fake.results()).toHaveLength(0);
    const list = fake.sent.find((r) => r.method === "GET")!;
    expect(list.url.searchParams.get("filterByFormula")).toBe(purgeFormula());
    expect(list.url.searchParams.get("returnFieldsByFieldId")).toBe("true");
    expect(logs.join("\n")).toContain("retention: deleted 2");

    fake.sent.length = 0;
    expect(await maybePurgeStalePlayers(now + 60_000)).toBe(0);
    expect(fake.sent).toHaveLength(0);
    expect(await maybePurgeStalePlayers(now + 60_000, true)).toBe(0);
    // One query for inactive players, one for results with no player.
    expect(fake.sent.map((r) => `${r.method} ${r.table}`)).toEqual([`GET ${PLAYERS_TABLE}`, `GET ${RESULTS_TABLE}`]);
  });

  it("also deletes Shift Results rows left without a player (older than a day)", async () => {
    const day = 24 * 60 * 60 * 1000;
    const kept = fake.seed(PLAYERS_TABLE, { [PLAYER_FIELDS.name]: "Recent", [PLAYER_FIELDS.lastPlayed]: "2026-09-01T00:00:00.000Z" });
    const ago = (ms: number) => new Date(fake.now - ms).toISOString();
    fake.seed(RESULTS_TABLE, { [RESULT_FIELDS.summary]: "Recent · linked", [RESULT_FIELDS.player]: [kept] }, undefined, ago(9 * day));
    fake.seed(RESULTS_TABLE, { [RESULT_FIELDS.summary]: "Jamie R. · orphan" }, undefined, ago(3 * day));
    fake.seed(RESULTS_TABLE, { [RESULT_FIELDS.summary]: "Sam L. · orphan, just now" }, undefined, ago(60_000));

    expect(await maybePurgeStalePlayers(fake.now, true)).toBe(0);
    expect(fake.results().map((r) => r.fields[RESULT_FIELDS.summary])).toEqual(["Recent · linked", "Sam L. · orphan, just now"]);
    const list = fake.sent.find((r) => r.method === "GET" && r.table === RESULTS_TABLE)!;
    expect(list.url.searchParams.get("filterByFormula")).toBe(unlinkedResultsFormula());
    expect(list.url.searchParams.get("returnFieldsByFieldId")).toBe("true");
    expect(unlinkedResultsFormula()).toBe("AND(NOT({fld8TekR5hWVIeg26}), IS_BEFORE(CREATED_TIME(), DATEADD(NOW(), -1, 'days')))");
    expect(logs.join("\n")).toContain("deleted 1 Shift Results row(s) with no player");
  });

  it("returns 0 (no throw) when Airtable fails", async () => {
    fake.failNext({ status: 500 });
    expect(await maybePurgeStalePlayers(Date.now(), true)).toBe(0);
  });
});

describe("more than one pathway", () => {
  const cyber = (history: Entry[], extra: Record<string, unknown> = {}) => ({
    introSeen: true,
    hub: null,
    battle: null,
    pendingResult: null,
    best: null,
    attempts: history.length,
    wins: 0,
    history,
    ...extra,
  });

  it("names Cybersecurity shifts: the story title, daily and drill ids", () => {
    const save = makeSave([]);
    save.pathways.cybersecurity = cyber([
      entry(minutes(1), { encounterId: "cy-01-friday", stars: 2 }),
      entry(minutes(2), { encounterId: "cy-daily-3", stars: 0, mode: "daily", right: 6, partly: 1, missed: 1 }),
      entry(minutes(3), { encounterId: "cy-drill-guard-data-0", stars: 0, mode: "drill", right: 4, partly: 0, missed: 1 }),
    ]);
    const rows = newShiftResults(save, undefined);
    expect(rows.map((r) => r.pathway)).toEqual(["cybersecurity", "cybersecurity", "cybersecurity"]);
    const f = rows.map((r) => resultFields(r, "Jamie Rivera", "recAAAAAAAAAAAAAA"));
    expect(f[0][RESULT_FIELDS.pathway]).toBe("Cybersecurity");
    expect(f[0][RESULT_FIELDS.encounter]).toBe("Friday, 4:47 PM");
    expect(f[1][RESULT_FIELDS.summary]).toBe("Jamie R. · Cybersecurity · Daily practice · 6/8 right");
    expect(f[1][RESULT_FIELDS.encounter]).toBe("cy-daily-3");
    expect(f[2][RESULT_FIELDS.summary]).toBe("Jamie R. · Cybersecurity · Drill: Guard the data · 4/5 right");
  });

  it("keeps the Help Desk Encounter title from the registry", () => {
    const [r] = newShiftResults(makeSave([entry(minutes(1))]), undefined);
    expect(resultFields(r, "Jamie Rivera", "recAAAAAAAAAAAAAA")[RESULT_FIELDS.encounter]).toBe("Monday, 8:57 AM");
  });

  it("labels skill levels by pathway once a second pathway has skills", () => {
    const rec = (level: number) => ({ recent: "RrR", n: 3, level, days: [], last: "2026-09-24", solidOn: null });
    const hd = makeSave([], { skills: { "verify-identity": rec(3) } });
    expect(skillLevelsText(hd)).toBe("Check who's asking: Solid");
    hd.pathways.cybersecurity = cyber([], { skills: { "guard-data": rec(1), "verify-identity": rec(2) } });
    expect(skillLevelsText(hd)).toBe("Help Desk — Check who's asking: Solid | Cybersecurity — Check who's asking: Practicing; Guard the data: Learning");
  });

  it("fits a two-pathway save into the Save data cell by trimming", () => {
    const pad = "x".repeat(150);
    const save = makeSave(Array.from({ length: 300 }, (_, i) => entry(minutes(i), { encounterId: `hd-01-monday-${pad}` })));
    save.pathways.cybersecurity = cyber(Array.from({ length: 300 }, (_, i) => entry(minutes(i + 1000), { encounterId: `cy-01-friday-${pad}` })));
    expect(JSON.stringify(save).length).toBeGreaterThan(SAVE_DATA_MAX_CHARS);
    const packed = packSaveData(save)!;
    expect(packed.json.length).toBeLessThanOrEqual(SAVE_DATA_MAX_CHARS);
    expect(packed.trimmed).toBeGreaterThan(0);
    const stored = JSON.parse(packed.json);
    expect(stored.pathways["help-desk"].attempts).toBe(300);
    expect(stored.pathways.cybersecurity.attempts).toBe(300);
  });

  it("imports no game content (the server never bundles a pathway)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./airtable.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/@\/content\/|lib\/game\/content|lib\/pathways/);
  });
});
