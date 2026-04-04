import type { LabManifest } from "../../types/manifest";

export const portExposureLab: LabManifest = {
  schemaVersion: "1.1",
  id: "port-exposure",
  version: 1,
  title: "Port Exposure",

  tier: "beginner",
  track: "network-defense",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["ports", "firewall", "nmap", "hardening", "least-privilege"],

  description:
    "Analyze open ports on network hosts and close unnecessary services using the Principle of Least Privilege. Each misconfigured port is a potential entry point.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify which ports are required for a system's role",
    "Close unnecessary ports to reduce attack surface",
    "Explain why cleartext and legacy protocols are dangerous",
  ],
  sortOrder: 50,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "pe-001",
      title: "The Public Web Server",
      description:
        "External web server (203.0.113.42) is showing unexpected open ports. Close any ports that aren't strictly necessary for a standard web server.",
      targetSystem: "Web-SRV-01",
      items: [
        {
          id: "p80",
          label: "Port 80 — HTTP",
          detail: "Standard unencrypted web traffic.",
          currentState: "open",
          correctState: "open",
          states: ["open", "closed"],
          rationaleId: "j-web",
        },
        {
          id: "p443",
          label: "Port 443 — HTTPS",
          detail: "Encrypted web traffic via TLS.",
          currentState: "open",
          correctState: "open",
          states: ["open", "closed"],
          rationaleId: "j-web",
        },
        {
          id: "p21",
          label: "Port 21 — FTP",
          detail: "File Transfer Protocol. Sends credentials in cleartext.",
          currentState: "open",
          correctState: "closed",
          states: ["open", "closed"],
          rationaleId: "j-clear",
        },
        {
          id: "p23",
          label: "Port 23 — Telnet",
          detail: "Remote shell access. Unencrypted and obsolete.",
          currentState: "open",
          correctState: "closed",
          states: ["open", "closed"],
          rationaleId: "j-insecure",
        },
      ],
      rationales: [
        { id: "j-web", text: "Essential for public web traffic." },
        { id: "j-clear", text: "Cleartext protocol; use SFTP instead." },
        { id: "j-insecure", text: "Obsolete/unencrypted; high security risk." },
        { id: "j-mgmt", text: "Management port; restrict to VPN only." },
      ],
      feedback: {
        perfect: "Configuration matches best practices. Attack surface minimized.",
        partial: "Some ports are misconfigured. Review which services a web server actually needs.",
        wrong: "Multiple ports are wrong. A public web server only needs HTTP (80) and HTTPS (443).",
      },
    },
    {
      type: "toggle-config",
      id: "pe-002",
      title: "The Database Shadow",
      description:
        "A staging database (10.0.5.12) has management ports exposed to the internal network. Harden the surface while keeping data accessible.",
      targetSystem: "DB-STAGE-05",
      items: [
        {
          id: "p3306",
          label: "Port 3306 — MySQL",
          detail: "Primary database communication port for applications.",
          currentState: "open",
          correctState: "open",
          states: ["open", "closed"],
          rationaleId: "j-db",
        },
        {
          id: "p3389",
          label: "Port 3389 — RDP",
          detail: "Remote Desktop Protocol. Common ransomware entry vector.",
          currentState: "open",
          correctState: "closed",
          states: ["open", "closed"],
          rationaleId: "j-rdp",
        },
        {
          id: "p445",
          label: "Port 445 — SMB",
          detail: "Windows file sharing. Frequently exploited for lateral movement.",
          currentState: "open",
          correctState: "closed",
          states: ["open", "closed"],
          rationaleId: "j-smb",
        },
      ],
      rationales: [
        { id: "j-db", text: "Required for app-to-DB communication." },
        { id: "j-rdp", text: "Remote Desktop should not be exposed on a database server." },
        { id: "j-smb", text: "SMB is often used for lateral movement and should be disabled." },
        { id: "j-web", text: "Standard web traffic port." },
      ],
      feedback: {
        perfect: "Database hardened correctly. Only the necessary MySQL port remains open.",
        partial: "Close, but one port is misconfigured. A database server doesn't need RDP or SMB.",
        wrong: "Critical misconfiguration. RDP and SMB on a database server are major attack vectors.",
      },
    },
    {
      type: "toggle-config",
      id: "pe-003",
      title: "The IoT Gateway",
      description:
        "An IoT gateway device (10.0.8.1) was deployed with default settings. Review its open ports and lock down management interfaces.",
      targetSystem: "IOT-GW-01",
      items: [
        {
          id: "p8883",
          label: "Port 8883 — MQTT/TLS",
          detail: "Encrypted MQTT for IoT device telemetry.",
          currentState: "open",
          correctState: "open",
          states: ["open", "closed"],
          rationaleId: "j-mqtt",
        },
        {
          id: "p1883",
          label: "Port 1883 — MQTT (plaintext)",
          detail: "Unencrypted MQTT. Exposes device commands in transit.",
          currentState: "open",
          correctState: "closed",
          states: ["open", "closed"],
          rationaleId: "j-clear-mqtt",
        },
        {
          id: "p22",
          label: "Port 22 — SSH",
          detail: "Secure remote management. Should be VPN-restricted in production.",
          currentState: "open",
          correctState: "closed",
          states: ["open", "closed"],
          rationaleId: "j-ssh",
        },
        {
          id: "p80",
          label: "Port 80 — HTTP Admin Panel",
          detail: "Web-based management UI served over plaintext.",
          currentState: "open",
          correctState: "closed",
          states: ["open", "closed"],
          rationaleId: "j-admin",
        },
      ],
      rationales: [
        { id: "j-mqtt", text: "Encrypted MQTT is required for secure device communication." },
        { id: "j-clear-mqtt", text: "Plaintext MQTT exposes sensor data and commands to network sniffing." },
        { id: "j-ssh", text: "SSH management should only be accessible through a VPN, not exposed directly." },
        { id: "j-admin", text: "HTTP admin panels transmit credentials in plaintext and should be disabled." },
      ],
      feedback: {
        perfect: "Gateway secured. Only encrypted MQTT remains for device communication.",
        partial: "Partially hardened. Management interfaces and plaintext protocols should be closed on production gateways.",
        wrong: "Multiple misconfigurations. Default IoT settings leave management and plaintext channels wide open.",
      },
    },
  ],

  hints: [
    "Web servers typically only need ports 80 and 443 open to the public.",
    "Database servers should only expose the database port itself, not management protocols like RDP or SMB.",
    "Any cleartext protocol (FTP, Telnet, plaintext MQTT) is a security risk and should be replaced with its encrypted counterpart.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: {
      perfect: 0,
      partial: 10,
      wrong: 20,
    },
    passingThresholds: {
      pass: 80,
      partial: 50,
    },
  },

  careerInsight:
    "Effective Network Defense starts with visibility. In a SOC environment, you'll use tools like Nmap, Nessus, or Qualys to find and remediate port exposures before attackers exploit them.",
  toolRelevance: [
    "Nmap (network scanning)",
    "Nessus / Qualys (vulnerability scanning)",
    "iptables / Windows Firewall (port management)",
  ],

  createdAt: "2026-03-22",
  updatedAt: "2026-03-22",
};
