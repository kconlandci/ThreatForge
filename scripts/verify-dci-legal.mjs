// Fixture-only route/UI checks, or inspect an already-built flavor with
// --assets=consumer / --assets=dci. Never loads env files or contacts services.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PassThrough } from "node:stream";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

const root = fileURLToPath(new URL("../", import.meta.url));
const legalPath = new URL("../src/data/legal.ts", import.meta.url);
const legalSource = readFileSync(legalPath, "utf8");
const baseline = execFileSync("git", ["show", "17c8e5e:src/data/legal.ts"], { cwd: root, encoding: "utf8" });
assert.equal(legalSource.replace(/\r\n/g, "\n"), baseline.replace(/\r\n/g, "\n"), "Consumer legal source must remain byte-equivalent apart from checkout line endings");
const legal = await import(`data:text/javascript;base64,${Buffer.from(legalSource).toString("base64")}`);
const pages = [
  { path: "/settings/privacy", key: "privacyPolicy" },
  { path: "/settings/terms", key: "termsOfService" },
  { path: "/settings/disclaimer", key: "disclaimer" },
];
const markers = pages.map(page => legal[page.key].split("\n")[0]);
const escape = value => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

function allTextFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const target = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, path);
    return entry.isDirectory() ? allTextFiles(target) : /\.(?:js|css|html|json|map|txt)$/.test(entry.name) ? [target] : [];
  });
}

