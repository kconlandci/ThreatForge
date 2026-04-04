import type { LabManifest } from "../../types/manifest";

export const cloudSecurityGroupAuditLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cloud-security-group-audit",
  version: 1,
  title: "Cloud Security Group Misconfiguration Audit",

  tier: "beginner",
  track: "cloud-security",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["aws", "security-groups", "firewall", "cloud-security", "network-access-control", "least-privilege"],

  description:
    "Audit AWS security group configurations to identify overly permissive inbound rules, unrestricted administrative access, and missing egress controls that expose cloud resources to internet-facing attacks.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify overly permissive security group rules that expose services to the public internet",
    "Apply least-privilege network access principles to cloud firewall rules",
    "Configure appropriate inbound and egress controls for common cloud resource types",
  ],
  sortOrder: 610,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "sg-001",
      title: "Production Web Application Security Groups",
      description:
        "Review and fix the security group rules for a production web application. All rules currently allow unrestricted inbound access.",
      targetSystem: "prod-web-app — AWS Security Group sg-0abc123",
      items: [
        {
          id: "ssh-access",
          label: "SSH Access (Port 22)",
          detail: "Inbound SSH for server administration. Currently open to the entire internet (0.0.0.0/0).",
          currentState: "0.0.0.0/0",
          correctState: "bastion-ip-only",
          states: ["0.0.0.0/0", "bastion-ip-only", "disabled"],
          rationaleId: "rat-ssh",
        },
        {
          id: "rdp-access",
          label: "RDP Access (Port 3389)",
          detail: "Remote Desktop for Windows instances. Currently open to the entire internet.",
          currentState: "0.0.0.0/0",
          correctState: "disabled",
          states: ["0.0.0.0/0", "vpn-cidr-only", "disabled"],
          rationaleId: "rat-rdp",
        },
        {
          id: "database-port",
          label: "Database Port (5432 PostgreSQL)",
          detail: "Direct database access. Currently open to the internet.",
          currentState: "0.0.0.0/0",
          correctState: "app-tier-sg-only",
          states: ["0.0.0.0/0", "app-tier-sg-only", "office-ip-only"],
          rationaleId: "rat-db",
        },
        {
          id: "https-access",
          label: "HTTPS Access (Port 443)",
          detail: "Public web application traffic. Currently open to the internet.",
          currentState: "0.0.0.0/0",
          correctState: "0.0.0.0/0",
          states: ["0.0.0.0/0", "cloudfront-ips-only"],
          rationaleId: "rat-https",
        },
      ],
      rationales: [
        { id: "rat-ssh", text: "SSH open to 0.0.0.0/0 is a primary target for automated brute-force attacks. Restrict to the bastion host IP or security group — never expose SSH directly to the internet." },
        { id: "rat-rdp", text: "RDP exposed to the internet is the top ransomware entry vector. If no Windows instances are in this tier, disable entirely. Otherwise, restrict to VPN CIDR." },
        { id: "rat-db", text: "Database ports should never be accessible from the internet. Use security group references to allow only the application tier security group to reach the database." },
        { id: "rat-https", text: "HTTPS (443) for a public web application legitimately requires internet access (0.0.0.0/0). This is the intended behavior for serving web traffic." },
      ],
      feedback: {
        perfect: "Security groups hardened: SSH restricted to bastion, RDP disabled, database only accessible from app tier, HTTPS correctly open.",
        partial: "Some administrative ports remain open to the internet. SSH and RDP exposed to 0.0.0.0/0 are among the most exploited entry vectors.",
        wrong: "SSH and database ports open to 0.0.0.0/0 are critical misconfigurations. These are continuously probed by automated scanners worldwide.",
      },
    },
    {
      type: "toggle-config",
      id: "sg-002",
      title: "Internal Service Tier Security Groups",
      description:
        "Audit security groups for internal microservices that should only communicate with specific other services.",
      targetSystem: "microservices-tier — Internal Communication Rules",
      items: [
        {
          id: "inter-service",
          label: "Inter-Service API Communication",
          detail: "Controls which services can call the payments API. Currently allows all internal traffic.",
          currentState: "all-internal-vpc",
          correctState: "specific-caller-sgs",
          states: ["all-internal-vpc", "specific-caller-sgs"],
          rationaleId: "rat-inter-service",
        },
        {
          id: "admin-port",
          label: "Admin/Debug Port (8080)",
          detail: "Internal admin interface currently open to all VPC CIDR ranges.",
          currentState: "full-vpc-cidr",
          correctState: "ops-subnet-only",
          states: ["full-vpc-cidr", "ops-subnet-only", "disabled"],
          rationaleId: "rat-admin",
        },
        {
          id: "egress-rules",
          label: "Outbound Egress Rules",
          detail: "Controls what external destinations the application server can connect to.",
          currentState: "all-traffic-any-destination",
          correctState: "required-ports-only",
          states: ["all-traffic-any-destination", "required-ports-only"],
          rationaleId: "rat-egress",
        },
        {
          id: "icmp-rules",
          label: "ICMP (Ping) Rules",
          detail: "Controls ICMP traffic to the internal services.",
          currentState: "all-icmp-0.0.0.0/0",
          correctState: "disabled",
          states: ["all-icmp-0.0.0.0/0", "vpc-cidr-only", "disabled"],
          rationaleId: "rat-icmp",
        },
      ],
      rationales: [
        { id: "rat-inter-service", text: "Allowing all internal VPC traffic to reach the payments API violates least privilege. If a frontend service is compromised, it should not be able to call the payments internal API directly. Reference specific caller security groups." },
        { id: "rat-admin", text: "Admin interfaces accessible across all VPC subnets expose administrative functionality to any compromised workload in the environment. Restrict to the specific operations subnet." },
        { id: "rat-egress", text: "Unrestricted outbound egress enables compromised instances to beacon to C2 servers, exfiltrate data, and download attack tools. Restrict egress to required destinations and ports only." },
        { id: "rat-icmp", text: "ICMP from the public internet enables network reconnaissance. Internal services don't need to respond to public ping requests — restrict to VPC or disable entirely." },
      ],
      feedback: {
        perfect: "Internal services properly segmented: specific caller SGs, restricted admin access, limited egress, and ICMP disabled.",
        partial: "Broad VPC-wide access or unrestricted egress remain. Lateral movement after a compromise is much easier when all internal services can reach each other.",
        wrong: "All-internal VPC with unrestricted egress means any single compromised workload can reach all other services and beacon to external C2. Micro-segmentation is required.",
      },
    },
    {
      type: "toggle-config",
      id: "sg-003",
      title: "Database Tier Security Group Hardening",
      description:
        "Review the RDS database security group and network access controls for the production database cluster.",
      targetSystem: "prod-rds-cluster — Database Security Group",
      items: [
        {
          id: "db-inbound",
          label: "Database Inbound Access",
          detail: "Controls which resources can connect to the RDS database cluster.",
          currentState: "app-and-dev-and-analytics",
          correctState: "app-tier-sg-only",
          states: ["app-and-dev-and-analytics", "app-tier-sg-only"],
          rationaleId: "rat-db-inbound",
        },
        {
          id: "backup-access",
          label: "Database Backup Access",
          detail: "Controls network access for database backup operations.",
          currentState: "any-host-port-3306",
          correctState: "backup-service-sg",
          states: ["any-host-port-3306", "backup-service-sg"],
          rationaleId: "rat-backup",
        },
        {
          id: "multi-az",
          label: "Multi-AZ Replication Traffic",
          detail: "Controls whether replication traffic between AZs uses a restricted CIDR.",
          currentState: "all-vpc-cidr",
          correctState: "rds-subnet-group-only",
          states: ["all-vpc-cidr", "rds-subnet-group-only"],
          rationaleId: "rat-multi-az",
        },
        {
          id: "public-accessibility",
          label: "RDS Public Accessibility",
          detail: "Controls whether the RDS cluster is accessible from the public internet.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-public",
        },
      ],
      rationales: [
        { id: "rat-db-inbound", text: "Developer workstations and analytics platforms reaching the production database directly creates significant risk — developer machines are frequently compromised. Route analytics through a read replica or data warehouse; use VPN bastion for DBA access." },
        { id: "rat-backup", text: "Backup access from any host on port 3306 means any compromised internal system can connect to the database claiming to be a backup service. Restrict to the specific backup service security group." },
        { id: "rat-multi-az", text: "All-VPC-CIDR for replication is broader than necessary. Restrict to the RDS subnet group CIDR to limit which VPC resources could potentially intercept replication traffic." },
        { id: "rat-public", text: "RDS public accessibility means the database has an internet-routable endpoint. Even with security groups, a misconfigured rule directly exposes the database. Databases should always be in private subnets with public accessibility disabled." },
      ],
      feedback: {
        perfect: "Database tier hardened: app-tier-only access, scoped backup access, restricted replication CIDR, public accessibility disabled.",
        partial: "Developer or analytics direct database access or public accessibility remain. Production databases require strict access controls.",
        wrong: "Public RDS accessibility enabled is a critical misconfiguration — databases should never have internet-routable endpoints regardless of security group rules.",
      },
    },
  ],

  hints: [
    "Security group rules referencing other security groups (not CIDRs) are more secure — they automatically track instance IP changes and don't require CIDR management.",
    "Database ports (3306, 5432, 1433) should never appear in internet-facing security groups — databases belong in private subnets accessible only from the application tier.",
    "Restrict egress rules, not just ingress — outbound 'allow all' enables C2 beaconing and data exfiltration from compromised instances.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Misconfigured security groups are one of the most common findings in AWS security assessments. Cloud security engineers who can quickly audit and remediate security group rules are highly valued, especially in environments with hundreds of groups.",
  toolRelevance: [
    "AWS Security Hub (security group findings)",
    "AWS Config Rules (sg-ssh-restricted, sg-unrestricted-access)",
    "Prowler (cloud security tool)",
    "CloudMapper (network visualization)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
