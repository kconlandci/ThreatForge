import type { LabManifest } from "../../types/manifest";

export const pciDssComplianceGapLab: LabManifest = {
  schemaVersion: "1.1",
  id: "pci-dss-compliance-gap",
  version: 1,
  title: "PCI-DSS Compliance Gap Assessment",

  tier: "intermediate",
  track: "vulnerability-hardening",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["pci-dss", "compliance", "cardholder-data", "payment-security", "audit", "cde"],

  description:
    "Identify and prioritize PCI-DSS v4.0 compliance gaps in a cardholder data environment, distinguishing critical violations that immediately invalidate compliance from lower-priority hardening items.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify PCI-DSS requirement violations that pose immediate compliance and security risk",
    "Prioritize remediation based on criticality to cardholder data protection",
    "Distinguish required PCI-DSS controls from compensating controls and best practices",
  ],
  sortOrder: 670,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "pci-001",
      title: "Unencrypted PAN Storage in Log Files",
      description:
        "Internal audit discovered payment application debug logs contain full Primary Account Numbers. Classify the severity and remediate.",
      evidence: [
        {
          type: "Log Sample",
          content:
            "application.log: [DEBUG] Processing payment for card: 4532015112830366, amount: $249.99, customer: john.doe@email.com. Logs retained for 90 days. Log files accessible to all development team members (12 people).",

        },
        {
          type: "PCI Requirement",
          content:
            "PCI-DSS Req 3.3.1: SAD (Sensitive Authentication Data) must not be stored after authorization. Req 3.5.1: PAN must be rendered unreadable anywhere it is stored. Full PAN in logs violates both requirements.",

        },
        {
          type: "Scope Assessment",
          content:
            "Debug logging was enabled 6 months ago during a performance investigation and never disabled. Estimated 180+ days of log files contain PANs. Log files are on the application server (CDE) and also automatically copied to the central logging system (expanded scope).",
        },
        {
          type: "Access Control",
          content:
            "Central logging system is accessible to development team, DevOps team, and third-party monitoring vendor. Total access: approximately 45 individuals and one vendor.",
        },
      ],
      classifications: [
        { id: "critical-violation", label: "Critical PCI Violation — Immediate Remediation Required", description: "Unencrypted PAN storage invalidates PCI compliance and requires immediate remediation and notification" },
        { id: "medium-finding", label: "Medium Finding — Remediate at Next Cycle", description: "Compliance gap that should be addressed but doesn't immediately invalidate certification" },
        { id: "low-risk", label: "Low Risk — Debug Logging is Internal Only", description: "Internal systems with controlled access present acceptable risk" },
        { id: "not-violation", label: "Not a Violation — Logs are Operational Data", description: "Transaction logging is a necessary business function" },
      ],
      correctClassificationId: "critical-violation",
      remediations: [
        {
          id: "disable-mask-delete-notify",
          label: "Disable debug logging, mask PAN in all log configurations, purge affected log files, notify QSA",
          description: "Immediate: disable debug, implement log masking. Short-term: purge 180 days of log files containing PANs. Notify QSA of compliance gap.",
        },
        {
          id: "restrict-access",
          label: "Restrict log access to fewer people",
          description: "Limit log file access to only the security team",
        },
        {
          id: "encrypt-logs",
          label: "Encrypt the log storage volume",
          description: "Apply volume-level encryption to log file storage",
        },
        {
          id: "schedule-remediation",
          label: "Schedule for next quarterly review",
          description: "Document the finding and address in the upcoming compliance cycle",
        },
      ],
      correctRemediationId: "disable-mask-delete-notify",
      rationales: [
        {
          id: "rat-critical-pan",
          text: "Full PAN storage in any form violates PCI-DSS Requirement 3.5.1 and immediately invalidates PCI compliance. The remediation requires four steps: disable debug logging immediately (stop the ongoing violation), implement PAN masking in all log configurations (show only last 4 digits), purge all log files containing PANs (180 days of files in CDE and logging system), and notify the QSA (the assessor must be aware of this compliance gap — concealing it can result in QSA liability). Volume encryption doesn't address PAN readability requirements.",
        },
        {
          id: "rat-access-restrict",
          text: "Restricting access doesn't address the fundamental violation — PAN is still stored in cleartext, violating Requirement 3.5.1 regardless of who can access it.",
        },
      ],
      correctRationaleId: "rat-critical-pan",
      feedback: {
        perfect: "Correct critical classification. Unencrypted PAN in logs is a Requirement 3.5.1 violation that immediately invalidates PCI compliance. QSA notification is mandatory, and purging 180 days of log files is required.",
        partial: "Access restriction or encryption doesn't address the fundamental violation. PCI-DSS requires PAN to be unreadable wherever it's stored — not just access-controlled.",
        wrong: "Scheduling a PCI violation for a quarterly review while full credit card numbers are in accessible logs exposes the organization to potential fines and immediate compliance decertification.",
      },
    },
    {
      type: "triage-remediate",
      id: "pci-002",
      title: "Default Vendor Credentials on Payment Terminal",
      description:
        "Network scan of the cardholder data environment found a payment terminal with default vendor credentials still active. Classify and remediate.",
      evidence: [
        {
          type: "Scan Finding",
          content:
            "Host: 10.50.1.47 (payment-terminal-POS-14). Admin interface accessible on port 8443. Credentials admin/admin and admin/password both authenticate successfully. Default credentials not changed since terminal deployment 14 months ago.",

        },
        {
          type: "PCI Requirement",
          content:
            "PCI-DSS Req 2.1.1: All default passwords must be changed before any system component is installed on the network. This requirement has been violated since deployment 14 months ago.",

        },
        {
          type: "Network Exposure",
          content:
            "Port 8443 admin interface accessible from all systems within the CDE network (10.50.0.0/16). Admin interface allows: firmware update, transaction log export, PIN pad configuration, and remote reboot.",
        },
        {
          type: "Historical Access",
          content:
            "Admin interface authentication log retained for 30 days. During this period: 2 logins from 10.50.1.1 (expected — IT admin), 1 login from 10.50.1.89 (unrecognized host) on Saturday at 02:30 UTC.",

        },
      ],
      classifications: [
        { id: "critical-with-breach", label: "Critical — Default Credentials + Possible Unauthorized Access", description: "Default credential violation compounded by unrecognized authentication event" },
        { id: "critical-no-breach", label: "Critical Violation — Default Credentials Only", description: "PCI-DSS Req 2.1.1 violation requiring immediate remediation" },
        { id: "medium-finding", label: "Medium — Can be Remediated at Next Maintenance Window", description: "Compliance gap with no evidence of exploitation" },
        { id: "administrative-oversight", label: "Administrative Oversight — Change During Next Maintenance", description: "Terminal setup process failure, low actual risk" },
      ],
      correctClassificationId: "critical-with-breach",
      remediations: [
        {
          id: "change-creds-investigate-isolate",
          label: "Isolate terminal, investigate 02:30 access from 10.50.1.89, change all credentials, audit transaction logs",
          description: "Treat the unknown access as potential breach: isolate terminal from network, investigate source host, change default credentials, review all transactions since deployment",
        },
        {
          id: "change-credentials-only",
          label: "Change default credentials immediately",
          description: "Update terminal admin password to a strong unique credential",
        },
        {
          id: "block-admin-port",
          label: "Block port 8443 at the firewall",
          description: "Restrict admin interface access via network controls",
        },
        {
          id: "schedule-maintenance",
          label: "Schedule credential change for next maintenance window",
          description: "Document and plan remediation for the next available maintenance period",
        },
      ],
      correctRemediationId: "change-creds-investigate-isolate",
      rationales: [
        {
          id: "rat-breach-indicator",
          text: "The 02:30 weekend login from an unrecognized host (10.50.1.89) is a potential breach indicator that must be investigated before the terminal is treated as trusted. The correct response: isolate the terminal from the CDE network (contain potential breach), investigate what 10.50.1.89 is and what was accessed, change all default credentials (remediate PCI violation), and audit all transactions since the unrecognized access (determine if payment data was exfiltrated or transactions were manipulated). Simply changing credentials while a potential breach is unresolved is insufficient.",
        },
        {
          id: "rat-creds-only",
          text: "Changing credentials addresses the PCI violation but ignores the unrecognized access from 10.50.1.89. That login must be investigated — the terminal may have already been compromised.",
        },
      ],
      correctRationaleId: "rat-breach-indicator",
      feedback: {
        perfect: "Complete assessment. Default credentials plus unrecognized 02:30 weekend access elevates this from a pure compliance gap to a potential breach requiring investigation before remediation.",
        partial: "Credential change alone doesn't address the suspicious access event. Investigate 10.50.1.89 and the 02:30 access before treating the terminal as secure.",
        wrong: "Scheduling a PCI violation for a maintenance window while an unrecognized host may have accessed a payment terminal is unacceptable. This requires immediate response.",
      },
    },
    {
      type: "triage-remediate",
      id: "pci-003",
      title: "Network Segmentation Gap — CDE and Corporate Network",
      description:
        "Penetration test found a misconfigured firewall rule allowing corporate network workstations to reach the cardholder data environment directly. Assess the PCI impact.",
      evidence: [
        {
          type: "Pentest Finding",
          content:
            "Firewall rule ACL-247: permit ip 10.0.0.0/8 10.50.0.0/24 any — allows all corporate network (10.0.0.0/8) to reach CDE (10.50.0.0/24) on any port. Rule was introduced during a network change 4 months ago. Rule was supposed to be temporary for a migration project.",

        },
        {
          type: "Pentest Demonstration",
          content:
            "Pentester successfully: connected to CDE database from corporate workstation (10.0.45.12 → 10.50.0.15:5432), enumerated CDE hosts, accessed backup server. No authentication bypass was used — network segmentation failure alone enabled access.",

        },
        {
          type: "PCI Requirement",
          content:
            "PCI-DSS Req 1.3.2: Inbound traffic to the CDE is restricted to only that which is necessary. Req 11.4: Penetration testing must verify network segmentation effectiveness. Current state fails both requirements.",
        },
        {
          type: "Scope Impact",
          content:
            "If network segmentation is ineffective, entire corporate network (3,200 endpoints) becomes in-scope for PCI-DSS. This would expand PCI audit scope from the current 47 CDE systems to potentially 3,200+ systems.",
        },
      ],
      classifications: [
        { id: "critical-scope-expansion", label: "Critical — Segmentation Failure Expands PCI Scope", description: "Firewall misconfiguration invalidates network segmentation, expanding PCI scope to all corporate endpoints" },
        { id: "high-cde-access", label: "High — Unauthorized CDE Access Risk", description: "Corporate workstations can reach CDE, but no confirmed unauthorized access" },
        { id: "medium-finding", label: "Medium — Temporary Rule Left Active", description: "Administrative oversight, low exploitation risk" },
        { id: "pentest-only", label: "Low — Only Demonstrated by Authorized Pentester", description: "Pentest scenario, no real-world exploitation" },
      ],
      correctClassificationId: "critical-scope-expansion",
      remediations: [
        {
          id: "remove-rule-audit-notify-qsa",
          label: "Remove ACL-247 immediately, audit CDE access logs for 4 months, notify QSA of segmentation failure",
          description: "Emergency: remove the overpermissive rule. Historical: audit 4 months of CDE access logs for unauthorized access. Compliance: notify QSA — segmentation failure may affect certification status",
        },
        {
          id: "remove-rule-only",
          label: "Remove the ACL rule immediately",
          description: "Delete the overpermissive firewall rule to restore segmentation",
        },
        {
          id: "restrict-ports",
          label: "Restrict ACL-247 to only required ports",
          description: "Narrow the overpermissive rule to specific required ports",
        },
        {
          id: "document-pentest",
          label: "Document as pentest finding for next QSA review",
          description: "Include in the next scheduled QSA assessment",
        },
      ],
      correctRemediationId: "remove-rule-audit-notify-qsa",
      rationales: [
        {
          id: "rat-segmentation-critical",
          text: "Network segmentation failure has three critical implications: PCI scope expansion (3,200 corporate endpoints may now be in-scope, dramatically increasing audit complexity and cost), potential unauthorized access for 4 months (the rule was active for 4 months — CDE access logs must be reviewed for any unauthorized access during this period), and QSA notification requirement (the QSA must be informed because this affects the current certification status). Simply removing the rule doesn't address the 4-month exposure window or the compliance notification obligation.",
        },
        {
          id: "rat-remove-only",
          text: "Removing the rule is necessary but insufficient. The 4-month period when the CDE was accessible from all corporate workstations must be investigated for unauthorized access, and the QSA notified.",
        },
      ],
      correctRationaleId: "rat-segmentation-critical",
      feedback: {
        perfect: "Correct critical assessment. Segmentation failure has three consequences: remove the rule, audit 4 months of access logs, and notify the QSA. PCI scope may have expanded to the entire corporate network.",
        partial: "Rule removal alone doesn't address 4 months of potential unauthorized access or the compliance notification obligation. Audit logs and QSA notification are both required.",
        wrong: "Documenting a segmentation failure for the next QSA review while corporate workstations can freely access the CDE is a compliance violation. Immediate remediation and QSA notification are required.",
      },
    },
  ],

  hints: [
    "PCI-DSS violations require QSA notification — concealing compliance gaps from the assessor has legal and certification consequences beyond the finding itself.",
    "Network segmentation failure doesn't just create security risk — it expands the PCI audit scope to all systems that could communicate with the CDE, dramatically increasing compliance burden.",
    "Unrecognized access events discovered during compliance remediation must be investigated as potential breaches before assuming they're benign.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "PCI-DSS compliance is required for any organization processing credit card payments. Security engineers in retail, e-commerce, and financial services must understand both the technical requirements and the compliance consequences of violations.",
  toolRelevance: [
    "Nessus / Qualys (PCI scanning)",
    "Rapid7 InsightVM",
    "Network mapper for CDE scope definition",
    "PCI SSC Self-Assessment Questionnaires",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
