// Called by the local integration runner with its existing in-memory sign-in.
// Never reads env/roster files or writes tokens to disk/logs.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

export async function verifyDciClientAgainstLocalService({ baseUrl, signInReply }) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const origin = new URL(baseUrl).origin;
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname), "Client probe requires a local harness");
  const storage = new Map();
  const originals = Object.fromEntries(["localStorage", "window", "fetch"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const realFetch = globalThis.fetch;
  let requests = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  } });
  globalThis.fetch = async (url, options) => {
    const destination = new URL(url);
    // Client and portable handlers share this process. Permit only the local
    // client transport and that handler's requests to the one approved base.
    const local = destination.origin === origin;
    const targetBase = destination.origin === "https://api.airtable.com" && destination.pathname.startsWith("/v0/appspi3IDg1WzOECA/");
    assert.ok(local || targetBase, "Probe requests must stay on the harness and approved Airtable base");
    if (local) requests += 1;
    return realFetch(url, options);
  };
  let server;
  try {
    server = await createServer({
      root, configFile: false, envFile: false,
      define: { "import.meta.env.VITE_EDITION": '"dci"', "import.meta.env.VITE_DCI_SYNC_URL": JSON.stringify(baseUrl) },
      resolve: { alias: [{ find: /^@capacitor\/preferences$/, replacement: fileURLToPath(new URL("../src/sync/dciPreferences.ts", import.meta.url)) }] },
      plugins: [{
        name: "local-client-native-memory", enforce: "pre",
        resolveId(source) {
          if (source.startsWith("firebase/") || /config\/firebase(?:\.ts)?$/.test(source)) throw new Error("DCI imported Firebase");
          if (source === "@capacitor/preferences/dist/esm/index.js") return "\0local-client-preferences";
        },
        load(id) {
          if (id === "\0local-client-preferences") return `export const Preferences = {
            async get({key}) {return {value:localStorage.getItem('prefs:'+key)};},
            async set({key,value}) {localStorage.setItem('prefs:'+key,value);},
            async remove({key}) {localStorage.removeItem('prefs:'+key);}
          };`;
        },
      }],
      server: { middlewareMode: true, watch: null, hmr: false, ws: false },
      optimizeDeps: { noDiscovery: true, include: [] },
      ssr: { noExternal: [/^@capacitor\/preferences(?:\/|$)/] },
    });
    const session = await server.ssrLoadModule("/src/sync/dciSession.ts");
    const sync = await server.ssrLoadModule("/src/sync/dciSync.ts");
    const parsed = session.sessionFromSignIn(signInReply);
    assert.ok(parsed, "Real sign-in reply must be accepted by DCI session storage");
    await session.saveDciSession(parsed);
    sync.setSyncUid(parsed.studentId);
    const remote = await sync.pullCloudProgress(parsed.studentId);
    assert.ok(remote, "Actual DCI GET transport must restore real-base progress");
    const restored = await sync.applyCloudProgress(remote);
    assert.ok(restored, "Actual DCI hydration must save on-device progress");
    assert.equal(Object.keys(restored.labs).length, 3);
    assert.equal(restored.xp, 270);
    assert.equal(Object.values(restored.labs).filter(lab => lab.completed).length, 2);
    assert.deepEqual(JSON.parse(storage.get("prefs:threatforge_progress")), restored);
    await sync.pushCloudProgress(parsed.studentId, restored);
    const reread = await sync.pullCloudProgress(parsed.studentId);
    assert.ok(reread);
    assert.equal(Object.keys(reread.labs).length, 3);
    assert.equal(reread.xp, 270);
    assert.equal(requests, 3, "Expected real GET, POST, then GET transport");
    sync.resetDciSync();
    await session.clearDciSession();
    assert.ok(session.getDciSession() === null, "Session must clear on sign-out");
    for (const key of [session.SESSION_STORAGE_KEY, "threatforge_progress", `prefs:${session.SESSION_STORAGE_KEY}`, "prefs:threatforge_progress"]) {
      assert.ok(!storage.has(key), "Sign-out must remove token and device progress");
    }
    return { labCount: 3, totalXp: 270, labsCompleted: 2, transportRequests: requests, cacheCleared: true };
  } finally {
    await server?.close();
    storage.clear();
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}
