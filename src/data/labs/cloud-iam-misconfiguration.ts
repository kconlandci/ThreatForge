import type { LabManifest } from "../../types/manifest";

export const cloudIamMisconfigurationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cloud-iam-misconfiguration",
  version: 1,
  title: "Cloud IAM Misconfiguration",

  tier: "intermediate",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "cloud-security",
    "aws",
    "iam",
    "s3",
    "misconfiguration",
    "compliance",
    "least-privilege",
  ],

  description:
    "Audit and remediate common AWS IAM misconfigurations including public S3 buckets, overprivileged roles, missing MFA on admin accounts, and overly broad cross-account trust policies.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Identify common AWS IAM misconfigurations that lead to breaches",
    "Apply least privilege to cloud IAM roles and policies",
    "Recognize the security implications of public S3 buckets",
    "Configure MFA requirements for privileged cloud accounts",
    "Understand cross-account trust relationships and their risks",
  ],
  sortOrder: 210,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "cloud-001",
      title: "Public S3 Bucket Audit",
      description:
        "AWS Config alert: S3 bucket 'acme-customer-exports' is flagged for public access. This bucket contains monthly customer data exports for the analytics team.",
      targetSystem: "s3://acme-customer-exports",
      items: [
        {
          id: "s3-public-access",
          label: "Public Access",
          detail:
            "Controls whether the bucket and its objects can be accessed publicly from the internet.",
          currentState: "Enabled (Block Public Access: OFF)",
          correctState: "Disabled (Block Public Access: ON)",
          states: [
            "Enabled (Block Public Access: OFF)",
            "Disabled (Block Public Access: ON)",
          ],
          rationaleId: "rat-public",
        },
        {
          id: "s3-bucket-policy",
          label: "Bucket Policy",
          detail:
            "Defines which AWS principals can perform which actions on the bucket and its objects.",
          currentState: 'Principal: "*" — Allow s3:*',
          correctState: "Restricted to analytics-role IAM only",
          states: [
            'Principal: "*" — Allow s3:*',
            "Restricted to analytics-role IAM only",
            "No bucket policy",
          ],
          rationaleId: "rat-policy",
        },
        {
          id: "s3-encryption",
          label: "Encryption",
          detail:
            "Server-side encryption setting for objects stored in the bucket.",
          currentState: "None",
          correctState: "SSE-S3 (AES-256)",
          states: ["None", "SSE-S3 (AES-256)", "SSE-KMS"],
          rationaleId: "rat-encrypt",
        },
        {
          id: "s3-logging",
          label: "Access Logging",
          detail:
            "Records all requests made to the bucket for audit and compliance purposes.",
          currentState: "Disabled",
          correctState: "Enabled (log to acme-s3-logs)",
          states: ["Disabled", "Enabled (log to acme-s3-logs)"],
          rationaleId: "rat-logging",
        },
      ],
      rationales: [
        {
          id: "rat-public",
          text: "Customer data must never be publicly accessible — Block Public Access prevents accidental exposure.",
        },
        {
          id: "rat-policy",
          text: "Bucket policies should follow least privilege — only the analytics IAM role needs access.",
        },
        {
          id: "rat-encrypt",
          text: "Server-side encryption protects data at rest from unauthorized physical access.",
        },
        {
          id: "rat-logging",
          text: "Access logging provides an audit trail for compliance and breach investigation.",
        },
      ],
      feedback: {
        perfect:
          "Excellent. You locked down all four controls: blocked public access, scoped the policy to the analytics role, enabled encryption, and turned on access logging. This bucket is now properly secured.",
        partial:
          "You fixed some issues, but the bucket still has security gaps. Every misconfigured setting is a potential breach vector for customer data.",
        wrong:
          "This bucket contains customer data and remains dangerously exposed. Public access, wildcard policies, no encryption, and no logging is a compliance nightmare.",
      },
    },
    {
      type: "toggle-config",
      id: "cloud-002",
      title: "Overprivileged IAM Role Remediation",
      description:
        "Security audit found IAM role 'app-backend-role' with dangerously broad permissions. This role is used by the backend API service across 3 environments.",
      targetSystem: "IAM Role: app-backend-role",
      items: [
        {
          id: "iam-actions",
          label: "Policy Actions",
          detail:
            "Defines which AWS API actions the role is allowed to perform.",
          currentState: '"Action": "*"',
          correctState: "Scoped to s3, dynamodb, sqs only",
          states: [
            '"Action": "*"',
            "Scoped to s3, dynamodb, sqs only",
            "Scoped to s3 only",
          ],
          rationaleId: "rat-actions",
        },
        {
          id: "iam-resources",
          label: "Resource Scope",
          detail:
            "Defines which AWS resources the role can access with its allowed actions.",
          currentState: '"Resource": "*"',
          correctState: "Scoped to production ARNs",
          states: [
            '"Resource": "*"',
            "Scoped to production ARNs",
            "Scoped to all ARNs in account",
          ],
          rationaleId: "rat-resources",
        },
        {
          id: "iam-mfa",
          label: "MFA for Console",
          detail:
            "Whether multi-factor authentication is required for console access using this role.",
          currentState: "Not required",
          correctState: "Required",
          states: ["Not required", "Required"],
          rationaleId: "rat-mfa",
        },
        {
          id: "iam-cloudtrail",
          label: "CloudTrail Logging",
          detail:
            "Whether API calls made by this role are logged in CloudTrail.",
          currentState: "Disabled for this role",
          correctState: "Enabled",
          states: ["Disabled for this role", "Enabled"],
          rationaleId: "rat-cloudtrail",
        },
      ],
      rationales: [
        {
          id: "rat-actions",
          text: "Wildcard actions grant the role access to every AWS service — scope to only the services the app actually uses.",
        },
        {
          id: "rat-resources",
          text: "Resource wildcards mean the role can access any resource in the account — limit to specific ARNs.",
        },
        {
          id: "rat-mfa",
          text: "MFA on console access prevents credential theft from becoming full compromise.",
        },
        {
          id: "rat-cloudtrail",
          text: "CloudTrail logging for IAM roles creates an audit trail of all API calls.",
        },
      ],
      feedback: {
        perfect:
          "Well done. You scoped the actions to the three services the app uses, limited resources to production ARNs, required MFA, and enabled logging. This role now follows least privilege.",
        partial:
          "You reduced some permissions, but the role is still overprivileged. Every wildcard left in place is a potential blast radius for a compromised credential.",
        wrong:
          "This role has god-mode access to your entire AWS account. Wildcard actions and resources mean a single compromised credential can destroy everything.",
      },
    },
    {
      type: "toggle-config",
      id: "cloud-003",
      title: "Admin Account MFA Enforcement",
      description:
        "Compliance scan detected that the AWS root account and 2 IAM admin users lack multi-factor authentication. This is a critical finding for your upcoming SOC 2 audit.",
      targetSystem: "AWS Account: acme-prod (112233445566)",
      items: [
        {
          id: "root-mfa",
          label: "Root Account MFA",
          detail:
            "Multi-factor authentication setting for the AWS root account, which has unrestricted access to all resources.",
          currentState: "Disabled",
          correctState: "Hardware Token MFA",
          states: [
            "Disabled",
            "Virtual MFA (authenticator app)",
            "Hardware Token MFA",
          ],
          rationaleId: "rat-root-mfa",
        },
        {
          id: "admin-mfa",
          label: "Admin Users MFA",
          detail:
            "MFA policy for IAM users with administrative privileges.",
          currentState: "Optional",
          correctState: "Required (enforced by policy)",
          states: ["Optional", "Required (enforced by policy)"],
          rationaleId: "rat-admin-mfa",
        },
        {
          id: "admin-keys",
          label: "Admin Access Keys",
          detail:
            "Static API access keys associated with admin user accounts for programmatic access.",
          currentState: "Active (last used 6 months ago)",
          correctState: "Deleted — use IAM roles instead",
          states: [
            "Active (last used 6 months ago)",
            "Deleted — use IAM roles instead",
            "Rotated (new keys)",
          ],
          rationaleId: "rat-keys",
        },
        {
          id: "password-policy",
          label: "Password Policy",
          detail:
            "Minimum password requirements for IAM user console access.",
          currentState: "Minimum 8 characters",
          correctState: "Minimum 14 characters + complexity",
          states: [
            "Minimum 8 characters",
            "Minimum 14 characters + complexity",
            "Minimum 12 characters",
          ],
          rationaleId: "rat-password",
        },
      ],
      rationales: [
        {
          id: "rat-root-mfa",
          text: "Root account must use hardware MFA — it's the highest-privilege account and cannot be restricted by IAM policies.",
        },
        {
          id: "rat-admin-mfa",
          text: "Enforced MFA policy ensures no admin can opt out — optional MFA is effectively no MFA.",
        },
        {
          id: "rat-keys",
          text: "Static access keys on admin accounts are persistent credentials that can be stolen — use temporary role credentials instead.",
        },
        {
          id: "rat-password",
          text: "Strong password policies reduce the risk of brute force and credential stuffing attacks.",
        },
      ],
      feedback: {
        perfect:
          "Excellent. Hardware MFA on root, enforced MFA for admins, deleted static keys, and strong password policy. Your SOC 2 auditor will be satisfied.",
        partial:
          "Some improvements were made, but gaps remain. Every missing control is a finding on your SOC 2 audit and a potential breach vector.",
        wrong:
          "Critical failure. Admin accounts without MFA and with stale access keys are the most common path to full AWS account compromise.",
      },
    },
    {
      type: "toggle-config",
      id: "cloud-004",
      title: "Cross-Account Role Trust Policy",
      description:
        "The shared-services role allows other AWS accounts to assume it for cross-account access. A security review found the trust policy is overly broad.",
      targetSystem: "IAM Role: shared-services-xaccount",
      items: [
        {
          id: "trust-principal",
          label: "Trust Policy Principal",
          detail:
            "Defines which AWS accounts or entities are allowed to assume this role.",
          currentState: '"Principal": {"AWS": "*"}',
          correctState:
            "Specific account IDs only (111111111111, 222222222222)",
          states: [
            '"Principal": {"AWS": "*"}',
            "Specific account IDs only (111111111111, 222222222222)",
          ],
          rationaleId: "rat-trust",
        },
        {
          id: "session-duration",
          label: "Session Duration",
          detail:
            "Maximum time a session can remain active after assuming this role.",
          currentState: "12 hours",
          correctState: "1 hour",
          states: ["12 hours", "4 hours", "1 hour"],
          rationaleId: "rat-session",
        },
        {
          id: "external-id",
          label: "External ID",
          detail:
            "An additional secret that must be provided when assuming the role, preventing confused deputy attacks.",
          currentState: "Not required",
          correctState: "Required",
          states: ["Not required", "Required"],
          rationaleId: "rat-external-id",
        },
        {
          id: "permissions-boundary",
          label: "Permissions Boundary",
          detail:
            "A managed policy that sets the maximum permissions the role can have, regardless of its identity-based policies.",
          currentState: "None",
          correctState: "SharedServicesBoundary policy",
          states: [
            "None",
            "SharedServicesBoundary policy",
            "AdministratorAccess boundary",
          ],
          rationaleId: "rat-boundary",
        },
      ],
      rationales: [
        {
          id: "rat-trust",
          text: "Trust policies with wildcard principals allow ANY AWS account to assume the role — restrict to known partner accounts.",
        },
        {
          id: "rat-session",
          text: "Shorter session durations limit the damage window if credentials are compromised.",
        },
        {
          id: "rat-external-id",
          text: "External ID prevents confused deputy attacks where a third party tricks your account into granting access.",
        },
        {
          id: "rat-boundary",
          text: "Permissions boundaries cap the maximum privileges a role can have regardless of its policies.",
        },
      ],
      feedback: {
        perfect:
          "Locked down. You restricted the trust to specific accounts, shortened the session, required external ID, and added a permissions boundary. This cross-account role is now properly secured.",
        partial:
          "Some controls are in place, but the role still has excessive trust or missing safeguards. Each gap is a potential entry point for an unauthorized account.",
        wrong:
          "A wildcard trust policy means any AWS account on Earth can assume this role. Combined with long sessions and no boundaries, this is an open door to your infrastructure.",
      },
    },
  ],

  hints: [
    "In AWS, 'Principal: *' in a bucket or trust policy means ANYONE on the internet can access it. This is almost never correct.",
    "Wildcard permissions (Action: *, Resource: *) give a role god-mode access to your entire AWS account. Always scope to specific services and resources.",
    "The root account is special in AWS — it can't be restricted by IAM policies, so hardware MFA is the only protection.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Cloud misconfiguration is the leading cause of data breaches in AWS environments. Cloud security engineers who can audit IAM policies and fix overprivileged roles are among the most in-demand professionals in cybersecurity.",
  toolRelevance: [
    "AWS IAM Access Analyzer",
    "Prowler (AWS security auditing)",
    "AWS Config Rules",
    "ScoutSuite (multi-cloud audit)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
