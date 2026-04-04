import type { LabManifest } from "../../types/manifest";

export const firewallRuleHardeningLab: LabManifest = {
  schemaVersion: "1.1",
  id: "firewall-rule-hardening",
  version: 1,
  title: "Firewall Rule Hardening",

  tier: "beginner",
  track: "network-defense",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["firewall", "acl", "deny", "allow", "segmentation", "least-privilege"],

  description:
    "Review firewall traffic logs and decide whether to ALLOW or DENY each connection. Justify your decision with the correct security rationale.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Evaluate network traffic against firewall policy best practices",
    "Distinguish legitimate business traffic from risky connections",
    "Apply the principle of least privilege to firewall rules",
  ],
  sortOrder: 10,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "fw-001",
      title: "SSH to Public Web Server",
      description:
        "External source (192.168.1.50) is requesting SSH access to the corporate web server (10.0.1.10). Management wants remote admin access for a contractor.",
      targetSystem: "DMZ — Web_Server_01",
      items: [
        {
          id: "rule-ssh",
          label: "External_Any → Web_Server_01 (SSH/22)",
          detail: "Contractor requests remote SSH access to the public web server from the internet.",
          currentState: "ALLOW",
          correctState: "DENY",
          states: ["ALLOW", "DENY"],
          rationaleId: "r-ssh-deny",
        },
        {
          id: "rule-https",
          label: "External_Any → Web_Server_01 (HTTPS/443)",
          detail: "Public HTTPS traffic to the web server serving the corporate website.",
          currentState: "ALLOW",
          correctState: "ALLOW",
          states: ["ALLOW", "DENY"],
          rationaleId: "r-https-allow",
        },
      ],
      rationales: [
        { id: "r-ssh-deny", text: "SSH exposed to the public internet is a high brute-force risk. Use VPN or bastion hosts instead." },
        { id: "r-ssh-allow", text: "Enable for contractor efficiency and update speed." },
        { id: "r-https-allow", text: "HTTPS is the expected public service on a web server and must remain open for business operations." },
      ],
      feedback: {
        perfect: "Excellent. SSH should never be exposed directly to the internet. Use VPNs or bastion hosts.",
        partial: "Action or reasoning was incorrect. Convenience does not override the risk of exposing Port 22.",
        wrong: "Critical risk. Exposing SSH to the public internet invites immediate brute-force attacks.",
      },
    },
    {
      type: "toggle-config",
      id: "fw-002",
      title: "App Server to Production Database",
      description:
        "Application server (10.0.2.5) needs to query the production database (10.0.5.20) on MSSQL port 1433 to display user profiles.",
      targetSystem: "Internal — App_Cluster → DB_Prod_01",
      items: [
        {
          id: "rule-mssql",
          label: "App_Cluster → DB_Prod_01 (MSSQL/1433)",
          detail: "Standard multi-tier architecture: application server queries the database on the SQL port.",
          currentState: "DENY",
          correctState: "ALLOW",
          states: ["ALLOW", "DENY"],
          rationaleId: "r-sql-allow",
        },
        {
          id: "rule-rdp-db",
          label: "App_Cluster → DB_Prod_01 (RDP/3389)",
          detail: "Developer requests RDP access from the app server to the database server for debugging.",
          currentState: "ALLOW",
          correctState: "DENY",
          states: ["ALLOW", "DENY"],
          rationaleId: "r-rdp-deny",
        },
      ],
      rationales: [
        { id: "r-sql-allow", text: "Required business traffic on a standard SQL port between app and database tiers." },
        { id: "r-sql-deny", text: "Databases should only be accessed via physical console for maximum security." },
        { id: "r-rdp-deny", text: "RDP to a production database server from the app tier violates least privilege. Use a dedicated management network for admin access." },
      ],
      feedback: {
        perfect: "Correct. Standard multi-tier architecture requires app servers to reach database servers on specific ports.",
        partial: "Check your logic. This is legitimate business traffic required for the application to function.",
        wrong: "Incorrect. Blocking this traffic would cause a Denial of Service for the application.",
      },
    },
    {
      type: "toggle-config",
      id: "fw-003",
      title: "Guest WiFi to Domain Controller",
      description:
        "A guest device (172.16.0.44) on the visitor WiFi is scanning the network and attempting to reach the Domain Controller (10.0.0.1) on SMB port 445.",
      targetSystem: "Guest_WLAN → Domain_Controller",
      items: [
        {
          id: "rule-smb",
          label: "Guest_WLAN → Domain_Controller (SMB/445)",
          detail: "A visitor is trying to 'find a printer' and their laptop is scanning the network.",
          currentState: "ALLOW",
          correctState: "DENY",
          states: ["ALLOW", "DENY"],
          rationaleId: "r-smb-deny",
        },
        {
          id: "rule-guest-internet",
          label: "Guest_WLAN → Internet (HTTPS/443)",
          detail: "Guest devices need internet access for email and web browsing during their visit.",
          currentState: "DENY",
          correctState: "ALLOW",
          states: ["ALLOW", "DENY"],
          rationaleId: "r-guest-internet-allow",
        },
      ],
      rationales: [
        { id: "r-smb-deny", text: "Guest segmentation violation; guests must never reach internal infrastructure like Domain Controllers." },
        { id: "r-smb-allow", text: "Allow printing services for guests visiting the office." },
        { id: "r-guest-internet-allow", text: "Guests should have outbound internet access — this is expected and does not expose internal resources." },
      ],
      feedback: {
        perfect: "Secure. Guests should never have direct access to internal infrastructure like Domain Controllers.",
        partial: "Review the segmentation strategy. Guests are untrusted and must be isolated.",
        wrong: "Dangerous. Allowing SMB access from guests exposes the core network to ransomware propagation.",
      },
    },
  ],

  hints: [
    "Check the destination port. Is it a management port like 22 or 445?",
    "Consider the source zone. Should 'Guest' or 'Public' traffic reach 'Internal' systems?",
    "Does the business break if you deny this? App-to-DB traffic is usually required.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Effective firewall management isn't just about technical rules — it's about understanding business flows. In a SOC, you must justify every DENY to management and every ALLOW to the security auditors. Context is your strongest tool.",
  toolRelevance: [
    "pfSense / Palo Alto (firewall management)",
    "Cisco ASA / Firepower",
    "AWS Security Groups / Azure NSGs",
  ],

  createdAt: "2026-03-22",
  updatedAt: "2026-03-22",
};
