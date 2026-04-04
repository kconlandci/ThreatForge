import type { LabManifest } from "../../types/manifest";

export const networkTrafficAnalysisLab: LabManifest = {
  schemaVersion: "1.1",
  id: "network-traffic-analysis",
  version: 1,
  title: "Network Traffic Analysis",

  tier: "intermediate",
  track: "network-defense",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["wireshark", "pcap", "network-analysis", "traffic-inspection", "ids", "nids"],

  description:
    "Analyze network traffic captures to identify suspicious patterns including C2 communications, data exfiltration, lateral movement, and protocol anomalies.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify malicious traffic patterns in network captures",
    "Distinguish legitimate traffic anomalies from actual threats",
    "Correlate network indicators with known attack techniques",
  ],
  sortOrder: 410,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "nta-001",
      title: "DNS Tunneling Exfiltration",
      objective:
        "IDS flagged unusual DNS traffic. Investigate the anomalous queries to determine if data is being exfiltrated.",
      investigationData: [
        {
          id: "dns-volume",
          label: "DNS Query Volume",
          content:
            "Source host 10.0.3.15 generated 4,200 DNS TXT queries in the past hour. Normal baseline for this host is ~50 queries/hour. All queries are directed to a single authoritative nameserver.",
          isCritical: true,
        },
        {
          id: "query-content",
          label: "DNS Query Content Analysis",
          content:
            'Subdomain labels contain base64-encoded strings averaging 180 characters each. Example: "dGhpcyBpcyBhIHRlc3Qgb2YgZG5z.exfil-data.suspicious-domain.net". The encoded data appears to contain fragments of CSV-formatted data.',
          isCritical: true,
        },
        {
          id: "domain-info",
          label: "Domain Intelligence",
          content:
            "suspicious-domain.net was registered 3 days ago via a privacy-shielded registrar. No legitimate web presence. The authoritative nameserver is hosted on a VPS in a known bulletproof hosting provider.",
        },
        {
          id: "source-host",
          label: "Source Host Context",
          content:
            "10.0.3.15 is a workstation in the Finance department. User logged in: akim (Financial Analyst). The host has no DNS-intensive applications that would explain the query volume.",
        },
      ],
      actions: [
        {
          id: "BLOCK_INVESTIGATE",
          label: "Block domain, isolate host, investigate for malware",
          color: "red",
        },
        {
          id: "BLOCK_DOMAIN",
          label: "Block the domain at DNS only",
          color: "orange",
        },
        {
          id: "MONITOR_TRAFFIC",
          label: "Continue monitoring for 24 hours",
          color: "yellow",
        },
        {
          id: "CLOSE_DNS",
          label: "Close — DNS spikes happen occasionally",
          color: "blue",
        },
      ],
      correctActionId: "BLOCK_INVESTIGATE",
      rationales: [
        {
          id: "rat-dns-tunnel",
          text: "The combination of high-volume TXT queries, base64-encoded subdomain labels, recently registered domain with no legitimate purpose, and a finance workstation with no DNS-intensive applications confirms DNS tunneling for data exfiltration. Full containment is required: block the domain, isolate the source to prevent further exfiltration, and investigate for the malware enabling the tunnel.",
        },
        {
          id: "rat-domain-only",
          text: "Blocking the domain alone doesn't address the malware on the host. The attacker will switch to a different domain and resume exfiltration.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring during active exfiltration allows more data to leave the network. The base64 content suggests structured data (CSV) is being stolen.",
        },
        {
          id: "rat-close",
          text: "4,200 TXT queries to a 3-day-old domain with base64 subdomains is not a normal DNS spike. This is a textbook exfiltration pattern.",
        },
      ],
      correctRationaleId: "rat-dns-tunnel",
      feedback: {
        perfect: "Excellent. You identified all the DNS tunneling indicators: abnormal volume, encoded subdomains, newly registered domain, and no legitimate explanation. Full containment prevents further data loss while investigation determines the scope.",
        partial: "You caught the threat but your response is incomplete. Blocking the domain without isolating the host leaves the malware active to use alternative channels.",
        wrong: "This is active data exfiltration via DNS tunneling. Every minute of delay means more data leaving your network.",
      },
    },
    {
      type: "investigate-decide",
      id: "nta-002",
      title: "CDN Traffic Spike — Marketing Campaign",
      objective:
        "Network monitoring flagged a significant traffic increase to external IPs. Determine if this is malicious or legitimate.",
      investigationData: [
        {
          id: "traffic-spike",
          label: "Traffic Volume Analysis",
          content:
            "Outbound HTTPS traffic increased 340% in the past 2 hours. Destination IPs resolve to CloudFront CDN (13.224.x.x range). All traffic is on port 443 with valid TLS certificates.",
        },
        {
          id: "destination-check",
          label: "Destination Verification",
          content:
            "Certificate CN matches *.cloudfront.net. SNI fields show traffic to assets.company-brand.com and cdn.company-brand.com — these are company-owned domains served via CloudFront.",
        },
        {
          id: "timing-context",
          label: "Business Context",
          content:
            "Marketing team launched a major product campaign at 10:00 AM. The company website includes new video content and interactive elements served from CloudFront. Social media posts are driving high traffic.",
        },
        {
          id: "security-check",
          label: "Security Indicators",
          content:
            "No unusual processes on source hosts. No beaconing patterns (traffic is irregular, user-driven). No DLP alerts triggered. Traffic patterns match typical web browsing behavior — varying request sizes and intervals.",
        },
      ],
      actions: [
        {
          id: "DOCUMENT_CLOSE",
          label: "Document correlation with campaign and close alert",
          color: "green",
        },
        {
          id: "THROTTLE_TRAFFIC",
          label: "Throttle outbound traffic to CloudFront",
          color: "orange",
        },
        {
          id: "BLOCK_CDN",
          label: "Block CloudFront IPs until investigated",
          color: "red",
        },
        {
          id: "ESCALATE_SOC",
          label: "Escalate to SOC for C2 analysis",
          color: "yellow",
        },
      ],
      correctActionId: "DOCUMENT_CLOSE",
      rationales: [
        {
          id: "rat-legitimate",
          text: "The traffic spike directly correlates with the marketing campaign launch. Destinations are company-owned domains on CloudFront with valid certificates. Traffic patterns are user-driven (irregular), not beaconing (regular). No security indicators are triggered. Documenting the correlation prevents future false alarms for similar campaigns.",
        },
        {
          id: "rat-throttle",
          text: "Throttling legitimate CDN traffic would degrade the marketing campaign's user experience and potentially harm the product launch.",
        },
        {
          id: "rat-block",
          text: "Blocking CloudFront would take down the company's own website and CDN-served assets, causing a self-inflicted outage.",
        },
        {
          id: "rat-escalate",
          text: "Escalating verified legitimate traffic to the SOC wastes analyst time and creates alert fatigue.",
        },
      ],
      correctRationaleId: "rat-legitimate",
      feedback: {
        perfect: "Good analysis. Correlating the traffic spike with a known business event, verifying company-owned domains, and confirming user-driven patterns efficiently resolves this as a true negative.",
        partial: "Your caution is understandable but the evidence clearly shows legitimate traffic. Over-responding to verified business events wastes resources and can impact operations.",
        wrong: "Blocking or throttling your own company's CDN traffic would cause a self-inflicted outage during a marketing launch. Always check business context for traffic spikes.",
      },
    },
    {
      type: "investigate-decide",
      id: "nta-003",
      title: "Beaconing to Cloud Storage from DMZ Server",
      objective:
        "Network monitoring detected regular outbound connections from a DMZ server. Investigate the traffic pattern.",
      investigationData: [
        {
          id: "beacon-pattern",
          label: "Connection Pattern",
          content:
            "HTTPS POST requests every 60 seconds (±2 seconds jitter) from DMZ server 172.16.0.10 to api.dropboxapi.com. Each request is exactly 256 bytes. Pattern has been active for 6 hours.",
          isCritical: true,
        },
        {
          id: "server-role",
          label: "Server Role and Policy",
          content:
            "172.16.0.10 is a web application server in the DMZ. Server role is to serve the public website. There is no business justification for this server to access Dropbox. Outbound access policy should be limited to database servers on the internal VLAN.",
          isCritical: true,
        },
        {
          id: "process-info",
          label: "Process Analysis",
          content:
            'The HTTPS connections originate from process "w3wp.exe" (IIS worker process). The process was spawned 6 hours ago — same time the beaconing started. Memory analysis shows injected code in the w3wp.exe address space.',
        },
        {
          id: "payload-analysis",
          label: "Payload Analysis",
          content:
            "The 256-byte payloads are encrypted but consistent in size. The regularity (60-second interval) and fixed payload size are hallmarks of C2 beaconing. Dropbox API is commonly used as a C2 channel because it blends with legitimate cloud traffic.",
        },
      ],
      actions: [
        {
          id: "ISOLATE_INVESTIGATE",
          label: "Isolate server and conduct full investigation",
          color: "red",
        },
        {
          id: "BLOCK_DROPBOX",
          label: "Block Dropbox access from the DMZ",
          color: "orange",
        },
        {
          id: "RESTART_IIS",
          label: "Restart the IIS service to kill the process",
          color: "yellow",
        },
        {
          id: "ALLOW_CLOUD",
          label: "Allow — cloud API traffic is normal",
          color: "blue",
        },
      ],
      correctActionId: "ISOLATE_INVESTIGATE",
      rationales: [
        {
          id: "rat-c2-beacon",
          text: "A DMZ web server making regular 60-second HTTPS calls to Dropbox API with fixed-size payloads, injected code in the IIS process, and no business justification is a confirmed C2 beacon. Isolation prevents the attacker from pivoting to internal systems while full investigation determines the initial compromise vector and scope.",
        },
        {
          id: "rat-block-dropbox",
          text: "Blocking Dropbox stops this specific channel but doesn't address the compromised IIS process. The attacker will switch to another cloud service C2 channel.",
        },
        {
          id: "rat-restart",
          text: "Restarting IIS kills the current process but destroys volatile memory evidence. If the attacker has persistence, the beacon will restart. If they don't, you've lost forensic data.",
        },
        {
          id: "rat-allow",
          text: "A DMZ web server should never access cloud storage APIs. This is not normal traffic — the beaconing pattern and injected code confirm compromise.",
        },
      ],
      correctRationaleId: "rat-c2-beacon",
      feedback: {
        perfect: "Excellent analysis. Regular intervals, fixed payload size, no business justification, and injected code in IIS all confirm C2 beaconing via Dropbox API. Isolation of a DMZ server is critical to prevent pivoting to internal networks.",
        partial: "You identified the threat but your response doesn't fully contain it. Blocking one cloud service or restarting the process doesn't address the root compromise.",
        wrong: "A DMZ server beaconing to Dropbox API with injected code in IIS is a confirmed compromise. This requires immediate isolation, not monitoring or allowing.",
      },
    },
  ],

  hints: [
    "DNS tunneling indicators: high query volume, long base64 subdomains, TXT record type, and recently registered domains with no web presence.",
    "Traffic spikes that correlate with known business events (marketing launches, deployments) are almost always legitimate. Check business context first.",
    "C2 beaconing signatures: fixed intervals, consistent payload sizes, and connections to cloud APIs from servers with no business need for that service.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Network traffic analysis is a foundational blue team skill. Wireshark proficiency and the ability to identify C2 traffic patterns are expected in nearly every security operations role.",
  toolRelevance: [
    "Wireshark",
    "Zeek (formerly Bro)",
    "Suricata IDS",
    "NetworkMiner",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
