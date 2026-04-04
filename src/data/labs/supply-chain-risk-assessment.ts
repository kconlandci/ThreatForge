import type { LabManifest } from "../../types/manifest";

export const supplyChainRiskAssessmentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "supply-chain-risk-assessment",
  version: 1,
  title: "Supply Chain Risk Assessment",

  tier: "advanced",
  track: "vulnerability-hardening",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "supply-chain",
    "vendor-risk",
    "third-party",
    "npm",
    "open-source",
    "compliance",
    "risk-assessment",
  ],

  description:
    "Evaluate third-party software and vendor risks across real-world supply chain scenarios. Classify vulnerabilities in dependencies, assess vendor compliance gaps, detect supply chain attacks, and balance security risk against business needs.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Evaluate third-party software and vendor risks using a structured framework",
    "Recognize supply chain attack patterns in open-source ecosystems",
    "Apply proportional risk responses to vendor compliance gaps",
    "Balance security risk against business productivity needs",
    "Determine appropriate vendor breach response actions",
  ],
  sortOrder: 310,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "sc-001",
      title: "Log4Shell in Production — Incompatible Patch",
      description:
        "Your web application uses a library with a critical vulnerability. The vendor's patch breaks compatibility with your framework.",
      evidence: [
        {
          type: "Vulnerability Detail",
          content:
            "log4j-core 2.14.1 — CVE-2021-44228 (Log4Shell). CVSS 10.0. Remote Code Execution via JNDI lookup in log messages. Active exploitation worldwide.",
        },
        {
          type: "Application Context",
          content:
            "Production e-commerce platform processing 8K orders/day. Log4j embedded in 3 microservices. Framework constraint: Spring Boot 2.4 incompatible with log4j 2.17+.",
        },
        {
          type: "Vendor Timeline",
          content:
            "Spring Boot 2.4 EOL. Spring Boot 2.7 LTS compatible with log4j 2.17. Migration estimated 3-4 weeks by engineering. Vendor offers no backport.",
        },
        {
          type: "Mitigation Available",
          content:
            "Apache recommends: set log4j2.formatMsgNoLookups=true OR remove JndiLookup class from classpath. Both confirmed effective by CISA.",
        },
      ],
      classifications: [
        { id: "critical", label: "Critical", description: "Actively exploited vulnerability with maximum severity requiring immediate action." },
        { id: "high", label: "High", description: "Serious vulnerability requiring urgent remediation within days." },
        { id: "medium", label: "Medium", description: "Moderate vulnerability that can be addressed in the next patch cycle." },
        { id: "low", label: "Low", description: "Minor risk that can be tracked and addressed opportunistically." },
      ],
      correctClassificationId: "critical",
      remediations: [
        {
          id: "mitigate-upgrade",
          label: "Apply JNDI lookup mitigation immediately + begin framework upgrade",
          description: "Deploy CISA-validated mitigation now while planning the permanent Spring Boot upgrade.",
        },
        {
          id: "wait-patch",
          label: "Wait for vendor patch (3-4 weeks)",
          description: "Hold off until the Spring Boot migration is complete to apply the full fix.",
        },
        {
          id: "shutdown",
          label: "Shut down affected services until patched",
          description: "Take the e-commerce platform offline to eliminate exposure.",
        },
        {
          id: "waf-monitor",
          label: "Accept risk with enhanced WAF monitoring",
          description: "Add WAF rules to detect JNDI payloads and monitor for exploitation attempts.",
        },
      ],
      correctRemediationId: "mitigate-upgrade",
      rationales: [
        {
          id: "rat-mitigate",
          text: "Active exploitation worldwide means you can't wait — the JNDI mitigation is CISA-validated and buys time while the permanent framework upgrade is developed.",
        },
        {
          id: "rat-wait",
          text: "Waiting 3-4 weeks with a CVSS 10 actively exploited vulnerability is unacceptable.",
        },
        {
          id: "rat-shutdown",
          text: "Shutting down an 8K orders/day platform is disproportionate when an effective mitigation exists.",
        },
        {
          id: "rat-waf",
          text: "WAF monitoring alone doesn't prevent exploitation of this vulnerability.",
        },
      ],
      correctRationaleId: "rat-mitigate",
      feedback: {
        perfect:
          "Excellent. You correctly classified this as critical and chose the layered response: immediate CISA-validated mitigation to stop exploitation now, plus the framework upgrade for a permanent fix. This is textbook vulnerability management under constraints.",
        partial:
          "You identified the severity but chose a response that either goes too far or doesn't go far enough. An effective, validated mitigation exists — use it immediately while planning the permanent upgrade.",
        wrong:
          "This is a CVSS 10 with active worldwide exploitation. Waiting, accepting risk, or shutting down production are all inferior to applying the CISA-validated JNDI mitigation immediately while planning the framework upgrade.",
      },
    },
    {
      type: "triage-remediate",
      id: "sc-002",
      title: "CRM Vendor Compliance Gap Analysis",
      description:
        "Routine vendor review of your company's CRM provider reveals compliance gaps despite their SOC 2 certification.",
      evidence: [
        {
          type: "Certification",
          content:
            "CRM vendor holds SOC 2 Type II certification (audited November 2025). Clean opinion with no exceptions.",
        },
        {
          type: "Data Residency",
          content:
            "Customer data stored in Singapore data center. Your company operates under EU GDPR. Singapore does not have an EU adequacy decision.",
        },
        {
          type: "Retention Policy",
          content:
            "Vendor's data retention: 90 days after account deletion. Your company policy and GDPR require: maximum 30 days.",
        },
        {
          type: "Subprocessor List",
          content:
            "Last updated: September 2024 (18 months ago). GDPR Article 28 requires notification of subprocessor changes.",
        },
      ],
      classifications: [
        { id: "critical", label: "Critical", description: "Immediate regulatory or security threat requiring urgent action." },
        { id: "high", label: "High", description: "Significant compliance gap creating material regulatory exposure." },
        { id: "medium", label: "Medium", description: "Moderate gap that should be addressed in the next review cycle." },
        { id: "low", label: "Low", description: "Minor issue with minimal regulatory impact." },
      ],
      correctClassificationId: "high",
      remediations: [
        {
          id: "risk-accept-amend",
          label: "Issue risk acceptance with compensating controls + escalate data issues for contractual amendment",
          description: "Document the gaps, implement compensating controls, and negotiate contractual amendments to address GDPR requirements.",
        },
        {
          id: "switch-vendor",
          label: "Switch vendors immediately",
          description: "Begin migration to a GDPR-compliant CRM provider.",
        },
        {
          id: "accept-soc2",
          label: "Accept — SOC 2 covers everything",
          description: "Rely on the existing SOC 2 certification as sufficient compliance coverage.",
        },
        {
          id: "suspend-crm",
          label: "Suspend use of the CRM until resolved",
          description: "Stop using the CRM until all compliance gaps are addressed.",
        },
      ],
      correctRemediationId: "risk-accept-amend",
      rationales: [
        {
          id: "rat-amend",
          text: "SOC 2 doesn't cover data residency or GDPR-specific requirements — these gaps create regulatory exposure that must be addressed contractually while continuing to use the service.",
        },
        {
          id: "rat-switch",
          text: "Switching vendors for contractual gaps is disproportionate when amendment is possible.",
        },
        {
          id: "rat-soc2",
          text: "SOC 2 is scope-limited and doesn't guarantee GDPR compliance.",
        },
        {
          id: "rat-suspend",
          text: "Suspending a CRM disrupts sales operations without proportional risk reduction.",
        },
      ],
      correctRationaleId: "rat-amend",
      feedback: {
        perfect:
          "Strong analysis. You recognized that SOC 2 doesn't cover GDPR-specific requirements like data residency and retention limits. Contractual amendment is the proportional response — it addresses the regulatory gaps without disrupting business operations.",
        partial:
          "You identified some of the issues but chose a response that's either too aggressive or too passive. SOC 2 is valuable but scope-limited — GDPR gaps need contractual remediation, not vendor replacement or blind acceptance.",
        wrong:
          "SOC 2 Type II is a controls audit, not a GDPR compliance certificate. Data residency in a non-adequate country and excessive retention periods create real regulatory exposure that must be addressed through contractual amendment.",
      },
    },
    {
      type: "triage-remediate",
      id: "sc-003",
      title: "NPM Package Ownership Transfer — Supply Chain Risk",
      description:
        "A widely-used npm package your application depends on just changed ownership under suspicious circumstances.",
      evidence: [
        {
          type: "Package Info",
          content:
            "Package: fastjson-utils (52M weekly downloads). Ownership transferred to user 'json_dev_2026' on March 20. Previous maintainer account shows no activity since transfer.",
        },
        {
          type: "New Maintainer",
          content:
            "GitHub account 'json_dev_2026' created March 8. Zero repositories. Zero followers. No linked social profiles or website.",
        },
        {
          type: "Latest Release",
          content:
            "v3.2.1 published March 21. Changelog: 'Performance improvements.' Diff shows: new postinstall script that downloads and executes a binary from cdn-pkg-mirror.com.",
        },
        {
          type: "Threat Intelligence",
          content:
            "cdn-pkg-mirror.com registered March 19 via Namecheap with privacy proxy. No historical DNS records. Domain not in any threat feeds yet.",
        },
      ],
      classifications: [
        { id: "critical", label: "Critical", description: "Active supply chain attack requiring immediate containment." },
        { id: "high", label: "High", description: "High-risk indicator requiring urgent investigation and response." },
        { id: "medium", label: "Medium", description: "Suspicious activity warranting monitoring and further analysis." },
        { id: "low", label: "Low", description: "Low-risk change that can be reviewed in normal cadence." },
      ],
      correctClassificationId: "critical",
      remediations: [
        {
          id: "pin-audit",
          label: "Pin to v3.2.0 immediately, audit new release, alert dev team, monitor threat feeds",
          description: "Lock to the last known-good version, perform a security audit of the new release, and coordinate with the development team.",
        },
        {
          id: "update-perf",
          label: "Update to v3.2.1 for the performance improvements",
          description: "Accept the new version to benefit from the advertised performance gains.",
        },
        {
          id: "remove-dep",
          label: "Remove the dependency entirely",
          description: "Eliminate the package from your application and find alternatives.",
        },
        {
          id: "report-wait",
          label: "Report to npm and wait for their response",
          description: "File a report with npm security team and await their investigation.",
        },
      ],
      correctRemediationId: "pin-audit",
      rationales: [
        {
          id: "rat-pin",
          text: "New maintainer + postinstall downloading external binary matches the pattern of npm supply chain attacks — pin to the last known-good version and audit before any update.",
        },
        {
          id: "rat-update",
          text: "Updating to a potentially compromised version puts your entire build pipeline at risk.",
        },
        {
          id: "rat-remove",
          text: "Removing a dependency with 52M downloads is impractical without a replacement.",
        },
        {
          id: "rat-report",
          text: "Waiting for npm's response while your CI/CD runs the malicious postinstall is dangerous.",
        },
      ],
      correctRationaleId: "rat-pin",
      feedback: {
        perfect:
          "Textbook supply chain defense. You recognized the classic attack pattern — new account, ownership transfer, postinstall script downloading from a fresh domain — and chose the correct response: pin to the last safe version and audit before proceeding.",
        partial:
          "You detected the risk but chose an incomplete response. Pinning to the last known-good version is the critical first step — it stops the bleeding while you investigate. Reporting alone or removing the dependency entirely aren't practical immediate actions.",
        wrong:
          "This has every hallmark of a supply chain attack: brand-new maintainer account, silent ownership transfer, postinstall script fetching binaries from a days-old domain. Never update to a suspicious version — pin to v3.2.0 and investigate.",
      },
    },
    {
      type: "triage-remediate",
      id: "sc-004",
      title: "Cloud Backup Provider — Metadata Breach",
      description:
        "Your cloud backup provider sends a breach notification about unauthorized access to customer metadata.",
      evidence: [
        {
          type: "Breach Notification",
          content:
            "Unauthorized access to metadata systems between March 5-9. Accessed: account names, admin email addresses, backup job configurations (schedule, retention, target paths). Backup data itself was not accessed.",
        },
        {
          type: "Your Exposure",
          content:
            "Acme Corp account: 3 admin emails exposed, 47 backup job configs including database names and file paths visible in job metadata.",
        },
        {
          type: "Vendor Response",
          content:
            "Forensics firm engaged (Kroll). Root cause: compromised support engineer credentials. MFA was not enabled on internal support tools. Vendor commits to full report in 45 days.",
        },
        {
          type: "API Security",
          content:
            "Your backup API keys were stored in the vendor's config management system. Vendor states 'API keys are encrypted at rest' but cannot confirm if the encryption key was also compromised.",
        },
      ],
      classifications: [
        { id: "critical", label: "Critical", description: "Confirmed data breach requiring immediate incident response activation." },
        { id: "high", label: "High", description: "Significant breach of sensitive metadata requiring urgent protective action." },
        { id: "medium", label: "Medium", description: "Limited metadata exposure with moderate follow-up required." },
        { id: "low", label: "Low", description: "Minor exposure with no immediate action needed." },
      ],
      correctClassificationId: "high",
      remediations: [
        {
          id: "reset-review",
          label: "Reset API keys, review configs for sensitive info, assess notification requirements, request forensics timeline",
          description: "Take immediate protective action on exposed credentials while assessing regulatory and contractual obligations.",
        },
        {
          id: "wait-report",
          label: "Wait for vendor's 45-day report",
          description: "Allow the forensics investigation to complete before taking action.",
        },
        {
          id: "accept-encryption",
          label: "Accept vendor's assurance that data was encrypted",
          description: "Trust the vendor's statement that API keys were encrypted at rest.",
        },
        {
          id: "cancel-service",
          label: "Cancel the backup service",
          description: "Terminate the relationship with the backup provider.",
        },
      ],
      correctRemediationId: "reset-review",
      rationales: [
        {
          id: "rat-reset",
          text: "Metadata includes enough for targeted attacks — API keys may be compromised regardless of encryption claims, and you can't wait 45 days to take protective action.",
        },
        {
          id: "rat-wait",
          text: "Waiting for the vendor's timeline puts your data at risk for 6+ weeks.",
        },
        {
          id: "rat-accept",
          text: "Accepting encryption assurances without verification is insufficient due diligence.",
        },
        {
          id: "rat-cancel",
          text: "Canceling backup service creates more risk than the breach itself.",
        },
      ],
      correctRationaleId: "rat-reset",
      feedback: {
        perfect:
          "Well reasoned. You recognized that metadata exposure is more dangerous than it sounds — database names, file paths, and potentially compromised API keys give attackers a roadmap. Rotating keys and reviewing exposure immediately is the right call, regardless of the vendor's timeline.",
        partial:
          "You identified some risk but chose a response that's either too passive or too aggressive. API keys should be rotated immediately regardless of encryption claims, and the vendor's 45-day timeline shouldn't govern your response.",
        wrong:
          "Metadata is reconnaissance gold for attackers. Database names, file paths, admin emails, and potentially compromised API keys require immediate protective action. Don't wait for the vendor and don't trust unverifiable encryption claims.",
      },
    },
    {
      type: "triage-remediate",
      id: "sc-005",
      title: "New CI/CD Tool Adoption — Security vs. Productivity",
      description:
        "Engineering wants to adopt a new CI/CD tool that could significantly improve development velocity. Evaluate the risk.",
      evidence: [
        {
          type: "Tool Assessment",
          content:
            "BuildStream Pro — 2-year-old startup, YC batch W24. No SOC 2 or ISO 27001 certification. 580 GitHub stars, strong community engagement, no independent security audit.",
        },
        {
          type: "Integration Requirements",
          content:
            "Requires: admin API token for GitHub org, read/write to all repositories, deployment credentials for production Kubernetes cluster, webhook access.",
        },
        {
          type: "Productivity Impact",
          content:
            "Engineering estimates 20 hours/week saved across the team. Current CI/CD pipeline has reliability issues causing 4-hour developer wait times.",
        },
        {
          type: "Alternative",
          content:
            "Existing tool (Jenkins) is stable but aging. Migration to GitHub Actions estimated at 6 weeks but doesn't require third-party trust.",
        },
        {
          type: "Vendor Security",
          content:
            "Vendor completed a self-assessment questionnaire. Notable gaps: no penetration testing, no bug bounty, data processing agreement doesn't meet GDPR requirements.",
        },
      ],
      classifications: [
        { id: "critical", label: "Critical", description: "Unacceptable risk — tool must be rejected outright." },
        { id: "high", label: "High", description: "Major risk requiring significant controls before adoption." },
        { id: "med-high", label: "Medium-High", description: "Notable risk that can be managed with proper controls and evaluation." },
        { id: "low", label: "Low", description: "Minimal risk — proceed with standard onboarding." },
      ],
      correctClassificationId: "med-high",
      remediations: [
        {
          id: "review-trial",
          label: "Proceed with security review + least-privilege tokens + 6-month trial",
          description: "Conduct an independent security review, scope permissions to minimum required, and evaluate with a time-boxed trial period.",
        },
        {
          id: "adopt-now",
          label: "Adopt immediately — productivity gains justify the risk",
          description: "Fast-track adoption to realize the 20 hours/week productivity improvement.",
        },
        {
          id: "reject-actions",
          label: "Reject and migrate to GitHub Actions instead",
          description: "Decline the tool and invest in the 6-week GitHub Actions migration.",
        },
        {
          id: "require-soc2",
          label: "Request SOC 2 certification before proceeding",
          description: "Make adoption contingent on the vendor achieving SOC 2 compliance.",
        },
      ],
      correctRemediationId: "review-trial",
      rationales: [
        {
          id: "rat-review",
          text: "Productivity benefits are real but the tool requires high-privilege access to critical infrastructure — proceed cautiously with independent security review, least-privilege tokens, and a time-boxed evaluation.",
        },
        {
          id: "rat-adopt",
          text: "Adopting without security review puts source code and production at risk.",
        },
        {
          id: "rat-reject",
          text: "Rejecting outright ignores the legitimate productivity problem and the potential value.",
        },
        {
          id: "rat-soc2",
          text: "Requiring SOC 2 before evaluation eliminates most startup tools and may not be practical.",
        },
      ],
      correctRationaleId: "rat-review",
      feedback: {
        perfect:
          "Balanced assessment. You recognized that the productivity gains are legitimate but the high-privilege access requirements demand scrutiny. A security review with least-privilege tokens and a time-boxed trial is the right approach — it doesn't block innovation but ensures informed risk acceptance.",
        partial:
          "You identified some of the tradeoffs but chose an extreme position. Neither immediate adoption nor outright rejection serves the organization well. A controlled evaluation with security guardrails is the proportional response.",
        wrong:
          "This tool needs admin access to your GitHub org and production Kubernetes cluster. That's too much trust for a startup with no security audit. But rejecting without evaluation ignores real productivity problems. A controlled trial with security review is the answer.",
      },
    },
  ],

  hints: [
    "Supply chain attacks target the trust relationship between your organization and its dependencies. A compromised dependency runs with your application's full permissions.",
    "SOC 2 certification is valuable but scope-limited — it doesn't cover every security concern, especially data residency and regulatory compliance.",
    "When evaluating new tools, the security review should be proportional to the access level required. A tool that needs admin API tokens to your source code repository deserves more scrutiny than a standalone utility.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Supply chain risk assessment is one of the fastest-growing areas in cybersecurity. Organizations increasingly recognize that their security posture is only as strong as their weakest vendor. Third-party risk analysts who can quantify and communicate vendor risk are essential to enterprise security programs.",
  toolRelevance: [
    "Snyk / Socket.dev (Dependency scanning)",
    "BitSight / SecurityScorecard (Vendor risk)",
    "NIST SP 800-161 (Supply chain framework)",
    "npm audit / GitHub Dependabot",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
