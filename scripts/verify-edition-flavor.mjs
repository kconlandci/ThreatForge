// Run with: node scripts/verify-edition-flavor.mjs
// Uses installed Vite/React only; no browser, network, or build output required.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const root = fileURLToPath(new URL("../", import.meta.url));
const envKeys = ["VITE_EDITION", "VITE_DCI_SYNC_URL"];
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalFetch = globalThis.fetch;
const storage = new Map();
let networkCalls = 0;
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
});
globalThis.fetch = () => {
  networkCalls += 1;
  throw new Error("Network is forbidden in edition verification");
};

function verificationPlugin(dci) {
  return {
    name: "verify-edition-without-native-services",
    enforce: "pre",
    resolveId(source) {
      if (dci && (source.startsWith("firebase/") || /config\/firebase(?:\.ts)?$/.test(source))) {
        throw new Error(`DCI imported Firebase: ${source}`);
      }
      if (["@capacitor/preferences", "@revenuecat/purchases-capacitor"].includes(source)) {
        return "\0edition-verification-native";
      }
      if (source === "edition-verification-progress-hooks") {
        return "\0edition-verification-progress-hooks";
      }
    },
    // Replace only this module's React hooks with a tiny synchronous runner;
    // screen rendering and the entitlement/purchase hooks still use real React.
    transform(code, id) {
      if (dci && /\/src\/hooks\/useProgress\.ts$/.test(id)) {
        return code.replace('from "react"', 'from "edition-verification-progress-hooks"');
      }
    },
    load(id) {
      if (id === "\0edition-verification-native") return `
        export const calls = [];
        export const Preferences = {
          async get({ key }) { calls.push('preferences.get'); return { value: localStorage.getItem('prefs:' + key) }; },
          async set({ key, value }) { calls.push('preferences.set'); localStorage.setItem('prefs:' + key, value); }
        };
        export const Purchases = new Proxy({}, { get(_, method) {
          return async () => { calls.push('purchases.' + String(method)); throw new Error('Unexpected billing call'); };
        }});
      `;
      if (id === "\0edition-verification-progress-hooks") return `
        let state;
        export const getState = () => state;
        export function useState(initial) {
          state = typeof initial === 'function' ? initial() : initial;
          return [state, update => { state = typeof update === 'function' ? update(state) : update; }];
        }
        export const useCallback = callback => callback;
        export const useEffect = () => {};
        export const useRef = current => ({ current });
      `;
    },
  };
}

