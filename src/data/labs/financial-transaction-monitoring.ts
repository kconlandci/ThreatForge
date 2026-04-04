import type { LabManifest } from "../../types/manifest";

export const financialTransactionMonitoringLab: LabManifest = {
  schemaVersion: "1.1",
  id: "financial-transaction-monitoring",
  version: 1,
  title: "Financial Transaction Monitoring",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "financial-security",
    "fraud-detection",
    "aml",
    "transaction-monitoring",
    "bec",
    "compliance",
  ],

  description:
    "Investigate anomalous financial system activity including transaction structuring, chargeback fraud, service account misuse in payment systems, and business email compromise targeting vendor payments.",
  estimatedMinutes: 18,
  learningObjectives: [
    "Recognize financial transaction structuring patterns",
    "Distinguish system errors from fraud indicators in payment data",
    "Investigate service account misuse in financial systems",
    "Identify business email compromise in vendor payment workflows",
    "Apply appropriate urgency to financial security investigations",
  ],
  sortOrder: 295,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "fin-001",
      title: "Wire Transfer Structuring Pattern",
      objective:
        "Transaction monitoring flagged a pattern of outbound wire transfers just below the reporting threshold. Investigate.",
      investigationData: [
        {
          id: "transaction-log",
          label: "Transaction Log",
          content:
            "15 outbound wires over 3 days: $9,800, $9,750, $9,850, $9,900, $9,700... all from corporate account ending -4421 to 8 different international recipients.",
          isCritical: true,
        },
        {
          id: "account-holder",
          label: "Account Holder",
          content:
            "Meridian Consulting LLC, corporate account, signatory: Marcus Webb, CFO.",
        },
        {
          id: "recipient-analysis",
          label: "Recipient Analysis",
          content:
            "8 recipients across 4 countries: UK, Singapore, Cayman Islands, Panama. None are known vendors in accounts payable.",
        },
        {
          id: "historical-baseline",
          label: "Historical Baseline",
          content:
            "Account typically sends 2-3 international wires per month averaging $45,000 each, not 15 small ones.",
        },
      ],
      actions: [
        {
          id: "escalate-aml",
          label: "Escalate to compliance/AML team immediately",
          color: "red",
        },
        {
          id: "monthly-review",
          label: "Flag for next monthly review",
        },
        {
          id: "contact-cfo",
          label: "Contact the CFO to explain the transfers",
        },
        {
          id: "block-account",
          label: "Block the account",
        },
      ],
      correctActionId: "escalate-aml",
      rationales: [
        {
          id: "rat-escalate",
          text: "Transactions deliberately structured below the $10K CTR threshold is a textbook structuring pattern (31 USC §5324) — the compliance/AML team must assess for Suspicious Activity Report (SAR) filing.",
        },
        {
          id: "rat-monthly",
          text: "Monthly review is too slow for active structuring — SAR filing has strict timelines and the pattern is ongoing.",
        },
        {
          id: "rat-contact",
          text: "Contacting the subject tips off potential money laundering — tipping off is itself a violation under BSA regulations.",
        },
        {
          id: "rat-block",
          text: "Blocking the account may be appropriate but is a compliance team decision, not a security analyst decision — escalate first.",
        },
      ],
      correctRationaleId: "rat-escalate",
      feedback: {
        perfect:
          "Correct. This is a textbook structuring pattern. The compliance/AML team must assess for SAR filing — do not contact the account holder or take unilateral action.",
        partial:
          "You identified the suspicious pattern but didn't take the optimal action. Structuring cases must go to the compliance/AML team for SAR assessment immediately.",
        wrong: "This response either delays the investigation or compromises it. Structuring is a serious financial crime that requires immediate compliance team involvement.",
      },
    },
    {
      type: "investigate-decide",
      id: "fin-002",
      title: "300% Chargeback Increase — Root Cause Investigation",
      objective:
        "A merchant's payment processing account shows a sudden spike in chargebacks. Determine whether this is a system issue or fraud.",
      investigationData: [
        {
          id: "chargeback-data",
          label: "Chargeback Data",
          content:
            "Chargebacks increased from 0.3% to 1.2% over 2 weeks. Total: 847 chargebacks worth $127K. Reason codes: 75% 'duplicate transaction', 25% 'unauthorized transaction'.",
        },
        {
          id: "merchant-statement",
          label: "Merchant Statement",
          content:
            "Merchant: QuickShip Express, e-commerce. Claims system migration on March 1 caused duplicate charges for some customers.",
        },
        {
          id: "migration-log",
          label: "Migration Log",
          content:
            "System migration confirmed on March 1, but duplicate transaction chargebacks started March 8 — 7-day gap, not consistent with immediate migration error.",
        },
        {
          id: "card-testing",
          label: "Card Testing Pattern",
          content:
            "47 of the 'unauthorized' chargebacks involve cards from the same BIN range, transactions of $1.00 to $5.00, within a 3-hour window on March 10.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "verify-investigate",
          label:
            "Verify migration timeline + investigate card testing pattern",
        },
        {
          id: "accept-migration",
          label: "Accept migration explanation — duplicates cause chargebacks",
        },
        {
          id: "block-merchant",
          label: "Block the merchant account",
          color: "red",
        },
        {
          id: "chargeback-notice",
          label: "Send a chargeback reduction notice",
        },
      ],
      correctActionId: "verify-investigate",
      rationales: [
        {
          id: "rat-verify",
          text: "The 7-day gap between migration and chargebacks doesn't fit a migration error, and the card testing pattern (same BIN, small amounts, short window) is classic card testing fraud overlapping with legitimate migration issues — both need investigation.",
        },
        {
          id: "rat-accept",
          text: "Accepting the migration explanation ignores the card testing evidence — the 7-day gap and BIN-concentrated small transactions don't match a migration error pattern.",
        },
        {
          id: "rat-block",
          text: "Blocking the merchant without investigation penalizes potentially legitimate business — the merchant may be a victim of card testing fraud, not a perpetrator.",
        },
        {
          id: "rat-notice",
          text: "Chargeback notices are routine but don't address the fraud indicators — the card testing pattern requires active investigation, not administrative process.",
        },
      ],
      correctRationaleId: "rat-verify",
      feedback: {
        perfect:
          "Correct. Two overlapping issues need investigation: the migration timeline doesn't explain the chargeback timing, and the card testing pattern is a separate fraud indicator. Investigate both before drawing conclusions.",
        partial:
          "You caught part of the pattern but missed the full picture. Both the timeline inconsistency and the card testing evidence need investigation.",
        wrong: "This response either accepts an incomplete explanation or takes action without sufficient investigation. Multiple indicators suggest both system issues and fraud.",
      },
    },
    {
      type: "investigate-decide",
      id: "fin-003",
      title: "Payment Service Account — Off-Schedule Database Access",
      objective:
        "Audit tool flagged manual database queries from a payment processing service account outside its automated schedule. Investigate.",
      investigationData: [
        {
          id: "audit-log",
          label: "Audit Log",
          content:
            "3 SELECT queries against transactions_ledger table by svc-payment-proc at 2:15 PM, 2:47 PM, and 3:22 PM. Scheduled jobs run only at midnight and 6 AM.",
        },
        {
          id: "query-content",
          label: "Query Content",
          content:
            "Query 1: SELECT COUNT(*) with date filter. Query 2: EXPLAIN ANALYZE on index performance. Query 3: SELECT with JOIN to merchant_details — returned 12,000 rows.",
        },
        {
          id: "dba-statement",
          label: "DBA Statement",
          content:
            'DBA Lisa Park: "I used the service account to run performance optimization queries. My personal DB account doesn\'t have access to the payment tables."',
        },
        {
          id: "access-policy",
          label: "Access Policy",
          content:
            "DBA personal accounts should have read access to all databases. svc-payment-proc has read/write. No MFA on service account.",
        },
      ],
      actions: [
        {
          id: "verify-enforce",
          label:
            "Verify queries match optimization patterns + enforce personal account access",
        },
        {
          id: "accept-dba",
          label: "Accept DBA explanation — performance work is routine",
        },
        {
          id: "revoke-access",
          label: "Revoke DBA's access to service account",
        },
        {
          id: "escalate-theft",
          label: "Escalate as potential data theft",
          color: "red",
        },
      ],
      correctActionId: "verify-enforce",
      rationales: [
        {
          id: "rat-verify",
          text: "EXPLAIN ANALYZE and COUNT queries are consistent with performance work, but using a service account for personal access bypasses audit trails and accountability — verify the queries are benign and fix the access gap so the DBA uses their own account going forward.",
        },
        {
          id: "rat-accept",
          text: "Accepting without fixing the access issue normalizes service account misuse — next time it might not be a legitimate DBA making those queries.",
        },
        {
          id: "rat-revoke",
          text: "Revoking service account access without a replacement breaks automated payment processing — fix the DBA's personal access instead.",
        },
        {
          id: "rat-escalate",
          text: "Escalating as theft when evidence points to legitimate optimization work is disproportionate and damages trust with the DBA team.",
        },
      ],
      correctRationaleId: "rat-verify",
      feedback: {
        perfect:
          "Correct. The queries look like legitimate performance work, but the process failure (using service accounts for personal access) needs to be fixed. Verify and remediate the access gap.",
        partial:
          "You identified the issue but didn't balance verification with remediation. Both the query legitimacy and the access control gap need to be addressed.",
        wrong: "This response either ignores a real process failure or overreacts to what appears to be legitimate DBA work. Context and proportionality matter.",
      },
    },
    {
      type: "investigate-decide",
      id: "fin-004",
      title: "Vendor Bank Details Changed — $125K Payment Pending",
      objective:
        "A new AP clerk changed a vendor's bank routing number and submitted a $125K payment. Investigate before the payment processes.",
      investigationData: [
        {
          id: "ap-log",
          label: "AP System Log",
          content:
            "User: n.brooks (AP Clerk, hired 3 weeks ago) changed routing number for vendor \"Apex Manufacturing\" at 9:15 AM, submitted $125K payment at 9:22 AM.",
          isCritical: true,
        },
        {
          id: "change-request",
          label: "Change Request",
          content:
            'Email from "john.martinez@apex-mfg.com" requesting routing update, received at 8:45 AM — but Apex Manufacturing\'s domain is apex-manufacturing.com, not apex-mfg.com.',
          isCritical: true,
        },
        {
          id: "vendor-file",
          label: "Vendor File",
          content:
            "Apex Manufacturing, vendor since 2019, $1.2M annual spend, bank details unchanged since 2022, primary contact: John Martinez.",
        },
        {
          id: "payment-status",
          label: "Payment Status",
          content:
            "Payment queued for 4 PM batch processing — can still be held.",
        },
      ],
      actions: [
        {
          id: "hold-verify",
          label:
            "Hold payment + verify routing change via independent vendor contact",
        },
        {
          id: "process-match",
          label: "Process — the vendor's contact name matches",
        },
        {
          id: "reject-fire",
          label: "Reject and fire the new clerk",
          color: "red",
        },
        {
          id: "next-day-review",
          label: "Flag for next-day review",
        },
      ],
      correctActionId: "hold-verify",
      rationales: [
        {
          id: "rat-hold",
          text: "The email domain doesn't match the vendor's known domain — this is classic vendor impersonation fraud (BEC), and the new clerk likely wasn't trained to catch it. Hold the payment immediately and call the vendor at the number on file, not the one in the suspicious email.",
        },
        {
          id: "rat-process",
          text: "Matching contact names doesn't verify domain authenticity — attackers research vendor contacts to make impersonation emails more convincing.",
        },
        {
          id: "rat-fire",
          text: "Firing the clerk punishes the victim of social engineering rather than fixing the process — the clerk needs training, and AP needs dual-approval controls for bank detail changes.",
        },
        {
          id: "rat-next-day",
          text: "Next-day review means the 4 PM batch may already process — the $125K payment would be sent to the attacker's account and likely unrecoverable.",
        },
      ],
      correctRationaleId: "rat-hold",
      feedback: {
        perfect:
          "Correct. The domain mismatch is the critical indicator. Hold the payment and verify through independently sourced contact information — never use details from the suspicious request itself.",
        partial:
          "You identified something suspicious but didn't take the optimal action. The payment must be held AND verification must use independent contact information.",
        wrong: "This response either allows a likely fraudulent payment to process or punishes the wrong person. The domain mismatch is the key evidence of BEC.",
      },
    },
  ],

  hints: [
    "Transactions deliberately structured below regulatory reporting thresholds ($10K for CTRs) are a strong indicator of money laundering — escalate to the compliance team, not your security manager.",
    "When merchants claim system migrations caused chargebacks, verify the timeline. A 7-day gap between migration and chargebacks doesn't fit a direct technical cause.",
    "Vendor bank detail changes before large payments are the #1 business email compromise pattern. Always verify through independently sourced contact information, never through the change request itself.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Financial security analysts work at the intersection of cybersecurity and regulatory compliance. Banks, fintechs, and payment processors need analysts who can investigate fraud indicators while understanding BSA/AML requirements and chargeback dispute processes.",
  toolRelevance: [
    "NICE Actimize (transaction monitoring)",
    "Splunk (financial log analysis)",
    "Chainalysis (cryptocurrency investigation)",
    "SWIFT Alliance (payment network security)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
