import type { LabManifest } from "../../types/manifest";

export const zeroTrustAccessReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "zero-trust-access-review",
  version: 1,
  title: "Zero Trust Access Review",

  tier: "advanced",
  track: "identity-access",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "zero-trust",
    "vpn",
    "identity-aware-proxy",
    "mtls",
    "byod",
    "device-posture",
    "service-mesh",
  ],

  description:
    "Evaluate and harden network access controls against zero-trust principles. Migrate legacy VPNs, replace IP-based access with identity-aware proxies, secure microservice communication with mTLS, and implement BYOD security controls.",
  estimatedMinutes: 20,
  learningObjectives: [
    "Evaluate network access controls against zero-trust principles",
    "Identify gaps in traditional perimeter-based security models",
    "Apply device posture checking and continuous verification concepts",
    "Implement zero-trust for microservices with mTLS and network policies",
    "Balance BYOD flexibility with security requirements",
    "Design layered access controls beyond IP-based allowlisting",
  ],
  sortOrder: 330,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "zt-001",
      title: "Legacy VPN — Zero Trust Migration",
      description:
        "Your organization's VPN grants full network access after initial authentication. Evaluate and harden toward zero-trust principles.",
      targetSystem: "GlobalProtect VPN Gateway",
      items: [
        {
          id: "vpn-network-scope",
          label: "Network Access Scope",
          detail:
            "Defines the range of internal network resources accessible after VPN connection.",
          currentState: "Full internal network (10.0.0.0/8)",
          correctState: "Micro-segmented per user role and application",
          states: [
            "Full internal network (10.0.0.0/8)",
            "Micro-segmented per user role and application",
            "Department VLAN only",
          ],
          rationaleId: "rat-network",
        },
        {
          id: "vpn-device-posture",
          label: "Device Posture Check",
          detail:
            "Determines whether the connecting device is evaluated for security compliance before granting access.",
          currentState: "None — any device accepted",
          correctState: "Required (OS version, AV status, disk encryption)",
          states: [
            "None — any device accepted",
            "Required (OS version, AV status, disk encryption)",
            "OS version check only",
          ],
          rationaleId: "rat-posture",
        },
        {
          id: "vpn-session-validation",
          label: "Session Validation",
          detail:
            "Controls how frequently the VPN session re-verifies the user and device state.",
          currentState: "Authenticate once, valid until disconnect",
          correctState: "Continuous validation every 15 minutes",
          states: [
            "Authenticate once, valid until disconnect",
            "Continuous validation every 15 minutes",
            "Re-authenticate every 8 hours",
          ],
          rationaleId: "rat-session",
        },
        {
          id: "vpn-split-tunnel",
          label: "Split Tunneling",
          detail:
            "Controls whether all traffic or only corporate-bound traffic is routed through the VPN tunnel.",
          currentState: "Disabled — all traffic through VPN",
          correctState: "Enabled — only corporate traffic through VPN",
          states: [
            "Disabled — all traffic through VPN",
            "Enabled — only corporate traffic through VPN",
          ],
          rationaleId: "rat-split",
        },
      ],
      rationales: [
        {
          id: "rat-network",
          text: "Full network access after VPN auth violates zero-trust — users should only reach the specific applications their role requires.",
        },
        {
          id: "rat-posture",
          text: "Device posture checks ensure compromised or unmanaged devices can't access corporate resources.",
        },
        {
          id: "rat-session",
          text: "One-time authentication creates a trust-once model — continuous validation detects session hijacking and device state changes.",
        },
        {
          id: "rat-split",
          text: "Split tunneling reduces VPN bandwidth costs and improves user experience while maintaining security for corporate traffic.",
        },
      ],
      feedback: {
        perfect:
          "Excellent. You transformed a legacy trust-once VPN into a zero-trust access model: micro-segmented access, device posture verification, continuous session validation, and efficient split tunneling.",
        partial:
          "You improved some settings but the VPN still has trust-once characteristics. Every unchanged setting is a gap in your zero-trust posture.",
        wrong:
          "The VPN remains a traditional perimeter model — full network access, no device checks, authenticate-once sessions. This is the opposite of zero-trust.",
      },
    },
    {
      type: "toggle-config",
      id: "zt-002",
      title: "Application Access — Beyond IP Allowlisting",
      description:
        "Your internal application gateway uses IP-based allowlisting as its only access control. No user identity verification after the network check.",
      targetSystem: "Nginx Reverse Proxy — Internal Apps",
      items: [
        {
          id: "app-access-control",
          label: "Access Control",
          detail:
            "Defines the primary mechanism for determining who can access internal applications.",
          currentState: "IP allowlist only (10.0.0.0/8)",
          correctState: "Identity-aware proxy with per-user auth (BeyondCorp model)",
          states: [
            "IP allowlist only (10.0.0.0/8)",
            "Identity-aware proxy with per-user auth (BeyondCorp model)",
            "IP allowlist + basic auth",
          ],
          rationaleId: "rat-access",
        },
        {
          id: "app-device-trust",
          label: "Device Trust",
          detail:
            "Determines whether the connecting device is verified before granting application access.",
          currentState: "Not verified",
          correctState: "Device certificate required",
          states: [
            "Not verified",
            "Device certificate required",
            "User-agent string check",
          ],
          rationaleId: "rat-device",
        },
        {
          id: "app-authorization",
          label: "Application Authorization",
          detail:
            "Controls which applications each authenticated user is allowed to access.",
          currentState: "All authenticated users see all apps",
          correctState: "Role-based access per application",
          states: [
            "All authenticated users see all apps",
            "Role-based access per application",
          ],
          rationaleId: "rat-authz",
        },
        {
          id: "app-session-monitoring",
          label: "Session Monitoring",
          detail:
            "Defines the level of logging and monitoring for application access sessions.",
          currentState: "No logging",
          correctState: "Full session logging with anomaly detection",
          states: [
            "No logging",
            "Full session logging with anomaly detection",
            "Basic access logs only",
          ],
          rationaleId: "rat-monitoring",
        },
      ],
      rationales: [
        {
          id: "rat-access",
          text: "IP-based access assumes network location equals trust — compromised internal hosts bypass this entirely.",
        },
        {
          id: "rat-device",
          text: "Device certificates verify the specific device, not just the network it's on — critical for BYOD and remote work.",
        },
        {
          id: "rat-authz",
          text: "Not every employee needs access to every application — role-based authorization limits blast radius of compromised accounts.",
        },
        {
          id: "rat-monitoring",
          text: "Session logging with anomaly detection identifies suspicious patterns like unusual access times or rapid application switching.",
        },
      ],
      feedback: {
        perfect:
          "Excellent. You replaced IP-based trust with identity-aware access, device certificates, role-based authorization, and full session monitoring. This is the BeyondCorp model in practice.",
        partial:
          "You improved some controls but the gateway still relies on network-based trust for some decisions. Complete the transition to identity-aware access.",
        wrong:
          "IP allowlisting alone provides no real security — any compromised host on the internal network bypasses all access controls. Identity-aware access is the foundation of zero-trust.",
      },
    },
    {
      type: "toggle-config",
      id: "zt-003",
      title: "Service-to-Service Communication Hardening",
      description:
        "Your microservices architecture uses shared static API keys for inter-service communication with no encryption in transit. Harden for zero-trust.",
      targetSystem: "Kubernetes cluster — 23 microservices",
      items: [
        {
          id: "svc-auth",
          label: "Service Authentication",
          detail:
            "Defines how microservices prove their identity when communicating with each other.",
          currentState: "Shared static API key (same key for all services)",
          correctState: "Mutual TLS (mTLS) with per-service certificates",
          states: [
            "Shared static API key (same key for all services)",
            "Mutual TLS (mTLS) with per-service certificates",
            "JWT tokens from central auth service",
          ],
          rationaleId: "rat-mtls",
        },
        {
          id: "svc-network",
          label: "Network Policy",
          detail:
            "Controls which services are allowed to communicate with each other at the network layer.",
          currentState: "Flat network — all pods can reach all pods",
          correctState: "Network policies restricting traffic to declared dependencies",
          states: [
            "Flat network — all pods can reach all pods",
            "Network policies restricting traffic to declared dependencies",
            "Namespace-level isolation only",
          ],
          rationaleId: "rat-netpol",
        },
        {
          id: "svc-tokens",
          label: "Token Management",
          detail:
            "Defines the lifecycle and rotation frequency of service authentication credentials.",
          currentState: "API keys never rotated",
          correctState: "Short-lived tokens (15 min) from service mesh",
          states: [
            "API keys never rotated",
            "Short-lived tokens (15 min) from service mesh",
            "Keys rotated quarterly",
          ],
          rationaleId: "rat-tokens",
        },
        {
          id: "svc-authz",
          label: "Authorization",
          detail:
            "Controls what actions authenticated services are allowed to perform on other services.",
          currentState:
            "Authentication only — any authenticated service can call any endpoint",
          correctState:
            "Per-endpoint authorization policies (service A can call service B's /api/orders but not /api/admin)",
          states: [
            "Authentication only — any authenticated service can call any endpoint",
            "Per-endpoint authorization policies (service A can call service B's /api/orders but not /api/admin)",
          ],
          rationaleId: "rat-endpoint",
        },
      ],
      rationales: [
        {
          id: "rat-mtls",
          text: "mTLS provides both encryption and mutual authentication — each service proves its identity cryptographically.",
        },
        {
          id: "rat-netpol",
          text: "Network policies enforce the principle of least privilege at the network layer — services can only communicate with their declared dependencies.",
        },
        {
          id: "rat-tokens",
          text: "Short-lived tokens from a service mesh limit the window of compromise — if a token is stolen, it expires in minutes.",
        },
        {
          id: "rat-endpoint",
          text: "Per-endpoint authorization prevents lateral movement — even if an attacker compromises one service, they can only access the specific endpoints that service is authorized to call.",
        },
      ],
      feedback: {
        perfect:
          "Excellent. You secured all four layers of service communication: mTLS for identity, network policies for isolation, short-lived tokens for credential hygiene, and per-endpoint authorization for least privilege.",
        partial:
          "You hardened some communication channels but left gaps. A flat network or shared API keys undermine the other controls you set.",
        wrong:
          "Shared static API keys, flat networking, no rotation, and no authorization boundaries — this microservices architecture has zero trust controls. Every service is one compromise away from full lateral movement.",
      },
    },
    {
      type: "toggle-config",
      id: "zt-004",
      title: "Remote Access — BYOD Security Controls",
      description:
        "Your remote workforce accesses internal tools via browser with SSO only. No device management, no endpoint detection, and BYOD is unrestricted.",
      targetSystem: "Remote Access Infrastructure",
      items: [
        {
          id: "byod-device-trust",
          label: "Device Trust",
          detail:
            "Determines whether personal devices are evaluated before granting access to corporate resources.",
          currentState: "No verification — any device with a browser",
          correctState: "Device trust verification (managed or compliant BYOD profile)",
          states: [
            "No verification — any device with a browser",
            "Device trust verification (managed or compliant BYOD profile)",
            "Corporate-owned devices only",
          ],
          rationaleId: "rat-byod-trust",
        },
        {
          id: "byod-endpoint",
          label: "Endpoint Security",
          detail:
            "Defines what endpoint protection is required on devices accessing corporate resources.",
          currentState: "No endpoint agent required",
          correctState: "EDR agent required for access to sensitive applications",
          states: [
            "No endpoint agent required",
            "EDR agent required for access to sensitive applications",
            "Antivirus only",
          ],
          rationaleId: "rat-byod-edr",
        },
        {
          id: "byod-profile",
          label: "BYOD Profile",
          detail:
            "Controls the minimum security requirements for personal devices used for work.",
          currentState: "No restrictions",
          correctState: "Minimum requirements: OS updates, screen lock, no jailbreak/root",
          states: [
            "No restrictions",
            "Minimum requirements: OS updates, screen lock, no jailbreak/root",
            "Full MDM enrollment required",
          ],
          rationaleId: "rat-byod-min",
        },
        {
          id: "byod-session-risk",
          label: "Session Risk",
          detail:
            "Defines how session risk is assessed over the lifetime of an active session.",
          currentState: "Static session — no ongoing assessment",
          correctState:
            "Continuous risk assessment (location, behavior, device state changes)",
          states: [
            "Static session — no ongoing assessment",
            "Continuous risk assessment (location, behavior, device state changes)",
            "Periodic re-authentication (every 4 hours)",
          ],
          rationaleId: "rat-byod-risk",
        },
      ],
      rationales: [
        {
          id: "rat-byod-trust",
          text: "Device trust ensures only devices meeting minimum security standards access corporate resources — without it, a compromised personal device is a direct path in.",
        },
        {
          id: "rat-byod-edr",
          text: "EDR for sensitive applications provides visibility into endpoint threats without requiring full device management for all apps.",
        },
        {
          id: "rat-byod-min",
          text: "BYOD minimum requirements balance employee flexibility with security — requiring full MDM on personal devices reduces adoption.",
        },
        {
          id: "rat-byod-risk",
          text: "Continuous risk assessment adapts access decisions in real-time — a session that starts safe can become risky if the device leaves a trusted network or exhibits anomalous behavior.",
        },
      ],
      feedback: {
        perfect:
          "Excellent. You implemented a balanced BYOD security model: device trust verification, EDR for sensitive apps, practical minimum requirements, and continuous risk assessment. This protects the organization without alienating the remote workforce.",
        partial:
          "You improved some controls but the BYOD policy still has gaps. Unmanaged devices with static sessions are a significant risk for remote access.",
        wrong:
          "Any device with a browser can access corporate resources with no verification, no endpoint security, no restrictions, and no ongoing risk assessment. This is an open door for compromised personal devices.",
      },
    },
  ],

  hints: [
    "Zero-trust means 'never trust, always verify' — VPNs that grant full network access after one authentication are trust-once models, not zero-trust.",
    "Device trust is as important as user trust. A valid user on a compromised device is still a threat.",
    "Service-to-service communication in microservices needs the same zero-trust treatment as user-to-application access.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Zero-trust architecture is the defining security paradigm shift of this decade. Security architects who can design and implement zero-trust controls across network, identity, and device layers are commanding the highest salaries in the industry.",
  toolRelevance: [
    "Zscaler / Cloudflare Access (ZTNA)",
    "Istio / Linkerd (service mesh)",
    "CrowdStrike Falcon (endpoint posture)",
    "Google BeyondCorp (identity-aware proxy)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
