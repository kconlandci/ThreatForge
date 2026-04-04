import type { LabManifest } from "../../types/manifest";

export const aiGeneratedPhishingDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "ai-generated-phishing-detection",
  version: 1,
  title: "AI-Generated Phishing Detection",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "free",
  tags: [
    "ai-phishing",
    "spear-phishing",
    "bec",
    "llm-threats",
    "email-security",
    "detection",
  ],

  description:
    "Identify AI-crafted phishing emails that bypass traditional red flags — no typos, proper grammar, and personalized content scraped from public sources. Investigate subtle indicators that distinguish machine-generated social engineering from legitimate communications.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Recognize AI-generated phishing emails that lack traditional spelling and grammar errors",
    "Identify behavioral and contextual anomalies that distinguish AI-crafted emails from legitimate ones",
    "Evaluate the risk of mass-personalized phishing campaigns using scraped professional data",
    "Distinguish genuinely suspicious communications from well-written legitimate emails",
  ],
  sortOrder: 422,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "aiphish-001",
      title: "Perfectly Written Spear-Phish Using LinkedIn Data",
      objective:
        "A senior engineer received an email that references their recent conference talk and offers a collaboration opportunity. The email is grammatically perfect and highly personalized. Investigate whether it is legitimate.",
      investigationData: [
        {
          id: "email-content",
          label: "Email Body Analysis",
          content:
            "The email references the engineer's talk at BSides Portland last month by title, quotes a specific slide about zero-trust architecture, and proposes a joint research paper. The writing is polished with no typos, proper academic tone, and correctly uses industry terminology. The sender signs as 'Dr. Elaine Mercer, Principal Researcher, Cyberion Labs.'",
        },
        {
          id: "sender-verification",
          label: "Sender & Domain Verification",
          content:
            "From: e.mercer@cyberion-labs.net — The domain cyberion-labs.net was registered 9 days ago via Namecheap with privacy-protected WHOIS. No 'Cyberion Labs' entity exists in corporate registries, academic databases, or LinkedIn company pages. SPF: PASS (the attacker controls the domain). DKIM: PASS (self-signed).",
          isCritical: true,
        },
        {
          id: "link-analysis",
          label: "Embedded Link Analysis",
          content:
            "The email contains a link to 'cyberion-labs.net/collaboration-proposal.pdf' — URLScan.io shows it redirects through 3 intermediary domains before landing on a page that requests Google Workspace OAuth authorization with read access to Gmail and Google Drive. The page mimics a Google sign-in flow.",
          isCritical: true,
        },
        {
          id: "osint-correlation",
          label: "OSINT Data Correlation",
          content:
            "Every detail in the email — the conference title, talk topic, specific slide content, and the engineer's research interests — is publicly available from the BSides Portland published schedule, the engineer's SlideShare upload, and their LinkedIn profile. No information in the email requires insider access.",
        },
      ],
      actions: [
        {
          id: "CONFIRM_PHISH",
          label: "Confirmed AI-generated phishing — quarantine and report with IOCs",
          color: "red",
        },
        {
          id: "SUSPICIOUS_VERIFY",
          label: "Suspicious — reach out to 'Dr. Mercer' to verify before deciding",
          color: "orange",
        },
        {
          id: "LEGITIMATE_COLLAB",
          label: "Likely legitimate — academic collaboration requests are common",
          color: "blue",
        },
        {
          id: "LOW_RISK_MONITOR",
          label: "Low risk — flag for monitoring but take no action",
          color: "yellow",
        },
      ],
      correctActionId: "CONFIRM_PHISH",
      rationales: [
        {
          id: "rat-confirmed",
          text: "The 9-day-old domain with no verifiable entity, OAuth credential harvesting disguised as a PDF link, and content entirely constructable from public OSINT sources confirm this is a sophisticated AI-generated spear-phish. The perfect grammar and personalization are the AI's contribution — traditional phishing detection rules based on typos and generic greetings would miss this entirely.",
        },
        {
          id: "rat-verify-risk",
          text: "Reaching out to 'Dr. Mercer' through the attacker-controlled email confirms to the attacker that the target is engaged and may reveal additional information useful for follow-up attacks.",
        },
        {
          id: "rat-academic",
          text: "While academic collaboration emails are common, the combination of a newly registered domain, a nonexistent organization, and an OAuth harvesting redirect eliminates the possibility of legitimacy regardless of how well-written the email is.",
        },
        {
          id: "rat-monitor-insufficient",
          text: "Monitoring without action leaves the OAuth harvesting link active and allows the attacker to continue targeting other employees who may have attended the same conference.",
        },
      ],
      correctRationaleId: "rat-confirmed",
      feedback: {
        perfect:
          "Excellent analysis. This is a textbook example of AI-generated spear-phishing: perfect language, deep personalization from OSINT sources, and a credential harvesting payload. The absence of traditional red flags is the red flag — real researchers work at organizations that exist and use established domains.",
        partial:
          "You recognized something was off but chose a response that either engages with the attacker or delays action. The domain age, nonexistent organization, and OAuth harvesting link are conclusive — no further verification is needed.",
        wrong:
          "The perfect grammar is exactly what makes this dangerous. AI-generated phishing eliminates the typos and awkward phrasing that traditional training teaches people to look for. Focus on infrastructure indicators: domain age, organizational verification, and link destination analysis.",
      },
    },
    {
      type: "investigate-decide",
      id: "aiphish-002",
      title: "Well-Written Vendor Communication with Unusual Request",
      objective:
        "The procurement team received a polished email from a known vendor contact requesting a change to their payment bank account details. The email is well-written and references an active contract. Determine if this is an AI-generated BEC attempt or a legitimate request.",
      investigationData: [
        {
          id: "email-content",
          label: "Email Content",
          content:
            "The email from Jessica Torres at Pinnacle Supply Co. references contract PSC-2025-0441, correctly names the procurement lead (Robert Kim), and explains that Pinnacle is transitioning to a new banking partner due to 'improved wire processing times for international transactions.' The writing is professional and matches Jessica's prior email tone.",
        },
        {
          id: "sender-verification",
          label: "Sender & Domain Verification",
          content:
            "From: j.torres@pinnaclesupply.com — this is the exact domain used in all prior Pinnacle communications. SPF: PASS. DKIM: PASS. The email originates from Pinnacle's known mail server IP (203.0.113.42). The domain has been registered since 2018.",
        },
        {
          id: "prior-communication",
          label: "Communication History",
          content:
            "Jessica Torres has been the primary contact for this account for 18 months. The email thread continues from a legitimate conversation about Q3 deliverables from last week. The reply headers are consistent — this is a genuine reply in the existing thread, not a new thread with a forged subject line.",
        },
        {
          id: "request-validation",
          label: "Request & Process Check",
          content:
            "Bank account changes for vendors require a signed authorization form plus verbal confirmation per company policy. Jessica's email acknowledges this, stating: 'I've attached the signed bank change authorization form and I'm available for a verification call at your convenience this week.' The attached PDF contains a signed form on Pinnacle letterhead.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "VERIFY_FULFILL",
          label: "Legitimate — follow standard bank change verification process and fulfill",
          color: "green",
        },
        {
          id: "QUARANTINE_BEC",
          label: "Suspected BEC — quarantine and block",
          color: "red",
        },
        {
          id: "HOLD_INVESTIGATE",
          label: "Suspicious — hold request and investigate further",
          color: "orange",
        },
        {
          id: "APPROVE_EXPEDITE",
          label: "Approve immediately — known vendor, no investigation needed",
          color: "blue",
        },
      ],
      correctActionId: "VERIFY_FULFILL",
      rationales: [
        {
          id: "rat-legitimate",
          text: "Every verification checkpoint passes: the sender domain is authentic with valid SPF/DKIM from the known mail server, the email continues a real thread, the contact is established, and the request proactively follows the bank change authorization procedure. Following the standard verification process (verbal confirmation call) and then fulfilling the request is the correct balance of security and business operations.",
        },
        {
          id: "rat-quarantine-overreact",
          text: "Quarantining a legitimate vendor request that passes all authentication checks and follows proper procedure would damage a long-standing business relationship and delay procurement operations without justification.",
        },
        {
          id: "rat-investigate-delay",
          text: "Further investigation beyond the standard verification process is unnecessary when all technical and procedural indicators confirm legitimacy. Excessive investigation of legitimate requests creates vendor friction and operational delays.",
        },
        {
          id: "rat-approve-skip",
          text: "Approving without the verbal confirmation call bypasses the bank change procedure that exists precisely to catch compromised vendor accounts. Even legitimate requests must complete verification.",
        },
      ],
      correctRationaleId: "rat-legitimate",
      feedback: {
        perfect:
          "Strong judgment. Not every well-written email is AI-generated phishing. This email passes every authentication check, comes from an established contact on a verified domain, continues a real thread, and proactively follows your bank change procedure. Following the standard verification process is the right call.",
        partial:
          "Your caution shows good instincts, but over-investigating a request that passes every legitimacy check creates unnecessary friction. The standard verbal verification call is sufficient — additional investigation is not warranted here.",
        wrong:
          "Misclassifying a legitimate vendor request as a BEC attack, or approving without following the verification procedure, are both incorrect. Security judgment means distinguishing real threats from legitimate communications and applying proportional verification.",
      },
    },
    {
      type: "investigate-decide",
      id: "aiphish-003",
      title: "Mass-Personalized AI Phishing Targeting Finance Team",
      objective:
        "Five members of the finance team each received a unique email that appears to come from different senders, but all request access to the company's NetSuite ERP system. Each email is personalized to the recipient's specific role. Investigate the campaign.",
      investigationData: [
        {
          id: "campaign-overview",
          label: "Campaign Pattern Analysis",
          content:
            "Five emails arrived within a 12-minute window. Each has a different sender: an auditor, a tax consultant, a banking relationship manager, a benefits provider rep, and a regulatory compliance officer. Each email is uniquely written, references the specific recipient's job title and recent LinkedIn posts, and requests NetSuite access 'to complete year-end reconciliation tasks.'",
          isCritical: true,
        },
        {
          id: "domain-analysis",
          label: "Sender Domain Investigation",
          content:
            "All five sender domains were registered within the past 14 days through different registrars. Each domain mimics a real company: 'kpmg-advisory-group.com' (real: kpmg.com), 'deloitte-tax-services.net' (real: deloitte.com), 'jpmorgan-corporate.org' (real: jpmorgan.com). All domains use separate mail servers but share the same /24 IP subnet (185.234.72.0/24).",
          isCritical: true,
        },
        {
          id: "link-analysis",
          label: "Credential Harvesting Infrastructure",
          content:
            "Each email links to a unique URL on its respective domain, but all URLs redirect to the same NetSuite-themed login page hosted at 185.234.72.100. The fake login page captures NetSuite credentials and MFA tokens using an adversary-in-the-middle (AiTM) proxy that relays authentication to the real NetSuite instance in real time.",
        },
        {
          id: "personalization-depth",
          label: "AI Personalization Evidence",
          content:
            "Each email demonstrates knowledge of the recipient's specific role (e.g., 'As Senior AP Analyst, you'll need to verify the intercompany elimination entries'), uses industry terminology appropriate to the sender's claimed role, and references real regulatory deadlines. The writing quality, vocabulary diversity, and contextual awareness across all five emails indicate LLM generation with role-specific prompting rather than manual composition.",
        },
      ],
      actions: [
        {
          id: "CAMPAIGN_RESPONSE",
          label: "Active BEC campaign — block all domains, quarantine all emails, alert full finance team, reset any compromised NetSuite credentials",
          color: "red",
        },
        {
          id: "INDIVIDUAL_REVIEW",
          label: "Review each email individually — some may be legitimate",
          color: "orange",
        },
        {
          id: "BLOCK_MONITOR",
          label: "Block the domains and monitor — no need for full incident response",
          color: "yellow",
        },
        {
          id: "VERIFY_SENDERS",
          label: "Contact each sender organization to verify the requests",
          color: "blue",
        },
      ],
      correctActionId: "CAMPAIGN_RESPONSE",
      rationales: [
        {
          id: "rat-campaign",
          text: "The coordinated timing, recently registered lookalike domains sharing the same IP subnet, AiTM credential harvesting infrastructure, and LLM-generated personalization across five simultaneous targets confirm this is an organized AI-powered BEC campaign. Full incident response is required: block all identified infrastructure, quarantine all five emails, alert every finance team member (including those who may not have been targeted yet), and immediately verify whether any credentials were already captured.",
        },
        {
          id: "rat-individual",
          text: "Reviewing emails individually ignores the campaign-level indicators. The shared IP subnet, coordinated timing, and common AiTM infrastructure prove these emails are related — treating them separately wastes time and risks credential compromise while investigation continues.",
        },
        {
          id: "rat-block-insufficient",
          text: "Blocking domains without full incident response leaves potential credential compromises unaddressed. If any of the five recipients clicked the link and entered credentials, the attacker may already have active AiTM sessions with real-time MFA bypass.",
        },
        {
          id: "rat-verify-contact",
          text: "Contacting the impersonated organizations confirms what the domain registration data already proves — these are fake senders. This delays the response without adding actionable intelligence.",
        },
      ],
      correctRationaleId: "rat-campaign",
      feedback: {
        perfect:
          "Outstanding detection. You identified the campaign-level indicators that reveal the AI-powered nature of this attack: coordinated timing, shared infrastructure behind lookalike domains, AiTM credential harvesting, and LLM-generated personalization at scale. Full incident response is the only appropriate action for an active BEC campaign with credential harvesting capability.",
        partial:
          "You recognized the threat but your response does not match the severity of an active credential harvesting campaign. With AiTM infrastructure capturing credentials and MFA tokens in real time, every minute of delayed full response increases the risk of complete NetSuite account compromise.",
        wrong:
          "This is a coordinated, AI-powered BEC campaign with real-time credential harvesting. Treating the emails individually or simply blocking domains without checking for credential compromise leaves the organization exposed to active account takeover.",
      },
    },
  ],

  hints: [
    "When an email has perfect grammar and deep personalization, shift your analysis from language quality to infrastructure indicators: domain age, sender verification, and link destination analysis.",
    "AI-generated phishing campaigns often share infrastructure indicators (IP subnets, registration patterns) even when the emails themselves appear completely unrelated — always look for campaign-level patterns.",
    "Not every well-written email is AI-generated phishing. Legitimate vendor communications from authenticated domains with established history should not be treated as suspicious simply because they lack typos.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "AI-generated phishing is fundamentally changing the threat landscape by eliminating the grammar and spelling errors that traditional security awareness training depends on. Detection engineers and threat hunters who can identify AI-generated campaigns through infrastructure analysis and behavioral patterns rather than content-level red flags are becoming essential to every SOC.",
  toolRelevance: [
    "Microsoft Defender for Office 365 (AI phishing detection)",
    "Abnormal Security (Behavioral email analysis)",
    "URLScan.io (Link infrastructure analysis)",
    "DomainTools (Domain registration intelligence)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
