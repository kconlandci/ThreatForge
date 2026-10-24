// Fixture-only client checks. Does not read env files, contact Airtable, or bind HTTP.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

const root = fileURLToPath(new URL("../", import.meta.url));
const storage = new Map();
const originals = Object.fromEntries(["localStorage", "window", "fetch"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const windowTarget = new EventTarget();
Object.defineProperty(globalThis, "window", { configurable: true, value: windowTarget });
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
  get length() { return storage.size; },
  key: index => [...storage.keys()][index] ?? null,
} });

const studentA = "rec00000000000001";
const studentB = "rec00000000000002";
const fixtureSession = (studentId, exp = Math.floor(Date.now() / 1000) + 3600) => ({
  token: `${Buffer.from(JSON.stringify({ studentId, exp })).toString("base64url")}.public-fixture-signature`,
  studentId, name: "Fixture student", pathway: "Pilot test", expiresAt: exp * 1000,
});
const response = body => ({ ok: true, status: 200, json: async () => structuredClone(body) });
let fetchCalls = [];
let fetchHandler = async () => { throw new Error("Fixture offline"); };
globalThis.fetch = async (url, options = {}) => {
  assert.ok(String(url).startsWith("/api/dci/"), "Only fixture API paths are permitted");
  fetchCalls.push({ url, options });
  return fetchHandler(url, options);
};

