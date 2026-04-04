import type { LabManifest } from "../../types/manifest";

export const securityArchitectureReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "security-architecture-review",
  version: 1,
  title: "Security Architecture Review",

  tier: "advanced",
  track: "vulnerability-hardening",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: ["architecture", "design-review", "zero-trust", "defense-in-depth", "threat-modeling", "secure-design"],

  description:
    "Evaluate security architecture proposals for a cloud-hybrid enterprise, identifying design flaws, single points of failure, and violations of zero-trust and defense-in-depth principles before they reach production.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Identify security architecture flaws that create systemic risk across an enterprise environment",
    "Apply zero-trust and defense-in-depth principles to evaluate proposed designs",
    "Recommend architectural changes that address root causes rather than adding security band-aids",
  ],
  sortOrder: 442,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "arch-001",
      title: "Flat Network with Centralized Firewall",
      description:
        "The network team proposes a new datacenter design: all servers in a flat /16 network with a single perimeter firewall providing access control. Review the architecture.",
      evidence: [
        {
          type: "Architecture Proposal",
          content:
            "Proposed design: 300 servers in 10.100.0.0/16 flat network. Single next-gen firewall at perimeter (north-south traffic). All inter-server communication unrestricted (east-west traffic). Firewall handles: internet ingress/egress, VPN termination, and all ACL enforcement. Estimated cost savings: $180K vs segmented design.",
        },
        {
          type: "Server Inventory",
          content:
            "Server mix in proposed flat network: 40 payment processing servers (PCI scope), 80 internal application servers, 60 database servers (customer PII), 30 development/test servers, 50 management/monitoring servers, 40 legacy systems (unpatched, unsupported OS). All on same /16.",
        },
        {
          type: "Threat Model",
          content:
            "Primary threats identified: ransomware lateral movement, insider threat, compromised supply chain (via dev servers), external attacker with initial foothold. Organization processes 2M credit card transactions/month.",
        },
        {
          type: "Compliance Requirements",
          content:
            "Active compliance obligations: PCI-DSS v4.0 (requires network segmentation of CDE), SOC 2 Type II (requires isolation of sensitive data), internal policy requires dev/test isolation from production.",
        },
      ],
      classifications: [
        {
          id: "critical-design-flaw",
          label: "Critical Design Flaw — Violates PCI-DSS, enables lateral movement, must redesign",
          description: "Flat network with PCI scope co-mingled with dev systems is a compliance violation and a single-compromise-leads-to-full-breach architecture",
        },
        {
          id: "acceptable-with-controls",
          label: "Acceptable — Add IDS/IPS for east-west monitoring as compensating control",
          description: "Monitoring can compensate for lack of segmentation",
        },
        {
          id: "minor-concern",
          label: "Minor Concern — Document exception for PCI with QSA approval",
          description: "QSA can approve compensating controls for flat network",
        },
        {
          id: "cost-justified",
          label: "Cost-Justified — $180K savings outweighs incremental risk",
          description: "Security is always a cost-benefit decision",
        },
      ],
      correctClassificationId: "critical-design-flaw",
      remediations: [
        {
          id: "segment-by-function",
          label: "Redesign with micro-segmentation: isolated CDE, PII tier, dev/test, management — east-west controls between each zone",
          description: "Separate PCI CDE (40 servers) into isolated segment with whitelist-only east-west rules; isolate PII databases; separate dev/test from production; management network accessible only from jump hosts",
        },
        {
          id: "add-ids",
          label: "Keep flat design, add IDS/IPS for east-west traffic visibility",
          description: "Deploy network monitoring to detect lateral movement after it starts",
        },
        {
          id: "encrypt-traffic",
          label: "Encrypt all inter-server traffic to prevent data exposure",
          description: "TLS for east-west communication as segmentation substitute",
        },
        {
          id: "perimeter-hardening",
          label: "Harden the perimeter firewall with stricter rules and enhanced logging",
          description: "Invest in improving the single control point",
        },
      ],
      correctRemediationId: "segment-by-function",
      rationales: [
        {
          id: "rat-segment",
          text: "A flat /16 with PCI payment servers, dev servers, and legacy unpatched systems co-mingled is a catastrophic architecture for several reasons. First, it violates PCI-DSS Requirement 1 (network segmentation of CDE) — this architecture makes the entire /16 in-scope for PCI audit. Second, it enables ransomware to spread from a compromised dev server (most vulnerable, broadest attack surface) to payment infrastructure with no east-west controls. Third, defense-in-depth requires that a single compromised server cannot directly reach all 299 others. IDS/IPS monitoring lateral movement is detection, not prevention — by the time you detect the lateral movement, the ransomware may have already encrypted 50 servers. The $180K in savings doesn't account for a single ransomware incident (average cost: $4.7M) or PCI decertification.",
        },
        {
          id: "rat-ids",
          text: "IDS/IPS provides detection capability but not containment. Lateral movement between 300 servers on a flat network happens in seconds — detection latency means the blast radius is already large before any containment action is possible.",
        },
      ],
      correctRationaleId: "rat-segment",
      feedback: {
        perfect: "Critical flaw identified correctly. Flat networks with PCI CDE, dev, and legacy systems co-mingled violate PCI-DSS and create ransomware blast radius spanning all 300 servers. Micro-segmentation is not optional.",
        partial: "Detection can't substitute for containment. East-west segmentation prevents lateral movement — IDS/IPS detects it after it's already happening.",
        wrong: "PCI-DSS has no cost-benefit exemption for network segmentation. A flat network with payment processing servers is non-compliant by definition, and the $180K savings is eliminated by a single ransomware incident.",
      },
    },
    {
      type: "triage-remediate",
      id: "arch-002",
      title: "Single Identity Provider for All Access",
      description:
        "The IAM team proposes consolidating all authentication to a single cloud identity provider with no fallback for operational resilience. Review the design.",
      evidence: [
        {
          type: "Architecture Proposal",
          content:
            "All 847 systems (cloud, on-prem, SaaS) will authenticate exclusively through Okta. SSO for all applications. No local admin accounts except for 'break-glass' scenarios. MFA enforced universally. IT estimates 90% reduction in password-related helpdesk tickets. Fallback: manual account creation if Okta is unavailable.",
        },
        {
          type: "Dependency Analysis",
          content:
            "Systems with critical Okta dependencies: production Kubernetes clusters (Okta OIDC for kubectl access), network infrastructure (Okta RADIUS for Wi-Fi and VPN), security tools (SIEM, EDR consoles authenticated via Okta), backup systems, and incident response tooling.",
        },
        {
          type: "Availability Requirements",
          content:
            "Okta SLA: 99.9% uptime (8.7 hours downtime/year). Critical operations that can't wait for Okta restoration: production incident response, security incident containment, network emergency changes. Okta outage in 2022 lasted 5 hours and affected multiple large customers.",
        },
        {
          type: "Security Analysis",
          content:
            "Centralized IdP benefits: single MFA enforcement point, centralized access revocation (terminate → single deprovisioning action), unified audit log. Risks: IdP compromise gives attacker access to all 847 systems simultaneously; IdP availability becomes single point of failure for security operations.",
        },
      ],
      classifications: [
        {
          id: "design-flaw-no-fallback",
          label: "Design Flaw — Single Point of Failure for Security Operations",
          description: "Okta controlling access to security tools and IR tooling creates a scenario where an Okta outage or compromise prevents incident response",
        },
        {
          id: "acceptable-design",
          label: "Strong Design — Centralized IdP with MFA is best practice",
          description: "Centralized identity with MFA is the recommended zero-trust approach",
        },
        {
          id: "minor-tweak",
          label: "Minor Gap — Document break-glass procedure and proceed",
          description: "Break-glass accounts address the edge case adequately",
        },
        {
          id: "hybrid-recommendation",
          label: "Hybrid — Keep AD as fallback alongside Okta",
          description: "Maintain legacy AD in parallel for resilience",
        },
      ],
      correctClassificationId: "design-flaw-no-fallback",
      remediations: [
        {
          id: "emergency-access-tier",
          label: "Create an emergency access tier: offline break-glass credentials for security tools, offline MFA (TOTP seeds stored in vault), and documented activation procedures tested quarterly",
          description: "Break-glass accounts with hardware-stored credentials for IR tooling, SIEM, EDR, and network infrastructure — credentials stored in physical safe and offline vault, not in Okta",
        },
        {
          id: "dual-idp",
          label: "Maintain both Okta and Active Directory as parallel identity sources",
          description: "Keep AD in parallel so systems can fail over during Okta outages",
        },
        {
          id: "proceed-as-designed",
          label: "Proceed with current design — Okta's 99.9% SLA is sufficient",
          description: "Accept the single point of failure risk given high uptime SLA",
        },
        {
          id: "on-prem-idp-backup",
          label: "Deploy an on-premises IdP as hot standby for Okta failover",
          description: "Self-hosted LDAP/SAML IdP as failover identity source",
        },
      ],
      correctRemediationId: "emergency-access-tier",
      rationales: [
        {
          id: "rat-emergency-tier",
          text: "Centralizing all authentication through a single IdP is excellent for normal operations but creates a critical flaw: Okta controlling your SIEM, EDR, and IR tooling means an Okta outage or compromise is simultaneously a security incident AND the thing that prevents you from responding to it. The design principle violated is 'security tooling must have out-of-band access.' The fix is not to abandon Okta centralization (the security benefits are real) but to create an emergency access tier specifically for security operations: break-glass credentials for SIEM, EDR, and network gear stored offline (not in Okta), TOTP seeds backed up to hardware tokens for emergency MFA, and activation procedures tested quarterly to ensure they actually work when needed. The break-glass tier is for 'Okta is down and we have a security incident' — not for normal operations.",
        },
        {
          id: "rat-dual-idp",
          text: "Maintaining AD in parallel reintroduces all the complexity and attack surface that Okta consolidation was meant to eliminate. Emergency access tiers for specific critical systems are more targeted and don't undermine the security benefits of centralization.",
        },
      ],
      correctRationaleId: "rat-emergency-tier",
      feedback: {
        perfect: "Correct flaw identification. Okta controlling IR tooling creates a recursive problem — outage prevents response. An offline emergency access tier for security tools preserves centralization benefits while eliminating the single point of failure for security operations.",
        partial: "99.9% SLA still means 8+ hours of annual downtime. If that 5-hour window coincides with an active security incident, your response capability is gone. Break-glass must be offline, not in Okta.",
        wrong: "The 2022 Okta incident lasted 5 hours. If your SIEM and EDR access depend on Okta, a breach during an Okta outage leaves you blind. Security architecture must account for defense degradation under failure conditions.",
      },
    },
    {
      type: "triage-remediate",
      id: "arch-003",
      title: "API Gateway with Shared Credentials",
      description:
        "A development team proposes a microservices architecture where all services authenticate to the central API gateway using a shared service token. Review the design.",
      evidence: [
        {
          type: "Architecture Proposal",
          content:
            "Microservices architecture: 24 services communicating via central API gateway. Authentication: all services use a single shared bearer token (API_GATEWAY_TOKEN) stored in each service's environment variables. Token has full read-write access to all endpoints. Rotation: manual, last rotated 14 months ago.",
        },
        {
          type: "Security Analysis",
          content:
            "Shared token risks: single credential compromise gives attacker access to all 24 services and all their data. No attribution — audit logs show 'API_GATEWAY_TOKEN' with no per-service identity. No least-privilege — all services have full access regardless of what they actually need. Token is in 3 git repos (developer laptops), CI/CD environment, and prod.",
        },
        {
          type: "Data Scope",
          content:
            "Services behind the gateway include: user authentication service, payment processing, medical records (HIPAA PHI), customer PII database, and internal analytics. All accessible to any service holding the shared token.",
        },
        {
          type: "Developer Justification",
          content:
            "Development team rationale: 'Service-to-service auth is overhead. The gateway handles external auth — internal services can trust each other. This is the pattern from our old monolith and it's worked fine for 3 years.'",
        },
      ],
      classifications: [
        {
          id: "critical-lateral-movement",
          label: "Critical Design Flaw — Shared Credentials Enable Lateral Movement and Blast Radius Maximization",
          description: "Single shared credential for 24 services destroys least-privilege, creates massive breach blast radius, and is in multiple git repos",
        },
        {
          id: "acceptable-internal",
          label: "Acceptable — Internal east-west traffic can use shared credentials",
          description: "Zero-trust is for external traffic; internal service trust is standard practice",
        },
        {
          id: "rotation-fix",
          label: "Minor Fix — Rotate the token and automate rotation",
          description: "The core design is fine; the rotation gap is the main issue",
        },
        {
          id: "gateway-sufficient",
          label: "Gateway Handles Auth — Internal tokens are implementation details",
          description: "The gateway is the trust boundary; internal credentials don't need the same rigor",
        },
      ],
      correctClassificationId: "critical-lateral-movement",
      remediations: [
        {
          id: "service-identities-mtls",
          label: "Replace shared token with per-service identities (mTLS or SPIFFE/SPIRE), scoped to minimum required endpoints, rotated automatically",
          description: "Issue each service a unique cryptographic identity, define exact API scopes per service, use SPIFFE/SPIRE for automatic certificate rotation — a compromised payment service can only call payment endpoints, not medical records",
        },
        {
          id: "rotate-only",
          label: "Rotate the shared token and implement automated rotation",
          description: "Keep shared token architecture but improve rotation frequency",
        },
        {
          id: "vault-the-token",
          label: "Move the shared token to HashiCorp Vault with dynamic secret generation",
          description: "Store token in Vault and have services retrieve it dynamically",
        },
        {
          id: "service-mesh",
          label: "Deploy a service mesh (Istio) to handle service-to-service auth",
          description: "Let the service mesh manage authentication transparently",
        },
      ],
      correctRemediationId: "service-identities-mtls",
      rationales: [
        {
          id: "rat-per-service",
          text: "The 'internal services trust each other' assumption is a pre-zero-trust architectural pattern that creates maximum blast radius by design. A single compromised service (or the token from any of the 3 git repos) gives an attacker read-write access to PHI, PII, payment data, and authentication systems simultaneously — because all 24 services share the same credential with full access. The fix requires three changes: (1) per-service identity (each service gets a unique credential, not a shared one), (2) least-privilege scoping (payment service can only call payment endpoints, not medical records), and (3) automatic rotation via SPIFFE/SPIRE or Vault PKI (not manual every 14+ months). A service mesh like Istio is a valid implementation path, but the architecture requirement is per-service identity with scoped access. Vault storage is better than environment variables but doesn't fix the shared credential problem.",
        },
        {
          id: "rat-vault",
          text: "Vault is a storage improvement but the architectural flaw is the shared credential itself, not where it's stored. Moving a shared credential into Vault means a compromised Vault token still gives full access to all 24 services.",
        },
      ],
      correctRationaleId: "rat-per-service",
      feedback: {
        perfect: "Correct architecture diagnosis. Shared credentials with full access violate least privilege and create maximum blast radius. Per-service identity with scoped access limits the damage any single compromised service can cause.",
        partial: "Vault improves secret storage but doesn't solve the shared credential blast radius. Zero-trust requires per-service identity — Vault is where you store those identities, not a substitute for them.",
        wrong: "Zero-trust principles apply inside the datacenter, not just at the perimeter. Internal service credentials found in git repos with 14-month rotation and full access to PHI+PII+payments is a critical architectural flaw.",
      },
    },
  ],

  hints: [
    "Security architecture review applies defense-in-depth thinking: assume each control will eventually fail and ask what contains the blast radius when it does.",
    "Zero-trust means 'never trust, always verify' applies inside the network too — east-west traffic between services requires the same authentication discipline as north-south perimeter traffic.",
    "Single points of failure in security infrastructure are particularly dangerous: if your incident response tooling depends on the same identity system that might be compromised, you can't respond to compromises of that system.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Security architecture review is a senior-level discipline that prevents entire classes of vulnerabilities before any code is written. Architects who can identify systemic design flaws — flat networks, shared credentials, single points of failure — prevent the incidents that reactive security teams spend years cleaning up.",
  toolRelevance: [
    "SPIFFE/SPIRE (workload identity)",
    "HashiCorp Vault (secrets management)",
    "Istio / Linkerd (service mesh mTLS)",
    "MITRE ATT&CK (threat model validation)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
