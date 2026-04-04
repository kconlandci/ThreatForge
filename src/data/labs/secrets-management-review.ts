import type { LabManifest } from "../../types/manifest";

export const secretsManagementReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "secrets-management-review",
  version: 1,
  title: "Secrets Management Security Review",

  tier: "intermediate",
  track: "vulnerability-hardening",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["secrets-management", "hardcoded-credentials", "env-vars", "vault", "key-rotation", "devsecops"],

  description:
    "Identify and remediate insecure secrets management patterns including hardcoded credentials, cleartext environment variables, and improperly scoped secret access across application and infrastructure configurations.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify hardcoded credentials and insecure secret storage patterns in code and configuration",
    "Apply least-privilege principles to secret access scoping",
    "Configure centralized secrets management with rotation and audit logging",
  ],
  sortOrder: 600,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "secrets-001",
      title: "Application Secret Storage Patterns",
      description:
        "An application uses several insecure patterns for storing secrets. Configure each to follow secrets management best practices.",
      targetSystem: "payments-service — Secret Storage Configuration",
      items: [
        {
          id: "db-password",
          label: "Database Password Storage",
          detail: "How the application's database connection password is stored and accessed.",
          currentState: "hardcoded-source",
          correctState: "secrets-manager-runtime",
          states: ["hardcoded-source", "env-file-committed", "env-var-runtime", "secrets-manager-runtime"],
          rationaleId: "rat-db-password",
        },
        {
          id: "api-key-storage",
          label: "Third-Party API Key Storage",
          detail: "Where API keys for payment processors and notification services are kept.",
          currentState: "config-file-repo",
          correctState: "secrets-manager-runtime",
          states: ["config-file-repo", "env-var-runtime", "secrets-manager-runtime"],
          rationaleId: "rat-api-key",
        },
        {
          id: "jwt-secret",
          label: "JWT Signing Secret",
          detail: "How the application's JWT signing key is stored.",
          currentState: "hardcoded-source",
          correctState: "secrets-manager-runtime",
          states: ["hardcoded-source", "env-var-runtime", "secrets-manager-runtime"],
          rationaleId: "rat-jwt",
        },
        {
          id: "secret-logging",
          label: "Secret Value Logging",
          detail: "Controls whether secrets passed as environment variables appear in application logs.",
          currentState: "unfiltered",
          correctState: "filtered",
          states: ["unfiltered", "filtered"],
          rationaleId: "rat-log-filter",
        },
      ],
      rationales: [
        { id: "rat-db-password", text: "Hardcoded passwords in source code are committed to version history, visible in all repository clones, and require a code change to rotate. Secrets managers provide runtime injection, centralized rotation, and access audit trails." },
        { id: "rat-api-key", text: "Config files committed to repositories are a primary source of API key leakage — they appear in PRs, forks, CI logs, and backups. Runtime secrets manager fetching eliminates this entire exposure surface." },
        { id: "rat-jwt", text: "A hardcoded JWT signing key means every service that shares the codebase can forge tokens. If compromised, rotation requires redeployment. Runtime secrets manager keys can be rotated without code changes." },
        { id: "rat-log-filter", text: "Environment variables containing secrets appear in process listings, crash dumps, and debug logs. Log filtering should scrub known-sensitive variable names before any log output." },
      ],
      feedback: {
        perfect: "All secrets properly managed via runtime secrets manager with log filtering enabled.",
        partial: "Some secrets remain in source control or committed config files. Any secret in version history requires that entire commit history to be treated as compromised.",
        wrong: "Hardcoded credentials in source code are the most common and consequential secrets exposure pattern. Immediate rotation and migration to secrets manager is required.",
      },
    },
    {
      type: "toggle-config",
      id: "secrets-002",
      title: "Secrets Access Controls and Scoping",
      description:
        "Review and configure who and what can access which secrets in the centralized secrets manager.",
      targetSystem: "AWS Secrets Manager — Access Policy Configuration",
      items: [
        {
          id: "service-scope",
          label: "Service Secret Scope",
          detail: "Controls which services can access which secrets (e.g., whether the web frontend can read DB passwords).",
          currentState: "all-services-all-secrets",
          correctState: "per-service-scoped",
          states: ["all-services-all-secrets", "per-service-scoped"],
          rationaleId: "rat-service-scope",
        },
        {
          id: "human-access",
          label: "Developer Direct Secret Access",
          detail: "Controls whether developers can directly read production secret values.",
          currentState: "unrestricted-read",
          correctState: "break-glass-audited",
          states: ["unrestricted-read", "break-glass-audited", "no-human-access"],
          rationaleId: "rat-human-access",
        },
        {
          id: "cross-env",
          label: "Cross-Environment Secret Access",
          detail: "Controls whether staging and dev environments can access production secrets.",
          currentState: "shared-secrets",
          correctState: "env-isolated",
          states: ["shared-secrets", "env-isolated"],
          rationaleId: "rat-cross-env",
        },
        {
          id: "audit-logging",
          label: "Secret Access Audit Logging",
          detail: "Controls whether all secret reads and writes are logged with caller identity.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-audit",
        },
      ],
      rationales: [
        { id: "rat-service-scope", text: "Allowing all services to read all secrets means a compromised frontend service can read payment processing credentials, database passwords, and signing keys. Each service should only access the specific secrets it needs to function." },
        { id: "rat-human-access", text: "Developers with unrestricted production secret access creates insider threat risk and complicates PCI/SOC2 compliance. Break-glass access with audit trails provides accountability without blocking legitimate emergency access." },
        { id: "rat-cross-env", text: "Shared secrets between environments mean a developer or staging breach can expose production credentials. Environment isolation ensures a staging compromise can't escalate to production." },
        { id: "rat-audit", text: "Secret access audit logs are essential for breach investigation — they show exactly which services accessed which secrets and when. Without them, it's impossible to determine the blast radius of a compromise." },
      ],
      feedback: {
        perfect: "Secrets access properly scoped: per-service access, break-glass human access, environment isolation, and audit logging configured.",
        partial: "Overly broad secret access or missing audit logs remain. Over-privileged access to secrets is one misconfiguration away from full credential compromise.",
        wrong: "All-services-all-secrets with unrestricted developer access violates least privilege and creates significant insider threat and breach amplification risk.",
      },
    },
    {
      type: "toggle-config",
      id: "secrets-003",
      title: "Secret Rotation and Lifecycle Management",
      description:
        "Configure rotation policies and lifecycle controls for all credential types in the production environment.",
      targetSystem: "Production Credential Lifecycle Policy",
      items: [
        {
          id: "db-rotation",
          label: "Database Credential Rotation",
          detail: "Controls how often database passwords are automatically rotated.",
          currentState: "never",
          correctState: "30-days-automated",
          states: ["never", "90-days-manual", "30-days-automated"],
          rationaleId: "rat-db-rotation",
        },
        {
          id: "api-key-expiry",
          label: "API Key Expiration",
          detail: "Controls whether third-party API keys have enforced expiration dates.",
          currentState: "no-expiry",
          correctState: "90-day-expiry",
          states: ["no-expiry", "1-year-expiry", "90-day-expiry"],
          rationaleId: "rat-key-expiry",
        },
        {
          id: "leaked-detection",
          label: "Secret Leak Detection (GitHub/GitLab scanning)",
          detail: "Controls whether commits are automatically scanned for accidentally committed secrets.",
          currentState: "disabled",
          correctState: "pre-commit-and-ci",
          states: ["disabled", "ci-only", "pre-commit-and-ci"],
          rationaleId: "rat-detection",
        },
        {
          id: "emergency-revocation",
          label: "Emergency Revocation SLA",
          detail: "Controls how quickly a reported compromised secret can be revoked.",
          currentState: "no-process",
          correctState: "15-min-automated",
          states: ["no-process", "same-day-manual", "15-min-automated"],
          rationaleId: "rat-revocation",
        },
      ],
      rationales: [
        { id: "rat-db-rotation", text: "Credentials that never rotate remain valid indefinitely after any exposure — including from employees who have left the organization. Automated 30-day rotation limits exposure windows without requiring manual intervention." },
        { id: "rat-key-expiry", text: "API keys without expiration dates are a long-term risk: they remain valid years after being inadvertently committed or shared. 90-day expiry forces regular review and rotation." },
        { id: "rat-detection", text: "Pre-commit hooks catch secrets before they reach the repository. CI scanning catches anything that slips through. Both layers together prevent the most common secrets leakage vector (accidental commit)." },
        { id: "rat-revocation", text: "When a credential is known to be compromised, the window before revocation is the attacker's opportunity. 15-minute automated revocation (triggered by security alerts or engineer reports) minimizes blast radius." },
      ],
      feedback: {
        perfect: "Secret lifecycle fully managed: automated rotation, key expiry, dual-layer leak detection, and rapid revocation process.",
        partial: "Long-lived or non-expiring credentials remain. Secrets that never rotate are fully valid for attackers indefinitely after any exposure.",
        wrong: "No rotation, no expiry, and no leak detection means any secret exposure — past or future — results in indefinite attacker access. Rotation policies are fundamental to secrets security.",
      },
    },
  ],

  hints: [
    "Any secret committed to version control must be treated as permanently compromised — rotating it isn't enough if the git history remains accessible.",
    "Scope secrets to individual services, not teams or environments. A compromised microservice should expose only that service's credentials.",
    "Pre-commit hooks for secret detection are more effective than CI scanning — they catch leaks before they ever reach the repository or CI logs.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Secrets sprawl and hardcoded credentials are among the most common findings in cloud security assessments. Cloud security engineers and DevSecOps practitioners who can implement proper secrets lifecycle management are essential for modern security programs.",
  toolRelevance: [
    "HashiCorp Vault",
    "AWS Secrets Manager",
    "GitLeaks / TruffleHog (secret scanning)",
    "1Password Secrets Automation",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
