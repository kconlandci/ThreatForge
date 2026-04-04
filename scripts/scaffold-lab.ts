#!/usr/bin/env npx tsx
// ============================================================
// ThreatForge — Lab Scaffold Generator
// Generates a skeleton lab manifest with TODO placeholders.
// Usage: npx tsx scripts/scaffold-lab.ts
// ============================================================

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function choose(question: string, options: string[]): Promise<string> {
  return new Promise((resolve) => {
    console.log(question);
    options.forEach((o, i) => console.log(`  ${i + 1}) ${o}`));
    rl.question("Enter number: ", (answer) => {
      const idx = parseInt(answer, 10) - 1;
      resolve(options[idx] ?? options[0]);
    });
  });
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toExportName(slug: string): string {
  return (
    slug
      .split("-")
      .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
      .join("") + "Lab"
  );
}

function getScenarioTemplate(rendererType: string, index: number): string {
  const id = `s-${String(index + 1).padStart(3, "0")}`;

  if (rendererType === "action-rationale") {
    return `    {
      type: "action-rationale",
      id: "${id}",
      title: "TODO: Scenario ${index + 1} title",
      context: "TODO: Describe the situation the learner faces",
      displayFields: [
        { label: "TODO: Field 1", value: "TODO: Value", emphasis: "normal" },
        { label: "TODO: Field 2", value: "TODO: Value", emphasis: "critical" },
      ],
      actions: [
        { id: "a1", label: "TODO: Action 1", color: "green" },
        { id: "a2", label: "TODO: Action 2", color: "yellow" },
        { id: "a3", label: "TODO: Action 3", color: "red" },
      ],
      correctActionId: "a1",
      rationales: [
        { id: "r1", text: "TODO: Why this is the correct rationale" },
        { id: "r2", text: "TODO: Plausible but incorrect rationale" },
        { id: "r3", text: "TODO: Another incorrect rationale" },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "TODO: Explain why both action and rationale are correct",
        partial: "TODO: Explain partial credit",
        wrong: "TODO: Educational explanation for wrong answer",
      },
    }`;
  }

  if (rendererType === "toggle-config") {
    return `    {
      type: "toggle-config",
      id: "${id}",
      title: "TODO: Scenario ${index + 1} title",
      description: "TODO: Describe what the learner needs to configure",
      targetSystem: "TODO: System name",
      items: [
        {
          id: "item1",
          label: "TODO: Setting name",
          detail: "TODO: What this setting does",
          currentState: "TODO: Current value",
          correctState: "TODO: Correct value",
          states: ["TODO: Option 1", "TODO: Option 2"],
          rationaleId: "jr1",
        },
        {
          id: "item2",
          label: "TODO: Setting name",
          detail: "TODO: What this setting does",
          currentState: "TODO: Current value",
          correctState: "TODO: Correct value",
          states: ["TODO: Option 1", "TODO: Option 2"],
          rationaleId: "jr2",
        },
      ],
      rationales: [
        { id: "jr1", text: "TODO: Why this configuration is correct" },
        { id: "jr2", text: "TODO: Why this configuration is correct" },
      ],
      feedback: {
        perfect: "TODO: All items configured correctly",
        partial: "TODO: Some items misconfigured",
        wrong: "TODO: Multiple misconfigurations",
      },
    }`;
  }

  if (rendererType === "investigate-decide") {
    return `    {
      type: "investigate-decide",
      id: "${id}",
      title: "TODO: Scenario ${index + 1} title",
      objective: "TODO: What the learner needs to determine",
      investigationData: [
        { id: "src1", label: "TODO: Data source name", content: "TODO: What the source reveals" },
        { id: "src2", label: "TODO: Data source name", content: "TODO: Key finding", isCritical: true },
        { id: "src3", label: "TODO: Data source name", content: "TODO: Additional context" },
      ],
      actions: [
        { id: "a1", label: "TODO: Action 1", color: "green" },
        { id: "a2", label: "TODO: Action 2", color: "yellow" },
        { id: "a3", label: "TODO: Action 3", color: "red" },
      ],
      correctActionId: "a1",
      rationales: [
        { id: "r1", text: "TODO: Why this is the correct rationale" },
        { id: "r2", text: "TODO: Plausible but incorrect rationale" },
        { id: "r3", text: "TODO: Another incorrect rationale" },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "TODO: Explain correct investigation and decision",
        partial: "TODO: Explain partial credit",
        wrong: "TODO: Educational explanation",
      },
    }`;
  }

  // triage-remediate
  return `    {
      type: "triage-remediate",
      id: "${id}",
      title: "TODO: Scenario ${index + 1} title",
      description: "TODO: What the learner needs to classify and remediate",
      evidence: [
        { type: "TODO: Evidence type", content: "TODO: Evidence content" },
        { type: "TODO: Evidence type", content: "TODO: Key evidence" },
      ],
      classifications: [
        { id: "c1", label: "TODO: Classification 1", description: "TODO: Description" },
        { id: "c2", label: "TODO: Classification 2", description: "TODO: Description" },
        { id: "c3", label: "TODO: Classification 3", description: "TODO: Description" },
      ],
      correctClassificationId: "c1",
      remediations: [
        { id: "rem1", label: "TODO: Remediation 1", description: "TODO: Description" },
        { id: "rem2", label: "TODO: Remediation 2", description: "TODO: Description" },
        { id: "rem3", label: "TODO: Remediation 3", description: "TODO: Description" },
      ],
      correctRemediationId: "rem1",
      rationales: [
        { id: "r1", text: "TODO: Why this classification and remediation are correct" },
        { id: "r2", text: "TODO: Plausible but incorrect rationale" },
        { id: "r3", text: "TODO: Another incorrect rationale" },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "TODO: All three selections correct",
        partial: "TODO: Partial credit explanation",
        wrong: "TODO: Educational explanation",
      },
    }`;
}

async function main() {
  console.log("\n🔧 ThreatForge Lab Scaffold Generator\n");

  const title = await ask("Lab title: ");
  const rendererType = await choose("Renderer type:", [
    "action-rationale",
    "toggle-config",
    "investigate-decide",
    "triage-remediate",
  ]);
  const tier = await choose("Tier:", ["beginner", "intermediate", "advanced"]);
  const difficulty =
    tier === "beginner"
      ? "easy"
      : tier === "intermediate"
      ? "moderate"
      : "challenging";
  const track = await choose("Track:", [
    "blue-team-foundations",
    "network-defense",
    "identity-access",
    "detection-hunting",
    "vulnerability-hardening",
    "incident-response",
    "cloud-security",
  ]);
  const accessLevel = await choose("Access level:", ["free", "premium"]);
  const scenarioCountStr = await ask("Number of scenarios (3-5): ");
  const scenarioCount = Math.min(5, Math.max(3, parseInt(scenarioCountStr, 10) || 3));

  const slug = toSlug(title);
  const exportName = toExportName(slug);

  const scenarios = Array.from({ length: scenarioCount }, (_, i) =>
    getScenarioTemplate(rendererType, i)
  ).join(",\n");

  const content = `import type { LabManifest } from "../../types/manifest";

export const ${exportName}: LabManifest = {
  schemaVersion: "1.1",
  id: "${slug}",
  version: 1,
  title: "${title}",

  tier: "${tier}",
  track: "${track}",
  difficulty: "${difficulty}",
  accessLevel: "${accessLevel}",
  tags: ["TODO: add tags"],

  description: "TODO: 10-300 character description of this lab",
  estimatedMinutes: 10, // TODO: adjust
  learningObjectives: [
    "TODO: Learning objective 1",
    "TODO: Learning objective 2",
    "TODO: Learning objective 3",
  ],
  sortOrder: 999, // TODO: set proper sort order

  status: "draft",
  prerequisites: [],

  rendererType: "${rendererType}",

  scenarios: [
${scenarios},
  ],

  hints: [
    "TODO: Hint 1 — general guidance",
    "TODO: Hint 2 — more specific pointer",
    "TODO: Hint 3 — strongest hint without giving answer away",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: {
      perfect: 0,
      partial: 10,
      wrong: 20,
    },
    passingThresholds: {
      pass: 80,
      partial: 50,
    },
  },

  careerInsight: "TODO: 1-2 sentences about how this skill appears in real security jobs",
  toolRelevance: [
    "TODO: Real security tool 1",
    "TODO: Real security tool 2",
  ],

  createdAt: "${new Date().toISOString().slice(0, 10)}",
  updatedAt: "${new Date().toISOString().slice(0, 10)}",
};
`;

  const outDir = path.resolve(__dirname, "../src/data/labs");
  const outPath = path.join(outDir, `${slug}.ts`);

  if (fs.existsSync(outPath)) {
    console.log(`\n⚠️  File already exists: ${outPath}`);
    const overwrite = await ask("Overwrite? (y/n): ");
    if (overwrite.toLowerCase() !== "y") {
      console.log("Aborted.");
      rl.close();
      return;
    }
  }

  fs.writeFileSync(outPath, content, "utf-8");
  console.log(`\n✅ Lab skeleton created at src/data/labs/${slug}.ts`);
  console.log(`   Export: ${exportName}`);
  console.log(`   Fill in the TODO fields, then add to catalog.ts.\n`);

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