async function verify(flavor) {
  if (flavor === undefined) delete process.env.VITE_EDITION;
  else process.env.VITE_EDITION = flavor;
  process.env.VITE_DCI_SYNC_URL = "https://example.invalid/dci-sync-test";
  const dci = flavor === "dci";
  const server = await createServer({
    root,
    plugins: [verificationPlugin(dci)],
    server: { middlewareMode: true, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    ssr: { noExternal: ["@capacitor/preferences", "@revenuecat/purchases-capacitor", /^firebase(?:\/|$)/] },
  });
  const load = (path) => server.ssrLoadModule(path);
  try {
    const config = await load("/src/config/edition.ts");
    const { labCatalog } = await load("/src/data/catalog.ts");
    if (flavor === undefined) {
      const { LabManifestSchema } = await load("/src/types/manifest.ts");
      for (const lab of labCatalog) LabManifestSchema.parse(lab);
      console.log(`PASS lab-content validation: ${labCatalog.length} manifests`);
    }
    for (const [key, value] of Object.entries({
      edition: dci ? "dci" : "consumer",
      displayName: dci ? "Cybersecurity Judgment Labs" : "ThreatForge",
      subline: dci ? "DCI Resources — Student Edition" : "Cybersecurity Decision Simulator",
      settingsSubline: dci ? "DCI Resources — Student Edition" : "Cyber Judgment Training",
      supportEmail: dci ? "conlan.dci@gmail.com" : "threatforge.app@gmail.com",
      paywallEnabled: !dci,
      billingEnabled: !dci,
      syncTarget: dci ? "dci" : "firestore",
    })) assert.equal(config[key], value, `${flavor ?? "unset"}: ${key}`);

    const premium = await load("/src/hooks/usePremiumStatus.ts");
    let status;
    function PremiumProbe() { status = premium.usePremiumStatus(); return null; }
    renderToStaticMarkup(createElement(PremiumProbe));
    assert.equal(status.isPremium, dci);
    assert.equal(status.isLoading, !dci);

    if (dci) {
      const native = await load("\0edition-verification-native");
      const { usePurchase } = await load("/src/hooks/usePurchase.ts");
      let purchase;
      function PurchaseProbe() { purchase = usePurchase(); return null; }
      renderToStaticMarkup(createElement(PurchaseProbe));
      await status.refreshPremiumStatus();
      await premium.setPremiumStatus(true);
      assert.deepEqual(await purchase.purchase("verification-only"), { success: false, error: "unknown" });
      assert.deepEqual(await purchase.restore(), { success: false, error: "unknown" });
      assert.deepEqual(native.calls, [], "DCI billing/entitlement must not touch SDK or preferences");

      const auth = await load("/src/contexts/DciAuthContext.tsx");
      let authState;
      function AuthProbe() { authState = auth.useAuth(); return null; }
      renderToStaticMarkup(createElement(auth.AuthProvider, null, createElement(AuthProbe)));
      assert.deepEqual(authState, { uid: null, isAuthReady: true });

      const sync = await load("/src/sync/dciSync.ts");
      assert.equal(sync.dciSyncUrl, process.env.VITE_DCI_SYNC_URL);
      assert.equal(sync.CLOUD_PULL_EVENT, "threatforge:cloud-pull");
      const local = { labs: {}, xp: 17 };
      assert.equal(sync.setSyncUid("verification-only"), undefined);
      assert.equal(await sync.pullCloudProgress("verification-only"), null);
      assert.equal(await sync.pushCloudProgress("verification-only", local), undefined);
      assert.equal(sync.queueCloudPush(local), undefined);
      assert.equal(sync.mirrorEventToCloud({ type: "verification" }), undefined);
      assert.equal(sync.mergeProgress(local, { labs: {}, xp: 999 }), local);
      assert.deepEqual(local, { labs: {}, xp: 17 });

      const renderRoute = (Screen, path, pattern = path) => renderToStaticMarkup(
        createElement(MemoryRouter, { initialEntries: [path] },
          createElement(Routes, null, createElement(Route, { path: pattern, element: createElement(Screen) })))
      );
      const { default: Settings } = await load("/src/screens/SettingsScreen.tsx");
      const settingsHtml = renderRoute(Settings, "/settings");
      assert.match(settingsHtml, /Cybersecurity Judgment Labs/);
      assert.match(settingsHtml, /DCI Resources — Student Edition/);
      assert.doesNotMatch(settingsHtml, /Upgrade to Pro|Restore Purchases|Rate This App|href="\/upgrade"/);
      const { default: Lab } = await load("/src/screens/LabScreen.tsx");
      const premiumLabs = labCatalog.filter((lab) => lab.accessLevel === "premium");
      assert.ok(premiumLabs.length > 0);
      for (const lab of premiumLabs) {
        const html = renderRoute(Lab, `/lab/${lab.id}`, "/lab/:labId");
        assert.match(html, /aria-label="Start lab"/, lab.id);
        assert.doesNotMatch(html, /Upgrade to Pro|Premium Lab|Loading\.\.\./, lab.id);
      }

      storage.clear();
      const progressModule = await load("/src/hooks/useProgress.ts");
      const hooks = await load("\0edition-verification-progress-hooks");
      const progress = progressModule.useProgress(null);
      const createdAt = progress.progress.createdAt;
      progress.recordLabCompletion(premiumLabs[0].id, 80, [{ scenarioIndex: 0, grade: "perfect" }]);
      const saved = JSON.parse(storage.get("threatforge_progress"));
      assert.deepEqual(saved, hooks.getState());
      assert.deepEqual(saved, JSON.parse(storage.get("prefs:threatforge_progress")));
      assert.equal(saved.createdAt, createdAt);
      assert.equal(saved.userId, null);
      assert.equal(saved.xp, 140);
      assert.equal(saved.streakDays, 1);
      assert.equal(saved.labs[premiumLabs[0].id].bestScore, 80);
      assert.equal(saved.labs[premiumLabs[0].id].attempts, 1);
      assert.equal(saved.labs[premiumLabs[0].id].completed, true);
      progress.recordLabCompletion(premiumLabs[0].id, 60, []);
      const repeated = JSON.parse(storage.get("threatforge_progress"));
      assert.equal(repeated.labs[premiumLabs[0].id].bestScore, 80);
      assert.equal(repeated.labs[premiumLabs[0].id].attempts, 2);
      assert.equal(repeated.xp, 270);
      assert.equal(repeated.streakDays, 1);
      assert.ok(native.calls.every((call) => call === "preferences.set"));
      console.log(`PASS dci: config, no billing/cache calls, local auth, sync no-ops, Settings, ${premiumLabs.length} premium lab intros, local completion persistence`);
    } else {
      console.log(`PASS ${flavor ?? "unset"}: exact consumer config and initial locked/loading entitlement`);
    }
    assert.equal(networkCalls, 0, "Verification must make no network calls");
  } finally {
    await server.close();
  }
}

try {
  await verify(undefined);
  await verify("consumer");
  await verify("dci");
} finally {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
  globalThis.fetch = originalFetch;
}