const server = await createServer({
  root, configFile: false, envFile: false,
  plugins: [react(), {
    name: "dci-client-fixtures", enforce: "pre",
    resolveId(source) {
      if (source.startsWith("firebase/") || /config\/firebase(?:\.ts)?$/.test(source)) throw new Error("DCI imported Firebase");
      if (source === "@capacitor/preferences/dist/esm/index.js") return "\0dci-client-preferences";
      if (source === "@revenuecat/purchases-capacitor") return "\0dci-client-purchases";
      if (source === "dci-auth-fixture-hooks") return "\0dci-auth-fixture-hooks";
    },
    transform(code, id) {
      if (/\/src\/contexts\/DciAuthContext\.tsx$/.test(id)) return code.replace('from "react"', 'from "dci-auth-fixture-hooks"');
    },
    load(id) {
      if (id === "\0dci-client-purchases") return `export const Purchases = new Proxy({}, {
        get() { return async () => { throw new Error('DCI must never call the billing SDK'); }; }
      });`;
      // Drive the provider's async lifecycle manually; nested UI still uses
      // real React SSR. No DOM/test-renderer dependency or browser is needed.
      if (id === "\0dci-auth-fixture-hooks") return `
        export { createContext, useContext } from 'react';
        const state = [], effects = []; let stateIndex = 0, effectIndex = 0, pending = [];
        export function begin() {stateIndex = 0; effectIndex = 0;}
        export function useState(initial) {
          const index = stateIndex++;
          if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
          return [state[index], value => {state[index] = typeof value === 'function' ? value(state[index]) : value;}];
        }
        export function useEffect(effect, dependencies) {
          const index = effectIndex++, previous = effects[index];
          if (!previous || !dependencies || dependencies.some((value, i) => value !== previous.dependencies[i])) {
            previous?.cleanup?.(); effects[index] = {dependencies, effect}; pending.push(index);
          }
        }
        export function flush() {const work = pending; pending = []; for (const index of work) effects[index].cleanup = effects[index].effect();}
        export const ready = () => state[1] === true;
        export function reset() {for (const effect of effects) effect?.cleanup?.(); state.length = effects.length = pending.length = 0; begin();}
      `;
      if (id === "\0dci-client-preferences") return `
        let delayedKey = null, delay = null, writeStarted = null, delayedReadKey = null, readDelay = null, readStarted = null;
        export function delayNextWrite(key, promise) {
          delayedKey = key; delay = promise;
          return new Promise(resolve => { writeStarted = resolve; });
        }
        export function delayNextRead(key, promise) {
          delayedReadKey = key; readDelay = promise;
          return new Promise(resolve => { readStarted = resolve; });
        }
        export const Preferences = {
          async get({key}) {
            const value = localStorage.getItem('prefs:' + key);
            if (key === delayedReadKey) { const pending = readDelay; delayedReadKey = null; readDelay = null; readStarted(); readStarted = null; await pending; }
            return {value};
          },
          async set({key,value}) {
            if (key === delayedKey) { const pending = delay; delayedKey = null; delay = null; writeStarted(); writeStarted = null; await pending; }
            localStorage.setItem('prefs:' + key, value);
          },
          async remove({key}) { localStorage.removeItem('prefs:' + key); }
        };
      `;
    },
  }],
  define: { "import.meta.env.VITE_EDITION": '"dci"', "import.meta.env.VITE_DCI_SYNC_URL": "undefined" },
  resolve: { alias: [
    { find: /^@capacitor\/preferences$/, replacement: fileURLToPath(new URL("../src/sync/dciPreferences.ts", import.meta.url)) },
    { find: /^(?:\.\.\/|\.\/)contexts\/AuthContext$/, replacement: fileURLToPath(new URL("../src/contexts/DciAuthContext.tsx", import.meta.url)) },
    { find: /^(?:\.\.\/|\.\/)services\/sync$/, replacement: fileURLToPath(new URL("../src/sync/dciSync.ts", import.meta.url)) },
  ] },
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  ssr: { noExternal: [/^@capacitor\/preferences(?:\/|$)/, "@revenuecat/purchases-capacitor"] },
});
const load = path => server.ssrLoadModule(path);
try {
  const session = await load("/src/sync/dciSession.ts");
  const sync = await load("/src/sync/dciSync.ts");
  const installation = await load("/src/sync/dciInstallation.ts");
  const installationId = await installation.getDciInstallationId();
  assert.ok(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(installationId), "Installation must be a runtime secure UUID");
  assert.ok(storage.get(installation.DCI_INSTALLATION_STORAGE_KEY) === installationId &&
    storage.get(`prefs:${installation.DCI_INSTALLATION_STORAGE_KEY}`) === installationId, "Installation identity must persist separately in both stores");
  const native = await load("\0dci-client-preferences");
  const { labCatalog } = await load("/src/data/catalog.ts");
  const lab = labCatalog.find(item => item.accessLevel === "premium");
  assert.ok(lab);
  assert.equal(sync.dciSyncUrl, "/api/dci");
  assert.equal(session.sessionFromSignIn({ ...fixtureSession(studentA), token: "malformed" }), null);
  assert.equal(session.sessionFromSignIn(fixtureSession(studentA, 1)), null);
  const authenticated = session.sessionFromSignIn(fixtureSession(studentA));
  assert.equal(authenticated.studentId, studentA);

  // A first student must never inherit existing consumer/device-only progress.
  storage.set("threatforge_progress", "consumer-fixture");
  storage.set("prefs:threatforge_progress", "consumer-fixture");
  await session.saveDciSession(authenticated);
  assert.equal(session.getDciSession().studentId, studentA);
  assert.equal(storage.has("threatforge_progress"), false);
  assert.equal(storage.has("prefs:threatforge_progress"), false);
  assert.equal(await session.restoreDciSession(), session.getDciSession());
  sync.setSyncUid(studentA);
  console.log("PASS DCI session: token shape/expiry, local+native persistence, consumer cache isolation");

  const now = Date.now();
  const local = {
    schemaVersion: 2, userId: studentA,
    labs: { [lab.id]: { labId: lab.id, completed: true, bestScore: 91, attempts: 3,
      completedAt: now, lastAttemptDate: new Date(now).toISOString().slice(0, 10), scenarioResults: [{ scenarioIndex: 0, grade: "perfect" }] } },
    xp: 400, xpHistory: [{ date: "2026-10-24", labId: lab.id, amount: 400 }],
    streakDays: 7, longestStreak: 9, lastLabDate: "2026-10-24", judgmentTags: ["device-only"],
    createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(),
  };
  storage.set("threatforge_progress", JSON.stringify(local));
  const remoteReply = {
    records: [{ labId: lab.id, labTitle: lab.title, status: "Completed", xpEarned: 100, attempts: 1,
      firstStartedAt: "2026-10-20T01:00:00.000Z", completedAt: "2026-10-20T02:00:00.000Z" }],
    totals: { labsCompleted: 1, totalXp: 100 },
  };
  fetchHandler = async () => response(remoteReply);
  const remote = await sync.pullCloudProgress(studentA);
  assert.ok(remote);
  const merged = await sync.applyCloudProgress(remote);
  assert.equal(merged.xp, 400);
  assert.equal(merged.labs[lab.id].attempts, 3);
  assert.equal(merged.labs[lab.id].bestScore, 91);
  assert.deepEqual(merged.labs[lab.id].scenarioResults, local.labs[lab.id].scenarioResults);
  assert.equal(merged.streakDays, 7);
  assert.deepEqual(merged.xpHistory, local.xpHistory);
  assert.deepEqual(JSON.parse(storage.get("prefs:threatforge_progress")), merged);
  await sync.pushCloudProgress(studentA, merged);
  const pushedEnvelope = JSON.parse(fetchCalls.at(-1).options.body);
  const pushed = pushedEnvelope.records.find(record => record.labId === lab.id);
  assert.ok(pushedEnvelope.clientId === installationId, "Every progress POST must include the stable installation identity");
  assert.equal(pushed.status, "Completed");
  assert.equal(pushed.xpEarned, 400);
  assert.equal(pushed.attempts, 3);
  assert.ok(fetchCalls.at(-1).options.headers.Authorization === `Bearer ${authenticated.token}`, "POST must use the original verified session");
  assert.ok(!JSON.stringify(merged).includes(installationId), "Installation identity must not enter the progress cache");
  console.log("PASS DCI sync: same-origin API, bearer request, monotonic merge, device-only scores/streaks/detail preserved");

  // Direct callers and debounced work share the same transport queue.
  let releasePost, postStarted;
  const firstPostStarted = new Promise(resolve => { postStarted = resolve; });
  const firstPostRelease = new Promise(resolve => { releasePost = resolve; });
  let activePosts = 0, highestPosts = 0, sentPosts = 0;
  fetchHandler = async (_url, options) => {
    if (options.method !== "POST") return response(remoteReply);
    activePosts += 1; highestPosts = Math.max(highestPosts, activePosts); sentPosts += 1;
    if (sentPosts === 1) { postStarted(); await firstPostRelease; }
    activePosts -= 1;
    return response(remoteReply);
  };
  const firstPost = sync.pushCloudProgress(studentA, merged);
  await firstPostStarted;
  const secondPost = sync.pushCloudProgress(studentA, merged);
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
  assert.equal(sentPosts, 1, "Concurrent caller must wait for the in-flight source write");
  releasePost();
  await Promise.all([firstPost, secondPost]);
  assert.equal(sentPosts, 2);
  assert.equal(highestPosts, 1, "Progress POSTs must remain single-flight");
  assert.ok(fetchCalls.filter(call => call.options.method === "POST").every(call => JSON.parse(call.options.body).clientId === installationId), "All queued POSTs must retain one installation identity");
  console.log("PASS DCI source ordering: concurrent progress POSTs serialize and preserve one installation identity");

  const otherLab = labCatalog.find(item => item.id !== lab.id);
  const unionReply = { records: [...remoteReply.records, {
    labId: otherLab.id, labTitle: otherLab.title, status: "Completed", xpEarned: 130, attempts: 1,
    firstStartedAt: "2026-10-21T01:00:00.000Z", completedAt: "2026-10-21T02:00:00.000Z",
  }], totals: { labsCompleted: 2, totalXp: 230 } };
  fetchHandler = async () => response(unionReply);
  const union = await sync.applyCloudProgress(await sync.pullCloudProgress(studentA));
  assert.equal(union.xp, 530, "Disjoint local and remote labs must retain both XP amounts");
  assert.equal(union.labs[otherLab.id].completed, true);
  console.log("PASS DCI union: disjoint device and server labs retain both per-lab XP totals");

  const saved = storage.get("threatforge_progress");
  fetchHandler = async () => { throw new Error("Fixture offline"); };
  assert.equal(await sync.pullCloudProgress(studentA), null);
  await sync.pushCloudProgress(studentA, merged);
  assert.equal(storage.get("threatforge_progress"), saved);
  console.log("PASS DCI offline: failed GET/POST remain silent and retain local progress");

  // A fresh device restores synced fields without fabricating XP history/scores.
  storage.delete("threatforge_progress");
  storage.delete("prefs:threatforge_progress");
  storage.delete(session.SYNC_STORAGE_KEY);
  storage.delete(`prefs:${session.SYNC_STORAGE_KEY}`);
  sync.resetDciSync();
  sync.setSyncUid(studentA);
  fetchHandler = async () => response(remoteReply);
  const fresh = await sync.applyCloudProgress(await sync.pullCloudProgress(studentA));
  assert.equal(fresh.xp, 100);
  assert.equal(fresh.labs[lab.id].attempts, 1);
  assert.equal(fresh.labs[lab.id].completed, true);
  assert.deepEqual(fresh.xpHistory, []);
  assert.deepEqual(fresh.labs[lab.id].scenarioResults, []);
  const freshRetake = structuredClone(fresh);
  freshRetake.labs[lab.id].attempts = 2;
  freshRetake.xp += 130;
  freshRetake.xpHistory.push({ date: "2026-10-24", labId: lab.id, amount: 130 });
  await sync.pushCloudProgress(studentA, freshRetake);
  assert.equal(JSON.parse(fetchCalls.at(-1).options.body).records[0].xpEarned, 230);
  console.log("PASS DCI fresh-device restore: synced fields and XP baseline survive a retake without fabricated history");

  const wrapped = await load("/src/sync/dciPreferences.ts");
  const nativeMetadata = (await wrapped.Preferences.get({ key: session.SYNC_STORAGE_KEY })).value;
  storage.delete("threatforge_progress");
  storage.delete(session.SYNC_STORAGE_KEY);
  assert.ok(await session.restoreDciSession());
  assert.equal(storage.get(session.SYNC_STORAGE_KEY), nativeMetadata);
  assert.ok(storage.has("threatforge_progress"));
  sync.resetDciSync();
  sync.setSyncUid(studentA);
  await sync.pushCloudProgress(studentA, freshRetake);
  assert.equal(JSON.parse(fetchCalls.at(-1).options.body).records[0].xpEarned, 230);
  console.log("PASS DCI native recovery: local-storage eviction restores progress and per-lab XP offsets from Preferences");

  // Responses from a prior student's request cannot hydrate a new account.
  let releaseResponse;
  fetchHandler = async () => new Promise(resolve => { releaseResponse = () => resolve(response(remoteReply)); });
  const oldRequest = sync.pullCloudProgress(studentA);
  await session.clearDciSession();
  await session.saveDciSession(fixtureSession(studentB));
  releaseResponse();
  assert.equal(await oldRequest, null);
  assert.equal(storage.has("threatforge_progress"), false);
  assert.equal(storage.has("prefs:threatforge_progress"), false);
  sync.resetDciSync();
  console.log("PASS DCI account isolation: sign-out clears token/progress and stale responses cannot restore prior student data");

  // A queued write belongs to its original student/epoch, never the next one.
  await session.saveDciSession(fixtureSession(studentA));
  sync.setSyncUid(studentA);
  let releaseQueuedPost, queuedPostStarted;
  const queuedStarted = new Promise(resolve => { queuedPostStarted = resolve; });
  const queuedRelease = new Promise(resolve => { releaseQueuedPost = resolve; });
  let queuedSent = 0;
  fetchHandler = async (_url, options) => {
    if (options.method === "POST") { queuedSent += 1; queuedPostStarted(); await queuedRelease; }
    return response(remoteReply);
  };
  const staleFirst = sync.pushCloudProgress(studentA, merged);
  await queuedStarted;
  const staleSecond = sync.pushCloudProgress(studentA, merged);
  await session.clearDciSession();
  await session.saveDciSession(fixtureSession(studentB));
  releaseQueuedPost();
  await Promise.all([staleFirst, staleSecond]);
  assert.equal(queuedSent, 1, "A prior student's queued source write must be discarded");
  assert.ok(await installation.getDciInstallationId() === installationId, "Installation identity must survive sign-out and account switching");
  console.log("PASS DCI installation: independent persistent identity survives sign-out; stale queued student writes are discarded");

  // Late native writes must be drained before sign-out's cache removals.
  let releaseWrite;
  const writeStarted = native.delayNextWrite("threatforge_progress", new Promise(resolve => { releaseWrite = resolve; }));
  const lateRemote = { ...structuredClone(fresh), userId: studentB };
  const hydrating = sync.applyCloudProgress(lateRemote);
  await writeStarted;
  const clearing = session.clearDciSession();
  releaseWrite();
  await Promise.all([hydrating, clearing]);
  assert.equal(storage.has("threatforge_progress"), false);
  assert.equal(storage.has("prefs:threatforge_progress"), false);
  assert.equal(session.getDciSession(), null);

  await session.saveDciSession(fixtureSession(studentA));
  sync.setSyncUid(studentA);
  const unsynced = JSON.stringify(local);
  storage.set("threatforge_progress", unsynced);
  await wrapped.Preferences.set({ key: "threatforge_progress", value: unsynced });
  fetchHandler = async () => ({ ok: false, status: 401, json: async () => ({ error: "Unauthorized" }) });
  assert.equal(await sync.pullCloudProgress(studentA), null);
  assert.equal(session.getDciSession(), null);
  assert.equal(storage.has(session.SESSION_STORAGE_KEY), false);
  assert.equal(storage.get("threatforge_progress"), unsynced);
  assert.equal(storage.get("prefs:threatforge_progress"), unsynced);
  assert.equal(storage.get(session.OWNER_STORAGE_KEY), studentA);
  // Reauthentication by the same student must preserve unsynced native data,
  // including after WebView local storage was evicted while signed out.
  storage.delete("threatforge_progress");
  await session.saveDciSession(fixtureSession(studentA));
  assert.equal(storage.get("threatforge_progress"), unsynced);
  assert.equal(storage.get("prefs:threatforge_progress"), unsynced);
  storage.delete("dci_signed_out_v1");
  storage.set(session.SESSION_STORAGE_KEY, JSON.stringify(fixtureSession(studentA, 1)));
  assert.equal(await session.restoreDciSession(), null);
  assert.equal(storage.has(session.SESSION_STORAGE_KEY), false);
  assert.equal(storage.get("threatforge_progress"), unsynced);
  assert.equal(storage.get("prefs:threatforge_progress"), unsynced);
  await session.saveDciSession(fixtureSession(studentB));
  assert.equal(storage.has("threatforge_progress"), false);
  assert.equal(storage.has("prefs:threatforge_progress"), false);
  await session.clearDciSession();
  await session.saveDciSession(fixtureSession(studentA));
  storage.delete(session.SESSION_STORAGE_KEY);
  let releaseRead;
  const readStarted = native.delayNextRead(session.SESSION_STORAGE_KEY, new Promise(resolve => { releaseRead = resolve; }));
  const delayedRestore = session.restoreDciSession();
  await readStarted;
  const signoutDuringRead = session.clearDciSession();
  releaseRead();
  assert.equal(await delayedRestore, null);
  await signoutDuringRead;
  assert.equal(session.getDciSession(), null);
  assert.equal(storage.has(session.SESSION_STORAGE_KEY), false);
  console.log("PASS DCI invalidation/logout: 401/expiry gate without losing unsynced work, same-student native recovery, different-student isolation, explicit sign-out clears late writes/reads");

  const { default: SignIn, SIGN_IN_FAILURE } = await load("/src/components/DciSignIn.tsx");
  assert.equal(SIGN_IN_FAILURE, "That email and access code don't match our records. Check both and try again — or ask your instructor for help.");
  const form = renderToStaticMarkup(createElement(SignIn, { onSignIn: async () => false, isSigningIn: false, showFailure: true }));
  for (const text of ["Cybersecurity Judgment Labs", "DCI Resources — Student Edition", "Use the email and access code from your instructor.", 'placeholder="Student email"', 'placeholder="Access code"', "Sign in"]) assert.ok(form.includes(text));
  assert.match(form, /aria-live="(?:polite|assertive)"/);
  assert.ok(form.includes("That email and access code don&#x27;t match our records."));
  console.log("PASS DCI form: exact approved branding/helper/labels/placeholders/button/failure and aria-live");

  const auth = await load("/src/contexts/DciAuthContext.tsx");
  const lifecycle = await load("\0dci-auth-fixture-hooks");
  const renderProvider = children => {
    lifecycle.begin();
    return renderToStaticMarkup(createElement(auth.AuthProvider, null, children));
  };
  const awaitReady = async () => {
    for (let turn = 0; turn < 1000 && !lifecycle.ready(); turn += 1) await Promise.resolve();
    assert.ok(lifecycle.ready(), "Provider must finish local session restoration");
  };
  const catalog = createElement("p", { "data-fixture": "catalog" }, "Fixture catalog");
  lifecycle.reset();
  assert.doesNotMatch(renderProvider(catalog), /Fixture catalog/);
  lifecycle.flush();
  await awaitReady();
  const unsignedGate = renderProvider(catalog);
  assert.match(unsignedGate, /Use the email and access code from your instructor/);
  assert.doesNotMatch(unsignedGate, /Fixture catalog/);
  lifecycle.reset();
  await session.saveDciSession(fixtureSession(studentA));
  fetchHandler = async () => response(remoteReply);
  let signedContext;
  function CatalogProbe() { signedContext = auth.useAuth(); return catalog; }
  renderProvider(createElement(CatalogProbe));
  lifecycle.flush();
  await awaitReady();
  assert.match(renderProvider(createElement(CatalogProbe)), /Fixture catalog/);
  lifecycle.flush();
  const { default: Settings } = await load("/src/screens/SettingsScreen.tsx");
  const signedSettings = renderProvider(createElement(MemoryRouter, { initialEntries: ["/settings"] }, createElement(Settings)));
  assert.match(signedSettings, /Fixture student/);
  assert.match(signedSettings, /Sign out/);
  assert.doesNotMatch(signedSettings, /Reset Progress|Restore Purchases|Upgrade to Pro|Rate This App/);
  await signedContext.signOut();
  assert.doesNotMatch(renderProvider(catalog), /Fixture catalog/);
  assert.match(renderProvider(catalog), /Use the email and access code from your instructor/);
  lifecycle.reset();
  assert.ok(await installation.getDciInstallationId() === installationId &&
    storage.get(installation.DCI_INSTALLATION_STORAGE_KEY) === installationId &&
    storage.get(`prefs:${installation.DCI_INSTALLATION_STORAGE_KEY}`) === installationId, "Session/expiry/cache clearing must never clear the installation identity");
  console.log("PASS DCI provider/Settings: absent session gates catalog, valid restored session mounts it, signed name/action render, sign-out regates");
} finally {
  // Cancel any fixture debounce timers, close Vite workers, and restore globals.
  try { (await load("/src/sync/dciSync.ts")).resetDciSync(); } catch { /* Runner may fail before import. */ }
  await server.close();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
