import type { LabManifest } from "../../types/manifest";

export const s3BucketExposureLab: LabManifest = {
  schemaVersion: "1.1",
  id: "s3-bucket-exposure",
  version: 1,
  title: "AWS S3 Bucket Exposure",

  tier: "intermediate",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "s3", "cloud-security", "data-exposure", "iam", "bucket-policy"],

  description:
    "Audit AWS S3 bucket configurations to prevent data exposure by reviewing access controls, encryption settings, logging, and public access blocks.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify S3 bucket misconfigurations that lead to data exposure",
    "Configure appropriate access controls and encryption for S3 buckets",
    "Implement logging and monitoring for cloud storage assets",
  ],
  sortOrder: 340,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "s3-001",
      title: "Customer Data Bucket",
      description:
        "The customer data bucket was flagged by AWS Access Analyzer for public access. Review and fix all settings to protect sensitive PII.",
      targetSystem: "s3://acme-customer-data",
      items: [
        {
          id: "public-access",
          label: "Block All Public Access",
          detail: "Master toggle that prevents any public access to the bucket regardless of individual policies.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-public",
        },
        {
          id: "encryption",
          label: "Server-Side Encryption (SSE-S3)",
          detail: "Encrypts objects at rest using AWS-managed keys.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-encrypt",
        },
        {
          id: "logging",
          label: "Access Logging",
          detail: "Records all requests made to the bucket for audit and forensic purposes.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-logging",
        },
        {
          id: "versioning",
          label: "Bucket Versioning",
          detail: "Maintains previous versions of objects to protect against accidental deletion or overwrites.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-versioning",
        },
        {
          id: "bucket-policy",
          label: "Bucket Policy",
          detail: "The resource-based policy controlling access to the bucket.",
          currentState: "public-read",
          correctState: "private",
          states: ["public-read", "public-read-write", "private", "authenticated-users"],
          rationaleId: "rat-policy",
        },
      ],
      rationales: [
        { id: "rat-public", text: "Block Public Access is the most important control — it overrides any policy that might grant public access." },
        { id: "rat-encrypt", text: "Customer PII must be encrypted at rest to meet compliance requirements and protect against storage-level breaches." },
        { id: "rat-logging", text: "Access logs are essential for detecting unauthorized access and supporting incident investigation." },
        { id: "rat-versioning", text: "Versioning protects against ransomware and accidental data loss by maintaining recoverable object history." },
        { id: "rat-policy", text: "A public-read policy on a customer data bucket is a critical data breach waiting to happen." },
      ],
      feedback: {
        perfect: "Customer data bucket fully secured. All public access blocked, encryption enabled, logging active, and versioning protecting against data loss.",
        partial: "Some settings are still insecure. A customer data bucket needs ALL protections — public access block, encryption, logging, and versioning.",
        wrong: "Critical misconfigurations remain. Public access to customer PII is one of the most common causes of major data breaches.",
      },
    },
    {
      type: "toggle-config",
      id: "s3-002",
      title: "Static Website Hosting Bucket",
      description:
        "The marketing website bucket serves public content via S3 static website hosting. Some settings should be public, but others need tightening.",
      targetSystem: "s3://acme-marketing-site",
      items: [
        {
          id: "public-access",
          label: "Block All Public Access",
          detail: "Controls whether the bucket contents can be accessed publicly.",
          currentState: "disabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-website-public",
        },
        {
          id: "cloudfront",
          label: "CloudFront Distribution",
          detail: "CDN distribution that serves content with caching, DDoS protection, and custom SSL.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-cdn",
        },
        {
          id: "direct-access",
          label: "Direct S3 URL Access",
          detail: "Controls whether users can access the S3 bucket URL directly, bypassing CloudFront.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-direct",
        },
        {
          id: "logging",
          label: "Access Logging",
          detail: "Records all requests for traffic analysis and anomaly detection.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-log-site",
        },
      ],
      rationales: [
        { id: "rat-website-public", text: "A public website bucket must allow public reads — this is expected and correct for static site hosting." },
        { id: "rat-cdn", text: "CloudFront adds TLS, caching, DDoS protection, and geographic restriction capabilities." },
        { id: "rat-direct", text: "Direct S3 access bypasses CloudFront security features and exposes the origin bucket URL." },
        { id: "rat-log-site", text: "Even public buckets should be logged to detect abuse, scraping, or unexpected traffic patterns." },
      ],
      feedback: {
        perfect: "Website bucket optimally configured — public content served through CloudFront with logging and no direct S3 access.",
        partial: "Close but some settings need adjustment. Even public websites benefit from CloudFront and access logging.",
        wrong: "Several settings are suboptimal. A static website should use CloudFront for security and performance.",
      },
    },
    {
      type: "toggle-config",
      id: "s3-003",
      title: "Database Backup Bucket",
      description:
        "The backup bucket stores nightly database dumps containing all company data. It needs the strongest protection possible against both external and insider threats.",
      targetSystem: "s3://acme-db-backups",
      items: [
        {
          id: "public-access",
          label: "Block All Public Access",
          detail: "Prevents any public access to backup files.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-backup-public",
        },
        {
          id: "mfa-delete",
          label: "MFA Delete",
          detail: "Requires multi-factor authentication to delete objects or change versioning state.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-mfa-del",
        },
        {
          id: "object-lock",
          label: "Object Lock (WORM)",
          detail: "Write-once-read-many protection that prevents object deletion for a retention period.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-worm",
        },
        {
          id: "replication",
          label: "Cross-Region Replication",
          detail: "Automatically replicates objects to a bucket in another AWS region for disaster recovery.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-crr",
        },
      ],
      rationales: [
        { id: "rat-backup-public", text: "Database backups with public access would expose the entire company dataset — this is a critical finding." },
        { id: "rat-mfa-del", text: "MFA Delete prevents ransomware and malicious insiders from deleting backups even with valid credentials." },
        { id: "rat-worm", text: "Object Lock provides immutable backups that cannot be encrypted or deleted by ransomware." },
        { id: "rat-crr", text: "Cross-region replication ensures backups survive a complete regional outage or account compromise." },
      ],
      feedback: {
        perfect: "Backup bucket fully hardened with immutable storage, MFA delete, cross-region replication, and no public access. This is ransomware-resistant backup architecture.",
        partial: "Some protections are missing. Backups need defense in depth — public access blocks, immutability, MFA delete, and replication together.",
        wrong: "Critical backup protections are missing. Without immutability and MFA delete, backups are vulnerable to ransomware and insider threats.",
      },
    },
  ],

  hints: [
    "Block All Public Access is the single most important S3 control for non-website buckets — it overrides everything else.",
    "Static websites need public access but should be served through CloudFront, not direct S3 URLs.",
    "Backup buckets need immutability (Object Lock) and MFA Delete to be truly ransomware-resistant.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "S3 bucket misconfigurations have caused some of the largest data breaches in history. Cloud security engineers who can audit and remediate these are in extremely high demand.",
  toolRelevance: [
    "AWS Config Rules",
    "ScoutSuite",
    "Prowler",
    "AWS IAM Access Analyzer",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
