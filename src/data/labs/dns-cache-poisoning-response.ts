import type { LabManifest } from "../../types/manifest";

export const dnsCachePoisoningResponseLab: LabManifest = {
  schemaVersion: "1.1",
  id: "dns-cache-poisoning-response",
  version: 1,
  title: "DNS Cache Poisoning Response",

  tier: "intermediate",
  track: "network-defense",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["dns", "cache-poisoning", "dnssec", "network-security", "spoofing", "incident-response"],

  description:
    "Detect and respond to DNS cache poisoning attacks that redirect legitimate traffic to attacker-controlled infrastructure, and implement DNSSEC and resolver hardening to prevent recurrence.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify DNS cache poisoning indicators from resolver logs and traffic anomalies",
    "Distinguish DNS hijacking from legitimate DNS changes and CDN propagation",
    "Select appropriate response including cache flush, DNSSEC implementation, and resolver hardening",
  ],
  sortOrder: 630,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "dns-001",
      title: "Corporate DNS Resolver Poisoning",
      context:
        "NOC alert: Multiple users reporting they're being redirected to a phishing page when accessing the internal HR portal (hr.company.internal). DNS query logs from the internal resolver show hr.company.internal resolving to 185.220.101.88 — an external IP not associated with company infrastructure. The legitimate IP should be 10.0.50.25. The poisoned record has a TTL of 86400 (24 hours). Approximately 800 users have queried the poisoned record in the past 6 hours.",
      displayFields: [
        { label: "Poisoned Record", value: "hr.company.internal → 185.220.101.88 (should be 10.0.50.25)", emphasis: "critical" },
        { label: "Affected Users", value: "~800 users queried poisoned record in 6 hours", emphasis: "critical" },
        { label: "Poisoned TTL", value: "86400 seconds (24 hours)", emphasis: "warn" },
        { label: "Destination", value: "185.220.101.88 — external IP, confirmed phishing infrastructure", emphasis: "critical" },
        { label: "Attack Surface", value: "HR portal — contains payroll, personal data, benefits info", emphasis: "warn" },
      ],
      actions: [
        {
          id: "FLUSH_BLOCK_NOTIFY_DNSSEC",
          label: "Flush resolver cache, block phishing IP, notify 800 users, implement DNSSEC",
          color: "red",
        },
        {
          id: "FLUSH_ONLY",
          label: "Flush the DNS resolver cache",
          color: "orange",
        },
        {
          id: "BLOCK_IP",
          label: "Block 185.220.101.88 at the firewall",
          color: "yellow",
        },
        {
          id: "WAIT_TTL",
          label: "Wait for TTL to expire — the record will fix itself",
          color: "blue",
        },
      ],
      correctActionId: "FLUSH_BLOCK_NOTIFY_DNSSEC",
      rationales: [
        {
          id: "rat-full-response",
          text: "DNS poisoning with 800 affected users visiting a phishing site requires four immediate actions: flush the resolver cache (removes the poisoned record immediately — don't wait 24 hours for TTL), block the phishing IP at the firewall (stops users with cached responses from reaching it), notify the 800 users (they may have submitted credentials or sensitive data to the phishing site), and implement DNSSEC (cryptographic signing prevents future cache poisoning against the internal zone).",
        },
        {
          id: "rat-flush-only",
          text: "Flushing the cache removes the poisoned record but doesn't address 800 users who may have already submitted credentials to the phishing site and still have the IP cached locally.",
        },
        {
          id: "rat-block-ip",
          text: "Blocking the phishing IP stops future connections but doesn't remove the poisoned DNS record — users will continue to resolve the poisoned name until the cache expires or is flushed.",
        },
        {
          id: "rat-wait",
          text: "Waiting 24 hours for TTL expiry means 800+ more users will visit the phishing site. DNS poisoning attacks must be remediated immediately, not passively.",
        },
      ],
      correctRationaleId: "rat-full-response",
      feedback: {
        perfect: "Complete response. DNS poisoning affecting 800 users requires immediate cache flush, phishing IP block, user notification, and structural fix (DNSSEC) to prevent recurrence.",
        partial: "Flushing or blocking alone doesn't address users who already visited the phishing site. User notification and credential reset are essential after a DNS hijacking incident.",
        wrong: "Waiting 24 hours for TTL expiry during an active phishing attack allows thousands more credentials to be stolen. DNS poisoning requires immediate response.",
      },
    },
    {
      type: "action-rationale",
      id: "dns-002",
      title: "BGP-Based DNS Hijacking — Authoritative Server",
      context:
        "External monitoring alert: company.com A records are resolving to unexpected IPs from 12 different monitoring locations globally. The company's authoritative DNS server (ns1.company.com) is responding correctly from within the corporate network, but external resolvers worldwide are receiving different answers. Social media reports users being redirected. Registrar shows no recent DNS changes. Monitoring started 22 minutes ago.",
      displayFields: [
        { label: "Scope", value: "12/12 external monitoring locations affected — global", emphasis: "critical" },
        { label: "Attack Type", value: "Authoritative DNS answers different externally vs internally", emphasis: "critical" },
        { label: "Duration", value: "22 minutes since first detection", emphasis: "warn" },
        { label: "Registrar Status", value: "No changes to NS records or registrar account", emphasis: "normal" },
        { label: "Impact", value: "All company.com traffic globally redirected", emphasis: "critical" },
      ],
      actions: [
        {
          id: "CONTACT_REGISTRAR_ISP_SOC",
          label: "Contact registrar security team, upstream ISP, activate IR plan, post status update",
          color: "red",
        },
        {
          id: "FLUSH_RESOLVERS",
          label: "Flush all internal DNS resolvers",
          color: "orange",
        },
        {
          id: "CHANGE_DNS_PROVIDER",
          label: "Migrate DNS to a different provider immediately",
          color: "yellow",
        },
        {
          id: "INVESTIGATE_FIRST",
          label: "Investigate root cause before taking any action",
          color: "blue",
        },
      ],
      correctActionId: "CONTACT_REGISTRAR_ISP_SOC",
      rationales: [
        {
          id: "rat-escalate-externally",
          text: "Global BGP-based DNS hijacking — where authoritative DNS answers are intercepted and replaced in the routing layer — cannot be fixed by the organization alone. The registrar security team can validate and potentially implement emergency BGP filters. The upstream ISP may be able to identify the malicious BGP announcement. The IR plan triggers executive notification and legal/compliance involvement. A public status page is essential to prevent users from submitting credentials while the attack is ongoing. This is a Tier-1 incident requiring external coordination.",
        },
        {
          id: "rat-flush-internal",
          text: "Internal resolver flushing has no effect on global BGP-based hijacking. The attack is at the internet routing layer, not the local resolver.",
        },
        {
          id: "rat-change-provider",
          text: "DNS provider migration takes hours and doesn't address the active hijacking. BGP hijacking affects routing, not just the DNS provider — a new provider would also be affected if BGP routes are poisoned.",
        },
        {
          id: "rat-investigate-only",
          text: "22 minutes into a global DNS hijacking event with all users affected — investigation should run in parallel with response, not sequentially. Every minute of delay is more compromised credentials.",
        },
      ],
      correctRationaleId: "rat-escalate-externally",
      feedback: {
        perfect: "Correct escalation. BGP-based DNS hijacking is a network-layer attack requiring external coordination with registrars, ISPs, and your IR team — internal DNS actions are ineffective.",
        partial: "Internal DNS changes don't address BGP-layer attacks. This incident requires external escalation and parallel response tracks.",
        wrong: "BGP hijacking affecting all global DNS resolution cannot be resolved internally. Immediate external escalation — registrar, ISP, IR team — is the only effective response.",
      },
    },
    {
      type: "action-rationale",
      id: "dns-003",
      title: "False Positive — CDN DNS Propagation Delay",
      context:
        "Monitoring alert: marketing.company.com resolving to different IPs from different locations globally. Some resolvers return 34.107.221.82 (old), others return 34.102.136.180 (new). Internal IT did not announce any DNS changes. Help desk has 3 reports of the marketing site being 'slow or unreachable.'",
      displayFields: [
        { label: "Variation", value: "Two different IPs returned — both appear to be Google Cloud IPs", emphasis: "normal" },
        { label: "Pattern", value: "Inconsistency between geographic locations — consistent per region", emphasis: "normal" },
        { label: "Both IPs", value: "34.107.221.82 and 34.102.136.180 — both resolve to company marketing site content", emphasis: "normal" },
        { label: "Recent Changes", value: "Marketing team migrated CDN vendor 18 hours ago (confirmed in change log)", emphasis: "warn" },
        { label: "WHOIS", value: "Both IPs registered to Google LLC — Google Cloud CDN ranges", emphasis: "normal" },
      ],
      actions: [
        {
          id: "CORRELATE_CHANGE",
          label: "Correlate with change log, verify CDN migration, close alert as false positive",
          color: "green",
        },
        {
          id: "INCIDENT_RESPONSE",
          label: "Declare DNS hijacking incident, activate IR plan",
          color: "red",
        },
        {
          id: "FLUSH_RESOLVERS",
          label: "Flush all DNS resolvers to force consistent resolution",
          color: "orange",
        },
        {
          id: "BLOCK_OLD_IP",
          label: "Block the old IP — it may be attacker-controlled now",
          color: "yellow",
        },
      ],
      correctActionId: "CORRELATE_CHANGE",
      rationales: [
        {
          id: "rat-propagation-normal",
          text: "DNS propagation delay during a CDN migration is normal and expected — resolvers across the globe have different TTL-based cache states. The two IPs both serve correct content, both are in Google Cloud ranges, and the change log confirms a CDN migration 18 hours ago. Multiple IPs serving the same site content from the same cloud provider during a migration is propagation, not poisoning. Correlate with the change log and close.",
        },
        {
          id: "rat-false-incident",
          text: "Declaring a DNS hijacking incident for a documented CDN migration wastes IR resources and creates unnecessary organizational alarm. Always check the change log before escalating DNS anomalies.",
        },
        {
          id: "rat-flush-unnecessary",
          text: "Flushing resolvers during a CDN migration may route users to the old IP, counteracting the intended migration. Let propagation complete naturally.",
        },
        {
          id: "rat-block-old-ip",
          text: "The old IP is still serving the correct website content and is registered to Google Cloud. Blocking it during active propagation would make the site unreachable for users whose resolvers still have the old record.",
        },
      ],
      correctRationaleId: "rat-propagation-normal",
      feedback: {
        perfect: "Correct judgment. Geographic DNS inconsistency during a documented CDN migration is normal propagation, not an attack. The change log is the key distinguishing factor.",
        partial: "Your caution is understandable, but check the change log before escalating. CDN migrations always cause temporary DNS inconsistency during propagation.",
        wrong: "Not all DNS inconsistency is malicious. CDN migrations, TTL-based propagation, and anycast routing naturally produce different DNS responses from different locations. Context matters.",
      },
    },
  ],

  hints: [
    "DNS cache poisoning inserts false records into a resolver's cache — always check if both the poisoned IP and the legitimate IP serve the correct content before classifying.",
    "BGP-based DNS hijacking affects internet routing, not just local resolvers — internal DNS changes are ineffective and external escalation (registrar, ISP) is required.",
    "Always check the change log before treating DNS inconsistency as an attack — CDN migrations and TTL propagation routinely cause geographic DNS variation.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "DNS is foundational infrastructure, and attacks against it affect all services simultaneously. Network security engineers and SOC analysts must understand the difference between cache poisoning, BGP hijacking, and normal DNS propagation to avoid costly false positives and missed incidents.",
  toolRelevance: [
    "dig / nslookup (DNS investigation)",
    "DNSSEC Analyzer (Verisign Labs)",
    "BGPmon (routing anomaly detection)",
    "Cloudflare Radar (DNS anomaly tracking)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
