import type { LabManifest } from "../../types/manifest";

export const irTabletopExerciseLab: LabManifest = {
  schemaVersion: "1.1",
  id: "ir-tabletop-exercise",
  version: 1,
  title: "IR Tabletop Exercise",

  tier: "advanced",
  track: "incident-response",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "incident-response",
    "tabletop-exercise",
    "crisis-management",
    "executive-communication",
    "ransomware",
    "insider-threat",
  ],

  description:
    "Lead incident response tabletop exercises by making coordination decisions about team activation, communication strategy, containment approaches, and executive notification across ransomware, data breach, and insider threat scenarios.",
  estimatedMinutes: 20,
  learningObjectives: [
    "Determine appropriate CIRT activation levels based on incident severity and scope",
    "Coordinate cross-functional response involving legal, communications, HR, and executive leadership",
    "Balance containment urgency with investigation integrity and legal requirements",
    "Apply crisis communication principles when external parties discover breaches before the organization",
    "Navigate the legal and procedural complexities of insider threat response",
  ],
  sortOrder: 434,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "ttx-001",
      title: "Ransomware During Business Hours",
      context:
        "It's 10:15 AM on a Tuesday. Your SOC detects ransomware actively encrypting file shares across three business units. The encryption is spreading via compromised service accounts with domain admin privileges. Approximately 40% of shared drives are affected, and the ransom note demands 50 BTC ($2.1M) with a 72-hour deadline. Your CEO is currently in a board meeting, the CISO is traveling internationally, and your legal counsel is on PTO. The business processes approximately $3.2M in daily transactions through affected systems.",
      displayFields: [
        { label: "Incident Type", value: "Enterprise ransomware — active encryption", emphasis: "critical" },
        { label: "Scope", value: "3 business units, 40% of file shares, domain admin compromised", emphasis: "critical" },
        { label: "Ransom", value: "50 BTC ($2.1M), 72-hour deadline", emphasis: "critical" },
        { label: "Business Impact", value: "$3.2M daily transactions through affected systems", emphasis: "critical" },
        { label: "Leadership", value: "CEO in board meeting, CISO traveling, Legal on PTO", emphasis: "warn" },
        { label: "Time Elapsed", value: "15 minutes since initial detection", emphasis: "warn" },
      ],
      actions: [
        {
          id: "FULL_CIRT",
          label: "Activate full CIRT, interrupt leadership, begin containment",
          color: "red",
        },
        {
          id: "CONTAIN_FIRST",
          label: "Focus on technical containment, brief leadership afterward",
          color: "orange",
        },
        {
          id: "WAIT_CISO",
          label: "Wait for CISO to be reachable before activating CIRT",
          color: "yellow",
        },
        {
          id: "NEGOTIATE",
          label: "Begin ransom negotiation to buy time while containing",
          color: "blue",
        },
      ],
      correctActionId: "FULL_CIRT",
      rationales: [
        {
          id: "rat-full-activation",
          text: "Active enterprise ransomware with domain admin compromise is a Severity 1 incident requiring immediate full CIRT activation. Leadership must be interrupted regardless of availability — the 72-hour clock is ticking, legal obligations may require breach notification, and containment decisions at this scale need executive authority. Parallel workstreams for containment, communication, legal, and business continuity must start simultaneously.",
        },
        {
          id: "rat-contain-first",
          text: "Technical containment without leadership alignment risks unauthorized decisions about business-critical systems. Shutting down $3.2M/day in transactions without executive authority creates organizational liability.",
        },
        {
          id: "rat-wait-ciso",
          text: "Waiting for the CISO allows encryption to spread further. Every minute of delay increases data loss and recovery cost. The IR plan should designate alternates for exactly this situation.",
        },
        {
          id: "rat-negotiate",
          text: "Initiating ransom negotiation without legal counsel, executive approval, and understanding of regulatory implications could violate sanctions law (OFAC), void cyber insurance coverage, and set a dangerous precedent.",
        },
      ],
      correctRationaleId: "rat-full-activation",
      feedback: {
        perfect:
          "Decisive leadership. Enterprise ransomware with domain admin compromise and active encryption is an unambiguous Severity 1 event. Full CIRT activation, leadership notification (regardless of convenience), and parallel containment is the textbook response. You recognized that waiting or acting without coordination both carry unacceptable risks at this scale.",
        partial:
          "Your instinct is partially right, but this incident requires both immediate technical action AND leadership coordination running in parallel. Doing one without the other creates gaps — either continued encryption or unauthorized business decisions.",
        wrong:
          "Waiting during active enterprise ransomware or negotiating without legal/executive involvement are both high-risk mistakes. The IR plan exists precisely for this scenario — activate it fully and immediately.",
      },
    },
    {
      type: "action-rationale",
      id: "ttx-002",
      title: "Data Breach Discovered via Journalist Inquiry",
      context:
        "Your communications director receives an email from a cybersecurity journalist at a major publication: 'We've obtained a dataset that appears to contain 2.3 million customer records from your organization, including names, email addresses, and hashed passwords. We plan to publish in 48 hours. Can you comment?' Your security team has not detected any breach. The journalist provides a sample of 50 records, and your DBA confirms the data format and field structure match your production customer database as of approximately 6 weeks ago.",
      displayFields: [
        { label: "Source", value: "Journalist inquiry — 48-hour publication deadline", emphasis: "critical" },
        { label: "Data Volume", value: "2.3 million customer records (PII + hashed passwords)", emphasis: "critical" },
        { label: "Data Freshness", value: "Approximately 6 weeks old based on field structure", emphasis: "warn" },
        { label: "Detection", value: "No internal alerts or indicators detected by security team", emphasis: "warn" },
        { label: "Verification", value: "DBA confirms sample matches production schema and data format", emphasis: "critical" },
        { label: "Regulatory", value: "Organization subject to GDPR and state breach notification laws", emphasis: "warn" },
      ],
      actions: [
        {
          id: "LEGAL_COMMS_FIRST",
          label: "Engage legal and crisis comms immediately, confirm breach scope before responding",
          color: "red",
        },
        {
          id: "DENY_INVESTIGATE",
          label: "Issue a denial to the journalist while investigating internally",
          color: "orange",
        },
        {
          id: "FULL_DISCLOSURE",
          label: "Confirm the breach to the journalist and issue a public statement immediately",
          color: "yellow",
        },
        {
          id: "IGNORE_JOURNALIST",
          label: "Ignore the journalist and focus on internal investigation",
          color: "blue",
        },
      ],
      correctActionId: "LEGAL_COMMS_FIRST",
      rationales: [
        {
          id: "rat-legal-comms",
          text: "This requires immediate parallel activation of legal counsel, crisis communications, and forensic investigation. Legal must assess notification obligations under GDPR and state laws. Crisis comms must prepare a holding statement for the journalist and a customer notification plan. The forensic team must determine the breach vector and timeline. Responding to the journalist without legal guidance risks admitting liability, and ignoring them risks losing control of the narrative entirely.",
        },
        {
          id: "rat-deny",
          text: "Issuing a denial when the data has been verified as matching your production schema destroys credibility. If the journalist publishes alongside your denial, the reputational damage compounds exponentially.",
        },
        {
          id: "rat-full-disclosure",
          text: "Confirming without legal review risks triggering regulatory obligations prematurely, admitting liability before understanding scope, and making statements that conflict with eventual forensic findings.",
        },
        {
          id: "rat-ignore",
          text: "Ignoring a journalist with a 48-hour deadline means they publish without your input, framing the narrative entirely. You lose the ability to provide context, demonstrate responsible handling, or coordinate customer notification timing.",
        },
      ],
      correctRationaleId: "rat-legal-comms",
      feedback: {
        perfect:
          "Excellent crisis management instincts. You recognized this requires the coordinated activation of legal, communications, and forensics in parallel. The 48-hour journalist deadline creates urgency, but responding without legal guidance or ignoring the inquiry entirely both carry severe consequences. A holding statement buys time while the investigation proceeds.",
        partial:
          "You took some action, but missed the critical need for coordinated response. Denying verified data destroys trust, confirming without legal review creates liability, and ignoring the journalist surrenders narrative control. All three functions must activate simultaneously.",
        wrong:
          "This response would significantly worsen the incident's impact. Whether through denial, premature disclosure, or silence, you've chosen a path that damages either credibility, legal position, or public narrative — possibly all three.",
      },
    },
    {
      type: "action-rationale",
      id: "ttx-003",
      title: "Insider Threat — Active Data Exfiltration",
      context:
        "Your DLP system flags a senior database administrator who has been running bulk export queries against the customer financial database over the past 72 hours. The exports total 890GB of data including credit card tokens, transaction histories, and customer PII. The DBA has been downloading the exports to an encrypted external drive. HR informs you this employee was passed over for promotion last week and has been openly expressing dissatisfaction. The employee is currently at their desk and does not appear to know they've been flagged.",
      displayFields: [
        { label: "Subject", value: "Senior DBA — 7 years tenure, elevated database privileges", emphasis: "critical" },
        { label: "Activity", value: "890GB bulk exports over 72 hours — financial data with PII", emphasis: "critical" },
        { label: "Exfiltration Method", value: "Encrypted external USB drive", emphasis: "critical" },
        { label: "Motive Indicators", value: "Passed over for promotion, openly dissatisfied", emphasis: "warn" },
        { label: "Current Status", value: "At desk, unaware of detection", emphasis: "warn" },
        { label: "Regulatory", value: "PCI DSS scope — credit card token data involved", emphasis: "critical" },
      ],
      actions: [
        {
          id: "LEGAL_HR_COVERT",
          label: "Engage Legal and HR, implement legal hold, plan coordinated intervention",
          color: "red",
        },
        {
          id: "CONFRONT_NOW",
          label: "Confront the employee immediately to stop the exfiltration",
          color: "orange",
        },
        {
          id: "REVOKE_ACCESS",
          label: "Silently revoke database access and monitor their reaction",
          color: "yellow",
        },
        {
          id: "MONITOR_LONGER",
          label: "Continue covert monitoring to build a stronger case",
          color: "blue",
        },
      ],
      correctActionId: "LEGAL_HR_COVERT",
      rationales: [
        {
          id: "rat-legal-hr",
          text: "Insider threat cases involving PII and financial data require coordinated Legal-HR-Security response. Legal must initiate a litigation hold to preserve all evidence. HR must prepare for a structured interview and potential termination following proper procedures. Security must preserve DLP logs, database audit trails, and access records. A coordinated intervention — not a surprise confrontation — ensures evidence integrity, legal defensibility, and employee rights compliance.",
        },
        {
          id: "rat-confront",
          text: "Confronting an insider threat without Legal and HR involvement risks destroying the legal case, violating employment law, and giving the employee opportunity to destroy evidence or accelerate exfiltration from other channels.",
        },
        {
          id: "rat-revoke-silent",
          text: "Silently revoking access without a coordinated plan tips off the employee that they're being monitored. They may switch to alternative exfiltration methods, destroy evidence, or attempt to use already-exfiltrated data before the organization can respond.",
        },
        {
          id: "rat-monitor-more",
          text: "With 890GB already exfiltrated including credit card tokens, continuing to monitor allows more data theft and increases PCI DSS liability. The case is already strong enough for action — further delay increases organizational risk.",
        },
      ],
      correctRationaleId: "rat-legal-hr",
      feedback: {
        perfect:
          "Mature insider threat handling. You recognized that 890GB of financial PII already exfiltrated demands immediate but coordinated action — not a reactive confrontation. Legal hold preserves the evidence chain, HR ensures employment law compliance, and a planned intervention maximizes both legal defensibility and data recovery chances. This is exactly how enterprise insider threat programs operate.",
        partial:
          "You identified the threat correctly, but your approach has procedural gaps. Insider threat cases are legal matters as much as security incidents — every action must be coordinated with Legal and HR to maintain evidence integrity and comply with employment law.",
        wrong:
          "This response either escalates risk (confrontation without preparation) or allows it to continue (extended monitoring of active exfiltration). With PCI-scoped data already on an external drive, the organization needs coordinated Legal-HR-Security intervention now.",
      },
    },
  ],

  hints: [
    "In crisis scenarios, consider which stakeholders must be involved SIMULTANEOUSLY rather than sequentially — parallelizing legal, communications, and technical response is a hallmark of mature IR programs.",
    "When external parties discover your breach first, controlling the narrative requires engaging crisis communications and legal before making any public statement.",
    "Insider threat response must always involve Legal and HR — security acting alone risks both the legal case and employment law compliance.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Tabletop exercises are how organizations stress-test their incident response plans without the pressure of a real breach. Leading these exercises is a senior-level skill that demonstrates strategic thinking, cross-functional coordination, and crisis leadership — exactly the competencies that distinguish IR managers from individual contributors.",
  toolRelevance: [
    "NIST SP 800-61 (Incident Handling Guide)",
    "CISA Tabletop Exercise Packages",
    "PagerDuty / Opsgenie (incident management)",
    "Jira Service Management (IR workflows)",
    "Crisis communication platforms (Everbridge, AlertMedia)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
