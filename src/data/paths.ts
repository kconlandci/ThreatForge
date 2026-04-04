// ============================================================
// ThreatForge — Learning Paths
// Ordered sequences of labs forming a curriculum.
// ============================================================

export interface LearningPath {
  id: string;
  title: string;
  name: string;
  description: string;
  targetAudience: string;
  labIds: string[];
  icon: string;
}

export const learningPaths: LearningPath[] = [
  {
    id: "soc-analyst-foundations",
    title: "SOC Analyst Foundations",
    name: "SOC Analyst Foundations",
    description:
      "Build the core judgment skills every SOC analyst needs — from phishing triage to incident escalation.",
    targetAudience: "Career changers, entry-level IT moving to security",
    icon: "Shield",
    labIds: [
      // --- FREE labs (easy → moderate → challenging) ---
      "phishing-email-triage",
      "password-spraying-detection",
      "suspicious-process-investigation",
      "email-header-forensics",
      "security-awareness-response",
      "physical-security-assessment",
      "change-management-security",
      "credential-stuffing-detection",
      "password-hygiene-audit",
      "phishing-link-analysis",
      "email-attachment-safety",
      "siem-auth-log-review",
      "siem-alert-correlation",
      "malware-indicator-analysis",
      "powershell-obfuscation-detection",
      "ai-generated-phishing-detection",
      "deepfake-voice-phishing",
      "docker-escape-detection",
      "lolbins-detection",
      // --- PREMIUM labs (moderate → challenging) ---
      "privilege-escalation-detection",
      "brute-force-spray-detection",
      "log-hunter-lateral-movement",
      "incident-escalation-judgment",
    ],
  },
  {
    id: "network-infrastructure-defense",
    title: "Network & Infrastructure Defense",
    name: "Network & Infrastructure Defense",
    description:
      "Master network security fundamentals — from port management to cloud IAM and endpoint hardening.",
    targetAudience: "IT admins, network engineers moving into security",
    icon: "Server",
    labIds: [
      // --- FREE labs (easy → moderate → challenging) ---
      "port-exposure",
      "firewall-rule-hardening",
      "access-control-review",
      "vpn-remote-access-hardening",
      "evil-twin-wifi-defense",
      "tls-misconfiguration-audit",
      "waf-configuration-review",
      "sql-injection-detection",
      "wifi-security-remote-workers",
      "browser-extension-security",
      "public-wifi-threat-assessment",
      "wireless-rogue-ap-detection",
      "network-traffic-analysis",
      "s3-bucket-exposure",
      "dns-cache-poisoning-response",
      "pci-dss-compliance-gap",
      "secrets-management-review",
      "ssrf-attack-response",
      "xss-identification",
      "bgp-hijacking-detection",
      "command-injection-patterns",
      "hipaa-technical-safeguards",
      "sox-it-controls-review",
      // --- PREMIUM labs (moderate → challenging) ---
      "network-segmentation-plan",
      "certificate-management-audit",
      "endpoint-hardening-audit",
      "cloud-iam-misconfiguration",
      "security-architecture-review",
    ],
  },
  {
    id: "threat-response-remediation",
    title: "Threat Response & Remediation",
    name: "Threat Response & Remediation",
    description:
      "Practice real incident response — from social engineering to ransomware to supply chain threats.",
    targetAudience: "Aspiring incident responders, blue team practitioners",
    icon: "Flame",
    labIds: [
      // --- FREE labs (easy → moderate → challenging) ---
      "endpoint-isolation",
      "mfa-fatigue-defense",
      "social-engineering-response",
      "incident-documentation-review",
      "usb-drop-attack-response",
      "qr-code-phishing-detection",
      "web-app-vulnerability-triage",
      "backup-disaster-recovery",
      "vulnerability-disclosure-triage",
      "linux-privilege-escalation",
      "gdpr-breach-notification",
      "vendor-risk-assessment",
      "shadow-it-discovery",
      "social-media-osint-awareness",
      "database-security-response",
      // --- PREMIUM labs (moderate → challenging) ---
      "ransomware-containment",
      "insider-threat-assessment",
      "vulnerability-prioritization",
      "data-loss-prevention-triage",
      "financial-transaction-monitoring",
      "mobile-device-security-assessment",
      "dns-threat-analysis",
      "healthcare-compliance-incident",
      "incident-communication-judgment",
      "supply-chain-risk-assessment",
      "security-policy-exception-review",
      "forensic-image-analysis",
      "ir-tabletop-exercise",
      "zero-day-vulnerability-response",
    ],
  },
  {
    id: "identity-cloud-security",
    title: "Identity & Cloud Security",
    name: "Identity & Cloud Security",
    description:
      "Secure identities, credentials, and cloud infrastructure — from SSO hardening to container security.",
    targetAudience:
      "Cloud engineers, IAM administrators, DevSecOps practitioners",
    icon: "Cloud",
    labIds: [
      // --- FREE labs (easy → moderate → challenging) ---
      "cloud-security-group-audit",
      "access-recertification",
      "api-security-misconfiguration",
      "cicd-pipeline-security",
      "kubernetes-security-audit",
      "kerberoasting-detection",
      "golden-ticket-detection",
      "ad-hardening-review",
      "oauth-token-theft-detection",
      // --- PREMIUM labs (moderate → challenging) ---
      "sso-authentication-hardening",
      "api-key-exposure-response",
      "cloud-iam-misconfiguration",
      "cloud-container-security",
      "cloud-logging-investigation",
      "soc-alert-fatigue-management",
      "zero-trust-access-review",
      "mitre-attack-mapping",
      "threat-intel-report-analysis",
      "red-team-blue-team-scenario",
      "cloud-security-posture-assessment",
      "threat-hunting-hypothesis",
    ],
  },
];
