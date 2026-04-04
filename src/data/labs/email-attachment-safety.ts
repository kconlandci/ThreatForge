import type { LabManifest } from "../../types/manifest";

export const emailAttachmentSafetyLab: LabManifest = {
  schemaVersion: "1.1",
  id: "email-attachment-safety",
  version: 1,
  title: "Email Attachment Safety",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "email-security",
    "phishing",
    "malware",
    "macros",
    "attachment-analysis",
    "sandboxing",
  ],

  description:
    "Evaluate email attachments for safety by analyzing file types, sender context, macro indicators, and embedded content. Decide whether to open, quarantine, or escalate suspicious attachments using proper analysis procedures.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify high-risk file types and attachment characteristics that indicate potential malware delivery",
    "Evaluate sender context and email metadata to assess attachment legitimacy",
    "Apply appropriate handling procedures for suspicious attachments including sandboxing and escalation",
    "Recognize social engineering tactics used to trick recipients into opening malicious attachments",
  ],
  sortOrder: 412,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "attach-001",
      title: "Macro-Enabled Excel from Unknown Sender",
      context:
        "You receive an email from 'accounting-dept@corp-invoices.net' with the subject 'URGENT: Outstanding Invoice #INV-29847 — Payment Overdue.' The email contains a single attachment named 'invoice_details.xlsm' and urges you to enable macros to view the protected invoice data. Your company has no vendor relationship with 'corp-invoices.net.'",
      displayFields: [
        { label: "Sender", value: "accounting-dept@corp-invoices.net", emphasis: "critical" },
        { label: "File Name", value: "invoice_details.xlsm (macro-enabled spreadsheet)", emphasis: "critical" },
        { label: "File Size", value: "847 KB", emphasis: "warn" },
        { label: "SPF/DKIM", value: "SPF: Pass, DKIM: None", emphasis: "warn" },
        { label: "Vendor Check", value: "corp-invoices.net — not in vendor directory — domain registered 12 days ago", emphasis: "critical" },
      ],
      actions: [
        { id: "QUARANTINE_REPORT", label: "Do not open — quarantine and report to security team", color: "green" },
        { id: "OPEN_DISABLE_MACROS", label: "Open with macros disabled to inspect the content", color: "orange" },
        { id: "ENABLE_MACROS", label: "Enable macros to view the invoice details", color: "red" },
        { id: "FORWARD_ACCOUNTING", label: "Forward to your accounting department to verify", color: "yellow" },
      ],
      correctActionId: "QUARANTINE_REPORT",
      rationales: [
        {
          id: "rat-quarantine",
          text: "Multiple red flags confirm this is malicious: unknown sender, newly registered domain, macro-enabled file type, urgency language, and no DKIM signature. The attachment should never be opened — quarantine and report immediately.",
        },
        {
          id: "rat-macros-off",
          text: "Even with macros disabled, .xlsm files can exploit vulnerabilities in the Excel parser itself. Opening suspicious files on a production workstation creates unnecessary risk.",
        },
        {
          id: "rat-forward",
          text: "Forwarding a potentially malicious attachment to colleagues multiplies the risk — if anyone in accounting clicks it, the attack succeeds.",
        },
        {
          id: "rat-enable",
          text: "Enabling macros on an attachment from an unknown sender is the exact action the attacker designed this email to produce.",
        },
      ],
      correctRationaleId: "rat-quarantine",
      feedback: {
        perfect:
          "Correct. This email has every hallmark of a malware delivery campaign: unknown sender, newly registered domain, macro-enabled attachment, urgency pressure, and missing DKIM. Quarantining without opening and reporting to the security team is the only safe response.",
        partial:
          "You showed caution, but your approach still creates risk. Opening .xlsm files or forwarding them to colleagues exposes more systems to potential exploitation. When this many red flags align, the safest action is quarantine without opening.",
        wrong:
          "Enabling macros on an attachment from an unknown sender with a newly registered domain is how ransomware infections begin. This is a textbook malicious email — it should be quarantined immediately without any interaction.",
      },
    },
    {
      type: "action-rationale",
      id: "attach-002",
      title: "PDF Invoice from Known Vendor",
      context:
        "You receive a monthly invoice email from your regular office supplies vendor, OfficeMax Pro. The sender address matches their known domain, the email references your correct account number, and the attached PDF file name follows their standard naming convention. This is the same type of email you receive on the first of every month.",
      displayFields: [
        { label: "Sender", value: "billing@officemaxpro.com (known vendor)", emphasis: "normal" },
        { label: "File Name", value: "OMP-INV-2026-03-0001.pdf", emphasis: "normal" },
        { label: "File Size", value: "124 KB", emphasis: "normal" },
        { label: "SPF/DKIM", value: "SPF: Pass, DKIM: Pass", emphasis: "normal" },
        { label: "Account Reference", value: "Matches your account #OMP-44821", emphasis: "normal" },
        { label: "Email Pattern", value: "Consistent with previous monthly invoices", emphasis: "normal" },
      ],
      actions: [
        { id: "OPEN_NORMAL", label: "Open the PDF — this matches the expected monthly invoice pattern", color: "green" },
        { id: "QUARANTINE", label: "Quarantine the attachment and report to security", color: "orange" },
        { id: "SANDBOX_FIRST", label: "Submit to sandbox for detonation before opening", color: "yellow" },
        { id: "CALL_VENDOR", label: "Call the vendor to confirm they sent the invoice", color: "yellow" },
      ],
      correctActionId: "OPEN_NORMAL",
      rationales: [
        {
          id: "rat-legitimate",
          text: "All trust indicators are positive: known vendor, authenticated domain (SPF and DKIM pass), correct account reference, standard file naming, expected timing, and consistent email pattern. This is normal business correspondence.",
        },
        {
          id: "rat-sandbox",
          text: "Sandboxing every expected attachment from verified vendors creates operational friction that undermines productivity without a proportional security benefit.",
        },
        {
          id: "rat-call",
          text: "Calling vendors to confirm every routine invoice is disproportionate when all authentication and contextual indicators check out.",
        },
        {
          id: "rat-quarantine",
          text: "Quarantining legitimate business correspondence from a verified vendor delays payment processing and damages the vendor relationship.",
        },
      ],
      correctRationaleId: "rat-legitimate",
      feedback: {
        perfect:
          "Correct. Security judgment means recognizing legitimate correspondence, not treating everything as suspicious. This email passes every verification check: known sender, authenticated domain, correct account reference, expected timing, and consistent naming convention. Opening it is appropriate.",
        partial:
          "Your caution is understandable, but disproportionate to the risk. When every trust indicator is positive — known vendor, authenticated domain, correct account details, expected timing — adding friction through sandboxing or phone calls reduces productivity without meaningful security benefit.",
        wrong:
          "Quarantining legitimate, authenticated business correspondence from a known vendor creates unnecessary disruption. Security awareness means calibrating your response to the actual risk level, not treating every attachment as a threat.",
      },
    },
    {
      type: "action-rationale",
      id: "attach-003",
      title: "Password-Protected ZIP from 'HR Department'",
      context:
        "You receive an email claiming to be from your HR department with the subject 'Confidential: Updated Salary Bands — Q2 2026.' The attachment is a password-protected ZIP file named 'salary_review_2026.zip' and the password is provided in the email body. The sender address is hr-updates@your-company.com but you normally receive HR communications through the HRIS portal, not via email attachments.",
      displayFields: [
        { label: "Sender", value: "hr-updates@your-company.com", emphasis: "warn" },
        { label: "File Name", value: "salary_review_2026.zip (password-protected)", emphasis: "critical" },
        { label: "Password", value: "Included in email body: 'HR2026secure'", emphasis: "critical" },
        { label: "SPF/DKIM", value: "SPF: Fail, DKIM: Fail", emphasis: "critical" },
        { label: "Normal HR Process", value: "Salary information distributed via HRIS portal, not email", emphasis: "warn" },
        { label: "Content Lure", value: "Appeals to financial curiosity — salary band information", emphasis: "warn" },
      ],
      actions: [
        { id: "REPORT_PHISH", label: "Report as phishing — do not open or extract the ZIP", color: "green" },
        { id: "EXTRACT_SCAN", label: "Extract the ZIP and scan contents with antivirus before opening", color: "orange" },
        { id: "CHECK_HR", label: "Reply to the email asking HR to confirm they sent it", color: "yellow" },
        { id: "OPEN_ZIP", label: "Enter the password and open the salary review document", color: "red" },
      ],
      correctActionId: "REPORT_PHISH",
      rationales: [
        {
          id: "rat-phish",
          text: "Password-protected ZIPs with the password in the email body are a classic technique to bypass email gateway scanning. Combined with SPF/DKIM failure and deviation from the normal HR communication channel, this is a phishing attack using financial curiosity as the lure.",
        },
        {
          id: "rat-av-bypass",
          text: "Password-protected archives cannot be scanned by email security gateways or antivirus — that is precisely why attackers use them. Extracting and scanning locally still exposes the endpoint.",
        },
        {
          id: "rat-reply",
          text: "Replying to a spoofed email sends your response to the attacker, not to HR. Never use the reply function to verify a suspicious email — use a separate, trusted channel.",
        },
        {
          id: "rat-curiosity",
          text: "Salary information is one of the most effective phishing lures because it exploits financial curiosity. Attackers choose topics that override cautious judgment.",
        },
      ],
      correctRationaleId: "rat-phish",
      feedback: {
        perfect:
          "Excellent. You identified multiple phishing indicators: password-protected ZIP (bypasses gateway scanning), password in the email body, failed SPF/DKIM authentication, deviation from normal HR processes, and a financial curiosity lure. Reporting without interacting is the correct response.",
        partial:
          "You recognized something was wrong, but your approach still involves interacting with the malicious email or its attachment. Password-protected ZIPs exist specifically to evade scanning, and replying to a spoofed address contacts the attacker. Report through your phishing button or security team directly.",
        wrong:
          "Opening a password-protected ZIP from a failed-authentication email that deviates from normal HR processes is extremely dangerous. Password-protected archives bypass every email security control. This is a well-crafted phishing attack designed to exploit financial curiosity.",
      },
    },
  ],

  hints: [
    "Password-protected archives included with the password in the same email exist for one reason: to bypass email security gateway scanning.",
    "Check SPF and DKIM results before evaluating the content. Failed email authentication is a strong indicator of spoofing regardless of how legitimate the sender address looks.",
    "Not every attachment is suspicious. When all trust indicators align — known sender, authenticated domain, expected timing, correct references — treating it as a threat wastes time and credibility.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Email remains the number one initial access vector for cyberattacks. Over 90% of malware is delivered via email attachments or links. Security analysts must be able to quickly assess attachment risk based on file type, sender authentication, and contextual indicators — while also recognizing that most attachments are legitimate business documents.",
  toolRelevance: [
    "Proofpoint / Mimecast (Email Security Gateway)",
    "Microsoft Defender for Office 365 (Safe Attachments)",
    "Any.Run / Joe Sandbox (Malware Sandboxing)",
    "VirusTotal (File Hash Analysis)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
