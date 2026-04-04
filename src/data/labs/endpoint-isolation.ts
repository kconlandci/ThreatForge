import type { LabManifest } from "../../types/manifest";

export const endpointIsolationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "endpoint-isolation",
  version: 1,
  title: "Endpoint Isolation",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["edr", "endpoint", "isolation", "containment", "soc", "alert-triage"],

  description:
    "Analyze endpoint alerts and decide whether to monitor, contain, or quarantine each device based on threat severity and business impact.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Assess alert severity using risk scores and evidence",
    "Choose proportional isolation responses (monitor, contain, quarantine)",
    "Justify decisions by connecting evidence to action",
  ],
  sortOrder: 40,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "ep-001",
      title: "Suspicious Browser Extension",
      context:
        'The user installed a non-standard browser extension "SuperCouponFinder". It is requesting access to read data on all websites.',
      displayFields: [
        { label: "Hostname", value: "HR-PC-04" },
        { label: "IP Address", value: "10.0.4.55" },
        { label: "Risk Score", value: "35", emphasis: "normal" },
        { label: "Last Seen", value: "2 mins ago" },
        { label: "Alert", value: "Suspicious Browser Extension detected.", emphasis: "warn" },
      ],
      evidence: [
        "Process: chrome.exe",
        "Signatures: Low-Confidence Adware",
        "Network: Periodic beacons to unusual TLD (.xyz)",
      ],

      actions: [
        { id: "MONITOR", label: "Monitor Only", color: "blue" },
        { id: "CONTAIN", label: "Contain", color: "yellow" },
        { id: "QUARANTINE", label: "Quarantine", color: "red" },
      ],
      correctActionId: "MONITOR",

      rationales: [
        {
          id: "R1_1",
          text: "Evidence suggests low-risk adware; observe for credential theft before disrupting workflow.",
        },
        {
          id: "R1_2",
          text: "Browser extensions are always malicious and require immediate network isolation.",
        },
        {
          id: "R1_3",
          text: "The .xyz domain indicates a Nation-State actor; full quarantine required.",
        },
      ],
      correctRationaleId: "R1_1",

      feedback: {
        perfect:
          "Correct. Low-severity adware usually warrants monitoring to ensure it doesn't escalate without disrupting the user prematurely.",
        partial:
          "Partially correct. You got the action or reasoning right, but not both. Low-confidence adware with no data exfiltration doesn't justify aggressive isolation.",
        wrong:
          "Incorrect. Over-escalating on low-risk alerts causes security fatigue. TLDs like .xyz are common for adware, not necessarily nation-state activity.",
      },
    },
    {
      type: "action-rationale",
      id: "ep-002",
      title: "Credential Dumping on Finance Server",
      context:
        "Encoded PowerShell script detected executing under a Service Account. Script is attempting to dump LSASS memory.",
      displayFields: [
        { label: "Hostname", value: "FIN-SRV-02" },
        { label: "IP Address", value: "10.0.2.10" },
        { label: "Risk Score", value: "88", emphasis: "critical" },
        { label: "Last Seen", value: "Active Now" },
        { label: "Alert", value: "Unauthorized PowerShell Execution", emphasis: "critical" },
      ],
      evidence: [
        "Process: powershell.exe -enc ...",
        "Behavior: Credential Dumping (LSASS)",
        "Account: SVC_SQL_ADMIN",
      ],

      actions: [
        { id: "MONITOR", label: "Monitor Only", color: "blue" },
        { id: "CONTAIN", label: "Contain", color: "yellow" },
        { id: "QUARANTINE", label: "Quarantine", color: "red" },
      ],
      correctActionId: "QUARANTINE",

      rationales: [
        {
          id: "R2_1",
          text: "Service accounts often run complex scripts; monitoring is safer to avoid downtime.",
        },
        {
          id: "R2_2",
          text: "Containment allows the user to keep working while we block specific IPs.",
        },
        {
          id: "R2_3",
          text: "Critical threat involving credential theft attempts; immediate isolation is necessary to prevent lateral movement.",
        },
      ],
      correctRationaleId: "R2_3",

      feedback: {
        perfect:
          "Correct. When high-value credentials are at risk, immediate quarantine is required to protect the domain.",
        partial:
          "Partially correct. Credential dumping (LSASS) is a high-confidence signal of an active attack. Half measures won't stop in-memory attacks.",
        wrong:
          "Incorrect. LSASS credential dumping on a finance server is a critical threat. Monitoring or soft containment allows the attacker to steal domain credentials.",
      },
    },
    {
      type: "action-rationale",
      id: "ep-003",
      title: "Lateral Movement from Developer Workstation",
      context:
        "Host is attempting to scan port 445 (SMB) across the entire /24 subnet.",
      displayFields: [
        { label: "Hostname", value: "DEV-WKST-12" },
        { label: "IP Address", value: "10.0.12.89" },
        { label: "Risk Score", value: "62", emphasis: "warn" },
        { label: "Last Seen", value: "5 mins ago" },
        { label: "Alert", value: "Lateral Movement Detected", emphasis: "warn" },
      ],
      evidence: [
        "Process: Unknown binary (update.exe)",
        "Behavior: Internal Network Scanning",
        "Frequency: 200 connection attempts/sec",
      ],

      actions: [
        { id: "MONITOR", label: "Monitor Only", color: "blue" },
        { id: "CONTAIN", label: "Contain", color: "yellow" },
        { id: "QUARANTINE", label: "Quarantine", color: "red" },
      ],
      correctActionId: "CONTAIN",

      rationales: [
        {
          id: "R3_1",
          text: "Scanning is normal for developer workstations; no action needed.",
        },
        {
          id: "R3_2",
          text: "Active scanning indicates potential worm or manual attacker; containment blocks network spread while allowing forensics.",
        },
        {
          id: "R3_3",
          text: "Disconnecting the power is the only way to stop network scanning effectively.",
        },
      ],
      correctRationaleId: "R3_2",

      feedback: {
        perfect:
          "Correct. Containment stops the spread while allowing teams to investigate the binary over the network.",
        partial:
          "Partially correct. The scanning is clearly malicious, but your action or reasoning didn't fully match the right response.",
        wrong:
          "Incorrect. High-frequency SMB scanning from an unknown binary is a classic indicator of a worm or lateral movement. Ignoring it is dangerous; pulling power destroys forensic evidence.",
      },
    },
  ],

  hints: [
    "Check the Risk Score: High scores (80+) usually require more aggressive isolation.",
    "Consider the asset: A Finance Server (FIN) is much more critical than a guest workstation.",
    "Look at the Behavior: If it is spreading (scanning) or stealing passwords (LSASS), stop it immediately.",
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

  careerInsight:
    "In a real SOC, hesitation is as dangerous as over-reaction. Senior analysts distinguish themselves by balancing business continuity against threat severity. Always isolate confirmed lateral movement immediately.",
  toolRelevance: [
    "EDR platforms (CrowdStrike, SentinelOne, Defender for Endpoint)",
    "SOAR playbooks for automated isolation",
    "SIEM alert correlation",
  ],

  createdAt: "2026-03-22",
  updatedAt: "2026-03-22",
};
