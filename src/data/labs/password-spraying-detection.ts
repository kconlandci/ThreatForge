import type { LabManifest } from "../../types/manifest";

export const passwordSprayingDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "password-spraying-detection",
  version: 1,
  title: "Password Spraying Detection",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["password-spray", "auth-logs", "siem", "containment", "blue-team"],

  description:
    "Analyze authentication logs to identify a password spraying attack. Choose the correct containment strategy and justify your analysis of the attack pattern.",
  estimatedMinutes: 7,
  learningObjectives: [
    "Recognize password spraying patterns in authentication logs",
    "Differentiate between brute force and password spray attacks",
    "Select proportional containment that doesn't disrupt legitimate users",
  ],
  sortOrder: 20,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "ps-001",
      title: "Auth Anomaly — Multiple Users, Single IP",
      objective:
        "SOC Alert: Multiple failed login attempts detected across the organization from a single source IP. Analyze the logs to determine the attack type and respond.",
      investigationData: [
        {
          id: "log-table",
          label: "Authentication Log — /var/log/auth.log",
          content:
            "14:20:01 | j.doe    | 192.168.1.45 | FAILURE | Invalid Password\n14:20:03 | a.smith  | 192.168.1.45 | FAILURE | Invalid Password\n14:20:05 | b.jones  | 192.168.1.45 | FAILURE | Invalid Password\n14:20:08 | c.davis  | 192.168.1.45 | FAILURE | Invalid Password\n14:20:10 | k.wilson | 192.168.1.45 | FAILURE | Invalid Password\n14:21:15 | admin    | 104.22.11.8  | SUCCESS | MFA Validated\n14:22:12 | m.brown  | 192.168.1.45 | FAILURE | Invalid Password",
          isCritical: true,
        },
        {
          id: "ip-lookup",
          label: "IP Reputation — 192.168.1.45",
          content: "Internal IP. Registered to: VLAN 10 (General Staff). No prior alerts.",
        },
        {
          id: "user-check",
          label: "User Account Status — Targeted Users",
          content: "All targeted accounts are active. None are locked. No recent password changes. Different departments (HR, Sales, Engineering).",
          isCritical: true,
        },
      ],
      actions: [
        { id: "BLOCK_IP", label: "Block IP 192.168.1.45", color: "red" },
        { id: "LOCK_USERS", label: "Lock Affected Users", color: "orange" },
        { id: "MONITOR", label: "Monitor Activity", color: "blue" },
      ],
      correctActionId: "BLOCK_IP",
      rationales: [
        { id: "R1", text: "Low-and-slow attack: Single IP trying one password against many users to avoid lockouts." },
        { id: "R2", text: "Brute force: Single IP trying thousands of passwords against one specific account." },
        { id: "R3", text: "False positive: Internal IPs are trusted and should not be blocked." },
      ],
      correctRationaleId: "R1",
      feedback: {
        perfect: "Perfect. You identified the spray pattern (one IP, many users) and blocked the source without disrupting legitimate users.",
        partial: "Partially correct. The key pattern is one IP rotating across many users — that's a spray, not brute force.",
        wrong: "Incorrect. 192.168.1.45 is targeting 6 different users with single attempts each — classic password spray. Internal IPs can be compromised.",
      },
    },
    {
      type: "investigate-decide",
      id: "ps-002",
      title: "Successful Login After Spray Attempt",
      objective:
        "The same IP (192.168.1.45) that was spraying has now achieved a successful login. Investigate and decide the next step.",
      investigationData: [
        {
          id: "new-logs",
          label: "Updated Auth Log — Last 5 Minutes",
          content:
            "14:25:01 | g.harris | 192.168.1.45 | FAILURE | Invalid Password\n14:25:04 | h.clark  | 192.168.1.45 | FAILURE | Invalid Password\n14:25:08 | j.doe    | 192.168.1.45 | SUCCESS | Password Accepted\n14:25:09 | j.doe    | 192.168.1.45 | SUCCESS | MFA Bypassed (Remembered Device)",
          isCritical: true,
        },
        {
          id: "mfa-config",
          label: "MFA Policy for j.doe",
          content: "MFA Type: Push Notification. 'Remember this device' enabled. Last trusted device: WKST-17 (different from 192.168.1.45 host).",
          isCritical: true,
        },
        {
          id: "session-data",
          label: "Active Sessions — j.doe",
          content: "Session 1: WKST-17 (legitimate workstation)\nSession 2: 192.168.1.45 (unknown host, started 14:25:08)",
        },
      ],
      actions: [
        { id: "RESET_CREDS", label: "Reset j.doe Credentials", color: "orange" },
        { id: "MONITOR", label: "Monitor j.doe Sessions", color: "blue" },
        { id: "BLOCK_IP", label: "Block IP Only", color: "red" },
      ],
      correctActionId: "RESET_CREDS",
      rationales: [
        { id: "R1", text: "Password confirmed compromised (successful spray), and MFA was bypassed via trusted device cookie from a different host." },
        { id: "R2", text: "MFA bypass is expected when 'Remember Device' is on. No action needed." },
        { id: "R3", text: "Blocking the IP alone is sufficient since MFA will protect the account." },
      ],
      correctRationaleId: "R1",
      feedback: {
        perfect: "Correct. The password was cracked by the spray, and the MFA 'remember device' cookie was stolen or replayed. Credential reset is mandatory.",
        partial: "Partially correct. Blocking the IP helps, but the password is already compromised. Without a reset, the attacker can try again from a different source.",
        wrong: "Incorrect. A successful login after a spray confirms credential compromise. MFA was bypassed via device cookie replay — monitoring alone is insufficient.",
      },
    },
    {
      type: "investigate-decide",
      id: "ps-003",
      title: "Distinguishing Spray from Legitimate Failure",
      objective:
        "A new batch of auth failures arrived. Determine if this is a continuation of the attack or normal Monday-morning password resets.",
      investigationData: [
        {
          id: "monday-logs",
          label: "Monday 08:00 Auth Failures",
          content:
            "08:01:12 | p.nguyen | 10.0.3.22    | FAILURE | Password Expired\n08:03:45 | r.kumar  | 10.0.5.18    | FAILURE | Password Expired\n08:05:30 | s.jones  | 10.0.2.7     | FAILURE | Invalid Password\n08:06:01 | s.jones  | 10.0.2.7     | FAILURE | Invalid Password\n08:06:30 | s.jones  | 10.0.2.7     | SUCCESS | Password Accepted",
          isCritical: true,
        },
        {
          id: "context",
          label: "IT Ops Note — Password Policy Change",
          content: "Reminder: Company-wide password rotation was enforced Friday at 17:00. Expect elevated failures Monday morning.",
          isCritical: true,
        },
        {
          id: "ip-check",
          label: "Source IP Analysis",
          content: "All source IPs are registered workstations assigned to the respective users. No IP overlap between failures.",
        },
      ],
      actions: [
        { id: "MONITOR", label: "Monitor (Expected Activity)", color: "blue" },
        { id: "BLOCK_IPS", label: "Block All Failing IPs", color: "red" },
        { id: "LOCK_USERS", label: "Lock All Failing Accounts", color: "orange" },
      ],
      correctActionId: "MONITOR",
      rationales: [
        { id: "R1", text: "Different IPs per user + 'Password Expired' status + IT policy context = legitimate Monday resets, not an attack." },
        { id: "R2", text: "Multiple failures always indicate an attack. Lock accounts to be safe." },
        { id: "R3", text: "The three sequential failures from s.jones indicate a brute force attempt." },
      ],
      correctRationaleId: "R1",
      feedback: {
        perfect: "Correct. Context is king. The IT policy change, individual workstation IPs, and 'Password Expired' reason codes all indicate normal activity.",
        partial: "Partially correct. The pattern doesn't match spray or brute force. Each user fails from their own workstation after a policy-forced rotation.",
        wrong: "Incorrect. Locking accounts or blocking IPs after a scheduled password rotation would cause a self-inflicted denial of service.",
      },
    },
  ],

  hints: [
    "Compare the Source IP column across all failure events. Is it one IP or many?",
    "Check if the attack targets one user repeatedly or many users once each.",
    "Spraying attacks avoid account lockouts by rotating users, not passwords.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "In a real SOC, differentiating between brute force (vertical) and password spraying (horizontal) is critical. Blocking a spraying IP protects the entire org. Locking individual accounts during a spray often helps the attacker by causing denial of service for your own users.",
  toolRelevance: [
    "Splunk / Elastic SIEM (log correlation)",
    "Azure AD Identity Protection",
    "CrowdStrike Falcon Identity",
    "UEBA platforms",
  ],

  createdAt: "2026-03-22",
  updatedAt: "2026-03-22",
};
