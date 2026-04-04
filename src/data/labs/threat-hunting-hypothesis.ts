import type { LabManifest } from "../../types/manifest";

export const threatHuntingHypothesisLab: LabManifest = {
  schemaVersion: "1.1",
  id: "threat-hunting-hypothesis",
  version: 1,
  title: "Threat Hunting Hypothesis Development",

  tier: "advanced",
  track: "blue-team-foundations",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: ["threat-hunting", "hypothesis", "mitre-attack", "proactive-defense", "detection", "analytics"],

  description:
    "Develop and prioritize threat hunting hypotheses based on threat intelligence, environment context, and MITRE ATT&CK coverage gaps — moving beyond alert-driven detection to proactive adversary search.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Construct threat hunting hypotheses from threat intelligence and ATT&CK techniques",
    "Prioritize hunting efforts based on environment risk and detection coverage gaps",
    "Identify the data sources and analytics needed to validate or refute each hypothesis",
  ],
  sortOrder: 440,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "hunt-001",
      title: "Dormant Credential Hypothesis",
      description:
        "Your organization was identified in a threat intelligence report as a likely target for a financially motivated threat actor group known for living-off-the-land techniques. Develop a hunting hypothesis.",
      evidence: [
        {
          type: "Threat Intelligence",
          content:
            "TA-FINSERV is a financially motivated group targeting mid-size financial services firms. TTPs: Initial access via spearphishing (T1566.001), establish persistence using scheduled tasks (T1053.005), credential dumping via LSASS (T1003.001), lateral movement using pass-the-hash (T1550.002). Average dwell time before detection: 47 days.",
        },
        {
          type: "Environment Context",
          content:
            "Your environment: 2,400 Windows endpoints, Active Directory domain, 85% EDR coverage (15% gap — legacy manufacturing floor systems), centralized SIEM with 90-day retention. Current detection rules: phishing email blocking, known malware signatures, brute force detection.",
        },
        {
          type: "Detection Coverage Assessment",
          content:
            "MITRE ATT&CK coverage gaps identified: T1053.005 (Scheduled Task persistence) — no detection rule. T1550.002 (Pass-the-Hash) — no detection rule. T1003.001 (LSASS dump) — EDR covers 85% of endpoints. Lateral movement via WMI/PsExec — partial coverage only.",
        },
        {
          type: "Recent Anomaly",
          content:
            "SIEM shows 3 service accounts with no login activity for 6+ months suddenly authenticated last week. Logins occurred at 02:15 AM from workstations in the manufacturing floor (EDR gap area). No change tickets exist for these authentications.",
        },
      ],
      classifications: [
        {
          id: "active-compromise-hunt",
          label: "High-Priority Hunt — Evidence of Active Intrusion",
          description: "Dormant account reactivation from EDR-gap area during off-hours suggests active threat actor presence",
        },
        {
          id: "hypothesis-driven-hunt",
          label: "Proactive Hunt — Develop Hypothesis Before Declaring Compromise",
          description: "Build a structured hypothesis to guide investigation before escalating to incident response",
        },
        {
          id: "rule-gap-only",
          label: "Detection Gap — Create Rules and Monitor",
          description: "The coverage gaps are the primary problem; create rules and wait for alerts",
        },
        {
          id: "false-positive",
          label: "Likely False Positive — Service Account Maintenance",
          description: "Service account logins are probably scheduled maintenance tasks",
        },
      ],
      correctClassificationId: "active-compromise-hunt",
      remediations: [
        {
          id: "hunt-and-contain",
          label: "Initiate active threat hunt scoped to manufacturing floor, dormant accounts, and scheduled task persistence — treat as potential breach",
          description: "Immediately investigate the 3 service accounts (what commands ran, what was accessed), hunt for scheduled task persistence on manufacturing systems, escalate to IR if lateral movement evidence found",
        },
        {
          id: "create-hypotheses-only",
          label: "Document hunting hypotheses and schedule hunts for next quarter",
          description: "Formalize the ATT&CK-based hypotheses and plan hunts systematically",
        },
        {
          id: "add-detection-rules",
          label: "Build detection rules for the coverage gaps first, then hunt",
          description: "Close the T1053.005 and T1550.002 gaps before hunting",
        },
        {
          id: "disable-service-accounts",
          label: "Disable the three dormant service accounts and monitor for further anomalies",
          description: "Remove the access vector and see if other activity surfaces",
        },
      ],
      correctRemediationId: "hunt-and-contain",
      rationales: [
        {
          id: "rat-active-hunt",
          text: "The dormant service account reactivation at 02:15 AM from the EDR-gap manufacturing floor, combined with TA-FINSERV's known 47-day dwell time and pass-the-hash TTPs, is not a hypothesis anymore — it's an active investigation trigger. The correct response: immediately investigate what the service accounts did (commands executed, files accessed, network connections), hunt for scheduled task persistence on manufacturing floor systems (the EDR gap is exactly where a sophisticated actor would establish persistence), look for LSASS dumps or credential harvesting artifacts, and escalate to IR if lateral movement evidence exists. Hypothesis development is valuable for proactive hunting, but when anomalies already match a known threat actor's TTPs, you're in incident response, not threat hunting.",
        },
        {
          id: "rat-disable-accounts",
          text: "Disabling accounts may alert the attacker that they've been detected, causing them to accelerate their mission. Investigate first to understand the full scope before taking containment actions that could trigger destructive payloads.",
        },
      ],
      correctRationaleId: "rat-active-hunt",
      feedback: {
        perfect: "Correct escalation. Dormant account reactivation from an EDR gap at 2 AM during a TA-FINSERV targeting period is an active investigation — the hypothesis was already confirmed by the environment. Hunt and contain immediately.",
        partial: "Developing hypotheses is good practice, but when the anomalies already match the threat actor's TTPs, you escalate to active investigation rather than scheduled hunting.",
        wrong: "Dormant service accounts activating at 2 AM from EDR-gap systems that match a known threat actor's dwell time and lateral movement TTPs is not a false positive. This is an active threat hunting case that needs immediate investigation.",
      },
    },
    {
      type: "triage-remediate",
      id: "hunt-002",
      title: "Living-Off-the-Land Hunt Hypothesis",
      description:
        "With no active anomaly trigger, develop a proactive threat hunting hypothesis for LOLBAS (Living Off the Land Binaries and Scripts) abuse in your environment.",
      evidence: [
        {
          type: "Hunt Trigger",
          content:
            "Threat intelligence indicates nation-state actors are increasingly targeting your industry sector using LOLBins to evade signature-based detection. No current alerts or anomalies. This is a proactive hunt.",
        },
        {
          type: "Available Data Sources",
          content:
            "Available telemetry: Windows Event Logs (process creation 4688, PowerShell 4104), EDR process telemetry, DNS logs, proxy logs, network flow data. SIEM retention: 90 days. EDR retention: 30 days.",
        },
        {
          type: "Environment Baseline",
          content:
            "Environment: Finance company, 500 employees, 80% office workers (Excel, email, Teams). Expected LOLBin usage: certutil for certificate operations (IT only), mshta.exe (rare — legacy HR app), wscript.exe (IT scripts only). PowerShell: used by IT team (~15 people).",
        },
        {
          type: "Hypothesis Framework",
          content:
            "MITRE ATT&CK technique of interest: T1218 (System Binary Proxy Execution). Hypothesis format: 'IF [threat actor behavior], THEN [observable in our environment], VALIDATED BY [specific query/data source].'",
        },
      ],
      classifications: [
        {
          id: "strong-hypothesis",
          label: "Strong Hypothesis — Baseline deviation of LOLBin usage by non-IT users",
          description: "Hunt for certutil, mshta, wscript, regsvr32 execution by finance/non-IT employees — any execution is anomalous in this environment",
        },
        {
          id: "broad-hunt",
          label: "Broad Hunt — Collect all LOLBin execution events and manually review",
          description: "Pull all instances of known LOLBins and analyze each one",
        },
        {
          id: "signature-update",
          label: "Update Signatures — Add LOLBin hashes to blocklist",
          description: "LOLBins can't be blocked by hash since they're legitimate binaries",
        },
        {
          id: "wait-for-alert",
          label: "No Action — Proactive hunting without a trigger wastes analyst time",
          description: "Focus on alert triage until a concrete trigger appears",
        },
      ],
      correctClassificationId: "strong-hypothesis",
      remediations: [
        {
          id: "baseline-deviation-query",
          label: "Query for LOLBin execution by non-IT users, unusual parent-child relationships, and network connections post-execution",
          description: "Build SIEM queries: certutil/mshta/regsvr32/wscript execution where user is NOT in IT security group, execution at unusual hours, and any network connection spawned within 60 seconds of LOLBin execution",
        },
        {
          id: "all-lolbin-collection",
          label: "Pull all LOLBin events from SIEM for past 90 days",
          description: "Collect everything and sort manually",
        },
        {
          id: "block-lolbins",
          label: "Block all LOLBin execution via AppLocker/WDAC",
          description: "Prevent LOLBin abuse by restricting execution",
        },
        {
          id: "awareness-training",
          label: "Train employees to report unusual pop-up windows from scripts",
          description: "User awareness as the primary defense",
        },
      ],
      correctRemediationId: "baseline-deviation-query",
      rationales: [
        {
          id: "rat-baseline",
          text: "Effective threat hunting requires a testable hypothesis, not a fishing expedition. In this finance environment, the hypothesis is precise: 'If a threat actor is using LOLBins, THEN certutil/mshta/regsvr32 will execute under non-IT user accounts, VALIDATED BY process creation events filtered to non-IT-group users.' The specific analytics: (1) LOLBin execution by user not in IT group, (2) unusual parent processes (certutil spawned by Word or Excel indicates document-based malware), (3) network connections within 60 seconds of LOLBin execution (data exfiltration signal). Baselining is the key — in a finance environment, certutil running under a financial analyst's account has no legitimate explanation.",
        },
        {
          id: "rat-block",
          text: "AppLocker/WDAC blocking is an excellent hardening control but is separate from threat hunting. You can't block something retroactively, and blocking might be premature without understanding what legitimate use exists in the environment.",
        },
      ],
      correctRationaleId: "rat-baseline",
      feedback: {
        perfect: "Correct hypothesis design. Baseline deviation is the key — LOLBin execution by non-IT users in a finance company is anomalous by definition. The parent-process and network-connection enrichment turns anomaly into investigation-ready evidence.",
        partial: "Broad collection without a hypothesis creates alert fatigue — thousands of LOLBin events with no way to prioritize. Baseline deviation against user roles makes the hunt tractable.",
        wrong: "LOLBins can't be blocked by hash since they're legitimate Windows binaries. Hunting requires behavior-based hypotheses tied to who is running them and what they do afterward.",
      },
    },
    {
      type: "triage-remediate",
      id: "hunt-003",
      title: "Hunt Outcome and Escalation Decision",
      description:
        "Your threat hunt for scheduled task persistence (T1053.005) has returned results. Evaluate the findings and decide on escalation.",
      evidence: [
        {
          type: "Hunt Query Results",
          content:
            "Query: Scheduled tasks created in the past 30 days where creator is not in IT group. Results: 47 scheduled tasks found. 44 created by 'SYSTEM' account during software updates (expected). 2 created by user 'jsmith' pointing to C:\\ProgramData\\Update\\svchost32.exe (binary doesn't match Microsoft signature, no associated installer). 1 created by user 'backup-svc' pointing to PowerShell script in user profile directory.",
        },
        {
          type: "Binary Analysis",
          content:
            "svchost32.exe hash: VirusTotal — 0/72 detections (novel or custom malware). Binary metadata: compiled 3 days ago, no digital signature, PE header anomalies consistent with packing. File creation timestamp predates scheduled task creation by 6 hours.",
        },
        {
          type: "User Context",
          content:
            "jsmith: Finance analyst, terminated 2 weeks ago. Account should have been disabled but is still active (access revocation gap). backup-svc: Legitimate service account for backup software — but backup software vendor confirmed they don't use PowerShell scripts in user profile directories.",
        },
        {
          type: "Network Activity",
          content:
            "svchost32.exe has made outbound connections to 185.220.101.47 (known Tor exit node) every 4 hours for the past 3 days. Total data transferred: 2.3 MB outbound, 180 KB inbound.",
        },
      ],
      classifications: [
        {
          id: "confirmed-breach-escalate",
          label: "Confirmed Active Breach — Escalate to IR Immediately",
          description: "Novel malware with C2 beacon to Tor exit node constitutes confirmed compromise requiring IR team",
        },
        {
          id: "suspicious-investigate",
          label: "Suspicious — Investigate Further Before Escalating",
          description: "Run more queries to build additional evidence before declaring an incident",
        },
        {
          id: "false-positive-close",
          label: "Likely False Positive — 0/72 VirusTotal Could Be Legitimate Software",
          description: "No detection doesn't mean malicious; close the hunt finding",
        },
        {
          id: "isolate-monitor",
          label: "Isolate the Endpoint Silently and Continue Monitoring",
          description: "Contain without alerting the attacker to determine full scope",
        },
      ],
      correctClassificationId: "confirmed-breach-escalate",
      remediations: [
        {
          id: "escalate-ir-contain",
          label: "Escalate to IR, isolate jsmith's endpoint, disable both accounts, preserve forensic artifacts, notify management",
          description: "Immediately engage IR team, network-isolate the affected endpoint, disable jsmith and backup-svc accounts, capture memory and disk image before any remediation, notify CISO and legal",
        },
        {
          id: "delete-malware",
          label: "Delete svchost32.exe, remove scheduled tasks, and close the hunt",
          description: "Remove the identified malware artifacts and consider the incident resolved",
        },
        {
          id: "monitor-longer",
          label: "Continue monitoring the C2 beacon to gather more intelligence",
          description: "Allow the beacon to continue while observing attacker behavior",
        },
        {
          id: "block-tor-exits",
          label: "Block Tor exit nodes at the firewall and close the finding",
          description: "Network blocking will sever C2 communication",
        },
      ],
      correctRemediationId: "escalate-ir-contain",
      rationales: [
        {
          id: "rat-escalate",
          text: "This hunt has crossed from hypothesis validation into confirmed incident response: novel (0/72) packed binary with no digital signature, created by a terminated employee's still-active account, beaconing to a Tor exit node every 4 hours for 3 days with 2.3 MB of exfiltration. This is not a threat hunting case anymore — it's a confirmed breach with active C2. Required actions: escalate to IR immediately, network-isolate the endpoint (stop ongoing exfiltration), preserve forensic artifacts (memory dump, disk image — before any deletion that destroys evidence), disable both compromised accounts, and notify CISO/legal (3 days of data exfiltration may trigger breach notification obligations). Deleting malware before forensic imaging destroys evidence needed for scope determination and potential legal action.",
        },
        {
          id: "rat-monitor",
          text: "Allowing active exfiltration to continue for intelligence gathering is not acceptable when 2.3 MB of data is already gone. The attacker may have already completed their mission. Contain now, forensically analyze the captured artifacts.",
        },
      ],
      correctRationaleId: "rat-escalate",
      feedback: {
        perfect: "Correct escalation. Active C2 beacon, novel malware, terminated employee account, and 2.3 MB exfiltration — this is a confirmed breach. Preserve forensics, isolate, escalate to IR, notify leadership.",
        partial: "Monitoring active exfiltration isn't acceptable. The data is leaving now — contain, preserve forensics, and escalate.",
        wrong: "0/72 on VirusTotal for a packed, unsigned binary beaconing to a Tor exit node from a terminated employee's account is not a false positive. This is an active breach requiring immediate IR escalation.",
      },
    },
  ],

  hints: [
    "A threat hunting hypothesis follows the structure: 'IF [threat actor behavior], THEN [observable in environment], VALIDATED BY [specific data source and query].' Testability is what separates hunting from hoping.",
    "Baseline deviation is more powerful than IOC matching for LOLBin hunting — the question isn't what binary ran, but who ran it and what they did next.",
    "When a threat hunt finds active C2 communication with data exfiltration, the hunt is over — you're in incident response. Escalate immediately and preserve forensics before taking remediation actions.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Threat hunting is one of the fastest-growing security disciplines — mature security teams move beyond alert-reactive SOC work to proactive adversary search. Analysts who can construct and execute ATT&CK-based hypotheses are highly valuable in any enterprise security program.",
  toolRelevance: [
    "Elastic SIEM / Splunk (hunt query execution)",
    "MITRE ATT&CK Navigator (coverage mapping)",
    "VirusTotal / Malware Bazaar (binary analysis)",
    "Velociraptor / osquery (endpoint telemetry)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
