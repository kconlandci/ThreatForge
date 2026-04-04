import type { LabManifest } from "../../types/manifest";

export const mitreAttackMappingLab: LabManifest = {
  schemaVersion: "1.1",
  id: "mitre-attack-mapping",
  version: 1,
  title: "MITRE ATT&CK Mapping",

  tier: "advanced",
  track: "detection-hunting",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "mitre-attack",
    "threat-mapping",
    "detection-engineering",
    "apt",
    "technique-classification",
    "detection-coverage",
  ],

  description:
    "Map observed attacker behaviors to MITRE ATT&CK tactics and techniques, classify threat severity, and recommend detection engineering improvements to close coverage gaps.",
  estimatedMinutes: 20,
  learningObjectives: [
    "Map real-world attack behaviors to specific MITRE ATT&CK techniques and sub-techniques",
    "Differentiate APT campaigns from commodity malware based on technique sophistication and chaining",
    "Identify detection coverage gaps by correlating observed techniques against existing SIEM rules",
    "Recommend prioritized detection engineering improvements based on technique prevalence and impact",
    "Assess red team findings and translate them into actionable detection rule updates",
  ],
  sortOrder: 424,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "mitre-001",
      title: "APT Campaign — Multi-Stage Intrusion",
      description:
        "Your threat hunting team has identified a multi-stage intrusion spanning several weeks. Telemetry reveals spear-phishing delivery of a macro-enabled document, PowerShell-based second-stage execution, and registry run-key persistence. Classify the campaign and recommend detection engineering priorities.",
      evidence: [
        {
          type: "Email Gateway",
          content:
            "Inbound email from spoofed partner domain (paytrust-invoices[.]com) delivering .xlsm attachment with VBA macro. Targeted 3 finance department users. Header analysis shows SPF softfail and no DKIM signature. Attachment hash not in any public threat feed — likely custom-built.",
        },
        {
          type: "EDR Telemetry",
          content:
            "EXCEL.EXE spawned powershell.exe with encoded command: -EncodedCommand JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFcAZQBiAENAbABpAGUAbgB0AA== (decoded: downloads second-stage from C2 over HTTPS). Process chain: explorer.exe → excel.exe → powershell.exe → cmd.exe. Technique mapping: T1566.001 (Spearphishing Attachment), T1059.001 (PowerShell).",
        },
        {
          type: "Registry Monitor",
          content:
            "New Run key created: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\WindowsHealthService pointing to %APPDATA%\\healthsvc.exe (unsigned binary, 847KB, compiled 72 hours before delivery). Persistence established on all 3 targeted endpoints. Technique: T1547.001 (Registry Run Keys).",
        },
        {
          type: "Network Analysis",
          content:
            "Periodic HTTPS beaconing to 185.220.101[.]42 every 300 seconds ±15s jitter. JA3 hash matches known Cobalt Strike Malleable C2 profile. DNS resolution via DoH to avoid corporate DNS logging. No data exfiltration observed yet — likely still in staging phase.",
        },
      ],
      classifications: [
        {
          id: "c-apt-campaign",
          label: "APT Campaign — Targeted Intrusion",
          description:
            "Coordinated multi-technique attack with custom tooling, specific targeting, and operational security indicating a well-resourced threat actor.",
        },
        {
          id: "c-commodity-malware",
          label: "Commodity Malware — Opportunistic",
          description:
            "Mass-distributed malware using common infection vectors without specific targeting or advanced tradecraft.",
        },
        {
          id: "c-insider-threat",
          label: "Insider Threat — Malicious Employee",
          description:
            "Authorized user abusing legitimate access to install unauthorized persistence mechanisms.",
        },
      ],
      correctClassificationId: "c-apt-campaign",
      remediations: [
        {
          id: "r-detection-coverage",
          label: "Build Layered Detection Across All Three ATT&CK Phases",
          description:
            "Create detection rules for each observed tactic: email gateway rules for macro-enabled attachments from spoofed domains, Sysmon/EDR rules for Office-spawned PowerShell with encoded commands, and registry monitoring for unsigned binaries in Run keys. Map each rule to the ATT&CK technique ID for coverage tracking.",
        },
        {
          id: "r-block-macros",
          label: "Block All Macro-Enabled Documents at the Gateway",
          description:
            "Configure the email gateway to strip or quarantine all .xlsm, .docm, and .pptm attachments organization-wide to prevent initial access.",
        },
        {
          id: "r-ioc-blocklist",
          label: "Add Known IOCs to Blocklists and Move On",
          description:
            "Block the C2 IP, email sender domain, and file hash at perimeter defenses. No additional detection engineering required.",
        },
      ],
      correctRemediationId: "r-detection-coverage",
      rationales: [
        {
          id: "rat-1",
          text: "A layered detection strategy mapped to each ATT&CK phase ensures that if the adversary modifies one technique (e.g., switches from macros to ISO files), detections at execution and persistence layers still trigger. This approach builds durable coverage rather than chasing individual IOCs.",
        },
        {
          id: "rat-2",
          text: "Blocking macros alone addresses initial access but leaves execution and persistence undetected. APT actors routinely pivot to alternative delivery methods such as ISO, LNK, or HTML smuggling.",
        },
        {
          id: "rat-3",
          text: "IOC-based blocking is trivially evaded by rotating infrastructure. Without behavioral detections at each kill chain stage, the next campaign variant will bypass defenses entirely.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Outstanding. You correctly identified an APT campaign from the custom tooling, targeted delivery, and Cobalt Strike C2 indicators, and recommended layered detection mapped to each ATT&CK phase — the gold standard for detection engineering.",
        partial:
          "You identified some elements correctly, but the recommended remediation is incomplete. APT actors iterate on tradecraft; detection must cover multiple kill chain phases, not just the initial vector or known IOCs.",
        wrong:
          "This is a targeted, multi-stage intrusion with custom tooling and Cobalt Strike infrastructure — not commodity malware or an insider threat. IOC blocking alone provides no durable defense against an adaptive adversary.",
      },
    },
    {
      type: "triage-remediate",
      id: "mitre-002",
      title: "Commodity Malware — Emotet Distribution Wave",
      description:
        "SOC analysts flagged a cluster of alerts across multiple business units. The indicators suggest a well-known malware family rather than a targeted campaign. Classify the threat and determine the appropriate detection posture adjustment.",
      evidence: [
        {
          type: "Email Gateway",
          content:
            "Bulk inbound emails (847 in 2 hours) from rotating sender addresses with subject lines referencing 'Invoice', 'Payment', and 'Shipping Notification'. Attachments are password-protected ZIP files containing .doc files with macros. Pattern matches known Emotet Epoch 5 distribution templates.",
        },
        {
          type: "Sandbox Analysis",
          content:
            "Detonation results: Document macro downloads DLL from hxxps://compromised-wordpress[.]site/wp-content/uploads/dtask.dll. DLL executed via rundll32.exe with export function DllRegisterServer. Behavior consistent with Emotet loader — subsequent C2 check-in to botnet infrastructure. Techniques: T1059.005 (Visual Basic), T1218.011 (Rundll32).",
        },
        {
          type: "Threat Intelligence",
          content:
            "Emotet Epoch 5 distribution resumed 48 hours ago after 3-month hiatus. Public reporting from multiple threat intel vendors confirms global campaign. IOCs widely published. Your industry (manufacturing) is not specifically targeted — broad spray-and-pray distribution.",
        },
        {
          type: "Detection Coverage Audit",
          content:
            "Current SIEM rules detect rundll32 execution from user-writable paths (existing rule DR-4401) but lack coverage for: password-protected ZIP delivery bypassing sandbox, DLL side-loading via legitimate Windows binaries, and Emotet-specific C2 beacon patterns. Coverage gap: T1218.011 partial, T1027.002 (Software Packing) absent.",
        },
      ],
      classifications: [
        {
          id: "c-commodity",
          label: "Commodity Malware — Moderate Severity",
          description:
            "Known malware family using automated distribution with no specific organizational targeting. Existing defenses partially effective but gaps exist.",
        },
        {
          id: "c-apt",
          label: "APT Campaign — High Severity",
          description:
            "Sophisticated state-sponsored intrusion requiring immediate incident response escalation.",
        },
        {
          id: "c-low-risk",
          label: "Low-Risk Spam — Informational Only",
          description:
            "Nuisance email campaign with no real malware payload. No action required beyond standard spam filtering.",
        },
      ],
      correctClassificationId: "c-commodity",
      remediations: [
        {
          id: "r-gap-analysis",
          label: "Map Detection Gaps and Build Missing Rules",
          description:
            "Use the Emotet wave as a catalyst to close identified detection gaps: add rules for password-protected archive delivery, DLL execution from non-standard paths via rundll32, and Emotet C2 beacon jitter patterns. Update ATT&CK coverage matrix accordingly.",
        },
        {
          id: "r-full-ir",
          label: "Activate Full Incident Response — Assume Breach",
          description:
            "Treat this as a confirmed breach across all affected business units. Engage external IR firm and begin forensic imaging of all endpoints that received the emails.",
        },
        {
          id: "r-ignore",
          label: "Acknowledge and Close — Existing Controls Sufficient",
          description:
            "Current detections partially cover the techniques. No additional engineering effort warranted for commodity malware.",
        },
      ],
      correctRemediationId: "r-gap-analysis",
      rationales: [
        {
          id: "rat-1",
          text: "Commodity malware waves are valuable detection engineering opportunities. The known TTPs provide concrete test cases to validate and expand coverage. Closing gaps for Emotet techniques simultaneously improves detection of other malware families sharing similar techniques (T1218.011, T1027.002).",
        },
        {
          id: "rat-2",
          text: "Full incident response is disproportionate for a commodity campaign where no endpoints have confirmed infections. This wastes resources and creates alert fatigue for the IR team.",
        },
        {
          id: "rat-3",
          text: "Ignoring detection gaps because the threat is 'only commodity malware' creates blind spots that APT actors deliberately exploit. The same techniques used by Emotet are shared across the threat landscape.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Excellent analysis. You correctly classified this as commodity malware at moderate severity and recognized the opportunity to close detection gaps. Using known campaigns to improve coverage is a hallmark of mature detection engineering programs.",
        partial:
          "Your classification was reasonable, but the remediation choice needs refinement. Commodity campaigns are not ignorable — they expose detection gaps that more sophisticated adversaries will exploit.",
        wrong:
          "The bulk distribution, known Emotet templates, and public threat reporting clearly indicate commodity malware, not an APT campaign. However, 'informational only' ignores real detection gaps that this wave has exposed.",
      },
    },
    {
      type: "triage-remediate",
      id: "mitre-003",
      title: "Red Team Exercise — Novel Technique Chains",
      description:
        "Your organization's contracted red team has concluded a two-week engagement. The purple team debrief reveals several technique chains that bypassed existing detections. Document the findings and determine the appropriate remediation approach.",
      evidence: [
        {
          type: "Red Team Report",
          content:
            "Initial access achieved via Teams message containing a link to an Azure Blob-hosted HTML file that performed HTML smuggling (T1027.006) to drop an ISO image. The ISO contained a .lnk file that executed a trusted Windows binary (msedge_proxy.exe) to side-load a malicious DLL (T1574.002). No macro-based detection rules triggered because no Office macros were used.",
        },
        {
          type: "Detection Gap Matrix",
          content:
            "Bypassed detections: No rule for HTML smuggling via cloud storage links in Teams messages. No rule for ISO mount events from user-writable directories. DLL side-loading detection only covers 12 of 47 known abusable binaries. Mark-of-the-Web (MotW) bypass via ISO container not monitored. Total: 4 ATT&CK techniques with zero or partial coverage.",
        },
        {
          type: "Purple Team Notes",
          content:
            "Lateral movement achieved using remote WMI execution (T1047) from compromised workstation to file server. Existing detection for WMI only monitors wmic.exe command-line usage — red team used PowerShell's Invoke-WmiMethod which generates different telemetry. Data staging on file server via renamed RAR archive (T1074.001) was not detected due to lack of file archiving heuristics.",
        },
        {
          type: "Coverage Summary",
          content:
            "Pre-engagement ATT&CK coverage: 62% of relevant techniques. Post-assessment gaps identified: 6 techniques with no coverage, 4 techniques with partial coverage (easily bypassed). Recommended priority: T1027.006, T1574.002, T1047 (PowerShell variant), T1074.001. All gaps have corresponding Sigma rule templates available in the SigmaHQ repository.",
        },
      ],
      classifications: [
        {
          id: "c-red-team-critical",
          label: "Critical Detection Gaps — Immediate Remediation Required",
          description:
            "Red team achieved full kill chain execution through technique chains that completely bypassed existing detections. Multiple ATT&CK coverage gaps require urgent attention.",
        },
        {
          id: "c-red-team-minor",
          label: "Minor Findings — Incremental Improvements",
          description:
            "Red team used highly specialized techniques unlikely to be seen in real attacks. Low-priority improvements to consider during next quarterly review.",
        },
        {
          id: "c-false-positive",
          label: "Unrealistic Scenario — Findings Not Applicable",
          description:
            "Red team had insider knowledge that real attackers would not possess. Findings do not reflect genuine detection gaps.",
        },
      ],
      correctClassificationId: "c-red-team-critical",
      remediations: [
        {
          id: "r-sigma-implement",
          label: "Implement Sigma Rules for All Identified Gaps and Retest",
          description:
            "Deploy Sigma detection rules from the SigmaHQ repository for each identified technique gap, customize thresholds to the environment, validate with atomic red team tests for each technique ID, and update the ATT&CK coverage matrix. Schedule a targeted retest within 30 days to confirm gap closure.",
        },
        {
          id: "r-vendor-request",
          label: "Submit Feature Requests to EDR Vendor",
          description:
            "Request the EDR vendor add built-in detection for HTML smuggling, ISO mount events, and DLL side-loading. Wait for the next product update to close gaps.",
        },
        {
          id: "r-accept-risk",
          label: "Accept Residual Risk — Document in Risk Register",
          description:
            "These techniques require sophisticated attacker capabilities. Document the gaps in the organizational risk register and revisit during the annual security assessment.",
        },
      ],
      correctRemediationId: "r-sigma-implement",
      rationales: [
        {
          id: "rat-1",
          text: "Red team engagements exist specifically to identify detection gaps before real adversaries exploit them. Implementing Sigma rules provides vendor-agnostic, community-maintained detections that can be deployed immediately. Atomic Red Team validation ensures each new rule fires correctly, and a targeted retest confirms gap closure — completing the feedback loop.",
        },
        {
          id: "rat-2",
          text: "Waiting for EDR vendor updates creates an indefinite window of exposure. Vendor detection engineering cycles are measured in quarters, not days. Custom Sigma rules can be deployed within hours to close critical gaps.",
        },
        {
          id: "rat-3",
          text: "Accepting risk for techniques that a contracted red team successfully exploited ignores the purpose of the engagement. If your red team can chain these techniques, so can a motivated adversary. HTML smuggling and DLL side-loading are actively used by APT groups including APT29 and Lazarus.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Outstanding. You recognized the critical nature of full kill chain bypass, chose the actionable Sigma-based remediation path with validation and retesting, and understood that red team findings demand immediate detection engineering — not risk acceptance or vendor dependency.",
        partial:
          "You identified the severity correctly, but the chosen remediation introduces unnecessary delay. Red team gaps should be closed with custom detections immediately, not deferred to vendor release cycles or risk registers.",
        wrong:
          "Red team findings that demonstrate complete detection bypass are never 'minor' or 'unrealistic.' These technique chains (HTML smuggling, DLL side-loading, WMI lateral movement) are actively used by real-world APT groups. Immediate detection engineering is required.",
      },
    },
  ],

  hints: [
    "Consider whether the attack uses custom tooling and specific targeting (APT indicators) versus mass distribution and known malware families (commodity indicators). The level of operational security and infrastructure investment reveals threat actor sophistication.",
    "Detection engineering should follow the ATT&CK framework principle of layered coverage — a single detection point is fragile. Map your existing rules to technique IDs and identify phases where an adversary could operate undetected.",
    "Red team and purple team exercises are the most direct way to validate detection coverage. The gap between 'we have a rule for this technique' and 'our rule actually fires when this technique is used' is where adversaries operate.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Detection engineers who can map real-world behaviors to the MITRE ATT&CK framework and translate those mappings into actionable detection rules are among the most sought-after professionals in security operations. This skill bridges the gap between threat intelligence and defensive implementation — a capability that distinguishes senior analysts from entry-level SOC operators.",

  toolRelevance: [
    "MITRE ATT&CK Navigator",
    "Sigma Rules / SigmaHQ",
    "Atomic Red Team",
    "Splunk / Elastic SIEM",
    "CrowdStrike Falcon / Microsoft Defender for Endpoint",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
