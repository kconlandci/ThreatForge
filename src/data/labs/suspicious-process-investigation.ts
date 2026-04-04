import type { LabManifest } from "../../types/manifest";

export const suspiciousProcessInvestigationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "suspicious-process-investigation",
  version: 1,
  title: "Suspicious Process Investigation",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "edr",
    "process-investigation",
    "malware",
    "threat-hunting",
    "endpoint-security",
    "triage",
  ],

  description:
    "Investigate EDR-flagged processes by analyzing file paths, digital signatures, parent processes, and network connections to determine whether each alert is malicious, benign, or requires escalation.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Validate process legitimacy using file path, signature, and parent process",
    "Identify common malware masquerading techniques",
    "Distinguish false positives from real threats using contextual evidence",
    "Apply appropriate response based on confidence level",
  ],
  sortOrder: 70,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "proc-001",
      title: "Legitimate Windows Update",
      objective:
        "EDR flagged a process with elevated privileges. Investigate whether it's malicious.",
      investigationData: [
        {
          id: "process-details",
          label: "Process Details",
          content:
            "Process: wuauclt.exe | PID: 4812 | Parent: svchost.exe (PID 1024) | Elevated: Yes | Started: 2026-03-23 02:15:00 UTC",
        },
        {
          id: "file-path",
          label: "File Path Verification",
          content:
            "Path: C:\\Windows\\System32\\wuauclt.exe — This is the correct and expected location for the Windows Update AutoUpdate Client.",
        },
        {
          id: "digital-sig",
          label: "Digital Signature",
          content:
            "Signed by: Microsoft Windows Publisher | Certificate: Valid | Timestamp: 2025-11-14 | Chain: Trusted Root CA",
        },
        {
          id: "network-conn",
          label: "Network Connections",
          content:
            "Outbound: 20.190.151.68:443 (HTTPS) — Resolves to Microsoft Azure Update CDN (windowsupdate.microsoft.com). Standard Windows Update traffic pattern.",
        },
      ],
      actions: [
        {
          id: "BENIGN_CLOSE",
          label: "Benign — close the alert",
          color: "green",
        },
        {
          id: "MALICIOUS_ISOLATE",
          label: "Malicious — isolate endpoint",
          color: "red",
        },
        {
          id: "SUSPICIOUS_MONITOR",
          label: "Suspicious — monitor and restrict",
          color: "orange",
        },
        {
          id: "ESCALATE_T2",
          label: "Escalate to Tier 2",
          color: "yellow",
        },
      ],
      correctActionId: "BENIGN_CLOSE",
      rationales: [
        {
          id: "rat-legitimate",
          text: "The correct file path (System32), valid Microsoft signature, expected parent process (svchost.exe), and connection to Microsoft update servers all confirm this is a legitimate Windows Update process.",
        },
        {
          id: "rat-elevated-bad",
          text: "Elevated privileges always indicate malicious activity — legitimate processes don't need admin rights.",
        },
        {
          id: "rat-cloud-suspicious",
          text: "Network traffic to cloud infrastructure is inherently suspicious and should be investigated further.",
        },
        {
          id: "rat-safe-isolate",
          text: "Better safe than sorry — isolating the endpoint prevents potential damage even if it's legitimate.",
        },
      ],
      correctRationaleId: "rat-legitimate",
      feedback: {
        perfect:
          "Correct. All four indicators — file path, digital signature, parent process, and network destination — align with a legitimate Windows Update process. Closing the alert is the right call.",
        partial:
          "Your caution is understandable, but this process checks every legitimacy box. Unnecessary escalation or monitoring wastes SOC resources and creates alert fatigue.",
        wrong:
          "Isolating a machine running a legitimate Windows Update would disrupt operations and erode trust in the security team. Learn to recognize verified benign processes confidently.",
      },
    },
    {
      type: "investigate-decide",
      id: "proc-002",
      title: "Malware Beacon Disguised as System Process",
      objective:
        "An analyst noticed unusual network traffic from a workstation. Investigate the flagged process.",
      investigationData: [
        {
          id: "process-details",
          label: "Process Details",
          content:
            'Process: svch0st.exe (note: zero instead of letter "o") | PID: 7241 | Parent: powershell.exe (PID 3390) | User: jsmith | Started: 2026-03-22 23:41:00 UTC',
          isCritical: true,
        },
        {
          id: "file-path",
          label: "File Path Verification",
          content:
            "Path: C:\\Users\\jsmith\\AppData\\Local\\Temp\\svch0st.exe — Legitimate svchost.exe runs from C:\\Windows\\System32\\, never from a user's Temp folder.",
          isCritical: true,
        },
        {
          id: "digital-sig",
          label: "Digital Signature",
          content:
            "Signature: UNSIGNED — No digital signature present. Legitimate Windows system binaries are always signed by Microsoft.",
        },
        {
          id: "network-conn",
          label: "Network Connections",
          content:
            "Outbound: 185.220.101.34:443 every 60 seconds (periodic beaconing pattern). IP matches ThreatFeed IOC for known Cobalt Strike C2 infrastructure.",
        },
      ],
      actions: [
        {
          id: "MALICIOUS_ISOLATE",
          label: "Malicious — isolate endpoint and preserve evidence",
          color: "red",
        },
        {
          id: "BENIGN_ADMIN",
          label: "Benign — legitimate admin tool",
          color: "green",
        },
        {
          id: "SUSPICIOUS_MONITOR",
          label: "Suspicious — monitor for 24h",
          color: "orange",
        },
        {
          id: "BLOCK_IP",
          label: "Block the IP and continue",
          color: "yellow",
        },
      ],
      correctActionId: "MALICIOUS_ISOLATE",
      rationales: [
        {
          id: "rat-confirmed-malicious",
          text: "The misspelled process name, wrong file path, missing digital signature, and C2 beacon to a known Cobalt Strike IP collectively confirm active malware. Immediate isolation prevents lateral movement while preserving forensic evidence.",
        },
        {
          id: "rat-block-ip",
          text: "Blocking the C2 IP alone won't stop the malware — it likely has fallback communication channels and the endpoint remains compromised.",
        },
        {
          id: "rat-monitor-time",
          text: "Monitoring for 24 hours gives the attacker more time to exfiltrate data, move laterally, or establish persistence.",
        },
        {
          id: "rat-typo-normal",
          text: "Typos happen in legitimate software filenames — this alone isn't conclusive evidence of malware.",
        },
      ],
      correctRationaleId: "rat-confirmed-malicious",
      feedback: {
        perfect:
          "Excellent response. Every indicator is a red flag: the zero-for-O substitution in the process name, execution from a Temp folder, no signature, PowerShell as parent, and beaconing to known C2 infrastructure. Immediate isolation is critical.",
        partial:
          "You identified something was wrong but chose an insufficient response. Blocking an IP or monitoring delays containment. When multiple indicators confirm malware, isolate immediately.",
        wrong:
          "This process exhibits every hallmark of malware: name masquerading, wrong path, no signature, and C2 beaconing. Treating it as benign would leave an active compromise uncontained.",
      },
    },
    {
      type: "investigate-decide",
      id: "proc-003",
      title: "Developer's Authorized Tunneling Tool",
      objective:
        "Security alert triggered on a developer workstation. The user claims it's for testing.",
      investigationData: [
        {
          id: "process-details",
          label: "Process Details",
          content:
            "Process: ngrok.exe | PID: 5523 | Parent: cmd.exe (PID 4401) | User: agarcia | Started: 2026-03-23 08:15:00 UTC",
        },
        {
          id: "file-path",
          label: "File Path",
          content:
            "Path: C:\\Users\\agarcia\\tools\\ngrok.exe — Located in user's personal tools directory, not a system path.",
        },
        {
          id: "user-context",
          label: "User Context & Policy Check",
          content:
            'User agarcia is a member of the "Developers" Active Directory security group. Ngrok appears on the company\'s approved software list for developer workstations with manager approval.',
        },
        {
          id: "network-activity",
          label: "Network Activity",
          content:
            "Outbound tunnel established to tunnel.us.ngrok.com:443 — active for 45 minutes. Traffic pattern consistent with HTTP tunneling for local development testing.",
        },
      ],
      actions: [
        {
          id: "VERIFY_DOCUMENT",
          label: "Verify with developer and document",
          color: "green",
        },
        {
          id: "ISOLATE_NOW",
          label: "Isolate immediately",
          color: "red",
        },
        {
          id: "BLOCK_NGROK",
          label: "Block ngrok at the firewall",
          color: "orange",
        },
        {
          id: "CLOSE_APPROVED",
          label: "Close the alert — it's approved",
          color: "blue",
        },
      ],
      correctActionId: "VERIFY_DOCUMENT",
      rationales: [
        {
          id: "rat-verify-approved",
          text: "An approved tool used by an authorized developer group warrants verification and documentation rather than punitive action. Confirm the specific use case and ensure manager approval is on file.",
        },
        {
          id: "rat-tunnel-block",
          text: "Tunneling tools bypass perimeter security controls and should always be blocked regardless of approval status.",
        },
        {
          id: "rat-approved-close",
          text: "The approved software list means no further investigation is needed — just close the alert.",
        },
        {
          id: "rat-isolate-dev",
          text: "Isolating a developer workstation during active work disrupts the sprint and damages the security team's relationship with engineering.",
        },
      ],
      correctRationaleId: "rat-verify-approved",
      feedback: {
        perfect:
          "Well handled. The tool is on the approved list and the user is in the right group, but verification ensures proper authorization is documented. This builds trust with developers while maintaining security oversight.",
        partial:
          "Your response was either too aggressive or too permissive. Blocking an approved tool without discussion creates friction; closing without verification misses a documentation opportunity.",
        wrong:
          "Isolating a developer using an approved tool or blindly closing without verification are both problematic. Security should verify and document, not punish or ignore.",
      },
    },
  ],

  hints: [
    "Always verify the exact file path — legitimate system processes run from specific directories.",
    "Check the digital signature — unsigned binaries in system directories are red flags.",
    "Parent process matters: svchost.exe spawning a process is normal; powershell.exe spawning system process names is suspicious.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Process investigation is a core EDR analyst skill. Senior analysts can triage a suspicious process in under 2 minutes by checking path, signature, parent, and network — the same workflow practiced here.",
  toolRelevance: [
    "CrowdStrike Falcon",
    "Microsoft Defender for Endpoint",
    "Process Monitor (Sysinternals)",
    "VirusTotal",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
