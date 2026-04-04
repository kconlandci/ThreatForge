import type { LabManifest } from "../../types/manifest";

export const bgpHijackingDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "bgp-hijacking-detection",
  version: 1,
  title: "BGP Hijacking Detection",

  tier: "advanced",
  track: "network-defense",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["bgp", "routing", "hijacking", "network-security", "route-leak", "rpki"],

  description:
    "Analyze BGP routing anomalies to identify prefix hijacking, route leaks, and MITM attacks — distinguishing malicious routing manipulation from legitimate network maintenance and ISP peering changes.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify BGP prefix hijacking indicators including unexpected origin ASNs and more-specific prefix announcements",
    "Distinguish BGP hijacking from route leaks and legitimate routing changes",
    "Select appropriate response including RPKI ROA creation and upstream notification",
  ],
  sortOrder: 640,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "bgp-001",
      title: "Prefix Hijack — Cryptocurrency Exchange",
      context:
        "BGPmon alert: Your organization's IP prefix 203.0.113.0/24 is now being announced by AS64501 (an unknown ISP in Eastern Europe). Your organization's legitimate ASN is AS12345. The hijacked prefix is being announced with a more-specific /25 (203.0.113.0/25), which due to BGP's longest-prefix-match rule takes precedence over your /24. Traffic monitoring shows 67% of inbound traffic for 203.0.113.0/24 is being routed through AS64501. Three cryptocurrency wallets associated with customer withdrawals have processed to different addresses in the past 40 minutes.",
      displayFields: [
        { label: "Hijacked Prefix", value: "203.0.113.0/24 — more-specific /25 by AS64501", emphasis: "critical" },
        { label: "Traffic Hijacked", value: "67% of inbound traffic routed through attacker ASN", emphasis: "critical" },
        { label: "Financial Impact", value: "3 crypto withdrawals redirected in 40 minutes", emphasis: "critical" },
        { label: "Attack Technique", value: "More-specific prefix announcement (/25 beats /24)", emphasis: "warn" },
        { label: "RPKI Status", value: "No ROA configured for 203.0.113.0/24", emphasis: "critical" },
      ],
      actions: [
        {
          id: "CONTACT_ISP_RPKI_NOTIFY",
          label: "Contact upstream ISPs for emergency depreference, create RPKI ROA, notify affected customers",
          color: "red",
        },
        {
          id: "ANNOUNCE_SPECIFICS",
          label: "Counter-announce more-specific prefixes from your own ASN",
          color: "orange",
        },
        {
          id: "CONTACT_IRRDB",
          label: "File complaint with ARIN/RIPE and wait for resolution",
          color: "yellow",
        },
        {
          id: "MONITOR_TRAFFIC",
          label: "Monitor traffic patterns to understand the full scope",
          color: "blue",
        },
      ],
      correctActionId: "CONTACT_ISP_RPKI_NOTIFY",
      rationales: [
        {
          id: "rat-bgp-response",
          text: "Active BGP hijacking with financial impact requires three simultaneous actions. Contact upstream ISPs: they can implement emergency route filters to depreference AS64501's announcements and restore your traffic. Create RPKI ROA: even mid-incident, creating a Route Origin Authorization for 203.0.113.0/24 (authorizing only AS12345) causes RPKI-validating routers worldwide to mark AS64501's announcement as invalid. Notify customers: 3 crypto transactions were redirected — affected customers need immediate warning and transaction investigation. Counter-announcing /25 prefixes can work but escalates the routing conflict and risks further traffic disruption.",
        },
        {
          id: "rat-counter-announce",
          text: "Counter-announcing /25 prefixes can help restore traffic but adds routing complexity and doesn't address the root cause. It should be a tactical fallback while ISP escalation proceeds.",
        },
        {
          id: "rat-irrdb-slow",
          text: "ARIN/RIPE complaints have day-to-week resolution timelines. With active financial fraud occurring, a regulatory filing is the right long-term action but cannot be the primary response.",
        },
        {
          id: "rat-monitor-only",
          text: "Three cryptocurrency transactions have already been redirected. Further monitoring without intervention allows more fraud to occur every minute.",
        },
      ],
      correctRationaleId: "rat-bgp-response",
      feedback: {
        perfect: "Correct. Active BGP hijacking with financial fraud requires immediate ISP escalation, RPKI ROA creation, and customer notification simultaneously. Speed is critical.",
        partial: "You identified the attack but the response misses one of the three critical tracks. ISP escalation, RPKI, and customer notification must happen in parallel.",
        wrong: "40 minutes of active financial fraud via BGP hijacking requires immediate multi-party escalation. Monitoring or single-vector responses are insufficient.",
      },
    },
    {
      type: "action-rationale",
      id: "bgp-002",
      title: "Route Leak — Tier 2 ISP Misconfiguration",
      context:
        "BGP monitoring detects your organization's internal routing prefixes (10.0.0.0/8 summarization, RFC1918) are being advertised to the public internet by AS67890, a small regional ISP you peer with for a dedicated WAN link. The routes are receiving no inbound traffic but are visible in global routing tables. Your internal prefix announcements were leaked when AS67890 failed to apply a BGP community filter. No external traffic has been routed internally.",
      displayFields: [
        { label: "Leaked Prefixes", value: "RFC1918 internal ranges visible in global BGP tables", emphasis: "warn" },
        { label: "Inbound Traffic", value: "Zero — no external traffic routed to internal ranges", emphasis: "normal" },
        { label: "Root Cause", value: "Missing BGP community filter at AS67890 peer", emphasis: "warn" },
        { label: "Financial Impact", value: "None detected — reconnaissance exposure only", emphasis: "normal" },
        { label: "Peering Relationship", value: "Legitimate business partner WAN link", emphasis: "normal" },
      ],
      actions: [
        {
          id: "CONTACT_PEER_APPLY_FILTER",
          label: "Contact AS67890 to apply BGP community filters, review peering policy, add export filters on your end",
          color: "orange",
        },
        {
          id: "TERMINATE_PEERING",
          label: "Immediately terminate the BGP peering session with AS67890",
          color: "red",
        },
        {
          id: "DO_NOTHING",
          label: "Do nothing — RFC1918 addresses can't be routed on the internet",
          color: "blue",
        },
        {
          id: "ESCALATE_ISPS",
          label: "Escalate to all upstream ISPs as emergency BGP hijacking",
          color: "yellow",
        },
      ],
      correctActionId: "CONTACT_PEER_APPLY_FILTER",
      rationales: [
        {
          id: "rat-route-leak-response",
          text: "This is a route leak from a trusted peer, not a malicious hijacking. No traffic has been misdirected. The appropriate response is coordinated: contact AS67890 to apply the missing BGP community filter (fix the root cause), review your peering policy to add explicit export filters on your side as defense-in-depth, and document the incident. Terminating the peering would disrupt the WAN link. Treating this as an emergency hijacking would waste IR resources and damage the business relationship.",
        },
        {
          id: "rat-terminate",
          text: "Terminating the BGP session would disrupt the dedicated WAN link to a legitimate business partner for what is a misconfiguration, not a malicious act. The proportional response is a filter fix, not link termination.",
        },
        {
          id: "rat-do-nothing",
          text: "While RFC1918 addresses can't be routed, leaking them exposes internal network topology (subnet sizes, naming patterns) to reconnaissance. Route leaks should always be corrected even without immediate traffic impact.",
        },
        {
          id: "rat-escalate",
          text: "Escalating a route leak from a known business partner as an emergency hijacking misclassifies the incident and wastes upstream ISP security team resources. Reserve emergency escalation for actual hijacking.",
        },
      ],
      correctRationaleId: "rat-route-leak-response",
      feedback: {
        perfect: "Proportional response. Route leaks from trusted peers are misconfigurations, not attacks. Coordinate a filter fix, add export filters defensively, no need for emergency incident response.",
        partial: "The response is disproportionate. Distinguish between route leaks (misconfiguration) and hijacking (malicious) — the response should match the severity.",
        wrong: "RFC1918 prefix route leaks are a reconnaissance risk but not an active attack. Work with the peer to apply filters rather than treating it as an emergency.",
      },
    },
    {
      type: "action-rationale",
      id: "bgp-003",
      title: "RPKI MITM — Traffic Interception via More-Specific",
      context:
        "RPKI validation reports flag an inconsistency: AS99999 is announcing 198.51.100.128/25, a more-specific of your registered 198.51.100.0/24. Your ROA covers only the /24. RPKI-validating routers reject AS99999's /25 as 'RPKI invalid,' but many global routers (45%) don't perform RPKI validation and accept the more-specific. Network flow analysis shows 45% of your inbound traffic is being routed via AS99999 for potential MITM inspection before delivery.",
      displayFields: [
        { label: "Your ROA Coverage", value: "198.51.100.0/24 — does NOT cover more-specific /25", emphasis: "critical" },
        { label: "Hijacked Traffic", value: "45% routed via AS99999 (non-RPKI-validating networks)", emphasis: "critical" },
        { label: "RPKI Status", value: "RPKI-validating routers reject — non-validating routers accept", emphasis: "warn" },
        { label: "Attack Type", value: "Possible MITM — traffic passing through AS99999 before delivery", emphasis: "critical" },
        { label: "ROA Gap", value: "ROA for /24 but not /25 — more-specifics not covered", emphasis: "critical" },
      ],
      actions: [
        {
          id: "UPDATE_ROA_ESCALATE",
          label: "Update ROA to cover /25 with maxLength, contact AS99999's upstream providers, notify customers",
          color: "red",
        },
        {
          id: "UPDATE_ROA_ONLY",
          label: "Update ROA to cover the /25 specifically",
          color: "orange",
        },
        {
          id: "CONTACT_IANA",
          label: "Contact IANA to revoke AS99999's BGP rights",
          color: "yellow",
        },
        {
          id: "WAIT_FOR_RPKI",
          label: "Wait — RPKI will handle this as more networks validate",
          color: "blue",
        },
      ],
      correctActionId: "UPDATE_ROA_ESCALATE",
      rationales: [
        {
          id: "rat-roa-fix",
          text: "The ROA gap is the root vulnerability — your /24 ROA doesn't cover more-specific prefixes, allowing the /25 hijack to succeed for non-RPKI-validating networks. The maxLength attribute in the updated ROA should specify that no prefix more specific than /24 should be accepted from anyone other than your ASN. Additionally, contact AS99999's upstream providers (they can apply route filters) and notify customers (45% of inbound traffic is potentially being intercepted — customer data may be at risk). IANA doesn't handle individual BGP abuse cases.",
        },
        {
          id: "rat-roa-only",
          text: "Updating the ROA helps RPKI-validating networks (currently 55%) but doesn't address the 45% of networks that don't validate. Upstream ISP escalation is needed to address non-RPKI paths.",
        },
        {
          id: "rat-contact-iana",
          text: "IANA manages IP address allocation, not BGP routing policies. BGP hijacking response goes through upstream ISPs, route registries (ARIN/RIPE), and network operators.",
        },
        {
          id: "rat-wait",
          text: "RPKI adoption is growing but is currently below 55% globally. Waiting for universal adoption while 45% of traffic is being intercepted is not an acceptable response to an active MITM attack.",
        },
      ],
      correctRationaleId: "rat-roa-fix",
      feedback: {
        perfect: "Correct. The ROA maxLength gap is the vulnerability — update to explicitly reject more-specific hijacks. Multi-track response: ROA update, upstream ISP escalation, and customer notification for potential MITM data exposure.",
        partial: "ROA update helps RPKI-validating networks but 45% of traffic remains at risk through non-validating paths. Upstream escalation is required for complete remediation.",
        wrong: "IANA doesn't handle BGP routing disputes. RPKI ROA update plus upstream ISP escalation is the correct response to prefix hijacking.",
      },
    },
  ],

  hints: [
    "More-specific prefix announcements (/25 vs /24) take precedence in BGP longest-prefix-match — attackers announce more-specifics to divert a subset of traffic while the legitimate /24 still routes some traffic (making detection harder).",
    "RPKI ROA maxLength attribute controls whether more-specific prefixes are authorized — a ROA for /24 without maxLength allows any more-specific from your ASN, but attackers can still announce from their own ASN.",
    "BGP route leaks from trusted peers are misconfigurations, not attacks — proportional response is a filter fix, not emergency escalation.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "BGP hijacking has caused major internet outages and security incidents (AWS Route 53 hijack, Turkish Telecom leak). Network security engineers at large organizations and ISPs need to understand routing security, RPKI, and hijacking response procedures.",
  toolRelevance: [
    "BGPmon / RouteViews (routing anomaly detection)",
    "RPKI Validator (Cloudflare, RIPE NCC)",
    "ARIN / RIPE RPKI ROA management",
    "BGPlay (BGP visualization)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
