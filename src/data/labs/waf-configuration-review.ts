import type { LabManifest } from "../../types/manifest";

export const wafConfigurationReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "waf-configuration-review",
  version: 1,
  title: "WAF Configuration Review",

  tier: "beginner",
  track: "network-defense",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["waf", "web-application-firewall", "ddos", "rate-limiting", "owasp", "cloudflare"],

  description:
    "Review and configure a Web Application Firewall to protect against OWASP Top 10 attacks, bot abuse, and DDoS — while avoiding rule misconfigurations that cause false positives and block legitimate traffic.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Configure WAF rules to block common web application attacks without excessive false positives",
    "Enable appropriate bot management and rate limiting controls",
    "Understand WAF deployment modes and logging requirements for effective incident response",
  ],
  sortOrder: 620,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "waf-001",
      title: "Core WAF Rule Configuration",
      description:
        "Configure the WAF rule set for a production e-commerce application. Balance security coverage against false positive risk.",
      targetSystem: "cloudflare-waf — prod-ecommerce.company.com",
      items: [
        {
          id: "owasp-ruleset",
          label: "OWASP Core Rule Set",
          detail: "Managed rule set covering SQLi, XSS, path traversal, and other OWASP Top 10 attacks.",
          currentState: "disabled",
          correctState: "block-mode",
          states: ["disabled", "detect-only", "block-mode"],
          rationaleId: "rat-owasp",
        },
        {
          id: "waf-mode",
          label: "WAF Enforcement Mode",
          detail: "Controls whether the WAF blocks matching requests or only logs them.",
          currentState: "monitor-only",
          correctState: "block",
          states: ["monitor-only", "block"],
          rationaleId: "rat-mode",
        },
        {
          id: "ip-reputation",
          label: "IP Reputation Blocking",
          detail: "Blocks requests from known malicious IPs, Tor exit nodes, and datacenter ranges.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-ip-rep",
        },
        {
          id: "geo-blocking",
          label: "Geographic Restrictions",
          detail: "Block traffic from countries where the business has no customers.",
          currentState: "all-countries-allowed",
          correctState: "business-countries-only",
          states: ["all-countries-allowed", "business-countries-only"],
          rationaleId: "rat-geo",
        },
      ],
      rationales: [
        { id: "rat-owasp", text: "WAF with OWASP CRS in monitor-only mode provides zero protection — it only generates alerts. Block mode is required for the WAF to serve its protective purpose. Start with detect mode during tuning, then move to block." },
        { id: "rat-mode", text: "Monitor-only WAF is like a smoke detector that makes notes but doesn't trigger sprinklers. After initial tuning to reduce false positives, block mode must be enabled to provide actual protection." },
        { id: "rat-ip-rep", text: "IP reputation feeds block the majority of scanning and attack traffic before it even reaches WAF rule evaluation. It's high-value, low-false-positive protection that should always be enabled." },
        { id: "rat-geo", text: "If the business only operates in certain countries, blocking other countries reduces attack surface significantly. However, always verify VPN/CDN IPs before blocking to avoid blocking legitimate users." },
      ],
      feedback: {
        perfect: "WAF fully operational: OWASP CRS in block mode, enforcement enabled, IP reputation active, and geographic restrictions configured.",
        partial: "WAF is in monitor-only mode or OWASP rules are disabled. A WAF that doesn't block provides no protection.",
        wrong: "A disabled or monitor-only WAF provides zero protection against web attacks. Enable block mode after initial tuning.",
      },
    },
    {
      type: "toggle-config",
      id: "waf-002",
      title: "Bot Management and Rate Limiting",
      description:
        "Configure bot management controls and rate limiting to protect against scraping, credential stuffing, and DDoS attacks.",
      targetSystem: "WAF Bot Management — prod-ecommerce.company.com",
      items: [
        {
          id: "bot-detection",
          label: "Bot Detection Mode",
          detail: "Controls how the WAF identifies and handles automated bot traffic.",
          currentState: "disabled",
          correctState: "challenge-suspicious",
          states: ["disabled", "block-all-bots", "challenge-suspicious"],
          rationaleId: "rat-bot",
        },
        {
          id: "rate-limit-login",
          label: "Login Endpoint Rate Limit",
          detail: "Maximum authentication requests per IP per minute.",
          currentState: "unlimited",
          correctState: "10-per-min",
          states: ["unlimited", "100-per-min", "10-per-min"],
          rationaleId: "rat-login-rate",
        },
        {
          id: "ddos-protection",
          label: "Layer 7 DDoS Protection",
          detail: "Controls whether HTTP flood protection is enabled.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-ddos",
        },
        {
          id: "user-agent-blocking",
          label: "Malicious User-Agent Blocking",
          detail: "Blocks requests from known scanning tools (sqlmap, nikto, masscan).",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-ua",
        },
      ],
      rationales: [
        { id: "rat-bot", text: "Block-all-bots breaks legitimate bots (search crawlers, monitoring). Challenge-suspicious mode uses browser fingerprinting and behavioral analysis to challenge likely bots while allowing legitimate traffic." },
        { id: "rat-login-rate", text: "Login endpoints without rate limits are vulnerable to credential stuffing. 10 requests/minute per IP is generous for legitimate users but blocks automated tools that attempt thousands of credentials per minute." },
        { id: "rat-ddos", text: "HTTP flood protection detects and mitigates Layer 7 DDoS attacks that bypass volumetric defenses. It analyzes request patterns to distinguish floods from legitimate traffic spikes." },
        { id: "rat-ua", text: "Known scanner user agents (sqlmap, nikto) are never legitimate production traffic. Blocking them stops automated reconnaissance before any rules even need to evaluate the request." },
      ],
      feedback: {
        perfect: "Bot management and rate limiting configured: challenge mode for suspicious bots, login rate limiting, DDoS protection, and scanner UA blocking.",
        partial: "Login rate limiting or DDoS protection gaps remain. Unlimited login attempts enable credential stuffing at scale.",
        wrong: "No bot management or rate limiting on login endpoints enables unrestricted automated attack traffic. These controls are fundamental to web application protection.",
      },
    },
    {
      type: "toggle-config",
      id: "waf-003",
      title: "WAF Logging and Alerting Configuration",
      description:
        "Configure WAF logging and alerting to ensure security events are captured, forwarded, and acted upon.",
      targetSystem: "WAF Logging — SIEM Integration",
      items: [
        {
          id: "request-logging",
          label: "Full Request Logging",
          detail: "Controls whether WAF logs full request details (headers, body) for blocked requests.",
          currentState: "disabled",
          correctState: "enabled-blocked-only",
          states: ["disabled", "enabled-all-requests", "enabled-blocked-only"],
          rationaleId: "rat-logging",
        },
        {
          id: "siem-forwarding",
          label: "SIEM Log Forwarding",
          detail: "Controls whether WAF logs are forwarded to the central SIEM.",
          currentState: "disabled",
          correctState: "real-time",
          states: ["disabled", "batch-daily", "real-time"],
          rationaleId: "rat-siem",
        },
        {
          id: "false-positive-review",
          label: "Weekly False Positive Review",
          detail: "Controls whether a weekly review of blocked legitimate traffic is scheduled.",
          currentState: "no-process",
          correctState: "scheduled-review",
          states: ["no-process", "scheduled-review"],
          rationaleId: "rat-fp-review",
        },
        {
          id: "attack-alerting",
          label: "Attack Campaign Alerting",
          detail: "Threshold-based alerts when block rates exceed baseline (indicating active attack).",
          currentState: "disabled",
          correctState: "enabled-threshold",
          states: ["disabled", "enabled-threshold"],
          rationaleId: "rat-alerting",
        },
      ],
      rationales: [
        { id: "rat-logging", text: "Logging all requests creates excessive storage costs. Logging blocked requests captures the attack context needed for investigation without the volume overhead of logging all legitimate traffic." },
        { id: "rat-siem", text: "Batch daily log forwarding means active attacks aren't visible in the SIEM for up to 24 hours. Real-time forwarding enables detection of ongoing attack campaigns while they're still in progress." },
        { id: "rat-fp-review", text: "WAF rules drift over time as applications change. Regular false positive review prevents legitimate functionality from being silently blocked and maintains rule relevance." },
        { id: "rat-alerting", text: "A spike in block rate indicates an active attack campaign. Threshold-based alerting triggers human investigation rather than silently absorbing attacks." },
      ],
      feedback: {
        perfect: "WAF logging operational: blocked request logging, real-time SIEM forwarding, false positive review process, and attack alerting configured.",
        partial: "Batch log forwarding or missing alerting means active attacks may not be detected for hours. Real-time SIEM integration is important for timely response.",
        wrong: "A WAF without logging or SIEM forwarding is a black box. Security teams can't investigate incidents, tune rules, or detect ongoing attacks without visibility into WAF activity.",
      },
    },
  ],

  hints: [
    "Start WAF rules in detect/monitor mode to baseline false positives, then move to block mode — skipping this step causes legitimate traffic disruption.",
    "Always log blocked requests with full request details — you need them for attack investigation and false positive tuning.",
    "Challenge-suspicious bot mode (CAPTCHA for uncertain traffic) is more effective than blocking all bots, which breaks search engines and monitoring tools.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "WAF configuration and tuning is a core skill for web application security engineers and security operations teams. Understanding how to balance protection with false positive avoidance is essential for maintaining both security and business continuity.",
  toolRelevance: [
    "Cloudflare WAF",
    "AWS WAF",
    "ModSecurity (OWASP CRS)",
    "Fastly Next-Gen WAF",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
