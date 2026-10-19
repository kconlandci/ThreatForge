import type { LabManifest } from "../../types/manifest";

export const wafConfigurationReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "waf-configuration-review",
  version: 2,
  title: "The AI's WAF Rules Block Customers",

  tier: "beginner",
  track: "network-defense",
  difficulty: "easy",
  accessLevel: "premium",
  tags: ["waf", "web-application-firewall", "ai-oversight", "ddos", "rate-limiting", "owasp", "cloudflare"],

  description:
    "An AI assistant generated the new WAF rule set for the production store and certified it 'complete, OWASP coverage verified.' Review the staged rules before they ship: two of them block paying customers, and one OWASP class the AI claims to cover isn't enforced at all.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Review an AI-generated WAF rule set rule by rule before it ships to production",
    "Detect over-blocking rules that break legitimate customer behavior (search, crawlers, partner traffic)",
    "Verify claimed security coverage against actual rule enforcement states",
    "Recognize rate limits set from average traffic that fail on legitimate bursts",
  ],
  sortOrder: 620,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "waf-001",
      title: "The Generated Rule Set — Core Rules",
      description:
        "The AI generated a fresh core rule set for prod-ecommerce.company.com and staged it for one-click deployment, with a coverage matrix claiming 'OWASP Top 10: fully enforced.' The store sells to customers in the US, Canada, and the EU. Review each staged rule against reality and set the version that ships.",
      targetSystem: "cloudflare-waf — prod-ecommerce.company.com (AI-staged rule set)",
      items: [
        {
          id: "owasp-ruleset",
          label: "OWASP Core Rule Set — SQLi & Path Traversal Groups",
          detail: "Managed rule groups covering SQL injection and path traversal. The AI staged these in block mode.",
          currentState: "block-mode",
          correctState: "block-mode",
          states: ["disabled", "detect-only", "block-mode"],
          rationaleId: "rat-owasp",
        },
        {
          id: "xss-rule-group",
          label: "XSS Rule Group (AI coverage matrix: 'enforced')",
          detail: "The AI's coverage matrix lists cross-site scripting as fully enforced. The staged console shows the XSS rule group in detect-only mode — it would log attacks and let them through.",
          currentState: "detect-only",
          correctState: "block-mode",
          states: ["disabled", "detect-only", "block-mode"],
          rationaleId: "rat-xss",
        },
        {
          id: "geo-blocking",
          label: "Geographic Restrictions",
          detail: "The AI restricted traffic to US addresses only, citing an internal wiki page last edited four years ago ('we only ship domestically'). The business has sold into Canada and the EU for two years — roughly 22% of revenue.",
          currentState: "us-only",
          correctState: "business-countries-only",
          states: ["all-countries-allowed", "us-only", "business-countries-only"],
          rationaleId: "rat-geo",
        },
        {
          id: "search-keyword-rule",
          label: "SQL Keyword Blocking — All Parameters",
          detail: "The AI added a custom rule: block any request containing 'select', 'union', or 'drop' in any parameter. Customer support is already forwarding pre-launch test complaints: product searches like 'union jack flag' and 'select series watch' return 403 errors.",
          currentState: "block-sql-keywords-everywhere",
          correctState: "block-sql-keywords-except-search",
          states: ["block-sql-keywords-everywhere", "block-sql-keywords-except-search", "disabled"],
          rationaleId: "rat-search",
        },
      ],
      rationales: [
        { id: "rat-owasp", text: "Ship as staged. Block mode on the core SQLi and traversal groups is the WAF's reason to exist — detect-only generates alerts while attacks pass. The AI got the highest-stakes setting right." },
        { id: "rat-xss", text: "The coverage matrix said 'enforced'; the console says detect-only. A generated compliance claim is not a control — the gap between the AI's matrix and the actual rule state is exactly the failure this review exists to catch. Set the XSS group to block mode so the claimed coverage becomes real." },
        { id: "rat-geo", text: "The AI sourced the store's market from a stale wiki page instead of current business data, and its rule would have refused a fifth of revenue at the edge. Geo rules must be built from where the business actually sells — US, Canada, and EU — which still cuts the attack surface from everywhere else." },
        { id: "rat-search", text: "Keyword blocking without context can't tell an attack string from a product name — 'union' and 'select' are ordinary English and catalog vocabulary. The OWASP rule groups already evaluate injection patterns structurally; the custom keyword rule's only unique effect is breaking search. Scope it away from the search endpoint or drop it — everywhere-blocking ships a self-inflicted outage." },
      ],
      feedback: {
        perfect: "Rule set reviewed and corrected: core groups blocking, the falsely 'covered' XSS group actually enforced, geo rules matched to the real market, and the search-breaking keyword rule scoped. The AI's draft was a starting point — your review is what makes it production-safe.",
        partial: "Some staged rules still ship with their defects: check the XSS group's actual state against the coverage matrix, the geo rule against where the store sells, and the keyword rule against how customers actually search.",
        wrong: "Shipping the staged set as-is would have left XSS in log-only mode while the compliance matrix claimed coverage — and blocked Canadian, European, and searching customers on day one. Generated controls need the same review as generated code.",
      },
    },
    {
      type: "toggle-config",
      id: "waf-002",
      title: "Bot and Rate Rules — The AI Draft",
      description:
        "The AI also drafted the bot management and rate limiting rules, noting it 'balanced protection with customer experience.' Compare each draft value against how the store's traffic actually behaves.",
      targetSystem: "WAF Bot Management — prod-ecommerce.company.com (AI draft)",
      items: [
        {
          id: "bot-detection",
          label: "Bot Detection Mode",
          detail: "The AI set bot handling to block-all-bots 'for maximum protection.' The store depends on search-engine crawlers for organic traffic and an uptime monitor that checks the site every minute — both are bots.",
          currentState: "block-all-bots",
          correctState: "challenge-suspicious",
          states: ["disabled", "block-all-bots", "challenge-suspicious"],
          rationaleId: "rat-bot",
        },
        {
          id: "rate-limit-login",
          label: "Login Endpoint Rate Limit",
          detail: "The AI set 100 requests/minute per IP, noting it 'avoids customer friction.' Credential-stuffing tools try thousands of passwords per minute; legitimate customers log in a handful of times.",
          currentState: "100-per-min",
          correctState: "10-per-min",
          states: ["unlimited", "100-per-min", "10-per-min"],
          rationaleId: "rat-login-rate",
        },
        {
          id: "api-rate-limit",
          label: "API Rate Limit",
          detail: "The AI set a 100 requests/minute API cap 'based on average observed traffic of 60/minute.' Partner integrations sync inventory in bursts that legitimately reach 3,000 requests/minute for short windows.",
          currentState: "100-per-min",
          correctState: "1000-per-min",
          states: ["100-per-min", "1000-per-min", "unlimited"],
          rationaleId: "rat-api-rate",
        },
        {
          id: "user-agent-blocking",
          label: "Malicious User-Agent Blocking",
          detail: "The AI enabled blocking for known scanner user agents (sqlmap, nikto, masscan). No legitimate customer or partner presents these agents.",
          currentState: "enabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-ua",
        },
      ],
      rationales: [
        { id: "rat-bot", text: "'Maximum protection' that blocks Googlebot and the uptime monitor protects the store from its customers and its own monitoring. Challenge-suspicious uses fingerprinting and behavior to challenge likely bots while known-good automation passes — protection aimed at abuse, not at the category 'bot.'" },
        { id: "rat-login-rate", text: "The AI optimized against a friction metric, but 100/minute is not a compromise — it's an open door with a sign on it. Credential stuffing runs at machine speed; 10/minute is invisible to humans and useless to stuffing tools. Rate limits on authentication endpoints are set from attack arithmetic, not average customer behavior." },
        { id: "rat-api-rate", text: "Averages conceal bursts: a cap set at 100 because 'average is 60' throttles every partner sync window and turns the WAF into an inventory outage generator. Rate limits must be set above legitimate peak behavior — 1,000/minute with the burst pattern in mind — while still catching true floods." },
        { id: "rat-ua", text: "Ship as drafted. Scanner user agents are never legitimate production traffic; blocking them stops reconnaissance before rule evaluation. Part of reviewing AI output is knowing which lines not to touch." },
      ],
      feedback: {
        perfect: "Draft corrected on all three defective values: bots challenged instead of blanket-blocked, login limits set by attack math, API limits set above legitimate bursts — and the one correct rule left untouched. This is the balance WAF review exists to strike.",
        partial: "One or more draft values still optimize for the wrong metric — friction or averages. Check each limit against the behavior it governs: attackers are fast, customers are bursty, and crawlers are legitimate.",
        wrong: "As drafted, this rule set blocks the store's search traffic and monitoring, waves credential stuffing through at 100/minute, and throttles partner integrations at every sync. AI drafts inherit plausible numbers; reviewers supply the operational truth.",
      },
    },
    {
      type: "toggle-config",
      id: "waf-003",
      title: "Logging and Alerting — The AI Draft",
      description:
        "Finally, the AI configured WAF logging and alerting, noting 'the rule set is self-tuning, so ongoing review processes are unnecessary.' Decide what visibility the shipped configuration keeps.",
      targetSystem: "WAF Logging — SIEM Integration (AI draft)",
      items: [
        {
          id: "request-logging",
          label: "Full Request Logging",
          detail: "The AI enabled full request logging (headers and bodies) for ALL requests 'for complete visibility.' The store processes payment-adjacent forms; full-body logging of every request creates a sensitive-data store and significant cost.",
          currentState: "enabled-all-requests",
          correctState: "enabled-blocked-only",
          states: ["disabled", "enabled-all-requests", "enabled-blocked-only"],
          rationaleId: "rat-logging",
        },
        {
          id: "siem-forwarding",
          label: "SIEM Log Forwarding",
          detail: "The AI set log forwarding to a daily batch 'to reduce integration cost.' An attack campaign starting at 09:00 would reach the SIEM the following day.",
          currentState: "batch-daily",
          correctState: "real-time",
          states: ["disabled", "batch-daily", "real-time"],
          rationaleId: "rat-siem",
        },
        {
          id: "false-positive-review",
          label: "Weekly False Positive Review",
          detail: "The AI removed the weekly false-positive review process, describing the generated rule set as 'self-tuning.' Application changes and new product lines change traffic patterns continuously; rule sets drift with them.",
          currentState: "no-process",
          correctState: "scheduled-review",
          states: ["no-process", "scheduled-review"],
          rationaleId: "rat-fp-review",
        },
        {
          id: "attack-alerting",
          label: "Attack Campaign Alerting",
          detail: "The AI enabled threshold-based alerts when block rates spike above baseline — the signal of an active campaign.",
          currentState: "enabled-threshold",
          correctState: "enabled-threshold",
          states: ["disabled", "enabled-threshold"],
          rationaleId: "rat-alerting",
        },
      ],
      rationales: [
        { id: "rat-logging", text: "'Complete visibility' into every request body means logging customers' form data at scale — a compliance liability and a cost sink that buys nothing for security. Blocked-request logging captures exactly the traffic investigations need: what was attacked, from where, and what it tried." },
        { id: "rat-siem", text: "A daily batch converts the WAF into a historian: attack campaigns would be over — success or failure — before the SIEM sees the first event. Real-time forwarding is what makes the WAF a detection source instead of an archive." },
        { id: "rat-fp-review", text: "There is no self-tuning rule set — there are rule sets whose drift nobody reviews. The first two scenarios of this lab are the evidence: generated rules over-block and under-enforce as the application evolves. The weekly review is the process that catches it; the AI's 'unnecessary' is the most dangerous word in its draft." },
        { id: "rat-alerting", text: "Ship as drafted. Block-rate spikes are the earliest reliable sign of a campaign, and threshold alerting routes them to humans while response is still possible." },
      ],
      feedback: {
        perfect: "Visibility configuration corrected: blocked-only logging without the data liability, real-time SIEM forwarding, the false-positive review reinstated, and campaign alerting kept. The AI drafted a WAF that would have gone quiet and blind; your review keeps it observable.",
        partial: "Check the draft's cost-driven choices — batch forwarding and total-body logging both convert the WAF into either an archive or a liability — and its claim that review processes are unnecessary. That claim is the one this entire lab disproves.",
        wrong: "As drafted: every request body logged, the SIEM a day behind, and no human ever scheduled to look at false positives again. A WAF configured this way fails silently in both directions — blind to attacks, harmful to customers — with no process left to notice.",
      },
    },
  ],

  hints: [
    "Verify claimed coverage against actual rule states — an AI's coverage matrix is a document, not a control. Detect-only is not enforcement, no matter what the matrix says.",
    "Rate limits and blocking rules must be set from operational reality: attackers are fast, legitimate traffic is bursty, and 'bot' includes your crawlers and monitors.",
    "Any proposal that removes the human review process itself — 'self-tuning,' 'no ongoing review needed' — deserves the hardest look in the set.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Generated security controls are becoming the default first draft — WAF rules, firewall policies, detection content. Web application security work is shifting from writing every rule to reviewing machine-generated sets with an operator's eye: what breaks customers, what's claimed but not enforced, and what quietly removes visibility. That review skill is the job now.",
  toolRelevance: [
    "Cloudflare WAF",
    "AWS WAF",
    "ModSecurity (OWASP CRS)",
    "Fastly Next-Gen WAF",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-10-19",
};
