import type { LabManifest } from "../../types/manifest";

export const vendorRiskAssessmentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "vendor-risk-assessment",
  version: 1,
  title: "Third-Party Vendor Risk Assessment",

  tier: "intermediate",
  track: "incident-response",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["vendor-risk", "third-party", "supply-chain", "due-diligence", "access-management", "contracts"],

  description:
    "Evaluate vendor security posture and access requirements to determine appropriate risk acceptance, required contractual controls, and access provisioning decisions for third-party integrations.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Evaluate vendor security questionnaires and certifications to identify critical risk gaps",
    "Apply appropriate access controls and monitoring requirements for third-party access",
    "Distinguish acceptable vendor risk profiles from profiles requiring mitigation or rejection",
  ],
  sortOrder: 700,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "vendor-001",
      title: "Payroll Processing Vendor Security Requirements",
      description:
        "A new payroll vendor requires API access to employee HR data and bank account information. Configure appropriate security requirements before approving the integration.",
      targetSystem: "PayrollPro Inc. — Third-Party Integration Requirements",
      items: [
        {
          id: "security-certification",
          label: "Required Security Certification",
          detail: "Controls what security certifications the vendor must maintain.",
          currentState: "none-required",
          correctState: "soc2-type2-required",
          states: ["none-required", "soc2-type1-accepted", "soc2-type2-required"],
          rationaleId: "rat-certification",
        },
        {
          id: "data-access-scope",
          label: "Data Access Scope",
          detail: "Controls which employee data fields the vendor API can access.",
          currentState: "full-hr-database",
          correctState: "payroll-fields-only",
          states: ["full-hr-database", "department-and-payroll", "payroll-fields-only"],
          rationaleId: "rat-data-scope",
        },
        {
          id: "breach-notification",
          label: "Breach Notification SLA in Contract",
          detail: "Controls the contractual timeframe for vendor breach notification.",
          currentState: "no-contractual-requirement",
          correctState: "24-hour-notification",
          states: ["no-contractual-requirement", "72-hour-notification", "24-hour-notification"],
          rationaleId: "rat-breach-notification",
        },
        {
          id: "subprocessor-approval",
          label: "Subprocessor Approval Requirements",
          detail: "Controls whether the vendor can share data with downstream subprocessors without approval.",
          currentState: "vendor-discretion",
          correctState: "written-approval-required",
          states: ["vendor-discretion", "notification-only", "written-approval-required"],
          rationaleId: "rat-subprocessor",
        },
      ],
      rationales: [
        { id: "rat-certification", text: "SOC 2 Type 2 demonstrates that security controls have been operating effectively for at least 6 months (vs. Type 1 which is a point-in-time assessment). For a vendor handling payroll and bank data, this is the minimum acceptable assurance level." },
        { id: "rat-data-scope", text: "Payroll processors need salary, account, and tax data — they don't need performance reviews, disciplinary records, or HR notes. Apply least-privilege data sharing: provide only the fields required for the vendor's function." },
        { id: "rat-breach-notification", text: "Vendors holding payroll and bank data need aggressive breach notification SLAs. 72 hours satisfies GDPR but may be too slow for financial fraud prevention. 24-hour contractual notification is more appropriate for financial data." },
        { id: "rat-subprocessor", text: "Vendor discretion on subprocessors means employee bank accounts could be shared with a fourth party without knowledge. Written approval before any subprocessor access to payroll data is required for adequate data governance." },
      ],
      feedback: {
        perfect: "Vendor requirements properly configured: SOC 2 Type 2, payroll-only data scope, 24-hour breach notification, and written subprocessor approval.",
        partial: "Broader data scope or missing breach notification SLAs remain. Vendors with financial data must be contractually bound to tight notification timelines.",
        wrong: "No security certifications and full HR database access for a payroll vendor creates unacceptable third-party risk. Minimum baseline: SOC 2 Type 2 and scoped data access.",
      },
    },
    {
      type: "toggle-config",
      id: "vendor-002",
      title: "Penetration Testing Firm Access Controls",
      description:
        "An external penetration testing firm requires temporary access to production infrastructure. Configure appropriate access controls for the engagement.",
      targetSystem: "PenTest Partners LLC — Engagement Access Configuration",
      items: [
        {
          id: "access-scope",
          label: "Access Scope for Pentest",
          detail: "Controls which systems and networks the pentest firm can access.",
          currentState: "full-production-network",
          correctState: "scoped-to-rules-of-engagement",
          states: ["full-production-network", "all-non-prod", "scoped-to-rules-of-engagement"],
          rationaleId: "rat-access-scope",
        },
        {
          id: "credential-type",
          label: "Access Credentials",
          detail: "Controls what type of credentials are provisioned for the pentest team.",
          currentState: "existing-admin-credentials",
          correctState: "time-limited-dedicated-accounts",
          states: ["existing-admin-credentials", "shared-pentest-account", "time-limited-dedicated-accounts"],
          rationaleId: "rat-credentials",
        },
        {
          id: "data-handling",
          label: "Sensitive Data Handling Requirements",
          detail: "Controls how the pentest firm handles any sensitive data discovered during testing.",
          currentState: "no-requirements",
          correctState: "nda-destruction-required",
          states: ["no-requirements", "nda-only", "nda-destruction-required"],
          rationaleId: "rat-data-handling",
        },
        {
          id: "monitoring",
          label: "Real-Time Monitoring During Engagement",
          detail: "Controls whether the security team monitors pentest activity in real time.",
          currentState: "no-monitoring",
          correctState: "real-time-soc-visibility",
          states: ["no-monitoring", "post-engagement-review", "real-time-soc-visibility"],
          rationaleId: "rat-monitoring",
        },
      ],
      rationales: [
        { id: "rat-access-scope", text: "Pentest scope creep — where testers access systems outside the agreed scope — is a common source of unexpected business disruption and legal liability. Access should be technically scoped to only the systems in the rules of engagement, not the entire network." },
        { id: "rat-credentials", text: "Using existing admin credentials for pentest creates attribution problems — log entries showing 'admin' accessed systems could be either the pentest or a real attack. Time-limited dedicated accounts allow clean attribution and easy revocation at engagement end." },
        { id: "rat-data-handling", text: "Pentesters frequently encounter real sensitive data (customer PII, credentials). NDA plus contractual data destruction requirements ensure discovered data isn't retained after the engagement — a liability and privacy risk otherwise." },
        { id: "rat-monitoring", text: "Real-time SOC visibility serves two purposes: it distinguishes pentest activity from real attacks in monitoring tools (preventing false incident response), and it gives the security team an opportunity to observe attack techniques for defensive improvement." },
      ],
      feedback: {
        perfect: "Pentest access properly configured: scoped to rules of engagement, dedicated time-limited accounts, NDA+destruction requirements, and real-time SOC visibility.",
        partial: "Shared credentials or unmonitored pentest access create attribution problems and prevent distinguishing pentest traffic from real attacks.",
        wrong: "Full production network access with existing admin credentials for a third party is too broad. Pentest access must be scoped, attributed, and monitored.",
      },
    },
    {
      type: "toggle-config",
      id: "vendor-003",
      title: "SaaS Vendor Data Processing Agreement",
      description:
        "Configure the required security and legal requirements before approving a new CRM vendor that will process customer personal data.",
      targetSystem: "CRM Pro SaaS — Data Processing Agreement Requirements",
      items: [
        {
          id: "dpa-requirement",
          label: "Data Processing Agreement",
          detail: "Controls whether a formal DPA is required before data processing begins.",
          currentState: "verbal-agreement",
          correctState: "signed-dpa-required",
          states: ["verbal-agreement", "signed-dpa-required"],
          rationaleId: "rat-dpa",
        },
        {
          id: "data-location",
          label: "Data Residency Requirements",
          detail: "Controls where customer personal data can be stored and processed.",
          currentState: "vendor-discretion",
          correctState: "eu-gdpr-compliant-regions",
          states: ["vendor-discretion", "eu-gdpr-compliant-regions", "eu-only"],
          rationaleId: "rat-residency",
        },
        {
          id: "right-to-audit",
          label: "Right to Audit Clause",
          detail: "Controls whether the contract includes a right to audit vendor security controls.",
          currentState: "no-audit-rights",
          correctState: "annual-audit-rights",
          states: ["no-audit-rights", "soc2-in-lieu", "annual-audit-rights"],
          rationaleId: "rat-audit",
        },
        {
          id: "termination-data",
          label: "Data Return and Deletion at Termination",
          detail: "Controls data handling procedures when the vendor contract ends.",
          currentState: "vendor-discretion",
          correctState: "export-then-certified-deletion",
          states: ["vendor-discretion", "deletion-only", "export-then-certified-deletion"],
          rationaleId: "rat-termination",
        },
      ],
      rationales: [
        { id: "rat-dpa", text: "Under GDPR, a Data Processing Agreement is legally required before any processor handles personal data on a controller's behalf. Processing customer data without a signed DPA is a GDPR violation regardless of verbal agreements." },
        { id: "rat-residency", text: "GDPR restricts international data transfers to countries with adequate protection or appropriate safeguards. Vendor discretion on data location may result in customer data being transferred to countries without GDPR adequacy decisions, creating compliance liability." },
        { id: "rat-audit", text: "Without audit rights, you're relying entirely on vendor-provided documentation. SOC 2 in lieu of audit is acceptable as a primary mechanism, but contractual audit rights provide a fallback when SOC 2 scope is unclear or findings are unexplained." },
        { id: "rat-termination", text: "Vendor discretion at termination means customer data could be retained indefinitely after contract end. Contractual export rights followed by certified deletion gives data portability and ensures the vendor cannot retain or monetize data after the relationship ends." },
      ],
      feedback: {
        perfect: "Vendor DPA requirements complete: signed DPA, GDPR-compliant data residency, audit rights, and data export+deletion at termination.",
        partial: "Processing personal data without a signed DPA is a GDPR violation. This must be resolved before any customer data is transferred to the CRM.",
        wrong: "Verbal agreements have no legal standing under GDPR. A signed DPA is legally required for any personal data processing by a third party.",
      },
    },
  ],

  hints: [
    "SOC 2 Type 2 reports cover a period of time (typically 6-12 months) — always check the audit period end date, as a report older than 12 months provides limited assurance.",
    "GDPR requires written Data Processing Agreements before any personal data is shared with a processor — verbal agreements have no legal standing.",
    "Dedicated time-limited credentials for third-party access enable clean attribution and simple revocation — never share existing admin credentials with external parties.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Third-party risk management has become a critical security function — major breaches (Target, SolarWinds) originated from vendor access. Security professionals who understand vendor assessment, contractual controls, and access provisioning are essential in enterprise security programs.",
  toolRelevance: [
    "OneTrust / BitSight (vendor risk management)",
    "SecurityScorecard",
    "SOC 2 Report Review Checklist",
    "CAIQ (Cloud Security Alliance questionnaire)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
