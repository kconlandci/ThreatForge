import type { LabManifest } from "../../types/manifest";

export const ransomwareContainmentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "ransomware-containment",
  version: 1,
  title: "Ransomware Containment",

  tier: "intermediate",
  track: "incident-response",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "ransomware",
    "incident-response",
    "containment",
    "business-continuity",
    "edr",
    "forensics",
  ],

  description:
    "Make critical containment decisions during active ransomware incidents. Balance the urgency of stopping encryption with evidence preservation, business continuity, and knowing when to escalate versus act autonomously.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Prioritize containment actions based on threat scope and confidence level",
    "Balance security response with business continuity requirements",
    "Recognize when to escalate vs. when to act autonomously",
    "Distinguish ransomware indicators from legitimate file operations",
    "Understand evidence preservation during active incidents",
  ],
  sortOrder: 200,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "ransom-001",
      title: "Single Workstation — Early Encryption",
      context:
        "EDR alert on a finance workstation: rapid file modifications across multiple directories, .encrypted extension being appended, high CPU usage. No ransom note visible yet. User reports files won't open. The encryption appears to have started 8 minutes ago.",
      displayFields: [
        { label: "Host", value: "FIN-WS-07", emphasis: "normal" },
        {
          label: "User",
          value: "Maria Chen — Accounts Payable",
          emphasis: "normal",
        },
        {
          label: "EDR Alert",
          value: "Rapid file modification — 2,400 files in 8 min",
          emphasis: "critical",
        },
        {
          label: "CPU",
          value: "98% — single process",
          emphasis: "critical",
        },
        {
          label: "Network",
          value: "No lateral SMB connections detected yet",
          emphasis: "warn",
        },
        {
          label: "Last Backup",
          value: "Nightly — 14 hours ago",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "ISOLATE_NET",
          label: "Isolate from network immediately",
          color: "red",
        },
        {
          id: "KILL_PROC",
          label: "Kill the suspicious process first",
          color: "orange",
        },
        {
          id: "SHUTDOWN",
          label: "Shut down the workstation",
          color: "yellow",
        },
        {
          id: "WAIT_INFO",
          label: "Alert the user and wait for more information",
          color: "blue",
        },
      ],
      correctActionId: "ISOLATE_NET",
      rationales: [
        {
          id: "rat-isolate",
          text: "Network isolation stops lateral spread while preserving volatile memory for forensics.",
        },
        {
          id: "rat-kill",
          text: "Killing the process may not stop persistence mechanisms that could restart the encryption.",
        },
        {
          id: "rat-shutdown",
          text: "Shutting down destroys volatile evidence in memory that forensics teams need.",
        },
        {
          id: "rat-wait",
          text: "Waiting allows encryption to continue and potentially spread to network shares.",
        },
      ],
      correctRationaleId: "rat-isolate",
      feedback: {
        perfect:
          "Textbook response. Network isolation is the highest-priority action during active encryption — it prevents lateral spread to other hosts while keeping the machine running for memory forensics.",
        partial:
          "You took action, but your approach has trade-offs. Killing the process may miss persistence, and shutting down destroys volatile memory. Isolation is the priority.",
        wrong:
          "Waiting during active encryption is catastrophic. Every minute of delay means more encrypted files and higher risk of lateral spread. Act first, investigate second.",
      },
    },
    {
      type: "action-rationale",
      id: "ransom-002",
      title: "Multi-Host Active Spread",
      context:
        "Three workstations in different departments simultaneously display ransom notes demanding 2.5 BTC. Network monitoring shows SMB traffic between them over the past 20 minutes. A fourth host in HR is showing the early file modification pattern.",
      displayFields: [
        {
          label: "Affected Hosts",
          value: "SALES-WS-03, ENG-WS-11, MKT-WS-22",
          emphasis: "critical",
        },
        {
          label: "Ransom Note",
          value: "Demanding 2.5 BTC, 48hr deadline",
          emphasis: "critical",
        },
        {
          label: "Network",
          value: "SMB lateral movement confirmed",
          emphasis: "critical",
        },
        {
          label: "Fourth Host",
          value: "HR-WS-06 — early file modifications starting",
          emphasis: "warn",
        },
        {
          label: "Business Impact",
          value: "3 departments affected, end of quarter",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "ISOLATE_SUBNET",
          label: "Isolate affected subnet at the switch",
          color: "orange",
        },
        {
          id: "KILL_INTERNET",
          label: "Kill internet for entire organization",
          color: "red",
        },
        {
          id: "INVOKE_IR",
          label: "Invoke full incident response plan",
          color: "green",
        },
        {
          id: "NEGOTIATE",
          label: "Begin negotiating with attackers",
          color: "yellow",
        },
      ],
      correctActionId: "INVOKE_IR",
      rationales: [
        {
          id: "rat-ir",
          text: "Multi-department spread requires coordinated response — legal, comms, forensics, and executive notification all need to activate simultaneously.",
        },
        {
          id: "rat-subnet",
          text: "Subnet isolation won't help when multiple subnets are already affected across different departments.",
        },
        {
          id: "rat-internet",
          text: "Killing all internet disrupts business beyond the affected systems and may interfere with cloud-based recovery tools.",
        },
        {
          id: "rat-negotiate",
          text: "Negotiation is premature without understanding the full scope of the compromise and consulting legal counsel.",
        },
      ],
      correctRationaleId: "rat-ir",
      feedback: {
        perfect:
          "Correct. When ransomware crosses department boundaries, it's no longer a technical incident — it's an organizational crisis. The IR plan coordinates legal, communications, forensics, and executive decision-making simultaneously.",
        partial:
          "You tried to contain the threat, but isolated technical actions aren't enough at this scale. Multi-department incidents require the full IR plan to coordinate all response streams.",
        wrong:
          "Negotiating without understanding scope or consulting legal is premature and potentially illegal in some jurisdictions. The IR plan must be activated first.",
      },
    },
    {
      type: "action-rationale",
      id: "ransom-003",
      title: "Production Server — Business Continuity Conflict",
      context:
        "Your e-commerce production database server shows the same file modification pattern, but the database is still operational and processing $47K/hour in transactions. Isolating it will cause immediate revenue loss during a holiday weekend sale.",
      displayFields: [
        {
          label: "Server",
          value: "PROD-DB-01 — MySQL Primary",
          emphasis: "critical",
        },
        {
          label: "Status",
          value: "Database operational, queries responding",
          emphasis: "warn",
        },
        {
          label: "Revenue",
          value: "$47K/hour in active transactions",
          emphasis: "critical",
        },
        {
          label: "File Modification",
          value: "Non-database files being encrypted",
          emphasis: "warn",
        },
        {
          label: "Backup",
          value: "Warm standby exists, 15-min failover",
          emphasis: "normal",
        },
        {
          label: "Encryption Progress",
          value: "12% of filesystem, DB files untouched so far",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "ISOLATE_NOW",
          label: "Isolate immediately regardless of business impact",
          color: "red",
        },
        {
          id: "FAILOVER_ISOLATE",
          label: "Snapshot and failover first, then isolate",
          color: "orange",
        },
        {
          id: "MONITOR",
          label: "Monitor closely but keep running",
          color: "yellow",
        },
        {
          id: "ESCALATE_CTO",
          label: "Escalate to CTO for business decision",
          color: "green",
        },
      ],
      correctActionId: "ESCALATE_CTO",
      rationales: [
        {
          id: "rat-escalate",
          text: "Production server isolation has direct revenue impact — security recommends isolation but the business must make the risk decision.",
        },
        {
          id: "rat-unilateral",
          text: "Unilateral isolation of revenue-generating infrastructure exceeds analyst authority and could cause significant financial harm.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring without action risks the database files being encrypted, which would be catastrophic.",
        },
        {
          id: "rat-failover",
          text: "Snapshot-then-isolate is technically sound but needs executive approval for the downtime.",
        },
      ],
      correctRationaleId: "rat-escalate",
      feedback: {
        perfect:
          "Mature judgment. When containment directly impacts revenue, the decision exceeds analyst authority. Present the risk, recommend isolation with failover, but let the CTO make the business call. Document everything.",
        partial:
          "Your technical instinct may be correct, but taking unilateral action on production revenue infrastructure can end careers. Escalate with a clear recommendation, then execute the decision.",
        wrong:
          "Monitoring a server that's actively being encrypted is gambling with the business. But acting without executive approval on $47K/hour infrastructure is also wrong. Escalation is the answer.",
      },
    },
    {
      type: "action-rationale",
      id: "ransom-004",
      title: "False Alarm — Aggressive Antivirus",
      context:
        "Endpoint protection quarantines a file and triggers a 'ransomware detected' alert. Investigation shows the quarantined file is 7-Zip performing batch compression of old log files as part of a scheduled cleanup task. The compression behavior matched ransomware heuristics.",
      displayFields: [
        {
          label: "Alert",
          value: "Ransomware behavior detected — file quarantined",
          emphasis: "warn",
        },
        {
          label: "File",
          value: "7z.exe (v23.01) — legitimate archiver",
          emphasis: "normal",
        },
        {
          label: "Task",
          value: "Scheduled task 'LogArchive' — runs weekly",
          emphasis: "normal",
        },
        {
          label: "File Hash",
          value: "Matches known-good 7-Zip hash on VirusTotal",
          emphasis: "normal",
        },
        {
          label: "User Context",
          value: "SYSTEM account — scheduled task",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "RESTORE_WHITELIST",
          label: "Restore file and whitelist the process",
          color: "green",
        },
        {
          id: "KEEP_QUARANTINE",
          label: "Keep quarantined and investigate further",
          color: "orange",
        },
        {
          id: "ISOLATE_WS",
          label: "Isolate the workstation anyway",
          color: "red",
        },
        {
          id: "REPORT_TP",
          label: "Report as true positive to SOC",
          color: "yellow",
        },
      ],
      correctActionId: "RESTORE_WHITELIST",
      rationales: [
        {
          id: "rat-fp",
          text: "Verified hash + known scheduled task + legitimate tool = confirmed false positive — restore and update detection exclusions.",
        },
        {
          id: "rat-quarantine",
          text: "Keeping it quarantined breaks the scheduled maintenance task and creates technical debt.",
        },
        {
          id: "rat-isolate-waste",
          text: "Isolating a workstation for a known tool wastes resources and analyst time.",
        },
        {
          id: "rat-tp",
          text: "Reporting as true positive pollutes threat intelligence and degrades detection quality.",
        },
      ],
      correctRationaleId: "rat-fp",
      feedback: {
        perfect:
          "Sharp analysis. You verified the file hash, confirmed the scheduled task, and recognized the false positive. Restoring with a whitelist exclusion prevents future alert fatigue without reducing security.",
        partial:
          "Caution is good, but over-investigating a confirmed false positive wastes time. Once the hash is verified and the task is known, restore and whitelist.",
        wrong:
          "Isolating or reporting a verified false positive wastes resources and erodes trust in the detection system. Verify the evidence, then act on what it tells you.",
      },
    },
  ],

  hints: [
    "In an active encryption event, network isolation is almost always the first priority — it prevents spread without destroying evidence.",
    "When multiple departments are affected, it's no longer a technical problem — it's an organizational crisis requiring the IR plan.",
    "Not every 'ransomware detected' alert is real. Verify the file hash, check for scheduled tasks, and confirm with the user before escalating.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Ransomware response is the highest-pressure scenario in cybersecurity. The decisions made in the first 30 minutes determine whether the incident costs thousands or millions. Senior responders distinguish themselves by knowing when to act and when to escalate.",
  toolRelevance: [
    "CrowdStrike Falcon (EDR isolation)",
    "Veeam / Commvault (Backup verification)",
    "Wireshark (Network analysis)",
    "CISA Ransomware Response Checklist",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
