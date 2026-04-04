import type { LabManifest } from "../../types/manifest";

export const incidentDocumentationReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "incident-documentation-review",
  version: 1,
  title: "Incident Documentation Quality Review",

  tier: "beginner",
  track: "incident-response",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["incident-response", "documentation", "post-incident", "timeline", "lessons-learned"],

  description:
    "Review incident reports for completeness, accuracy, and actionability — identifying what critical information is missing and what documentation practices prevent effective post-incident learning.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify critical gaps in incident documentation that impair investigation and legal compliance",
    "Distinguish actionable post-incident recommendations from vague improvement statements",
    "Apply timeline documentation standards that support future incident correlation",
  ],
  sortOrder: 710,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "doc-001",
      title: "Ransomware Incident Report — Quality Review",
      context:
        "The IR team submitted this incident report summary: 'A ransomware incident occurred last week. Several servers were encrypted. The attacker gained access through a phishing email. Files were recovered from backups. Security controls have been improved to prevent future incidents. The incident is now resolved.' Your task: assess the documentation quality and identify the action needed.",
      displayFields: [
        { label: "Timeline", value: "Not documented — 'last week' only", emphasis: "critical" },
        { label: "Affected Systems", value: "Not documented — 'several servers'", emphasis: "critical" },
        { label: "Root Cause", value: "Incomplete — 'phishing email' without specifics", emphasis: "warn" },
        { label: "Improvements", value: "Vague — 'security controls have been improved'", emphasis: "warn" },
        { label: "Business Impact", value: "Not documented", emphasis: "critical" },
      ],
      actions: [
        {
          id: "RETURN_FOR_REVISION",
          label: "Return for revision with specific gaps: timeline, system list, root cause details, measurable improvements, business impact",
          color: "red",
        },
        {
          id: "ACCEPT_ADD_NOTES",
          label: "Accept report and add clarifying notes",
          color: "orange",
        },
        {
          id: "CLOSE_RESOLVED",
          label: "Accept — incident is resolved, detailed docs unnecessary",
          color: "blue",
        },
        {
          id: "ESCALATE_MANAGEMENT",
          label: "Escalate to management — report quality indicates deeper IR process problems",
          color: "yellow",
        },
      ],
      correctActionId: "RETURN_FOR_REVISION",
      rationales: [
        {
          id: "rat-inadequate-doc",
          text: "This incident report fails on every critical dimension: no timeline (required for legal defensibility and future correlation), no specific system list (required for scope validation and recurrence detection), vague root cause ('phishing' without specifics about what email, who clicked, what exploit), and unmeasurable improvements ('security controls improved' doesn't tell a future auditor what changed). Incident documentation serves multiple purposes — legal defensibility, insurance claims, regulatory compliance, and future threat intelligence. This report serves none of them. Return with specific revision requirements.",
        },
        {
          id: "rat-accept-notes",
          text: "Adding notes to an inadequate report doesn't solve the problem — the analyst who documented this needs to learn proper documentation standards for future incidents. Return for proper revision.",
        },
        {
          id: "rat-close-resolved",
          text: "Incident resolution is not the documentation standard. Incident documentation must survive regulatory audits, insurance claims, and legal proceedings — 'resolved' doesn't make poor documentation acceptable.",
        },
        {
          id: "rat-escalate",
          text: "Escalating to management for a documentation quality issue skips the obvious step of returning the report to the author with specific improvement requirements. Reserve management escalation for repeated quality failures after coaching.",
        },
      ],
      correctRationaleId: "rat-inadequate-doc",
      feedback: {
        perfect: "Correct. Incident documentation that uses 'last week,' 'several servers,' and 'security improved' is not suitable for compliance, insurance, or learning. Return with specific requirements.",
        partial: "Accepting or adding notes to inadequate documentation perpetuates poor practices. The analyst needs specific feedback on documentation standards.",
        wrong: "Incident resolution doesn't make poor documentation acceptable. Compliance, insurance, and legal requirements all depend on specific, timeline-anchored incident records.",
      },
    },
    {
      type: "action-rationale",
      id: "doc-002",
      title: "Post-Incident Action Items — Quality Assessment",
      context:
        "Post-incident review produced these action items: (1) 'Improve security awareness training.' (2) 'Patch systems more quickly.' (3) 'Implement MFA for VPN access by April 15, assigned to IT team, success metric: 100% of VPN users enrolled.' (4) 'Enhance monitoring capabilities.' (5) 'Fix the specific Apache Log4j vulnerability CVE-2021-44228 on prod-web-01 through prod-web-04 by March 31, assigned to DevOps, tracked in Jira INFRA-2847.' Evaluate the action item quality.",
      displayFields: [
        { label: "Item 1", value: "'Improve security awareness training' — no date, no owner, no metric", emphasis: "warn" },
        { label: "Item 2", value: "'Patch systems more quickly' — no date, no owner, no specifics", emphasis: "warn" },
        { label: "Item 3", value: "MFA for VPN by April 15, IT team, 100% enrollment metric — complete", emphasis: "normal" },
        { label: "Item 4", value: "'Enhance monitoring capabilities' — no date, no owner, no metric", emphasis: "warn" },
        { label: "Item 5", value: "Specific CVE on specific hosts by specific date, Jira ticket — complete", emphasis: "normal" },
      ],
      actions: [
        {
          id: "REVISE_VAGUE_ITEMS",
          label: "Approve items 3 and 5, return items 1, 2, and 4 for revision with SMART criteria",
          color: "red",
        },
        {
          id: "APPROVE_ALL",
          label: "Approve all items — post-incident reviews shouldn't be too prescriptive",
          color: "orange",
        },
        {
          id: "REJECT_ALL",
          label: "Reject all items — two weak items invalidate the whole review",
          color: "yellow",
        },
        {
          id: "ASSIGN_SECURITY_TEAM",
          label: "Assign all vague items to the security team to flesh out details",
          color: "blue",
        },
      ],
      correctActionId: "REVISE_VAGUE_ITEMS",
      rationales: [
        {
          id: "rat-smart-actions",
          text: "Post-incident action items must be SMART (Specific, Measurable, Assignable, Realistic, Time-bound). Items 3 and 5 meet all criteria. Items 1, 2, and 4 are vague commitments that will never be acted on — 'improve training' with no date or owner will appear on every future post-incident review unchanged. Return with specific requirements: what specific training content, by when, who owns it, how will we measure improvement? Assigning vague items to the security team shifts ownership without improving quality.",
        },
        {
          id: "rat-approve-all",
          text: "Approving vague action items guarantees they won't be completed. Post-incident reviews exist to produce durable improvements — items without owners and deadlines aren't improvements, they're wishes.",
        },
        {
          id: "rat-reject-all",
          text: "Rejecting the entire review because of some vague items discards the good work in items 3 and 5. Selective revision is more efficient than starting over.",
        },
        {
          id: "rat-assign-security",
          text: "Security teams can't own training programs (owned by HR/L&D) or general patch velocity (owned by DevOps/IT). Action items should be owned by the team doing the work, not reassigned to security as a catch-all.",
        },
      ],
      correctRationaleId: "rat-smart-actions",
      feedback: {
        perfect: "Correct. SMART criteria distinguish actionable items (3 and 5) from vague commitments (1, 2, 4). Return vague items for specific dates, owners, and success metrics.",
        partial: "Approving vague action items means they'll never be completed. Every post-incident review will include 'improve security awareness' forever.",
        wrong: "Post-incident action items without owners and deadlines are institutional promises to no one. Specific, measurable, time-bound items with assigned owners are required for follow-through.",
      },
    },
    {
      type: "action-rationale",
      id: "doc-003",
      title: "Incident Timeline Documentation Standard",
      context:
        "After a data breach, the legal team requests the incident timeline for potential litigation. The IR team's timeline reads: 'The breach was discovered on a Tuesday when an employee noticed something strange. After some investigation, we found the attacker had been in our systems for a while. We shut everything down and cleaned up.' Legal asks: when exactly did the breach start? When was it discovered? Who discovered it? What was accessed? How long was the attacker present?",
      displayFields: [
        { label: "Discovery Time", value: "Not recorded — 'a Tuesday'", emphasis: "critical" },
        { label: "Initial Access Time", value: "Not recorded — 'a while'", emphasis: "critical" },
        { label: "Discoverer Identity", value: "Not recorded — 'an employee'", emphasis: "critical" },
        { label: "Data Accessed", value: "Not recorded", emphasis: "critical" },
        { label: "Containment Time", value: "Not recorded", emphasis: "critical" },
      ],
      actions: [
        {
          id: "RECONSTRUCT_LOGS",
          label: "Reconstruct timeline from system logs, access logs, and email records; establish documentation policy",
          color: "red",
        },
        {
          id: "ESTIMATE_TIMELINE",
          label: "Ask the IR team to provide their best estimates for the missing details",
          color: "orange",
        },
        {
          id: "INFORM_LEGAL",
          label: "Inform legal that precise times weren't recorded — provide what's available",
          color: "yellow",
        },
        {
          id: "DECLINE_LITIGATION",
          label: "Recommend settling rather than litigating — timeline gaps make defense difficult",
          color: "blue",
        },
      ],
      correctActionId: "RECONSTRUCT_LOGS",
      rationales: [
        {
          id: "rat-reconstruct",
          text: "Timeline gaps in incident documentation must be filled from system evidence, not memory. System and application logs provide exact timestamps; access logs show what was accessed and when; email and Slack records capture when the issue was first discussed. Reconstruct the authoritative timeline from these sources while they're still available. Simultaneously, establish a documentation policy requiring real-time timeline recording in future incidents. Estimates from memory are legally unreliable; log-based reconstruction provides defensible evidence.",
        },
        {
          id: "rat-estimates",
          text: "Memory-based estimates in litigation contexts are dangerous — they can be challenged, contradicted by other evidence, and damage credibility. Always reconstruct from system logs.",
        },
        {
          id: "rat-inform-legal",
          text: "Informing legal of gaps is necessary, but the first step is attempting reconstruction from system logs before declaring the information unavailable.",
        },
        {
          id: "rat-settle",
          text: "Settlement recommendations based on documentation gaps are a last resort. First, attempt to reconstruct the timeline from the system evidence that was certainly generated even if not manually documented.",
        },
      ],
      correctRationaleId: "rat-reconstruct",
      feedback: {
        perfect: "Correct approach. System logs, access logs, and communication records can reconstruct what wasn't manually documented. Establish real-time timeline requirements for future incidents.",
        partial: "Memory estimates are legally unreliable. Attempt log-based reconstruction before declaring the information unavailable to legal.",
        wrong: "Settling based on documentation gaps before attempting log reconstruction abandons a major evidentiary resource. System logs record precise timestamps that manual documentation missed.",
      },
    },
  ],

  hints: [
    "Incident timelines should record exact timestamps (UTC) for every action — discovery time, containment time, and recovery time are legally required information for breach notifications.",
    "Post-incident action items without owners and deadlines are never completed — every item needs an assignee, a due date, and a measurable success criterion.",
    "System logs provide authoritative evidence for incident reconstruction even when manual documentation is poor — establish log retention policies that outlast likely litigation timelines.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Incident documentation quality directly affects legal defensibility, regulatory compliance, and organizational learning. IR professionals who produce clear, timeline-anchored, actionable documentation are significantly more effective than those who treat documentation as an afterthought.",
  toolRelevance: [
    "PagerDuty / Opsgenie (incident timeline tracking)",
    "Jira (action item tracking)",
    "Confluence (incident documentation templates)",
    "Splunk (log-based timeline reconstruction)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
