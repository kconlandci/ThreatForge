import type { LabManifest } from "../../types/manifest";

export const socAlertFatigueManagementLab: LabManifest = {
  schemaVersion: "1.1",
  id: "soc-alert-fatigue-management",
  version: 1,
  title: "SOC Alert Fatigue Management",

  tier: "intermediate",
  track: "blue-team-foundations",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "siem",
    "alert-tuning",
    "false-positive-reduction",
    "detection-engineering",
    "soc-operations",
    "alert-fatigue",
    "severity-mapping",
  ],

  description:
    "Tune SIEM alert rules to reduce false positives and prevent analyst burnout without creating detection blind spots. Configure thresholds, consolidate redundant rules, and build a severity-based escalation framework.",
  estimatedMinutes: 18,
  learningObjectives: [
    "Identify high-volume false positive sources and apply targeted tuning to reduce noise",
    "Consolidate overlapping detection rules without introducing coverage gaps",
    "Configure context-enrichment to transform low-fidelity alerts into actionable high-fidelity detections",
    "Design severity mapping frameworks that align alert priority with actual business risk",
    "Balance detection sensitivity against analyst workload to maintain sustainable SOC operations",
  ],
  sortOrder: 430,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "fatigue-001",
      title: "Noisy Authentication Alert Tuning",
      description:
        "Your SIEM generates 2,300 'Failed Authentication' alerts per day from rule AUTH-001. Analysis shows 94% are caused by service accounts with expired credentials hitting automated retry loops, legacy applications with hardcoded stale passwords, and users mistyping passwords during normal login. Only 6% represent actual brute-force or credential-stuffing attempts. Tune the rule configuration to reduce false positives while preserving detection of genuine attacks.",
      targetSystem: "Splunk SIEM — Rule AUTH-001 (Failed Authentication Alerting)",
      items: [
        {
          id: "threshold-count",
          label: "Failed Login Threshold Count",
          detail:
            "Current rule triggers on any single failed authentication event. This generates an alert for every mistyped password. Adjusting the threshold to require multiple failures from the same source within a time window filters routine typos while catching brute-force patterns.",
          currentState: "1 failure",
          correctState: "5 failures in 10 minutes",
          states: [
            "1 failure",
            "3 failures in 30 minutes",
            "5 failures in 10 minutes",
            "10 failures in 5 minutes",
            "25 failures in 1 hour",
          ],
          rationaleId: "rat-threshold",
        },
        {
          id: "service-account-filter",
          label: "Service Account Handling",
          detail:
            "Service accounts with expired credentials generate hundreds of identical alerts daily as automated processes retry on fixed intervals. These accounts need a separate monitoring approach rather than flooding the analyst queue.",
          currentState: "Include all accounts",
          correctState: "Route service accounts to dedicated dashboard with auto-ticket",
          states: [
            "Include all accounts",
            "Exclude service accounts entirely",
            "Route service accounts to dedicated dashboard with auto-ticket",
            "Suppress service account alerts for 24 hours",
          ],
          rationaleId: "rat-svc-acct",
        },
        {
          id: "context-enrichment",
          label: "Alert Context Enrichment",
          detail:
            "Raw failed login alerts contain only username, source IP, and timestamp. Adding contextual data helps analysts triage faster and enables automated risk scoring to prioritize genuinely suspicious events.",
          currentState: "No enrichment — raw event only",
          correctState: "Enrich with geo-IP, user risk score, device trust status, and time-of-day anomaly flag",
          states: [
            "No enrichment — raw event only",
            "Add geo-IP location only",
            "Enrich with geo-IP, user risk score, device trust status, and time-of-day anomaly flag",
            "Enrich with full LDAP user profile and manager information",
          ],
          rationaleId: "rat-enrichment",
        },
        {
          id: "known-ip-allowlist",
          label: "Corporate Network Allowlisting",
          detail:
            "Many failed logins originate from corporate office IP ranges where users legitimately mistype passwords. Consider whether to adjust alerting for known-good source networks.",
          currentState: "Alert on all source IPs equally",
          correctState: "Alert on all source IPs equally",
          states: [
            "Alert on all source IPs equally",
            "Suppress alerts from corporate IP ranges entirely",
            "Reduce severity for corporate IP ranges",
            "Only alert on external IP addresses",
          ],
          rationaleId: "rat-allowlist",
        },
      ],
      rationales: [
        {
          id: "rat-threshold",
          text: "Five failures in 10 minutes balances noise reduction with attack detection. Single-failure alerts catch every typo (94% false positive rate). Three in 30 minutes still generates significant noise from retry loops. Ten in 5 minutes risks missing slow credential-stuffing attacks that throttle attempts. Twenty-five in an hour is too permissive — most brute-force tools can be configured to stay below this threshold.",
        },
        {
          id: "rat-svc-acct",
          text: "Routing service accounts to a dedicated dashboard with auto-ticketing ensures they are still monitored (unlike full exclusion, which creates a blind spot) while removing them from the analyst alert queue. Auto-tickets to the identity team ensure expired credentials are remediated. Full exclusion would allow compromised service accounts to go undetected — a critical risk since service accounts often have elevated privileges.",
        },
        {
          id: "rat-enrichment",
          text: "Multi-factor enrichment (geo-IP, user risk score, device trust, time anomaly) transforms a low-fidelity alert into an actionable decision. An analyst seeing 'failed login from untrusted device in unusual country at 3 AM for a high-risk user' can triage in seconds. Geo-IP alone is insufficient — VPNs make it unreliable. Full LDAP profiles add noise without improving triage speed.",
        },
        {
          id: "rat-allowlist",
          text: "Corporate IP allowlisting creates a dangerous blind spot. Insider threats, compromised workstations, and attackers who have already gained network access all operate from corporate IPs. Credential attacks from inside the network are often more dangerous than external ones because they indicate post-compromise lateral movement. All source IPs should be evaluated equally; context enrichment (not source filtering) is the correct way to improve signal-to-noise.",
        },
      ],
      feedback: {
        perfect:
          "Excellent tuning decisions. You reduced false positives through threshold adjustment and service account routing while preserving full detection coverage. Critically, you maintained alerting on corporate IPs — a common mistake that creates insider threat blind spots.",
        partial:
          "Some of your tuning decisions improve the signal-to-noise ratio, but check for blind spots. Excluding service accounts entirely or suppressing corporate IP alerts removes legitimate monitoring coverage. Effective tuning reduces noise without reducing visibility.",
        wrong:
          "Alert tuning requires surgical precision. Over-tuning (suppressing entire account types or IP ranges) creates blind spots that attackers exploit. Under-tuning (keeping single-event thresholds) perpetuates the alert fatigue that degrades analyst effectiveness. Review each setting for the balance between noise reduction and detection coverage.",
      },
    },
    {
      type: "toggle-config",
      id: "fatigue-002",
      title: "Redundant Detection Rule Consolidation",
      description:
        "An audit of your SIEM rule library found three overlapping detection rules that all fire for PowerShell-based attacks, generating duplicate and near-duplicate alerts for single events. Analysts waste 15-20 minutes daily closing redundant alerts. Consolidate the rules to eliminate duplication while maintaining or improving detection coverage.",
      targetSystem: "Elastic SIEM — PowerShell Detection Rule Cluster",
      items: [
        {
          id: "rule-ps-exec",
          label: "PS-001: PowerShell.exe Execution (Any)",
          detail:
            "Legacy rule from initial SIEM deployment. Fires on ANY powershell.exe process creation regardless of context. Generates ~180 alerts/day, of which 95% are legitimate admin scripts and scheduled tasks. Overlap: Fully overlapped by PS-002 and PS-003 which have more specific criteria.",
          currentState: "Enabled",
          correctState: "Disabled",
          states: ["Enabled", "Disabled", "Reduced severity"],
          rationaleId: "rat-ps001",
        },
        {
          id: "rule-ps-encoded",
          label: "PS-002: Encoded PowerShell Command Execution",
          detail:
            "Detects powershell.exe or pwsh.exe launched with -EncodedCommand, -enc, or -e flags. Fires ~25 alerts/day. False positive rate: 40% from legitimate IT automation using encoded commands for special character handling. Contains no parent process or user context filtering.",
          currentState: "Enabled",
          correctState: "Enabled — add parent process and user context filters",
          states: [
            "Enabled",
            "Disabled",
            "Enabled — add parent process and user context filters",
            "Enabled — reduce to informational severity",
          ],
          rationaleId: "rat-ps002",
        },
        {
          id: "rule-ps-amsi",
          label: "PS-003: AMSI-Flagged PowerShell Content",
          detail:
            "Fires when Windows Antimalware Scan Interface (AMSI) flags PowerShell script content as malicious after decoding and deobfuscation. Fires ~8 alerts/day with a 12% false positive rate. This is the highest-fidelity rule in the cluster because AMSI evaluates actual script content, not just command-line arguments.",
          currentState: "Enabled",
          correctState: "Enabled — promote to high severity",
          states: [
            "Enabled",
            "Disabled",
            "Enabled — promote to high severity",
            "Enabled — reduce to informational severity",
          ],
          rationaleId: "rat-ps003",
        },
        {
          id: "rule-ps-correlation",
          label: "New: Correlated PowerShell Attack Chain Rule",
          detail:
            "Proposed new correlation rule: Alert when PS-002 (encoded command) AND PS-003 (AMSI flag) both fire for the same process within 60 seconds. This correlation would produce a very high-confidence alert indicating an encoded command that also contains malicious content — a strong indicator of obfuscated malware execution.",
          currentState: "Not deployed",
          correctState: "Deploy as critical severity",
          states: [
            "Not deployed",
            "Deploy as informational severity",
            "Deploy as high severity",
            "Deploy as critical severity",
          ],
          rationaleId: "rat-correlation",
        },
      ],
      rationales: [
        {
          id: "rat-ps001",
          text: "PS-001 generates 180 alerts/day with 95% false positives and is fully overlapped by the more specific PS-002 and PS-003 rules. It provides zero additional detection value — every event it catches is also caught by one or both of the specialized rules. Disabling it eliminates 171 daily false positives with no coverage loss. Keeping it at reduced severity still generates queue noise that analysts must manually dismiss.",
        },
        {
          id: "rat-ps002",
          text: "Encoded PowerShell is a legitimate detection target used by most offensive frameworks (Cobalt Strike, Metasploit, Empire). However, the 40% false positive rate can be reduced by adding context: exclude encoded commands launched by known IT automation service accounts, SCCM task sequences, or scheduled tasks with validated parent processes. This preserves detection of attacker-launched encoded commands while filtering legitimate automation.",
        },
        {
          id: "rat-ps003",
          text: "AMSI-flagged content is the highest-fidelity signal in this cluster because it evaluates the actual deobfuscated script content rather than superficial command-line patterns. With only 12% false positives, this rule should be promoted to high severity to ensure it receives priority analyst attention. Reducing it to informational would bury the best signal in low-priority noise.",
        },
        {
          id: "rat-correlation",
          text: "When an encoded PowerShell command also triggers AMSI malicious content detection, the probability of a true attack is extremely high. This correlation eliminates false positives from both sides: legitimate encoded commands (which do not trigger AMSI) and AMSI false positives on benign scripts (which are typically not encoded). Deploying at critical severity ensures immediate analyst response to what is effectively a confirmed malicious execution event.",
        },
      ],
      feedback: {
        perfect:
          "Excellent consolidation strategy. You eliminated the noisy catch-all rule, refined the medium-fidelity rule with context filtering, promoted the highest-fidelity signal, and deployed a correlation rule that produces near-zero false positive critical alerts. This transforms three overlapping noisy rules into a coherent detection hierarchy.",
        partial:
          "Your consolidation addresses some of the redundancy, but review the detection fidelity hierarchy. The goal is not just fewer alerts — it is better-prioritized alerts. AMSI content inspection is higher fidelity than command-line pattern matching, and correlated signals from multiple detection methods produce the most reliable results.",
        wrong:
          "Effective rule consolidation requires understanding the fidelity hierarchy: catch-all execution rules (low fidelity) < command-line pattern rules (medium fidelity) < content inspection rules (high fidelity) < correlated multi-signal rules (very high fidelity). Disable the low-fidelity overlap and promote the high-fidelity detections.",
      },
    },
    {
      type: "toggle-config",
      id: "fatigue-003",
      title: "Alert Prioritization & Escalation Framework",
      description:
        "Your SOC processes 1,400 alerts per day with a flat priority structure — everything is 'Medium' severity by default. Analysts spend equal time on benign true positives and critical threats because there is no severity differentiation or escalation framework. Design a severity mapping and escalation configuration that ensures the most dangerous alerts receive immediate attention.",
      targetSystem: "SOAR Platform — Alert Severity & Escalation Engine",
      items: [
        {
          id: "ransomware-severity",
          label: "Ransomware Behavior Detection",
          detail:
            "EDR detects rapid file encryption patterns: mass file modification with entropy increase, volume shadow copy deletion, or ransom note file creation. Current average: 0.3 alerts/day, false positive rate <5%. These alerts represent active data destruction with minutes-to-hours response window.",
          currentState: "Medium",
          correctState: "Critical — auto-escalate to Tier 3 with 5-minute SLA",
          states: [
            "Low",
            "Medium",
            "High — standard Tier 2 queue",
            "Critical — auto-escalate to Tier 3 with 5-minute SLA",
          ],
          rationaleId: "rat-ransomware",
        },
        {
          id: "phishing-severity",
          label: "Phishing Email — User Clicked Link",
          detail:
            "Email gateway reports that a user clicked a link in a message classified as phishing after delivery. Credential harvesting page may have been accessed. Current average: 12 alerts/day, false positive rate ~20% (safe link rewrites sometimes trigger on legitimate marketing emails). Response window: 1-4 hours before credentials are used.",
          currentState: "Medium",
          correctState: "High — standard Tier 2 queue",
          states: [
            "Low",
            "Medium",
            "High — standard Tier 2 queue",
            "Critical — auto-escalate to Tier 3 with 5-minute SLA",
          ],
          rationaleId: "rat-phishing",
        },
        {
          id: "vulnerability-scan-severity",
          label: "Vulnerability Scanner Activity",
          detail:
            "Network IDS detects port scanning and service enumeration patterns from known vulnerability scanner IP addresses (Qualys, Nessus) during scheduled scan windows. Current average: 85 alerts/day during scan days, false positive rate: 100% (all are legitimate scheduled scans). These alerts are entirely predictable and authorized.",
          currentState: "Medium",
          correctState: "Informational — auto-close with maintenance window tag",
          states: [
            "Medium",
            "Low — Tier 1 review within 24 hours",
            "Informational — auto-close with maintenance window tag",
            "Suppressed — do not generate alert",
          ],
          rationaleId: "rat-vulnscan",
        },
        {
          id: "impossible-travel-severity",
          label: "Impossible Travel — Authentication Anomaly",
          detail:
            "Identity provider detects authentication from two geographically distant locations within a timeframe that makes physical travel impossible (e.g., New York and Singapore within 30 minutes). Current average: 4 alerts/day, false positive rate ~60% (VPN usage, cloud proxies, mobile hotspots). When true positive, indicates credential compromise with active adversary access.",
          currentState: "Medium",
          correctState: "High — standard Tier 2 queue",
          states: [
            "Low",
            "Medium",
            "High — standard Tier 2 queue",
            "Critical — auto-escalate to Tier 3 with 5-minute SLA",
          ],
          rationaleId: "rat-travel",
        },
        {
          id: "data-exfil-severity",
          label: "Large Outbound Data Transfer to External Storage",
          detail:
            "DLP/proxy detects upload of >500 MB to cloud storage services (personal Google Drive, Dropbox, Mega) outside corporate tenancy. Current average: 2 alerts/day, false positive rate ~35% (legitimate personal use of cloud storage for non-sensitive files). When true positive, indicates data exfiltration or policy violation with potential for significant data loss.",
          currentState: "Medium",
          correctState: "High — standard Tier 2 queue",
          states: [
            "Low",
            "Medium",
            "High — standard Tier 2 queue",
            "Critical — auto-escalate to Tier 3 with 5-minute SLA",
          ],
          rationaleId: "rat-exfil",
        },
      ],
      rationales: [
        {
          id: "rat-ransomware",
          text: "Ransomware behavior detection has an extremely low false positive rate (<5%) and represents active data destruction with an irreversible damage timeline measured in minutes. This is the textbook case for Critical severity with automatic Tier 3 escalation and the tightest SLA. Every minute of analyst triage delay translates directly into more encrypted files and greater business impact.",
        },
        {
          id: "rat-phishing",
          text: "Phishing link clicks represent confirmed user interaction with a likely malicious page and a 1-4 hour window before stolen credentials are typically used. High severity with Tier 2 handling is appropriate — urgent but not critical because the response window allows structured investigation. Critical severity would generate too much escalation noise at 12 alerts/day with 20% false positives, desensitizing Tier 3 analysts.",
        },
        {
          id: "rat-vulnscan",
          text: "Authorized vulnerability scans from known scanner IPs during documented maintenance windows are 100% false positives for the SOC. Auto-closing with a maintenance window tag preserves the audit trail (the event is logged, not suppressed) while removing 85 daily alerts from the analyst queue. Full suppression would eliminate the audit record, which may be needed for compliance. Medium or Low severity wastes analyst time on events that are always benign.",
        },
        {
          id: "rat-travel",
          text: "Impossible travel alerts have a high false positive rate (60%) but when true positive, they indicate active credential compromise with an adversary who is currently authenticated. High severity for Tier 2 is the right balance — the alert needs prompt investigation but the high FP rate makes it unsuitable for Critical auto-escalation, which would flood Tier 3 with VPN-induced false positives.",
        },
        {
          id: "rat-exfil",
          text: "Large outbound data transfers to personal cloud storage represent potential data loss that may be irreversible once completed. High severity ensures timely Tier 2 investigation to distinguish legitimate personal use from actual exfiltration. Critical severity is inappropriate at 35% false positive rate, but Medium is too low given the potential for significant data loss if the alert represents actual exfiltration of sensitive data.",
        },
      ],
      feedback: {
        perfect:
          "Well-designed escalation framework. You correctly reserved Critical severity for the highest-fidelity, most time-sensitive alert type (ransomware), placed medium-urgency alerts at High for structured Tier 2 investigation, and removed predictable false positives from the analyst queue without suppressing the audit trail. This configuration respects analyst attention as a finite resource.",
        partial:
          "Your severity mapping addresses some prioritization issues, but review the relationship between false positive rate, response urgency, and escalation tier. Critical severity should be reserved for alerts that are both high-confidence AND extremely time-sensitive. Over-escalation desensitizes Tier 3 analysts just as effectively as under-prioritization buries critical threats in the queue.",
        wrong:
          "A flat priority structure guarantees that critical threats receive the same attention as benign noise. Effective severity mapping considers three factors: detection confidence (false positive rate), response urgency (time-to-impact), and damage potential (reversibility). Map each alert type against these criteria to determine appropriate severity and escalation.",
      },
    },
  ],

  hints: [
    "When tuning alert thresholds, consider the attacker's perspective: what threshold would a sophisticated adversary deliberately stay below? Your threshold should detect realistic attack patterns while filtering routine operational noise. Extremely high thresholds create evasion opportunities; extremely low thresholds perpetuate alert fatigue.",
    "Rule consolidation follows a fidelity hierarchy. Content-based detection (what the script actually does) is higher fidelity than pattern-based detection (what the command line looks like), which is higher fidelity than execution-based detection (the process ran at all). Eliminate lower-fidelity rules when they are fully overlapped by higher-fidelity alternatives.",
    "Severity mapping should treat analyst attention as a scarce resource. Reserve the highest escalation tier for alerts that are both high-confidence AND extremely time-sensitive. Flooding Tier 3 with high-false-positive alerts creates the same fatigue problem you are trying to solve, just at a higher tier.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "SOC analysts who can systematically tune detection rules and design escalation frameworks are solving one of the industry's most persistent operational challenges. Alert fatigue directly contributes to analyst burnout and missed critical detections — organizations that master alert tuning retain talent longer and detect threats faster. This skill set is increasingly required for SOC Team Lead and Detection Engineering roles.",

  toolRelevance: [
    "Splunk / Elastic SIEM",
    "Palo Alto XSOAR / Splunk SOAR",
    "CrowdStrike Falcon LogScale",
    "Microsoft Sentinel",
    "ServiceNow SecOps",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
