import type { LabManifest } from "../../types/manifest";

export const socialEngineeringResponseLab: LabManifest = {
  schemaVersion: "1.1",
  id: "social-engineering-response",
  version: 1,
  title: "Social Engineering Response",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "social-engineering",
    "help-desk",
    "verification",
    "pretexting",
    "security-awareness",
  ],

  description:
    "Respond to social engineering attempts targeting your organization. Evaluate caller claims, identify manipulation tactics like urgency and authority pressure, and apply proper verification procedures without compromising security or business relationships.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Recognize common social engineering tactics: urgency, authority, and familiarity",
    "Apply verification procedures under pressure",
    "Distinguish identity verification from identity assumption",
    "Choose proportional responses that protect security without damaging relationships",
  ],
  sortOrder: 90,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "se-001",
      title: "Executive Impersonation — Urgent Password Reset",
      context:
        "You're on the IT help desk. A caller claims to be the VP of Sales, says they're locked out before a critical client presentation in 10 minutes, and becomes aggressive when you ask for verification.",
      displayFields: [
        { label: "Caller ID", value: "Unknown", emphasis: "warn" },
        {
          label: "Ticket System",
          value: "No matching ticket found",
          emphasis: "warn",
        },
        {
          label: "Employee Directory",
          value: "VP Sales — David Park — listed",
          emphasis: "normal",
        },
        { label: "Time", value: "4:47 PM Friday", emphasis: "normal" },
      ],
      actions: [
        {
          id: "RESET_NOW",
          label: "Reset password immediately",
          color: "red",
        },
        {
          id: "ASK_SECURITY_Q",
          label: "Ask security questions",
          color: "orange",
        },
        {
          id: "VERIFY_CALLBACK",
          label: "Follow verification procedure (callback to number on file)",
          color: "green",
        },
        {
          id: "TRANSFER_MGR",
          label: "Transfer to manager",
          color: "yellow",
        },
      ],
      correctActionId: "VERIFY_CALLBACK",
      rationales: [
        {
          id: "rat-verify",
          text: "Urgency combined with authority pressure are textbook social engineering tactics — the verification procedure exists for this exact situation.",
        },
        {
          id: "rat-secq",
          text: "Security questions can be socially engineered too — answers are often publicly available or guessable.",
        },
        {
          id: "rat-mgr",
          text: "Managers may override policy under pressure, which doesn't improve security.",
        },
        {
          id: "rat-reset",
          text: "The VP needs to get into their presentation — speed is the priority.",
        },
      ],
      correctRationaleId: "rat-verify",
      feedback: {
        perfect:
          "Excellent. Callback verification using the number on file is the gold standard. It confirms identity through an independent channel that the caller cannot control, regardless of how urgent or authoritative they sound.",
        partial:
          "You showed caution, but your chosen method has weaknesses. Security questions and manager escalation can both be manipulated by a skilled social engineer.",
        wrong:
          "Resetting without verification is exactly what social engineers count on. Urgency and authority are their primary weapons — never bypass verification procedures under pressure.",
      },
    },
    {
      type: "action-rationale",
      id: "se-002",
      title: "Vendor Requesting Emergency VPN Access",
      context:
        "A person claiming to be from your HVAC vendor calls requesting emergency VPN access to check a failing unit before the weekend. They know your building address and the vendor company name.",
      displayFields: [
        {
          label: "Caller ID",
          value: "+1-555-0199 (not on file)",
          emphasis: "warn",
        },
        {
          label: "Maintenance Ticket",
          value: "None scheduled",
          emphasis: "warn",
        },
        {
          label: "Vendor Contract",
          value: "Comfort Air Systems — contract active",
          emphasis: "normal",
        },
        {
          label: "Vendor Contact on File",
          value: "+1-555-0142 (different from caller)",
          emphasis: "critical",
        },
      ],
      actions: [
        {
          id: "GRANT_VPN",
          label: "Grant temporary VPN access",
          color: "red",
        },
        {
          id: "DENY_HANGUP",
          label: "Deny and hang up",
          color: "orange",
        },
        {
          id: "VERIFY_VENDOR",
          label: "Verify with vendor contact on file",
          color: "green",
        },
        {
          id: "ASK_EMP_ID",
          label: "Ask for their employee ID",
          color: "yellow",
        },
      ],
      correctActionId: "VERIFY_VENDOR",
      rationales: [
        {
          id: "rat-independent",
          text: "Always verify through independent channels, not information the caller provides — call the vendor number already on file.",
        },
        {
          id: "rat-empid",
          text: "Asking for an employee ID still relies on caller-provided information that cannot be independently verified.",
        },
        {
          id: "rat-deny",
          text: "Denying outright may damage the vendor relationship if the request turns out to be legitimate.",
        },
        {
          id: "rat-public",
          text: "The building address is publicly available information and does not prove the caller's identity.",
        },
      ],
      correctRationaleId: "rat-independent",
      feedback: {
        perfect:
          "Perfect. Calling the vendor contact number already on file is the only way to independently verify the request. The caller's knowledge of your address and vendor name proves nothing — that information is easily obtained.",
        partial:
          "You were cautious, but your approach has gaps. Asking for an employee ID relies on the caller's own claims, and hanging up without verification may create unnecessary business friction.",
        wrong:
          "Granting VPN access based on a phone call is a major security risk. The caller's phone number doesn't match your records, and there's no scheduled maintenance ticket. Always verify through independent channels.",
      },
    },
    {
      type: "action-rationale",
      id: "se-003",
      title: "Traveling Colleague's Urgent Request",
      context:
        "A colleague you work with regularly emails from their personal gmail asking you to share a client presentation because their work laptop was stolen during travel. They reference specific project details only someone on the team would know.",
      displayFields: [
        {
          label: "Sender",
          value: "sarah.k.lin@gmail.com (personal)",
          emphasis: "warn",
        },
        {
          label: "Project Reference",
          value: "Mentions Q3 Meridian pitch — correct details",
          emphasis: "normal",
        },
        {
          label: "Travel Calendar",
          value: "Sarah Lin — Chicago trip this week",
          emphasis: "normal",
        },
        {
          label: "Request",
          value: "Share client_deck_v4.pptx via personal Dropbox link",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "SHARE_NOW",
          label: "Share the file immediately",
          color: "red",
        },
        {
          id: "IGNORE",
          label: "Ignore the email",
          color: "yellow",
        },
        {
          id: "REPLY_WORK",
          label: "Reply asking to use work email",
          color: "orange",
        },
        {
          id: "VERIFY_OOB",
          label: "Verify via separate channel (call or Slack)",
          color: "green",
        },
      ],
      correctActionId: "VERIFY_OOB",
      rationales: [
        {
          id: "rat-oob",
          text: "Project details could come from a compromised inbox — verify through a different channel first before sharing anything.",
        },
        {
          id: "rat-workemail",
          text: "Work email may be inaccessible if the laptop was truly stolen, making this verification method unreliable.",
        },
        {
          id: "rat-dlp",
          text: "Sharing to a personal Dropbox link bypasses DLP controls and creates an unmonitored copy of client data.",
        },
        {
          id: "rat-ignore",
          text: "Ignoring a potentially legitimate colleague wastes time and could impact a client deliverable.",
        },
      ],
      correctRationaleId: "rat-oob",
      feedback: {
        perfect:
          "Excellent. Out-of-band verification — calling or messaging Sarah through a different channel — is the correct approach. Project details could come from a compromised email account, and sharing to personal Dropbox bypasses your DLP controls.",
        partial:
          "You showed some caution, but your method doesn't fully verify the request. Asking to use work email may not be feasible, and ignoring the request entirely could harm a colleague.",
        wrong:
          "Sharing client data to a personal Dropbox based on an email from a personal address is a data loss prevention failure. Even familiar details don't prove identity — a compromised inbox contains all of that context.",
      },
    },
  ],

  hints: [
    "Urgency is the attacker's best weapon. Legitimate requests can wait for proper verification.",
    "Never verify identity using information the requester provides — use independently sourced contact details.",
    "Out-of-band verification means using a completely different communication channel than the one the request came through.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Social engineering accounts for over 80% of security breaches. Help desk and IT support roles are primary targets. The ability to follow verification procedures under pressure is what separates secure organizations from compromised ones.",
  toolRelevance: [
    "KnowBe4 (Security Awareness)",
    "ServiceNow (Ticketing)",
    "Duo Security (MFA)",
    "Slack / Teams (Out-of-band verification)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
