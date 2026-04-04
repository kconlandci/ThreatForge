import type { LabManifest } from "../../types/manifest";

export const phishingLinkAnalysisLab: LabManifest = {
  schemaVersion: "1.1",
  id: "phishing-link-analysis",
  version: 1,
  title: "Phishing Link Analysis",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "phishing",
    "url-analysis",
    "domain-reputation",
    "typosquatting",
    "homograph-attack",
    "ssl-certificates",
    "link-safety",
  ],

  description:
    "Analyze suspicious URLs by examining domain structure, SSL certificates, redirect chains, and reputation data to determine whether each link is malicious, benign, or requires further investigation.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify typosquatted domains by comparing URL structures to legitimate sites",
    "Evaluate SSL certificate details to detect fraudulent or impersonated sites",
    "Recognize homograph attacks using internationalized domain name (IDN) encoding",
    "Distinguish legitimate URL shorteners from malicious redirect chains",
  ],
  sortOrder: 404,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "link-001",
      title: "Typosquatted Banking Domain",
      objective:
        "An employee received a text message claiming their corporate banking session expired. The message contains a link to re-authenticate. Analyze the URL before anyone clicks it.",
      investigationData: [
        {
          id: "url-structure",
          label: "URL Structure",
          content:
            "https://www.chase-securlty.com/auth/verify-session?ref=sms_alert_2026 — The domain is 'chase-securlty.com' (missing the 'i' in 'security'). The legitimate domain is chase.com. The subdomain structure and path mimic a real authentication flow.",
          isCritical: true,
        },
        {
          id: "ssl-cert",
          label: "SSL Certificate Details",
          content:
            "Issuer: Let's Encrypt | Valid: 2026-03-20 to 2026-06-18 | Subject: chase-securlty.com | Type: Domain Validation (DV) only. No Organization Validation (OV) or Extended Validation (EV) certificate. The legitimate Chase site uses an EV certificate issued to JPMorgan Chase & Co.",
          isCritical: true,
        },
        {
          id: "whois-data",
          label: "WHOIS & Domain Age",
          content:
            "Registrar: Namecheap, Inc. | Registration Date: 2026-03-18 (9 days ago) | Registrant: Privacy-protected via WhoisGuard. Domain registered just days before the phishing campaign began.",
        },
        {
          id: "reputation-check",
          label: "Domain Reputation Lookup",
          content:
            "VirusTotal: 7/92 vendors flag as malicious (Phishing). Google Safe Browsing: Not yet flagged. URLhaus: No entries. The low detection rate is typical for newly registered phishing domains that haven't been widely reported yet.",
        },
      ],
      actions: [
        {
          id: "BLOCK_REPORT",
          label: "Block URL and report as phishing",
          color: "red",
        },
        {
          id: "ALLOW_LEGIT",
          label: "Allow — appears to be a legitimate Chase page",
          color: "green",
        },
        {
          id: "MONITOR_WAIT",
          label: "Monitor — wait for more reputation data",
          color: "yellow",
        },
        {
          id: "SANDBOX_TEST",
          label: "Open in sandbox to verify content",
          color: "orange",
        },
      ],
      correctActionId: "BLOCK_REPORT",
      rationales: [
        {
          id: "rat-typosquat-confirmed",
          text: "The misspelled domain ('securlty' missing the 'i'), DV-only certificate on a financial site, 9-day-old registration with privacy protection, and early vendor detections collectively confirm this is a typosquatting phishing site. Block immediately and report to anti-phishing feeds.",
        },
        {
          id: "rat-lets-encrypt",
          text: "Having an SSL certificate does not make a site legitimate. Let's Encrypt issues free DV certificates to anyone without identity verification. Phishing sites routinely use HTTPS to appear trustworthy.",
        },
        {
          id: "rat-low-detection",
          text: "Waiting for higher detection rates allows the phishing site to remain active and collect credentials. Newly registered domains used in phishing campaigns should be blocked proactively based on structural indicators, not solely on reputation scores.",
        },
        {
          id: "rat-sandbox",
          text: "While sandbox analysis provides additional intelligence, the structural evidence is already sufficient for a block decision. Sandboxing delays the response without changing the outcome.",
        },
      ],
      correctRationaleId: "rat-typosquat-confirmed",
      feedback: {
        perfect:
          "Correct. The typosquatted domain, DV-only certificate, and 9-day registration are definitive phishing indicators. Blocking and reporting immediately protects users and contributes to community threat intelligence.",
        partial:
          "You identified something suspicious but chose a delayed response. With financial credential phishing, every minute the link remains active risks credential theft. The structural evidence was sufficient for immediate blocking.",
        wrong:
          "Allowing this URL would expose users to credential theft. The misspelled domain alone is a strong indicator, and the supporting evidence (new registration, DV cert, early vendor flags) confirms the phishing intent.",
      },
    },
    {
      type: "investigate-decide",
      id: "link-002",
      title: "Legitimate Shortened URL (False Positive)",
      objective:
        "The marketing team shared a Bitly link in the company Slack channel for an upcoming webinar registration. A cautious employee flagged it as suspicious because the destination is hidden behind a URL shortener. Determine whether this is a real threat.",
      investigationData: [
        {
          id: "shortened-url",
          label: "Shortened URL",
          content:
            "https://bit.ly/3xWebinarQ2 — Shared by Sarah Chen (Marketing Director) in the #company-events Slack channel. The link was posted alongside a description of the Q2 product webinar.",
        },
        {
          id: "expanded-url",
          label: "Expanded URL (via Bitly Preview)",
          content:
            "Expanded destination: https://events.zoom.us/ev/AjK8fL2m-webinar-q2-product-launch — Resolves to Zoom's official event hosting subdomain (events.zoom.us). Path structure is consistent with legitimate Zoom webinar registration pages.",
        },
        {
          id: "ssl-cert",
          label: "Destination SSL Certificate",
          content:
            "Issuer: DigiCert Inc. | Subject: *.zoom.us | Type: Organization Validated (OV) | Organization: Zoom Video Communications, Inc. | Valid through 2027-01-15. Certificate chain matches Zoom's known PKI infrastructure.",
        },
        {
          id: "context-check",
          label: "Internal Context Verification",
          content:
            "The company events calendar has a Q2 Product Launch Webinar scheduled for April 10, 2026, organized by Sarah Chen. The Slack post matches the calendar event title and date. Bitly link was created from the marketing team's branded Bitly account.",
        },
      ],
      actions: [
        {
          id: "ALLOW_LEGITIMATE",
          label: "Allow — confirmed legitimate after verification",
          color: "green",
        },
        {
          id: "BLOCK_SHORTENED",
          label: "Block — shortened URLs are always suspicious",
          color: "red",
        },
        {
          id: "REPLACE_FULL",
          label: "Replace with full URL and allow",
          color: "blue",
        },
        {
          id: "ESCALATE_INVESTIGATE",
          label: "Escalate for further investigation",
          color: "yellow",
        },
      ],
      correctActionId: "ALLOW_LEGITIMATE",
      rationales: [
        {
          id: "rat-verified-legit",
          text: "The expanded URL resolves to Zoom's official domain with a valid OV certificate, the sender is a known internal employee in the appropriate role, and the event correlates with the company calendar. All indicators confirm legitimacy. Blocking would disrupt a legitimate business activity.",
        },
        {
          id: "rat-shorteners-risky",
          text: "URL shorteners can obscure malicious destinations, but the risk is mitigated by expanding the URL and verifying the destination. Blanket blocking of shorteners would disrupt legitimate marketing and communication workflows.",
        },
        {
          id: "rat-replace-overhead",
          text: "Replacing the shortened URL with the full one is unnecessary overhead when the destination has been verified as legitimate. This creates process friction without improving security.",
        },
        {
          id: "rat-escalate-waste",
          text: "Escalating a verified legitimate link wastes analyst time and contributes to alert fatigue. When structural and contextual evidence confirm legitimacy, close the investigation confidently.",
        },
      ],
      correctRationaleId: "rat-verified-legit",
      feedback: {
        perfect:
          "Good judgment. The expanded URL points to official Zoom infrastructure, the certificate validates Zoom's identity, and the internal context matches. Not every shortened URL is malicious, and the ability to clear false positives efficiently is critical for SOC productivity.",
        partial:
          "Your caution around shortened URLs is reasonable, but the evidence clearly confirms this link is legitimate. Over-restricting verified business communications erodes trust between security and other departments.",
        wrong:
          "Blanket blocking of shortened URLs or unnecessary escalation disrupts business operations. The investigation confirmed the destination, sender, and business context are all legitimate. Analysts must be able to close false positives confidently.",
      },
    },
    {
      type: "investigate-decide",
      id: "link-003",
      title: "Homograph Attack with Punycode Domain",
      objective:
        "An employee received an email from a vendor containing a link to download an updated contract. The URL appears to be the vendor's legitimate domain at first glance, but the spam filter flagged it for IDN homograph characters. Investigate the URL.",
      investigationData: [
        {
          id: "displayed-url",
          label: "Displayed URL vs. Actual Encoding",
          content:
            "Displayed: https://www.acmecorp.com/contracts/download — Actual (Punycode): https://www.xn--acmecorp-j2a.com/contracts/download — The Cyrillic character 'a' (U+0430) replaces the Latin 'a' (U+0061) in the domain name. Visually identical in most fonts but resolves to a completely different server.",
          isCritical: true,
        },
        {
          id: "ssl-cert",
          label: "SSL Certificate Analysis",
          content:
            "Issuer: Let's Encrypt | Subject: xn--acmecorp-j2a.com | Type: Domain Validation (DV) only. The legitimate acmecorp.com uses an OV certificate issued by DigiCert to Acme Corporation, Inc. The Punycode domain has a completely separate certificate from a different CA.",
          isCritical: true,
        },
        {
          id: "dns-resolution",
          label: "DNS Resolution Comparison",
          content:
            "Legitimate acmecorp.com resolves to 203.0.113.50 (Acme Corp data center, US). The Punycode variant xn--acmecorp-j2a.com resolves to 91.234.56.78 (VPS provider, Eastern Europe). Completely different infrastructure with no relationship to Acme Corp.",
        },
        {
          id: "redirect-chain",
          label: "Redirect Chain Analysis",
          content:
            "Following the Punycode URL: xn--acmecorp-j2a.com/contracts/download -> 302 redirect to xn--acmecorp-j2a.com/auth/login -> serves a cloned login page requesting corporate SSO credentials. The page HTML contains a form action posting credentials to 91.234.56.78:8443/collect.",
        },
      ],
      actions: [
        {
          id: "BLOCK_PHISH",
          label: "Block domain and alert the vendor relationship",
          color: "red",
        },
        {
          id: "ALLOW_VENDOR",
          label: "Allow — the vendor URL looks correct",
          color: "green",
        },
        {
          id: "ASK_VENDOR",
          label: "Contact vendor to verify before deciding",
          color: "orange",
        },
        {
          id: "SANDBOX_OPEN",
          label: "Open in sandbox for dynamic analysis",
          color: "yellow",
        },
      ],
      correctActionId: "BLOCK_PHISH",
      rationales: [
        {
          id: "rat-homograph-confirmed",
          text: "The Punycode encoding confirms an IDN homograph attack. The Cyrillic character substitution creates a visually identical domain that resolves to an attacker-controlled server. The credential harvesting form in the redirect chain confirms malicious intent. Block immediately and notify the vendor that their brand is being impersonated.",
        },
        {
          id: "rat-visual-match",
          text: "Visual similarity is the entire point of homograph attacks. The displayed URL is designed to appear identical to the legitimate domain. Always check the actual Punycode encoding when IDN characters are flagged.",
        },
        {
          id: "rat-vendor-delay",
          text: "Contacting the vendor for verification introduces delay during which other employees may click the link. The technical evidence (Punycode encoding, different IP, credential harvesting) is conclusive without needing vendor confirmation.",
        },
        {
          id: "rat-sandbox-unnecessary",
          text: "Sandbox analysis would confirm what the static investigation already reveals. The Punycode domain, mismatched certificate, foreign IP, and credential harvesting form provide sufficient evidence for an immediate block decision.",
        },
      ],
      correctRationaleId: "rat-homograph-confirmed",
      feedback: {
        perfect:
          "Excellent analysis. You identified the IDN homograph attack through the Punycode encoding, confirmed the infrastructure mismatch, and recognized the credential harvesting endpoint. Blocking and alerting the vendor protects the organization and helps the vendor respond to brand impersonation.",
        partial:
          "You recognized something was wrong but chose a slower response. With active credential harvesting infrastructure, delay means potential compromise. The Punycode encoding and foreign IP were conclusive evidence for immediate blocking.",
        wrong:
          "The URL only appears legitimate due to Cyrillic character substitution. The Punycode domain, mismatched certificate, foreign server, and credential harvesting form are all definitive indicators of a homograph phishing attack. Allowing or ignoring this link risks credential theft.",
      },
    },
  ],

  hints: [
    "Look beyond visual appearance. Copy the URL to a text editor and check for unusual Unicode characters or Punycode (xn--) encoding in the domain.",
    "A valid SSL certificate only means the connection is encrypted, not that the site is legitimate. Check the certificate type (DV vs OV vs EV) and the issuing organization.",
    "Domain age and registration details are strong contextual indicators. Phishing domains are typically registered days or hours before a campaign launches.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "URL analysis is a daily task for SOC analysts and threat intelligence teams. The ability to quickly decompose a URL into its structural components (domain, path, parameters, encoding) and cross-reference with reputation data separates efficient analysts from those who escalate everything.",
  toolRelevance: [
    "VirusTotal / URLScan.io (URL reputation)",
    "CyberChef (Punycode decoding / URL parsing)",
    "WHOIS lookup tools (domain registration)",
    "Google Safe Browsing / PhishTank",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
