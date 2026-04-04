import type { LabManifest } from "../../types/manifest";

export const phishingEmailTriageLab: LabManifest = {
  schemaVersion: "1.1",
  id: "phishing-email-triage",
  version: 1,
  title: "Phishing Email Triage",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "phishing",
    "email-security",
    "social-engineering",
    "triage",
    "spf-dkim",
    "header-analysis",
  ],

  description:
    "Analyze suspicious emails using header inspection, SPF/DKIM validation, and contextual clues to determine whether each message is a phishing attempt or a legitimate communication.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Analyze email headers to identify sender spoofing",
    "Distinguish phishing from legitimate suspicious emails",
    "Use SPF/DKIM results to assess email authenticity",
    "Apply proportional response based on evidence strength",
  ],
  sortOrder: 60,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "phish-001",
      title: "Obvious Phishing — Spoofed IT Support",
      objective:
        "Examine the reported suspicious email and determine how it should be handled.",
      investigationData: [
        {
          id: "email-headers",
          label: "Email Headers (Sender)",
          content:
            'From: "IT Support <helpdesk@it-supp0rt-corp.ru>" — Display name mimics internal IT, but domain is external .ru with a zero replacing the letter "o".',
          isCritical: true,
        },
        {
          id: "url-hover",
          label: "URL Hover Preview",
          content:
            'The "Reset Password Now" button links to https://secure-login.it-supp0rt.ru/verify — this does not match the company domain.',
        },
        {
          id: "email-body",
          label: "Email Body Analysis",
          content:
            'Generic greeting "Dear Employee" with no name. Urgent language: "You have 24 hours to reset your password or your account will be locked." No department-specific context.',
        },
        {
          id: "spf-dkim",
          label: "SPF/DKIM Authentication Results",
          content: "SPF: FAIL — sender IP not authorized for claimed domain. DKIM: NONE — no signature present.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "QUARANTINE_REPORT",
          label: "Quarantine and report to security",
          color: "red",
        },
        {
          id: "FORWARD_IT",
          label: "Forward to IT for review",
          color: "orange",
        },
        {
          id: "CLICK_VERIFY",
          label: "Click link to verify",
          color: "blue",
        },
        {
          id: "DELETE_IGNORE",
          label: "Delete and ignore",
          color: "yellow",
        },
      ],
      correctActionId: "QUARANTINE_REPORT",
      rationales: [
        {
          id: "rat-domain-spf",
          text: "The sender domain mismatch combined with SPF failure is definitive evidence of a spoofed phishing email. Quarantine preserves evidence for investigation.",
        },
        {
          id: "rat-urgency",
          text: "Urgency language alone doesn't confirm phishing — many legitimate security emails use time-sensitive wording.",
        },
        {
          id: "rat-it-review",
          text: "IT should investigate before quarantine to avoid disrupting legitimate communications.",
        },
        {
          id: "rat-delete",
          text: "Deleting the email removes forensic evidence that the security team needs for threat intelligence and pattern analysis.",
        },
      ],
      correctRationaleId: "rat-domain-spf",
      feedback: {
        perfect:
          "Excellent. The .ru domain with a zero substitution is a textbook spoofing indicator, and the SPF failure confirms the sending server was unauthorized. Quarantining preserves the evidence chain.",
        partial:
          "You identified the threat but chose a less optimal response. Forwarding or deleting loses critical evidence. Always quarantine and report confirmed phishing.",
        wrong:
          "Clicking the link or ignoring the email are dangerous responses. The domain mismatch and SPF failure are clear phishing indicators that require immediate quarantine and reporting.",
      },
    },
    {
      type: "investigate-decide",
      id: "phish-002",
      title: "Sophisticated Spear-Phishing Targeting Finance",
      objective:
        "The CFO's assistant flagged this email. Investigate before making a decision.",
      investigationData: [
        {
          id: "sender-header",
          label: "Sender Header Analysis",
          content:
            'From: "David Chen, CFO <d.chen@acm3-financial.com>" — The real CFO email is d.chen@acme-financial.com. The domain swaps "e" for "3" — a single character difference.',
          isCritical: true,
        },
        {
          id: "email-body",
          label: "Email Body Content",
          content:
            'References the real Q2 budget review meeting by date. Requests an urgent wire transfer of $47,500 to an "updated vendor account" with new routing details. Professional tone and correct internal terminology.',
        },
        {
          id: "attachment",
          label: "Attachment Analysis",
          content:
            "PDF invoice attached (vendor_invoice_Q2.pdf). Macros disabled. File size 245KB. No embedded scripts detected by initial scan.",
        },
        {
          id: "reply-to",
          label: "Reply-To Header",
          content:
            "Reply-To: david.chen.cfo.verify@gmail.com — this does not match the From address and points to an external free email provider.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "FLAG_ESCALATE",
          label: "Flag as suspicious and escalate with full headers",
          color: "red",
        },
        {
          id: "PROCESS_WIRE",
          label: "Process the wire transfer (CFO approved)",
          color: "blue",
        },
        {
          id: "REPLY_CONFIRM",
          label: "Reply asking CFO to confirm",
          color: "orange",
        },
        {
          id: "FORWARD_ASSISTANT",
          label: "Forward to CFO's assistant",
          color: "yellow",
        },
      ],
      correctActionId: "FLAG_ESCALATE",
      rationales: [
        {
          id: "rat-domain-masq",
          text: "The external domain masquerading as the internal one, combined with a financial request and mismatched reply-to header, is a classic BEC (Business Email Compromise) pattern. Escalation with full headers enables proper investigation.",
        },
        {
          id: "rat-cfo-approved",
          text: "The CFO's name on the email makes it legitimate — executives often send urgent financial requests.",
        },
        {
          id: "rat-reply-tipoff",
          text: "Replying to the email tips off the attacker that their attempt has been noticed, potentially causing them to pivot tactics or destroy evidence.",
        },
        {
          id: "rat-assistant",
          text: "The assistant should handle it since they are closer to the CFO's workflow.",
        },
      ],
      correctRationaleId: "rat-domain-masq",
      feedback: {
        perfect:
          "Perfect analysis. The single-character domain swap (acm3 vs acme) combined with the Gmail reply-to header are hallmarks of Business Email Compromise. Escalating with full headers gives investigators the evidence they need.",
        partial:
          "You recognized something was off but chose a suboptimal action. Replying alerts the attacker, and forwarding delays the security response. Always escalate BEC attempts directly to the security team.",
        wrong:
          "Processing the wire transfer without verification would result in financial loss. This is a textbook BEC attack — the domain, reply-to mismatch, and wire transfer request are all red flags.",
      },
    },
    {
      type: "investigate-decide",
      id: "phish-003",
      title: "Legitimate Email That Looks Suspicious (False Positive)",
      objective:
        "A new vendor's email was auto-flagged by the spam filter. Determine if it's legitimate.",
      investigationData: [
        {
          id: "sender-info",
          label: "Sender Information",
          content:
            "From: jane.miller@gmail.com — Flagged by spam filter because it originates from a free email provider rather than a corporate domain.",
        },
        {
          id: "email-body",
          label: "Email Body Content",
          content:
            "References purchase order PO-2024-0847 and names the correct procurement contact (Sarah Chen) by name. Requests signature on updated contract terms for Q3 deliverables.",
        },
        {
          id: "thread-history",
          label: "Thread History",
          content:
            "The sender is CC'd on 3 previous legitimate email exchanges with the procurement team dating back 6 weeks. Sarah Chen initiated the original thread.",
        },
        {
          id: "attachment-scan",
          label: "Attachment Scan Results",
          content:
            "contract_v2.pdf — Clean scan. No macros, no embedded scripts. File size 312KB. PDF metadata shows creation in Adobe Acrobat.",
        },
      ],
      actions: [
        {
          id: "VERIFY_PROCUREMENT",
          label: "Verify with procurement team first",
          color: "green",
        },
        {
          id: "QUARANTINE_NOW",
          label: "Quarantine immediately",
          color: "red",
        },
        {
          id: "ALLOW_OPEN",
          label: "Allow and open attachment",
          color: "blue",
        },
        {
          id: "BLOCK_SENDER",
          label: "Block sender permanently",
          color: "orange",
        },
      ],
      correctActionId: "VERIFY_PROCUREMENT",
      rationales: [
        {
          id: "rat-verify",
          text: "The correlation with a real purchase order, named contact, and prior thread history strongly suggests legitimacy. A quick verification with procurement confirms without risk.",
        },
        {
          id: "rat-free-email",
          text: "A free email provider alone is not proof of phishing — many small vendors and consultants use personal email for business.",
        },
        {
          id: "rat-quarantine-vendor",
          text: "Quarantining a legitimate vendor email delays business operations and damages the vendor relationship unnecessarily.",
        },
        {
          id: "rat-open-risky",
          text: "Opening the attachment without any verification is risky, even if initial scans are clean — verification takes only minutes.",
        },
      ],
      correctRationaleId: "rat-verify",
      feedback: {
        perfect:
          "Great judgment. The existing thread history and specific PO reference are strong legitimacy indicators. Verifying with procurement is the proportional response — it confirms authenticity without blocking business.",
        partial:
          "Your caution is understandable but the response was disproportionate. Not every flagged email is malicious — context matters. Blocking or quarantining a real vendor disrupts business unnecessarily.",
        wrong:
          "Opening attachments without verification or permanently blocking a potentially legitimate vendor are both extreme responses. Always use contextual evidence and verify with known contacts.",
      },
    },
  ],

  hints: [
    "Check the actual sender domain, not just the display name — attackers often spoof familiar names.",
    "SPF and DKIM results tell you whether the sending server was authorized by the domain owner.",
    "Not every suspicious-looking email is malicious. Verify with independent sources before making drastic decisions.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Phishing triage is the single most common daily task for SOC Tier 1 analysts. The ability to quickly distinguish real threats from false positives directly impacts team efficiency and response time.",
  toolRelevance: [
    "Microsoft Defender for Office 365",
    "Proofpoint Email Security",
    "PhishTool",
    "MXToolbox Header Analyzer",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
