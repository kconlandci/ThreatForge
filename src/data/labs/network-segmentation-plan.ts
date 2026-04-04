import type { LabManifest } from "../../types/manifest";

export const networkSegmentationPlanLab: LabManifest = {
  schemaVersion: "1.1",
  id: "network-segmentation-plan",
  version: 1,
  title: "Network Segmentation Plan",

  tier: "intermediate",
  track: "network-defense",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: ["segmentation", "zones", "dmz", "vlan", "network-architecture", "defense-in-depth"],

  description:
    "Assign servers, databases, and management interfaces to the correct network zone (DMZ, Production, Management, Restricted) and justify each placement decision.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Classify network assets by exposure level and data sensitivity",
    "Apply zone-based segmentation principles (DMZ, Production, Management, Restricted)",
    "Explain why misplacing assets across zones creates security risks",
  ],
  sortOrder: 120,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "seg-001",
      title: "Public Web Proxy",
      description:
        "Entry point for external HTTP/S traffic. Must terminate SSL and forward requests to internal applications. Runs Ubuntu 22.04 on ports 80 and 443.",
      targetSystem: "Web-Proxy-01",
      items: [
        {
          id: "zone-proxy",
          label: "Network Zone Assignment",
          detail: "Choose the correct zone for a public-facing SSL-terminating web proxy.",
          currentState: "PRODUCTION",
          correctState: "DMZ",
          states: ["DMZ", "PRODUCTION", "MANAGEMENT", "RESTRICTED"],
          rationaleId: "r-dmz",
        },
        {
          id: "proxy-logging",
          label: "Log Forwarding Destination",
          detail: "Where should the proxy forward its access and error logs?",
          currentState: "PRODUCTION",
          correctState: "MANAGEMENT",
          states: ["DMZ", "PRODUCTION", "MANAGEMENT", "RESTRICTED"],
          rationaleId: "r-log-mgmt",
        },
      ],
      rationales: [
        { id: "r-dmz", text: "Public-facing services belong in a DMZ buffer zone to prevent direct compromise of internal assets." },
        { id: "r-prod", text: "Production zone provides load balancing and high availability." },
        { id: "r-restricted", text: "Proxies require highest encryption, so they belong in the Restricted zone." },
        { id: "r-log-mgmt", text: "Log collection and SIEM infrastructure belong in the Management zone, isolated from user and production traffic." },
      ],
      feedback: {
        perfect: "Correct. The DMZ acts as a buffer between the untrusted internet and the private network.",
        partial: "Close, but public-facing nodes in Production allow attackers to pivot to all internal apps.",
        wrong: "Incorrect. Exposing a Restricted or Management zone to the internet is a critical security failure.",
      },
    },
    {
      type: "toggle-config",
      id: "seg-002",
      title: "HR Personal Records Database",
      description:
        "Contains Social Security Numbers, salaries, and home addresses for all 5,000 employees. SQL Server 2022 with AES-256 encryption. Internal only.",
      targetSystem: "HR-DB-01",
      items: [
        {
          id: "zone-hrdb",
          label: "Network Zone Assignment",
          detail: "Choose the correct zone for a database containing highly sensitive PII.",
          currentState: "PRODUCTION",
          correctState: "RESTRICTED",
          states: ["DMZ", "PRODUCTION", "MANAGEMENT", "RESTRICTED"],
          rationaleId: "r-restricted",
        },
        {
          id: "hrdb-backup",
          label: "Backup Replication Target Zone",
          detail: "Where should encrypted nightly backups of the HR database be replicated?",
          currentState: "PRODUCTION",
          correctState: "RESTRICTED",
          states: ["DMZ", "PRODUCTION", "MANAGEMENT", "RESTRICTED"],
          rationaleId: "r-backup-restricted",
        },
      ],
      rationales: [
        { id: "r-restricted", text: "High-value PII requires a Restricted zone (Crown Jewels) with strict ACLs." },
        { id: "r-prod", text: "Production allows the HR web app to query the database fastest." },
        { id: "r-mgmt", text: "Management zone allows DBAs to easily update records via SSH." },
        { id: "r-backup-restricted", text: "Backups of PII data carry the same sensitivity as the source and must remain in the Restricted zone." },
      ],
      feedback: {
        perfect: "Correct. Restricted zones provide the smallest blast radius for high-value data like SSNs and payroll.",
        partial: "While functional, standard Production zones are too broad for PII. This requires higher isolation.",
        wrong: "Incorrect. Management zones are for administrative interfaces, not for data workloads themselves.",
      },
    },
    {
      type: "toggle-config",
      id: "seg-003",
      title: "Core Switch Management Interface",
      description:
        "The virtual interface used to configure VLANs and routing tables for the entire enterprise. Supports SSH and SNMPv3. Criticality: CRITICAL.",
      targetSystem: "Core-Switch-MGMT",
      items: [
        {
          id: "zone-switch",
          label: "Network Zone Assignment",
          detail: "Choose the correct zone for the core network switch management interface.",
          currentState: "PRODUCTION",
          correctState: "MANAGEMENT",
          states: ["DMZ", "PRODUCTION", "MANAGEMENT", "RESTRICTED"],
          rationaleId: "r-mgmt",
        },
        {
          id: "switch-snmp",
          label: "SNMP Monitoring Access Zone",
          detail: "Which zone should the SNMP monitoring server reside in to poll the switch?",
          currentState: "PRODUCTION",
          correctState: "MANAGEMENT",
          states: ["DMZ", "PRODUCTION", "MANAGEMENT", "RESTRICTED"],
          rationaleId: "r-snmp-mgmt",
        },
      ],
      rationales: [
        { id: "r-mgmt", text: "Out-of-band Management zone isolates admin traffic from user data traffic." },
        { id: "r-dmz", text: "DMZ allows vendors to provide remote support if the switch fails." },
        { id: "r-prod", text: "Production zone is where the traffic flows, so the management interface belongs there." },
        { id: "r-snmp-mgmt", text: "SNMP monitoring is a management-plane function and must reside in the same Management zone as the devices it monitors." },
      ],
      feedback: {
        perfect: "Correct. Management planes should be isolated from data planes used by standard users.",
        partial: "The switch handles traffic, but the management interface is a separate control plane that needs isolation.",
        wrong: "Never expose management interfaces to the DMZ or Production. This is a critical security failure.",
      },
    },
  ],

  hints: [
    "Think about exposure: if a device talks to the internet, it belongs in a buffer zone.",
    "Consider the data: SSNs and financial data belong in the most isolated segments.",
    "Remember the planes: administrative control (SSH/RDP) should never mix with user traffic.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "In a real SOC, misclassifying a management interface into the DMZ is a resume-generating event. Always assume the control plane is as sensitive as the database itself. Zero Trust starts with correct segmentation.",
  toolRelevance: [
    "Cisco ISE (network segmentation)",
    "Palo Alto Prisma (microsegmentation)",
    "VMware NSX (virtual network zones)",
    "NIST SP 800-125B (secure virtual network configuration)",
  ],

  createdAt: "2026-03-22",
  updatedAt: "2026-03-22",
};
