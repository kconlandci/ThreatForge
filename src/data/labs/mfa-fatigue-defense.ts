import type { LabManifest } from "../../types/manifest";

export const mfaFatigueDefenseLab: LabManifest = {
  schemaVersion: "1.1",
  id: "mfa-fatigue-defense",
  version: 1,
  title: "MFA Fatigue Defense",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["mfa", "push-bombing", "identity", "social-engineering", "containment"],

  description:
    "Analyze MFA push notification logs and user context to determine whether each authentication event is an attack or legitimate activity. Respond proportionally.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify MFA fatigue (push-bombing) attack patterns in auth logs",
    "Distinguish legitimate MFA activity from social engineering attacks",
    "Choose proportional responses based on risk level and context",
  ],
  sortOrder: 30,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "mfa-001",
      title: "Finance VP Under Push Bombardment",
      context:
        "Sarah Jenkins (Finance VP) is in a board meeting in Paris. She reports her phone is buzzing constantly with login notifications she did not initiate. Logs show repeated successful password entries from an unknown external IP with MFA push timeouts.",
      displayFields: [
        { label: "Account", value: "s.jenkins@corp.com" },
        { label: "Source IP", value: "45.12.88.19 (Unknown)", emphasis: "critical" },
        { label: "Risk Level", value: "HIGH", emphasis: "critical" },
        { label: "MFA Status", value: "3x PUSH SENT → TIMEOUT" },
        { label: "Password", value: "SUCCESSFUL (compromised)", emphasis: "warn" },
      ],

      actions: [
        { id: "BLOCK_IP", label: "Block Source IP", color: "red" },
        { id: "RESET_CREDENTIALS", label: "Reset Credentials", color: "orange" },
        { id: "ALLOW_PROCEED", label: "Mark Legitimate", color: "green" },
      ],
      correctActionId: "RESET_CREDENTIALS",

      rationales: [
        { id: "R1_1", text: "Ignore; MFA is doing its job by timing out." },
        { id: "R1_2", text: "Password is compromised (successful entry from unknown IP); MFA fatigue attack in progress." },
        { id: "R1_3", text: "Block user account entirely to prevent all access." },
      ],
      correctRationaleId: "R1_2",

      feedback: {
        perfect: "Excellent. The password was successfully entered multiple times from an unknown IP, confirming credential compromise. Resetting is mandatory.",
        partial: "You identified the risk, but the action or justification was suboptimal. Blocking the IP alone won't stop the credential leak.",
        wrong: "Critical failure. Ignoring these logs allows the attacker to keep trying until the user accidentally taps 'Approve' out of frustration.",
      },
    },
    {
      type: "action-rationale",
      id: "mfa-002",
      title: "DevOps Engineer — Legitimate Multi-Auth",
      context:
        "Mark Sloan (DevOps) is setting up a new automation script from his home office that requires multiple auth tokens. He confirms he initiated the logins. Source IP is his known home address.",
      displayFields: [
        { label: "Account", value: "m.sloan@dev.local" },
        { label: "Source IP", value: "24.56.10.112 (Known Home IP)" },
        { label: "Risk Level", value: "LOW" },
        { label: "MFA Status", value: "2x PUSH SENT → APPROVED" },
        { label: "Password", value: "SUCCESSFUL" },
      ],

      actions: [
        { id: "BLOCK_IP", label: "Block Source IP", color: "red" },
        { id: "RESET_CREDENTIALS", label: "Reset Credentials", color: "orange" },
        { id: "ALLOW_PROCEED", label: "Mark Legitimate", color: "green" },
      ],
      correctActionId: "ALLOW_PROCEED",

      rationales: [
        { id: "R2_1", text: "Legitimate administrative activity from a known IP with user confirmation." },
        { id: "R2_2", text: "Potential session hijacking; force password reset immediately." },
        { id: "R2_3", text: "MFA fatigue via automated bot; block source IP." },
      ],
      correctRationaleId: "R2_1",

      feedback: {
        perfect: "Correct. Context matters. Known IP, verified user, approved MFA pushes — this is legitimate work.",
        partial: "Over-correction. Forcing a password reset for legitimate work causes unnecessary friction and downtime.",
        wrong: "Incorrect. You blocked legitimate work. Always verify context before taking destructive actions.",
      },
    },
    {
      type: "action-rationale",
      id: "mfa-003",
      title: "Service Account — Abnormal Auth Method",
      context:
        "An internal service account (svc-hr-sync) that normally authenticates with certificates is suddenly requesting Push MFA. No maintenance is scheduled. A password failure was followed by a successful entry and MFA push timeout.",
      displayFields: [
        { label: "Account", value: "svc-hr-sync@internal" },
        { label: "Source IP", value: "10.50.1.200 (Internal)", emphasis: "warn" },
        { label: "Risk Level", value: "CRITICAL", emphasis: "critical" },
        { label: "Normal Auth", value: "Certificate-based" },
        { label: "Current Auth", value: "Password + Push MFA (abnormal)", emphasis: "critical" },
      ],

      actions: [
        { id: "BLOCK_IP", label: "Block Source IP", color: "red" },
        { id: "RESET_CREDENTIALS", label: "Reset Credentials", color: "orange" },
        { id: "ALLOW_PROCEED", label: "Mark Legitimate", color: "green" },
      ],
      correctActionId: "BLOCK_IP",

      rationales: [
        { id: "R3_1", text: "Service accounts should never use Push MFA — but this is probably a config error." },
        { id: "R3_2", text: "Allow; the password was eventually correct so the service is working." },
        { id: "R3_3", text: "Abnormal auth method + internal IP = lateral movement indicator. Block immediately." },
      ],
      correctRationaleId: "R3_3",

      feedback: {
        perfect: "Precision defense. A service account switching to Push MFA is a massive red flag for lateral movement.",
        partial: "You stopped the attack, but missed the deeper implication of service account misuse.",
        wrong: "Disastrous. This is a classic indicator of internal compromise or Pass-the-Hash attempt.",
      },
    },
  ],

  hints: [
    "Look at the password status. If it says SUCCESSFUL, the attacker already has the password.",
    "Check the location and IP reputation. Is the source Known, Internal, or Unknown?",
    "MFA fatigue relies on user frustration. If the user reports constant buzzing, it's a confirmed attack.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Attackers no longer break in — they log in. MFA fatigue is a social engineering attack that weaponizes user frustration. As a security professional, look for the successful password entry that precedes the push notification. If the password is right but the location is wrong, the perimeter has already been breached.",
  toolRelevance: [
    "Microsoft Entra ID (Conditional Access)",
    "Okta / Duo (MFA management)",
    "CrowdStrike Falcon Identity",
    "SIEM alert correlation for MFA events",
  ],

  createdAt: "2026-03-22",
  updatedAt: "2026-03-22",
};
