import type { LabManifest } from "../../types/manifest";

export const cloudLoggingInvestigationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cloud-logging-investigation",
  version: 1,
  title: "Cloud Logging Investigation",

  tier: "intermediate",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "cloud-security",
    "cloudtrail",
    "azure",
    "aws",
    "investigation",
    "iam",
    "logging",
  ],

  description:
    "Investigate suspicious cloud API activity using audit logs from AWS CloudTrail and Azure Activity Logs. Assess compromised credentials, unauthorized resource creation, audit trail disruption, and misconfigured access policies.",
  estimatedMinutes: 18,
  learningObjectives: [
    "Investigate suspicious cloud API activity using audit logs",
    "Identify compromised cloud credentials from behavioral indicators",
    "Assess cloud resource creation events for legitimacy vs. abuse",
    "Recognize the critical importance of audit trail integrity",
    "Apply proportional response to cloud security events based on context",
  ],
  sortOrder: 305,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "cloudlog-001",
      title: "New IAM User Created While Admin on PTO",
      objective:
        "CloudTrail alert: a new IAM user with console access was created. The admin who created it is on PTO. Investigate.",
      investigationData: [
        {
          id: "cloudtrail-event",
          label: "CloudTrail Event",
          content:
            "CreateUser API call by admin-jpark at 3:42 AM. New user: temp-analyst-2026, granted Console access and AdministratorAccess policy.",
          isCritical: true,
        },
        {
          id: "admin-status",
          label: "Admin Status",
          content:
            "J. Park on PTO in Bali since March 18. VPN logs show no connection from their known devices.",
        },
        {
          id: "source-ip",
          label: "Source IP",
          content:
            "API call originated from 103.74.19.200 — geolocated to Lagos, Nigeria, not Bali.",
          isCritical: true,
        },
        {
          id: "account-activity",
          label: "Account Activity",
          content:
            "admin-jpark account: 3 failed MFA attempts at 3:38 AM, then successful auth at 3:40 AM via backup codes.",
        },
      ],
      actions: [
        {
          id: "disable-both-escalate",
          label:
            "Disable both accounts and escalate — admin credentials compromised",
          color: "red",
        },
        {
          id: "disable-new-only",
          label: "Disable only the new user",
        },
        {
          id: "contact-admin",
          label: "Contact J. Park to verify",
        },
        {
          id: "monitor-new-user",
          label: "Monitor the new user's activity",
        },
      ],
      correctActionId: "disable-both-escalate",
      rationales: [
        {
          id: "rat-compromise",
          text: "Admin on PTO + wrong geolocation + failed MFA + backup code usage = compromised admin credentials — disable both the compromised admin and the attacker-created user immediately.",
        },
        {
          id: "rat-partial",
          text: "Disabling only the new user leaves the compromised admin account active for the attacker to create more users or escalate privileges.",
        },
        {
          id: "rat-contact",
          text: "Contacting J. Park delays response to an active compromise — the geolocation and MFA evidence already confirms this isn't the real admin.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring gives the attacker more time with admin access — they already have AdministratorAccess through the new user account.",
        },
      ],
      correctRationaleId: "rat-compromise",
      feedback: {
        perfect:
          "Correct. The combination of PTO status, wrong geolocation, failed MFA, and backup code authentication is a clear indicator of credential compromise. Disabling both accounts stops the attacker immediately.",
        partial:
          "You identified part of the threat but didn't fully contain it. Both the compromised admin account and the attacker-created user need to be disabled simultaneously.",
        wrong: "This response leaves the attacker with active access. The evidence overwhelmingly indicates credential compromise — immediate containment is required.",
      },
    },
    {
      type: "investigate-decide",
      id: "cloudlog-002",
      title: "20 GPU Instances — Data Science or Cryptomining?",
      objective:
        "Azure Activity Log shows 20 GPU VM instances being created in a non-production subscription. Assess whether this is legitimate.",
      investigationData: [
        {
          id: "azure-activity",
          label: "Azure Activity Log",
          content:
            "Microsoft.Compute/virtualMachines/write × 20. VM size: Standard_NC6s_v3 (GPU). Subscription: acme-data-science-dev. Created by user ml-pipeline@acme.onmicrosoft.com.",
        },
        {
          id: "team-context",
          label: "Team Context",
          content:
            'Data Science team lead posted in Teams channel yesterday: "Kicking off the Q2 model training run tomorrow, expect GPU usage in the dev subscription."',
        },
        {
          id: "cost-estimate",
          label: "Cost Estimate",
          content:
            "20 × NC6s_v3 at $3.22/hour = $64.40/hour, $1,545/day — no cost approval above $500/day on file.",
        },
        {
          id: "resource-tags",
          label: "Resource Tags",
          content:
            "VMs tagged: project=q2-model-training, owner=data-science-team, created_by=ml-pipeline.",
        },
      ],
      actions: [
        {
          id: "verify-cost-approval",
          label:
            "Verify with data science team lead — likely legitimate but needs cost approval",
        },
        {
          id: "terminate-all",
          label: "Terminate all GPU instances immediately",
          color: "red",
        },
        {
          id: "block-gpu",
          label: "Block GPU VM creation in the subscription",
        },
        {
          id: "approve-retroactive",
          label: "Approve retroactively — the Teams post is sufficient",
        },
      ],
      correctActionId: "verify-cost-approval",
      rationales: [
        {
          id: "rat-verify",
          text: "Teams message + matching tags + correct service account strongly suggest legitimate ML work, but $1,545/day without cost approval ($500 threshold) requires manager sign-off before continuing.",
        },
        {
          id: "rat-terminate",
          text: "Terminating a legitimate ML training run wastes potentially days of compute time and damages the relationship between security and data science teams.",
        },
        {
          id: "rat-block",
          text: "Blocking GPU VMs permanently hampers data science operations and is disproportionate when the activity appears legitimate but just needs cost approval.",
        },
        {
          id: "rat-approve",
          text: "Approving without proper cost authorization sets a bad precedent — a Teams message isn't a substitute for the formal cost approval process.",
        },
      ],
      correctRationaleId: "rat-verify",
      feedback: {
        perfect:
          "Correct. The evidence strongly suggests legitimate activity, but the cost threshold violation requires proper authorization. Verify and get approval — don't block legitimate work, but don't bypass financial controls either.",
        partial:
          "You identified the legitimacy indicators or the cost issue, but the best response balances both — verify legitimacy while enforcing the cost approval process.",
        wrong: "This response either disrupts legitimate work or bypasses financial controls. Context matters — not every cloud alert is an attack.",
      },
    },
    {
      type: "investigate-decide",
      id: "cloudlog-003",
      title: "Primary CloudTrail Trail — Logging Stopped",
      objective:
        "Alert: CloudTrail logging has been disabled in the production account. The action was taken by a service account.",
      investigationData: [
        {
          id: "cloudtrail-final",
          label: "CloudTrail",
          content:
            "Final event: StopLogging by svc-security-automation, preceded by DeleteTrail on 'prod-audit-trail', both at 4:17 AM.",
          isCritical: true,
        },
        {
          id: "service-account",
          label: "Service Account",
          content:
            "svc-security-automation: used for automated compliance checks. Last legitimate use 6 hours ago for Config rule evaluation. Managed by Security team.",
        },
        {
          id: "change-management",
          label: "Change Management",
          content:
            "No change ticket for CloudTrail modification. No planned maintenance. Security team automation runbook does NOT include trail deletion.",
        },
        {
          id: "iam-analysis",
          label: "IAM Analysis",
          content:
            "Service account access key last rotated 45 days ago, used from 3 different IPs in last 24 hours — one IP not associated with any known infrastructure.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "reenable-investigate",
          label:
            "Re-enable logging immediately and investigate service account compromise",
          color: "red",
        },
        {
          id: "wait-morning",
          label: "Wait for Security team to investigate in the morning",
        },
        {
          id: "reenable-only",
          label: "Re-enable logging only",
        },
        {
          id: "check-planned",
          label: "Check if this is a planned automation update",
        },
      ],
      correctActionId: "reenable-investigate",
      rationales: [
        {
          id: "rat-reenable-investigate",
          text: "Disabling audit logging is NEVER an expected automated action — even legitimate service accounts shouldn't delete trails, and the unknown source IP suggests compromise. Re-enable logging first (to capture the investigation itself), then investigate the service account.",
        },
        {
          id: "rat-wait",
          text: "Waiting until morning gives an attacker hours without audit visibility — every action they take during this window will be unrecorded.",
        },
        {
          id: "rat-reenable-only",
          text: "Re-enabling without investigating the compromised service account means it could be disabled again minutes later.",
        },
        {
          id: "rat-check",
          text: "Asking about planned updates when the runbook explicitly excludes trail deletion wastes critical time — the answer is already in the evidence.",
        },
      ],
      correctRationaleId: "rat-reenable-investigate",
      feedback: {
        perfect:
          "Correct. Audit trail disruption is one of the most critical alerts. Re-enabling logging restores visibility, and investigating the service account addresses the root cause.",
        partial:
          "You took a step in the right direction but didn't fully address both the immediate gap (logging disabled) and the root cause (compromised service account).",
        wrong: "Leaving audit logging disabled or ignoring the compromised service account gives the attacker exactly what they want — time without visibility.",
      },
    },
    {
      type: "investigate-decide",
      id: "cloudlog-004",
      title: "S3 Public Access — Test Bucket",
      objective:
        "AWS Config alert: S3 bucket policy changed to allow public access. The bucket is named 'dev-test-scratch' and contains only test data.",
      investigationData: [
        {
          id: "config-event",
          label: "AWS Config Event",
          content:
            's3:PutBucketPolicy on dev-test-scratch. Principal: "*" added for s3:GetObject. Changed by developer a.chen@acme.com at 2:15 PM.',
        },
        {
          id: "bucket-contents",
          label: "Bucket Contents",
          content:
            "127 files: test fixtures, sample JSON payloads, mock API responses, README.md. No PII or credentials found in file scan.",
        },
        {
          id: "developer-context",
          label: "Developer Context",
          content:
            "Aiden Chen, Junior Developer, working on public API documentation that needs example payloads accessible via URL.",
        },
        {
          id: "alternative",
          label: "Alternative",
          content:
            "S3 presigned URLs or CloudFront distribution could serve the same purpose without making the bucket public.",
        },
      ],
      actions: [
        {
          id: "revert-notify",
          label:
            "Revert policy and notify developer — even test buckets should not be public",
        },
        {
          id: "allow-test",
          label: "Allow it — test data with no PII is fine",
        },
        {
          id: "add-monitoring",
          label: "Add a monitoring alert but leave the policy",
        },
        {
          id: "block-s3",
          label: "Block the developer's S3 permissions",
        },
      ],
      correctActionId: "revert-notify",
      rationales: [
        {
          id: "rat-revert",
          text: "Even test buckets should not be public — it normalizes dangerous behavior, the bucket may eventually contain sensitive data, and presigned URLs solve the developer's actual need without the risk.",
        },
        {
          id: "rat-allow",
          text: "Allowing public test buckets creates precedent that leads to public production buckets — security policies must be consistent across environments.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring without reverting leaves the misconfiguration active and teaches the developer that public buckets are acceptable with monitoring.",
        },
        {
          id: "rat-block",
          text: "Blocking S3 permissions entirely is disproportionate for a learning opportunity — the developer needs guidance, not punishment.",
        },
      ],
      correctRationaleId: "rat-revert",
      feedback: {
        perfect:
          "Correct. Reverting the policy enforces consistent security practices while notifying the developer turns this into a learning opportunity. Suggest presigned URLs as the secure alternative.",
        partial:
          "You identified the issue but didn't take the optimal corrective action. Public buckets — even test ones — should be reverted, and the developer should learn about secure alternatives.",
        wrong: "This response either leaves a public bucket active or overreacts. The goal is to fix the misconfiguration and educate, not to punish or ignore.",
      },
    },
  ],

  hints: [
    "When a privileged action occurs from an unexpected location during off-hours, prioritize the geolocation and authentication anomalies over the account's legitimate role.",
    "Cloud audit trail disruption (disabling logging) is one of the most critical alerts you can receive — an attacker's first priority is often to blind the defenders.",
    "Even non-sensitive cloud resources should follow security best practices. Public test buckets become public production buckets through accumulated permissive habits.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Cloud security investigation is a rapidly growing field. Organizations running in AWS, Azure, and GCP need analysts who can navigate CloudTrail, Activity Logs, and Audit Logs to detect compromise, investigate incidents, and validate the security of automated processes.",
  toolRelevance: [
    "AWS CloudTrail / GuardDuty",
    "Azure Activity Log / Sentinel",
    "GCP Cloud Audit Logs",
    "Datadog Cloud Security Monitoring",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
