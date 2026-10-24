// Scoped Vercel CLI operations. Values go through stdin, never command arguments.
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const projectName = "dci-cybersecurity-judgment-labs";
export const scope = "kevin-conlans-projects";
export const branch = "feat/dci-sync-service";
const stateFile = new URL("../dci-vercel-state.local", import.meta.url);
const secrets = [];
export function readState() { return JSON.parse(readFileSync(stateFile, "utf8")); }
function saveState(state) { writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n"); }
const check = (condition, label) => { if (!condition) throw new Error(label); };

export function safeText(text) {
  for (const value of secrets) if (value && text.includes(value)) throw new Error("Sensitive response suppressed");
  return text;
}

export async function cli(args, input) {
  check(args.every(arg => /^[A-Za-z0-9_./:?=&@+,\-]+$/.test(arg)), "Unsafe CLI argument rejected");
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "vercel";
    const parameters = process.platform === "win32" ? ["/d", "/s", "/c", `vercel.cmd ${args.join(" ")}`] : args;
    const child = spawn(command, parameters, { cwd: root, stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, NO_COLOR: "1" } });
    let stdout = "", stderr = "";
    child.stdout.on("data", data => { stdout += data.toString(); });
    child.stderr.on("data", data => { stderr += data.toString(); });
    child.once("error", () => reject(new Error("Vercel CLI could not start")));
    child.once("exit", code => resolve({ code, stdout, stderr }));
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

export async function api(endpoint, method = "GET", body) {
  const result = await cli(["api", endpoint, "--method", method, "--scope", scope, "--raw", "--no-color", ...(body ? ["--input", "-"] : [])], body ? JSON.stringify(body) : undefined);
  let data;
  try { data = JSON.parse(result.stdout); } catch { data = {}; }
  if (result.code !== 0) {
    // Only nonsecret API operations use this helper. Never dump raw responses.
    const error = new Error(`Vercel API ${method} failed: ${endpoint}`);
    error.status = data.error?.code ?? "cli_failure";
    error.safeDetail = typeof data.error?.message === "string" ? safeText(data.error.message) : undefined;
    throw error;
  }
  return data;
}

async function create() {
  check(!existsSync(stateFile), "Deployment state exists; inspect before creating another project");
  const currentBranch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
  check(currentBranch === branch, "Wrong deployment branch");
  // Hold automatic Git builds until only this new project's DCI configuration
  // is complete. This does not change any existing project or Git branch.
  const project = await api("/v10/projects", "POST", {
    name: projectName, framework: "vite", buildCommand: "npm run build", outputDirectory: "dist",
    commandForIgnoringBuildStep: "exit 0", publicSource: false,
  });
  check(project.id && project.name === projectName, "Project creation readback requires review");
  const state = { projectId: project.id, projectName, scope, teamId: project.accountId,
    branch, sectionACommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), envNamesSet: [] };
  saveState(state);
  console.log(JSON.stringify({ createdProject: state.projectName, projectId: state.projectId, scope, teamId: state.teamId }));
}

async function inspect() {
  const state = readState();
  const project = await api(`/v9/projects/${state.projectId}`);
  const domains = await api(`/v9/projects/${state.projectId}/domains`);
  console.log(JSON.stringify({ projectId: project.id, name: project.name, accountId: project.accountId,
    framework: project.framework, nodeVersion: project.nodeVersion, git: project.link ? {
      type: project.link.type, org: project.link.org, repo: project.link.repo,
      repoId: project.link.repoId, productionBranch: project.link.productionBranch,
    } : null,
    domains: domains.domains?.map(({name,gitBranch}) => ({name,gitBranch})) }));
}

