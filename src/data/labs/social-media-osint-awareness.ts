import type { LabManifest } from "../../types/manifest";

export const socialMediaOsintAwarenessLab: LabManifest = {
  schemaVersion: "1.1",
  id: "social-media-osint-awareness",
  version: 1,
  title: "Social Media OSINT Awareness",

  tier: "intermediate",
  track: "identity-access",
  difficulty: "moderate",
  accessLevel: "free",
  tags: [
    "osint",
    "social-engineering",
    "social-media",
    "reconnaissance",
    "physical-security",
    "awareness",
  ],

  description:
    "Assess how much sensitive information employees inadvertently expose on social media that attackers can weaponize for social engineering, physical intrusion, and targeted phishing campaigns.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify categories of sensitive information leaked through social media posts",
    "Evaluate the reconnaissance value of publicly shared workplace photos",
    "Recognize how professional networking profiles enable targeted social engineering",
    "Assess physical security risks created by executive travel disclosures",
  ],
  sortOrder: 416,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "osint-001",
      title: "Badge Photo Leak on Instagram",
      objective:
        "An employee posted a selfie on Instagram showing their new office badge. Determine the exposure severity and appropriate response.",
      investigationData: [
        {
          id: "photo-analysis",
          label: "Photo Content Analysis",
          content:
            "Employee posted a selfie captioned 'First day vibes!' The badge is clearly visible showing: full name, employee ID (EMP-20847), department (R&D Engineering), building access level (Level 3 — Restricted Labs), and a barcode that encodes the HID proximity card number.",
          isCritical: true,
        },
        {
          id: "badge-system-info",
          label: "Badge System Details",
          content:
            "The company uses HID iCLASS SE proximity cards. The barcode format visible in the photo encodes the 26-bit facility code and card number. With this data, an attacker can clone the badge using a Proxmark3 device for approximately $300.",
          isCritical: true,
        },
        {
          id: "social-reach",
          label: "Post Visibility & Reach",
          content:
            "The account is public with 1,200 followers. The post has 89 likes and 12 comments. It has been live for 6 hours. Three coworkers commented with congratulations, confirming the employee's identity and workplace.",
        },
        {
          id: "additional-metadata",
          label: "EXIF & Location Data",
          content:
            "The photo's EXIF data includes GPS coordinates that pinpoint the building lobby. The Instagram location tag reads 'Meridian Tech Campus — Building C.' Combined with the badge level, an attacker knows exactly which building entrance to target.",
        },
      ],
      actions: [
        {
          id: "CRITICAL_RESPONSE",
          label: "Critical exposure — request immediate takedown and revoke/reissue badge",
          color: "red",
        },
        {
          id: "MODERATE_NOTIFY",
          label: "Moderate risk — notify employee to crop the photo",
          color: "orange",
        },
        {
          id: "LOW_AWARENESS",
          label: "Low risk — send a general awareness reminder",
          color: "yellow",
        },
        {
          id: "NO_ACTION",
          label: "No action needed — personal social media is not our concern",
          color: "blue",
        },
      ],
      correctActionId: "CRITICAL_RESPONSE",
      rationales: [
        {
          id: "rat-critical",
          text: "The badge photo exposes enough data to clone the physical access card and identify the exact building and access level. The card must be revoked immediately because cropping the photo after 6 hours of public exposure does not eliminate the risk — the data has already been available for capture.",
        },
        {
          id: "rat-crop",
          text: "Cropping the photo removes future exposure but doesn't address the fact that the badge data has been publicly accessible for hours and may already have been harvested by automated OSINT scrapers.",
        },
        {
          id: "rat-awareness",
          text: "A general awareness reminder is appropriate for minor leaks but inadequate when specific access credentials are already exposed and can be directly exploited.",
        },
        {
          id: "rat-personal",
          text: "Dismissing this as a personal social media matter ignores the direct physical security threat to the organization created by the exposed access credentials.",
        },
      ],
      correctRationaleId: "rat-critical",
      feedback: {
        perfect:
          "Correct. The exposed badge contains everything needed to clone a physical access card: facility code, card number, and the target building. Once that data is public, the only safe response is to revoke and reissue the badge while requesting an immediate takedown.",
        partial:
          "You recognized the risk but chose an insufficient response. Cropping or awareness reminders do not address the fact that cloneable badge data has been publicly available for hours. The badge itself must be revoked.",
        wrong:
          "This is a critical physical security exposure, not a social media etiquette issue. The photo contains enough information to clone the employee's access card and enter restricted labs. Immediate badge revocation is required.",
      },
    },
    {
      type: "investigate-decide",
      id: "osint-002",
      title: "LinkedIn Profile Revealing Internal Tech Stack",
      objective:
        "A senior engineer's LinkedIn profile contains detailed descriptions of internal projects and technology stack. Evaluate the reconnaissance value for an attacker.",
      investigationData: [
        {
          id: "profile-content",
          label: "LinkedIn Profile Details",
          content:
            "The engineer's profile lists: 'Lead architect for Project Nighthawk — migrating core payment processing from Oracle 19c to PostgreSQL 15 on AWS EKS (Kubernetes 1.28). Implementing HashiCorp Vault for secrets management replacing CyberArk. Managing team of 8 across 3 time zones.'",
        },
        {
          id: "attack-surface",
          label: "Reconnaissance Value Assessment",
          content:
            "This profile reveals: (1) an active migration creating temporary security gaps, (2) specific database versions attackers can research for known CVEs, (3) the secrets management platform being replaced — the transition period is when credential handling is weakest, (4) team size and distribution useful for social engineering pretexting.",
        },
        {
          id: "endorsements-connections",
          label: "Network & Endorsements",
          content:
            "The engineer has 47 endorsements for 'Kubernetes' and 'AWS' from colleagues whose profiles also reference Project Nighthawk. An attacker can map the entire team, their roles, and reporting structure from interconnected endorsements and recommendations.",
          isCritical: true,
        },
        {
          id: "public-activity",
          label: "Recent Activity & Posts",
          content:
            "The engineer posted a conference talk slide deck titled 'Lessons from Migrating Payment Systems at Scale' that includes architecture diagrams showing internal network segmentation between the old Oracle cluster and new PostgreSQL instances.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "MODERATE_REMEDIATE",
          label: "Moderate risk — work with employee to sanitize profile and remove architecture details",
          color: "orange",
        },
        {
          id: "CRITICAL_LOCKDOWN",
          label: "Critical — demand immediate removal of all project details",
          color: "red",
        },
        {
          id: "LOW_GUIDELINE",
          label: "Low risk — update social media guidelines for future reference",
          color: "yellow",
        },
        {
          id: "ACCEPTABLE",
          label: "Acceptable — engineers need detailed profiles for career growth",
          color: "blue",
        },
      ],
      correctActionId: "MODERATE_REMEDIATE",
      rationales: [
        {
          id: "rat-moderate",
          text: "The profile reveals exploitable specifics — database versions, migration timing, secrets management transition — that go beyond normal career descriptions. A collaborative approach to sanitize the profile preserves the employee's professional presence while removing details that directly aid reconnaissance.",
        },
        {
          id: "rat-critical",
          text: "Demanding immediate removal of all project details is disproportionate and damages trust with engineering staff. The goal is to remove exploitable specifics, not prevent engineers from describing their work entirely.",
        },
        {
          id: "rat-guidelines",
          text: "Updating guidelines for the future does not address the current exposure of specific versions, migration timelines, and architecture diagrams that are actively useful to an attacker targeting the organization now.",
        },
        {
          id: "rat-acceptable",
          text: "While professional profiles are important, sharing specific database versions, internal project codenames, secrets management platforms, and architecture diagrams crosses the line from career description into actionable reconnaissance intelligence.",
        },
      ],
      correctRationaleId: "rat-moderate",
      feedback: {
        perfect:
          "Good judgment. The profile contains genuinely exploitable details — specific software versions, migration timing, and architecture diagrams — but the response should be collaborative, not punitive. Help the engineer describe their work without exposing attack surface.",
        partial:
          "You identified the issue but your response was either too aggressive or too passive. Heavy-handed demands alienate engineering talent, while deferring to future guidelines ignores an active exposure of exploitable technical details.",
        wrong:
          "This profile is a reconnaissance goldmine: specific CVE-researchable versions, a migration creating temporary security gaps, and architecture diagrams. Ignoring it or deferring action leaves the organization exposed to targeted attacks.",
      },
    },
    {
      type: "investigate-decide",
      id: "osint-003",
      title: "Executive Travel Plans Enabling Whaling Attack",
      objective:
        "The CEO posted vacation photos and travel plans on social media. Assess the physical security and social engineering risk.",
      investigationData: [
        {
          id: "travel-posts",
          label: "Social Media Posts",
          content:
            "The CEO posted on Twitter/X: 'Heading to Tokyo for the week! Excited for the keynote at CyberSec Asia on Thursday. Back in SF next Monday.' The post includes a photo of the boarding pass with a partially visible booking reference and seat number.",
          isCritical: true,
        },
        {
          id: "whaling-risk",
          label: "Whaling Attack Vector",
          content:
            "With the CEO confirmed out of office and their exact return date known, an attacker can: (1) send a BEC email to the CFO impersonating the CEO requesting an urgent wire transfer 'before I board my flight home,' (2) time the attack for Friday when the CEO is at the conference and unreachable, (3) reference the real conference by name to add legitimacy.",
          isCritical: true,
        },
        {
          id: "physical-risk",
          label: "Physical Security Implications",
          content:
            "The CEO's absence is now publicly confirmed for a specific date range. This creates a window for: physical intrusion attempts at the CEO's office or home, social engineering of executive assistants ('the CEO asked me to pick up documents from their office while they're in Tokyo'), and targeted device theft at the known conference venue.",
        },
        {
          id: "booking-reference",
          label: "Boarding Pass Data Exposure",
          content:
            "The partially visible booking reference (first 4 of 6 characters readable) combined with the CEO's name could allow an attacker to access the airline reservation system, modify the itinerary, or harvest the CEO's frequent flyer number and passport details stored in the booking.",
        },
      ],
      actions: [
        {
          id: "HIGH_MULTI_ACTION",
          label: "High risk — alert executive protection, issue BEC warning to finance, request post deletion",
          color: "red",
        },
        {
          id: "MODERATE_BEC_WARN",
          label: "Moderate risk — warn finance team about potential BEC attempts",
          color: "orange",
        },
        {
          id: "LOW_GENERAL",
          label: "Low risk — note for next security awareness training",
          color: "yellow",
        },
        {
          id: "NO_ISSUE",
          label: "No issue — executives travel publicly all the time",
          color: "blue",
        },
      ],
      correctActionId: "HIGH_MULTI_ACTION",
      rationales: [
        {
          id: "rat-multi",
          text: "The travel disclosure creates multiple simultaneous attack vectors — BEC targeting finance, physical security gaps, and booking system compromise. A coordinated response addressing all vectors is necessary because an attacker will exploit whichever one is left undefended.",
        },
        {
          id: "rat-bec-only",
          text: "Warning only the finance team addresses one attack vector but ignores the physical security risk, the booking reference exposure, and the social engineering opportunities created by the CEO's confirmed absence.",
        },
        {
          id: "rat-training",
          text: "Saving this for future training ignores the immediate and active threat window created by the CEO's publicly announced absence with specific dates and location.",
        },
        {
          id: "rat-normal",
          text: "While executive travel is normal, publicly announcing exact dates, destination, conference schedule, and partial booking references creates a specific, time-bounded attack window that is actively exploitable.",
        },
      ],
      correctRationaleId: "rat-multi",
      feedback: {
        perfect:
          "Excellent analysis. You recognized that the travel disclosure creates a convergence of threats — BEC, physical intrusion, booking system abuse — that must all be addressed simultaneously. The multi-vector response protects the organization across all exposed surfaces.",
        partial:
          "You identified part of the threat but missed the full picture. Executive travel disclosures create overlapping attack vectors that require a coordinated response, not a single-vector mitigation.",
        wrong:
          "Publicly announced executive travel with specific dates, locations, and partial booking data is a high-value intelligence package for attackers. Dismissing it or deferring to training ignores an immediate, exploitable threat window.",
      },
    },
  ],

  hints: [
    "Consider not just what information is directly visible, but what can be derived or combined with other public sources to create an attack.",
    "Physical access credentials exposed online cannot be 'un-exposed' — once the data is public, assume it has been captured.",
    "Executive travel disclosures create time-bounded attack windows that enable multiple simultaneous threat vectors.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "OSINT reconnaissance is the first phase of nearly every targeted attack. Security awareness professionals who can quantify and communicate the risk of social media exposure are increasingly valued as organizations recognize that technical controls alone cannot prevent information leakage through employee behavior.",
  toolRelevance: [
    "Maltego (OSINT graph analysis)",
    "SpiderFoot (Automated OSINT)",
    "Shodan (Infrastructure reconnaissance)",
    "Have I Been Pwned (Credential exposure)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
