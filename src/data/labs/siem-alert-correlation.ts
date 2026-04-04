import type { LabManifest } from "../../types/manifest";

export const siemAlertCorrelationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "siem-alert-correlation",
  version: 1,
  title: "SIEM Alert Correlation",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["siem", "alert-correlation", "splunk", "detection", "log-analysis", "threat-hunting"],

  description:
    "Correlate multiple SIEM alerts from different sources to identify coordinated attacks, distinguish true incidents from noise, and determine the appropriate response priority.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Correlate alerts across multiple data sources to identify attack patterns",
    "Distinguish coordinated attacks from coincidental alert clusters",
    "Prioritize response actions based on correlated threat intelligence",
  ],
  sortOrder: 400,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "sac-001",
      title: "Correlated Brute Force to Lateral Movement Chain",
      context:
        "Three alerts triggered within a 15-minute window. Alert 1 (14:32): 847 failed SSH login attempts from 203.0.113.99 targeting the VPN gateway. Alert 2 (14:41): Successful VPN login for user 'dparker' from IP 203.0.113.99 — same IP as the brute force. Alert 3 (14:47): Internal port scan detected from dparker's VPN-assigned IP (10.8.0.47) targeting the 10.0.1.0/24 subnet (server VLAN).",
      displayFields: [
        { label: "Alert Timeline", value: "14:32 → 14:41 → 14:47 (15-minute chain)", emphasis: "critical" },
        { label: "Common IP", value: "203.0.113.99 (brute force source = VPN login source)", emphasis: "critical" },
        { label: "Compromised Account", value: "dparker — Marketing, no server access needed", emphasis: "warn" },
        { label: "Port Scan Target", value: "10.0.1.0/24 — Server VLAN (SQL, AD, File)", emphasis: "critical" },
        { label: "User Location", value: "dparker is on PTO in a domestic location; IP geolocates to Eastern Europe", emphasis: "warn" },
      ],
      actions: [
        {
          id: "DISABLE_INVESTIGATE",
          label: "Disable VPN account and investigate compromised credentials",
          color: "red",
        },
        {
          id: "BLOCK_IP",
          label: "Block the external IP only",
          color: "orange",
        },
        {
          id: "TRIAGE_SEPARATE",
          label: "Triage each alert independently",
          color: "yellow",
        },
        {
          id: "MONITOR_CHAIN",
          label: "Monitor for additional alerts before acting",
          color: "blue",
        },
      ],
      correctActionId: "DISABLE_INVESTIGATE",
      rationales: [
        {
          id: "rat-attack-chain",
          text: "The three alerts form a classic attack chain: brute force → credential compromise → internal reconnaissance. The same external IP across the brute force and VPN login, combined with the user being on PTO and the IP geolocating to Eastern Europe, confirms account compromise. Disabling the VPN account stops the active attack while investigation determines the full scope.",
        },
        {
          id: "rat-block-ip",
          text: "Blocking the IP alone doesn't revoke the active VPN session or prevent the attacker from reconnecting via a different IP.",
        },
        {
          id: "rat-separate",
          text: "Triaging these alerts independently misses the attack chain. The correlation between them is the critical finding.",
        },
        {
          id: "rat-monitor",
          text: "The attacker is already scanning the server VLAN. Waiting for more alerts gives them time to find and exploit vulnerable services.",
        },
      ],
      correctRationaleId: "rat-attack-chain",
      feedback: {
        perfect: "Excellent correlation. The common IP, temporal sequence, and geographic impossibility form an airtight attack chain. Disabling the VPN account immediately terminates the active session.",
        partial: "You recognized the threat but your response doesn't fully contain it. Blocking an IP doesn't kill an active VPN session. The account itself must be disabled.",
        wrong: "These three alerts are clearly correlated. Treating them separately or waiting wastes the 15-minute head start you have on the attacker.",
      },
    },
    {
      type: "action-rationale",
      id: "sac-002",
      title: "Coincidental Alert Cluster — No Correlation",
      context:
        "Five alerts fired within the same 10-minute window during Monday morning: (1) DNS query volume spike on the resolver, (2) CPU alert on web-prod-03, (3) SSL certificate expiring in 7 days on api.company.com, (4) Backup job failure on backup-srv-01, (5) New user 'temp-contractor-7' created in Active Directory.",
      displayFields: [
        { label: "Alert Count", value: "5 alerts in 10 minutes", emphasis: "warn" },
        { label: "Common IP/User", value: "None — different sources, users, and systems", emphasis: "normal" },
        { label: "DNS Spike", value: "Correlates with Monday 9AM login surge (weekly pattern)", emphasis: "normal" },
        { label: "CPU Alert", value: "Weekly report generation runs Monday 9:15 AM", emphasis: "normal" },
        { label: "New User", value: "HR ticket #HR-2026-0891 — approved contractor onboarding", emphasis: "normal" },
      ],
      actions: [
        {
          id: "TRIAGE_INDIVIDUAL",
          label: "Triage each alert individually — no correlation",
          color: "green",
        },
        {
          id: "ESCALATE_COORDINATED",
          label: "Escalate as coordinated attack",
          color: "red",
        },
        {
          id: "SUPPRESS_ALL",
          label: "Suppress all — Monday morning noise",
          color: "yellow",
        },
        {
          id: "HOLD_PATTERN",
          label: "Hold all and wait for a 6th alert to confirm pattern",
          color: "blue",
        },
      ],
      correctActionId: "TRIAGE_INDIVIDUAL",
      rationales: [
        {
          id: "rat-no-correlation",
          text: "These five alerts share no common indicators — no shared IP, user, system, or temporal attack chain. The DNS spike and CPU alert have known Monday morning explanations, the cert expiry is routine maintenance, the backup failure is operational, and the new user has an HR approval ticket. Each should be triaged on its own merit.",
        },
        {
          id: "rat-escalate-noise",
          text: "Escalating uncorrelated operational alerts as a coordinated attack wastes IR resources and generates false alarms that erode trust in the SIEM.",
        },
        {
          id: "rat-suppress-risk",
          text: "Suppressing all alerts without review risks missing a genuine issue hidden in the noise. Each alert deserves individual assessment.",
        },
        {
          id: "rat-hold-delay",
          text: "Holding alerts waiting for a pattern that doesn't exist delays resolution of legitimate operational issues like the cert expiry and backup failure.",
        },
      ],
      correctRationaleId: "rat-no-correlation",
      feedback: {
        perfect: "Good analysis. Correlation requires shared indicators — common IPs, users, systems, or a logical attack progression. These alerts are independent operational events that coincidentally occurred in the same window.",
        partial: "You're either seeing patterns that aren't there or dismissing alerts that still need individual attention. Check for shared indicators before correlating.",
        wrong: "Escalating coincidental alerts as a coordinated attack or suppressing them all without review are both inefficient. Individual triage is the correct approach.",
      },
    },
    {
      type: "action-rationale",
      id: "sac-003",
      title: "Insider Data Exfiltration Pattern",
      context:
        "Three alerts from different systems for the same user within 2 hours. Alert 1 (20:15): DLP alert — 2.3GB file uploaded to personal Google Drive from user 'mwilson' workstation. Alert 2 (20:47): DNS monitoring flagged high-volume DNS TXT queries to an unusual domain from the same workstation. Alert 3 (21:02): After-hours VPN connection from mwilson — user is on a performance improvement plan (PIP) per HR records.",
      displayFields: [
        { label: "User", value: "mwilson — Software Engineer, on PIP since 2026-03-15", emphasis: "critical" },
        { label: "DLP Alert", value: "2.3GB upload to personal Google Drive", emphasis: "critical" },
        { label: "DNS Anomaly", value: "High-volume TXT queries to recently registered domain", emphasis: "warn" },
        { label: "VPN Timing", value: "After hours (8:15 PM) — unusual for this user", emphasis: "warn" },
        { label: "HR Context", value: "Performance Improvement Plan — potential flight risk", emphasis: "warn" },
      ],
      actions: [
        {
          id: "INVOKE_INSIDER",
          label: "Invoke insider threat protocol — coordinate with HR and Legal",
          color: "red",
        },
        {
          id: "BLOCK_GDRIVE",
          label: "Block Google Drive access for this user",
          color: "orange",
        },
        {
          id: "CONFRONT_USER",
          label: "Contact the user directly and ask about the uploads",
          color: "yellow",
        },
        {
          id: "LOG_ONLY",
          label: "Log the activity — developers often work late",
          color: "blue",
        },
      ],
      correctActionId: "INVOKE_INSIDER",
      rationales: [
        {
          id: "rat-insider",
          text: "The combination of large data upload, DNS tunneling (potential covert exfiltration channel), after-hours access, and PIP status forms a high-confidence insider threat pattern. The insider threat protocol coordinates Security, HR, and Legal to handle the situation properly — both to protect the organization and to follow legal requirements for employee investigations.",
        },
        {
          id: "rat-block-only",
          text: "Blocking Google Drive alone doesn't address the DNS tunneling channel and tips off the user that they're being monitored.",
        },
        {
          id: "rat-confront",
          text: "Directly confronting the user without HR and Legal involvement can create legal liability and gives the user time to destroy evidence or switch exfiltration methods.",
        },
        {
          id: "rat-log-only",
          text: "Logging without action while 2.3GB of data leaves the organization fails to protect company assets and intellectual property.",
        },
      ],
      correctRationaleId: "rat-insider",
      feedback: {
        perfect: "Strong judgment. The data upload, covert DNS channel, after-hours access, and PIP context create a high-confidence insider threat pattern. The insider threat protocol ensures proper coordination between Security, HR, and Legal.",
        partial: "You recognized the risk but your response is either too narrow or inappropriate. Insider threats require a coordinated response — Security alone can't handle the HR and legal dimensions.",
        wrong: "Logging only or confronting the user directly both create significant risks — data loss continues, and legal complications arise from improper investigation procedures.",
      },
    },
  ],

  hints: [
    "True alert correlation requires shared indicators — look for common IPs, users, systems, or a logical temporal attack chain.",
    "Not every alert cluster is an attack. Monday morning login surges, scheduled jobs, and routine maintenance all generate concurrent alerts.",
    "Insider threat patterns combine technical indicators (DLP, DNS anomalies) with human context (HR status, access timing) — both matter.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "SIEM alert correlation is what separates Tier 1 from Tier 2 SOC analysts. The ability to connect alerts across data sources and distinguish real attack chains from noise is the most valued analytical skill in a SOC.",
  toolRelevance: [
    "Splunk Enterprise Security",
    "Microsoft Sentinel",
    "Elastic SIEM",
    "IBM QRadar",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
