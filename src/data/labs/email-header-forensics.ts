import type { LabManifest } from "../../types/manifest";

export const emailHeaderForensicsLab: LabManifest = {
  schemaVersion: "1.1",
  id: "email-header-forensics",
  version: 1,
  title: "Email Header Forensics",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["email-security", "spf", "dkim", "dmarc", "header-analysis", "forensics"],

  description:
    "Analyze email authentication headers to identify SPF, DKIM, and DMARC failures that indicate spoofing, misconfiguration, or legitimate delivery issues.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Interpret SPF, DKIM, and DMARC authentication results in email headers",
    "Distinguish spoofed emails from misconfigured legitimate senders",
    "Identify header anomalies that indicate email manipulation",
  ],
  sortOrder: 310,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "ehf-001",
      title: "SPF Hard Fail — Spoofed CEO Email",
      objective:
        "Analyze the authentication headers of a suspicious email claiming to be from the CEO requesting a wire transfer.",
      investigationData: [
        {
          id: "return-path",
          label: "Return-Path Analysis",
          content:
            'Return-Path: <bounce@mail-blast-promo.net> — does not match the From header "ceo@yourcompany.com". The envelope sender and display sender are completely different domains.',
          isCritical: true,
        },
        {
          id: "spf-result",
          label: "SPF Authentication Result",
          content:
            "SPF: HARD FAIL (-all) — The sending IP 185.234.72.11 is not authorized to send on behalf of yourcompany.com. The domain's SPF record explicitly rejects this server.",
          isCritical: true,
        },
        {
          id: "dkim-result",
          label: "DKIM Signature Check",
          content:
            "DKIM: NONE — No DKIM signature present in the email headers. Legitimate emails from yourcompany.com always carry a valid DKIM signature.",
        },
        {
          id: "dmarc-result",
          label: "DMARC Policy Evaluation",
          content:
            'DMARC: FAIL (p=reject) — Neither SPF nor DKIM aligned with the From domain. The domain policy is "reject" but the receiving server accepted the message anyway.',
        },
      ],
      actions: [
        {
          id: "QUARANTINE_ESCALATE",
          label: "Quarantine and escalate to security team",
          color: "red",
        },
        {
          id: "FORWARD_CEO",
          label: "Forward to CEO to verify",
          color: "orange",
        },
        {
          id: "DELETE_SPAM",
          label: "Delete as spam",
          color: "yellow",
        },
        {
          id: "ALLOW_DELIVER",
          label: "Allow delivery — CEO emails are priority",
          color: "blue",
        },
      ],
      correctActionId: "QUARANTINE_ESCALATE",
      rationales: [
        {
          id: "rat-spf-fail",
          text: "The SPF hard fail combined with missing DKIM and a mismatched Return-Path is definitive evidence of spoofing. Quarantining preserves forensic evidence for investigation while escalation enables broader threat response.",
        },
        {
          id: "rat-forward-ceo",
          text: "Forwarding the spoofed email to the real CEO creates confusion and may cause the CEO to inadvertently interact with the attacker if they reply to the original.",
        },
        {
          id: "rat-delete",
          text: "Deleting destroys forensic evidence that the security team needs for threat intelligence and to check if other users received similar emails.",
        },
        {
          id: "rat-allow",
          text: "Allowing a confirmed spoofed email to reach the target defeats the entire purpose of email authentication controls.",
        },
      ],
      correctRationaleId: "rat-spf-fail",
      feedback: {
        perfect:
          "Excellent. The SPF hard fail, missing DKIM, and Return-Path mismatch together form an airtight case for spoofing. Quarantining preserves evidence while escalation enables the team to check for a broader campaign.",
        partial:
          "You identified it as suspicious but chose a less effective response. Deleting loses evidence, and forwarding creates confusion. Always quarantine and escalate confirmed spoofing.",
        wrong:
          "Allowing or forwarding a confirmed spoofed email is dangerous. The authentication failures are clear — SPF hard fail means the sending server is explicitly unauthorized.",
      },
    },
    {
      type: "investigate-decide",
      id: "ehf-002",
      title: "DKIM Failure — Mailing List Rewrite",
      objective:
        "A vendor's email was flagged for DKIM failure. Determine if this is an attack or a legitimate delivery issue.",
      investigationData: [
        {
          id: "spf-check",
          label: "SPF Result",
          content:
            "SPF: PASS — The sending IP belongs to Google Groups (209.85.220.69), which is authorized to send for the mailing list domain.",
        },
        {
          id: "dkim-check",
          label: "DKIM Signature Verification",
          content:
            "DKIM: FAIL — The original DKIM signature from vendor.com fails validation. The body hash does not match because the mailing list appended a footer to the message body.",
          isCritical: true,
        },
        {
          id: "dmarc-check",
          label: "DMARC Evaluation",
          content:
            "DMARC: FAIL — SPF passes but does not align (envelope domain is googlegroups.com, not vendor.com). DKIM fails due to body modification. Neither mechanism aligns with the From domain.",
        },
        {
          id: "list-headers",
          label: "Mailing List Headers",
          content:
            'List-Id: <industry-security-group.googlegroups.com> — Standard mailing list headers present. X-Original-From: alice@vendor.com. The email was forwarded through a legitimate Google Groups mailing list.',
        },
      ],
      actions: [
        {
          id: "VERIFY_SENDER",
          label: "Verify with sender via alternate channel",
          color: "green",
        },
        {
          id: "QUARANTINE_BLOCK",
          label: "Quarantine and block the sender",
          color: "red",
        },
        {
          id: "ALLOW_WHITELIST",
          label: "Allow and whitelist the mailing list",
          color: "blue",
        },
        {
          id: "ESCALATE_SOC",
          label: "Escalate to SOC for deep analysis",
          color: "orange",
        },
      ],
      correctActionId: "VERIFY_SENDER",
      rationales: [
        {
          id: "rat-mailing-list",
          text: "DKIM failures from mailing lists are a well-known issue — lists that modify message bodies break the DKIM body hash. The presence of List-Id headers and SPF pass for the list server support this explanation. Verification confirms legitimacy without risk.",
        },
        {
          id: "rat-block",
          text: "Blocking a legitimate mailing list disrupts business communication and creates friction with industry partners.",
        },
        {
          id: "rat-whitelist",
          text: "Auto-whitelisting without verification could allow future attacks through the same channel if the list is ever compromised.",
        },
        {
          id: "rat-escalate",
          text: "SOC escalation for a common mailing list issue wastes analyst time when a quick verification would resolve it.",
        },
      ],
      correctRationaleId: "rat-mailing-list",
      feedback: {
        perfect:
          "Well analyzed. Mailing lists that append footers or modify headers commonly break DKIM signatures. The List-Id headers and SPF pass for the Google Groups server explain the failure. A quick verification confirms it safely.",
        partial:
          "Your caution is reasonable but the response could be more efficient. This is a well-documented mailing list behavior — quick verification resolves it without blocking business communication.",
        wrong:
          "Blocking or auto-whitelisting are both extreme. Mailing list DKIM failures are common and expected. Verify the specific message, then make an informed decision.",
      },
    },
    {
      type: "investigate-decide",
      id: "ehf-003",
      title: "All Authentication Passes — Compromised Account",
      objective:
        "An email passes all authentication checks but the content seems unusual. Determine the appropriate response.",
      investigationData: [
        {
          id: "auth-results",
          label: "Authentication Results",
          content:
            "SPF: PASS — Sending IP authorized for partner-corp.com. DKIM: PASS — Valid signature, body unmodified. DMARC: PASS — Full alignment on both SPF and DKIM.",
        },
        {
          id: "sender-info",
          label: "Sender Information",
          content:
            "From: john.smith@partner-corp.com — Known vendor contact, legitimate domain, previous email history spanning 6 months.",
        },
        {
          id: "content-analysis",
          label: "Content Analysis",
          content:
            'Email requests updating the bank account for future payments to a new routing number. Language is slightly different from John\'s usual style — more formal, fewer contractions. Sent at 3:17 AM in the sender\'s timezone.',
          isCritical: true,
        },
        {
          id: "login-context",
          label: "Sender Login Context (from partner IT)",
          content:
            "Partner IT confirms John's account had a successful login from a new IP in a foreign country 2 hours before this email was sent. No VPN usage on record for John.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "ESCALATE_SECURITY",
          label: "Escalate to security — likely compromised account",
          color: "red",
        },
        {
          id: "PROCESS_REQUEST",
          label: "Process the bank change — authentication passed",
          color: "blue",
        },
        {
          id: "REPLY_CONFIRM",
          label: "Reply to John asking him to confirm",
          color: "orange",
        },
        {
          id: "IGNORE_NORMAL",
          label: "Ignore — vendor emails aren't our concern",
          color: "yellow",
        },
      ],
      correctActionId: "ESCALATE_SECURITY",
      rationales: [
        {
          id: "rat-compromised",
          text: "Passing email authentication only proves the email was sent from an authorized server — it does not prove the account owner sent it. The foreign IP login, unusual send time, and financial request are strong indicators of account compromise requiring escalation.",
        },
        {
          id: "rat-process",
          text: "Processing a bank change based solely on email authentication ignores the content-level red flags that authentication cannot detect.",
        },
        {
          id: "rat-reply",
          text: "Replying to a potentially compromised account sends your response directly to the attacker, confirming the attack is working.",
        },
        {
          id: "rat-ignore",
          text: "A compromised vendor account is absolutely your concern — the attacker is targeting your organization's finances.",
        },
      ],
      correctRationaleId: "rat-compromised",
      feedback: {
        perfect:
          "Excellent judgment. This is the key lesson: email authentication verifies the server, not the person. A compromised account sends fully authenticated emails. Content analysis and context (unusual login, odd timing, financial request) are critical for detecting account takeover.",
        partial:
          "You noticed something was off but chose an insufficient response. Replying to a compromised account alerts the attacker. Escalation with all the contextual evidence is the right path.",
        wrong:
          "Processing the request or ignoring it would result in financial loss. Authentication passing does not mean the email is safe — account compromise bypasses all technical email controls.",
      },
    },
  ],

  hints: [
    "SPF verifies the sending server IP, DKIM verifies message integrity, and DMARC checks alignment between them — but none verify the person behind the keyboard.",
    "Mailing lists commonly break DKIM signatures by modifying message bodies. Check for List-Id headers before assuming DKIM failure means spoofing.",
    "When all authentication passes but the content feels wrong, look at login context, send timing, and behavioral changes — these detect account compromise.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Email header analysis is a daily SOC task. Understanding SPF/DKIM/DMARC helps you quickly categorize the 80% of phishing alerts that are obvious, freeing time for the subtle 20%.",
  toolRelevance: [
    "MXToolbox Header Analyzer",
    "Google Admin Toolbox",
    "dmarcian",
    "PhishTool",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
