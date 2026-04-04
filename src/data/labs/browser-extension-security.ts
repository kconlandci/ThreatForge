import type { LabManifest } from "../../types/manifest";

export const browserExtensionSecurityLab: LabManifest = {
  schemaVersion: "1.1",
  id: "browser-extension-security",
  version: 1,
  title: "Browser Extension Security Review",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "browser-extensions",
    "supply-chain",
    "permissions",
    "malware",
    "data-exfiltration",
    "chrome-web-store",
    "endpoint-security",
  ],

  description:
    "Review browser extensions for malicious behavior by analyzing permissions, data collection practices, developer history, and supply chain risk indicators to classify each extension and recommend appropriate remediation.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Evaluate browser extension permissions against the principle of least privilege",
    "Identify data exfiltration indicators in extension behavior and network traffic",
    "Assess supply chain risk when extension ownership or maintenance changes",
    "Apply proportional remediation based on threat classification confidence",
  ],
  sortOrder: 406,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "ext-001",
      title: "Productivity Tool with Excessive Permissions",
      description:
        "An employee installed a 'Quick Screenshot & Clipboard Manager' extension that was recommended in a productivity blog. IT security was alerted when the endpoint DLP agent detected unusual outbound data transfers from the browser process. Review the evidence and classify the extension.",
      evidence: [
        {
          type: "Permissions",
          content:
            "Requested permissions: 'Read and change all your data on all websites', 'Read items you copy and paste (clipboardRead)', 'Modify data you copy and paste (clipboardWrite)', 'Manage your downloads', 'Access browser tabs'. A legitimate screenshot tool should only need activeTab and downloads permissions.",
          icon: "shield",
        },
        {
          type: "Network Traffic",
          content:
            "DLP agent captured POST requests every 30 seconds to analytics-collector.quickscreenshot[.]io/api/v2/telemetry containing base64-encoded clipboard contents, URLs of visited pages, and form field data. Payload size averages 15KB per request, consistent with structured data exfiltration rather than simple analytics.",
          icon: "network",
        },
        {
          type: "Store Listing",
          content:
            "Chrome Web Store: 340,000+ users | Rating: 4.6 stars (2,100 reviews) | Developer: 'QS Productivity Tools' (no website, Gmail contact only) | Privacy policy: Generic 2-paragraph template with no specific data handling disclosures. Last updated 3 days ago.",
          icon: "store",
        },
        {
          type: "Code Analysis",
          content:
            "Background service worker contains obfuscated JavaScript that registers a MutationObserver on every page to capture input field values as the user types. Clipboard contents are harvested every 5 seconds via navigator.clipboard.readText() and queued for exfiltration. Code uses dynamic eval() to load additional modules from the remote server.",
          icon: "code",
        },
      ],
      classifications: [
        {
          id: "class-malicious",
          label: "Malicious — Data-Stealing Spyware",
          description:
            "The extension is actively exfiltrating user data (clipboard, keystrokes, browsing history) to an external server under the guise of a productivity tool.",
        },
        {
          id: "class-pua",
          label: "Potentially Unwanted — Aggressive Telemetry",
          description:
            "The extension collects more data than expected for analytics but may not have malicious intent.",
        },
        {
          id: "class-benign",
          label: "Benign — Normal Functionality",
          description:
            "The permissions and network traffic are consistent with the stated functionality of the extension.",
        },
        {
          id: "class-adware",
          label: "Adware — Monetization Through Ads",
          description:
            "The extension injects advertisements into web pages for revenue but does not steal data.",
        },
      ],
      correctClassificationId: "class-malicious",
      remediations: [
        {
          id: "rem-force-remove",
          label: "Force-Remove via MDM and Block Extension ID",
          description:
            "Use the organization's mobile device management or browser policy to immediately uninstall the extension from all managed endpoints and add the extension ID to the blocklist. Initiate password resets for affected users.",
        },
        {
          id: "rem-warn-user",
          label: "Warn User and Suggest Uninstall",
          description:
            "Send the employee an advisory email recommending they uninstall the extension at their convenience.",
        },
        {
          id: "rem-restrict-perms",
          label: "Restrict Extension Permissions via Policy",
          description:
            "Use Chrome enterprise policy to limit the extension's site access to specific domains rather than removing it entirely.",
        },
        {
          id: "rem-monitor",
          label: "Add to Monitoring Watchlist",
          description:
            "Flag the extension for ongoing monitoring and review again in 30 days to see if behavior changes.",
        },
      ],
      correctRemediationId: "rem-force-remove",
      rationales: [
        {
          id: "rat-spyware",
          text: "The extension captures clipboard contents, input field keystrokes, and browsing data, then exfiltrates them to an external server via regular POST requests. The obfuscated code and dynamic eval() loading confirm deliberate concealment of malicious functionality. This is active spyware that requires immediate forced removal and credential rotation.",
        },
        {
          id: "rat-over-collection",
          text: "Categorizing this as 'aggressive telemetry' underestimates the threat. Legitimate analytics tools do not capture clipboard contents, keystrokes, or use obfuscated code with dynamic eval(). The behavior pattern is consistent with purpose-built spyware.",
        },
        {
          id: "rat-restrict-fails",
          text: "Restricting permissions does not remediate the threat. The extension has already exfiltrated data, and restricting future access does not address the compromised credentials and data that have already been sent to the attacker's server.",
        },
      ],
      correctRationaleId: "rat-spyware",
      feedback: {
        perfect:
          "Correct classification and response. The clipboard harvesting, keystroke capture, obfuscated exfiltration code, and dynamic eval() are hallmarks of browser-based spyware. Force removal via MDM with credential rotation is the appropriate incident response.",
        partial:
          "You identified the threat but chose an insufficient remediation. Active spyware requires immediate forced removal, not user advisories or permission restrictions. Compromised credentials must also be rotated.",
        wrong:
          "This extension is actively stealing data. The clipboard harvesting, keystroke capture, and obfuscated exfiltration to an external server clearly indicate malicious intent. Monitoring or ignoring this threat leaves the organization exposed to ongoing data theft.",
      },
    },
    {
      type: "triage-remediate",
      id: "ext-002",
      title: "Popular Ad Blocker with Reasonable Permissions",
      description:
        "During a routine quarterly extension audit, the security team flagged 'CleanBlock Ad Blocker' because it has access to read and change data on all websites. This permission is common for ad blockers but triggered the audit checklist. Review the extension and determine if action is needed.",
      evidence: [
        {
          type: "Permissions",
          content:
            "Requested permissions: 'Read and change all your data on all websites' (required for ad blocking functionality — filter lists must be applied to page DOM on every site), 'storage' (for user preferences and custom filter lists), 'webRequest' and 'webRequestBlocking' (for network-level ad blocking). These permissions are standard and expected for ad-blocking extensions.",
          icon: "shield",
        },
        {
          type: "Network Traffic",
          content:
            "Outbound connections limited to: (1) filter list update checks to filters.cleanblock.org every 24 hours via HTTPS GET, and (2) optional anonymous crash reporting to sentry.io. No user browsing data, form content, or personal information observed in any network traffic over a 7-day monitoring period.",
          icon: "network",
        },
        {
          type: "Store Listing",
          content:
            "Chrome Web Store: 5.2 million users | Rating: 4.8 stars (48,000 reviews) | Developer: CleanBlock Foundation (registered non-profit, verified publisher) | Open-source: GitHub repository with 12,000 stars, active contributor community, regular third-party audits. Published privacy policy with specific data handling commitments.",
          icon: "store",
        },
        {
          type: "Code Analysis",
          content:
            "Source code matches the public GitHub repository (hash verified). No obfuscation. Content scripts inject CSS-based element hiding rules and cancel network requests matching filter list patterns. No clipboard access, no form field monitoring, no data collection beyond anonymous crash reports. Code reviewed by Mozilla and included in Firefox recommended extensions.",
          icon: "code",
        },
      ],
      classifications: [
        {
          id: "class-benign",
          label: "Benign — Legitimate Tool with Appropriate Permissions",
          description:
            "The extension's permissions are justified by its ad-blocking functionality, and no malicious or excessive behavior was observed.",
        },
        {
          id: "class-pua",
          label: "Potentially Unwanted — Excessive Permissions",
          description:
            "The all-sites permission is overly broad and represents an unnecessary risk regardless of the extension's stated purpose.",
        },
        {
          id: "class-malicious",
          label: "Malicious — Hidden Data Collection",
          description:
            "The all-sites access is being used to secretly collect user data despite the clean appearance.",
        },
        {
          id: "class-risky",
          label: "Risky — Single Point of Compromise",
          description:
            "The wide permissions make this a high-value target if the developer account is compromised.",
        },
      ],
      correctClassificationId: "class-benign",
      remediations: [
        {
          id: "rem-approve",
          label: "Approve and Add to Organizational Allowlist",
          description:
            "Add CleanBlock to the organization's approved extension list. Document the permissions justification for future audits and schedule the next review in the standard quarterly cycle.",
        },
        {
          id: "rem-remove-all",
          label: "Force-Remove from All Endpoints",
          description:
            "Remove the extension organization-wide because all-sites access represents too great a risk.",
        },
        {
          id: "rem-restrict-sites",
          label: "Restrict to Internal Sites Only",
          description:
            "Limit the extension's access to only internal corporate domains to reduce risk.",
        },
        {
          id: "rem-block-pending",
          label: "Block Until Full Penetration Test Completed",
          description:
            "Prevent installation until a dedicated security team performs a comprehensive penetration test on the extension.",
        },
      ],
      correctRemediationId: "rem-approve",
      rationales: [
        {
          id: "rat-justified",
          text: "Ad blockers fundamentally require all-sites access to function. The permissions are justified by the core functionality, the code is open-source and audited, network traffic shows no data exfiltration, and the developer is a verified non-profit with a strong track record. Approving with documentation for future audits is the proportional response.",
        },
        {
          id: "rat-over-restrict",
          text: "Restricting an ad blocker to internal sites only defeats its purpose entirely. Ad blockers need broad access to block ads, trackers, and malicious scripts across the web. Restricting site access would leave employees unprotected on external sites.",
        },
        {
          id: "rat-blanket-remove",
          text: "Removing a verified, open-source, widely-used ad blocker because of a necessary permission creates security friction and may push users toward less trustworthy alternatives or browser configurations without ad blocking protection.",
        },
      ],
      correctRationaleId: "rat-justified",
      feedback: {
        perfect:
          "Excellent judgment. Recognizing that broad permissions are justified when required by core functionality, verified by open-source code, and supported by a strong trust profile is a critical skill. Not every flagged extension is a threat — efficient triage means clearing legitimate tools quickly.",
        partial:
          "Your caution is understandable, but the evidence strongly supports this extension's legitimacy. Over-restricting verified tools wastes security resources and damages the team's credibility with end users.",
        wrong:
          "Removing or heavily restricting a verified, open-source ad blocker with 5 million users and third-party audits is disproportionate. The permissions are necessary for ad blocking, and every indicator confirms legitimate behavior. False positive recognition is a key analyst skill.",
      },
    },
    {
      type: "triage-remediate",
      id: "ext-003",
      title: "Abandoned Extension Acquired by New Developer",
      description:
        "An internal developer noticed that 'DevFormatter Pro,' a popular JSON/XML formatting extension used by the engineering team for 2 years, was recently acquired by a new developer entity. The Chrome Web Store listing was updated 5 days ago with a new publisher name. Investigate whether the acquisition introduces supply chain risk.",
      evidence: [
        {
          type: "Ownership Change",
          content:
            "Original developer: 'Marcus Webb' (individual developer, active on GitHub for 8 years, well-known in the developer tools community). New publisher: 'FastDev Solutions LLC' — registered 3 weeks ago in Delaware with no web presence, no GitHub profile, no prior extensions. Acquisition terms and price were not disclosed publicly.",
          icon: "alert",
        },
        {
          type: "Update Diff",
          content:
            "Latest update (v3.8.0) adds a new permission: 'Read your browsing history' (not present in any prior version). The changelog states 'performance improvements and bug fixes' with no mention of the new permission. A new background service worker was added that was not present in the previous version. The service worker code is minified and not published to the original GitHub repository.",
          icon: "code",
        },
        {
          type: "Network Traffic (Post-Update)",
          content:
            "New outbound HTTPS POST requests to api.fastdev-analytics[.]com/v1/usage every 10 minutes. Payload includes: current tab URL, page title, time spent on page, and a unique device fingerprint hash. This telemetry endpoint did not exist in any prior version and is not documented in the extension's privacy policy.",
          icon: "network",
        },
        {
          type: "User Reports",
          content:
            "Chrome Web Store reviews from the past 4 days: 'Extension suddenly asks for browsing history — why?' (3 reports), 'My antivirus flagged the latest update' (1 report), 'Loading slower since the update, lots of background network activity' (2 reports). Developer has not responded to any reviews.",
          icon: "users",
        },
      ],
      classifications: [
        {
          id: "class-supply-chain",
          label: "Supply Chain Compromise — Acquired for Malicious Purposes",
          description:
            "The extension was acquired by an unknown entity that added undisclosed telemetry, new permissions, and opaque code in the first update after acquisition. This matches the pattern of a supply chain attack via extension acquisition.",
        },
        {
          id: "class-normal-acquisition",
          label: "Normal Business Acquisition",
          description:
            "Extension acquisitions are common, and the new developer is simply adding analytics to understand their user base.",
        },
        {
          id: "class-pua",
          label: "Potentially Unwanted — Aggressive Monetization",
          description:
            "The new developer is monetizing the user base through data collection but may not have malicious intent.",
        },
        {
          id: "class-benign",
          label: "Benign — Routine Update",
          description:
            "The browsing history permission and analytics are part of normal feature development after an ownership change.",
        },
      ],
      correctClassificationId: "class-supply-chain",
      remediations: [
        {
          id: "rem-rollback-block",
          label: "Pin to Previous Version and Block Updates",
          description:
            "Use enterprise browser policy to pin the extension to the last trusted version (v3.7.x) and block automatic updates. Initiate a search for an alternative formatting tool. Report the extension to Google's Chrome Web Store abuse team.",
        },
        {
          id: "rem-allow-monitor",
          label: "Allow Update and Monitor for 30 Days",
          description:
            "Let the new version run while monitoring network traffic. If no credentials are stolen within 30 days, consider it safe.",
        },
        {
          id: "rem-contact-dev",
          label: "Contact New Developer for Clarification",
          description:
            "Reach out to FastDev Solutions LLC to ask about their data collection practices before making a decision.",
        },
        {
          id: "rem-remove-all",
          label: "Force-Remove Immediately",
          description:
            "Remove the extension from all endpoints immediately without providing an alternative tool.",
        },
      ],
      correctRemediationId: "rem-rollback-block",
      rationales: [
        {
          id: "rat-supply-chain-pattern",
          text: "This follows the well-documented pattern of extension supply chain attacks: acquire a trusted extension with a large user base, add data collection in the first post-acquisition update, and exploit the automatic update mechanism to push malicious code to existing users. The undisclosed permission addition, opaque code, newly registered entity, and undocumented telemetry are all red flags. Pinning to the last trusted version protects users while a replacement is found.",
        },
        {
          id: "rat-monitor-risk",
          text: "Allowing the compromised version to run for 30 days gives the new developer continued access to browsing data, page content, and potentially credentials. Supply chain attacks often start with telemetry collection before escalating to more aggressive data theft in subsequent updates.",
        },
        {
          id: "rat-force-remove-disruption",
          text: "Immediate forced removal without an alternative disrupts developer workflows unnecessarily. Pinning to the last trusted version (v3.7.x) maintains functionality while eliminating the supply chain risk from the compromised update.",
        },
      ],
      correctRationaleId: "rat-supply-chain-pattern",
      feedback: {
        perfect:
          "Excellent supply chain awareness. You correctly identified the acquisition-based attack pattern and chose the optimal remediation that protects users while maintaining developer productivity. Pinning to the trusted version buys time to find a replacement without disrupting workflows.",
        partial:
          "You recognized the risk but chose a suboptimal response. Monitoring an actively compromised extension or contacting a likely malicious entity delays protection. Pinning to the last trusted version is the balanced approach.",
        wrong:
          "The combination of a newly registered shell company, undisclosed permissions, opaque code, undocumented telemetry, and user complaints after an acquisition is a textbook supply chain attack pattern. This extension cannot be trusted in its current form.",
      },
    },
  ],

  hints: [
    "Compare the permissions an extension requests to the minimum permissions its stated functionality actually requires. A screenshot tool should not need clipboard read access on all websites.",
    "Ownership changes are the highest-risk event in an extension's lifecycle. When a trusted extension is acquired by an unknown entity, treat the first post-acquisition update with heightened scrutiny.",
    "Not every extension with broad permissions is malicious. Open-source code, verified publishers, and third-party audits are strong trust signals that can justify wide permissions.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Browser extension supply chain attacks have become a top enterprise threat vector. In 2023-2025, multiple high-profile incidents involved attackers purchasing popular extensions to push malicious updates to millions of users. Security teams that audit extensions proactively catch these threats before they cause data breaches.",
  toolRelevance: [
    "CRXcavator / Spin.AI (extension risk scoring)",
    "Chrome Enterprise Browser Cloud Management",
    "Extension Source Viewer (code inspection)",
    "VirusTotal (extension hash analysis)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
