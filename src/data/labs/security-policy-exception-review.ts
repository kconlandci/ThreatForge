import type { LabManifest } from "../../types/manifest";

export const securityPolicyExceptionReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "security-policy-exception-review",
  version: 1,
  title: "Security Policy Exception Review",

  tier: "advanced",
  track: "vulnerability-hardening",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "security-policy",
    "exception-management",
    "risk-assessment",
    "governance",
    "mfa",
    "network-security",
  ],

  description:
    "Review and decide on security policy exception requests using risk-based analysis. Evaluate proxy bypasses, MFA exemptions, production egress rules, M&A network integration, and endpoint tool exceptions to balance security with business needs.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Evaluate security policy exception requests using risk-based analysis",
    "Apply the principle of least privilege to policy exceptions",
    "Recognize when to deny exceptions and offer alternatives vs. approve with controls",
    "Scope exceptions by time, target, and access level to minimize risk",
    "Balance security requirements with legitimate business needs",
  ],
  sortOrder: 360,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "except-001",
      title: "Proxy Exception — Social Media Management Tool",
      context:
        "The marketing team requests a permanent firewall exception to bypass the web proxy for their social media management tool (Hootsuite). Reason: 'The proxy breaks Hootsuite's OAuth flow and we can't schedule posts.' They want the exception for the entire marketing VLAN (15 workstations).",
      displayFields: [
        {
          label: "Requestor",
          value: "Marketing Director — Lisa Chen",
          emphasis: "normal",
        },
        {
          label: "Tool",
          value: "Hootsuite — social media management platform",
          emphasis: "normal",
        },
        {
          label: "Scope Requested",
          value: "Entire marketing VLAN (10.0.30.0/24) — proxy bypass",
          emphasis: "warn",
        },
        {
          label: "Duration",
          value: "Permanent",
          emphasis: "warn",
        },
        {
          label: "Business Impact",
          value: "Cannot schedule social media posts — affecting campaign timeline",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "SCOPED_EXCEPTION",
          label: "Approve scoped exception — specific IPs to Hootsuite domains, 90-day review",
          color: "green",
        },
        {
          id: "APPROVE_FULL",
          label: "Approve as requested — permanent VLAN bypass",
          color: "red",
        },
        {
          id: "DENY",
          label: "Deny entirely — proxy is mandatory",
          color: "orange",
        },
        {
          id: "INVESTIGATE",
          label: "Investigate the OAuth issue with the proxy vendor",
          color: "yellow",
        },
      ],
      correctActionId: "SCOPED_EXCEPTION",
      rationales: [
        {
          id: "rat-scoped",
          text: "The business need is legitimate, but the scope is too broad — limit the exception to specific marketing workstations and only Hootsuite's domains, with a 90-day review to reassess.",
        },
        {
          id: "rat-full",
          text: "A permanent VLAN-wide proxy bypass creates an unmonitored internet path for 15 workstations.",
        },
        {
          id: "rat-deny",
          text: "Denying entirely blocks a legitimate business function without offering an alternative solution.",
        },
        {
          id: "rat-investigate",
          text: "Investigating the proxy issue is good but doesn't help the marketing team's immediate deadline.",
        },
      ],
      correctRationaleId: "rat-scoped",
      feedback: {
        perfect:
          "Correct. The business need is real, but 'permanent' and 'entire VLAN' are red flags. A scoped exception — specific workstations, specific Hootsuite domains, 90-day review — satisfies the business need while maintaining security visibility.",
        partial:
          "You showed good instincts but chose either too broad or too narrow a response. The key is scoping: specific IPs, specific domains, time-limited review. Neither blanket approval nor blanket denial serves the organization.",
        wrong:
          "A permanent VLAN-wide proxy bypass creates 15 unmonitored internet paths. But denying a legitimate business need isn't the answer either. Scope the exception tightly: specific workstations, Hootsuite domains only, 90-day review.",
      },
    },
    {
      type: "action-rationale",
      id: "except-002",
      title: "MFA Exception — Product Launch Pressure",
      context:
        "A VP of Product requests that their team of 12 be exempted from MFA for 30 days. Reason: 'We're in a critical product launch and MFA is adding 30 seconds to every login. We can't afford the friction during crunch time.'",
      displayFields: [
        {
          label: "Requestor",
          value: "VP of Product — James Rodriguez",
          emphasis: "normal",
        },
        {
          label: "Team Size",
          value: "12 engineers and product managers",
          emphasis: "normal",
        },
        {
          label: "Request",
          value: "Disable MFA for 30 days during product launch",
          emphasis: "critical",
        },
        {
          label: "Risk",
          value: "12 accounts without MFA = 12 credential stuffing targets",
          emphasis: "critical",
        },
        {
          label: "Alternative",
          value: "Push notification MFA adds ~5 seconds, not 30",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "DENY_ALTERNATIVE",
          label: "Deny — offer push notification MFA or passkeys as lower-friction alternative",
          color: "green",
        },
        {
          id: "APPROVE_MONITORED",
          label: "Approve 30-day exception with enhanced monitoring",
          color: "red",
        },
        {
          id: "APPROVE_VP",
          label: "Approve for VP only, not the full team",
          color: "orange",
        },
        {
          id: "ESCALATE",
          label: "Escalate to CISO for decision",
          color: "yellow",
        },
      ],
      correctActionId: "DENY_ALTERNATIVE",
      rationales: [
        {
          id: "rat-deny-alt",
          text: "MFA exceptions for convenience create unacceptable risk, especially during high-visibility product launches when the organization is a bigger target — instead, address the friction by switching from TOTP to push notifications or passkeys which are faster.",
        },
        {
          id: "rat-approve",
          text: "Approving even with monitoring leaves 12 accounts vulnerable to credential attacks during a period of heightened visibility.",
        },
        {
          id: "rat-vp-only",
          text: "Approving for VP only still creates one unprotected privileged account that is a high-value target.",
        },
        {
          id: "rat-escalate",
          text: "Escalating to CISO is unnecessary when the answer is clear — deny the exception and solve the friction problem.",
        },
      ],
      correctRationaleId: "rat-deny-alt",
      feedback: {
        perfect:
          "Excellent. You correctly identified that the real problem is MFA friction, not MFA itself. Push notifications or passkeys reduce authentication time to ~5 seconds while maintaining security. Disabling MFA during a product launch — when you're most visible — is exactly backwards.",
        partial:
          "You recognized the risk but didn't fully solve the problem. The VP's complaint about friction is legitimate — the solution is better MFA (push or passkeys), not less MFA or an escalation.",
        wrong:
          "Disabling MFA for 12 accounts creates 12 credential stuffing targets during a high-visibility product launch. The friction complaint is solved by switching to push notification MFA (~5 seconds) or passkeys, not by removing MFA entirely.",
      },
    },
    {
      type: "action-rationale",
      id: "except-003",
      title: "Production Egress — CVE Feed Automation",
      context:
        "The database team requests that the production database server be allowed to initiate outbound internet connections. Reason: 'We want to automate CVE feed updates for our vulnerability monitoring script.' Current policy blocks all outbound from production tier.",
      displayFields: [
        {
          label: "Requestor",
          value: "DBA Lead — Priya Sharma",
          emphasis: "normal",
        },
        {
          label: "System",
          value: "PROD-DB-01 — PostgreSQL primary (PCI scope)",
          emphasis: "critical",
        },
        {
          label: "Request",
          value: "Allow outbound HTTPS to internet",
          emphasis: "warn",
        },
        {
          label: "Purpose",
          value: "Automated CVE feed download from NVD and vendor advisories",
          emphasis: "normal",
        },
        {
          label: "Current Policy",
          value: "Zero outbound from production tier",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "APPROVE_MODIFIED",
          label: "Approve with modification — specific URLs via proxy, not general internet",
          color: "green",
        },
        {
          id: "APPROVE_FULL",
          label: "Approve as requested — CVE updates are security-positive",
          color: "red",
        },
        {
          id: "DENY",
          label: "Deny — production should never have outbound",
          color: "orange",
        },
        {
          id: "MOVE_SERVER",
          label: "Suggest moving the CVE feed to a non-production server",
          color: "yellow",
        },
      ],
      correctActionId: "APPROVE_MODIFIED",
      rationales: [
        {
          id: "rat-modified",
          text: "The security benefit of automated CVE monitoring is real, but general internet access from a PCI-scoped production server is unacceptable — allow outbound only to specific NVD/vendor URLs through a proxy with logging and quarterly review.",
        },
        {
          id: "rat-full",
          text: "General internet access from production creates data exfiltration paths and violates PCI DSS requirements.",
        },
        {
          id: "rat-deny",
          text: "Blanket denial ignores a legitimate security improvement — automated CVE monitoring helps protect the very server being restricted.",
        },
        {
          id: "rat-move",
          text: "Moving to non-production works but adds complexity when the proxy approach is simpler and keeps the monitoring close to the asset.",
        },
      ],
      correctRationaleId: "rat-modified",
      feedback: {
        perfect:
          "Correct. The CVE feed automation is genuinely security-positive, but general internet access from a PCI-scoped production server is a non-starter. Specific URLs via a proxy with logging gives the team what they need while maintaining the production security boundary.",
        partial:
          "You recognized either the benefit or the risk but not both. The key is that CVE monitoring is valuable AND general production egress is unacceptable — the proxy approach threads the needle.",
        wrong:
          "General internet access from a PCI-scoped production server creates exfiltration risk and compliance violations. But blanket denial of a security improvement is also wrong. Allow specific NVD/vendor URLs via proxy — this maintains the security boundary while enabling the CVE feed.",
      },
    },
    {
      type: "action-rationale",
      id: "except-004",
      title: "M&A Integration — Unsecured Acquired Network",
      context:
        "Your company acquired a 50-person startup. They need access to shared project files within 2 weeks to maintain project momentum. Their security posture: no SOC 2, no EDR, mix of Windows 7 and Windows 10 machines, consumer-grade router, no centralized management.",
      displayFields: [
        {
          label: "Company",
          value: "Nexus Labs — 50-person startup, acquired March 1",
          emphasis: "normal",
        },
        {
          label: "Security Posture",
          value: "No SOC 2, no EDR, Windows 7 present, consumer router",
          emphasis: "critical",
        },
        {
          label: "Timeline",
          value: "Access needed within 2 weeks",
          emphasis: "warn",
        },
        {
          label: "Access Needed",
          value: "Shared project files on engineering file server",
          emphasis: "normal",
        },
        {
          label: "Risk",
          value: "Direct network connection = potential malware bridge",
          emphasis: "critical",
        },
      ],
      actions: [
        {
          id: "SEGMENTED",
          label: "Segmented integration network + EDR requirement + 90-day compliance deadline",
          color: "green",
        },
        {
          id: "CONNECT_DIRECT",
          label: "Connect networks directly — they're part of the company now",
          color: "red",
        },
        {
          id: "DELAY_BASELINE",
          label: "Delay until full security baseline is met",
          color: "orange",
        },
        {
          id: "VPN_ONLY",
          label: "Provide access via individual VPN accounts only",
          color: "yellow",
        },
      ],
      correctActionId: "SEGMENTED",
      rationales: [
        {
          id: "rat-segmented",
          text: "Direct network connection to an unsecured network creates a bridge for malware and lateral movement — a segmented integration zone with strict firewall rules provides access while containing risk. Require EDR on any device accessing your resources, and set a 90-day deadline for full security baseline compliance.",
        },
        {
          id: "rat-direct",
          text: "Direct connection exposes your entire network to their unsecured environment including Windows 7 machines that no longer receive security updates.",
        },
        {
          id: "rat-delay",
          text: "Delaying blocks business operations of the acquisition and may take months to achieve full baseline compliance.",
        },
        {
          id: "rat-vpn",
          text: "Individual VPN accounts work short-term but don't scale to 50 users and don't address endpoint security on their machines.",
        },
      ],
      correctRationaleId: "rat-segmented",
      feedback: {
        perfect:
          "Excellent. A segmented integration zone is the standard approach for M&A network integration — it provides the access the acquired team needs while containing risk behind firewall rules. EDR on their endpoints and a 90-day compliance deadline creates a structured path to full integration.",
        partial:
          "You recognized the risk but chose a response that either blocks the business or doesn't fully address the security gap. The segmented approach provides access AND containment — the acquired team gets their files while your network stays protected.",
        wrong:
          "Connecting directly to a network with Windows 7, no EDR, and a consumer router is a malware bridge waiting to happen. But delaying the acquisition's operations indefinitely isn't viable either. A segmented integration zone with EDR requirements is the industry-standard approach.",
      },
    },
    {
      type: "action-rationale",
      id: "except-005",
      title: "Network Analysis Tool — Endpoint Exception",
      context:
        "A security researcher requests an exception to install Wireshark on their corporate laptop for legitimate packet analysis. Security policy prohibits network analysis tools on endpoints to prevent internal network sniffing.",
      displayFields: [
        {
          label: "Requestor",
          value: "Alex Torres — Security Researcher, 3 years tenure",
          emphasis: "normal",
        },
        {
          label: "Tool",
          value: "Wireshark — network protocol analyzer",
          emphasis: "normal",
        },
        {
          label: "Policy",
          value: "Network analysis tools prohibited on corporate endpoints",
          emphasis: "normal",
        },
        {
          label: "Use Case",
          value: "Analyzing packet captures from honeypot research project",
          emphasis: "normal",
        },
        {
          label: "Alternative",
          value: "Dedicated analysis workstation available in security lab",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "APPROVE_WORKSTATION",
          label: "Approve with controls — install on dedicated analysis workstation, not daily laptop",
          color: "green",
        },
        {
          id: "APPROVE_LAPTOP",
          label: "Approve on personal laptop — security researcher needs tools",
          color: "yellow",
        },
        {
          id: "DENY_POLICY",
          label: "Deny — policy is policy, no exceptions",
          color: "orange",
        },
        {
          id: "VLAN_RESTRICT",
          label: "Allow Wireshark but restrict to specific VLANs via network policy",
          color: "blue",
        },
      ],
      correctActionId: "APPROVE_WORKSTATION",
      rationales: [
        {
          id: "rat-workstation",
          text: "The use case is legitimate, but installing network analysis tools on a daily-use corporate laptop (which connects to various networks) creates unnecessary risk — the dedicated analysis workstation in the security lab provides the needed capability without the exposure.",
        },
        {
          id: "rat-laptop",
          text: "Installing on a daily laptop creates a tool that could be misused if the laptop is compromised or connected to sensitive network segments.",
        },
        {
          id: "rat-deny",
          text: "Blanket denial when a dedicated workstation exists ignores a legitimate need and frustrates security team members.",
        },
        {
          id: "rat-vlan",
          text: "VLAN restriction helps but doesn't address the risk of the tool being on a device that travels between networks and could be compromised.",
        },
      ],
      correctRationaleId: "rat-workstation",
      feedback: {
        perfect:
          "Correct. The dedicated analysis workstation satisfies the researcher's legitimate need while keeping network analysis tools off daily-use laptops that move between networks. This is the principle of least privilege applied to tooling.",
        partial:
          "You addressed the request but chose an approach with unnecessary risk or unnecessary restriction. A dedicated workstation is already available — use it. This satisfies the need without the exposure of a mobile laptop or the frustration of a blanket denial.",
        wrong:
          "The researcher has a legitimate need and a dedicated analysis workstation is already available in the security lab. Neither blanket denial nor unrestricted laptop installation is the right answer — direct the researcher to the existing secure alternative.",
      },
    },
  ],

  hints: [
    "Policy exceptions should be scoped as narrowly as possible: specific systems, specific destinations, specific time periods. 'Permanent' and 'entire VLAN' are red flags.",
    "When someone asks for an MFA exception, the real problem is usually friction — solve the friction with better MFA methods instead of removing MFA entirely.",
    "Acquired company integrations are one of the highest-risk scenarios in security. Never connect an unsecured network directly — always use a segmented integration zone.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Security policy exception management is a senior-level responsibility that requires both technical knowledge and business judgment. CISOs and security architects who can navigate exception requests without either blocking business or accepting unnecessary risk are invaluable.",
  toolRelevance: [
    "ServiceNow GRC (policy exception tracking)",
    "Archer / RSA (risk management)",
    "Jira (exception request workflow)",
    "NIST RMF (risk management framework)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
