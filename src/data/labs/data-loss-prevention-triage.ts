import type { LabManifest } from "../../types/manifest";

export const dataLossPreventionTriageLab: LabManifest = {
  schemaVersion: "1.1",
  id: "data-loss-prevention-triage",
  version: 1,
  title: "Data Loss Prevention Triage",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "dlp",
    "data-loss-prevention",
    "pii",
    "incident-response",
    "compliance",
    "secret-detection",
  ],

  description:
    "Evaluate DLP alerts across email, file sharing, backups, and public forums. Classify severity based on data sensitivity and exposure scope, then select proportional remediation actions.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Classify DLP alerts by severity using data sensitivity and exposure scope",
    "Apply proportional incident response to data loss events",
    "Distinguish genuine data breaches from false positives and policy violations",
    "Understand regulatory notification requirements for PII exposure",
    "Implement preventive controls to reduce future DLP incidents",
  ],
  sortOrder: 290,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "dlp-001",
      title: "PII Exfiltration — SSNs to Personal Email",
      description:
        "DLP alert triggered on an outbound email containing employee Social Security Numbers sent to a personal email address.",
      evidence: [
        {
          type: "DLP Alert",
          content:
            "Email from r.kim@acmecorp.com to rachel.kim.personal@gmail.com. Subject: 'backup copy.' Attachment: employee_data_2026.xlsx (200 rows, SSN column detected).",
        },
        {
          type: "Sender Context",
          content:
            "Rachel Kim, HR Coordinator, 2 years tenure. No previous DLP alerts. Authorized to access HR data for her role.",
        },
        {
          type: "Email Analysis",
          content:
            "Sent at 5:47 PM Friday. Auto-forwarding rule NOT set. This was a manual send.",
        },
        {
          type: "Data Impact",
          content:
            "200 employee SSNs, names, addresses, salary information. Subject to state breach notification laws and CCPA.",
        },
      ],
      classifications: [
        { id: "c-critical", label: "Critical", description: "Data breach requiring immediate incident response." },
        { id: "c-high", label: "High", description: "Significant data exposure requiring urgent action." },
        { id: "c-medium", label: "Medium", description: "Policy violation requiring investigation." },
        { id: "c-low", label: "Low", description: "Minor policy deviation — log and monitor." },
      ],
      correctClassificationId: "c-critical",
      remediations: [
        {
          id: "r-breach-response",
          label: "Invoke data breach response — recall email, contact employee, assess notification requirements",
          description: "Treats as a data breach: attempts email recall, initiates employee interview, and evaluates regulatory notification obligations.",
        },
        {
          id: "r-warning",
          label: "Send a warning email to the employee",
          description: "Addresses the behavior but doesn't address the already-sent PII.",
        },
        {
          id: "r-block",
          label: "Block the employee's email access",
          description: "Prevents further sends but doesn't address the data already in the personal inbox.",
        },
        {
          id: "r-monitor",
          label: "Log and monitor for repeat behavior",
          description: "Watches for patterns but takes no immediate action on the current breach.",
        },
      ],
      correctRemediationId: "r-breach-response",
      rationales: [
        {
          id: "rat-breach",
          text: "200 SSNs to a personal email constitutes a data breach regardless of intent — recall the email if possible, interview the employee, and assess regulatory notification requirements under state laws and CCPA.",
        },
        {
          id: "rat-warning",
          text: "A warning email is insufficient for a breach involving 200 SSNs — regulatory notification may already be required.",
        },
        {
          id: "rat-block",
          text: "Blocking email doesn't address the data that already landed in a personal Gmail account outside organizational control.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring ignores the fact that PII has already left the organization — the breach has already occurred.",
        },
      ],
      correctRationaleId: "rat-breach",
      feedback: {
        perfect:
          "Correct. 200 SSNs sent to a personal email is a data breach with regulatory implications regardless of the employee's intent. Immediate breach response — email recall, employee interview, and notification assessment — is the only appropriate action.",
        partial:
          "You recognized the severity but chose an incomplete response. SSNs outside organizational control trigger breach notification obligations that require formal incident response.",
        wrong:
          "200 employee SSNs in a personal Gmail account is a data breach. Warning emails and monitoring don't address the regulatory notification requirements or the data that's already outside your control.",
      },
    },
    {
      type: "triage-remediate",
      id: "dlp-002",
      title: "Confidential Roadmap — Public Sharing Link",
      description:
        "DLP alert: a product roadmap marked 'Internal — Confidential' was shared via a publicly accessible file sharing link.",
      evidence: [
        {
          type: "DLP Alert",
          content:
            "File: product_roadmap_2026_Q3.pdf shared via Dropbox public link by j.santos@acmecorp.com to external email c.park@customercorp.com.",
        },
        {
          type: "Document Classification",
          content:
            "Marked 'Internal — Confidential' on page 1. Contains unreleased feature timelines and competitive positioning.",
        },
        {
          type: "Business Context",
          content:
            "Customer Corp is under NDA (signed January 2026). J. Santos (Sales Engineer) regularly shares product materials with this customer.",
        },
        {
          type: "Sharing Method",
          content:
            "Dropbox public link — accessible to anyone with the URL. Not password-protected.",
        },
      ],
      classifications: [
        { id: "c-critical", label: "Critical", description: "Data breach requiring immediate incident response." },
        { id: "c-high", label: "High", description: "Significant data exposure requiring urgent action." },
        { id: "c-medium", label: "Medium", description: "Policy violation requiring investigation." },
        { id: "c-low", label: "Low", description: "Minor policy deviation — log and monitor." },
      ],
      correctClassificationId: "c-medium",
      remediations: [
        {
          id: "r-verify-fix",
          label: "Verify NDA covers this content + expire public link + remind about secure sharing channels",
          description: "Confirms authorization, closes the exposure vector, and educates on proper sharing methods.",
        },
        {
          id: "r-terminate",
          label: "Revoke NDA and terminate customer relationship",
          description: "Ends the business relationship over a sharing method issue.",
        },
        {
          id: "r-block-sharing",
          label: "Block all external file sharing",
          description: "Prevents all external collaboration to eliminate the sharing risk.",
        },
        {
          id: "r-accept",
          label: "Accept — NDA-covered customer is authorized",
          description: "Considers the NDA sufficient and takes no action on the public link.",
        },
      ],
      correctRemediationId: "r-verify-fix",
      rationales: [
        {
          id: "rat-verify",
          text: "The customer may be authorized under NDA, but the PUBLIC link is the issue — anyone with the URL can access it, not just the intended recipient.",
        },
        {
          id: "rat-terminate",
          text: "Terminating the customer relationship over a sharing method issue is disproportionate — the intent was legitimate, the method was wrong.",
        },
        {
          id: "rat-block",
          text: "Blocking all external file sharing kills sales operations — the solution is secure sharing, not no sharing.",
        },
        {
          id: "rat-accept",
          text: "Accepting without fixing the public link leaves confidential data exposed to anyone who discovers or guesses the URL.",
        },
      ],
      correctRationaleId: "rat-verify",
      feedback: {
        perfect:
          "Correct. The NDA likely authorizes sharing with Customer Corp, but the public Dropbox link means anyone with the URL can access confidential roadmap data. Expire the link, verify NDA scope, and guide the sales engineer to secure sharing channels.",
        partial:
          "You identified the issue but your response was either too aggressive or too lenient. The problem is the public link, not the sharing itself — fix the method while preserving the business relationship.",
        wrong:
          "A public Dropbox link to confidential competitive positioning is accessible to anyone, not just the NDA-covered customer. The sharing intent may be legitimate, but the public exposure needs immediate remediation.",
      },
    },
    {
      type: "triage-remediate",
      id: "dlp-003",
      title: "Backup Process — DLP False Positive",
      description:
        "DLP alert triggered on the nightly backup process transferring customer data to the backup provider.",
      evidence: [
        {
          type: "DLP Alert",
          content:
            "500GB data transfer from backup-agent-01 to backups.vaultcloud.com at 2:00 AM. Pattern match: customer PII detected in backup stream.",
        },
        {
          type: "Backup Context",
          content:
            "VaultCloud is the approved backup vendor (SOC 2 Type II certified). Backup schedule: nightly at 2 AM per policy BKP-001.",
        },
        {
          type: "Vendor Status",
          content:
            "VaultCloud on approved vendor list since 2024. Data processing agreement (DPA) signed. Annual security review passed March 2026.",
        },
        {
          type: "Transfer Security",
          content:
            "Backup encrypted in transit (TLS 1.3) and at rest (AES-256). Dedicated VPN tunnel between backup agent and VaultCloud.",
        },
      ],
      classifications: [
        { id: "c-critical", label: "Critical", description: "Data breach requiring immediate incident response." },
        { id: "c-high", label: "High", description: "Significant data exposure requiring urgent action." },
        { id: "c-medium", label: "Medium", description: "Policy violation requiring investigation." },
        { id: "c-info", label: "Informational (expected behavior)", description: "Known approved process — no security concern." },
      ],
      correctClassificationId: "c-info",
      remediations: [
        {
          id: "r-exception",
          label: "Create DLP exception for backup process + document approval + quarterly review",
          description: "Whitelists the known backup process with documentation and periodic review to prevent alert fatigue.",
        },
        {
          id: "r-block",
          label: "Block the backup transfer",
          description: "Stops the data transfer to investigate the alert.",
        },
        {
          id: "r-investigate",
          label: "Investigate VaultCloud for data theft",
          description: "Treats the approved vendor as a threat and initiates a security investigation.",
        },
        {
          id: "r-reduce",
          label: "Reduce backup frequency",
          description: "Decreases the number of DLP alerts by backing up less frequently.",
        },
      ],
      correctRemediationId: "r-exception",
      rationales: [
        {
          id: "rat-exception",
          text: "This is a known, approved, encrypted backup process to a vetted vendor — create a properly scoped DLP exception to prevent alert fatigue while maintaining a quarterly review cadence.",
        },
        {
          id: "rat-block",
          text: "Blocking backups creates data loss risk and disrupts business continuity for a known approved process.",
        },
        {
          id: "rat-investigate",
          text: "Investigating a vetted SOC 2 Type II vendor based on expected backup behavior wastes security resources.",
        },
        {
          id: "rat-reduce",
          text: "Reducing backup frequency increases data loss exposure and doesn't address the root cause — the DLP rule needs an exception.",
        },
      ],
      correctRationaleId: "rat-exception",
      feedback: {
        perfect:
          "Correct. This is a textbook false positive — an approved, encrypted backup to a vetted vendor triggering on PII patterns. A documented DLP exception with quarterly review prevents alert fatigue while maintaining oversight.",
        partial:
          "You recognized this isn't a real threat but chose an incomplete response. The backup process needs a formal DLP exception to prevent this alert from firing every night and contributing to alert fatigue.",
        wrong:
          "This is an approved nightly backup to a SOC 2 certified vendor over an encrypted VPN tunnel. Blocking backups or investigating the vendor based on expected behavior wastes resources and creates risk.",
      },
    },
    {
      type: "triage-remediate",
      id: "dlp-004",
      title: "Source Code with Secrets on Public Forum",
      description:
        "DLP alert: a developer pasted source code containing hardcoded API keys and internal service URLs to a public debugging forum.",
      evidence: [
        {
          type: "DLP Alert",
          content:
            "User d.chen@acmecorp.com posted to stackoverflow.com. Content includes: AWS_SECRET_ACCESS_KEY, INTERNAL_API_URL (api.internal.acmecorp.com), DATABASE_CONNECTION_STRING.",
        },
        {
          type: "Post Context",
          content:
            "Developer asked for help debugging a connection timeout issue. The code snippet includes production connection strings.",
        },
        {
          type: "Exposure",
          content:
            "Stack Overflow post is public and indexed by Google. Posted 4 hours ago. 3 views so far.",
        },
        {
          type: "Key Status",
          content:
            "AWS key is active. Database connection string uses current production credentials.",
        },
      ],
      classifications: [
        { id: "c-critical", label: "Critical", description: "Data breach requiring immediate incident response." },
        { id: "c-high", label: "High", description: "Significant data exposure requiring urgent action." },
        { id: "c-medium", label: "Medium", description: "Policy violation requiring investigation." },
        { id: "c-low", label: "Low", description: "Minor policy deviation — log and monitor." },
      ],
      correctClassificationId: "c-high",
      remediations: [
        {
          id: "r-comprehensive",
          label: "Request post removal + rotate all exposed keys + implement pre-commit hooks",
          description: "Removes the exposure, invalidates compromised credentials, and prevents future occurrences with automated scanning.",
        },
        {
          id: "r-rotate-only",
          label: "Rotate keys only",
          description: "Invalidates the exposed credentials but leaves them visible on the public post.",
        },
        {
          id: "r-remove-only",
          label: "Request post removal only",
          description: "Removes the visible exposure but doesn't invalidate credentials that may already be harvested.",
        },
        {
          id: "r-block",
          label: "Add a firewall rule to block Stack Overflow",
          description: "Prevents access to the forum from corporate networks.",
        },
      ],
      correctRemediationId: "r-comprehensive",
      rationales: [
        {
          id: "rat-comprehensive",
          text: "Exposed production credentials require immediate rotation, the post must be removed to stop further exposure, and pre-commit hooks prevent this from happening again.",
        },
        {
          id: "rat-rotate",
          text: "Rotating without removal leaves the credentials on a public Google-indexed page — even rotated, the internal URLs and patterns remain exposed.",
        },
        {
          id: "rat-remove",
          text: "Removal without rotation leaves active credentials that may already be harvested during the 4-hour exposure window.",
        },
        {
          id: "rat-block",
          text: "Blocking Stack Overflow is disproportionate and ineffective — developers will use personal devices, and the post is already public.",
        },
      ],
      correctRationaleId: "rat-comprehensive",
      feedback: {
        perfect:
          "Correct. Active production credentials on a public, Google-indexed page require all three actions: remove the post, rotate the credentials, and implement pre-commit hooks to prevent recurrence. Each action alone leaves a gap.",
        partial:
          "You addressed part of the problem but left a gap. Removing without rotating leaves live credentials potentially harvested. Rotating without removing leaves internal architecture details exposed.",
        wrong:
          "Active AWS keys and production database credentials are on a public, indexed Stack Overflow post. Both removal and rotation are required immediately, plus preventive controls to stop this from recurring.",
      },
    },
  ],

  hints: [
    "The severity of a DLP alert depends on both the data sensitivity and the exposure scope. SSNs to personal email is always critical regardless of intent.",
    "Not every DLP alert is a breach. Automated backups to approved vendors are expected behavior that should be whitelisted to prevent alert fatigue.",
    "When credentials are exposed publicly, you need to both remove the exposure AND rotate the credentials. Either action alone is insufficient.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "DLP alert triage is one of the highest-volume tasks for security operations teams. The ability to quickly classify alerts by severity and apply proportional responses prevents both over-reaction (blocking legitimate business) and under-reaction (missing real breaches).",
  toolRelevance: [
    "Microsoft Purview DLP",
    "Symantec DLP",
    "Google Workspace DLP",
    "GitGuardian (code secret detection)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
