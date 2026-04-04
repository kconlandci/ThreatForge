import type { LabManifest } from "../../types/manifest";

export const kubernetesSecurityAuditLab: LabManifest = {
  schemaVersion: "1.1",
  id: "kubernetes-security-audit",
  version: 1,
  title: "Kubernetes Security Audit",

  tier: "advanced",
  track: "cloud-security",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["kubernetes", "k8s", "container-security", "rbac", "pod-security", "cloud-native"],

  description:
    "Audit Kubernetes cluster configurations to identify and remediate security misconfigurations in pod security, RBAC, network policies, and secrets management.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Identify dangerous Kubernetes pod security misconfigurations",
    "Evaluate RBAC policies for least-privilege violations",
    "Assess network policy and secrets management configurations",
  ],
  sortOrder: 330,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "k8s-001",
      title: "Pod Security Standards",
      description:
        "The production namespace is running workloads with permissive pod security settings. Review each configuration and set it to the most secure option.",
      targetSystem: "production-namespace",
      items: [
        {
          id: "privileged",
          label: "Privileged Containers",
          detail: "Allows containers to run with all host capabilities, effectively giving root on the node.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-priv",
        },
        {
          id: "host-network",
          label: "hostNetwork Access",
          detail: "Allows pods to use the host's network namespace, bypassing network policies.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-hostnet",
        },
        {
          id: "run-as-root",
          label: "Run as Root User",
          detail: "Allows containers to execute processes as UID 0 (root).",
          currentState: "allowed",
          correctState: "blocked",
          states: ["allowed", "blocked"],
          rationaleId: "rat-root",
        },
        {
          id: "ro-rootfs",
          label: "Read-Only Root Filesystem",
          detail: "Forces the container root filesystem to be mounted read-only, preventing runtime modifications.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-rofs",
        },
      ],
      rationales: [
        { id: "rat-priv", text: "Privileged containers can escape to the host — never use in production." },
        { id: "rat-hostnet", text: "hostNetwork bypasses all network policies and exposes the host network stack." },
        { id: "rat-root", text: "Running as root inside containers increases the blast radius of any container escape." },
        { id: "rat-rofs", text: "Read-only root filesystems prevent malware from writing to the container filesystem at runtime." },
      ],
      feedback: {
        perfect: "All pod security settings hardened. This namespace now enforces the restricted Pod Security Standard.",
        partial: "Some settings remain permissive. Review each item — production workloads should never need privileged access or host networking.",
        wrong: "Multiple critical misconfigurations remain. Privileged containers and host networking in production are severe risks.",
      },
    },
    {
      type: "toggle-config",
      id: "k8s-002",
      title: "RBAC Over-Permissioning",
      description:
        "The developer role has accumulated excessive permissions over time. Review and restrict each permission to follow least privilege.",
      targetSystem: "developer-role ClusterRoleBinding",
      items: [
        {
          id: "cluster-admin",
          label: "cluster-admin Binding",
          detail: "Grants full administrative access to the entire cluster including all namespaces.",
          currentState: "bound",
          correctState: "unbound",
          states: ["bound", "unbound"],
          rationaleId: "rat-cadmin",
        },
        {
          id: "wildcard-verbs",
          label: "Wildcard Verb Permissions (*)",
          detail: "Allows all actions (get, list, create, delete, etc.) on resources.",
          currentState: "allowed",
          correctState: "restricted",
          states: ["allowed", "restricted"],
          rationaleId: "rat-wildcard",
        },
        {
          id: "secrets-access",
          label: "Secrets Access Level",
          detail: "Controls the developer role's access to Kubernetes secrets.",
          currentState: "full-access",
          correctState: "read-only",
          states: ["full-access", "read-only", "no-access"],
          rationaleId: "rat-secrets",
        },
        {
          id: "namespace-scope",
          label: "Permission Scope",
          detail: "Determines whether the role applies cluster-wide or to specific namespaces.",
          currentState: "cluster-wide",
          correctState: "namespace-scoped",
          states: ["cluster-wide", "namespace-scoped"],
          rationaleId: "rat-scope",
        },
      ],
      rationales: [
        { id: "rat-cadmin", text: "Developers should never have cluster-admin. Use namespace-scoped roles with specific permissions." },
        { id: "rat-wildcard", text: "Wildcard verbs grant implicit delete and escalate capabilities — always enumerate specific verbs." },
        { id: "rat-secrets", text: "Developers need to read secrets for debugging but should not create or modify them in production." },
        { id: "rat-scope", text: "Namespace-scoped roles limit blast radius — developers should only access their team's namespaces." },
      ],
      feedback: {
        perfect: "RBAC now follows least privilege. Developers have only the permissions they need, scoped to their namespaces.",
        partial: "Some permissions are still too broad. Review cluster-admin binding and wildcard verbs — these are the highest-risk items.",
        wrong: "Critical RBAC violations remain. cluster-admin binding for developers is one of the most common Kubernetes security mistakes.",
      },
    },
    {
      type: "toggle-config",
      id: "k8s-003",
      title: "Network Policies and Secrets Management",
      description:
        "The payment-service deployment handles credit card data but lacks proper network isolation and secrets protection. Harden these settings.",
      targetSystem: "payment-service Deployment",
      items: [
        {
          id: "default-deny",
          label: "Default Deny Ingress Policy",
          detail: "Controls whether unlisted pods can send traffic to this service.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-deny",
        },
        {
          id: "pod-restriction",
          label: "Pod-to-Pod Communication",
          detail: "Controls which pods can communicate with the payment service.",
          currentState: "allow-all",
          correctState: "restricted",
          states: ["allow-all", "restricted"],
          rationaleId: "rat-pod2pod",
        },
        {
          id: "secrets-encryption",
          label: "Secrets Encryption at Rest",
          detail: "Controls whether Kubernetes secrets are encrypted in etcd storage.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-encrypt",
        },
        {
          id: "service-mesh",
          label: "Service Mesh mTLS",
          detail: "Enforces mutual TLS for all service-to-service communication.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-mtls",
        },
      ],
      rationales: [
        { id: "rat-deny", text: "Default deny ensures only explicitly allowed traffic reaches the payment service — critical for PCI compliance." },
        { id: "rat-pod2pod", text: "Only the API gateway and order service should communicate with payments — all other pod traffic should be blocked." },
        { id: "rat-encrypt", text: "Unencrypted secrets in etcd are readable by anyone with etcd access — encryption at rest is mandatory for sensitive data." },
        { id: "rat-mtls", text: "mTLS prevents network sniffing and ensures service identity verification for every connection." },
      ],
      feedback: {
        perfect: "Payment service is now properly isolated with encrypted secrets and mTLS. This meets PCI DSS network segmentation requirements.",
        partial: "Some protections are missing. A payment service handling card data needs all layers — network policies, encryption, and mTLS.",
        wrong: "Critical gaps remain in the payment service security. Without network policies and encryption, card data is exposed.",
      },
    },
  ],

  hints: [
    "Privileged containers and hostNetwork should never be enabled in production — they give pods host-level access.",
    "RBAC follows least privilege: namespace-scoped roles with explicit verbs, never cluster-admin for developers.",
    "Payment and sensitive workloads need defense in depth: network policies, secrets encryption, and mTLS together.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Kubernetes security is one of the fastest-growing specializations in cybersecurity. CKS (Certified Kubernetes Security Specialist) holders command premium salaries as organizations accelerate cloud-native adoption.",
  toolRelevance: [
    "kube-bench (CIS Benchmarks)",
    "Falco (Runtime Security)",
    "OPA/Gatekeeper (Policy Enforcement)",
    "Trivy (Vulnerability Scanning)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
