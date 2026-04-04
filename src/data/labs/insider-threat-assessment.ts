import type { LabManifest } from "../../types/manifest";

export const insiderThreatAssessmentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "insider-threat-assessment",
  version: 1,
  title: "Insider Threat Assessment",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "insider-threat",
    "dlp",
    "data-exfiltration",
    "user-behavior",
    "investigation",
    "ueba",
  ],

  description:
    "Investigate potential insider threat scenarios by analyzing DLP alerts, access logs, and behavioral baselines to determine whether user activity is malicious, negligent, or legitimate.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify behavioral indicators of potential insider threats",
    "Distinguish malicious insider activity from legitimate business behavior",
    "Apply proportional investigation based on evidence strength",
    "Understand when to escalate vs. document insider threat indicators",
    "Recognize the role of HR, legal, and security in insider threat response",
  ],
  sortOrder: 220,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "insider-001",
      title: "Departing Employee Data Exfiltration Alert",
      objective:
        "DLP alert triggered on a departing employee. Investigate whether this is data theft or normal business activity.",
      investigationData: [
        {
          id: "dlp-alert",
          label: "DLP Alert",
          content:
            "2.3 GB downloaded to USB drive from \\\\fileserver\\clients — includes client_contacts.xlsx (45K records), pricing_matrix_2026.xlsx, strategic_accounts_Q3.pdf",
          isCritical: true,
        },
        {
          id: "hr-system",
          label: "HR System",
          content:
            "Employee: Marcus Webb, Sales Director. Resignation submitted March 10, effective March 24 (2 weeks notice). Going to competitor Nexus Solutions.",
        },
        {
          id: "access-logs",
          label: "Access Logs",
          content:
            "Downloads occurred Tuesday 6:15 PM — after most staff left. Normal login, corporate laptop, office network. Badge-in at 5:58 PM, badge-out at 6:42 PM.",
        },
        {
          id: "prior-activity",
          label: "Prior Activity",
          content:
            "No previous DLP alerts. Downloaded 15 MB total in the prior 6 months. 2.3 GB in one session is a 15,000% increase.",
        },
      ],
      actions: [
        {
          id: "ESCALATE_HR_SECURITY",
          label: "Escalate to HR and security for coordinated investigation",
          color: "red",
        },
        {
          id: "CONFRONT_EMPLOYEE",
          label: "Confront the employee directly",
          color: "orange",
        },
        {
          id: "DISABLE_ACCOUNT",
          label: "Disable the account immediately",
          color: "yellow",
        },
        {
          id: "LOG_MONITOR",
          label: "Log and monitor — wait for more evidence",
          color: "blue",
        },
      ],
      correctActionId: "ESCALATE_HR_SECURITY",
      rationales: [
        {
          id: "rat-escalate",
          text: "Resignation + competitor + massive data download is a textbook insider threat pattern requiring coordinated legal/HR/security response.",
        },
        {
          id: "rat-confront",
          text: "Confronting directly may trigger destruction of evidence.",
        },
        {
          id: "rat-disable",
          text: "Disabling the account before consulting HR/legal could create wrongful termination liability.",
        },
        {
          id: "rat-monitor",
          text: "Waiting risks more data leaving the organization.",
        },
      ],
      correctRationaleId: "rat-escalate",
      feedback: {
        perfect:
          "Excellent. The combination of resignation, competitor move, and a 15,000% increase in data downloads is a textbook insider threat trifecta. Coordinated HR/legal/security response preserves evidence and protects the organization legally.",
        partial:
          "You identified the risk but chose a response that could create legal exposure or tip off the employee. Insider threat cases require coordinated investigation with HR and legal before taking direct action.",
        wrong:
          "This scenario has multiple high-confidence indicators of data theft. Waiting for more evidence or confronting the employee directly risks further data loss or evidence destruction.",
      },
    },
    {
      type: "investigate-decide",
      id: "insider-002",
      title: "Unusual Database Access by Backend Developer",
      objective:
        "Database audit alert: an engineer ran queries against production customer data outside their normal scope. Determine if this is authorized.",
      investigationData: [
        {
          id: "db-audit-log",
          label: "Database Audit Log",
          content:
            "SELECT first_name, last_name, email, phone FROM customers LIMIT 1000 — executed by agarcia@acme-corp.com at 2:15 PM Tuesday",
        },
        {
          id: "project-context",
          label: "Project Context",
          content:
            "Jira ticket DEV-4521: 'Implement customer export API endpoint' — assigned to A. Garcia. Sprint ends Friday. Ticket description mentions needing sample customer data format.",
        },
        {
          id: "standup-notes",
          label: "Engineering Standup Notes",
          content:
            "Monday standup: 'Alex is working on the customer export feature, needs to verify data format against production schema.'",
        },
        {
          id: "access-pattern",
          label: "Access Pattern",
          content:
            "A. Garcia accessed prod DB 3 times in the past month. All during business hours. Previous queries were schema-only (DESCRIBE tables), this is the first data query.",
        },
      ],
      actions: [
        {
          id: "VERIFY_MANAGER",
          label: "Verify with engineering manager — likely legitimate",
          color: "green",
        },
        {
          id: "DISABLE_DB_ACCESS",
          label: "Disable production DB access immediately",
          color: "red",
        },
        {
          id: "ESCALATE_BREACH",
          label: "Escalate as potential data breach",
          color: "orange",
        },
        {
          id: "CLOSE_ALERT",
          label: "Close the alert — developer was assigned the work",
          color: "blue",
        },
      ],
      correctActionId: "VERIFY_MANAGER",
      rationales: [
        {
          id: "rat-verify",
          text: "Jira ticket + standup mention + business-hours access strongly suggests authorized work, but production data access should always be confirmed with management.",
        },
        {
          id: "rat-disable",
          text: "Disabling access would block sprint deliverable without cause.",
        },
        {
          id: "rat-close",
          text: "Closing without verification misses the opportunity to reinforce proper data access procedures.",
        },
        {
          id: "rat-escalate",
          text: "Escalating as a breach when evidence points to authorized work damages trust.",
        },
      ],
      correctRationaleId: "rat-verify",
      feedback: {
        perfect:
          "Great judgment. The Jira ticket, standup notes, and business-hours pattern all point to legitimate work. Verifying with the engineering manager confirms authorization while reinforcing proper data access governance.",
        partial:
          "You were on the right track but chose a disproportionate response. The evidence strongly suggests authorized work — a quick verification with the manager is the appropriate step before taking disruptive action.",
        wrong:
          "The evidence trail — assigned Jira ticket, standup discussion, and business-hours access — strongly suggests legitimate development work. Escalating as a breach or closing without verification are both inappropriate responses.",
      },
    },
    {
      type: "investigate-decide",
      id: "insider-003",
      title: "Late-Night VPN Activity from Senior Architect",
      objective:
        "SOC alert: VPN connection from a senior architect at 2:30 AM on a Tuesday. Assess the threat level.",
      investigationData: [
        {
          id: "vpn-log",
          label: "VPN Log",
          content:
            "Connection from 73.189.24.105 (Residential ISP — matches employee home address on file) at 2:27 AM. Duration: 3 hours 42 minutes. Disconnected at 6:09 AM.",
        },
        {
          id: "repo-activity",
          label: "Repository Activity",
          content:
            "42 commits to feature branch 'arch/microservices-refactor' between 2:35 AM and 5:58 AM. All changes in /src/services/ directory — employee's assigned project area.",
        },
        {
          id: "historical-pattern",
          label: "Historical Pattern",
          content:
            "R. Tanaka has logged VPN connections after midnight 14 times in the past 90 days. Average duration: 2-4 hours. No previous security alerts.",
        },
        {
          id: "file-access",
          label: "File Access",
          content:
            "No access to finance, HR, or customer data directories. All activity within engineering codebases.",
        },
      ],
      actions: [
        {
          id: "DOCUMENT_MONITOR",
          label: "Document and monitor — no malicious indicators",
          color: "green",
        },
        {
          id: "RESTRICT_VPN",
          label: "Restrict after-hours VPN access",
          color: "orange",
        },
        {
          id: "ESCALATE_COMPROMISE",
          label: "Escalate as potential credential compromise",
          color: "red",
        },
        {
          id: "REQUIRE_EXPLANATION",
          label: "Require the employee to explain their hours",
          color: "yellow",
        },
      ],
      correctActionId: "DOCUMENT_MONITOR",
      rationales: [
        {
          id: "rat-document",
          text: "Established pattern of late-night work + activity within normal scope + no anomalous data access = consistent behavior, not a threat.",
        },
        {
          id: "rat-restrict",
          text: "Restricting a productive senior architect's VPN access damages retention.",
        },
        {
          id: "rat-escalate",
          text: "Escalating normal behavior as credential compromise wastes SOC resources.",
        },
        {
          id: "rat-explain",
          text: "Requiring justification for work hours oversteps security's role.",
        },
      ],
      correctRationaleId: "rat-document",
      feedback: {
        perfect:
          "Correct. R. Tanaka has a well-established pattern of late-night work, all activity is within their assigned project scope, and there is zero access to sensitive data outside engineering. This is normal behavior for this user's baseline.",
        partial:
          "You recognized some indicators were benign but chose a response that would either waste resources or damage the employee relationship. Always compare current activity against the user's historical baseline before escalating.",
        wrong:
          "This scenario shows consistent, established behavior within the employee's normal scope. Escalating routine activity as a security incident erodes trust between security and engineering teams.",
      },
    },
    {
      type: "investigate-decide",
      id: "insider-004",
      title: "USB Mass Storage Violation in Secure Area",
      objective:
        "Endpoint agent detected a USB mass storage device in the finance secure area where USB storage is prohibited. Investigate.",
      investigationData: [
        {
          id: "endpoint-log",
          label: "Endpoint Log",
          content:
            "Device connected: USB Mass Storage Device (vendor: SanDisk, model: Cruzer Blade 32GB) at 10:42 AM on workstation FIN-WS-14. 3 files copied TO device: Q3_forecast.xlsx (2.1MB), budget_draft.docx (890KB), vendor_payments.csv (4.3MB)",
          isCritical: true,
        },
        {
          id: "user-statement",
          label: "User Statement",
          content:
            "Employee Jennifer Okafor (Financial Analyst) states: 'It's just my phone charger cable. I didn't plug in any USB drive.' When shown the log, revises: 'Oh, I forgot — I needed to bring those files to the conference room that doesn't have network access.'",
        },
        {
          id: "policy-reference",
          label: "Policy Reference",
          content:
            "Finance Secure Area Policy FIN-003: USB mass storage devices prohibited. Violations must be reported to CISO. Last policy acknowledgment by J. Okafor: January 15, 2026.",
        },
        {
          id: "prior-history",
          label: "Prior History",
          content:
            "No previous policy violations. Employee for 4 years. Performance reviews: Exceeds Expectations.",
        },
      ],
      actions: [
        {
          id: "INVESTIGATE_ESCALATE",
          label: "Investigate device and escalate to security — policy violation in restricted area",
          color: "red",
        },
        {
          id: "ACCEPT_LOG",
          label: "Accept explanation and log the incident",
          color: "green",
        },
        {
          id: "CONFISCATE_USB",
          label: "Confiscate the USB drive and return files",
          color: "orange",
        },
        {
          id: "VERBAL_WARNING",
          label: "Issue a verbal warning and update training",
          color: "yellow",
        },
      ],
      correctActionId: "INVESTIGATE_ESCALATE",
      rationales: [
        {
          id: "rat-investigate",
          text: "USB policy violation in a restricted area requires investigation regardless of stated intent — the changing story and sensitive file types elevate concern.",
        },
        {
          id: "rat-accept",
          text: "Accepting the explanation sets a precedent that policy doesn't apply to long-tenured employees.",
        },
        {
          id: "rat-warning",
          text: "A verbal warning is appropriate but only after proper investigation.",
        },
        {
          id: "rat-confiscate",
          text: "Confiscating evidence should be done by security personnel with proper chain of custody.",
        },
      ],
      correctRationaleId: "rat-investigate",
      feedback: {
        perfect:
          "Correct. The changing story — from denying any USB to remembering file transfers — combined with sensitive financial data and a clear policy violation requires formal investigation. Policy FIN-003 explicitly mandates CISO notification.",
        partial:
          "You recognized the policy violation but chose a response that either bypasses the required investigation or mishandles potential evidence. Finance secure area violations must follow the documented escalation path.",
        wrong:
          "A USB policy violation in a restricted finance area with sensitive files and an inconsistent explanation cannot be accepted or handled informally. The policy explicitly requires CISO notification and investigation.",
      },
    },
  ],

  hints: [
    "Context matters enormously in insider threat cases. A large download by someone who always downloads large files is different from one by someone who never does.",
    "The combination of resignation + competitor + unusual data access is the classic insider threat trifecta. Each alone might be benign; together they demand investigation.",
    "After-hours activity by someone with an established pattern of after-hours work is very different from a first-time occurrence. Check historical baselines before escalating.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Insider threat analysts combine technical investigation with behavioral analysis. This role is growing rapidly as organizations recognize that insiders — both malicious and negligent — cause more data breaches than external attackers.",
  toolRelevance: [
    "Microsoft Purview (DLP)",
    "Varonis (Data Access Monitoring)",
    "Exabeam (UEBA)",
    "Splunk UBA",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
