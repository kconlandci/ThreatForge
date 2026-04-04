import type { LabManifest } from "../../types/manifest";

export const apiKeyExposureResponseLab: LabManifest = {
  schemaVersion: "1.1",
  id: "api-key-exposure-response",
  version: 1,
  title: "API Key Exposure Response",

  tier: "intermediate",
  track: "identity-access",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "api-keys",
    "credential-exposure",
    "secret-management",
    "incident-response",
    "github",
    "dlp",
  ],

  description:
    "Respond to API key and credential exposure incidents across multiple platforms. Assess exposure severity, determine immediate actions, and address systemic issues like shared credentials and DLP gaps.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Respond to credential exposure incidents with appropriate urgency",
    "Prioritize actions based on the scope and duration of exposure",
    "Understand why credential rotation alone is insufficient without access auditing",
    "Recognize systemic issues (shared credentials, DLP gaps) beyond the immediate incident",
    "Apply proportional response based on credential status and exposure context",
  ],
  sortOrder: 270,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "apikey-001",
      title: "AWS Access Keys in Public Repository",
      context:
        "GitHub's secret scanning bot just sent an alert: AWS access keys belonging to your organization were found in a public repository. The commit was pushed 45 minutes ago by a junior developer.",
      displayFields: [
        {
          label: "Repository",
          value: "github.com/dev-jlee/side-project (PUBLIC)",
          emphasis: "critical",
        },
        {
          label: "Key Type",
          value: "AWS IAM Access Key (AKIA...)",
          emphasis: "critical",
        },
        {
          label: "Key Owner",
          value: "iam-user: deploy-staging-ci",
          emphasis: "warn",
        },
        {
          label: "Last Key Usage",
          value: "23 minutes ago — EC2 DescribeInstances, S3 ListBuckets",
          emphasis: "critical",
        },
        {
          label: "Commit Age",
          value: "45 minutes",
          emphasis: "warn",
        },
      ],
      evidence: [
        "The key has permissions: EC2 full, S3 full, IAM read-only",
        "CloudTrail shows API calls from IP 203.0.113.42 (not your org) starting 20 minutes ago",
      ],
      actions: [
        {
          id: "REVOKE_SCAN",
          label: "Revoke keys via IAM + scan CloudTrail for unauthorized usage",
          color: "red",
        },
        {
          id: "DELETE_COMMIT",
          label: "Delete the commit from GitHub first",
          color: "orange",
        },
        {
          id: "NOTIFY_DEV",
          label: "Notify the developer and have them rotate",
          color: "yellow",
        },
        {
          id: "FILE_TICKET",
          label: "File a ticket for next sprint",
          color: "blue",
        },
      ],
      correctActionId: "REVOKE_SCAN",
      rationales: [
        {
          id: "rat-revoke",
          text: "Immediate revocation stops active exploitation — CloudTrail already shows unauthorized API calls from an external IP. Audit reveals the full scope of compromise.",
        },
        {
          id: "rat-delete",
          text: "Deleting the commit doesn't revoke the already-exposed keys — the credentials are compromised regardless of whether the commit exists.",
        },
        {
          id: "rat-notify",
          text: "Developer notification delays response while an attacker is actively using the keys right now.",
        },
        {
          id: "rat-ticket",
          text: "Sprint planning is wildly inappropriate for active credential compromise with evidence of unauthorized usage.",
        },
      ],
      correctRationaleId: "rat-revoke",
      feedback: {
        perfect:
          "Correct. The CloudTrail evidence shows active exploitation from an external IP. Immediate key revocation stops the bleeding, and the CloudTrail audit reveals exactly what the attacker accessed during the 20-minute window.",
        partial:
          "You recognized the threat but chose an incomplete response. With active unauthorized API calls in progress, every minute of delay expands the blast radius.",
        wrong:
          "AWS keys are actively being used by an external IP address. This is not a future risk — it's an active compromise. Revoke immediately and audit CloudTrail to determine what was accessed.",
      },
    },
    {
      type: "action-rationale",
      id: "apikey-002",
      title: "Slack Bot Token in Public Jira Comment",
      context:
        "A customer reported finding a Slack bot token in a publicly visible Jira issue comment. The token has read access to all Slack channels in your workspace. The comment was posted 3 days ago.",
      displayFields: [
        {
          label: "Token Type",
          value: "Slack Bot Token (xoxb-...)",
          emphasis: "critical",
        },
        {
          label: "Permissions",
          value: "channels:read, channels:history, users:read",
          emphasis: "critical",
        },
        {
          label: "Exposure Duration",
          value: "3 days",
          emphasis: "warn",
        },
        {
          label: "Jira Visibility",
          value: "Public issue — indexed by Google",
          emphasis: "critical",
        },
        {
          label: "Channel Count",
          value: "147 channels accessible",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "ROTATE_AUDIT",
          label: "Rotate token + audit Slack access logs for exposure period",
          color: "red",
        },
        {
          id: "ROTATE_ONLY",
          label: "Just rotate the token",
          color: "orange",
        },
        {
          id: "DELETE_COMMENT",
          label: "Delete the Jira comment and monitor",
          color: "yellow",
        },
        {
          id: "DISABLE_BOT",
          label: "Disable the bot entirely",
          color: "blue",
        },
      ],
      correctActionId: "ROTATE_AUDIT",
      rationales: [
        {
          id: "rat-rotate-audit",
          text: "Rotation stops future access, but 3 days of exposure means you must check if channel data was exfiltrated — read access to 147 channels could expose significant internal communications.",
        },
        {
          id: "rat-rotate-only",
          text: "Rotating without auditing misses potential data loss that occurred over the 3-day exposure window.",
        },
        {
          id: "rat-delete",
          text: "Deleting the Jira comment doesn't revoke the token — it's already been public and indexed by Google.",
        },
        {
          id: "rat-disable",
          text: "Disabling the bot disrupts legitimate workflows and doesn't address whether data was already exfiltrated.",
        },
      ],
      correctRationaleId: "rat-rotate-audit",
      feedback: {
        perfect:
          "Correct. Three days of public exposure to 147 channels demands both rotation and a thorough access log review. The audit determines whether this was an exposure or an actual breach.",
        partial:
          "You addressed part of the problem but missed a critical step. With 3 days of exposure, you need to determine whether anyone actually used the token to read channel data.",
        wrong:
          "A Slack bot token with read access to 147 channels was publicly exposed for 3 days on a Google-indexed page. Both rotation and access auditing are essential to understand the full impact.",
      },
    },
    {
      type: "action-rationale",
      id: "apikey-003",
      title: "Production Database Credentials via Nginx Misconfiguration",
      context:
        "A penetration tester found that your staging server's .env file is accessible via nginx directory listing at staging.acmecorp.com/.env. The file contains database credentials — and staging shares credentials with production.",
      displayFields: [
        {
          label: "Exposed File",
          value: "staging.acmecorp.com/.env (publicly accessible)",
          emphasis: "critical",
        },
        {
          label: "DB Credentials",
          value: "PROD_DB_HOST, PROD_DB_USER, PROD_DB_PASS",
          emphasis: "critical",
        },
        {
          label: "Shared Credentials",
          value: "Staging and production use identical DB credentials",
          emphasis: "critical",
        },
        {
          label: "Database",
          value: "PostgreSQL — 2.3M customer records, PCI-scoped",
          emphasis: "warn",
        },
        {
          label: "Discovery",
          value: "Found during authorized pentest, not known public",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "ROTATE_FIX",
          label: "Rotate production DB credentials immediately + fix nginx",
          color: "red",
        },
        {
          id: "FIX_NGINX",
          label: "Fix nginx config first to stop exposure",
          color: "orange",
        },
        {
          id: "ROTATE_STAGING",
          label: "Rotate staging credentials only — production isn't directly exposed",
          color: "yellow",
        },
        {
          id: "TICKET",
          label: "Open a security ticket for scheduled remediation",
          color: "blue",
        },
      ],
      correctActionId: "ROTATE_FIX",
      rationales: [
        {
          id: "rat-rotate-fix",
          text: "Shared credentials mean staging exposure equals production exposure — rotate production creds first because that's where the sensitive data lives, then fix nginx.",
        },
        {
          id: "rat-nginx-first",
          text: "Fixing nginx first stops new exposure but doesn't address already-compromised credentials that may have been harvested before the pentest discovered them.",
        },
        {
          id: "rat-staging-only",
          text: "Rotating only staging credentials ignores the shared credential problem — production uses the same password.",
        },
        {
          id: "rat-ticket",
          text: "Scheduled remediation is too slow for exposed PCI-scoped database credentials serving 2.3 million customer records.",
        },
      ],
      correctRationaleId: "rat-rotate-fix",
      feedback: {
        perfect:
          "Correct. Shared credentials between staging and production mean the .env exposure compromises the production database directly. Rotate production credentials first to protect 2.3M customer records, then fix the nginx misconfiguration.",
        partial:
          "You identified part of the problem but missed the shared credential implication. Staging and production use the same credentials — any action that doesn't rotate production creds leaves the PCI-scoped database exposed.",
        wrong:
          "The staging .env file contains production database credentials. With shared credentials, staging exposure IS production exposure. Immediate rotation of production credentials is required to protect 2.3M PCI-scoped customer records.",
      },
    },
    {
      type: "action-rationale",
      id: "apikey-004",
      title: "API Keys Found in Employee's Personal Cloud Storage",
      context:
        "During offboarding, IT discovered that a departing employee's personal iCloud backup contains files with API keys from 8 months ago. Your organization rotates API keys every 6 months.",
      displayFields: [
        {
          label: "Employee",
          value: "R. Martinez — DevOps Engineer (last day Friday)",
          emphasis: "normal",
        },
        {
          label: "Keys Found",
          value: "AWS, Datadog, PagerDuty API keys from 8 months ago",
          emphasis: "warn",
        },
        {
          label: "Key Rotation",
          value: "All keys were rotated 6 months ago per policy",
          emphasis: "normal",
        },
        {
          label: "Key Status",
          value: "All found keys show as 'Inactive' in respective consoles",
          emphasis: "normal",
        },
        {
          label: "DLP Concern",
          value: "Keys reached personal cloud storage — DLP gap",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "VERIFY_DOCUMENT",
          label: "Verify keys are inactive + document finding + review DLP policy",
          color: "green",
        },
        {
          id: "REVOKE_ALL",
          label: "Revoke all current keys as precaution",
          color: "red",
        },
        {
          id: "REPORT_LEGAL",
          label: "Report to legal for potential data theft",
          color: "orange",
        },
        {
          id: "CLOSE",
          label: "Close — keys are already rotated and inactive",
          color: "blue",
        },
      ],
      correctActionId: "VERIFY_DOCUMENT",
      rationales: [
        {
          id: "rat-verify",
          text: "The rotated keys are expired, but the real finding is the DLP gap — API keys should never reach personal storage, and this pattern may exist for other employees.",
        },
        {
          id: "rat-revoke",
          text: "Revoking current active keys is disruptive and unnecessary when the exposed ones are confirmed inactive.",
        },
        {
          id: "rat-legal",
          text: "Legal action for expired keys that were properly rotated is disproportionate — this looks like negligence, not malice.",
        },
        {
          id: "rat-close",
          text: "Closing without addressing the DLP gap ignores the systemic issue — if one employee's personal storage had keys, others likely do too.",
        },
      ],
      correctRationaleId: "rat-verify",
      feedback: {
        perfect:
          "Excellent. You recognized that the immediate risk is low (keys are inactive) but the systemic risk is significant. The DLP gap that allowed API keys to reach personal cloud storage needs policy remediation to prevent future occurrences.",
        partial:
          "You addressed one aspect but missed the bigger picture. The keys themselves are expired, but the fact that they reached personal storage reveals a DLP gap that affects the entire organization.",
        wrong:
          "The keys are already inactive due to rotation policy, so the immediate risk is contained. But closing this without addressing WHY keys reached personal cloud storage ignores a systemic DLP gap that likely affects other employees.",
      },
    },
  ],

  hints: [
    "When credentials are exposed, revoke first, investigate after. Every minute of delay is another minute an attacker can use the credentials.",
    "Shared credentials between environments mean that a staging exposure is a production exposure. Always assess the full blast radius.",
    "Even expired or rotated credentials finding their way to personal storage indicates a DLP gap that needs systemic remediation.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Credential exposure response is one of the most time-critical security operations. The average time for attackers to find and exploit exposed AWS keys on GitHub is under 5 minutes. Speed of response directly determines whether an exposure becomes a breach.",
  toolRelevance: [
    "GitHub Secret Scanning",
    "AWS CloudTrail",
    "HashiCorp Vault (secrets management)",
    "TruffleHog / GitLeaks (secret detection)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
