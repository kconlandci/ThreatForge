// Access codes are persisted ONLY in dci-test-roster.local.md, never stdout.
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TABLES } from "../server/dci/config.js";
import { listRecords, createRecords, formulaString } from "../server/dci/airtable.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const filename = "dci-test-roster.local.md";
const rosterPath = new URL(`../${filename}`, import.meta.url);
const accounts = [
  { name: "Kevin Conlan (test)", email: "conlan.dci@gmail.com" },
  { name: "DCI Student Access (test)", email: "dcistudentaccess@gmail.com" },
  { name: "IT Career Help (test)", email: "itcareerhelp411@gmail.com" },
];
const digest = (value) => createHash("sha256").update(value).digest("hex");
const check = (condition, message) => { if (!condition) throw new Error(message); };

export function verifyLocalSecretIgnores() {
  for (const name of [".env.local", filename]) {
    execFileSync("git", ["check-ignore", "--quiet", "--", name], { cwd: root, stdio: "ignore" });
    const tracked = execFileSync("git", ["ls-files", "--", name], { cwd: root, encoding: "utf8" });
    check(tracked.trim() === "", "A local secret filename is tracked; stop before writing.");
  }
}

function saveRoster(rows, initial = false) {
  const text = [
    "# DCI pilot test roster — local only", "",
    "Private test access codes. Keep this ignored file on this device.", "",
    "| Name | Email | Student record ID | Access code |",
    "| --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.name} | ${row.email} | ${row.id ?? "pending"} | ${row.code} |`), "",
  ].join("\n");
  writeFileSync(rosterPath, text, { flag: initial ? "wx" : "w", mode: 0o600 });
}

export function readLocalRoster() {
  verifyLocalSecretIgnores();
  const text = readFileSync(rosterPath, "utf8");
  return accounts.map((account) => {
    const line = text.split(/\r?\n/).find((entry) => entry.startsWith(`| ${account.name} | ${account.email} |`));
    check(Boolean(line), "Local roster is incomplete; manual review required.");
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    check(cells.length === 4 && /^[A-Za-z0-9_-]{24}$/.test(cells[3]), "Local roster format requires review.");
    check(cells[2] === "pending" || /^rec[A-Za-z0-9]{14}$/.test(cells[2]), "Local roster identity requires review.");
    return { ...account, id: cells[2] === "pending" ? null : cells[2], code: cells[3] };
  });
}

export async function seedTestRoster() {
  verifyLocalSecretIgnores();
  if (!existsSync(rosterPath)) {
    saveRoster(accounts.map((account) => ({ ...account, id: null, code: randomBytes(18).toString("base64url") })), true);
  }
  const rows = readLocalRoster();
  // Preflight all three exact emails before any create. Never alter an unrelated
  // existing student or rotate a test access code during a retry.
  const missing = [];
  for (const row of rows) {
    const records = await listRecords(TABLES.students, {
      filterByFormula: `LOWER({Email})=${formulaString(row.email)}`,
    });
    check(records.length <= 1, "Duplicate test email requires review; no automatic overwrite.");
    if (records.length === 1) {
      const record = records[0];
      check(record.fields.Name === row.name && record.fields["Pathway / Cohort"] === "Pilot test" &&
        record.fields["Access Code Hash"] === digest(row.code) && record.fields.Status === "Active" &&
        (!row.id || row.id === record.id), "Existing test email differs from the saved roster; review required.");
      row.id = record.id;
    } else {
      check(!row.id, "Saved test student is missing; do not recreate automatically.");
      missing.push(row);
    }
  }
  saveRoster(rows);
  if (missing.length) {
    const created = await createRecords(TABLES.students, missing.map((row) => ({ fields: {
      Name: row.name, Email: row.email, Status: "Active", "Pathway / Cohort": "Pilot test",
      "Access Code Hash": digest(row.code), "Date Added": new Date().toISOString().slice(0, 10),
    } })));
    check(created.length === missing.length, "Uncertain test create outcome; reread destination before retry.");
    for (const row of missing) {
      const record = created.find((entry) => entry.fields.Email === row.email);
      check(record?.fields["Access Code Hash"] === digest(row.code), "Test create readback requires review.");
      row.id = record.id;
    }
    saveRoster(rows);
  }
  // Return only in-memory values to the integration script; never log codes.
  return rows;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.loadEnvFile(new URL("../.env.local", import.meta.url));
    const rows = await seedTestRoster();
    for (const row of rows) console.log(`Seeded/verified test student: ${row.id}`);
  } catch {
    console.error("Test roster seeding stopped; reconcile saved roster and destination before retrying.");
    process.exitCode = 1;
  }
}
