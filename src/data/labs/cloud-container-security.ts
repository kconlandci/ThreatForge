import type { LabManifest } from "../../types/manifest";

export const cloudContainerSecurityLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cloud-container-security",
  version: 1,
  title: "Cloud Container Security",

  tier: "intermediate",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "kubernetes",
    "containers",
    "ecr",
    "docker",
    "pod-security",
    "secrets",
    "cloud-native",
  ],

  description:
    "Triage and remediate container and Kubernetes security findings including vulnerable base images, dangerous pod security contexts, unscanned registries, and secrets mismanagement.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Identify critical container security misconfigurations in Kubernetes",
    "Apply pod security best practices including non-root execution",
    "Evaluate container image security through scanning and lifecycle management",
    "Implement proper Kubernetes secrets management",
    "Classify container security findings by real-world risk",
  ],
  sortOrder: 280,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "container-001",
      title: "EOL Node.js Base Image — 47 CVEs",
      description:
        "Container image scan for the production API service reveals a severely outdated base image with known vulnerabilities.",
      evidence: [
        {
          type: "Image Scan",
          content:
            "Base: node:14.21 (EOL since April 2023). 47 CVEs found: 3 Critical, 8 High, 19 Medium, 17 Low.",
        },
        {
          type: "Critical CVEs",
          content:
            "CVE-2023-44487 (HTTP/2 Rapid Reset DoS, CVSS 7.5), CVE-2024-21892 (V8 type confusion RCE, CVSS 9.8), CVE-2024-22019 (HTTP request smuggling, CVSS 7.5)",
        },
        {
          type: "Runtime Context",
          content:
            "Image runs API service processing 8K req/sec. Exposed to internet via load balancer. Pod has network access to internal database cluster.",
        },
        {
          type: "Last Rebuild",
          content:
            "Image last built 14 months ago. No CI/CD pipeline — manual docker build and push.",
        },
      ],
      classifications: [
        { id: "c-critical", label: "Critical", description: "Requires immediate action — active exploitation risk." },
        { id: "c-high", label: "High", description: "Significant risk requiring urgent remediation." },
        { id: "c-medium", label: "Medium", description: "Moderate risk — schedule for near-term fix." },
        { id: "c-low", label: "Low", description: "Minor risk — address in regular maintenance." },
      ],
      correctClassificationId: "c-critical",
      remediations: [
        {
          id: "r-rebuild",
          label: "Rebuild on node:20-alpine + implement CI/CD with automated scanning",
          description: "Moves to a supported LTS base, reduces attack surface with Alpine, and prevents future drift with automated scanning.",
        },
        {
          id: "r-patch",
          label: "Patch individual CVEs on current base",
          description: "Attempts to fix specific vulnerabilities without changing the unsupported base image.",
        },
        {
          id: "r-schedule",
          label: "Schedule rebuild for next quarter",
          description: "Plans remediation within the normal development cycle.",
        },
        {
          id: "r-waf",
          label: "Accept risk with WAF protection",
          description: "Relies on web application firewall to mitigate exploitation of known vulnerabilities.",
        },
      ],
      correctRemediationId: "r-rebuild",
      rationales: [
        {
          id: "rat-rebuild",
          text: "EOL base image with a CVSS 9.8 RCE on an internet-facing service demands immediate rebuild — individual patching on an EOL image is a losing battle.",
        },
        {
          id: "rat-patch",
          text: "Patching individual CVEs is unsustainable on an unsupported base that will never receive official security updates.",
        },
        {
          id: "rat-schedule",
          text: "Quarterly timeline is too slow for an internet-facing service with a CVSS 9.8 RCE vulnerability.",
        },
        {
          id: "rat-waf",
          text: "A WAF doesn't protect against all CVE types — the V8 type confusion RCE exploits the runtime itself, not the HTTP layer.",
        },
      ],
      correctRationaleId: "rat-rebuild",
      feedback: {
        perfect:
          "Correct. An EOL base image with a CVSS 9.8 RCE on an internet-facing service is critical. Rebuilding on a supported LTS Alpine image with CI/CD scanning prevents both the current vulnerabilities and future drift.",
        partial:
          "You identified the severity but chose an incomplete remediation. Patching individual CVEs on an unsupported base is unsustainable — the image needs a full rebuild.",
        wrong:
          "A CVSS 9.8 RCE on an internet-facing service processing 8K req/sec with database access is critical. The EOL base image needs immediate rebuild, not patching or WAF workarounds.",
      },
    },
    {
      type: "triage-remediate",
      id: "container-002",
      title: "Kubernetes Pod Running as Root with hostNetwork",
      description:
        "Security scan flagged a Kubernetes pod with dangerous security settings. The team says root is needed for file permissions.",
      evidence: [
        {
          type: "Pod Spec",
          content:
            "securityContext: runAsUser: 0 (root), hostNetwork: true, hostPID: true",
        },
        {
          type: "Resource Limits",
          content:
            "No CPU or memory limits set. Pod consumed 8GB RAM during a recent spike, affecting neighbor pods.",
        },
        {
          type: "Justification",
          content:
            "Dev team note: 'Needs root for writing to /var/data volume mount. hostNetwork required for binding to port 80.'",
        },
        {
          type: "Impact",
          content:
            "Pod runs batch data processing job in the 'production' namespace alongside customer-facing services.",
        },
      ],
      classifications: [
        { id: "c-critical", label: "Critical", description: "Requires immediate action — active exploitation risk." },
        { id: "c-high", label: "High", description: "Significant risk requiring urgent remediation." },
        { id: "c-medium", label: "Medium", description: "Moderate risk — schedule for near-term fix." },
        { id: "c-low", label: "Low", description: "Minor risk — address in regular maintenance." },
      ],
      correctClassificationId: "c-critical",
      remediations: [
        {
          id: "r-full-fix",
          label: "Non-root securityContext + remove hostNetwork + add resource limits + fix file permissions properly",
          description: "Addresses all security issues: uses initContainer/fsGroup for file permissions, Service with NodePort/Ingress for port 80, and sets resource limits.",
        },
        {
          id: "r-limits",
          label: "Add resource limits only",
          description: "Prevents resource exhaustion but doesn't address root access or host networking.",
        },
        {
          id: "r-namespace",
          label: "Move to a dedicated namespace",
          description: "Isolates the pod from customer-facing services at the namespace level.",
        },
        {
          id: "r-accept",
          label: "Accept — batch jobs need different security profiles",
          description: "Allows the current configuration based on workload type.",
        },
      ],
      correctRemediationId: "r-full-fix",
      rationales: [
        {
          id: "rat-full",
          text: "Root + hostNetwork + hostPID equals full node access — fix file permissions with initContainer/fsGroup instead of running as root, use a Service with NodePort/Ingress instead of hostNetwork.",
        },
        {
          id: "rat-limits",
          text: "Resource limits alone don't address the root access issue — a root pod with hostNetwork can escape the container entirely.",
        },
        {
          id: "rat-namespace",
          text: "Namespace isolation helps but doesn't fix the fundamental pod security — root with hostNetwork can access the node regardless of namespace.",
        },
        {
          id: "rat-accept",
          text: "Accepting root for file permissions ignores simple alternatives like fsGroup and initContainers that achieve the same result without root.",
        },
      ],
      correctRationaleId: "rat-full",
      feedback: {
        perfect:
          "Excellent. You recognized that root + hostNetwork + hostPID is a container escape waiting to happen, and that the developer justifications have simple non-root alternatives. fsGroup for permissions, Ingress for port 80, and resource limits for neighbor protection.",
        partial:
          "You addressed some issues but the pod still has dangerous privileges. Root with hostNetwork means a compromised pod owns the entire node.",
        wrong:
          "A root pod with hostNetwork and hostPID in the production namespace has full access to the underlying node. The file permission and port 80 justifications have well-known non-root solutions.",
      },
    },
    {
      type: "triage-remediate",
      id: "container-003",
      title: "ECR Registry — No Security Controls",
      description:
        "AWS ECR registry audit reveals no security controls are configured. The registry hosts images for all production services.",
      evidence: [
        {
          type: "Registry Config",
          content:
            "Amazon ECR repository: acme-prod-images. 234 images, 12 active services. No image scanning enabled. No lifecycle policies.",
        },
        {
          type: "Pull Configuration",
          content:
            "Images pulled over HTTPS (default). No image signing or verification. Any IAM user with ecr:GetAuthorizationToken can pull.",
        },
        {
          type: "Historical",
          content:
            "3 known-vulnerable images deployed to production in the past 6 months (discovered retroactively during audits).",
        },
        {
          type: "Cost",
          content:
            "Repository storing 890GB of untagged and old images. $45/month in storage for images never pulled.",
        },
      ],
      classifications: [
        { id: "c-critical", label: "Critical", description: "Requires immediate action — active exploitation risk." },
        { id: "c-high", label: "High", description: "Significant risk requiring urgent remediation." },
        { id: "c-medium", label: "Medium", description: "Moderate risk — schedule for near-term fix." },
        { id: "c-low", label: "Low", description: "Minor risk — address in regular maintenance." },
      ],
      correctClassificationId: "c-high",
      remediations: [
        {
          id: "r-comprehensive",
          label: "Enable scan-on-push + lifecycle policies + HTTPS enforcement + image signing",
          description: "Implements comprehensive registry security: automated vulnerability scanning, image cleanup, and cryptographic verification.",
        },
        {
          id: "r-scan-only",
          label: "Enable scanning only",
          description: "Adds vulnerability detection but no deployment gate or image verification.",
        },
        {
          id: "r-lifecycle",
          label: "Add lifecycle policies for cost savings",
          description: "Reduces storage costs but doesn't address security gaps.",
        },
        {
          id: "r-signing",
          label: "Implement image signing only",
          description: "Ensures image integrity but doesn't detect vulnerabilities.",
        },
      ],
      correctRemediationId: "r-comprehensive",
      rationales: [
        {
          id: "rat-comprehensive",
          text: "A production registry without scanning has already allowed 3 vulnerable deployments — comprehensive security requires scanning on push, lifecycle cleanup, and image verification.",
        },
        {
          id: "rat-scan",
          text: "Scanning alone doesn't prevent deployment of vulnerable images without a gate — you need both detection and enforcement.",
        },
        {
          id: "rat-lifecycle",
          text: "Lifecycle policies only address cost, not security — cleaning up old images doesn't prevent deploying vulnerable new ones.",
        },
        {
          id: "rat-signing",
          text: "Image signing without scanning means you're cryptographically verifying images that may contain critical vulnerabilities.",
        },
      ],
      correctRationaleId: "rat-comprehensive",
      feedback: {
        perfect:
          "Correct. The registry has already allowed 3 vulnerable images into production. Comprehensive controls — scan-on-push, lifecycle policies, and image signing — address detection, cleanup, and verification together.",
        partial:
          "You identified part of the solution but missed the comprehensive approach. Each control alone leaves gaps — scanning without gates, signing without scanning, or cleanup without detection.",
        wrong:
          "A production registry with no scanning, no signing, and no lifecycle policies has already proven dangerous with 3 retroactively discovered vulnerable deployments. All controls are needed together.",
      },
    },
    {
      type: "triage-remediate",
      id: "container-004",
      title: "Database Credentials in K8s Secrets — Unencrypted",
      description:
        "Compliance audit found that Kubernetes secrets containing database credentials are misconfigured. Assess and remediate.",
      evidence: [
        {
          type: "Secret Config",
          content:
            "Secret 'db-credentials' mounted as environment variable in 4 pods. Contains: DB_HOST, DB_USER, DB_PASSWORD in base64 (not encrypted).",
        },
        {
          type: "Encryption",
          content:
            "etcd encryption at rest: DISABLED. Secrets stored in plaintext in etcd datastore.",
        },
        {
          type: "RBAC",
          content:
            "Default namespace RBAC: all service accounts in 'production' namespace can read all secrets.",
        },
        {
          type: "Access Pattern",
          content:
            "Only svc-api-backend service account needs these credentials. 11 other service accounts have unnecessary access.",
        },
      ],
      classifications: [
        { id: "c-critical", label: "Critical", description: "Requires immediate action — active exploitation risk." },
        { id: "c-high", label: "High", description: "Significant risk requiring urgent remediation." },
        { id: "c-medium", label: "Medium", description: "Moderate risk — schedule for near-term fix." },
        { id: "c-low", label: "Low", description: "Minor risk — address in regular maintenance." },
      ],
      correctClassificationId: "c-high",
      remediations: [
        {
          id: "r-full",
          label: "File-mount + etcd encryption + scoped RBAC + external secrets manager",
          description: "Addresses all four issues: file mounts instead of env vars, etcd encryption at rest, least-privilege RBAC, and external secrets management.",
        },
        {
          id: "r-etcd",
          label: "Enable etcd encryption only",
          description: "Encrypts secrets at rest but doesn't fix RBAC or environment variable exposure.",
        },
        {
          id: "r-rbac",
          label: "Restrict RBAC access only",
          description: "Limits who can read secrets but leaves them unencrypted and exposed in env vars.",
        },
        {
          id: "r-env",
          label: "Move to environment variables with encryption",
          description: "Encrypts the values but environment variables remain visible in process listings.",
        },
      ],
      correctRemediationId: "r-full",
      rationales: [
        {
          id: "rat-full",
          text: "Environment variable secrets are visible in process listings, unencrypted etcd exposes secrets at rest, and overly broad RBAC means 11 unnecessary accounts can read database credentials — all four issues need remediation.",
        },
        {
          id: "rat-etcd",
          text: "etcd encryption alone doesn't fix RBAC or environment variable exposure — secrets are still readable by 11 unnecessary service accounts.",
        },
        {
          id: "rat-rbac",
          text: "RBAC alone leaves secrets unencrypted in etcd and exposed in environment variables — it's one layer of a multi-layer problem.",
        },
        {
          id: "rat-env",
          text: "Environment variables with encryption doesn't fix the RBAC issue — 11 service accounts still have unnecessary access to database credentials.",
        },
      ],
      correctRationaleId: "rat-full",
      feedback: {
        perfect:
          "Excellent. You recognized all four layers of the secrets management problem: env var exposure, unencrypted etcd, overly broad RBAC, and lack of external secrets management. Each alone is insufficient — all four need remediation.",
        partial:
          "You addressed some layers but Kubernetes secrets management requires a comprehensive approach. Fixing one issue while leaving others creates a false sense of security.",
        wrong:
          "Database credentials are exposed through four different vectors: environment variables, unencrypted etcd, overly broad RBAC, and no external secrets management. Each vector needs its own remediation.",
      },
    },
  ],

  hints: [
    "Running containers as root with hostNetwork gives an attacker full access to the underlying node. Always use non-root security contexts.",
    "Container base images should be rebuilt, not patched. EOL base images accumulate vulnerabilities faster than they can be individually addressed.",
    "Kubernetes secrets are base64-encoded, not encrypted. Without etcd encryption at rest and proper RBAC, they're readable by anyone with API access.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Container and Kubernetes security is the fastest-growing specialization in cloud security. Organizations adopting cloud-native architectures need security engineers who understand pod security contexts, image scanning pipelines, and secrets management.",
  toolRelevance: [
    "Trivy / Grype (container scanning)",
    "OPA Gatekeeper (Kubernetes policy)",
    "AWS ECR / Harbor (container registry)",
    "External Secrets Operator (K8s secrets management)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
