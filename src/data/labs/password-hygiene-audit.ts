import type { LabManifest } from "../../types/manifest";

export const passwordHygieneAuditLab: LabManifest = {
  schemaVersion: "1.1",
  id: "password-hygiene-audit",
  version: 1,
  title: "Password Hygiene Audit",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["passwords", "authentication", "policy", "credential-security", "mfa", "password-manager"],

  description:
    "Audit organizational password policies and user practices to identify weak configurations — from password complexity requirements to credential reuse and missing MFA enforcement.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify password policy weaknesses that enable credential-based attacks",
    "Configure password policies that balance security with usability",
    "Recognize when MFA compensates for password policy gaps versus when both are needed",
  ],
  sortOrder: 400,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "pw-001",
      title: "Corporate Password Policy Settings",
      description:
        "Review and fix the organization's Active Directory password policy. The current settings haven't been updated in 5 years.",
      targetSystem: "Active Directory — Default Domain Password Policy",
      items: [
        {
          id: "min-length",
          label: "Minimum Password Length",
          detail: "The shortest password users can set.",
          currentState: "6-characters",
          correctState: "14-characters",
          states: ["6-characters", "8-characters", "14-characters"],
          rationaleId: "rat-length",
        },
        {
          id: "complexity",
          label: "Complexity Requirements",
          detail: "Rules for character types (uppercase, lowercase, numbers, symbols).",
          currentState: "complexity-off",
          correctState: "complexity-on",
          states: ["complexity-off", "complexity-on"],
          rationaleId: "rat-complexity",
        },
        {
          id: "rotation",
          label: "Mandatory Password Rotation",
          detail: "How often users must change their password.",
          currentState: "30-days",
          correctState: "no-expiry-with-breach-check",
          states: ["30-days", "90-days", "no-expiry-with-breach-check"],
          rationaleId: "rat-rotation",
        },
        {
          id: "lockout",
          label: "Account Lockout Threshold",
          detail: "Failed attempts before account locks.",
          currentState: "no-lockout",
          correctState: "5-attempts-15min-lockout",
          states: ["no-lockout", "3-attempts-permanent", "5-attempts-15min-lockout"],
          rationaleId: "rat-lockout",
        },
      ],
      rationales: [
        { id: "rat-length", text: "NIST SP 800-63B recommends minimum 8 characters, but 14+ dramatically increases brute-force resistance. Every additional character multiplies the search space exponentially." },
        { id: "rat-complexity", text: "Complexity requirements prevent simple dictionary words. Combined with length, they make passwords resistant to both brute-force and dictionary attacks." },
        { id: "rat-rotation", text: "NIST 800-63B (2017 revision) recommends against mandatory rotation — it leads to predictable patterns (Password1!, Password2!). Instead, check passwords against known breach databases and require changes only when compromise is suspected." },
        { id: "rat-lockout", text: "No lockout enables unlimited brute-force attempts. 5 attempts with 15-minute auto-unlock balances security with usability — permanent lockouts create denial-of-service risk and helpdesk burden." },
      ],
      feedback: {
        perfect: "Password policy modernized: strong length, complexity enabled, breach-based rotation, and balanced lockout.",
        partial: "Some settings are improved but gaps remain. Short passwords or no lockout threshold leave the policy vulnerable.",
        wrong: "6-character passwords with no lockout allow brute-force attacks to succeed in minutes. This policy needs immediate modernization.",
      },
    },
    {
      type: "toggle-config",
      id: "pw-002",
      title: "MFA Enforcement Across Services",
      description:
        "Audit which services have MFA enabled. Several critical systems currently rely on passwords alone.",
      targetSystem: "Organization MFA Configuration",
      items: [
        {
          id: "email-mfa",
          label: "Email (Microsoft 365) MFA",
          detail: "Multi-factor authentication for corporate email access.",
          currentState: "optional",
          correctState: "enforced-all-users",
          states: ["disabled", "optional", "enforced-all-users"],
          rationaleId: "rat-email-mfa",
        },
        {
          id: "vpn-mfa",
          label: "VPN Remote Access MFA",
          detail: "Multi-factor for employees connecting remotely.",
          currentState: "disabled",
          correctState: "enforced-all-users",
          states: ["disabled", "optional", "enforced-all-users"],
          rationaleId: "rat-vpn-mfa",
        },
        {
          id: "admin-mfa",
          label: "Admin Portal MFA",
          detail: "MFA for IT administrators accessing management consoles.",
          currentState: "optional",
          correctState: "enforced-phishing-resistant",
          states: ["disabled", "optional", "enforced-all-users", "enforced-phishing-resistant"],
          rationaleId: "rat-admin-mfa",
        },
        {
          id: "mfa-method",
          label: "Allowed MFA Methods",
          detail: "Which second factors are permitted organization-wide.",
          currentState: "sms-only",
          correctState: "authenticator-app-or-hardware-key",
          states: ["sms-only", "authenticator-app-or-hardware-key"],
          rationaleId: "rat-mfa-method",
        },
      ],
      rationales: [
        { id: "rat-email-mfa", text: "Email is the #1 target for account takeover — it's used for password resets on every other service. Mandatory MFA for all users prevents the most impactful credential theft scenario." },
        { id: "rat-vpn-mfa", text: "VPN without MFA is the top ransomware initial access vector. Stolen VPN credentials give attackers full network access — MFA blocks this even when passwords are compromised." },
        { id: "rat-admin-mfa", text: "Admin accounts need the strongest MFA — phishing-resistant methods (FIDO2 hardware keys, Windows Hello) prevent even advanced phishing attacks that can intercept TOTP codes via real-time proxy." },
        { id: "rat-mfa-method", text: "SMS-based MFA is vulnerable to SIM swapping and SS7 interception. Authenticator apps (TOTP) and hardware security keys provide significantly stronger second-factor protection." },
      ],
      feedback: {
        perfect: "MFA fully enforced: all users on email and VPN, phishing-resistant for admins, strong methods only.",
        partial: "Optional MFA means most users won't enable it. MFA must be enforced, not offered as an option.",
        wrong: "Disabled VPN MFA with SMS-only methods leaves the organization exposed to the most common attack vectors. MFA enforcement is critical.",
      },
    },
    {
      type: "toggle-config",
      id: "pw-003",
      title: "Service Account and Shared Credential Review",
      description:
        "Review how service accounts and shared credentials are managed across the organization.",
      targetSystem: "Service Account Management Policy",
      items: [
        {
          id: "shared-accounts",
          label: "Shared Team Accounts",
          detail: "Generic accounts shared among team members (e.g., marketing@, support@).",
          currentState: "shared-password-known-to-team",
          correctState: "individual-accounts-with-delegation",
          states: ["shared-password-known-to-team", "individual-accounts-with-delegation"],
          rationaleId: "rat-shared",
        },
        {
          id: "service-rotation",
          label: "Service Account Password Management",
          detail: "How automated service account credentials are stored and rotated.",
          currentState: "hardcoded-never-rotated",
          correctState: "vault-managed-auto-rotated",
          states: ["hardcoded-never-rotated", "spreadsheet-tracked", "vault-managed-auto-rotated"],
          rationaleId: "rat-service",
        },
        {
          id: "password-manager",
          label: "Enterprise Password Manager",
          detail: "Whether the organization provides a password manager to employees.",
          currentState: "no-tool-provided",
          correctState: "enterprise-manager-enforced",
          states: ["no-tool-provided", "optional-reimbursed", "enterprise-manager-enforced"],
          rationaleId: "rat-manager",
        },
        {
          id: "breach-monitoring",
          label: "Credential Breach Monitoring",
          detail: "Whether employee credentials are monitored against breach databases.",
          currentState: "no-monitoring",
          correctState: "continuous-monitoring",
          states: ["no-monitoring", "annual-check", "continuous-monitoring"],
          rationaleId: "rat-breach-monitor",
        },
      ],
      rationales: [
        { id: "rat-shared", text: "Shared accounts make it impossible to attribute actions to individuals — when something goes wrong, you can't determine who did it. Individual accounts with delegation maintain accountability while enabling team workflows." },
        { id: "rat-service", text: "Hardcoded service account passwords that never rotate are a permanent backdoor if leaked. Vault-managed credentials with automatic rotation limit the window of exposure." },
        { id: "rat-manager", text: "Without a password manager, employees reuse passwords across services. An enterprise-enforced password manager enables unique, complex passwords for every service without requiring memorization." },
        { id: "rat-breach-monitor", text: "Continuous monitoring against Have I Been Pwned and similar breach databases catches compromised credentials within hours of disclosure, enabling proactive password resets before attackers exploit them." },
      ],
      feedback: {
        perfect: "Credential management modernized: individual accounts, vault-managed services, enterprise password manager, and breach monitoring.",
        partial: "Shared accounts or hardcoded service credentials remain. These are common audit findings that create accountability and security gaps.",
        wrong: "Shared passwords, hardcoded service accounts, and no breach monitoring create a credential management environment where any single breach cascades across the organization.",
      },
    },
  ],

  hints: [
    "NIST SP 800-63B recommends against mandatory password rotation — it leads to predictable patterns. Instead, check passwords against known breach databases.",
    "SMS-based MFA is vulnerable to SIM swapping attacks — authenticator apps and hardware security keys are significantly more resistant to interception.",
    "Enterprise password managers don't just improve security — they improve usability by eliminating the need to remember dozens of unique passwords.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Password policy and MFA are among the first things audited in any security assessment. Understanding modern guidance (NIST 800-63B) versus outdated practices makes you immediately effective in any IT security role.",
  toolRelevance: [
    "Have I Been Pwned (breach monitoring)",
    "Azure AD / Entra ID (password policy)",
    "1Password / Bitwarden (enterprise password managers)",
    "YubiKey / FIDO2 (hardware MFA)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
