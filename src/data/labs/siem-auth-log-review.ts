import type { LabManifest } from "../../types/manifest";

export const siemAuthLogReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "siem-auth-log-review",
  version: 1,
  title: "SIEM Auth Log Review",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["siem", "authentication", "brute-force", "impossible-travel", "log-analysis", "threat-hunting"],

  description:
    "Investigate authentication log anomalies in a SIEM environment. Query data sources, identify attack patterns, and choose the correct containment action.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Query SIEM data to extract relevant authentication events",
    "Distinguish brute-force attacks from legitimate user activity",
    "Identify impossible-travel and session-hijacking indicators",
  ],
  sortOrder: 110,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "hunt-001",
      title: "Suspicious Volume Analysis",
      objective:
        "Investigate the spike in authentication logs. Determine if this is a brute-force attack or user error.",
      investigationData: [
        {
          id: "q1",
          label: "SELECT * FROM auth_logs WHERE status='SUCCESS'",
          content: "No anomalies found. 200 successes in last 24h.",
        },
        {
          id: "q2",
          label: "SELECT * FROM auth_logs WHERE status='FAIL' AND time > NOW()-1h",
          content: 'ALERT: 450 failed attempts | User: "jsmith" | IP: 192.168.1.50',
          isCritical: true,
        },
        {
          id: "q3",
          label: "SELECT user_agent FROM auth_logs WHERE user='jsmith'",
          content: 'User-Agent: "Python-requests/2.25.1" (98% match)',
          isCritical: true,
        },
      ],
      actions: [
        { id: "MONITOR", label: "Monitor Only", color: "blue" },
        { id: "LOCK_ACCOUNT", label: "Lock Account", color: "orange" },
        { id: "BLOCK_IP", label: "Block Subnet", color: "red" },
      ],
      correctActionId: "LOCK_ACCOUNT",
      rationales: [
        {
          id: "R1_1",
          text: "Scripted Attack: High volume + Python User-Agent indicates automated brute-force.",
        },
        {
          id: "R1_2",
          text: "User Error: jsmith likely forgot their password after the weekend.",
        },
        {
          id: "R1_3",
          text: "False Positive: Internal IPs are trusted and should not be blocked.",
        },
      ],
      correctRationaleId: "R1_1",
      feedback: {
        perfect:
          "Correct. The velocity (450/hr) and automated User-Agent confirm brute-force. Locking the targeted account is the proportional response.",
        partial:
          "Partially correct. The key indicators are volume (450 failures/hr) and User-Agent (Python script). Match action to rationale.",
        wrong:
          "Incorrect. 450 failed logins from a Python script is not user error. Internal IPs can be compromised. The targeted account must be locked.",
      },
    },
    {
      type: "investigate-decide",
      id: "hunt-002",
      title: "Impossible Travel Detection",
      objective:
        'Analyze login geography for user "adm_wilson". Confirm if sessions are legitimate.',
      investigationData: [
        {
          id: "q1",
          label: "SELECT geo_location FROM logins WHERE user='adm_wilson' LIMIT 5",
          content: "14:05 [New York, US] → 14:15 [London, UK] → 14:30 [New York, US]",
          isCritical: true,
        },
        {
          id: "q2",
          label: "SELECT mfa_status FROM logins WHERE user='adm_wilson'",
          content: "NY Logins: MFA_SUCCESS (Push) | London Login: MFA_BYPASS (Cookie)",
          isCritical: true,
        },
        {
          id: "q3",
          label: "SELECT device_hash FROM logins",
          content: "NY: Hash_A92 (Known) | London: Hash_Z44 (New/Unknown)",
        },
      ],
      actions: [
        { id: "MONITOR", label: "Contact User", color: "blue" },
        { id: "RESET_SESSIONS", label: "Revoke Tokens", color: "orange" },
        { id: "QUARANTINE", label: "Isolate Laptop", color: "red" },
      ],
      correctActionId: "RESET_SESSIONS",
      rationales: [
        {
          id: "R2_1",
          text: "Legitimate Travel: User may be using a VPN tunnel to London.",
        },
        {
          id: "R2_2",
          text: "Malware: The New York workstation is infected.",
        },
        {
          id: "R2_3",
          text: "Session Hijacking: Impossible travel + MFA bypass indicates a stolen session token.",
        },
      ],
      correctRationaleId: "R2_3",
      feedback: {
        perfect:
          "Correct. NY→London in 10 minutes is physically impossible. The cookie-based MFA bypass confirms a stolen session token. Revoking all tokens is the right call.",
        partial:
          "Partially correct. The impossible travel plus MFA bypass is the key signal. Revoking tokens invalidates the stolen session.",
        wrong:
          "Incorrect. Traveling between continents in 10 minutes is impossible. The unknown device with MFA bypass points to session hijacking, not VPN usage or malware.",
      },
    },
    {
      type: "investigate-decide",
      id: "hunt-003",
      title: "Service Account Anomaly",
      objective:
        'The service account "svc_backup" is generating unusual authentication patterns. Determine if the account is compromised.',
      investigationData: [
        {
          id: "q1",
          label: "SELECT login_time, source_ip FROM auth_logs WHERE user='svc_backup' ORDER BY time DESC LIMIT 10",
          content: "Normal: 02:00 daily from 10.0.1.5 (backup server)\nAnomaly: 15:32 from 10.0.9.77 (unknown workstation)",
          isCritical: true,
        },
        {
          id: "q2",
          label: "SELECT action FROM activity_logs WHERE user='svc_backup' AND time > '15:00'",
          content: "15:32 — Accessed HR file share (\\\\files\\hr\\payroll)\n15:34 — Copied 2.3 GB to external staging path",
          isCritical: true,
        },
        {
          id: "q3",
          label: "SELECT password_change FROM admin_logs WHERE user='svc_backup'",
          content: "Last password rotation: 387 days ago. Policy: 90 days.",
        },
      ],
      actions: [
        { id: "MONITOR", label: "Monitor Only", color: "blue" },
        { id: "DISABLE_ACCOUNT", label: "Disable Account", color: "orange" },
        { id: "BLOCK_IP", label: "Block Source IP", color: "red" },
      ],
      correctActionId: "DISABLE_ACCOUNT",
      rationales: [
        {
          id: "R3_1",
          text: "Backup Routine: Service accounts often access file shares; this is expected behavior.",
        },
        {
          id: "R3_2",
          text: "Compromised Credentials: Off-schedule login from unknown host + data exfiltration indicates the account is being abused.",
        },
        {
          id: "R3_3",
          text: "Password Expired: The stale password just needs to be rotated to fix this.",
        },
      ],
      correctRationaleId: "R3_2",
      feedback: {
        perfect:
          "Correct. A service account logging in outside its schedule from an unknown host and copying payroll data is a clear sign of credential abuse. Disabling the account stops the exfiltration.",
        partial:
          "Partially correct. The off-schedule login and data access from an unknown workstation are the critical signals. Disabling the account is the right containment step.",
        wrong:
          "Incorrect. Service accounts have predictable patterns. An off-schedule login from an unknown host that copies sensitive data is not routine — it's credential abuse.",
      },
    },
  ],

  hints: [
    "Check the User-Agent string. Does it look like a standard browser or a scripting library?",
    "Can a human physically travel between two cities in the time difference between log entries?",
    "Service accounts follow strict schedules. Any deviation in time or source IP is a red flag.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: {
      perfect: 0,
      partial: 10,
      wrong: 20,
    },
    passingThresholds: {
      pass: 80,
      partial: 50,
    },
  },

  careerInsight:
    "In a real SOC, differentiate between volume and context. High volume on a single account usually means brute-force. Low volume with high-fidelity signals (MFA bypass, impossible travel) usually means a targeted compromise.",
  toolRelevance: [
    "Splunk / Elastic SIEM (log analysis)",
    "Microsoft Sentinel (threat hunting)",
    "CrowdStrike Falcon LogScale",
    "UEBA (User Entity Behavior Analytics)",
  ],

  createdAt: "2026-03-22",
  updatedAt: "2026-03-22",
};
