import type { LabManifest } from "../../types/manifest";

export const logHunterLateralMovementLab: LabManifest = {
  schemaVersion: "1.1",
  id: "log-hunter-lateral-movement",
  version: 1,
  title: "Log Hunter: Lateral Movement",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: ["lateral-movement", "wmi", "kerberoasting", "log-analysis", "threat-hunting", "mitre-att&ck"],

  description:
    "Hunt through security event logs to identify lateral movement techniques. Determine the attack tactic used and justify your analysis.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify lateral movement indicators in Windows Security Event Logs",
    "Recognize WMI remote execution and Kerberoasting attack patterns",
    "Correlate process creation events with network connections to detect pivots",
  ],
  sortOrder: 130,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "lh-001",
      title: "WMI-Spawned PowerShell on App Server",
      objective:
        "An alert triggered for 'Unusual Process Creation' on production app server APPSRV-04. Investigate the security logs to find the bridgehead.",
      investigationData: [
        {
          id: "log-1",
          label: "Event 4624 — Logon Success",
          content: "14:02:11 | SYSTEM | Logon Type: Local | Source: APPSRV-04",
        },
        {
          id: "log-2",
          label: "Event 4688 — Process Start (ADMIN_SVC)",
          content: "14:05:30 | ADMIN_SVC | wmiprvse.exe → cmd.exe /c \"powershell -enc ...\" | Parent: svchost.exe",
          isCritical: true,
        },
        {
          id: "log-3",
          label: "Network Connection — SMB Outbound",
          content: "14:06:00 | ADMIN_SVC | Dest: 10.0.5.20:445 (SMB) | Direction: Outbound",
          isCritical: true,
        },
      ],
      actions: [
        { id: "WMI_REMOTE", label: "WMI Remote Execution", color: "red" },
        { id: "BRUTE_FORCE", label: "SSH Brute Force", color: "orange" },
        { id: "SQL_INJECT", label: "SQL Injection", color: "yellow" },
      ],
      correctActionId: "WMI_REMOTE",
      rationales: [
        { id: "R1-A", text: "WMI spawning a command shell indicates remote execution without interactive logon — classic lateral movement." },
        { id: "R1-B", text: "The SMB connection to port 445 confirms the initial server compromise." },
        { id: "R1-C", text: "The SYSTEM logon is the unauthorized entry point for the attacker." },
      ],
      correctRationaleId: "R1-A",
      feedback: {
        perfect: "Perfect analysis. WMI → cmd → PowerShell is a textbook lateral movement chain. The encoded PowerShell and subsequent SMB pivot confirm the technique.",
        partial: "You found the malicious log, but your tactic classification or rationale was flawed. Focus on the parent-child process chain.",
        wrong: "Incorrect. The wmiprvse.exe → cmd.exe → powershell chain is WMI Remote Execution, not brute force or SQL injection.",
      },
    },
    {
      type: "investigate-decide",
      id: "lh-002",
      title: "Kerberoasting on Domain Controller",
      objective:
        "Monitoring indicates a high volume of Kerberos service ticket requests from a Marketing department workstation targeting service accounts.",
      investigationData: [
        {
          id: "log-1",
          label: "Event 4769 — TGS Request (Normal)",
          content: "09:12:05 | JSmith | Service: krbtgt | Encryption: AES256 | Status: Success",
        },
        {
          id: "log-2",
          label: "Event 4769 — TGS Request (Suspicious)",
          content: "09:15:44 | JSmith | Service: MSSQLSvc/FIN-DB | Encryption: RC4_HMAC | Status: Success",
          isCritical: true,
        },
        {
          id: "log-3",
          label: "Event 4625 — Logon Failure",
          content: "09:16:01 | Admin | Reason: Bad Password | Source: DC-01",
        },
      ],
      actions: [
        { id: "KERBEROASTING", label: "Kerberoasting Attack", color: "red" },
        { id: "PASS_HASH", label: "Pass-the-Hash", color: "orange" },
        { id: "GOLDEN_TICKET", label: "Golden Ticket", color: "yellow" },
      ],
      correctActionId: "KERBEROASTING",
      rationales: [
        { id: "R2-A", text: "The logon failure for Admin proves a brute force attack is in progress." },
        { id: "R2-B", text: "Downgrading from AES256 to RC4 allows for easier offline password cracking of the service account." },
        { id: "R2-C", text: "Marketing users should never access the Domain Controller directly." },
      ],
      correctRationaleId: "R2-B",
      feedback: {
        perfect: "Excellent. The encryption downgrade from AES256 to RC4_HMAC on a service ticket is the hallmark of Kerberoasting — requesting weak tickets for offline cracking.",
        partial: "You identified the attack type but missed the key indicator: the encryption downgrade from AES256 to RC4 is what makes this Kerberoasting.",
        wrong: "Incorrect. The logon failure is a red herring. The critical signal is the RC4 encryption downgrade on the service ticket request.",
      },
    },
    {
      type: "investigate-decide",
      id: "lh-003",
      title: "PsExec File Copy to File Server",
      objective:
        "The SIEM flagged suspicious file operations on the company file server. A service account is writing executables to the ADMIN$ share.",
      investigationData: [
        {
          id: "log-1",
          label: "Event 5145 — Network Share Access",
          content: "11:20:03 | SVC_DEPLOY | Share: \\\\FILE-SRV-01\\ADMIN$ | Access: WRITE | Source: 10.0.3.15",
          isCritical: true,
        },
        {
          id: "log-2",
          label: "Event 4688 — Process Creation on FILE-SRV-01",
          content: "11:20:05 | SYSTEM | PSEXESVC.exe started | Parent: services.exe | CommandLine: cmd /c whoami",
          isCritical: true,
        },
        {
          id: "log-3",
          label: "Event 4624 — Logon on FILE-SRV-01",
          content: "11:20:02 | SVC_DEPLOY | Logon Type 3 (Network) | Source: 10.0.3.15 | Auth: NTLM",
        },
      ],
      actions: [
        { id: "PSEXEC", label: "PsExec / Remote Service", color: "red" },
        { id: "RANSOMWARE", label: "Ransomware Deployment", color: "orange" },
        { id: "ADMIN_TASK", label: "Legitimate Admin Task", color: "blue" },
      ],
      correctActionId: "PSEXEC",
      rationales: [
        { id: "R3-A", text: "PSEXESVC.exe in ADMIN$ share with NTLM logon is the signature of PsExec remote execution for lateral movement." },
        { id: "R3-B", text: "The SYSTEM account writing files indicates ransomware dropping payloads." },
        { id: "R3-C", text: "SVC_DEPLOY is a deployment account, so this is an authorized software push." },
      ],
      correctRationaleId: "R3-A",
      feedback: {
        perfect: "Correct. Writing PSEXESVC.exe to ADMIN$ via NTLM network logon is textbook PsExec lateral movement. The 'whoami' command confirms reconnaissance.",
        partial: "Partially correct. While PSEXESVC.exe is suspicious, the NTLM logon type and ADMIN$ share write are the key indicators of PsExec remote execution.",
        wrong: "Incorrect. PSEXESVC.exe in the ADMIN$ share is the calling card of PsExec. Even if SVC_DEPLOY is a legitimate account, the pattern shows compromise.",
      },
    },
  ],

  hints: [
    "Check the process tree for parent-child anomalies. WMI and PsExec leave distinct traces.",
    "Encryption downgrade (AES256 → RC4) on Kerberos tickets is a critical Kerberoasting indicator.",
    "Look for writes to ADMIN$ share combined with PSEXESVC.exe — this is PsExec's signature.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Lateral movement is often silent. In a SOC, correlating a process creation event (like WMI or PsExec) with a subsequent network connection is critical. Analysts who can spot these pivots early prevent ransomware deployment. Focus on parent-child process relationships — they never lie.",
  toolRelevance: [
    "CrowdStrike Falcon (EDR process tree)",
    "Microsoft Defender for Identity (lateral movement alerts)",
    "Velociraptor (endpoint forensics)",
    "MITRE ATT&CK — Lateral Movement (TA0008)",
  ],

  createdAt: "2026-03-22",
  updatedAt: "2026-03-22",
};