const assetsMode = process.argv.find(arg => arg.startsWith("--assets="))?.split("=")[1];
if (assetsMode) {
  assert.ok(["consumer", "dci"].includes(assetsMode));
  const files = allTextFiles(new URL("../dist/", import.meta.url));
  const text = files.map(file => readFileSync(file, "utf8")).join("\n");
  for (const marker of markers) {
    if (assetsMode === "dci") assert.ok(!text.includes(marker), "DCI output must omit every consumer legal document");
    else assert.ok(text.includes(marker), "Consumer output must retain every existing legal document");
  }
  if (assetsMode === "dci") {
    for (const marker of ["No progress data is transmitted to external servers.", "Questions about this privacy policy can be directed to:", "Questions about these terms can be directed to:"]) {
      assert.ok(!text.includes(marker), "DCI output must omit consumer policy prose");
    }
    assert.ok(!files.some(file => /\/(?:privacy|terms|disclaimer|legal|data-deletion)[^/]*\.(?:html|txt)$/i.test(file.pathname)), "DCI output must contain no static consumer legal pages");
  }
  console.log(`PASS ${assetsMode} build assets: consumer legal source unchanged; ${assetsMode === "dci" ? "consumer legal documents and static pages absent" : "all three original legal documents retained"}`);
} else {
  const originals = Object.fromEntries(["localStorage", "fetch"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const storage = new Map([["threatforge_onboarding_complete", "true"]]);
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  } });
  globalThis.fetch = () => { throw new Error("Network forbidden in legal verification"); };

  function render(element) {
    return new Promise((resolve, reject) => {
      let text = "";
      const output = new PassThrough();
      const timer = setTimeout(() => { stream.abort(); reject(new Error("Legal route rendering timed out")); }, 30000);
      output.on("data", data => { text += data.toString(); });
      output.on("end", () => { clearTimeout(timer); resolve(text); });
      output.on("error", error => { clearTimeout(timer); reject(error); });
      const stream = renderToPipeableStream(element, {
        onAllReady() { stream.pipe(output); },
        onShellError(error) { clearTimeout(timer); reject(error); },
        onError(error) { clearTimeout(timer); reject(error); },
      });
    });
  }

  async function verify(flavor) {
    const dci = flavor === "dci";
    const server = await createServer({
      root, configFile: false, envFile: false,
      plugins: [react(), {
        name: "legal-verification-fixtures", enforce: "pre",
        resolveId(source) {
          if (/(?:^|\/)contexts\/(?:Dci)?AuthContext(?:\.tsx)?$/.test(source) || /(?:^|\/)services\/sync(?:\.ts)?$/.test(source)) return "\0legal-auth-fixture";
          if (source.startsWith("@capacitor/") || source.startsWith("@capacitor-community/") || source === "@revenuecat/purchases-capacitor") return "\0legal-native-fixture";
          if (source.startsWith("firebase/") || /config\/firebase(?:\.ts)?$/.test(source)) throw new Error("Legal fixture must not import Firebase");
        },
        transform(code, id) {
          if (/\/src\/App\.tsx$/.test(id)) return `${code}\nexport { AppLayout as VerificationAppLayout };`;
        },
        load(id) {
          if (id === "\0legal-auth-fixture") return `
            export const useAuth = () => ({ uid: null, isAuthReady: true, student: null, signOut: async () => {} });
            export const AuthProvider = ({children}) => children;
            export const CLOUD_PULL_EVENT = 'threatforge:cloud-pull';
            export const queueCloudPush = () => {};
            export const mirrorEventToCloud = () => {};
            export const mergeProgress = local => local;
            export const setSyncUid = () => {};
            export const pullCloudProgress = async () => null;
          `;
          if (id === "\0legal-native-fixture") return `
            export const Capacitor = {isNativePlatform: () => false};
            export const App = {addListener: async () => ({remove(){}})};
            export const Preferences = {get: async () => ({value:null}),set:async()=>{},remove:async()=>{}};
            export const Purchases = new Proxy({}, {get(){return async()=>{throw new Error('Unexpected billing call')}}});
            export const Browser = {open:async()=>{}};
            export const Dialog = {confirm:async()=>({value:false})};
            export const InAppReview = {requestReview:async()=>{}};
          `;
        },
      }],
      define: { "import.meta.env.VITE_EDITION": flavor === undefined ? "undefined" : JSON.stringify(flavor) },
      resolve: { alias: dci ? [{ find: /^(?:\.\.\/|\.\/)data\/legal$/, replacement: fileURLToPath(new URL("../src/config/noLegalContent.ts", import.meta.url)) }] : [] },
      ssr: { noExternal: [/^@capacitor\//, /^@capacitor-community\//, "@revenuecat/purchases-capacitor"] },
      server: { middlewareMode: true, watch: null, hmr: false, ws: false },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    try {
      const { VerificationAppLayout } = await server.ssrLoadModule("/src/App.tsx");
      const screen = path => render(createElement(MemoryRouter, { initialEntries: [path] }, createElement(VerificationAppLayout)));
      const settings = await screen("/settings");
      if (dci) assert.doesNotMatch(settings, /Privacy Policy|Terms of Service|Disclaimer|href="\/settings\/(?:privacy|terms|disclaimer)"/);
      else for (const page of pages) assert.ok(settings.includes(`href="${page.path}"`), "Consumer legal link must remain present");
      for (const page of pages) {
        const html = await screen(page.path);
        if (dci) {
          for (const marker of markers) assert.ok(!html.includes(marker), "DCI old legal URLs must not render a legal document");
          assert.ok(html.includes("Cybersecurity Judgment Labs"), "DCI removed legal routes must fall back to the existing home route");
        } else assert.ok(html.includes(escape(legal[page.key])), "Consumer route must render the exact original legal text");
      }
      for (const path of ["/", "/settings/analytics"]) {
        const html = await screen(path);
        if (dci) assert.doesNotMatch(html, /href="[^\"]*(?:privacy|terms|disclaimer|legal|deletion)[^\"]*"/i);
      }
      const { default: Onboarding } = await server.ssrLoadModule("/src/components/Onboarding.tsx");
      const onboarding = await render(createElement(Onboarding, { onComplete() {} }));
      assert.doesNotMatch(onboarding, /href="[^\"]*(?:privacy|terms|disclaimer|legal|deletion)[^\"]*"/i);
      const { default: SignIn } = await server.ssrLoadModule("/src/components/DciSignIn.tsx");
      const signin = await render(createElement(SignIn, { onSignIn: async () => false, isSigningIn: false, showFailure: false }));
      assert.doesNotMatch(signin, /href="[^\"]*(?:privacy|terms|disclaimer|legal|deletion)[^\"]*"/i);
      console.log(`PASS ${flavor ?? "unset"} legal UI/routes: ${dci ? "no legal entries, legacy URLs fall back without legal text" : "all three original links and exact legal documents retained"}; onboarding/sign-in/footer have no legal links`);
    } finally { await server.close(); }
  }

  try { await verify(undefined); await verify("consumer"); await verify("dci"); }
  finally {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}
