import type { LabManifest } from "../../types/manifest";

export const dnsThreatAnalysisLab: LabManifest = {
  schemaVersion: "1.1",
  id: "dns-threat-analysis",
  version: 1,
  title: "DNS Threat Analysis",

  tier: "advanced",
  track: "detection-hunting",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "dns",
    "threat-hunting",
    "c2-detection",
    "dga",
    "dns-tunneling",
    "beaconing",
  ],

  description:
    "Analyze DNS query logs to detect C2 beaconing, DNS tunneling, and DGA patterns while distinguishing malicious traffic from legitimate DNS-heavy services like certificate validation and CDN sharding.",
  estimatedMinutes: 20,
  learningObjectives: [
    "Recognize C2 beaconing patterns in DNS query logs",
    "Distinguish DNS-based attacks from legitimate DNS-heavy services",
    "Evaluate domain reputation using multiple threat intelligence sources",
    "Apply proportional response based on indicator confidence level",
    "Understand DNS TXT record usage in both attacks and legitimate operations",
  ],
  sortOrder: 320,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "dns-001",
      title: "High-Entropy Subdomain Beaconing",
      objective:
        "Network monitoring flagged unusual DNS query patterns from an engineering workstation. Analyze the traffic.",
      investigationData: [
        {
          id: "dns-log",
          label: "DNS Log",
          content:
            "Queries: a7f3x2.relay-cdn-global.xyz, m9p1k8.relay-cdn-global.xyz, q2w5r4.relay-cdn-global.xyz — every 60 seconds for 3 hours. Total queries: 180. All TXT record requests returning base64-encoded responses.",
          isCritical: true,
        },
        {
          id: "domain-intel",
          label: "Domain Intelligence",
          content:
            "relay-cdn-global.xyz registered 5 days ago via Namecheap privacy proxy. No web content. Single A record pointing to 185.220.101.0/24 — known Tor exit node range. No WHOIS history. Not on any CDN provider list.",
        },
        {
          id: "workstation-context",
          label: "Workstation Context",
          content:
            "ENG-WS-08, user: Alex Chen, Senior Developer. Running IDE (VS Code), Chrome browser, and Docker containers. No unusual processes in task manager. Last software install: 2 days ago (npm package).",
        },
        {
          id: "network-baseline",
          label: "Network Baseline",
          content:
            "Normal DNS query volume from engineering subnet: 3,100 queries/hour across 45 workstations (~69/host/hour). ENG-WS-08 alone generating 1,200 queries/hour — 17x the per-host average.",
        },
      ],
      actions: [
        {
          id: "ISOLATE_ESCALATE",
          label: "Isolate host and escalate — high-confidence C2 beaconing",
          color: "red",
        },
        {
          id: "MONITOR_24H",
          label: "Monitor for 24 more hours",
          color: "yellow",
        },
        {
          id: "BLOCK_DOMAIN",
          label: "Block the domain at DNS",
          color: "orange",
        },
        {
          id: "ASK_DEVELOPER",
          label: "Ask the developer what they're working on",
          color: "green",
        },
      ],
      correctActionId: "ISOLATE_ESCALATE",
      rationales: [
        {
          id: "rat-isolate-c2",
          text: "Regular intervals + high-entropy subdomains + newly registered domain + Tor-adjacent IP + base64 TXT responses = textbook C2 beaconing pattern. Immediate isolation prevents data exfiltration while forensic investigation determines the scope of compromise.",
        },
        {
          id: "rat-monitor-risk",
          text: "Monitoring gives the attacker more time to exfiltrate data, establish persistence, or pivot to other systems. With this confidence level, waiting 24 hours is unacceptable risk.",
        },
        {
          id: "rat-block-insufficient",
          text: "Blocking the domain alone doesn't address the malware on the endpoint — it will likely switch to a fallback C2 channel or generate new DGA domains.",
        },
        {
          id: "rat-ask-delays",
          text: "Asking the developer delays response for a high-confidence indicator. The developer may not even know their machine is compromised — the npm package installed 2 days ago is a likely infection vector.",
        },
      ],
      correctRationaleId: "rat-isolate-c2",
      feedback: {
        perfect:
          "Textbook C2 detection and response. Every indicator — interval regularity, entropy, domain age, Tor infrastructure, and query volume — points to active command and control. Immediate isolation is the only appropriate response.",
        partial:
          "You recognized the threat but chose an incomplete response. Blocking the domain or asking the developer doesn't address the compromised endpoint. When confidence is this high, isolate first.",
        wrong:
          "This is one of the clearest C2 beaconing patterns possible. Monitoring or asking questions while data is being exfiltrated every 60 seconds is a critical response failure.",
      },
    },
    {
      type: "investigate-decide",
      id: "dns-002",
      title: "DNS TXT Record Spike from Dev Subnet",
      objective:
        "DNS monitoring shows unusual TXT record query volume from the development network. Investigate.",
      investigationData: [
        {
          id: "dns-log",
          label: "DNS Log",
          content:
            "Burst of 847 TXT queries to _acme-challenge.dev.internal.acmecorp.com in 15 minutes. Source: 10.0.90.0/24 development subnet. Query pattern: rapid burst then silence, consistent with retry/validation cycle.",
        },
        {
          id: "devops-slack",
          label: "DevOps Slack",
          content:
            'Message from DevOps lead (k.patel) 2 hours ago: "Deploying cert-manager v1.14 to staging — expect DNS validation traffic for Let\'s Encrypt wildcard cert. Should be done within the hour."',
        },
        {
          id: "cert-manager-log",
          label: "Certificate Manager Log",
          content:
            "cert-manager pod running DNS-01 challenge for *.dev.internal.acmecorp.com. ACME challenge tokens in TXT records match query content exactly. Challenge status: pending validation.",
        },
        {
          id: "historical-pattern",
          label: "Historical Pattern",
          content:
            "Similar TXT query bursts occurred during previous certificate renewals. Last occurrence: 89 days ago (matching 90-day Let's Encrypt certificate lifecycle). Volume and pattern are consistent with prior events.",
        },
      ],
      actions: [
        {
          id: "VERIFY_DEVOPS",
          label: "Verify with DevOps team — likely Let's Encrypt validation",
          color: "green",
        },
        {
          id: "ISOLATE_SUBNET",
          label: "Isolate the development subnet",
          color: "red",
        },
        {
          id: "BLOCK_TXT",
          label: "Block TXT queries at the DNS resolver",
          color: "orange",
        },
        {
          id: "ESCALATE_TUNNELING",
          label: "Escalate as DNS tunneling",
          color: "yellow",
        },
      ],
      correctActionId: "VERIFY_DEVOPS",
      rationales: [
        {
          id: "rat-verify-devops",
          text: "Slack announcement + cert-manager logs + matching challenge tokens + historical 90-day pattern strongly indicate legitimate Let's Encrypt certificate validation. Verify with DevOps to confirm and document the expected traffic pattern for future reference.",
        },
        {
          id: "rat-isolate-disrupts",
          text: "Isolating the development subnet for certificate renewal traffic disrupts the entire development team and blocks the cert deployment that was pre-announced.",
        },
        {
          id: "rat-block-txt-breaks",
          text: "Blocking TXT queries breaks certificate validation (DNS-01 challenges), SPF/DKIM email authentication, and other legitimate DNS TXT record uses.",
        },
        {
          id: "rat-escalate-waste",
          text: "Escalating as DNS tunneling when all evidence points to Let's Encrypt ACME challenges wastes analyst time and creates alert fatigue for the incident response team.",
        },
      ],
      correctRationaleId: "rat-verify-devops",
      feedback: {
        perfect:
          "Good analysis. Four independent pieces of evidence — Slack announcement, cert-manager logs, token matching, and historical pattern — confirm legitimate certificate validation. Verify and document.",
        partial:
          "You were overly cautious given the evidence. When multiple corroborating sources explain the traffic, verification is the appropriate level of response.",
        wrong:
          "Isolating subnets or blocking DNS record types for pre-announced certificate management operations shows a lack of operational awareness.",
      },
    },
    {
      type: "investigate-decide",
      id: "dns-003",
      title: "DGA-Pattern Domains Resolving to CDN",
      objective:
        "Threat hunting query found domains matching DGA patterns, but they resolve to a known CDN. Assess the risk.",
      investigationData: [
        {
          id: "dns-log",
          label: "DNS Log",
          content:
            "Queries to x7k2m9p.akamaized.net, f3q8w1y.akamaized.net, r6t4v2n.akamaized.net — from 12 workstations across 3 departments (Marketing, Sales, Support). Consistent daily pattern during business hours.",
        },
        {
          id: "domain-resolution",
          label: "Domain Resolution",
          content:
            "All domains resolve to Akamai CDN IP ranges — 23.32.0.0/12 and 104.64.0.0/14. TLS certificates are valid Akamai-issued certs. DNS responses include CNAME chains typical of CDN sharding.",
        },
        {
          id: "threat-intel",
          label: "Threat Intelligence",
          content:
            "No hits on any threat feed (AlienVault OTX, Abuse.ch, VirusTotal, CISA). Domains are valid Akamai customer subdomains with proper CDN registration. WHOIS shows Akamai Technologies ownership.",
        },
        {
          id: "app-context",
          label: "Application Context",
          content:
            "Marketing team recently deployed a new analytics platform (MarketPulse Pro) that uses Akamai CDN with randomized subdomain sharding for load distribution. Vendor documentation confirms this pattern.",
        },
      ],
      actions: [
        {
          id: "MONITOR_THRESHOLD",
          label: "Monitor with 24-hour alert threshold — benign but warrants observation",
          color: "yellow",
        },
        {
          id: "BLOCK_DGA",
          label: "Block all DGA-pattern domains",
          color: "red",
        },
        {
          id: "ISOLATE_WORKSTATIONS",
          label: "Isolate affected workstations",
          color: "orange",
        },
        {
          id: "CLOSE_CDN",
          label: "Close — confirmed CDN traffic",
          color: "green",
        },
      ],
      correctActionId: "MONITOR_THRESHOLD",
      rationales: [
        {
          id: "rat-monitor",
          text: "DGA-like patterns with clean CDN resolution, no threat intel hits, and confirmed application context are likely benign CDN sharding. However, novel patterns warrant continued observation to catch potential domain fronting or future abuse of the CDN infrastructure.",
        },
        {
          id: "rat-block-breaks",
          text: "Blocking legitimate CDN traffic breaks the marketing analytics platform and potentially other Akamai-hosted services used across the organization.",
        },
        {
          id: "rat-isolate-disproportionate",
          text: "Isolating 12 workstations across 3 departments for confirmed CDN traffic is disproportionate and would significantly impact business operations.",
        },
        {
          id: "rat-close-misses",
          text: "Closing entirely misses the opportunity to establish a baseline and catch future anomalies. CDN infrastructure can be abused for domain fronting, and novel patterns deserve a monitoring period.",
        },
      ],
      correctRationaleId: "rat-monitor",
      feedback: {
        perfect:
          "Balanced response. The evidence strongly suggests legitimate CDN usage, but establishing monitoring provides defense-in-depth against domain fronting and creates a baseline for future threat hunting.",
        partial:
          "Your response was either too aggressive or too dismissive. CDN sharding is legitimate, but novel DGA-like patterns deserve a monitoring period before being fully closed.",
        wrong:
          "Blocking CDN traffic or isolating workstations for confirmed legitimate analytics would cause significant business disruption. Conversely, closing without any monitoring misses a threat hunting opportunity.",
      },
    },
    {
      type: "investigate-decide",
      id: "dns-004",
      title: "Contractor Laptop — Known RAT Domain",
      objective:
        "A contractor's VPN-connected laptop is querying a domain associated with a known Remote Access Trojan. Investigate.",
      investigationData: [
        {
          id: "dns-log",
          label: "DNS Log",
          content:
            "3 queries to cmd-update.darkcloud-services.net from 10.200.5.47 over 45 minutes. Query types: A record lookups. Responses point to 91.215.85.0/24 — Eastern European hosting provider.",
          isCritical: true,
        },
        {
          id: "threat-intel",
          label: "Threat Intelligence",
          content:
            "cmd-update.darkcloud-services.net: listed on AlienVault OTX (pulse ID: 62f8a3b), Abuse.ch URLhaus, and CISA Alert AA26-047A as C2 infrastructure for DarkGate RAT since February 2026. Confidence: 95%. Associated with credential theft and lateral movement campaigns.",
        },
        {
          id: "vpn-session",
          label: "Contractor VPN Session",
          content:
            "Contractor: James Rivera, CompanyX IT Consulting. Connected 2 hours ago via standard-contractor VPN profile. Browse logs show normal web activity (email, documentation sites, project management tools) otherwise.",
        },
        {
          id: "endpoint-visibility",
          label: "Endpoint Visibility",
          content:
            "Limited — contractor devices are not managed by corporate EDR. Only DNS query logs and VPN flow data available. Cannot inspect running processes, file system, or memory. Device type: personal laptop per BYOD contractor policy.",
        },
      ],
      actions: [
        {
          id: "ISOLATE_LAPTOP",
          label: "Isolate the laptop immediately — known-bad domain",
          color: "red",
        },
        {
          id: "VERIFY_CONTRACTOR",
          label: "Verify with contractor before acting",
          color: "green",
        },
        {
          id: "MONITOR_COLLECT",
          label: "Monitor and collect more evidence",
          color: "yellow",
        },
        {
          id: "BLOCK_OBSERVE",
          label: "Block the domain and continue observing",
          color: "orange",
        },
      ],
      correctActionId: "ISOLATE_LAPTOP",
      rationales: [
        {
          id: "rat-isolate-known-bad",
          text: "A single high-confidence threat intel match (95% confidence, three independent feeds including CISA) overrides otherwise normal behavior. Isolate first via VPN termination, investigate after. The unmanaged endpoint increases risk since you cannot verify its state.",
        },
        {
          id: "rat-verify-delays",
          text: "Verifying with the contractor delays response to an active threat. The contractor likely doesn't know their machine is compromised — DarkGate RAT operates silently.",
        },
        {
          id: "rat-monitor-risk",
          text: "Monitoring a known RAT C2 connection risks corporate data loss. With limited endpoint visibility on an unmanaged device, you cannot assess what data has already been accessed.",
        },
        {
          id: "rat-block-insufficient",
          text: "Blocking the domain without isolating leaves the compromised endpoint on the corporate network. DarkGate RAT has multiple fallback C2 mechanisms and can pivot to alternative domains.",
        },
      ],
      correctRationaleId: "rat-isolate-known-bad",
      feedback: {
        perfect:
          "Decisive and correct. High-confidence threat intel from three independent sources demands immediate isolation. The unmanaged contractor device amplifies the risk since you have no endpoint visibility to assess compromise scope.",
        partial:
          "You recognized the threat but chose an insufficient response. When threat intel confidence is 95% across multiple feeds, half-measures like blocking or monitoring leave the network exposed.",
        wrong:
          "A known RAT C2 domain confirmed by CISA, AlienVault OTX, and Abuse.ch is not something to verify or monitor. Every minute the laptop stays connected is a minute of potential data exfiltration.",
      },
    },
  ],

  hints: [
    "Regular-interval queries to high-entropy subdomains of newly registered domains are one of the strongest indicators of C2 beaconing.",
    "Not all unusual DNS patterns are malicious — certificate validation (ACME/Let's Encrypt) and CDN sharding create DNS patterns that look suspicious but are legitimate.",
    "When threat intelligence shows a high-confidence match (95%+, multiple sources), act first and investigate after. A single confirmed bad indicator outweighs otherwise normal behavior.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "DNS analysis is one of the highest-value threat hunting techniques because DNS traffic is rarely encrypted and nearly impossible to avoid. Organizations with mature detection programs monitor DNS for C2, tunneling, and DGA patterns as a primary detection layer.",
  toolRelevance: [
    "Infoblox DNS Firewall",
    "Cisco Umbrella (OpenDNS)",
    "Passive DNS databases (DNSDB)",
    "Zeek (network monitoring)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
