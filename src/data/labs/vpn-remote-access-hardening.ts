import type { LabManifest } from "../../types/manifest";

export const vpnRemoteAccessHardeningLab: LabManifest = {
  schemaVersion: "1.1",
  id: "vpn-remote-access-hardening",
  version: 1,
  title: "VPN & Remote Access Hardening",

  tier: "beginner",
  track: "network-defense",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["vpn", "remote-access", "encryption", "split-tunnel", "mfa", "hardening"],

  description:
    "Review and harden VPN gateway configurations to ensure secure remote access with proper encryption, authentication, and traffic handling policies.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify insecure VPN encryption and authentication settings",
    "Evaluate split-tunnel vs full-tunnel configurations for security trade-offs",
    "Configure VPN settings that balance security with usability",
  ],
  sortOrder: 350,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "vpn-001",
      title: "Corporate VPN Gateway",
      description:
        "The main corporate VPN gateway was deployed years ago and still uses legacy settings. Review each configuration and update to current security standards.",
      targetSystem: "VPN-GW-01 (Palo Alto GlobalProtect)",
      items: [
        {
          id: "encryption",
          label: "Encryption Protocol",
          detail: "The VPN tunneling protocol that determines encryption strength and security.",
          currentState: "PPTP",
          correctState: "IKEv2/IPSec",
          states: ["PPTP", "L2TP", "IKEv2/IPSec", "WireGuard"],
          rationaleId: "rat-proto",
        },
        {
          id: "mfa",
          label: "Multi-Factor Authentication",
          detail: "Requires a second factor beyond username/password for VPN login.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-mfa",
        },
        {
          id: "split-tunnel",
          label: "Split Tunneling",
          detail: "When enabled, only corporate traffic goes through the VPN; internet traffic goes direct.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-split",
        },
        {
          id: "idle-timeout",
          label: "Idle Session Timeout",
          detail: "Automatically disconnects VPN sessions after a period of inactivity.",
          currentState: "none",
          correctState: "15min",
          states: ["none", "15min", "30min", "60min"],
          rationaleId: "rat-timeout",
        },
      ],
      rationales: [
        { id: "rat-proto", text: "PPTP has known cryptographic weaknesses and can be cracked in real-time. IKEv2/IPSec provides strong encryption with modern cipher suites." },
        { id: "rat-mfa", text: "VPN credentials are high-value targets. MFA prevents access even when passwords are compromised through phishing or credential stuffing." },
        { id: "rat-split", text: "Split tunneling allows internet traffic to bypass corporate security controls, creating a bridge between untrusted networks and the corporate LAN." },
        { id: "rat-timeout", text: "Idle sessions left connected create persistent attack windows if the endpoint is compromised or left unattended." },
      ],
      feedback: {
        perfect: "VPN gateway fully hardened with modern encryption, MFA, full tunneling, and session management.",
        partial: "Some settings are still insecure. PPTP and missing MFA are the highest-priority items to fix.",
        wrong: "Critical vulnerabilities remain. PPTP encryption can be broken in real-time, and missing MFA leaves the VPN exposed to credential attacks.",
      },
    },
    {
      type: "toggle-config",
      id: "vpn-002",
      title: "Contractor Access VPN Profile",
      description:
        "Contractors need VPN access to specific internal systems. Configure the contractor VPN profile with appropriate restrictions.",
      targetSystem: "VPN-CONTRACTOR Profile",
      items: [
        {
          id: "scope",
          label: "Network Access Scope",
          detail: "Controls which internal networks contractors can reach through the VPN.",
          currentState: "full-network",
          correctState: "restricted-subnet",
          states: ["full-network", "restricted-subnet"],
          rationaleId: "rat-scope",
        },
        {
          id: "session-recording",
          label: "Session Recording",
          detail: "Records all contractor VPN activity for audit and compliance purposes.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-recording",
        },
        {
          id: "cert-auth",
          label: "Certificate-Based Authentication",
          detail: "Requires a client certificate in addition to credentials for VPN connection.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-cert",
        },
        {
          id: "concurrent",
          label: "Concurrent Session Limit",
          detail: "Controls how many simultaneous VPN connections a single contractor account can have.",
          currentState: "unlimited",
          correctState: "single",
          states: ["unlimited", "single", "two"],
          rationaleId: "rat-concurrent",
        },
      ],
      rationales: [
        { id: "rat-scope", text: "Contractors should only access systems they need. Full network access violates least privilege and increases breach impact." },
        { id: "rat-recording", text: "Session recording provides audit trail for contractor activity — essential for compliance and incident investigation." },
        { id: "rat-cert", text: "Certificate auth binds VPN access to managed devices, preventing credential sharing or use from unauthorized machines." },
        { id: "rat-concurrent", text: "Single session prevents credential sharing and makes it easier to detect if a contractor account is compromised." },
      ],
      feedback: {
        perfect: "Contractor VPN profile properly restricted with subnet isolation, session recording, certificate auth, and single-session enforcement.",
        partial: "Some restrictions are missing. Contractor access should always be more tightly controlled than employee access.",
        wrong: "Contractor access is too permissive. Full network access with no recording or session limits creates significant security and compliance risk.",
      },
    },
    {
      type: "toggle-config",
      id: "vpn-003",
      title: "Remote Developer VPN",
      description:
        "The developer VPN profile uses outdated TLS settings and lacks security features. Update it to current standards.",
      targetSystem: "VPN-DEV-01 (OpenVPN)",
      items: [
        {
          id: "tls-version",
          label: "TLS Protocol Version",
          detail: "The TLS version used for the VPN control channel encryption.",
          currentState: "SSLv3",
          correctState: "TLS1.3",
          states: ["SSLv3", "TLS1.0", "TLS1.2", "TLS1.3"],
          rationaleId: "rat-tls",
        },
        {
          id: "dns-leak",
          label: "DNS Leak Protection",
          detail: "Prevents DNS queries from bypassing the VPN tunnel and revealing browsing activity.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-dns",
        },
        {
          id: "kill-switch",
          label: "VPN Kill Switch",
          detail: "Blocks all internet traffic if the VPN connection drops unexpectedly.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-killswitch",
        },
        {
          id: "logging",
          label: "Connection Logging",
          detail: "Records VPN connection events, durations, and source IPs for security monitoring.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-log",
        },
      ],
      rationales: [
        { id: "rat-tls", text: "SSLv3 is vulnerable to POODLE and other attacks. TLS 1.3 eliminates legacy cipher suites and reduces handshake latency." },
        { id: "rat-dns", text: "DNS leaks expose which sites users visit even when connected to the VPN, undermining privacy and security." },
        { id: "rat-killswitch", text: "Without a kill switch, a VPN disconnect silently exposes traffic on untrusted networks like coffee shop Wi-Fi." },
        { id: "rat-log", text: "Connection logs are essential for detecting unauthorized access patterns and supporting incident investigation." },
      ],
      feedback: {
        perfect: "Developer VPN modernized with TLS 1.3, DNS leak protection, kill switch, and comprehensive logging.",
        partial: "Some legacy settings remain. SSLv3 is the highest priority — it has known critical vulnerabilities.",
        wrong: "SSLv3 on a VPN is a critical vulnerability. Multiple attacks can decrypt SSLv3 traffic in real-time.",
      },
    },
  ],

  hints: [
    "PPTP and SSLv3 are broken protocols — any modern VPN should use IKEv2/IPSec, WireGuard, or TLS 1.2+ at minimum.",
    "Contractor VPN profiles should always be more restrictive than employee profiles — limit network scope and enforce session recording.",
    "DNS leak protection and kill switches prevent data exposure when VPN connections are unstable.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "VPN security is foundational for network administrators and security engineers. Misconfigured VPNs have been the initial entry point for some of the largest enterprise breaches.",
  toolRelevance: [
    "OpenVPN",
    "WireGuard",
    "Cisco AnyConnect",
    "Palo Alto GlobalProtect",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
