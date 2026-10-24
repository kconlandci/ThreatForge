// Read secret values only into memory. Output counts/booleans, never matches.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readLocalRoster } from "./dci-seed-test-roster.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
const check = (condition, label) => { if (!condition) throw new Error(label); };
try {
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
  const values = [process.env.AIRTABLE_PAT, process.env.DCI_SESSION_SECRET, process.env.VERCEL_OIDC_TOKEN,
    ...readLocalRoster().map(row => row.code)].filter(Boolean);
  check(values.length >= 5, "Local secret inputs incomplete");
  const localFiles = readdirSync(root).filter(name => name === ".env.local" || /\.local(?:\.|$)/.test(name));
  for (const file of localFiles) {
    git(["check-ignore", "--quiet", "--", file]);
    check(git(["ls-files", "--", file]).trim() === "", "Private local file is tracked");
  }
  const scan = data => {
    check(values.every(value => !data.includes(value)), "Secret-value scan failed; matched content suppressed");
    check(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(data), "Private-key scan failed; matched content suppressed");
    check(!/\bpat[A-Za-z0-9]{14}\.[A-Za-z0-9]{64}\b/.test(data), "PAT-pattern scan failed; matched content suppressed");
  };
  const headFiles = git(["ls-tree", "-r", "--name-only", "HEAD"]).trim().split("\n");
  check(!headFiles.some(name => /^\.env(?:\.|$)/.test(name) || /^dci-.*\.local(?:\.|$)/.test(name)), "Private file in branch tip");
  const tipObjects = git(["ls-tree", "-r", "HEAD"]).trim().split("\n").map(line => line.split(/\s+/)[2]);
  const indexObjects = git(["ls-files", "--stage"]).trim().split("\n").map(line => line.split(/\s+/)[1]);
  // Scan new objects in the outgoing history as well as every tip blob.
  const outgoing = git(["rev-list", "--objects", "HEAD", "--not", "--remotes=origin"]).trim().split("\n").filter(Boolean).map(line => line.split(" ")[0]);
  const objects = [...new Set([...tipObjects, ...indexObjects, ...outgoing])];
  const batch = execFileSync("git", ["cat-file", "--batch"], { cwd: root, input: objects.join("\n") + "\n",
    maxBuffer: 256 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] });
  let offset = 0;
  for (const id of objects) {
    const newline = batch.indexOf(10, offset);
    const [returnedId, , size] = batch.subarray(offset, newline).toString("utf8").split(" ");
    check(returnedId === id && /^\d+$/.test(size), "Git scan format mismatch");
    offset = newline + 1;
    scan(batch.subarray(offset, offset + Number(size)).toString("utf8"));
    offset += Number(size) + 1;
  }
  // Existing evidence must contain no credential/code values either.
  for (const file of localFiles.filter(name => name.includes("evidence") || name === "dci-vercel-state.local")) scan(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
  console.log(JSON.stringify({ securityScan: "passed", branchTipFiles: headFiles.length, scannedGitObjects: objects.length,
    ignoredUntrackedPrivateFiles: localFiles, evidenceScan: "passed", valuesPrinted: false }));
} catch {
  console.error("Release security verification stopped; no matched content or secret value was printed.");
  process.exitCode = 1;
}
