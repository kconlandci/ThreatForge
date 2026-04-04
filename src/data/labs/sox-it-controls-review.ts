import type { LabManifest } from "../../types/manifest";

export const soxItControlsReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "sox-it-controls-review",
  version: 1,
  title: "SOX IT General Controls Review",

  tier: "advanced",
  track: "vulnerability-hardening",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["sox", "compliance", "itgc", "access-controls", "change-management", "audit"],

  description:
    "Evaluate IT General Controls (ITGCs) for SOX compliance — identifying access control deficiencies, segregation of duties violations, and change management failures that create material weakness findings.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify SOX ITGC deficiencies in access management, change control, and IT operations",
    "Distinguish significant deficiencies from material weaknesses in SOX audit context",
    "Recommend remediation that addresses root causes rather than symptoms",
  ],
  sortOrder: 680,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "sox-001",
      title: "Developer Production Database Access",
      description:
        "SOX audit preparation reveals developers have direct read-write access to the production financial database. Assess the SOX control implication.",
      evidence: [
        {
          type: "Access Review Finding",
          content:
            "8 developers have direct SQL access (INSERT, UPDATE, DELETE) to the production financial reporting database (FinanceDB). Access has been in place for 12-18 months. Developers use this access for 'hotfixes' and 'data corrections' bypassing the change management process.",

        },
        {
          type: "SOX Requirement",
          content:
            "SOX Section 302/404 requires effective internal controls over financial reporting. PCAOB AS 2201 identifies segregation of duties as a key ITGC. Allowing developers to modify production financial data without authorization bypasses the control environment.",

        },
        {
          type: "Usage Audit",
          content:
            "Database audit logs show 47 direct data modifications by developers in the past 6 months. 12 modifications lacked any associated change ticket. 3 modifications occurred to account balance records in the general ledger.",

        },
        {
          type: "Management Override",
          content:
            "CFO is aware of the practice and considers it 'operational necessity for quick fixes.' External auditor will review this during Q4 assessment in 6 weeks.",
        },
      ],
      classifications: [
        { id: "material-weakness", label: "Material Weakness — Segregation of Duties Failure", description: "Developer production access violates SOD requirements and represents a material weakness in internal controls" },
        { id: "significant-deficiency", label: "Significant Deficiency — Requires Compensating Controls", description: "Control gap that doesn't rise to material weakness with proper compensating controls" },
        { id: "exception", label: "Documented Exception — Management Override is Acceptable", description: "CFO authorization constitutes an appropriate management override" },
        { id: "operational-risk", label: "Operational Risk — No SOX Implication", description: "Developer access is an operational security concern without direct SOX impact" },
      ],
      correctClassificationId: "material-weakness",
      remediations: [
        {
          id: "revoke-implement-process-review",
          label: "Revoke developer production access, implement emergency change process, review 47 modifications with auditors",
          description: "Remove developer production access, create an expedited change management path for urgent fixes, and have external auditors review all unauthorized modifications to financial records",
        },
        {
          id: "add-approval-workflow",
          label: "Require manager approval before developer exercises production access",
          description: "Add an approval layer rather than removing the access",
        },
        {
          id: "document-exceptions",
          label: "Formally document all past uses as management-approved exceptions",
          description: "Retroactively document the developer access usage as authorized exceptions",
        },
        {
          id: "monitoring-controls",
          label: "Add monitoring to alert on developer production access usage",
          description: "Implement alerting as a compensating control",
        },
      ],
      correctRemediationId: "revoke-implement-process-review",
      rationales: [
        {
          id: "rat-material-weakness",
          text: "Developer write access to production financial data is a classic material weakness under SOX Section 404. Segregation of duties requires that those who build and deploy code cannot directly modify production financial data — the risk is that developers can manipulate financial records to conceal fraud. Three things are required: revoke the access (remediate the control gap), implement an expedited change management process for urgent fixes (address the business need that drove the bypass), and have auditors review all 47 modifications (determine whether any financial data was improperly altered). Retroactive documentation doesn't remediate the control failure.",
        },
        {
          id: "rat-approval-layer",
          text: "Adding approval doesn't solve the fundamental segregation of duties violation — developers should not have the technical capability to modify production financial data. Approval workflows can be circumvented. The access must be removed.",
        },
      ],
      correctRationaleId: "rat-material-weakness",
      feedback: {
        perfect: "Correct material weakness classification. Developer production write access to financial databases is a textbook SOX SOD violation. Revoke access, implement change process, and have auditors review all modifications before Q4 assessment.",
        partial: "Compensating controls or approval layers don't address the fundamental SOD violation. SOX requires that developers cannot technically modify production financial data — not just that there's oversight of it.",
        wrong: "CFO awareness doesn't make a segregation of duties violation compliant. External auditors will classify developer production financial database access as a material weakness regardless of management knowledge.",
      },
    },
    {
      type: "triage-remediate",
      id: "sox-002",
      title: "Unauthorized Production Change Deployed",
      description:
        "A change to the financial reporting module was deployed to production without completing the required change management process. Assess the SOX impact.",
      evidence: [
        {
          type: "Change Discovery",
          content:
            "Production deployment of financial-reporting-v2.3.1 occurred at 23:47 Friday. No change ticket exists for this deployment. Change management policy requires: change ticket, business owner approval, security review, testing sign-off, and CAB approval for all financial system changes.",

        },
        {
          type: "Code Review",
          content:
            "The unauthorized change modified the quarterly revenue calculation logic. The diff shows: a rounding rule was changed from ROUND_HALF_UP to ROUND_HALF_DOWN for revenue recognition calculations. Developer 'jchen' committed and deployed without review.",

        },
        {
          type: "Financial Impact",
          content:
            "The rounding change affects revenue recognition for transactions between $0.50 and $1.49. Estimated impact: $142,000 reduction in reported Q4 revenue. Q4 earnings release is scheduled for next week.",
        },
        {
          type: "Developer Statement",
          content:
            "Developer states the change was 'fixing a bug' found during testing. No bug report, test results, or business owner communication exists for this change.",
        },
      ],
      classifications: [
        { id: "critical-sox-violation", label: "Critical SOX Violation — Potential Financial Misstatement", description: "Unauthorized change to revenue calculation logic is a critical ITGC failure with potential financial statement impact" },
        { id: "change-management-failure", label: "Change Management Failure — No Financial Impact", description: "Process violation but rounding change has no material financial impact" },
        { id: "developer-error", label: "Developer Error — HR Discipline Matter", description: "Individual process violation to be addressed through HR" },
        { id: "retrospective-approval", label: "Retrospective Change Approval Required", description: "Retroactively approve the change through the normal process" },
      ],
      correctClassificationId: "critical-sox-violation",
      remediations: [
        {
          id: "rollback-investigate-report",
          label: "Roll back the change, investigate intent, report to external auditors and CFO, file amended financials if needed",
          description: "Immediately revert to previous version, investigate whether the change was intentional manipulation or genuine bug fix, notify external auditors of a potential financial misstatement, and assess need for amended financial disclosures",
        },
        {
          id: "retrospective-approve",
          label: "Get retrospective business owner approval for the change",
          description: "Have the business owner retroactively approve the already-deployed change",
        },
        {
          id: "disciplinary-action",
          label: "Issue formal disciplinary warning to developer and monitor",
          description: "Document the process violation in the developer's HR file",
        },
        {
          id: "adjust-q4-report",
          label: "Adjust the Q4 report to reflect the new calculation and disclose",
          description: "Accept the new rounding methodology and adjust financial disclosures",
        },
      ],
      correctRemediationId: "rollback-investigate-report",
      rationales: [
        {
          id: "rat-financial-impact",
          text: "An unauthorized change to revenue recognition logic one week before earnings release is a critical SOX event. The $142,000 impact may or may not be material, but the process failure itself is a reportable ITGC deficiency. Required actions: rollback to prevent unreliable financial data from propagating (a rounding change by a developer without review may be a bug or manipulation — cannot assume benign intent), investigate whether this was accidental or intentional (financial fraud motive cannot be ruled out), report to external auditors (SOX requires disclosure of control failures that may affect financial statements), and assess whether Q4 earnings need to be delayed or amended.",
        },
        {
          id: "rat-retrospective",
          text: "Retrospective approval of an already-deployed change to revenue calculation logic is not an acceptable SOX control — it doesn't address the fact that unauthorized code ran in production and may have already affected financial reports.",
        },
      ],
      correctRationaleId: "rat-financial-impact",
      feedback: {
        perfect: "Critical classification is correct. Unauthorized revenue calculation changes require rollback, investigation of intent, and external auditor notification — especially one week before earnings release.",
        partial: "Retrospective approval or disciplinary action alone doesn't address the potential financial misstatement. External auditors must be notified of ITGC failures affecting financial reporting.",
        wrong: "Accepting or simply disclosing a rounding change made by an unauthorized developer to revenue calculations is not a SOX-compliant response. Roll back, investigate, and notify auditors.",
      },
    },
    {
      type: "triage-remediate",
      id: "sox-003",
      title: "Terminated Employee Access Not Revoked",
      description:
        "IT access review found 3 terminated employees still have active access to the financial reporting system 30-90 days after their termination dates.",
      evidence: [
        {
          type: "Access Review Finding",
          content:
            "Active accounts in FinanceERP: sarah.johnson (terminated 90 days ago, Finance Director), mike.chen (terminated 45 days ago, Senior Accountant), lisa.park (terminated 30 days ago, AP Specialist). All have read-write access to financial modules.",

        },
        {
          type: "Access Log Analysis",
          content:
            "sarah.johnson: last login 3 days ago (87 days post-termination). Files accessed: Q4 board presentation (draft), budget variance report. mike.chen: last login 2 weeks ago. lisa.park: no logins since termination.",
        },
        {
          type: "SOX Requirement",
          content:
            "SOX ITGC requires timely access revocation upon termination. PCAOB guidance suggests access revocation within 24-48 hours. The 90-day gap for a Finance Director with board-level document access is a significant deficiency at minimum.",

        },
        {
          type: "HR Process Review",
          content:
            "IT receives termination notifications from HR via a weekly batch process. The batch runs every Friday. If an employee terminates on Monday, their access persists until the following Friday at minimum.",
        },
      ],
      classifications: [
        { id: "material-weakness-active", label: "Material Weakness — Active Access by Former Finance Director", description: "Terminated Finance Director accessed confidential financial documents 87 days post-termination — potential fraud and information theft" },
        { id: "significant-deficiency", label: "Significant Deficiency — Process Failure Without Active Exploitation", description: "Process gap but access by terminated employees doesn't constitute a breach" },
        { id: "low-risk", label: "Low Risk — Likely Inadvertent Access", description: "Former employees likely accessed familiar systems without malicious intent" },
        { id: "hr-process-issue", label: "Administrative Issue — HR Process Problem, Not SOX Finding", description: "Termination notification process is an HR operational issue" },
      ],
      correctClassificationId: "material-weakness-active",
      remediations: [
        {
          id: "revoke-investigate-automate",
          label: "Revoke all three accounts immediately, investigate sarah.johnson's access to board documents, implement automated HR-to-IT provisioning",
          description: "Immediate account revocation, forensic review of what the former Finance Director accessed and whether it was disclosed externally, and automation of the termination-to-deprovisioning workflow with real-time HR system integration",
        },
        {
          id: "revoke-only",
          label: "Revoke all three accounts immediately",
          description: "Remove access for all three terminated employees",
        },
        {
          id: "reduce-batch-frequency",
          label: "Change HR batch process from weekly to daily",
          description: "Reduce the access revocation lag from 7 days to 1-2 days",
        },
        {
          id: "document-finding",
          label: "Document as an audit finding for process improvement",
          description: "Record the access control gap and plan process improvement",
        },
      ],
      correctRemediationId: "revoke-investigate-automate",
      rationales: [
        {
          id: "rat-terminated-access",
          text: "A terminated Finance Director accessing draft board presentations and budget variance reports 87 days post-termination is a material weakness with potential fraud indicators. Three required actions: revoke all three accounts immediately (obvious), investigate sarah.johnson's access forensically (board-level financial documents accessed by a terminated executive must be treated as a potential information theft or insider threat — was this data shared with a competitor or used for stock trading?), and automate the deprovisioning process (the weekly batch is the root cause — real-time HR/IT integration eliminates all future access lag). Daily batch is better than weekly but still leaves up to 24-hour windows.",
        },
        {
          id: "rat-revoke-only",
          text: "Revoking access addresses the current gap but doesn't investigate what the former Finance Director accessed or address the root cause. A Finance Director accessing board-level documents post-termination is a potential breach that must be investigated.",
        },
      ],
      correctRationaleId: "rat-terminated-access",
      feedback: {
        perfect: "Correct material weakness classification. Active post-termination access to board financial documents by a former Finance Director requires immediate revocation, forensic investigation of access, and root-cause process automation.",
        partial: "Revocation alone doesn't address the potential data exposure from the Finance Director's post-termination accesses. Those must be investigated forensically.",
        wrong: "Terminated Finance Director accessing draft board presentations 87 days after termination is a material weakness with fraud investigation triggers. This is not an administrative issue — it's a potential breach requiring forensic investigation.",
      },
    },
  ],

  hints: [
    "SOX material weaknesses must be disclosed to external auditors and shareholders — the bar is whether a 'reasonable possibility' of material misstatement exists, not certainty.",
    "Segregation of duties violations in SOX context are most critical when they allow a single individual to both initiate and approve transactions, or both develop and deploy financial system code.",
    "Post-termination access to financial systems is a SOX ITGC finding regardless of whether malicious use is proven — the access capability itself is the control failure.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "SOX compliance is mandatory for US-listed public companies, and IT General Controls failures can result in material weakness disclosures that affect stock price and executive liability. Security professionals in public company environments must understand how security controls map to financial reporting requirements.",
  toolRelevance: [
    "SailPoint / Saviynt (identity governance)",
    "ServiceNow GRC (compliance management)",
    "Workiva (SOX documentation)",
    "AuditBoard (ITGC testing)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