async function configure() {
  const state = readState();
  check(state.productionOrigin && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(state.productionOrigin), "Verified default production origin required");
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
  check(process.env.AIRTABLE_PAT, "Local Airtable credential missing");
  const fresh = randomBytes(48).toString("base64url");
  check(fresh !== process.env.DCI_SESSION_SECRET, "Production secret must be fresh");
  secrets.push(process.env.AIRTABLE_PAT, process.env.DCI_SESSION_SECRET, fresh);
  const variables = [
    ["VITE_EDITION", "dci", false],
    ["VITE_DCI_SYNC_URL", `${state.productionOrigin}/api/dci`, false],
    ["AIRTABLE_PAT", process.env.AIRTABLE_PAT, true],
    ["DCI_SESSION_SECRET", fresh, true],
  ];
  for (const [name, value, secret] of variables) {
    check(!state.envNamesSet.includes(name), "Environment already set; inspect before replacing secrets");
    const result = await cli(["env", "add", name, "production", "--project", state.projectId,
      "--scope", scope, "--yes", ...(secret ? ["--sensitive"] : ["--no-sensitive"]), "--no-color"], value);
    // Even unexpected CLI echoes are kept in memory and never forwarded.
    check(result.code === 0, `Environment setup failed for ${name}; output suppressed`);
    state.envNamesSet.push(name); saveState(state);
    console.log(`Set production environment name: ${name}`);
  }
  console.log("Production credentials set through stdin; no values displayed or written locally.");
}

async function dry() {
  const state = readState();
  const result = await cli(["deploy", "--dry", "--json", "--yes", "--project", state.projectId,
    "--scope", scope, "--local-config", "vercel.dci.json", "--no-color"]);
  check(result.code === 0, "Deployment dry-run failed; output suppressed");
  const data = JSON.parse(result.stdout);
  // Only source paths/framework metadata may be printed. Never echo raw dry-run
  // records, which may include file bodies in a future CLI release.
  function paths(value, found = []) {
    if (!value || typeof value !== "object") return found;
    if (typeof value.file === "string") found.push(value.file);
    if (typeof value.path === "string") found.push(value.path);
    if (typeof value.relPath === "string") found.push(value.relPath);
    for (const child of Object.values(value)) if (child && typeof child === "object") paths(child, found);
    return found;
  }
  const selected = [...new Set(paths(data))];
  check(selected.length > 0, "Dry-run file inventory format requires inspection");
  check(!selected.some(path => /(?:^|[\\/])(?:\.env[^\\/]*|docs|scripts|android|apps|node_modules)(?:[\\/]|$)|\.(?:md|jks|keystore|pem)$|\.local(?:\.|$)/i.test(path)), "Forbidden deployment input found; names suppressed");
  state.uploadFiles = selected.length; saveState(state);
  console.log(JSON.stringify({ dryRun: "passed", fileCount: selected.length, files: selected }));
}

async function deploy() {
  const state = readState();
  check(state.uploadFiles > 0 && state.envNamesSet.length === 4, "Complete configuration and dry-run required");
  const currentBranch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
  check(currentBranch === branch, "Wrong deployment branch");
  const project = await api(`/v9/projects/${state.projectId}`);
  check(project.name === projectName && project.accountId === state.teamId &&
    project.link?.org === "kconlandci" && project.link?.repo === "ThreatForge" &&
    project.link?.productionBranch === branch, "Verified DCI project and production branch required");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const remoteHead = execFileSync("git", ["ls-remote", "--heads", "origin", `refs/heads/${branch}`], { cwd: root, encoding: "utf8" }).trim().split(/\s/)[0];
  check(head === remoteHead, "Local and published feature branch must match");
  const result = await cli(["deploy", "--prod", "--yes", "--no-wait", "--json", "--project", state.projectId,
    "--scope", scope, "--local-config", "vercel.dci.json", "--no-color"]);
  check(result.code === 0, "Production deployment command failed; output suppressed");
  const data = JSON.parse(result.stdout);
  console.log(JSON.stringify({ keys: Object.keys(data), deploymentId: data.id, url: data.url,
    state: data.readyState, projectId: data.projectId }));
  state.deploymentId = data.id ?? data.deployment?.id;
  state.deploymentUrl = data.url ?? data.deployment?.url;
  state.deployedCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  saveState(state);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const operation = process.argv[2];
    if (operation === "create") await create();
    else if (operation === "inspect") await inspect();
    else if (operation === "configure") await configure();
    else if (operation === "dry") await dry();
    else if (operation === "deploy") await deploy();
    else throw new Error("Unknown DCI Vercel operation");
  } catch (error) {
    console.error(error.message);
    if (error.safeDetail) console.error(error.safeDetail);
    process.exitCode = 1;
  }
}
