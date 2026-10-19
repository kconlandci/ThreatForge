import type { LabManifest } from "../../types/manifest";

export const cloudLoggingInvestigationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cloud-logging-investigation",
  version: 2,
  title: "The AI's Hunt Conclusion Is Wrong",

  tier: "intermediate",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "cloud-security",
    "cloudtrail",
    "ai-oversight",
    "azure",
    "aws",
    "investigation",
    "iam",
    "logging",
  ],

  description:
    "An AI log-analysis assistant now writes the first conclusion on cloud audit-log hunts. Work the raw CloudTrail and Activity Log events yourself — overturn its 'routine admin work,' check its 'cryptomining' call, and catch the benign explanation it invented for a disabled audit trail.",
  estimatedMinutes: 18,
  learningObjectives: [
    "Verify an AI hunt conclusion against the raw cloud audit events it summarized",
    "Recognize the console-login → access-key → policy-change pattern AI summarization smooths into 'admin activity'",
    "Calibrate response in both directions — overturning false-benign and false-malicious AI conclusions",
    "Treat audit-trail disruption as a critical event regardless of the explanation attached to it",
    "Apply proportional response to cloud findings after AI severity inflation",
  ],
  sortOrder: 305,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "cloudlog-001",
      title: "'Routine Admin Work'",
      objective:
        "The AI log-analysis assistant closed last night's cloud hunt: 'All CloudTrail activity is consistent with routine administration. No action required.' The hunt is yours to sign off. Read the raw events before you accept the conclusion.",
      investigationData: [
        {
          id: "ai-conclusion",
          label: "AI Hunt Conclusion",
          content:
            "'Overnight activity for user tchen consists of standard administrative operations: a console login, credential management, and a storage policy update. Pattern matches the account's administrative role. Assessment: routine admin work. Hunt closed.'",
        },
        {
          id: "cloudtrail-events",
          label: "CloudTrail Events — tchen (raw)",
          content:
            "01:12 UTC — ConsoleLogin from ASN never before seen for this account. 01:19 — CreateAccessKey (new key for tchen, created by tchen). 01:26 — PutBucketPolicy on bucket 'finance-reports' adding a cross-account read grant to an external AWS account ID not in the organization.",
          isCritical: true,
        },
        {
          id: "account-role",
          label: "Account Role — tchen",
          content:
            "tchen is a compliance auditor. The role is read-only by policy: Describe/List/Get permissions only. Last night's actions used a legacy admin policy still attached to the account — the auditor has never invoked it in 11 months.",
          isCritical: true,
        },
        {
          id: "change-records",
          label: "Change & Ticket Records",
          content:
            "No change ticket, no on-call assignment, and no access request for tchen or the finance-reports bucket in the last 30 days.",
        },
      ],
      actions: [
        {
          id: "overturn-escalate",
          label:
            "Overturn the conclusion — disable the new access key, revoke the sessions, and escalate as credential compromise",
          color: "red",
        },
        {
          id: "accept-conclusion",
          label: "Accept the AI's conclusion — the hunt stays closed",
        },
        {
          id: "monitor-key",
          label: "Leave the key active and monitor the account for a week",
        },
        {
          id: "ask-ai-again",
          label: "Ask the AI assistant to re-run the hunt with a stricter prompt",
        },
      ],
      correctActionId: "overturn-escalate",
      rationales: [
        {
          id: "rat-overturn",
          text: "Read as a sequence, the raw events are a textbook account-takeover chain: login from a new network, persistence (a fresh access key the attacker controls), then staging access to the finance data (cross-account bucket grant). The AI summarized each event's category — 'credential management,' 'policy update' — and pattern-matched the categories to the account's admin policy, never weighing the sequence, the hour, the new ASN, or that a read-only auditor suddenly used a dormant admin policy. Overturn it, kill the key, and escalate.",
        },
        {
          id: "rat-accept",
          text: "Accepting the conclusion leaves an attacker-created access key and a cross-account grant to the finance bucket in place. Summaries describe events; they cannot acquit them.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring an account with a known unauthorized key and an external data grant gives the attacker a week of sanctioned access to prepare extraction.",
        },
        {
          id: "rat-reprompt",
          text: "A stricter prompt re-runs the same categorization with more adjectives. Verification is not a better question to the summarizer — it is reading the events, which is the step that just overturned the conclusion.",
        },
      ],
      correctRationaleId: "rat-overturn",
      feedback: {
        perfect:
          "Correct overturn. The AI saw three administrative event types; you saw a sequence — new-network login, persistence key, external grant on finance data, executed by a read-only auditor at 1 AM. Summarization is lossy by design, and the losses are exactly where this breach was hiding.",
        partial:
          "You doubted the conclusion but left the key or the grant alive while you watched. A CreateAccessKey plus an external bucket grant is completed attacker infrastructure, not a wait-and-see signal.",
        wrong:
          "'Routine admin work' was the most dangerous sentence in the hunt: three individually ordinary events forming one compromise chain. AI conclusions about logs are claims to verify against the logs — never substitutes for them.",
      },
    },
    {
      type: "investigate-decide",
      id: "cloudlog-002",
      title: "The AI Cried Cryptomining",
      objective:
        "New hunt: the AI assistant flagged 20 GPU instances in the dev subscription as 'Probable cryptomining abuse — recommend immediate termination.' Verify before anything is terminated.",
      investigationData: [
        {
          id: "ai-conclusion-2",
          label: "AI Hunt Conclusion",
          content:
            "'20 GPU instances (Standard_NC6s_v3) created in a non-production subscription. GPU compute at this scale is a leading indicator of cryptomining via compromised credentials. Confidence: high. Recommendation: terminate all instances immediately.'",
        },
        {
          id: "azure-activity",
          label: "Azure Activity Log",
          content:
            "Microsoft.Compute/virtualMachines/write × 20. Subscription: acme-data-science-dev. Created by service identity ml-pipeline@acme.onmicrosoft.com — the data science team's automation account.",
        },
        {
          id: "team-context",
          label: "Team Context",
          content:
            "Data Science lead posted yesterday: 'Kicking off the Q2 model training run tomorrow — expect GPU usage in the dev subscription.' VMs are tagged project=q2-model-training, owner=data-science-team, created_by=ml-pipeline.",
        },
        {
          id: "cost-estimate",
          label: "Cost Estimate",
          content:
            "20 × NC6s_v3 at $3.22/hour ≈ $1,545/day. No cost approval above the $500/day threshold is on file for this run.",
        },
      ],
      actions: [
        {
          id: "verify-cost-approval",
          label:
            "Verify with the data science lead — likely legitimate, but the run needs cost approval before it continues",
        },
        {
          id: "terminate-all",
          label: "Terminate all GPU instances immediately, as the AI recommends",
          color: "red",
        },
        {
          id: "accept-no-action",
          label: "Close the hunt — the tags prove it's legitimate, nothing else needed",
        },
        {
          id: "block-gpu",
          label: "Block GPU VM creation in the subscription pending a policy review",
        },
      ],
      correctActionId: "verify-cost-approval",
      rationales: [
        {
          id: "rat-verify",
          text: "The AI pattern-matched 'GPU + non-production' to cryptomining and skipped the evidence that decides it: the creator is the team's known automation identity, the tags name a real project, and the team announced the run yesterday. This is legitimate work — with one genuine problem attached: $1,545/day against a $500 approval threshold. Verify with the lead and route the cost approval; don't let an AI's false alarm or its confidence score make either call.",
        },
        {
          id: "rat-terminate",
          text: "Terminating on the AI's say-so could destroy days of model training and teaches every team that security acts on unverified pattern matches. The evidence for legitimacy was in the same logs the AI read.",
        },
        {
          id: "rat-no-action",
          text: "Closing the hunt entirely ignores the one real finding: an unapproved 3×-over-threshold daily spend. Verification isn't only about attacks — financial controls are part of the check.",
        },
        {
          id: "rat-block",
          text: "Blocking GPU creation subscription-wide hampers the data science team's core work in response to their most normal activity. Disproportionate controls built on a false positive erode the credibility every future alert depends on.",
        },
      ],
      correctRationaleId: "rat-verify",
      feedback: {
        perfect:
          "Correct — verification cuts both ways. The AI's 'high confidence' cryptomining call collapsed against the service identity, the tags, and the team's own announcement, and you still caught the real issue it missed: the missing cost approval. Neither blind trust nor reflexive termination: evidence.",
        partial:
          "You avoided the worst outcome but either skipped the cost-approval problem or reached for a control broader than the finding. Legitimate-but-unapproved and malicious are different problems with different fixes.",
        wrong:
          "Terminating a team's announced training run on an AI's pattern match — without reading the identity, tags, and context present in the same log — is how security teams lose the organization's trust and their future alerts get ignored.",
      },
    },
    {
      type: "investigate-decide",
      id: "cloudlog-003",
      title: "The Explanation the AI Invented",
      objective:
        "Overnight alert: CloudTrail logging was disabled in the production account by a service account. The AI assistant's hunt note reads: 'Consistent with the security team's scheduled automation maintenance. No action required.' Validate that explanation.",
      investigationData: [
        {
          id: "ai-conclusion-3",
          label: "AI Hunt Note",
          content:
            "'StopLogging and DeleteTrail events were performed by svc-security-automation, a security-team service account. Such accounts perform periodic trail maintenance. Assessment: scheduled automation maintenance. No action required.'",
        },
        {
          id: "cloudtrail-final",
          label: "CloudTrail — Final Events",
          content:
            "04:17 UTC — DeleteTrail on 'prod-audit-trail', followed by StopLogging, both by svc-security-automation. These are the last events the trail recorded.",
          isCritical: true,
        },
        {
          id: "runbook-check",
          label: "Automation Runbook & Change Calendar",
          content:
            "The security automation runbook covers Config rule evaluation and report generation. It contains NO trail deletion or logging changes. No maintenance window, change ticket, or scheduled job exists for last night.",
          isCritical: true,
        },
        {
          id: "iam-analysis",
          label: "Service Account Analysis",
          content:
            "svc-security-automation access key last rotated 45 days ago. In the last 24 hours it was used from 3 different IPs — one not associated with any company infrastructure. Its last legitimate run was 6 hours before the trail events, a Config evaluation.",
        },
      ],
      actions: [
        {
          id: "reenable-investigate",
          label:
            "Re-enable logging immediately and investigate the service account as compromised",
          color: "red",
        },
        {
          id: "accept-maintenance",
          label: "Accept the AI's explanation — security accounts do perform maintenance",
        },
        {
          id: "wait-morning",
          label: "Leave it for the security team to check in the morning",
        },
        {
          id: "reenable-only",
          label: "Re-enable logging only — no need to investigate a team service account",
        },
      ],
      correctActionId: "reenable-investigate",
      rationales: [
        {
          id: "rat-reenable-investigate",
          text: "The AI's explanation fails on its own terms: the runbook contains no trail maintenance, no window was scheduled, and the account was used from an unknown IP. The assistant generated a plausible story — 'security accounts do maintenance' — to fill an evidence gap, which is precisely what summarizers do with anomalies. Audit-trail destruction is an attacker's blinding move: re-enable logging first so the investigation itself is recorded, then treat the service account as compromised.",
        },
        {
          id: "rat-accept",
          text: "Accepting an invented explanation for a disabled audit trail because the actor's name contains 'security-automation' is credentialism, not analysis. The runbook contradicts the story outright.",
        },
        {
          id: "rat-wait",
          text: "Every hour logging stays off is an hour of unrecorded attacker activity. Morning can review a restored trail; it cannot recover one that was never written.",
        },
        {
          id: "rat-reenable-only",
          text: "Re-enabling without investigating the account that disabled it invites a repeat within the hour — and ignores the unknown source IP entirely.",
        },
      ],
      correctRationaleId: "rat-reenable-investigate",
      feedback: {
        perfect:
          "Correct. You tested the AI's benign story against the runbook and change calendar — the only places such a story could be true — and it failed both. An AI that explains anomalies instead of flagging them is a liability; verification is the control.",
        partial:
          "Restoring logging without investigating the service account leaves the likely-compromised actor able to blind you again. Both halves are required: visibility back, root cause hunted.",
        wrong:
          "'Scheduled maintenance' that appears in no runbook, no ticket, and no calendar is not an explanation — it is a hallucinated alibi for audit-trail destruction. Legitimate automation never needs its actions invented after the fact.",
      },
    },
    {
      type: "investigate-decide",
      id: "cloudlog-004",
      title: "'Critical: Production Data Public'",
      objective:
        "The AI assistant escalated an S3 finding to Critical: 'Public bucket policy detected. Production data exposure in progress — recommend declaring an incident.' Verify the escalation before anyone declares anything.",
      investigationData: [
        {
          id: "ai-conclusion-4",
          label: "AI Escalation",
          content:
            "'s3:PutBucketPolicy granted public GetObject access. Public exposure of a company bucket constitutes a production data incident. Severity: Critical. Recommend immediate incident declaration and executive notification.'",
        },
        {
          id: "config-event",
          label: "AWS Config Event",
          content:
            "s3:PutBucketPolicy on bucket 'dev-test-scratch'. Principal '*' added for s3:GetObject. Changed by developer a.chen@acme.com at 2:15 PM from the corporate network.",
        },
        {
          id: "bucket-contents",
          label: "Bucket Contents (scan)",
          content:
            "127 files: test fixtures, sample JSON payloads, mock API responses, README.md. No PII, credentials, or production data found in the content scan.",
        },
        {
          id: "developer-context",
          label: "Developer Context",
          content:
            "Aiden Chen, junior developer, building public API documentation that needs example payloads reachable by URL. Presigned URLs or a CloudFront distribution would serve the same purpose without a public policy.",
        },
      ],
      actions: [
        {
          id: "revert-notify",
          label:
            "Revert the policy and coach the developer — misconfiguration, not an incident; suggest presigned URLs",
        },
        {
          id: "declare-incident",
          label: "Declare a Critical incident and notify executives, as the AI recommends",
          color: "red",
        },
        {
          id: "allow-test",
          label: "Leave the policy — the contents are only test data",
        },
        {
          id: "block-dev",
          label: "Revoke the developer's S3 permissions pending retraining",
        },
      ],
      correctActionId: "revert-notify",
      rationales: [
        {
          id: "rat-revert",
          text: "The AI escalated a policy pattern without reading what the policy exposed: test fixtures in a dev bucket, changed by an identified developer for a documented purpose. That's a misconfiguration to revert and a coaching moment — not a data incident. But 'test data' doesn't mean 'leave it': public policies normalize the habit that eventually reaches a production bucket, so revert, notify, and hand the developer the presigned-URL pattern that solves their actual need.",
        },
        {
          id: "rat-declare",
          text: "Declaring a Critical incident and waking executives over a fixture bucket — because an AI scored the policy string instead of the contents — spends the organization's incident credibility on a non-breach. Save 'Critical' for the day the contents scan disagrees.",
        },
        {
          id: "rat-allow",
          text: "Leaving a public bucket in place, contents notwithstanding, teaches the whole team that public policies are acceptable when the data looks harmless today. Buckets outlive their contents.",
        },
        {
          id: "rat-block",
          text: "Revoking a junior developer's access for a first, well-intentioned misconfiguration punishes the reporter of tomorrow's real finding into silence. Fix the config, teach the pattern.",
        },
      ],
      correctRationaleId: "rat-revert",
      feedback: {
        perfect:
          "Correct calibration. The AI read a policy and shouted 'breach'; you read the bucket and found a fixable misconfiguration. Reverting the policy enforces the standard, coaching fixes the cause, and no incident credibility was spent on test fixtures.",
        partial:
          "You avoided the overreaction but either left the public policy standing or reached for punishment. The proportionate response is revert + notify + a better pattern — every time, including when the data is harmless.",
        wrong:
          "Severity lives in exposure and contents, not in the shape of a policy string. An AI that cannot read the bucket cannot set the severity — and neither can an analyst who skips the scan.",
      },
    },
  ],

  hints: [
    "Read AI hunt conclusions as claims about sequences, then check the sequence: login → persistence → data access is a compromise chain even when every individual event has an innocent category name.",
    "AI conclusions err in both directions — false-benign ('routine admin work') and false-malicious ('cryptomining,' 'production data public'). Verification means pricing the evidence yourself, not choosing whether to trust the tool today.",
    "When an AI offers a benign explanation for a critical event, ask where that explanation could be verified — a runbook, a change ticket, a schedule. An explanation with no source is an invention.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Cloud security investigation increasingly starts from an AI's conclusion rather than a blank console. The analysts who stay effective are the ones who treat that conclusion as the first hypothesis to beat — tracing CloudTrail sequences themselves, because summarization is lossy by design and the losses concentrate exactly where attackers operate.",
  toolRelevance: [
    "AWS CloudTrail / GuardDuty",
    "Azure Activity Log / Sentinel",
    "GCP Cloud Audit Logs",
    "Datadog Cloud Security Monitoring",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-10-19",
};
