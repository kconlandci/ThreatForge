import type { LabManifest } from "../../types/manifest";

export const forensicImageAnalysisLab: LabManifest = {
  schemaVersion: "1.1",
  id: "forensic-image-analysis",
  version: 1,
  title: "Forensic Image Analysis",

  tier: "advanced",
  track: "detection-hunting",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "forensics",
    "disk-image",
    "registry-analysis",
    "timeline-analysis",
    "evidence-preservation",
    "incident-response",
  ],

  description:
    "Analyze forensic disk images to identify evidence of compromise — examine file system artifacts, registry keys, event logs, and timeline data to determine breach scope and preserve the evidence chain.",
  estimatedMinutes: 20,
  learningObjectives: [
    "Interpret Windows forensic artifacts including Prefetch, ShimCache, and Amcache",
    "Correlate registry persistence mechanisms with known attacker techniques",
    "Distinguish legitimate software activity from malicious indicators in forensic timelines",
    "Apply proper evidence chain-of-custody procedures during active investigations",
    "Identify anti-forensic techniques such as timestomping and log clearing",
  ],
  sortOrder: 432,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "fia-001",
      title: "Compromised Workstation with Attacker Tooling",
      objective:
        "A workstation belonging to a finance director was flagged by EDR for anomalous process execution. The machine has been imaged. Analyze the forensic artifacts to determine the nature and extent of compromise.",
      investigationData: [
        {
          id: "prefetch-analysis",
          label: "Prefetch File Analysis",
          content:
            "Prefetch entries found:\n• PSEXEC.EXE-AD70946C.pf — Last run: 2026-03-25 03:42:11 UTC, Run count: 3\n• MIMIKATZ.EXE-31B2FA12.pf — Last run: 2026-03-25 03:44:58 UTC, Run count: 1\n• RCLONE.EXE-7F2C4A01.pf — Last run: 2026-03-25 04:12:33 UTC, Run count: 1\nAll three executables are absent from their original paths — files were deleted after execution.",
          isCritical: true,
        },
        {
          id: "shimcache-entries",
          label: "ShimCache / AppCompatCache",
          content:
            "ShimCache records confirm execution of:\n• C:\\Users\\dthompson\\AppData\\Local\\Temp\\psexec.exe (Size: 834KB, Modified: 2026-03-25 03:40:00)\n• C:\\Users\\dthompson\\Downloads\\m.exe (Size: 1.2MB, Modified: 2026-03-25 03:44:00)\n• C:\\ProgramData\\rclone\\rclone.exe (Size: 48MB, Modified: 2026-03-25 04:10:00)\nAppCompatCache insertion order aligns with Prefetch timestamps, confirming execution sequence.",
          isCritical: true,
        },
        {
          id: "event-logs",
          label: "Windows Event Logs",
          content:
            "Security Event Log (Event ID 4624): Logon Type 10 (RemoteInteractive) from 10.0.5.88 at 03:38:22 UTC on 2026-03-25 — account dthompson.\nEvent ID 4672: Special privileges assigned to dthompson at 03:38:23 UTC.\nEvent ID 1102: Security audit log was cleared at 04:15:01 UTC — attempted evidence destruction.\nSystem Event Log shows no anomalies prior to 03:38 UTC.",
          isCritical: true,
        },
        {
          id: "filesystem-timeline",
          label: "Filesystem MFT Timeline",
          content:
            "MFT timeline reconstruction (03:38–04:20 UTC):\n03:38 — RDP session initiated, NTUser.dat modified\n03:40 — psexec.exe created in Temp directory\n03:42 — psexec.exe executed (Prefetch created)\n03:44 — m.exe (mimikatz) created in Downloads\n03:45 — lsass.dmp created in C:\\Windows\\Temp (2.1GB)\n04:10 — rclone.exe installed to ProgramData\n04:12 — rclone.conf created (contains cloud storage endpoint config)\n04:14 — Multiple .7z archives created in C:\\Users\\dthompson\\Documents\\archive\\\n04:15 — Security log cleared, psexec.exe and m.exe deleted from disk\n04:16 — RDP session terminated",
        },
        {
          id: "network-artifacts",
          label: "Network Connection Artifacts",
          content:
            "SRUM database shows rclone.exe transferred 4.7GB outbound between 04:12–04:15 UTC.\nDNS cache contains resolution for storage.googleapis.com — consistent with rclone cloud exfiltration.\nSource IP 10.0.5.88 maps to a VPN concentrator, suggesting the attacker used valid VPN credentials.",
        },
      ],
      actions: [
        {
          id: "CONFIRM_BREACH",
          label: "Confirmed breach — preserve evidence chain and escalate to IR",
          color: "red",
        },
        {
          id: "SUSPICIOUS_MONITOR",
          label: "Suspicious — continue monitoring the workstation",
          color: "orange",
        },
        {
          id: "BENIGN_ADMIN",
          label: "Benign — IT admin performing remote maintenance",
          color: "green",
        },
        {
          id: "REIMAGE_CLOSE",
          label: "Reimage workstation and close the case",
          color: "yellow",
        },
      ],
      correctActionId: "CONFIRM_BREACH",
      rationales: [
        {
          id: "rat-confirmed-breach",
          text: "The forensic timeline conclusively demonstrates a coordinated attack: RDP access via VPN, credential harvesting with Mimikatz, lateral movement tooling (PsExec), data exfiltration via rclone to cloud storage, and anti-forensic log clearing. This requires full IR activation with evidence preservation for potential legal proceedings.",
        },
        {
          id: "rat-reimage",
          text: "Reimaging destroys volatile evidence and forensic artifacts needed to determine the full scope of compromise, identify other affected systems, and support potential legal action.",
        },
        {
          id: "rat-monitor",
          text: "The attacker has already completed their objective — credentials were harvested and 4.7GB was exfiltrated. Continued monitoring of this single workstation misses the broader compromise.",
        },
        {
          id: "rat-admin",
          text: "Legitimate IT administrators do not use Mimikatz, do not dump LSASS memory, do not exfiltrate data to personal cloud storage, and do not clear security logs afterward.",
        },
      ],
      correctRationaleId: "rat-confirmed-breach",
      feedback: {
        perfect:
          "Outstanding forensic analysis. You correctly correlated Prefetch, ShimCache, MFT timeline, event logs, and network artifacts to reconstruct a complete attack chain: initial access via VPN/RDP, credential theft with Mimikatz, staging with PsExec, exfiltration via rclone, and anti-forensic log clearing. Preserving the evidence chain is critical for both incident scope analysis and potential legal proceedings.",
        partial:
          "You identified something was wrong, but your response is insufficient. This is a confirmed multi-stage breach with completed exfiltration. Monitoring a fully compromised workstation or reimaging without evidence preservation fails the investigation.",
        wrong:
          "Every artifact in this image screams compromise — Mimikatz execution, LSASS memory dumping, 4.7GB cloud exfiltration, and deliberate log clearing are not legitimate administration activities. Dismissing this as benign would leave an active breach uncontained.",
      },
    },
    {
      type: "investigate-decide",
      id: "fia-002",
      title: "Suspicious Registry Run Keys — False Positive Investigation",
      objective:
        "A threat hunt identified unusual registry Run key entries on a developer workstation. The image has been acquired. Determine whether these entries indicate malicious persistence or legitimate software behavior.",
      investigationData: [
        {
          id: "registry-runkeys",
          label: "Registry Run Key Entries",
          content:
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run:\n• \"JetBrainsToolbox\" = \"C:\\Users\\mrivera\\AppData\\Local\\JetBrains\\Toolbox\\bin\\jetbrains-toolbox.exe\" --minimized\n• \"Slack\" = \"C:\\Users\\mrivera\\AppData\\Local\\slack\\slack.exe\" --startup\n• \"AutoHotkey\" = \"C:\\Users\\mrivera\\scripts\\workspace-setup.ahk\"\n\nHKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run:\n• \"SecurityHealth\" = \"%ProgramFiles%\\Windows Defender\\MSASCuiL.exe\"\n• \"iTunesHelper\" = \"C:\\Program Files\\iTunes\\iTunesHelper.exe\"",
        },
        {
          id: "file-verification",
          label: "Binary Verification",
          content:
            "All executables verified against known-good hashes:\n• jetbrains-toolbox.exe — SHA256 matches JetBrains signed release v2.2.1\n• slack.exe — SHA256 matches Slack Technologies signed release v4.38.125\n• workspace-setup.ahk — AutoHotkey script, reviewed content: keyboard shortcuts and window layout macros only\n• MSASCuiL.exe — Microsoft-signed Windows Defender system tray utility\n• iTunesHelper.exe — Apple-signed iTunes helper service\nAll digital signatures valid and chains trusted.",
        },
        {
          id: "autoruns-analysis",
          label: "Autoruns Comparison",
          content:
            "Autoruns baseline comparison with corporate gold image:\n• SecurityHealth and iTunesHelper are present on 89% of corporate workstations\n• JetBrains Toolbox is present on 94% of developer workstations\n• Slack startup is present on 78% of all workstations\n• AutoHotkey script is unique to this user but was committed to the user's personal dotfiles repo 8 months ago\nNo entries found that deviate from expected developer workstation profile.",
        },
        {
          id: "timeline-context",
          label: "Registry Modification Timeline",
          content:
            "Registry key last-write timestamps:\n• JetBrainsToolbox — 2026-01-15 (correlates with Toolbox update v2.2.1 release)\n• Slack — 2026-02-28 (correlates with Slack auto-update)\n• AutoHotkey — 2025-07-10 (matches git commit date in user's dotfiles)\n• SecurityHealth — 2025-12-01 (Windows update KB5048239)\n• iTunesHelper — 2025-11-22 (iTunes installation date)\nNo recent modifications; all timestamps align with legitimate software lifecycle events.",
        },
      ],
      actions: [
        {
          id: "FALSE_POSITIVE",
          label: "False positive — document findings and close",
          color: "green",
        },
        {
          id: "REMOVE_AUTOHOTKEY",
          label: "Remove the AutoHotkey entry as unauthorized software",
          color: "orange",
        },
        {
          id: "ISOLATE_INVESTIGATE",
          label: "Isolate workstation for deeper forensic analysis",
          color: "red",
        },
        {
          id: "ESCALATE_MANAGER",
          label: "Escalate to user's manager for policy review",
          color: "yellow",
        },
      ],
      correctActionId: "FALSE_POSITIVE",
      rationales: [
        {
          id: "rat-false-positive",
          text: "Every Run key entry has been verified: signed binaries match known-good hashes, timestamps correlate with legitimate software installations, and baseline comparison shows these are standard for developer workstations. The AutoHotkey script content was reviewed and is benign. This is a confirmed false positive from the threat hunt.",
        },
        {
          id: "rat-ahk-suspicious",
          text: "AutoHotkey is a legitimate automation tool commonly used by developers. The script was version-controlled for 8 months and contains only keyboard macros — removing it without cause damages trust with engineering.",
        },
        {
          id: "rat-over-isolate",
          text: "Isolating a workstation with no indicators of compromise wastes analyst time, disrupts the developer's work, and contributes to security fatigue across the organization.",
        },
        {
          id: "rat-escalate-unnecessary",
          text: "Escalating verified legitimate software to management creates unnecessary friction between security and engineering teams without improving security posture.",
        },
      ],
      correctRationaleId: "rat-false-positive",
      feedback: {
        perfect:
          "Excellent forensic discipline. You verified every binary hash, validated digital signatures, cross-referenced with the corporate baseline, confirmed timestamps align with software lifecycle events, and even reviewed the AutoHotkey script contents. Closing a clean threat hunt finding quickly is just as important as escalating a real one.",
        partial:
          "Your caution is understandable, but the evidence clearly shows legitimate software. Removing tools or escalating without indicators of compromise erodes trust between security and engineering — a critical relationship for mature organizations.",
        wrong:
          "Isolating a workstation with zero indicators of compromise is reactive and wasteful. Forensic analysis requires judgment — when every artifact checks out, the professional response is to document and close, not escalate out of uncertainty.",
      },
    },
    {
      type: "investigate-decide",
      id: "fia-003",
      title: "Recovered Deleted Files — Staged Data Exfiltration",
      objective:
        "During a routine investigation of a departing employee's workstation, file carving recovered deleted files from unallocated disk space. Analyze the recovered artifacts to determine whether data exfiltration occurred.",
      investigationData: [
        {
          id: "carved-files",
          label: "Recovered Deleted Files",
          content:
            "File carving from unallocated space recovered:\n• client-master-list-Q1-2026.xlsx (247KB) — deleted 2026-03-20\n• product-roadmap-confidential.pdf (1.8MB) — deleted 2026-03-20\n• compensation-bands-2026.xlsx (89KB) — deleted 2026-03-20\n• source-code-export.tar.gz (156MB) — deleted 2026-03-21\n• personal-notes.docx (34KB) — deleted 2026-03-21\nAll business files are classified as \"Internal — Confidential\" per DLP policy.",
          isCritical: true,
        },
        {
          id: "usb-artifacts",
          label: "USB Device History",
          content:
            "USBSTOR registry analysis:\n• Device: SanDisk Ultra USB 3.0 (256GB), Serial: 4C530001220831105531\n• First connected: 2026-03-20 17:32:00 UTC\n• Last connected: 2026-03-21 12:15:00 UTC\n• SetupAPI log confirms driver installation on 2026-03-20\n• No prior USB device history for external storage on this workstation — corporate policy requires BitLocker-encrypted drives only.\nDevice serial does not match any IT-provisioned drives in the asset inventory.",
          isCritical: true,
        },
        {
          id: "recent-docs",
          label: "Recent Documents & LNK Files",
          content:
            "LNK file analysis from Recent folder:\n• client-master-list-Q1-2026.xlsx — Target: E:\\ (USB volume)\n• product-roadmap-confidential.pdf — Target: E:\\ (USB volume)\n• compensation-bands-2026.xlsx — Target: E:\\ (USB volume)\n• source-code-export.tar.gz — Target: E:\\ (USB volume)\nLNK timestamps show files were accessed/copied between 17:35–18:10 UTC on 2026-03-20 and 12:20–12:45 UTC on 2026-03-21.\nShellBag entries confirm browsing of E:\\ volume across both sessions.",
          isCritical: true,
        },
        {
          id: "employee-context",
          label: "Employee Context",
          content:
            "Employee: Sarah Nguyen, Senior Product Manager\n• Resignation submitted: 2026-03-18 (two-week notice)\n• Last day: 2026-04-01\n• New employer: Direct competitor (confirmed via LinkedIn)\n• DLP alerts: 2 prior alerts for emailing spreadsheets to personal Gmail (2026-02-15, 2026-03-10) — both resolved as accidental by manager\n• Access level: Read access to client lists, roadmaps, and source code repositories",
        },
        {
          id: "browser-artifacts",
          label: "Browser History & Cloud Access",
          content:
            "Chrome browser history (2026-03-19 through 2026-03-21):\n• Multiple visits to personal Google Drive (drive.google.com)\n• Uploaded 4 files to Google Drive on 2026-03-21 between 13:00–13:15 UTC\n• Chrome download history shows source-code-export.tar.gz downloaded from internal GitLab on 2026-03-20 at 17:30 UTC\n• Browsing history cleared on 2026-03-21 at 14:00 UTC",
        },
      ],
      actions: [
        {
          id: "CONFIRM_EXFIL",
          label: "Confirmed exfiltration — escalate to Legal and HR immediately",
          color: "red",
        },
        {
          id: "INTERVIEW_FIRST",
          label: "Interview the employee before making a determination",
          color: "yellow",
        },
        {
          id: "INSUFFICIENT_EVIDENCE",
          label: "Insufficient evidence — document and close",
          color: "green",
        },
        {
          id: "BLOCK_ACCESS",
          label: "Block access and investigate further before escalating",
          color: "orange",
        },
      ],
      correctActionId: "CONFIRM_EXFIL",
      rationales: [
        {
          id: "rat-confirmed-exfil",
          text: "The forensic evidence establishes a clear pattern of deliberate data exfiltration: a departing employee heading to a competitor copied classified files to an unauthorized USB device and personal cloud storage, then deleted the local copies and cleared browser history to cover their tracks. This requires immediate Legal and HR involvement for potential trade secret theft proceedings.",
        },
        {
          id: "rat-interview",
          text: "Interviewing the employee before securing the evidence and involving Legal risks tipping them off, allowing further destruction of evidence or acceleration of data transfer to the competitor.",
        },
        {
          id: "rat-insufficient",
          text: "The evidence is comprehensive — USB artifacts, LNK files, browser history, DLP alerts, and file carving all corroborate systematic exfiltration. Dismissing this ignores clear forensic indicators.",
        },
        {
          id: "rat-block-only",
          text: "Blocking access without escalating to Legal delays the legal hold that is necessary to preserve evidence across all systems and potentially pursue recovery of stolen data.",
        },
      ],
      correctRationaleId: "rat-confirmed-exfil",
      feedback: {
        perfect:
          "Thorough forensic reasoning. You connected the dots across multiple artifact classes — file carving, USB device history, LNK files, browser history, and employee context — to build an airtight exfiltration case. Immediate Legal and HR escalation is essential to initiate legal hold, preserve evidence across systems, and potentially pursue trade secret theft remedies before the employee's departure.",
        partial:
          "You recognized something was wrong, but your response delays critical legal processes. Every hour without a legal hold risks further evidence destruction. When forensic evidence is this comprehensive, escalate immediately — the interview can happen after evidence is secured.",
        wrong:
          "The forensic evidence is overwhelming: classified files copied to unauthorized USB, uploaded to personal cloud, local copies deleted, browser history cleared, all by a departing employee heading to a competitor with prior DLP alerts. Dismissing this as insufficient evidence would be a serious investigative failure.",
      },
    },
  ],

  hints: [
    "Cross-correlate multiple artifact sources — Prefetch, ShimCache, and MFT timestamps should tell a consistent story for legitimate activity and a suspicious one for attacks.",
    "Always verify binary hashes and digital signatures before concluding a registry entry is malicious — many legitimate applications use Run keys for startup.",
    "In insider threat cases, look for the complete pattern: access to sensitive data, use of unauthorized transfer mechanisms, deletion of evidence, and contextual factors like resignation timing.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Forensic image analysis is a cornerstone skill for DFIR professionals. The ability to reconstruct attack timelines from disk artifacts directly determines case outcomes — whether for incident scoping, legal proceedings, or insider threat investigations. Senior examiners routinely testify in court based on exactly these types of analyses.",
  toolRelevance: [
    "Autopsy / Sleuth Kit",
    "FTK Imager / EnCase",
    "Eric Zimmerman's Tools (PECmd, ShimCacheParser, MFTECmd)",
    "Volatility (memory forensics)",
    "KAPE (artifact collection)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
