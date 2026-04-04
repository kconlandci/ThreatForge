import type { LabManifest } from "../../types/manifest";

export const accessRecertificationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "access-recertification",
  version: 1,
  title: "Access Recertification Campaign",

  tier: "intermediate",
  track: "identity-access",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["access-review", "recertification", "identity-governance", "least-privilege", "iga", "access-management"],

  description:
    "Conduct quarterly access recertification decisions — determining which user access should be retained, revoked, or escalated for review based on role alignment, usage patterns, and risk indicators.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Apply access review decision criteria to identify inappropriate or unnecessary access",
    "Distinguish access that should be revoked from access requiring additional investigation",
    "Recognize access patterns that indicate privilege creep and segregation of duties violations",
  ],
  sortOrder: 730,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "access-001",
      title: "Finance Team Member with Developer Production Access",
      context:
        "Q2 access recertification review. User: jane.smith, Role: Financial Analyst (Finance team). Current access includes: Finance ERP (read-write), reporting dashboards, and also: production AWS console (EC2, S3, RDS access), GitHub production repository (write access), and Jenkins production deployment pipeline. Jane's manager certified all access as 'required' last quarter. IT records show Jane's last GitHub login: 8 months ago. AWS last login: 6 months ago.",
      displayFields: [
        { label: "Primary Role", value: "Financial Analyst — Finance team", emphasis: "normal" },
        { label: "Finance Access", value: "Finance ERP (read-write), reporting dashboards", emphasis: "normal" },
        { label: "Production Tech Access", value: "AWS console, GitHub write, Jenkins deploy", emphasis: "critical" },
        { label: "Last Tech Access", value: "GitHub: 8 months ago | AWS: 6 months ago", emphasis: "warn" },
        { label: "Manager Certification", value: "Certified 'required' last quarter", emphasis: "warn" },
      ],
      actions: [
        {
          id: "REVOKE_TECH_INVESTIGATE_MANAGER",
          label: "Revoke production tech access, notify Jane, investigate why a Financial Analyst had production infrastructure access",
          color: "red",
        },
        {
          id: "RECERTIFY_MANAGER_APPROVED",
          label: "Recertify — manager approved it last quarter",
          color: "orange",
        },
        {
          id: "FLAG_FOR_REVIEW",
          label: "Flag for manager re-review with questions about business justification",
          color: "yellow",
        },
        {
          id: "NOTIFY_IT",
          label: "Notify IT to investigate the access anomaly",
          color: "blue",
        },
      ],
      correctActionId: "REVOKE_TECH_INVESTIGATE_MANAGER",
      rationales: [
        {
          id: "rat-clear-revoke",
          text: "A Financial Analyst with production AWS, GitHub write, and Jenkins deployment access is a clear access misconfiguration — financial analysts don't deploy code to production infrastructure. This is classic privilege creep. The combination of Finance ERP write access plus production deployment capability also creates a segregation of duties violation (could potentially manipulate financial data AND deploy code to conceal it). Manager certification of clearly inappropriate access last quarter indicates the manager either didn't understand what they were certifying or is rubber-stamping without review. Revoke the tech access and investigate how a Financial Analyst accumulated production infrastructure access.",
        },
        {
          id: "rat-manager-approved",
          text: "Manager approval of clearly inappropriate cross-functional access is a red flag for rubber-stamping, not a green light for recertification. Access must align with job function regardless of manager approval.",
        },
        {
          id: "rat-flag-for-review",
          text: "Flagging for re-review is reasonable for ambiguous cases. This case isn't ambiguous — a Financial Analyst with no production tech use in 8 months has no business justification. Revoke now, request business justification to restore if genuinely needed.",
        },
        {
          id: "rat-notify-it",
          text: "IT investigation is appropriate but shouldn't delay revocation of clearly inappropriate access. Revoke first, investigate in parallel.",
        },
      ],
      correctRationaleId: "rat-clear-revoke",
      feedback: {
        perfect: "Correct. Financial Analyst with production AWS/GitHub/Jenkins access is unambiguous privilege creep. Revoke and investigate — manager approval of clearly inappropriate access warrants process investigation.",
        partial: "Flagging for re-review is too slow for clear privilege creep. When access clearly doesn't align with role function, revoke first and restore if justified.",
        wrong: "Manager approval last quarter doesn't validate clearly inappropriate access. Recertification is the control that catches these gaps — not a rubber stamp.",
      },
    },
    {
      type: "action-rationale",
      id: "access-002",
      title: "Contractor Access Review — Project Ended",
      context:
        "Access recertification for contractor account: contractor@vendor.com. Active accounts in: Salesforce CRM (admin), customer database (read), internal Confluence wiki (write), and email distribution lists (IT-team, security-team, all-hands). Contract status: Contract ended 90 days ago. Project: CRM customization (completed). Contractor's manager: IT Director (who left the company 45 days ago).",
      displayFields: [
        { label: "Contract Status", value: "Ended 90 days ago", emphasis: "critical" },
        { label: "Active Access", value: "Salesforce Admin, Customer DB read, Confluence write, email lists", emphasis: "critical" },
        { label: "Manager Status", value: "Original manager left company 45 days ago", emphasis: "warn" },
        { label: "Project Status", value: "CRM customization project completed", emphasis: "normal" },
        { label: "Last Login", value: "Not provided in the recertification data", emphasis: "warn" },
      ],
      actions: [
        {
          id: "IMMEDIATE_REVOKE_ALL",
          label: "Immediately revoke all access, check last login timestamp, report as access lifecycle failure",
          color: "red",
        },
        {
          id: "FIND_NEW_MANAGER",
          label: "Assign to a new manager for recertification decision",
          color: "orange",
        },
        {
          id: "VERIFY_CONTRACTOR",
          label: "Contact the contractor to verify if access is still needed",
          color: "yellow",
        },
        {
          id: "QUARTERLY_RECERTIFY",
          label: "Continue current access until next quarterly review",
          color: "blue",
        },
      ],
      correctActionId: "IMMEDIATE_REVOKE_ALL",
      rationales: [
        {
          id: "rat-immediate-revoke",
          text: "A contractor with no current contract has no business justification for any access — this should have been revoked 90 days ago when the contract ended. The access is especially concerning: Salesforce Admin access (full CRM configuration and data access), customer database read (customer PII), and email distribution list membership including the security team (intelligence gathering opportunity). Revoke immediately regardless of whether anyone is available to certify it — no current contract = no access. Check last login to determine if there was any access during the unauthorized 90-day window. Report as an access lifecycle failure requiring process investigation.",
        },
        {
          id: "rat-find-manager",
          text: "Finding a new manager for certification just delays the obvious decision. Contractors with no current contracts don't need a manager to authorize revocation — they need their access removed immediately.",
        },
        {
          id: "rat-contact-contractor",
          text: "Contacting the contractor to ask if they still need access is exactly backwards — the contractor should request access if a new engagement begins, not retain it until they say they no longer need it.",
        },
        {
          id: "rat-continue-quarterly",
          text: "Continuing access for a contractor with no current contract until next quarter means potentially 3 more months of unauthorized access to customer data and the security team email list.",
        },
      ],
      correctRationaleId: "rat-immediate-revoke",
      feedback: {
        perfect: "Correct. No current contract = immediate access revocation, no approval needed. The 90-day unauthorized access window and Salesforce admin access require breach investigation.",
        partial: "Waiting for manager certification or contacting the contractor delays the obvious decision. Expired contracts are not recertification edge cases — they're immediate revocations.",
        wrong: "Continuing contractor access with no current contract 'until next quarter' extends unauthorized access by another 3 months. This is an immediate revocation, not a recertification decision.",
      },
    },
    {
      type: "action-rationale",
      id: "access-003",
      title: "Legitimate Access Retention — Dual-Role Employee",
      context:
        "Access recertification for: alex.morgan, Title: Security Engineer. Current access: security SIEM (admin), vulnerability scanner (admin), GitHub (write — security tooling repos), AWS security account (admin), employee HR data (read-only). Manager certification note: 'Alex performs code security reviews across all engineering repos and responds to HR data access requests from the security team.' Last HR data access: yesterday.",
      displayFields: [
        { label: "Role", value: "Security Engineer — legitimate cross-functional needs", emphasis: "normal" },
        { label: "Security Tool Access", value: "SIEM admin, vuln scanner, AWS security account — role-appropriate", emphasis: "normal" },
        { label: "GitHub Access", value: "Write access to security tooling repos — role-appropriate", emphasis: "normal" },
        { label: "HR Data Access", value: "Read-only employee HR data — recent access yesterday", emphasis: "warn" },
        { label: "Manager Justification", value: "Detailed explanation provided for all access including HR", emphasis: "normal" },
      ],
      actions: [
        {
          id: "RECERTIFY_ALL",
          label: "Recertify all access — all items align with documented role and recent use",
          color: "green",
        },
        {
          id: "REVOKE_HR",
          label: "Revoke HR data access — security engineers shouldn't have HR access",
          color: "orange",
        },
        {
          id: "INVESTIGATE_HR_ACCESS",
          label: "Investigate yesterday's HR data access before recertifying",
          color: "yellow",
        },
        {
          id: "ESCALATE_MANAGEMENT",
          label: "Escalate to CISO — too much admin access for one person",
          color: "red",
        },
      ],
      correctActionId: "RECERTIFY_ALL",
      rationales: [
        {
          id: "rat-legitimate-access",
          text: "This is a legitimate access profile for a Security Engineer with a dual-role function. Security team HR data access is common and necessary for: insider threat investigations, background checks, off-boarding reviews, and responding to legal/compliance data access requests. The manager provided a documented business justification, the access is read-only (appropriate for the use case), and there's recent legitimate use. SIEM admin, vulnerability scanner admin, and AWS security account are all standard Security Engineer access. This recertification should be approved — it's exactly what well-documented, role-appropriate access looks like.",
        },
        {
          id: "rat-revoke-hr",
          text: "Security engineers investigating insider threats or supporting compliance work legitimately need HR data read access. Role-based denial ignores the documented business justification.",
        },
        {
          id: "rat-investigate",
          text: "Investigating recent legitimate access by a certified user with documented business justification creates false alarm overhead. Investigate unusual access patterns — not recent access from documented accounts.",
        },
        {
          id: "rat-escalate",
          text: "Admin access to security tools is appropriate and expected for a Security Engineer. Escalating every instance of multi-system admin access for security staff would prevent security teams from operating effectively.",
        },
      ],
      correctRationaleId: "rat-legitimate-access",
      feedback: {
        perfect: "Correct judgment. Well-documented, role-appropriate access with recent legitimate use and manager justification should be recertified efficiently. This is what good access looks like.",
        partial: "HR access for security engineers supporting insider threat and compliance functions is legitimate when documented. Don't revoke role-appropriate access based on title mismatch alone.",
        wrong: "Escalating well-documented, role-appropriate access wastes security leadership time and creates friction for access that is working as intended. Reserve escalation for actual anomalies.",
      },
    },
  ],

  hints: [
    "Access recertification is most valuable when certifiers actively review — rubber-stamp approvals (certifying without investigating business justification) undermine the entire control.",
    "Contractors with expired contracts should never require manager approval to revoke access — no active contract means no access, regardless of certification status.",
    "Privilege creep is detected by comparing current access to current job function — not to what the manager approves, but to what the role requires.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Access recertification is a core identity governance control required by SOX, PCI-DSS, HIPAA, and most security frameworks. Identity and access management professionals who understand how to run effective recertification campaigns — avoiding both rubber-stamping and over-revoking — are essential in enterprise security.",
  toolRelevance: [
    "SailPoint IdentityNow",
    "Saviynt Enterprise Identity Cloud",
    "Microsoft Entra ID Governance",
    "Varonis (data access governance)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
