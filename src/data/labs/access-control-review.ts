import type { LabManifest } from "../../types/manifest";

export const accessControlReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "access-control-review",
  version: 1,
  title: "Access Control Review",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "access-control",
    "least-privilege",
    "offboarding",
    "iam",
    "compliance",
    "audit",
  ],

  description:
    "Audit user and service account permissions by applying the principle of least privilege. Correct over-permissioned accounts, handle offboarding, and restrict service account access to meet compliance standards.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Apply the principle of least privilege to user accounts",
    "Identify common offboarding access control failures",
    "Recognize excessive service account permissions",
    "Understand the relationship between access control and compliance",
  ],
  sortOrder: 80,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "acl-001",
      title: "Marketing Intern Access Audit",
      description:
        "Quarterly access review flagged intern account j.martinez with excessive permissions. Review and correct each access level.",
      targetSystem: "j.martinez — Marketing Intern",
      items: [
        {
          id: "finance-drive",
          label: "Finance Drive Access",
          detail:
            "Access level for the shared Finance department Google Drive folder containing budget spreadsheets and financial reports.",
          currentState: "Read/Write/Admin",
          correctState: "No Access",
          states: ["No Access", "Read Only", "Read/Write", "Read/Write/Admin"],
          rationaleId: "rat-intern-minimum",
        },
        {
          id: "marketing-drive",
          label: "Marketing Drive Access",
          detail:
            "Access level for the shared Marketing department Google Drive folder containing campaign assets and planning documents.",
          currentState: "Read/Write/Admin",
          correctState: "Read Only",
          states: ["No Access", "Read Only", "Read/Write", "Read/Write/Admin"],
          rationaleId: "rat-intern-minimum",
        },
        {
          id: "admin-console",
          label: "Admin Console Access",
          detail:
            "Access to the Google Workspace Admin Console for managing users, groups, and organizational settings.",
          currentState: "Enabled",
          correctState: "Disabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "rat-no-admin-temp",
        },
        {
          id: "email-distro",
          label: "Email Distribution Lists",
          detail:
            "Membership in company email distribution lists that control which group announcements the user receives.",
          currentState: "All Company + Marketing",
          correctState: "Marketing Only",
          states: ["None", "Marketing Only", "All Company + Marketing"],
          rationaleId: "rat-distro-scope",
        },
      ],
      rationales: [
        {
          id: "rat-intern-minimum",
          text: "Interns need minimum access for their role — read-only to their department and no access to unrelated departments like Finance.",
        },
        {
          id: "rat-no-admin-temp",
          text: "Admin access should never be granted to temporary staff. Administrative privileges must be reserved for permanent IT personnel.",
        },
        {
          id: "rat-distro-scope",
          text: "Distribution list access should match department scope. Interns only need communications relevant to their team.",
        },
        {
          id: "rat-full-access",
          text: "Full drive access is needed for intern projects to ensure they can contribute effectively.",
        },
      ],
      feedback: {
        perfect:
          "Excellent. You correctly restricted the intern to read-only department access, removed Finance and Admin access, and scoped distribution lists to Marketing only. This is textbook least privilege.",
        partial:
          "Some permissions were corrected but others remain too broad. Remember: interns should have the minimum access needed for their specific role, nothing more.",
        wrong:
          "The permissions are still excessive. An intern should never have Admin Console access, Finance Drive access, or company-wide distribution list membership.",
      },
    },
    {
      type: "toggle-config",
      id: "acl-002",
      title: "Terminated Employee Access Revocation",
      description:
        "Employee k.thompson (Senior Engineer) was terminated last Friday. IT received the offboarding ticket today. Verify all access has been properly revoked.",
      targetSystem: "k.thompson — Terminated Employee",
      items: [
        {
          id: "ad-account",
          label: "Active Directory Account",
          detail:
            "The employee's primary Windows domain account used for network authentication, file shares, and application access.",
          currentState: "Enabled",
          correctState: "Disabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "rat-term-revoke",
        },
        {
          id: "vpn-access",
          label: "VPN Access",
          detail:
            "Remote access VPN credentials allowing connection to the corporate network from external locations.",
          currentState: "Active",
          correctState: "Revoked",
          states: ["Active", "Revoked"],
          rationaleId: "rat-term-revoke",
        },
        {
          id: "email-forward",
          label: "Email Forwarding",
          detail:
            "Automatic forwarding rule that sends copies of all incoming emails to an external personal email address.",
          currentState: "Forwarding to k.thompson.personal@gmail.com",
          correctState: "Disabled",
          states: [
            "Disabled",
            "Forwarding to k.thompson.personal@gmail.com",
          ],
          rationaleId: "rat-email-exfil",
        },
        {
          id: "git-repo",
          label: "Git Repository Access",
          detail:
            "Access to company source code repositories including proprietary application code and infrastructure-as-code configurations.",
          currentState: "Read/Write",
          correctState: "Revoked",
          states: ["Revoked", "Read Only", "Read/Write"],
          rationaleId: "rat-term-revoke",
        },
        {
          id: "building-badge",
          label: "Building Badge",
          detail:
            "Physical access badge for entering the office building, server rooms, and restricted areas.",
          currentState: "Active",
          correctState: "Deactivated",
          states: ["Active", "Deactivated"],
          rationaleId: "rat-physical-access",
        },
      ],
      rationales: [
        {
          id: "rat-term-revoke",
          text: "Terminated employees must have all access revoked immediately. Any delay creates a window where the former employee could access company systems.",
        },
        {
          id: "rat-email-exfil",
          text: "Email forwarding to personal accounts after termination is a data exfiltration risk. Corporate communications may contain sensitive data that should not leave the organization.",
        },
        {
          id: "rat-physical-access",
          text: "Physical access must be revoked alongside digital access. A deactivated badge prevents unauthorized building entry and access to server rooms or sensitive areas.",
        },
        {
          id: "rat-readonly-transition",
          text: "Read-only Git access is acceptable during the transition period to allow knowledge transfer and handoff.",
        },
      ],
      feedback: {
        perfect:
          "All access correctly revoked. AD disabled, VPN revoked, email forwarding stopped, Git removed, and badge deactivated. This is a complete offboarding — no access gaps remain.",
        partial:
          "Some access was revoked but gaps remain. Every active access point for a terminated employee is a potential breach vector. All five items must be fully revoked.",
        wrong:
          "Critical access points remain active. A terminated employee with any remaining access — especially VPN, email forwarding, or Git — poses an immediate security and data exfiltration risk.",
      },
    },
    {
      type: "toggle-config",
      id: "acl-003",
      title: "Backup Service Account Permissions",
      description:
        "The svc-backup service account was flagged during a compliance audit for excessive privileges. Review and restrict to minimum necessary.",
      targetSystem: "svc-backup — Automated Backup Service",
      items: [
        {
          id: "domain-perms",
          label: "Domain Permissions",
          detail:
            "The level of Active Directory domain permissions assigned to the backup service account for accessing network resources.",
          currentState: "Domain Admin",
          correctState: "Backup Operators Only",
          states: ["Domain Admin", "Backup Operators Only", "Read Only"],
          rationaleId: "rat-svc-least-priv",
        },
        {
          id: "rdp-access",
          label: "Remote Desktop",
          detail:
            "Whether the service account can establish interactive Remote Desktop Protocol sessions to servers.",
          currentState: "Enabled",
          correctState: "Disabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "rat-rdp-surface",
        },
        {
          id: "password-policy",
          label: "Password Policy",
          detail:
            "The password expiration and rotation policy applied to the service account credentials.",
          currentState: "Never Expires",
          correctState: "90-Day Rotation",
          states: ["Never Expires", "90-Day Rotation", "30-Day Rotation"],
          rationaleId: "rat-password-rotation",
        },
        {
          id: "file-share",
          label: "File Share Access",
          detail:
            "The scope of network file shares the backup service account can read from and write to.",
          currentState: "All Shares (Read/Write)",
          correctState: "Backup Target Shares Only",
          states: [
            "All Shares (Read/Write)",
            "Backup Target Shares Only",
            "No Access",
          ],
          rationaleId: "rat-svc-least-priv",
        },
      ],
      rationales: [
        {
          id: "rat-svc-least-priv",
          text: "Service accounts should have only the permissions their function requires. A backup service needs Backup Operators group membership and access to designated backup shares — not Domain Admin.",
        },
        {
          id: "rat-rdp-surface",
          text: "RDP on service accounts provides an unnecessary attack surface. Automated services do not need interactive login, and RDP access on a service account is a common lateral movement vector.",
        },
        {
          id: "rat-password-rotation",
          text: "Password rotation limits the window of compromise for service credentials. A 90-day rotation balances security with operational stability for automated processes.",
        },
        {
          id: "rat-domain-admin",
          text: "Full domain admin for a backup account violates the principle of least privilege and creates a high-value target for attackers seeking domain-wide access.",
        },
      ],
      feedback: {
        perfect:
          "Well done. Domain Admin reduced to Backup Operators, RDP disabled, password rotation enforced, and file access scoped to backup targets only. This service account now follows least privilege.",
        partial:
          "Some permissions were reduced but the account still has unnecessary access. Every excessive permission on a service account is an attack surface waiting to be exploited.",
        wrong:
          "The service account retains dangerous privileges. Domain Admin on a service account is one of the most common findings in penetration tests — and one of the easiest paths to full domain compromise.",
      },
    },
  ],

  hints: [
    "The principle of least privilege means users should only have the minimum access needed for their specific role.",
    "Terminated employee accounts should be disabled immediately — delays create a window for unauthorized access.",
    "Service accounts are high-value targets for attackers because they often have elevated privileges and weak monitoring.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Access reviews are a compliance requirement in frameworks like SOC 2, ISO 27001, and HIPAA. Security analysts who can quickly identify over-permissioned accounts save their organization audit findings and potential breaches.",
  toolRelevance: [
    "Active Directory",
    "Azure AD / Entra ID",
    "CyberArk (Privileged Access)",
    "SailPoint (Identity Governance)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
