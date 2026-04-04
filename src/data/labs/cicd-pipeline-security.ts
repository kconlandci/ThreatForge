import type { LabManifest } from "../../types/manifest";

export const cicdPipelineSecurityLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cicd-pipeline-security",
  version: 1,
  title: "CI/CD Pipeline Security Audit",

  tier: "intermediate",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["cicd", "devops", "pipeline-security", "secrets", "supply-chain", "github-actions"],

  description:
    "Audit a CI/CD pipeline configuration for hardcoded secrets, excessive permissions, unverified third-party actions, and missing security controls that enable supply chain attacks.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify insecure CI/CD pipeline configurations that expose secrets and enable supply chain attacks",
    "Apply principle of least privilege to pipeline permissions and secret access",
    "Configure security controls including pinned actions, secret scanning, and approval gates",
  ],
  sortOrder: 590,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "cicd-001",
      title: "GitHub Actions Workflow Permissions",
      description:
        "A GitHub Actions workflow has several security misconfigurations. Configure each setting to follow security best practices.",
      targetSystem: ".github/workflows/deploy.yml — GitHub Actions",
      items: [
        {
          id: "permissions",
          label: "Workflow Permissions",
          detail: "Controls what the GITHUB_TOKEN can do within the workflow run.",
          currentState: "write-all",
          correctState: "read-only-scoped",
          states: ["write-all", "read-only-scoped", "none"],
          rationaleId: "rat-permissions",
        },
        {
          id: "action-pinning",
          label: "Third-Party Action Versioning",
          detail: "Controls how third-party GitHub Actions are referenced.",
          currentState: "mutable-tag",
          correctState: "pinned-sha",
          states: ["mutable-tag", "pinned-sha", "forked-internal"],
          rationaleId: "rat-pinning",
        },
        {
          id: "pr-approval",
          label: "Deployment Approval Gate",
          detail: "Controls whether deployments to production require manual approval.",
          currentState: "disabled",
          correctState: "required",
          states: ["disabled", "required"],
          rationaleId: "rat-approval",
        },
        {
          id: "pull-request-fork",
          label: "Fork PR Workflow Trigger",
          detail: "Controls whether workflows triggered by fork PRs have access to secrets.",
          currentState: "pull_request_target",
          correctState: "pull_request",
          states: ["pull_request_target", "pull_request"],
          rationaleId: "rat-fork",
        },
      ],
      rationales: [
        { id: "rat-permissions", text: "write-all grants the workflow token write access to all repository resources. Least-privilege requires scoping to only needed permissions (e.g., contents: read, packages: write)." },
        { id: "rat-pinning", text: "Mutable tags like uses: actions/checkout@v4 can be silently redirected to malicious code. Pinning to a commit SHA (uses: actions/checkout@abc123) ensures the exact verified code runs." },
        { id: "rat-approval", text: "Automated deploys to production without approval gates allow a compromised PR merge or workflow injection to directly deploy malicious code to production." },
        { id: "rat-fork", text: "pull_request_target runs with write permissions and secret access for external fork PRs — the classic GitHub Actions supply chain attack vector. Use pull_request instead, which runs with limited permissions." },
      ],
      feedback: {
        perfect: "Workflow hardened: scoped permissions, pinned actions, deployment approval, and safe fork trigger configured.",
        partial: "Some high-risk settings remain. Fork PR trigger and permissions are the highest-priority items.",
        wrong: "pull_request_target with write-all permissions on fork PRs is a critical supply chain attack vector that has been actively exploited.",
      },
    },
    {
      type: "toggle-config",
      id: "cicd-002",
      title: "Secrets Management in Pipeline",
      description:
        "The pipeline currently has several insecure secret handling patterns. Configure each to eliminate secret exposure.",
      targetSystem: "Jenkins Pipeline — Secrets Configuration",
      items: [
        {
          id: "secret-storage",
          label: "Secret Storage Method",
          detail: "Controls where pipeline secrets (API keys, tokens) are stored.",
          currentState: "hardcoded-env",
          correctState: "secrets-manager",
          states: ["hardcoded-env", "env-file", "secrets-manager"],
          rationaleId: "rat-storage",
        },
        {
          id: "secret-logging",
          label: "Secret Masking in Logs",
          detail: "Controls whether secret values are redacted from pipeline log output.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-logging",
        },
        {
          id: "secret-scope",
          label: "Secret Availability Scope",
          detail: "Controls which pipeline stages and jobs can access production secrets.",
          currentState: "all-stages",
          correctState: "deploy-stage-only",
          states: ["all-stages", "deploy-stage-only", "main-branch-only"],
          rationaleId: "rat-scope",
        },
        {
          id: "rotation-policy",
          label: "Deploy Key Rotation",
          detail: "Controls how often deployment credentials are automatically rotated.",
          currentState: "manual-never",
          correctState: "automated-30-days",
          states: ["manual-never", "automated-30-days", "automated-90-days"],
          rationaleId: "rat-rotation",
        },
      ],
      rationales: [
        { id: "rat-storage", text: "Hardcoded secrets in pipeline configuration are committed to version history, visible in repo exports, and not revocable individually. Secrets managers (AWS Secrets Manager, HashiCorp Vault) provide centralized rotation and access audit." },
        { id: "rat-logging", text: "Unmasked secrets in pipeline logs are visible to everyone with log read access — often a much broader audience than secrets access. Log masking is non-negotiable for any sensitive value." },
        { id: "rat-scope", text: "Production deploy keys accessible in the test stage expose them to test code, which often has lower security review standards and broader contributor access." },
        { id: "rat-rotation", text: "Deploy credentials that never rotate remain valid indefinitely after any exposure. Automated 30-day rotation limits the exposure window even when a breach goes undetected." },
      ],
      feedback: {
        perfect: "Secrets properly managed: centralized storage, log masking, scoped access, and automated rotation.",
        partial: "Hardcoded secrets or unmasked logs remain. Either means secrets are accessible to unauthorized users.",
        wrong: "Hardcoded secrets in pipeline configs are the leading cause of CI/CD-related credential exposure. Move to a secrets manager immediately.",
      },
    },
    {
      type: "toggle-config",
      id: "cicd-003",
      title: "Artifact Integrity and Dependency Security",
      description:
        "The build pipeline pulls dependencies and produces artifacts without integrity verification. Configure appropriate controls.",
      targetSystem: "Build Pipeline — Artifact & Dependency Security",
      items: [
        {
          id: "dependency-lock",
          label: "Dependency Lock Files",
          detail: "Controls whether exact dependency versions are locked and verified during builds.",
          currentState: "floating-versions",
          correctState: "locked-verified",
          states: ["floating-versions", "locked-verified"],
          rationaleId: "rat-deps",
        },
        {
          id: "sast-scan",
          label: "SAST Scanning on PR",
          detail: "Controls whether static analysis security testing runs on every pull request.",
          currentState: "disabled",
          correctState: "blocking",
          states: ["disabled", "non-blocking", "blocking"],
          rationaleId: "rat-sast",
        },
        {
          id: "artifact-signing",
          label: "Build Artifact Signing",
          detail: "Controls whether build artifacts are cryptographically signed before deployment.",
          currentState: "none",
          correctState: "cosign",
          states: ["none", "checksum-only", "cosign"],
          rationaleId: "rat-signing",
        },
        {
          id: "dependency-audit",
          label: "Known Vulnerability Scanning (SCA)",
          detail: "Controls whether dependencies are scanned against vulnerability databases.",
          currentState: "disabled",
          correctState: "blocking-critical",
          states: ["disabled", "non-blocking", "blocking-critical"],
          rationaleId: "rat-sca",
        },
      ],
      rationales: [
        { id: "rat-deps", text: "Floating dependency versions (^1.2.0, latest) allow malicious updates to silently enter builds. Lock files pin exact versions; CI should verify lock file integrity matches the repository." },
        { id: "rat-sast", text: "Non-blocking SAST produces noise that gets ignored. Blocking critical findings in SAST prevents known vulnerability patterns from being merged — but must be tuned to avoid false-positive fatigue." },
        { id: "rat-signing", text: "Cosign (Sigstore) provides cryptographic signing of container images and artifacts. Deployment systems can verify signatures, preventing tampered artifacts from reaching production." },
        { id: "rat-sca", text: "SCA (Software Composition Analysis) catches known CVEs in dependencies. Blocking on critical severity prevents deploying packages with known RCE/privilege escalation vulnerabilities." },
      ],
      feedback: {
        perfect: "Artifact pipeline secured: locked dependencies, blocking SAST, artifact signing, and SCA configured.",
        partial: "Some dependency or artifact controls remain weak. Floating dependencies and unsigned artifacts are common supply chain attack vectors.",
        wrong: "Floating dependencies and no vulnerability scanning means malicious packages or known-vulnerable libraries can silently enter your production build.",
      },
    },
  ],

  hints: [
    "pull_request_target runs with write permissions for fork PRs — use pull_request instead, which is isolated to read-only permissions for external contributors.",
    "Pin GitHub Actions to commit SHAs (not tags) — tags are mutable and can be silently redirected to malicious code.",
    "Scope secrets to the minimum necessary pipeline stage — production deploy keys should never be accessible during test or build stages.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "CI/CD supply chain attacks (SolarWinds, CodeCov, 3CX) have become a top-tier attack vector. DevSecOps engineers who understand pipeline security controls are in high demand as organizations shift security left.",
  toolRelevance: [
    "GitHub Advanced Security (secret scanning, SAST)",
    "Sigstore / Cosign (artifact signing)",
    "Dependabot / Snyk (SCA)",
    "HashiCorp Vault (secrets management)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
