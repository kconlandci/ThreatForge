import type { LabManifest } from "../../types/manifest";

export const changeManagementSecurityLab: LabManifest = {
  schemaVersion: "1.1",
  id: "change-management-security",
  version: 1,
  title: "Change Management Security Review",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["change-management", "change-control", "itil", "production-changes", "rollback", "security-review"],

  description:
    "Evaluate change requests for security impact, identifying changes that require security review, emergency change abuse, and missing rollback procedures that increase incident risk.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify change requests that require security review before production deployment",
    "Distinguish legitimate emergency changes from change control bypass abuse",
    "Evaluate rollback procedures and change documentation completeness",
  ],
  sortOrder: 720,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "change-001",
      title: "Firewall Rule Change — Missing Security Review",
      context:
        "Change request CR-4821 submitted: 'Add firewall rule to allow inbound TCP 8080 from 0.0.0.0/0 to 10.50.0.0/24 (production web tier). Purpose: Allow external load balancer health checks.' Change category: Standard (no security review required). Submitted by: IT Operations. Planned for Friday night maintenance window.",
      displayFields: [
        { label: "Change Type", value: "Firewall rule — inbound TCP 8080 from internet to production", emphasis: "critical" },
        { label: "Source", value: "0.0.0.0/0 — entire internet", emphasis: "critical" },
        { label: "Target", value: "10.50.0.0/24 — production web tier", emphasis: "warn" },
        { label: "Category", value: "Standard — security review bypassed", emphasis: "warn" },
        { label: "Stated Purpose", value: "Load balancer health checks", emphasis: "normal" },
      ],
      actions: [
        {
          id: "SECURITY_REVIEW_NARROW_SCOPE",
          label: "Require security review — recategorize as significant, narrow source to load balancer IPs only",
          color: "red",
        },
        {
          id: "APPROVE_STANDARD",
          label: "Approve as standard change — operational teams know their needs",
          color: "orange",
        },
        {
          id: "DENY_COMPLETELY",
          label: "Deny entirely — internet-accessible internal ports are never acceptable",
          color: "yellow",
        },
        {
          id: "APPROVE_TIME_LIMITED",
          label: "Approve with a 30-day expiry review date",
          color: "blue",
        },
      ],
      correctActionId: "SECURITY_REVIEW_NARROW_SCOPE",
      rationales: [
        {
          id: "rat-security-review-needed",
          text: "Opening inbound access from the entire internet to a production network is not a 'standard' change — it's a significant security change requiring review regardless of its stated purpose. Health check traffic from a load balancer doesn't need to come from 0.0.0.0/0; it comes from specific load balancer IPs or a known CIDR range. Recategorize as significant change (triggers security review), then during review, narrow the source to the actual load balancer IPs. The intent may be legitimate, but the scope is far too broad.",
        },
        {
          id: "rat-approve-standard",
          text: "Operational teams understanding their functional needs doesn't mean they've considered the security implications. Change categorization should be based on the security impact of the change, not the requester's intent.",
        },
        {
          id: "rat-deny-completely",
          text: "Denying the change completely may not be appropriate — load balancers do need to check the health of backend servers. The problem is the overly broad source CIDR, not the concept of the change.",
        },
        {
          id: "rat-time-limited",
          text: "A 30-day review doesn't address the fundamental problem — the rule is too broad right now. Time-limiting doesn't narrow the internet-accessible scope.",
        },
      ],
      correctRationaleId: "rat-security-review-needed",
      feedback: {
        perfect: "Correct. Internet-to-production firewall rules are significant changes requiring security review regardless of categorization. The source needs narrowing from 0.0.0.0/0 to actual load balancer IPs.",
        partial: "Change category manipulation to avoid security review is a common problem. The security impact of a change — not the submitter's intent — determines the review requirement.",
        wrong: "Approving internet-to-production access as a standard change without security review is exactly the type of misconfiguration that creates undetected attack surface.",
      },
    },
    {
      type: "action-rationale",
      id: "change-002",
      title: "Emergency Change Abuse Pattern Detection",
      context:
        "Change management metrics for Q4 show: 127 emergency changes (vs. 23 in Q3), 89% submitted by the same 3 engineers, average time from submission to approval: 12 minutes, 94% of emergency changes have no documented business impact justification. Post-change review shows 71% of 'emergency' changes could have been planned with 48-hour notice.",
      displayFields: [
        { label: "Emergency Change Volume", value: "127 in Q4 vs. 23 in Q3 — 452% increase", emphasis: "critical" },
        { label: "Concentration", value: "89% from 3 engineers", emphasis: "warn" },
        { label: "Review Time", value: "12-minute average — rubber stamp approval", emphasis: "critical" },
        { label: "Business Justification", value: "94% lack documented emergency rationale", emphasis: "warn" },
        { label: "Plannable Changes", value: "71% could have been planned with 48h notice", emphasis: "warn" },
      ],
      actions: [
        {
          id: "AUDIT_REQUIRE_JUSTIFICATION",
          label: "Audit all 127 emergency changes, require documented justification, add emergency change approval training",
          color: "red",
        },
        {
          id: "BLOCK_ENGINEERS",
          label: "Restrict the 3 engineers' ability to submit emergency changes",
          color: "orange",
        },
        {
          id: "ACCEPT_OPERATIONAL",
          label: "Accept as Q4 operational reality — busier quarter means more emergencies",
          color: "blue",
        },
        {
          id: "REDUCE_APPROVAL_TIME",
          label: "Require 30-minute minimum review time for all emergency changes",
          color: "yellow",
        },
      ],
      correctActionId: "AUDIT_REQUIRE_JUSTIFICATION",
      rationales: [
        {
          id: "rat-emergency-abuse",
          text: "The data indicates systemic emergency change process abuse: a 452% volume increase, concentration in 3 engineers, 12-minute approvals (no meaningful review), and 94% lack business justification. This matters for security because emergency changes bypass standard security review, testing requirements, and peer approval. An audit of all 127 changes is needed to identify whether any introduced unauthorized access, disabled controls, or created security debt. Going forward, require documented emergency justification (what business impact occurs if this isn't done tonight?) and mandate approvals that demonstrate actual review occurred.",
        },
        {
          id: "rat-block-engineers",
          text: "Blocking specific engineers treats a process problem as an individual behavior problem. The approvers who rubber-stamped 127 changes in 12 minutes are equally responsible. Fix the process, not just the submitters.",
        },
        {
          id: "rat-accept-operational",
          text: "Q4 may be busier, but a 452% increase in emergency changes with 94% missing justification is a process failure. Operational busyness doesn't justify bypassing change controls.",
        },
        {
          id: "rat-approval-time",
          text: "Minimum review time is a surface-level fix that doesn't address whether reviewers have the information needed to make a real decision. Documentation requirements and accountability are the root cause fixes.",
        },
      ],
      correctRationaleId: "rat-emergency-abuse",
      feedback: {
        perfect: "Correct diagnosis. Emergency change abuse is a significant security risk because it systematically bypasses security review. Audit all changes and fix the process root cause.",
        partial: "Restricting individual engineers doesn't fix the process. Approvers enabling 12-minute rubber-stamp reviews are equally responsible.",
        wrong: "A 452% increase in undocumented emergency changes is a process control failure, not seasonal operational variation. Audit and remediate.",
      },
    },
    {
      type: "action-rationale",
      id: "change-003",
      title: "Missing Rollback Plan in Critical Change",
      context:
        "Change request CR-5109 is scheduled for tomorrow's maintenance window: 'Upgrade production authentication service from v2.1 to v3.0. Breaking changes: new token format, existing sessions will be invalidated, API clients need code updates. Estimated 4,000 active users affected. Rollback plan: TBD.' Change is approved by the CAB. The authentication service processes all logins for the production environment.",
      displayFields: [
        { label: "System Criticality", value: "Authentication service — all production logins depend on it", emphasis: "critical" },
        { label: "Breaking Change", value: "New token format + session invalidation + API client changes required", emphasis: "warn" },
        { label: "User Impact", value: "4,000 active users will be unable to maintain sessions", emphasis: "warn" },
        { label: "Rollback Plan", value: "TBD — not documented", emphasis: "critical" },
        { label: "CAB Approval", value: "Approved despite missing rollback plan", emphasis: "warn" },
      ],
      actions: [
        {
          id: "HOLD_REQUIRE_ROLLBACK",
          label: "Place change on hold — require complete rollback procedure before re-approval",
          color: "red",
        },
        {
          id: "APPROVE_DOCUMENT_LATER",
          label: "Proceed — rollback plan can be documented after deployment",
          color: "orange",
        },
        {
          id: "DEFER_CHANGE",
          label: "Defer the change to next month's maintenance window",
          color: "yellow",
        },
        {
          id: "TRUST_CAB",
          label: "Trust the CAB approval — they're responsible for change risk",
          color: "blue",
        },
      ],
      correctActionId: "HOLD_REQUIRE_ROLLBACK",
      rationales: [
        {
          id: "rat-rollback-required",
          text: "A breaking change to the authentication service with no rollback plan is a recipe for a production outage with no recovery path. If the v3.0 upgrade fails mid-deployment, or if API clients aren't updated in time, the authentication service may become unavailable for all 4,000 users — and 'TBD' rollback means reverting to v2.1 will be improvised under pressure. The CAB approved an incomplete change request. Hold the change and require: documented rollback procedure (step-by-step v3.0→v2.1 reversion), rollback test results, and confirmation that all API clients have been updated before the auth service upgrade.",
        },
        {
          id: "rat-rollback-after",
          text: "Documenting the rollback plan after deployment means the plan won't exist during the period when it's most needed — right after deployment if things go wrong.",
        },
        {
          id: "rat-defer",
          text: "Deferring without specific requirements for the next window just delays the same problem. The change can proceed next window once the rollback plan is documented.",
        },
        {
          id: "rat-trust-cab",
          text: "CAB approved an incomplete change request — that's a CAB process failure. Change security review shouldn't blindly defer to approvals that are themselves incomplete.",
        },
      ],
      correctRationaleId: "rat-rollback-required",
      feedback: {
        perfect: "Correct. Breaking changes to critical authentication services without rollback plans create unrecoverable failure scenarios. Hold for rollback documentation regardless of CAB approval.",
        partial: "CAB approval doesn't make an incomplete change acceptable. Missing rollback plans for critical infrastructure changes is a fundamental risk management failure.",
        wrong: "Documenting rollback plans after deployment means you won't have one when the deployment fails. Hold the change until rollback procedures are documented and tested.",
      },
    },
  ],

  hints: [
    "Change categorization should be based on security and operational impact, not requester convenience — internet-facing firewall rules are always significant changes.",
    "A 'rollback plan: TBD' on a critical infrastructure change means the rollback plan is 'improvise under pressure' — always require specific, tested rollback procedures.",
    "Emergency change volume spikes with low justification rates indicate process abuse — audit the changes to identify security gaps introduced via the bypass path.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Change management failures are a leading cause of both security incidents and operational outages. Security engineers who understand change control — and can identify when it's being bypassed or is inadequate — provide significant value in enterprise security governance roles.",
  toolRelevance: [
    "ServiceNow ITSM (change management)",
    "Jira Service Management",
    "ITIL Change Management framework",
    "AWS Config (change tracking)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
