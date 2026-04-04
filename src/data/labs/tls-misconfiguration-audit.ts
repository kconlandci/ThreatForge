import type { LabManifest } from "../../types/manifest";

export const tlsMisconfigurationAuditLab: LabManifest = {
  schemaVersion: "1.1",
  id: "tls-misconfiguration-audit",
  version: 1,
  title: "TLS/SSL Misconfiguration Audit",

  tier: "beginner",
  track: "network-defense",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["tls", "ssl", "certificates", "cryptography", "https", "hsts"],

  description:
    "Audit TLS/SSL configurations across web services to identify deprecated protocol versions, weak cipher suites, expired certificates, and missing HSTS headers that expose encrypted communications to downgrade attacks and interception.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify deprecated TLS protocol versions and weak cipher suites that enable downgrade attacks",
    "Configure certificate management to prevent expiration incidents",
    "Implement HSTS and other transport security headers to enforce encrypted connections",
  ],
  sortOrder: 650,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "tls-001",
      title: "Web Server TLS Protocol Configuration",
      description:
        "Audit and configure the TLS protocol settings for the production web server to disable deprecated versions and weak cipher suites.",
      targetSystem: "prod-web-01 — Nginx TLS Configuration",
      items: [
        {
          id: "tls-versions",
          label: "Minimum TLS Version",
          detail: "Controls the oldest TLS protocol version the server will accept.",
          currentState: "tls-1.0-allowed",
          correctState: "tls-1.2-minimum",
          states: ["tls-1.0-allowed", "tls-1.1-minimum", "tls-1.2-minimum", "tls-1.3-only"],
          rationaleId: "rat-tls-version",
        },
        {
          id: "cipher-suites",
          label: "Cipher Suite Configuration",
          detail: "Controls which encryption algorithms are offered during TLS handshake.",
          currentState: "all-ciphers-including-rc4-des",
          correctState: "strong-only-aes-chacha",
          states: ["all-ciphers-including-rc4-des", "strong-only-aes-chacha"],
          rationaleId: "rat-ciphers",
        },
        {
          id: "forward-secrecy",
          label: "Perfect Forward Secrecy",
          detail: "Controls whether ephemeral key exchange (ECDHE/DHE) is required.",
          currentState: "optional",
          correctState: "required",
          states: ["optional", "required"],
          rationaleId: "rat-pfs",
        },
        {
          id: "ssl-compression",
          label: "TLS Compression",
          detail: "Controls whether TLS-level compression is enabled (CRIME attack vector).",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-compression",
        },
      ],
      rationales: [
        { id: "rat-tls-version", text: "TLS 1.0 and 1.1 have known cryptographic weaknesses (BEAST, POODLE) and are deprecated by RFC 8996 and PCI DSS. TLS 1.2 minimum is widely supported and eliminates these attacks. TLS 1.3 is preferred for new deployments." },
        { id: "rat-ciphers", text: "RC4 and DES are cryptographically broken — RC4 was banned by RFC 7465. Weak ciphers allow downgrade attacks. Only offer AES-GCM and ChaCha20-Poly1305 cipher suites with authentication." },
        { id: "rat-pfs", text: "Without perfect forward secrecy, a compromised server private key allows decryption of all past recorded TLS sessions. Ephemeral ECDHE key exchange ensures each session uses a unique key that isn't retained." },
        { id: "rat-compression", text: "TLS compression enables the CRIME attack, which allows an attacker to recover session cookies by observing how compression ratio changes with injected content. Always disable TLS-level compression." },
      ],
      feedback: {
        perfect: "TLS configured securely: TLS 1.2 minimum, strong ciphers, PFS required, compression disabled.",
        partial: "Deprecated TLS versions or weak ciphers remain. TLS 1.0/1.1 violate PCI DSS and NIST guidelines.",
        wrong: "RC4 and DES ciphers are cryptographically broken. TLS 1.0 with compression enabled exposes sessions to multiple known attacks. Immediate remediation required.",
      },
    },
    {
      type: "toggle-config",
      id: "tls-002",
      title: "Certificate Management Configuration",
      description:
        "Review certificate lifecycle management settings to prevent expiration incidents and enable revocation checking.",
      targetSystem: "Certificate Lifecycle Management Policy",
      items: [
        {
          id: "cert-expiry-monitoring",
          label: "Certificate Expiry Monitoring",
          detail: "Controls how far in advance expiring certificates trigger alerts.",
          currentState: "no-monitoring",
          correctState: "30-day-alert",
          states: ["no-monitoring", "7-day-alert", "30-day-alert"],
          rationaleId: "rat-expiry",
        },
        {
          id: "auto-renewal",
          label: "Automatic Certificate Renewal",
          detail: "Controls whether certificates are automatically renewed before expiration.",
          currentState: "manual-process",
          correctState: "automated-acme",
          states: ["manual-process", "automated-acme"],
          rationaleId: "rat-renewal",
        },
        {
          id: "ocsp-stapling",
          label: "OCSP Stapling",
          detail: "Controls whether the server includes an OCSP response in the TLS handshake.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-ocsp",
        },
        {
          id: "cert-transparency",
          label: "Certificate Transparency Monitoring",
          detail: "Controls whether CT logs are monitored for unauthorized certificates issued for your domains.",
          currentState: "not-monitored",
          correctState: "monitored-alerted",
          states: ["not-monitored", "monitored-alerted"],
          rationaleId: "rat-ct",
        },
      ],
      rationales: [
        { id: "rat-expiry", text: "Certificate expirations cause outages, not just security warnings. 30-day advance alerts provide sufficient time to renew through any procurement process, including manual CA workflows." },
        { id: "rat-renewal", text: "Manual certificate renewal is error-prone and frequently results in expiration incidents. Let's Encrypt/ACME-based automatic renewal eliminates expiration risk for most use cases." },
        { id: "rat-ocsp", text: "OCSP stapling improves both security (faster revocation checking) and performance (eliminates client OCSP request latency). Without stapling, revoked certificates may still be accepted by browsers that can't reach the OCSP responder." },
        { id: "rat-ct", text: "Certificate Transparency logs are public — attackers can query them. Monitoring CT logs for certificates issued for your domains detects unauthorized certificate issuance (mis-issuance by CAs, account compromise) before attackers can use them for MITM attacks." },
      ],
      feedback: {
        perfect: "Certificate management complete: 30-day expiry alerts, automated renewal, OCSP stapling, and CT monitoring.",
        partial: "Manual renewal or missing CT monitoring remain. Certificate expiration is a leading cause of preventable outages.",
        wrong: "No expiry monitoring means you'll discover certificate issues when users see browser errors. Automated renewal is standard practice and eliminates this entire risk category.",
      },
    },
    {
      type: "toggle-config",
      id: "tls-003",
      title: "HTTP Security Transport Headers",
      description:
        "Configure HTTP security headers to enforce encrypted connections and prevent protocol downgrade attacks.",
      targetSystem: "prod-web-01 — HTTP Security Headers",
      items: [
        {
          id: "hsts",
          label: "HTTP Strict Transport Security (HSTS)",
          detail: "Controls whether browsers are instructed to always use HTTPS for this domain.",
          currentState: "not-set",
          correctState: "max-age-1year-includesubdomains",
          states: ["not-set", "max-age-1day", "max-age-1year-includesubdomains"],
          rationaleId: "rat-hsts",
        },
        {
          id: "hsts-preload",
          label: "HSTS Preload List Submission",
          detail: "Controls whether the domain is submitted to browser HSTS preload lists.",
          currentState: "not-submitted",
          correctState: "submitted",
          states: ["not-submitted", "submitted"],
          rationaleId: "rat-preload",
        },
        {
          id: "http-redirect",
          label: "HTTP to HTTPS Redirect",
          detail: "Controls whether plain HTTP requests are redirected to HTTPS.",
          currentState: "no-redirect",
          correctState: "301-permanent",
          states: ["no-redirect", "302-temporary", "301-permanent"],
          rationaleId: "rat-redirect",
        },
        {
          id: "mixed-content",
          label: "Mixed Content Policy",
          detail: "Controls whether the page can load HTTP resources on an HTTPS page.",
          currentState: "allowed",
          correctState: "blocked",
          states: ["allowed", "blocked"],
          rationaleId: "rat-mixed",
        },
      ],
      rationales: [
        { id: "rat-hsts", text: "HSTS instructs browsers to refuse non-HTTPS connections for the domain, preventing SSL-stripping attacks. includeSubDomains applies to all subdomains. 1-year max-age is the minimum for HSTS preload eligibility." },
        { id: "rat-preload", text: "HSTS headers protect users after their first visit, but the first visit is still vulnerable to SSL stripping. HSTS preload lists ensure browsers enforce HTTPS even on the very first visit to the domain." },
        { id: "rat-redirect", text: "301 permanent redirects (vs 302 temporary) are cached by browsers, improving performance. Without HTTP→HTTPS redirect, plain HTTP access still works and is vulnerable to downgrade attacks." },
        { id: "rat-mixed", text: "Mixed content (HTTP resources on HTTPS pages) allows attackers to inject malicious scripts or modify images via MITM attacks on the non-HTTPS sub-requests. Block all mixed content." },
      ],
      feedback: {
        perfect: "Transport security headers complete: HSTS with includeSubDomains, preload submitted, permanent HTTPS redirect, mixed content blocked.",
        partial: "HSTS without preload or missing HTTP redirect leave first-visit SSL stripping vulnerabilities. Both are required for complete transport security.",
        wrong: "No HSTS means SSL-stripping tools can downgrade HTTPS connections to HTTP transparently. HSTS is fundamental to enforcing encrypted transport.",
      },
    },
  ],

  hints: [
    "TLS 1.0 and 1.1 are banned by PCI DSS and deprecated by RFC 8996 — any system handling payment card data must use TLS 1.2 minimum.",
    "HSTS headers only protect users after their first visit — HSTS preload lists protect first-time visitors by pre-loading the policy in the browser.",
    "Certificate Transparency logs are public — set up CT monitoring to detect unauthorized certificates issued for your domains before attackers can use them.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "TLS misconfiguration is a perennial finding in penetration tests and security assessments. Web security engineers and network security professionals must understand both the cryptographic weaknesses of deprecated protocols and the practical impact of missing transport security headers.",
  toolRelevance: [
    "SSL Labs / sslyze (TLS scanning)",
    "testssl.sh (command-line TLS audit)",
    "Let's Encrypt / Certbot (automated renewal)",
    "hstspreload.org (preload submission)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
