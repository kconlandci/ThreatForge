import type { LabManifest } from "../../types/manifest";

export const certificateManagementAuditLab: LabManifest = {
  schemaVersion: "1.1",
  id: "certificate-management-audit",
  version: 1,
  title: "Certificate Management Audit",

  tier: "intermediate",
  track: "network-defense",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "tls",
    "ssl",
    "certificates",
    "pki",
    "key-management",
    "compliance",
    "pci-dss",
  ],

  description:
    "Audit and fix TLS certificate configurations across production, internal, and shared environments. Address expiration, weak cryptography, private key exposure, and certificate lifecycle management.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify common TLS certificate misconfigurations",
    "Apply proper certificate lifecycle management practices",
    "Recognize the security implications of expired, self-signed, and shared certificates",
    "Understand certificate pinning and OCSP stapling",
    "Evaluate cryptographic strength of certificate configurations",
  ],
  sortOrder: 250,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "cert-001",
      title: "Production Certificate — 5 Days to Expiry",
      description:
        "Certificate monitoring alert: the TLS certificate for customer-portal.acmecorp.com expires in 5 days. Review and fix the configuration.",
      targetSystem: "customer-portal.acmecorp.com (WEB-PROD-01)",
      items: [
        {
          id: "auto-renewal",
          label: "Auto-Renewal",
          detail:
            "Controls whether the certificate is automatically renewed before expiration using ACME protocol.",
          currentState: "Disabled",
          correctState: "Enabled (Let's Encrypt ACME)",
          states: [
            "Disabled",
            "Enabled (Let's Encrypt ACME)",
            "Enabled (manual renewal)",
          ],
          rationaleId: "rat-auto-renewal",
        },
        {
          id: "renewal-contact",
          label: "Renewal Contact",
          detail:
            "The email address that receives certificate expiration warnings and renewal notifications.",
          currentState: "k.thompson@acmecorp.com (terminated)",
          correctState: "security-team@acmecorp.com (active DL)",
          states: [
            "k.thompson@acmecorp.com (terminated)",
            "security-team@acmecorp.com (active DL)",
            "j.martinez@acmecorp.com (individual)",
          ],
          rationaleId: "rat-renewal-contact",
        },
        {
          id: "ocsp-stapling",
          label: "OCSP Stapling",
          detail:
            "Determines whether the server caches and serves OCSP responses to clients during TLS handshake.",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Disabled", "Enabled"],
          rationaleId: "rat-ocsp",
        },
        {
          id: "cert-chain",
          label: "Certificate Chain",
          detail:
            "Controls which certificates are included in the TLS handshake sent to connecting clients.",
          currentState: "Missing intermediate CA",
          correctState: "Full chain (root + intermediate + leaf)",
          states: [
            "Missing intermediate CA",
            "Full chain (root + intermediate + leaf)",
            "Leaf certificate only",
          ],
          rationaleId: "rat-chain",
        },
      ],
      rationales: [
        {
          id: "rat-auto-renewal",
          text: "Auto-renewal prevents expiration outages — the #1 cause of certificate-related downtime. ACME protocol automates the entire renewal process.",
        },
        {
          id: "rat-renewal-contact",
          text: "Renewal contacts should be group aliases, not individuals who may leave the company. A terminated employee's email means no one receives expiration warnings.",
        },
        {
          id: "rat-ocsp",
          text: "OCSP stapling improves TLS handshake performance and reliability by caching revocation status on the server, avoiding client-side OCSP lookups that can fail or add latency.",
        },
        {
          id: "rat-chain",
          text: "Incomplete certificate chains cause trust errors in browsers and API clients. The full chain ensures clients can validate the certificate back to a trusted root CA.",
        },
      ],
      feedback: {
        perfect:
          "Certificate configuration hardened. Auto-renewal will prevent future expiration emergencies.",
        partial:
          "Some settings need attention. Certificate management failures cause more outages than attacks.",
        wrong:
          "Multiple critical misconfigurations. An expiring cert with no auto-renewal and a terminated contact is a ticking time bomb.",
      },
    },
    {
      type: "toggle-config",
      id: "cert-002",
      title: "Internal API — Self-Signed Certificate Audit",
      description:
        "Compliance scan flagged the internal payment processing API for certificate issues. The API handles PCI-scoped transaction data.",
      targetSystem: "api-payments.internal.acmecorp.com",
      items: [
        {
          id: "cert-type",
          label: "Certificate Type",
          detail:
            "The type of certificate and its validity period used to secure the API endpoint.",
          currentState: "Self-signed (10-year validity)",
          correctState: "Internal CA-signed (1-year validity)",
          states: [
            "Self-signed (10-year validity)",
            "Internal CA-signed (1-year validity)",
            "Public CA-signed (1-year validity)",
          ],
          rationaleId: "rat-cert-type",
        },
        {
          id: "sig-algo",
          label: "Signature Algorithm",
          detail:
            "The hash algorithm used to sign the certificate, affecting its cryptographic strength.",
          currentState: "SHA-1 with RSA",
          correctState: "SHA-256 with RSA",
          states: [
            "SHA-1 with RSA",
            "SHA-256 with RSA",
            "SHA-384 with ECDSA",
          ],
          rationaleId: "rat-sig-algo",
        },
        {
          id: "key-length",
          label: "Key Length",
          detail:
            "The RSA key size used for the certificate's public/private key pair.",
          currentState: "1024-bit RSA",
          correctState: "2048-bit RSA minimum",
          states: ["1024-bit RSA", "2048-bit RSA minimum", "4096-bit RSA"],
          rationaleId: "rat-key-length",
        },
        {
          id: "cert-pinning",
          label: "Certificate Pinning",
          detail:
            "Whether API clients are configured to only accept the specific expected certificate or public key.",
          currentState: "Not implemented",
          correctState: "Enabled for API clients",
          states: ["Not implemented", "Enabled for API clients"],
          rationaleId: "rat-pinning",
        },
      ],
      rationales: [
        {
          id: "rat-cert-type",
          text: "Internal CA-signed certs provide proper trust chain validation and manageable rotation — self-signed certs can't be revoked if compromised and bypass centralized certificate management.",
        },
        {
          id: "rat-sig-algo",
          text: "SHA-1 is cryptographically broken and violates PCI DSS requirements — SHA-256 is the current standard for certificate signatures.",
        },
        {
          id: "rat-key-length",
          text: "1024-bit RSA keys can be factored with modern hardware — 2048-bit is the minimum acceptable key length per NIST and PCI DSS guidelines.",
        },
        {
          id: "rat-pinning",
          text: "Certificate pinning prevents MITM attacks by ensuring API clients only accept the expected certificate, adding a layer of protection beyond standard CA validation.",
        },
      ],
      feedback: {
        perfect:
          "API certificate configuration meets PCI DSS requirements and security best practices.",
        partial:
          "Some certificate settings still have issues. PCI-scoped systems require strong cryptographic standards.",
        wrong:
          "Multiple certificate weaknesses. Self-signed SHA-1 certificates on PCI systems are audit failures.",
      },
    },
    {
      type: "toggle-config",
      id: "cert-003",
      title: "Wildcard Certificate — Shared Key Exposure",
      description:
        "Security review found a wildcard certificate used across all environments with its private key committed to a Git repository.",
      targetSystem: "*.acmecorp.com wildcard certificate",
      items: [
        {
          id: "cert-scope",
          label: "Certificate Scope",
          detail:
            "Determines whether a single wildcard certificate is shared across all environments or separate certs are used per environment.",
          currentState: "Single wildcard shared across prod/staging/dev",
          correctState: "Separate certificates per environment",
          states: [
            "Single wildcard shared across prod/staging/dev",
            "Separate certificates per environment",
          ],
          rationaleId: "rat-scope",
        },
        {
          id: "key-storage",
          label: "Private Key Storage",
          detail:
            "Where the certificate's private key is stored and how access to it is controlled.",
          currentState: "Committed to Git repository (main branch)",
          correctState: "Secrets manager (HashiCorp Vault)",
          states: [
            "Committed to Git repository (main branch)",
            "Secrets manager (HashiCorp Vault)",
            "Stored on server filesystem",
          ],
          rationaleId: "rat-key-storage",
        },
        {
          id: "rotation-status",
          label: "Rotation Status",
          detail:
            "The current state of certificate and key rotation for the wildcard certificate.",
          currentState: "Never rotated (issued 2 years ago)",
          correctState: "Revoke and reissue immediately",
          states: [
            "Never rotated (issued 2 years ago)",
            "Revoke and reissue immediately",
            "Schedule rotation in 30 days",
          ],
          rationaleId: "rat-rotation",
        },
        {
          id: "git-history",
          label: "Git History",
          detail:
            "The state of the Git repository history containing the previously committed private key.",
          currentState: "Private key visible in commit history",
          correctState: "Force-push to remove + rotate all secrets",
          states: [
            "Private key visible in commit history",
            "Force-push to remove + rotate all secrets",
            "Delete file in new commit",
          ],
          rationaleId: "rat-git-history",
        },
      ],
      rationales: [
        {
          id: "rat-scope",
          text: "Separate certs per environment limit blast radius — a staging compromise shouldn't expose production. Shared wildcards mean one compromised environment compromises all.",
        },
        {
          id: "rat-key-storage",
          text: "Private keys in Git are exposed to every developer with repo access and persist in history even after deletion. Secrets managers provide access control, audit logging, and automatic rotation.",
        },
        {
          id: "rat-rotation",
          text: "A key that's been in Git for 2 years must be assumed compromised — revoke immediately. Scheduling rotation in 30 days gives attackers another month of access.",
        },
        {
          id: "rat-git-history",
          text: "Simply deleting the file leaves the key in Git history — anyone with repo access can recover it. History must be cleaned via force-push, and all exposed secrets must be rotated.",
        },
      ],
      feedback: {
        perfect:
          "Wildcard certificate exposure properly remediated. Separate certs, secrets management, and key rotation close all gaps.",
        partial:
          "Some certificate practices still need improvement. Shared wildcards and exposed keys are critical security issues.",
        wrong:
          "Multiple critical issues remain. A wildcard private key in Git is one of the most dangerous certificate misconfigurations.",
      },
    },
  ],

  hints: [
    "Certificate expiration is the #1 cause of certificate-related outages. Auto-renewal with group notification contacts prevents emergencies.",
    "Self-signed certificates with long validity periods can't be revoked if compromised. Internal CA-signed certs provide revocation capability.",
    "Private keys committed to Git persist in history even after the file is deleted. History cleaning and immediate key rotation are both required.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Certificate management failures cause more production outages than security attacks. Security engineers who understand PKI and can audit certificate configurations prevent both security breaches and costly downtime.",
  toolRelevance: [
    "Let's Encrypt / Certbot (ACME automation)",
    "HashiCorp Vault (secrets management)",
    "Qualys SSL Labs (certificate testing)",
    "cert-manager (Kubernetes certificate automation)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
