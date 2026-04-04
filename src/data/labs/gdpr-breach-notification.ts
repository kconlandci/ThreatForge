import type { LabManifest } from "../../types/manifest";

export const gdprBreachNotificationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "gdpr-breach-notification",
  version: 1,
  title: "GDPR Breach Notification Decision",

  tier: "intermediate",
  track: "incident-response",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["gdpr", "data-breach", "notification", "compliance", "privacy", "dpa"],

  description:
    "Apply GDPR Article 33 and 34 notification requirements to real breach scenarios — determining whether a breach requires DPA notification within 72 hours, whether data subjects must be notified, and what constitutes an appropriate response.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Apply GDPR Article 33 threshold criteria to determine mandatory DPA notification",
    "Distinguish high-risk breaches requiring data subject notification from lower-risk events",
    "Identify the 72-hour clock start and required notification content under GDPR",
  ],
  sortOrder: 660,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "gdpr-001",
      title: "Healthcare Database Exfiltration — EU Data Subjects",
      context:
        "At 09:00 Monday, IR team confirms: an external attacker exfiltrated a PostgreSQL database containing 47,000 EU patient records including names, dates of birth, NHS numbers, diagnosis codes, and prescribed medications. The breach occurred over Friday-Saturday (detected Monday). Data belongs to UK and German data subjects. The organization is a UK-based healthcare SaaS provider. Encryption was enabled at rest but not for the backup that was exfiltrated. Post-Brexit UK GDPR and German GDPR/BDSG both apply.",
      displayFields: [
        { label: "Data Subjects", value: "47,000 UK and German patients — health data (special category)", emphasis: "critical" },
        { label: "Data Types", value: "Names, DOB, NHS numbers, diagnosis codes, medications", emphasis: "critical" },
        { label: "Breach Window", value: "Friday–Saturday, detected Monday 09:00 (approx. 60+ hours elapsed)", emphasis: "critical" },
        { label: "72h Deadline", value: "UK ICO: ~12 hours remaining | German BfDI: ~12 hours remaining", emphasis: "critical" },
        { label: "Encryption Status", value: "At-rest encryption enabled — but exfiltrated backup was unencrypted", emphasis: "warn" },
      ],
      actions: [
        {
          id: "NOTIFY_DPA_SUBJECTS_DOCUMENT",
          label: "Notify UK ICO and German BfDI within 12 hours, notify all 47,000 data subjects, document breach record",
          color: "red",
        },
        {
          id: "NOTIFY_DPA_ONLY",
          label: "Notify UK ICO and German BfDI — data subject notification not required",
          color: "orange",
        },
        {
          id: "INVESTIGATE_FIRST",
          label: "Complete investigation before notifying — need accurate information first",
          color: "yellow",
        },
        {
          id: "NOTIFY_PATIENTS_ONLY",
          label: "Notify patients directly — DPA notification only if unable to contain",
          color: "blue",
        },
      ],
      correctActionId: "NOTIFY_DPA_SUBJECTS_DOCUMENT",
      rationales: [
        {
          id: "rat-full-notification",
          text: "Three mandatory actions apply: DPA notification (Article 33) is mandatory because the breach involves special category health data with 47,000 data subjects — clearly 'likely to result in a risk to rights and freedoms.' Both UK ICO and German BfDI must be notified within 72 hours of becoming aware (the clock started Friday when the breach occurred, not Monday). Data subject notification (Article 34) is mandatory because health data breaches present high risk to individuals (identity theft, discrimination, insurance fraud). Documentation in the breach register is always required regardless of notification decisions.",
        },
        {
          id: "rat-dpa-only",
          text: "Health data (special category under GDPR Article 9) breaches involving tens of thousands of individuals create high risk to data subjects. Article 34 requires individual notification when risk is high — this breach clearly meets that threshold.",
        },
        {
          id: "rat-investigate-first",
          text: "GDPR Article 33 allows notification with incomplete information, updated as investigation progresses. Waiting for a complete investigation to file notification is a compliance violation — the 72-hour clock doesn't pause for investigations.",
        },
        {
          id: "rat-subjects-only",
          text: "DPA notification (Article 33) is not optional for breaches likely to cause risk. Data subjects are also required to be notified here (Article 34), but the DPA must be notified first regardless.",
        },
      ],
      correctRationaleId: "rat-full-notification",
      feedback: {
        perfect: "Correct. Special category health data breach with 47,000 subjects triggers both Article 33 (DPA) and Article 34 (individual) notifications. With only 12 hours remaining on the 72-hour clock, immediate dual notification is required.",
        partial: "DPA notification alone is insufficient for high-risk breaches involving special category health data. Data subjects must be individually notified under Article 34.",
        wrong: "Investigation cannot delay mandatory GDPR notifications — file with available information and update. The 72-hour clock runs from awareness of the breach, not from completion of investigation.",
      },
    },
    {
      type: "action-rationale",
      id: "gdpr-002",
      title: "Misdirected Marketing Email — Low Risk Assessment",
      context:
        "Marketing team sent a monthly newsletter to 2,300 subscribers using CC: instead of BCC: — all 2,300 email addresses are visible to each recipient. The data involved is: email addresses only (no names, no special category data). All recipients are existing customers who have opted into marketing communications. The mistake was discovered 2 hours after sending. The organization is EU-based.",
      displayFields: [
        { label: "Data Exposed", value: "Email addresses only — no names, no special category data", emphasis: "normal" },
        { label: "Recipients", value: "2,300 existing opted-in marketing subscribers", emphasis: "normal" },
        { label: "Exposure Type", value: "Accidental disclosure — each recipient saw other recipients' emails", emphasis: "warn" },
        { label: "Risk Level", value: "Low — email addresses of newsletter subscribers without additional context", emphasis: "normal" },
        { label: "Time Elapsed", value: "2 hours since incident, well within 72-hour window", emphasis: "normal" },
      ],
      actions: [
        {
          id: "DOCUMENT_NO_NOTIFY",
          label: "Document in breach register, assess low risk, no DPA notification required",
          color: "green",
        },
        {
          id: "NOTIFY_DPA",
          label: "Notify DPA within 72 hours — any personal data breach must be reported",
          color: "red",
        },
        {
          id: "NOTIFY_ALL_SUBJECTS",
          label: "Notify all 2,300 data subjects individually",
          color: "orange",
        },
        {
          id: "NO_ACTION",
          label: "No action required — these are marketing emails, not sensitive data",
          color: "yellow",
        },
      ],
      correctActionId: "DOCUMENT_NO_NOTIFY",
      rationales: [
        {
          id: "rat-low-risk-doc",
          text: "GDPR Article 33(1) requires DPA notification only when the breach is 'likely to result in a risk to the rights and freedoms of natural persons.' Email addresses of newsletter subscribers with no additional context pose minimal risk — no financial data, health data, or special categories are involved. However, this IS a personal data breach that must be documented in the internal breach register under Article 33(5), including the facts, effects, and remedial actions taken. The proportionate response is documentation, process improvement, and optional apology to subscribers.",
        },
        {
          id: "rat-mandatory-report",
          text: "Article 33 notification to the DPA is only mandatory when there is 'likely risk to rights and freedoms.' Disclosure of marketing email addresses without additional context is unlikely to cause harm. Low-risk breaches require internal documentation but not DPA notification.",
        },
        {
          id: "rat-notify-subjects",
          text: "Article 34 individual notification is required only when breach is 'likely to result in a HIGH risk.' Low-risk breaches (marketing email addresses only) don't meet this threshold. Mass-notifying 2,300 subscribers would cause disproportionate alarm for minimal actual risk.",
        },
        {
          id: "rat-no-action",
          text: "This is still a personal data breach that must be recorded in the breach register. Completely ignoring it is non-compliant — documentation is required even for low-risk incidents.",
        },
      ],
      correctRationaleId: "rat-low-risk-doc",
      feedback: {
        perfect: "Correct proportionate response. Marketing email addresses without context present low risk. Document in breach register as required, no DPA notification needed, implement BCC policy improvement.",
        partial: "DPA notification for every breach regardless of risk would flood regulators with low-priority cases. GDPR explicitly requires risk assessment before notification — not all breaches require reporting.",
        wrong: "Taking no action ignores the mandatory breach register documentation requirement. All personal data breaches require internal documentation even when DPA notification isn't triggered.",
      },
    },
    {
      type: "action-rationale",
      id: "gdpr-003",
      title: "Ransomware Encryption — Data Availability Breach",
      context:
        "Ransomware encrypted the primary HR database at 03:00. Database contains employee payroll data, national insurance numbers, bank account details, home addresses, and performance reviews for 1,200 EU employees. Backups are available and confirmed clean. Forensic analysis shows: the attacker accessed the database server at 01:00 (2 hours before encryption), queried the database for approximately 20 minutes, then deployed ransomware. No evidence of exfiltration found — but cannot be ruled out. Current time: 06:00 (3 hours after incident).",
      displayFields: [
        { label: "Data Types", value: "Payroll, NI numbers, bank accounts, addresses, performance data", emphasis: "critical" },
        { label: "Affected Employees", value: "1,200 EU employees — financial data (high risk)", emphasis: "critical" },
        { label: "Exfiltration Status", value: "Possible — 20-minute database query pre-encryption, no confirmed exfiltration", emphasis: "critical" },
        { label: "Availability Impact", value: "Confirmed — encrypted, backups available", emphasis: "warn" },
        { label: "Time to 72h Deadline", value: "69 hours remaining from breach awareness", emphasis: "normal" },
      ],
      actions: [
        {
          id: "NOTIFY_DPA_HIGH_RISK",
          label: "Notify DPA — treat as potential exfiltration + availability breach; notify employees",
          color: "red",
        },
        {
          id: "WAIT_FOR_FORENSICS",
          label: "Wait 48-72 hours for forensic confirmation of exfiltration before notifying",
          color: "orange",
        },
        {
          id: "NOTIFY_DPA_LOW_RISK",
          label: "Notify DPA as availability breach only — no exfiltration confirmed",
          color: "yellow",
        },
        {
          id: "NO_NOTIFICATION",
          label: "No notification — backups available, no confirmed exfiltration",
          color: "blue",
        },
      ],
      correctActionId: "NOTIFY_DPA_HIGH_RISK",
      rationales: [
        {
          id: "rat-notify-possible-exfil",
          text: "When exfiltration cannot be ruled out, GDPR guidance (WP29 guidelines) recommends treating it as a potential confidentiality breach AND acting accordingly. The data involved (bank accounts, NI numbers) presents high financial fraud risk. Notify the DPA now with current information (noting exfiltration status is unconfirmed), and notify employees given the high-risk data types. Update notifications as forensics progresses. Waiting for forensic certainty is not appropriate when data subjects face immediate financial fraud risk.",
        },
        {
          id: "rat-wait-forensics",
          text: "Waiting 48-72 hours for forensic confirmation risks breaching the 72-hour notification deadline. GDPR explicitly permits notification with incomplete information — notify now and supplement with forensic findings.",
        },
        {
          id: "rat-availability-only",
          text: "The 20-minute database query before ransomware deployment is a strong indicator of potential exfiltration. Downgrading to an availability-only classification when exfiltration cannot be ruled out understates the risk and may trigger regulatory criticism.",
        },
        {
          id: "rat-no-notification",
          text: "The database contains payroll, bank account, and national insurance data for 1,200 employees — this breach meets the high-risk threshold regardless of exfiltration confirmation. Available backups address availability but not the potential confidentiality breach.",
        },
      ],
      correctRationaleId: "rat-notify-possible-exfil",
      feedback: {
        perfect: "Correct. When exfiltration cannot be ruled out with high-risk financial data, notify as potential confidentiality breach. GDPR allows supplementary notifications — don't wait for certainty that may never come.",
        partial: "Availability-only classification understates the risk when database queries preceded encryption. The WP29 guidance recommends worst-case classification when exfiltration cannot be ruled out.",
        wrong: "Bank account and national insurance data for 1,200 employees presents immediate fraud risk. Available backups don't mitigate potential exfiltration risk to data subjects.",
      },
    },
  ],

  hints: [
    "The GDPR 72-hour clock starts from 'becoming aware' of a breach — which typically means when any staff member reasonably identifies a breach, not when the CISO confirms it.",
    "GDPR allows initial notification with incomplete information, updated as investigation progresses — don't wait for a complete picture before filing.",
    "Not all personal data breaches require DPA notification — apply a risk threshold test. Document all breaches internally regardless of whether external notification is required.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "GDPR breach notification decisions are one of the most common compliance challenges for security professionals at EU-regulated organizations. Understanding the risk-based approach to notification distinguishes security engineers from compliance-aware security leaders.",
  toolRelevance: [
    "OneTrust / TrustArc (breach management)",
    "ICO Breach Notification Portal",
    "ENISA (EU cybersecurity guidance)",
    "GDPR Articles 33 and 34 (direct reference)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
