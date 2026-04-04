import type { LabManifest } from "../../types/manifest";

export const hipaaTechnicalSafeguardsLab: LabManifest = {
  schemaVersion: "1.1",
  id: "hipaa-technical-safeguards",
  version: 1,
  title: "HIPAA Technical Safeguards Audit",

  tier: "advanced",
  track: "vulnerability-hardening",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["hipaa", "phi", "healthcare-security", "technical-safeguards", "compliance", "access-controls"],

  description:
    "Audit and configure HIPAA Technical Safeguards (45 CFR 164.312) for a healthcare application — covering access controls, audit controls, integrity controls, and transmission security for Protected Health Information.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify gaps in HIPAA Technical Safeguard implementation for healthcare systems",
    "Configure access controls, audit logging, and encryption to meet HIPAA requirements",
    "Apply the minimum necessary standard to PHI access controls",
  ],
  sortOrder: 690,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "hipaa-001",
      title: "Access Control Technical Safeguards",
      description:
        "Configure access controls for the Electronic Health Record system to meet HIPAA Technical Safeguard requirements under 45 CFR 164.312(a)(1).",
      targetSystem: "EHR System — PatientRecord Pro v4.2",
      items: [
        {
          id: "unique-user-id",
          label: "User Authentication Method",
          detail: "Controls how clinical staff authenticate to the EHR system.",
          currentState: "shared-department-credentials",
          correctState: "unique-user-ids-mfa",
          states: ["shared-department-credentials", "unique-user-ids-only", "unique-user-ids-mfa"],
          rationaleId: "rat-unique-id",
        },
        {
          id: "automatic-logoff",
          label: "Automatic Session Timeout",
          detail: "Controls when idle sessions are automatically terminated.",
          currentState: "never",
          correctState: "15-minutes",
          states: ["never", "60-minutes", "15-minutes"],
          rationaleId: "rat-timeout",
        },
        {
          id: "phi-access-scope",
          label: "PHI Access Scope (Minimum Necessary)",
          detail: "Controls which patient records each role can access.",
          currentState: "all-patients-all-roles",
          correctState: "role-based-treating-provider",
          states: ["all-patients-all-roles", "department-only", "role-based-treating-provider"],
          rationaleId: "rat-minimum-necessary",
        },
        {
          id: "emergency-access",
          label: "Emergency Access Procedure",
          detail: "Controls whether break-glass emergency access to PHI exists for urgent situations.",
          currentState: "no-procedure",
          correctState: "break-glass-audited",
          states: ["no-procedure", "supervisor-approval", "break-glass-audited"],
          rationaleId: "rat-emergency",
        },
      ],
      rationales: [
        { id: "rat-unique-id", text: "HIPAA Req 164.312(a)(2)(i) requires unique user identification — shared departmental credentials make it impossible to attribute PHI access to an individual, violating both access control and audit requirements. MFA is strongly recommended given the sensitivity of PHI." },
        { id: "rat-timeout", text: "HIPAA 164.312(a)(2)(iii) requires automatic logoff. Clinical workstations are frequently left unattended. 15-minute timeout prevents unauthorized PHI access from unattended sessions (a leading breach vector in healthcare)." },
        { id: "rat-minimum-necessary", text: "The HIPAA minimum necessary standard (164.502(b)) requires limiting PHI access to the minimum needed for the individual's role. A billing clerk doesn't need access to all clinical notes; a nurse doesn't need records for patients outside their unit." },
        { id: "rat-emergency", text: "HIPAA 164.312(a)(2)(ii) requires an emergency access procedure — a way for authorized users to access PHI when normal access controls fail (system outage, emergency). Break-glass access with immediate audit notification satisfies this requirement." },
      ],
      feedback: {
        perfect: "Access controls compliant: unique IDs with MFA, 15-minute timeout, role-based minimum necessary access, and emergency break-glass procedure.",
        partial: "Shared credentials or all-patient access remain. HIPAA requires unique user identification and minimum necessary PHI access as mandatory standards.",
        wrong: "Shared departmental credentials fundamentally violate HIPAA — you cannot attribute PHI access to an individual or detect unauthorized access without unique user IDs.",
      },
    },
    {
      type: "toggle-config",
      id: "hipaa-002",
      title: "Audit Controls and Activity Logging",
      description:
        "Configure audit logging for the EHR system to meet HIPAA Audit Control requirements under 45 CFR 164.312(b).",
      targetSystem: "EHR Audit Logging — PatientRecord Pro",
      items: [
        {
          id: "audit-scope",
          label: "PHI Access Audit Logging",
          detail: "Controls which PHI access events are logged.",
          currentState: "writes-only",
          correctState: "all-reads-writes-deletes",
          states: ["no-logging", "writes-only", "all-reads-writes-deletes"],
          rationaleId: "rat-audit-scope",
        },
        {
          id: "audit-retention",
          label: "Audit Log Retention Period",
          detail: "Controls how long PHI access audit logs are retained.",
          currentState: "30-days",
          correctState: "6-years",
          states: ["30-days", "1-year", "6-years"],
          rationaleId: "rat-retention",
        },
        {
          id: "audit-tampering",
          label: "Audit Log Integrity Protection",
          detail: "Controls whether audit logs can be modified or deleted by system administrators.",
          currentState: "admin-can-modify",
          correctState: "write-once-immutable",
          states: ["admin-can-modify", "write-once-immutable"],
          rationaleId: "rat-tampering",
        },
        {
          id: "audit-review",
          label: "Regular Audit Log Review",
          detail: "Controls whether PHI access audit logs are periodically reviewed.",
          currentState: "no-review-process",
          correctState: "monthly-anomaly-review",
          states: ["no-review-process", "annual-only", "monthly-anomaly-review"],
          rationaleId: "rat-review",
        },
      ],
      rationales: [
        { id: "rat-audit-scope", text: "HIPAA 164.312(b) requires recording activity in systems containing PHI. Read-only audit logging is insufficient — the most common insider threat is unauthorized PHI reading (data snooping on celebrity patients, looking up neighbors). All reads, writes, and deletes must be logged." },
        { id: "rat-retention", text: "HIPAA documentation requirements call for 6-year retention. For audit logs specifically, this allows investigation of incidents that may be discovered years after they occurred — a common scenario with insider threat and delayed breach discovery." },
        { id: "rat-tampering", text: "Audit logs that can be modified by administrators are not reliable for compliance or forensic purposes. Write-once immutable storage (WORM) ensures that audit records cannot be altered to conceal unauthorized PHI access." },
        { id: "rat-review", text: "Having audit logs without reviewing them provides no security value. Monthly anomaly review (looking for unusual access patterns — bulk downloads, off-hours access, access to out-of-care patients) is essential for detecting insider threats." },
      ],
      feedback: {
        perfect: "Audit controls complete: all-access logging, 6-year retention, immutable storage, and monthly review process.",
        partial: "Write-only logging or short retention periods leave significant compliance gaps. PHI read access is the most common HIPAA violation vector.",
        wrong: "30-day retention and writes-only logging leave the organization unable to detect or investigate the most common HIPAA violations. 6-year retention and all-access logging are required.",
      },
    },
    {
      type: "toggle-config",
      id: "hipaa-003",
      title: "Transmission Security and Encryption",
      description:
        "Configure encryption and transmission security controls for PHI in transit and at rest, meeting HIPAA Technical Safeguard requirements under 45 CFR 164.312(e)(1).",
      targetSystem: "PHI Transmission and Storage Encryption",
      items: [
        {
          id: "phi-transit",
          label: "PHI in Transit Encryption",
          detail: "Controls encryption for PHI transmitted over networks.",
          currentState: "http-allowed",
          correctState: "tls-1.2-required",
          states: ["http-allowed", "tls-1.2-required"],
          rationaleId: "rat-transit",
        },
        {
          id: "phi-at-rest",
          label: "PHI at Rest Encryption",
          detail: "Controls encryption for PHI stored in databases and file systems.",
          currentState: "unencrypted",
          correctState: "aes-256-encrypted",
          states: ["unencrypted", "aes-128-encrypted", "aes-256-encrypted"],
          rationaleId: "rat-rest",
        },
        {
          id: "backup-encryption",
          label: "Backup Encryption",
          detail: "Controls whether database and file backups are encrypted.",
          currentState: "unencrypted-backups",
          correctState: "encrypted-separate-key",
          states: ["unencrypted-backups", "same-key-as-production", "encrypted-separate-key"],
          rationaleId: "rat-backup",
        },
        {
          id: "email-phi",
          label: "Email PHI Transmission",
          detail: "Controls how PHI is transmitted via email to patients and providers.",
          currentState: "standard-email-allowed",
          correctState: "secure-messaging-portal",
          states: ["standard-email-allowed", "encrypted-email-required", "secure-messaging-portal"],
          rationaleId: "rat-email",
        },
      ],
      rationales: [
        { id: "rat-transit", text: "HIPAA 164.312(e)(2)(ii) requires encryption of PHI in transit 'wherever deemed appropriate' — given that unencrypted PHI transmission is a leading breach vector, TLS 1.2+ is required for all PHI transmission. HTTP for PHI is never appropriate in 2024." },
        { id: "rat-rest", text: "PHI at rest encryption protects against physical theft of hardware, cloud storage breaches, and insider access to raw storage. AES-256 is NIST-recommended for sensitive health data. Without encryption, a stolen laptop or breached database becomes an instant HIPAA violation." },
        { id: "rat-backup", text: "Unencrypted backups are a primary source of healthcare breaches — backup media is frequently lost or stolen. Separate encryption keys for backups ensure that a production key compromise doesn't also expose all backup data." },
        { id: "rat-email", text: "Standard email is unencrypted in transit and stored in provider systems outside HIPAA scope. Secure patient messaging portals keep PHI within the organization's controlled environment and provide access logging." },
      ],
      feedback: {
        perfect: "Transmission security complete: TLS required in transit, AES-256 at rest, encrypted backups with separate keys, and secure messaging portal for patient communication.",
        partial: "Unencrypted backups or HTTP-allowed PHI transmission remain. Backup encryption is consistently the most overlooked transmission security control in healthcare.",
        wrong: "HTTP-allowed and unencrypted PHI storage violate HIPAA Technical Safeguards. These represent immediate breach risk — any network intercept or storage access exposes patient data.",
      },
    },
  ],

  hints: [
    "HIPAA requires unique user identification (164.312(a)(2)(i)) — shared departmental credentials are a mandatory violation, not just a best practice gap.",
    "PHI audit logs must be retained for 6 years — 30-day or 1-year retention makes it impossible to investigate breaches discovered after that window.",
    "Backup encryption is addressed separately from production encryption — always use separate keys, and verify that backup encryption is tested and working, not just configured.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "HIPAA violations can result in fines up to $1.9M per violation category per year. Healthcare security is a growing specialty — understanding the specific technical safeguard requirements makes security engineers much more effective in clinical environments.",
  toolRelevance: [
    "HIPAA Security Rule Guidance (HHS.gov)",
    "Protenus (PHI access analytics)",
    "Virtru (email encryption for PHI)",
    "AWS GovCloud / Azure Healthcare APIs (HIPAA-eligible services)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
