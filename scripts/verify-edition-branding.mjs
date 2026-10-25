// Fixture-only branding checks: no env files, credentials, SDKs, or services.
// Capture once before app edits: node scripts/verify-edition-branding.mjs --capture-consumer
// A fresh checkout uses Git history automatically; --git-baseline forces that path.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

const root = fileURLToPath(new URL("../", import.meta.url));
const baselinePath = new URL("../dci-branding-consumer-ui.local", import.meta.url);
const baselineName = "dci-branding-consumer-ui.local";
const capture = process.argv.includes("--capture-consumer");
const forceGitBaseline = process.argv.includes("--git-baseline");
const baselineCommit = "bfbb7c7";
const baselineSources = [
  "src/config/edition.ts", "src/main.tsx", "src/components/DciSignIn.tsx",
  "src/screens/HomeScreen.tsx", "src/screens/SettingsScreen.tsx",
  "src/components/Onboarding.tsx", "src/screens/DevScreen.tsx",
];
const normalizedRoot = root.replace(/\\/g, "/");
const consumerTitle = "ThreatForge: Cybersecurity Decision Simulator";
const dciTitle = "Cybersecurity Judgment Labs | DCI Resources";
const originalGlobals = Object.fromEntries(["localStorage", "fetch", "document"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const storage = new Map([["threatforge_onboarding_complete", "true"]]);
let networkCalls = 0;
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
} });
globalThis.fetch = () => { networkCalls += 1; throw new Error("Network forbidden in branding verification"); };

