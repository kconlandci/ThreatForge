import type { LabManifest } from "../../types/manifest";

export const qrCodePhishingDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "qr-code-phishing-detection",
  version: 1,
  title: "QR Code Phishing Detection",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "quishing",
    "qr-code",
    "phishing",
    "social-engineering",
    "physical-security",
    "email-security",
  ],

  description:
    "Identify malicious QR codes (quishing) planted in emails, physical locations, and documents. Learn to distinguish legitimate QR codes from attacker-controlled redirects designed to harvest credentials or deliver malware.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Recognize common quishing delivery methods: physical stickers, emails, and documents",
    "Identify red flags in QR code context that indicate malicious intent",
    "Distinguish legitimate QR code usage from social engineering attempts",
    "Apply appropriate response procedures for suspected quishing attacks",
  ],
  sortOrder: 418,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "qr-001",
      title: "Suspicious Parking Meter QR Sticker",
      context:
        "You notice a QR code sticker on a parking meter in your company's visitor lot. The sticker reads 'SCAN TO PAY — New contactless payment system!' but it appears to be placed on top of the meter's original signage, slightly misaligned. Several employees have mentioned scanning it this week.",
      displayFields: [
        {
          label: "Location",
          value: "Company visitor parking lot, Meter #14",
          emphasis: "normal",
        },
        {
          label: "Sticker Quality",
          value: "Adhesive label placed over existing signage, edges peeling",
          emphasis: "warn",
        },
        {
          label: "URL Preview",
          value: "parkingpay-secure.com/pay (not the city's parking domain)",
          emphasis: "critical",
        },
        {
          label: "Employee Reports",
          value: "3 employees scanned this week, 1 entered credit card info",
          emphasis: "critical",
        },
      ],
      actions: [
        {
          id: "REMOVE_REPORT",
          label: "Remove the sticker and report to security and the affected employees",
          color: "red",
        },
        {
          id: "SCAN_INVESTIGATE",
          label: "Scan the QR code yourself to investigate the URL",
          color: "orange",
        },
        {
          id: "IGNORE_PARKING",
          label: "Ignore it — parking meters are not an IT security issue",
          color: "blue",
        },
        {
          id: "PHOTO_LATER",
          label: "Take a photo and report it next week at the team meeting",
          color: "yellow",
        },
      ],
      correctActionId: "REMOVE_REPORT",
      rationales: [
        {
          id: "rat-remove",
          text: "The misaligned sticker over original signage, non-official domain, and confirmed employee interaction make this an active physical quishing attack. Removing the sticker stops further victims while reporting enables incident response for those already compromised.",
        },
        {
          id: "rat-scan",
          text: "Scanning the QR code yourself exposes your device to the same credential harvesting or malware delivery that targeted other employees — never interact with a suspected malicious QR code directly.",
        },
        {
          id: "rat-ignore",
          text: "Physical quishing attacks in company parking lots directly target employees. The boundary between physical and IT security is exactly what attackers exploit.",
        },
        {
          id: "rat-delay",
          text: "Delaying the report by a week allows more employees to scan the malicious code and enter sensitive information on the attacker's phishing page.",
        },
      ],
      correctRationaleId: "rat-remove",
      feedback: {
        perfect:
          "Correct. Physical quishing stickers placed over legitimate signage are an increasingly common attack. Removing the sticker immediately stops the bleeding while reporting enables incident response for the employee who already entered credit card details.",
        partial:
          "You recognized the threat but chose an action with significant drawbacks. Scanning the code yourself or delaying the report both extend the attack's impact window unnecessarily.",
        wrong:
          "This is an active attack on your employees. One person has already entered credit card information on a fraudulent site. Ignoring it or scanning it yourself makes the situation worse.",
      },
    },
    {
      type: "action-rationale",
      id: "qr-002",
      title: "MFA Enrollment QR Code in Email",
      context:
        "You receive an email from 'IT Security <security-noreply@your-company-mfa.com>' with the subject 'URGENT: MFA Enrollment Required by Friday.' The email contains a QR code and instructs you to scan it with your authenticator app to complete mandatory MFA enrollment. It warns that accounts without MFA will be locked.",
      displayFields: [
        {
          label: "Sender Domain",
          value: "your-company-mfa.com (not the real company domain)",
          emphasis: "critical",
        },
        {
          label: "Email Tone",
          value: "Urgent deadline, threat of account lockout",
          emphasis: "warn",
        },
        {
          label: "QR Code Destination",
          value: "Links to your-company-mfa.com/enroll — requests username and password before showing TOTP seed",
          emphasis: "critical",
        },
        {
          label: "IT Department Confirmation",
          value: "No MFA enrollment campaign currently scheduled per IT calendar",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "REPORT_PHISH",
          label: "Report as phishing — do not scan the QR code",
          color: "red",
        },
        {
          id: "SCAN_AUTH",
          label: "Scan with authenticator app to complete enrollment",
          color: "blue",
        },
        {
          id: "FORWARD_IT",
          label: "Forward to IT to ask if the enrollment is real",
          color: "orange",
        },
        {
          id: "DELETE_IGNORE",
          label: "Delete the email and ignore the deadline",
          color: "yellow",
        },
      ],
      correctActionId: "REPORT_PHISH",
      rationales: [
        {
          id: "rat-phish",
          text: "The lookalike domain, credential request before TOTP setup, urgency tactics, and lack of a matching IT campaign all confirm this is a quishing attack designed to harvest credentials through a fake MFA enrollment flow. Reporting preserves the evidence for investigation.",
        },
        {
          id: "rat-scan-danger",
          text: "Scanning the QR code leads to a credential harvesting page — the attacker collects your username and password before showing a fake TOTP seed, giving them full access to your account.",
        },
        {
          id: "rat-forward",
          text: "Forwarding the phishing email could inadvertently spread the attack if the IT staff member clicks the QR code. Use the dedicated phishing report button or process instead.",
        },
        {
          id: "rat-delete",
          text: "Deleting the email protects you personally but prevents the security team from analyzing the attack, blocking the domain, and warning other employees who received the same campaign.",
        },
      ],
      correctRationaleId: "rat-phish",
      feedback: {
        perfect:
          "Excellent. You identified every red flag: the lookalike domain, the credential harvesting flow disguised as MFA enrollment, the urgency pressure, and the absence of a real IT campaign. Reporting enables the security team to block the domain and warn others.",
        partial:
          "You showed caution but your action has gaps. Forwarding phishing emails risks spreading the attack, and deleting removes evidence the security team needs. Always use the formal phishing report process.",
        wrong:
          "Scanning this QR code would hand your credentials directly to the attacker. The fake MFA enrollment page collects your username and password before showing a bogus TOTP seed. Always verify MFA enrollment through official IT channels.",
      },
    },
    {
      type: "action-rationale",
      id: "qr-003",
      title: "Legitimate Restaurant Menu QR Code",
      context:
        "You're at a team lunch at a well-known restaurant. The table has a branded QR code printed directly on a laminated menu card for contactless ordering. A colleague is hesitant to scan it after recent security training about quishing attacks.",
      displayFields: [
        {
          label: "QR Code Placement",
          value: "Printed on laminated menu card with restaurant branding",
          emphasis: "normal",
        },
        {
          label: "URL Preview",
          value: "order.restaurants-platform.com/venue/bellacucina",
          emphasis: "normal",
        },
        {
          label: "Other Context",
          value: "Same QR code on every table, staff confirms it's their ordering system",
          emphasis: "normal",
        },
        {
          label: "Website Behavior",
          value: "Shows food menu with prices, no login or personal info required to browse",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "SAFE_SCAN",
          label: "Safe to scan — this is a legitimate restaurant QR code",
          color: "green",
        },
        {
          id: "REFUSE_SCAN",
          label: "Refuse to scan any QR codes as a policy",
          color: "red",
        },
        {
          id: "MANUAL_URL",
          label: "Manually type the restaurant website instead",
          color: "orange",
        },
        {
          id: "ASK_WAITER",
          label: "Ask the waiter to bring a paper menu instead",
          color: "yellow",
        },
      ],
      correctActionId: "SAFE_SCAN",
      rationales: [
        {
          id: "rat-legitimate",
          text: "The QR code is professionally printed on branded materials, consistent across all tables, confirmed by staff, leads to a known ordering platform, and requires no credentials to browse. This matches every indicator of a legitimate restaurant QR code.",
        },
        {
          id: "rat-blanket-ban",
          text: "Refusing all QR codes is security theater that creates unnecessary friction. The goal of security awareness is risk assessment, not blanket avoidance of technology.",
        },
        {
          id: "rat-manual",
          text: "Manually typing the URL adds friction without meaningful security benefit when all contextual indicators confirm legitimacy. This approach is appropriate for suspicious QR codes, not verified ones.",
        },
        {
          id: "rat-overcaution",
          text: "Over-applying security training to clearly safe situations leads to security fatigue and makes people less likely to follow guidance when it actually matters.",
        },
      ],
      correctRationaleId: "rat-legitimate",
      feedback: {
        perfect:
          "Good judgment. Security awareness means assessing risk in context, not avoiding all QR codes. This one has every legitimacy indicator: professional printing, branded materials, staff confirmation, known platform, and no credential requests.",
        partial:
          "Your caution shows good instincts, but over-applying security rules to clearly legitimate situations creates unnecessary friction and can lead to security fatigue. Assess the context, not just the technology.",
        wrong:
          "Blanket refusal to scan any QR code misses the point of security training. The goal is to evaluate risk in context. This QR code has zero red flags and every indicator of legitimacy.",
      },
    },
  ],

  hints: [
    "Physical QR code attacks often involve stickers placed over legitimate signage — look for misalignment, adhesive residue, or different print quality.",
    "Legitimate MFA enrollment always comes through official IT channels with advance notice — never through an unsolicited email with an embedded QR code.",
    "Good security awareness means assessing risk proportionally, not avoiding all QR codes regardless of context.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "QR code phishing (quishing) has surged as organizations adopt contactless workflows. Security analysts who understand both the technical delivery mechanisms and the social engineering psychology behind quishing are well-positioned to lead awareness programs and incident response for this growing attack vector.",
  toolRelevance: [
    "URLScan.io (QR destination analysis)",
    "VirusTotal (URL reputation check)",
    "Microsoft Defender for Office 365 (Email quishing detection)",
    "Proofpoint TAP (QR code URL extraction)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