async function renderFlavor(flavor, historicalSources = new Map()) {
  const server = await createServer({
    root, configFile: false, envFile: false,
    plugins: [react(), {
      name: "branding-verification-fixtures", enforce: "pre",
      resolveId(source, importer) {
        if (source === "branding-root-fixture") return "\0branding-root";
        if (source === "./App" && /\/src\/main\.tsx$/.test(importer ?? "")) return "\0branding-app";
        if (source === "./index.css") return "\0branding-style";
        if (/(?:^|\/)contexts\/(?:Dci)?AuthContext(?:\.tsx)?$/.test(source)) return "\0branding-auth";
        if (/(?:^|\/)hooks\/useProgress(?:\.ts)?$/.test(source)) return "\0branding-progress";
        if (source.startsWith("@capacitor/") || source.startsWith("@capacitor-community/") || source === "@revenuecat/purchases-capacitor") return "\0branding-native";
        if (source.startsWith("firebase/") || /config\/firebase(?:\.ts)?$/.test(source)) throw new Error("Branding verification must not import Firebase");
      },
      transform(code, id) {
        const normalizedId = id.replace(/\\/g, "/").split("?")[0];
        const relativePath = normalizedId.startsWith(normalizedRoot) ? normalizedId.slice(normalizedRoot.length) : null;
        const historical = historicalSources.get(relativePath);
        if (historical !== undefined) code = historical;
        if (/\/src\/main\.tsx$/.test(normalizedId)) return code.replace('from "react-dom/client"', 'from "branding-root-fixture"');
        if (historical !== undefined) return code;
      },
      load(id) {
        if (id === "\0branding-root") return `export const calls=[];export const createRoot=element=>({render(tree){calls.push({element,rendered:Boolean(tree)});}});`;
        if (id === "\0branding-app") return "export default function App(){return null;}";
        if (id === "\0branding-style") return "export {};";
        if (id === "\0branding-auth") return `export const useAuth=()=>({uid:null,isAuthReady:true,student:null,signOut:async()=>{}});export const AuthProvider=({children})=>children;`;
        if (id === "\0branding-progress") return `
          const progress={xp:0,streakDays:0,labs:{},createdAt:0,lastActiveAt:0};
          export const useProgress=()=>({progress,getLabProgress:()=>undefined,isLabCompleted:()=>false,getTotalCompleted:()=>0,resetProgress(){}});
        `;
        if (id === "\0branding-native") return `
          export const Capacitor={isNativePlatform:()=>false};
          export const Preferences={get:async()=>({value:null}),set:async()=>{},remove:async()=>{}};
          export const Purchases=new Proxy({}, {get(){return async()=>{throw new Error('Unexpected billing call')}}});
          export const Browser={open:async()=>{}};
          export const Dialog={confirm:async()=>({value:false})};
          export const InAppReview={requestReview:async()=>{}};
        `;
      },
    }],
    define: { "import.meta.env.VITE_EDITION": flavor === undefined ? "undefined" : JSON.stringify(flavor) },
    ssr: { noExternal: [/^@capacitor\//, /^@capacitor-community\//, "@revenuecat/purchases-capacitor", "react-dom/client"] },
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const load = path => server.ssrLoadModule(path);
    const renderScreen = (Component, path) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, createElement(Component)));
    const { default: Home } = await load("/src/screens/HomeScreen.tsx");
    const { default: Settings } = await load("/src/screens/SettingsScreen.tsx");
    const { default: Onboarding } = await load("/src/components/Onboarding.tsx");
    const { default: SignIn } = await load("/src/components/DciSignIn.tsx");
    const { default: Dev } = await load("/src/screens/DevScreen.tsx");
    const surfaces = {
      home: renderScreen(Home, "/"),
      settings: renderScreen(Settings, "/settings"),
      onboarding: renderToStaticMarkup(createElement(Onboarding, { onComplete() {} })),
      signIn: renderToStaticMarkup(createElement(SignIn, { onSignIn: async () => false, isSigningIn: false, showFailure: false })),
      dev: renderScreen(Dev, "/dev"),
    };
    const documentFixture = { title: consumerTitle, documentElement: { dataset: {} }, getElementById: id => ({ id }) };
    Object.defineProperty(globalThis, "document", { configurable: true, value: documentFixture });
    await load("/src/main.tsx");
    const rootFixture = await load("\0branding-root");
    assert.equal(rootFixture.calls.length, 1, "The real bootstrap must render exactly one root");
    assert.equal(rootFixture.calls[0].rendered, true);
    return { surfaces, title: documentFixture.title, dataset: documentFixture.documentElement.dataset, config: await load("/src/config/edition.ts") };
  } finally { await server.close(); }
}

function verifyConsumer(result, baseline, flavor) {
  assert.equal(result.title, consumerTitle, `${flavor}: original consumer title`);
  assert.deepEqual(result.dataset, {}, `${flavor}: no DCI document attributes`);
  assert.deepEqual(result.surfaces, baseline.surfaces, `${flavor}: consumer markup must remain byte-identical`);
  for (const html of Object.values(result.surfaces)) assert.doesNotMatch(html, /dci-logo|alt="DCI Resources LLC"/);
}

try {
  assert.ok(!(capture && forceGitBaseline), "Choose capture or Git-baseline verification, not both");
  const htmlTitle = readFileSync(new URL("../index.html", import.meta.url), "utf8").match(/<title>([^<]+)<\/title>/)?.[1];
  assert.equal(htmlTitle, consumerTitle, "Consumer HTML title must remain unchanged");
  const unset = await renderFlavor(undefined);
  const consumer = await renderFlavor("consumer");
  if (capture) {
    assert.deepEqual(unset.surfaces, consumer.surfaces, "Default and explicit consumer markup agree before edits");
    assert.equal(unset.title, consumerTitle);
    assert.equal(consumer.title, consumerTitle);
    execFileSync("git", ["check-ignore", "--quiet", "--", baselineName], { cwd: root, stdio: "ignore" });
    assert.equal(execFileSync("git", ["ls-files", "--", baselineName], { cwd: root, encoding: "utf8" }).trim(), "");
    writeFileSync(baselinePath, JSON.stringify({ commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), title: unset.title, surfaces: unset.surfaces }, null, 2) + "\n", { flag: "wx" });
    console.log("PASS captured ignored consumer UI baseline: Home, Settings, Onboarding, sign-in, dev header and real bootstrap title");
  } else {
    const localBaseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : null;
    let baseline = localBaseline;
    if (forceGitBaseline || !baseline) {
      const historicalSources = new Map(baselineSources.map(path => [path,
        execFileSync("git", ["show", `${baselineCommit}:${path}`], { cwd: root, encoding: "utf8" }),
      ]));
      baseline = await renderFlavor(undefined, historicalSources);
      assert.equal(baseline.title, consumerTitle, "Historical consumer bootstrap title");
      assert.deepEqual(baseline.dataset, {}, "Historical consumer document has no DCI attributes");
      if (localBaseline) assert.deepEqual(baseline.surfaces, localBaseline.surfaces, "Git historical rendering matches the captured pre-edit snapshot");
      console.log(`PASS Git baseline: seven pre-edit branding modules rendered from ${baselineCommit} without modifying app sources`);
    }
    verifyConsumer(unset, baseline, "unset");
    verifyConsumer(consumer, baseline, "consumer");
    console.log("PASS consumer branding: default/explicit consumer markup is byte-identical to pre-change baseline; original title retained");
    const dci = await renderFlavor("dci");
    assert.equal(dci.config.browserTitle, dciTitle);
    assert.equal(dci.title, dciTitle, "Real DCI bootstrap assigns the approved browser title");
    assert.deepEqual(dci.dataset, { edition: "dci" });
    for (const [name, html] of Object.entries(dci.surfaces)) {
      assert.match(html, /Cybersecurity Judgment Labs/, `${name}: approved edition name`);
      const images = html.match(/<img\b[^>]*>/g) ?? [];
      assert.ok(images.some(image => /src="[^"]*dci-logo\.png"/.test(image) && /alt="DCI Resources LLC"/.test(image)), `${name}: actual official logo image`);
      assert.ok(!images.some(image => /src="\/icon-512\.png"/.test(image) && /alt="Cybersecurity Judgment Labs"/.test(image)), `${name}: consumer brand icon replaced`);
    }
    for (const name of ["home", "settings", "signIn"]) assert.match(dci.surfaces[name], /DCI Resources — Student Edition/);
    writeFileSync(new URL("../dci-branding-dci-ui.local", import.meta.url), JSON.stringify({ title: dci.title, surfaces: dci.surfaces }, null, 2) + "\n");
    console.log("PASS DCI branding: sign-in, Home, Settings, Onboarding and dev header render the official logo; edition text and real bootstrap title match");
  }
  assert.equal(networkCalls, 0);
  console.log("PASS branding verification: zero network calls and no env/credential files loaded");
} finally {
  for (const [key, descriptor] of Object.entries(originalGlobals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
