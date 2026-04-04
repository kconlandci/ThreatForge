import type { LabManifest } from "../../types/manifest";

export const adHardeningReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "ad-hardening-review",
  version: 1,
  title: "Active Directory Hardening Review",

  tier: "advanced",
  track: "identity-access",
  difficulty: "challenging",
  accessLevel: "free",
  tags: [
    "active-directory",
    "hardening",
    "gpo",
    "tiered-admin",
    "credential-protection",
  ],

  description:
    "Review and harden Active Directory configurations including Group Policy settings, administrative tier model, credential protection, and authentication policies.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Evaluate Active Directory Group Policy configurations for security gaps",
    "Implement tiered administrative model best practices",
    "Configure credential protection and authentication hardening",
  ],
  sortOrder: 480,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "adh-001",
      title: "Domain-Level Authentication Policies",
      description:
        "Review the domain-level Group Policy Object (GPO) for corp.local. The current authentication policies were set during initial domain deployment 5 years ago and haven't been updated to reflect current security best practices.",
      targetSystem: "corp.local GPO",
      items: [
        {
          id: "ntlm-auth",
          label: "NTLM Authentication",
          detail:
            "Legacy authentication protocol vulnerable to relay attacks, pass-the-hash, and credential theft. Modern environments should enforce Kerberos.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "j-ntlm",
        },
        {
          id: "min-password",
          label: "Minimum Password Length",
          detail:
            "Controls the minimum number of characters required for domain user passwords. NIST 800-63B recommends a minimum of 14 characters for privileged accounts.",
          currentState: "8",
          correctState: "14",
          states: ["8", "10", "12", "14"],
          rationaleId: "j-password",
        },
        {
          id: "lockout-threshold",
          label: "Account Lockout Threshold",
          detail:
            "Number of failed login attempts before the account is locked. Balances brute-force protection with user experience.",
          currentState: "none",
          correctState: "5-attempts",
          states: ["none", "3-attempts", "5-attempts", "10-attempts"],
          rationaleId: "j-lockout",
        },
        {
          id: "kerberos-aes",
          label: "Kerberos AES Encryption Enforcement",
          detail:
            "Forces Kerberos to use AES-256 encryption instead of weaker RC4. RC4 tickets are trivially crackable with tools like Hashcat.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "j-aes",
        },
      ],
      rationales: [
        {
          id: "j-ntlm",
          text: "NTLM is vulnerable to relay and pass-the-hash attacks. Disabling it forces Kerberos, which is significantly more secure.",
        },
        {
          id: "j-password",
          text: "14-character minimum aligns with NIST 800-63B and makes brute-force attacks computationally infeasible.",
        },
        {
          id: "j-lockout",
          text: "5 attempts balances brute-force protection with usability. No lockout allows unlimited password guessing; 3 causes excessive helpdesk tickets.",
        },
        {
          id: "j-aes",
          text: "AES-256 Kerberos encryption prevents ticket cracking attacks that exploit weak RC4 encryption.",
        },
      ],
      feedback: {
        perfect:
          "Authentication policies hardened correctly. NTLM disabled, strong passwords enforced, lockout configured, and AES encryption required.",
        partial:
          "Some settings are correct, but gaps remain. Review each setting against current best practices — legacy defaults are often too permissive.",
        wrong:
          "Multiple authentication policies are misconfigured. Legacy defaults from 5 years ago leave the domain vulnerable to well-known attacks.",
      },
    },
    {
      type: "toggle-config",
      id: "adh-002",
      title: "Tiered Admin Model",
      description:
        "Review the administrative tier model implementation for corp.local. The tiered model separates Tier 0 (domain controllers and identity), Tier 1 (servers), and Tier 2 (workstations) to prevent credential theft escalation.",
      targetSystem: "Admin Security Groups",
      items: [
        {
          id: "tier0-workstations",
          label: "Tier 0 Admins on Regular Workstations",
          detail:
            "Controls whether domain admins and other Tier 0 accounts can log into standard employee workstations. This is the primary credential theft vector.",
          currentState: "allowed",
          correctState: "blocked",
          states: ["allowed", "blocked"],
          rationaleId: "j-tier0-ws",
        },
        {
          id: "da-email",
          label: "Domain Admin Email Access",
          detail:
            "Controls whether domain admin accounts have mailboxes or can access email. Email is a primary phishing and credential harvesting vector.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "j-da-email",
        },
        {
          id: "svc-interactive",
          label: "Service Account Interactive Logon",
          detail:
            "Controls whether service accounts can be used for interactive (console or RDP) login sessions. Service accounts should only authenticate programmatically.",
          currentState: "allowed",
          correctState: "denied",
          states: ["allowed", "denied"],
          rationaleId: "j-svc-logon",
        },
        {
          id: "paw-enforcement",
          label: "PAW Enforcement for Tier 0",
          detail:
            "Privileged Access Workstations (PAWs) are hardened, dedicated machines for administrative tasks. Enforcement ensures Tier 0 operations can only be performed from PAWs.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "j-paw",
        },
      ],
      rationales: [
        {
          id: "j-tier0-ws",
          text: "Tier 0 credentials on regular workstations are trivially harvested via memory scraping. Blocking this eliminates the most common privilege escalation path.",
        },
        {
          id: "j-da-email",
          text: "Domain admin accounts with email access can be phished. Admins should use separate standard accounts for email and daily tasks.",
        },
        {
          id: "j-svc-logon",
          text: "Interactive logon for service accounts enables credential theft if the account is compromised. Service accounts should only authenticate programmatically.",
        },
        {
          id: "j-paw",
          text: "PAWs provide a hardened environment for Tier 0 operations, preventing credential exposure on potentially compromised standard workstations.",
        },
      ],
      feedback: {
        perfect:
          "Tiered admin model properly enforced. Credential exposure paths between tiers are eliminated, and Tier 0 operations are restricted to PAWs.",
        partial:
          "Some tier boundaries are enforced, but gaps remain. Each misconfiguration is a potential lateral movement path for attackers.",
        wrong:
          "The tiered model is not enforced. Domain admin credentials are exposed across all tiers, making credential theft and lateral movement trivial.",
      },
    },
    {
      type: "toggle-config",
      id: "adh-003",
      title: "Credential Protection",
      description:
        "Review credential protection settings on domain-joined systems. These settings control how Windows stores and protects authentication credentials in memory, directly impacting resistance to credential theft tools like Mimikatz.",
      targetSystem: "Credential Guard Settings",
      items: [
        {
          id: "cred-guard",
          label: "Credential Guard",
          detail:
            "Uses virtualization-based security (VBS) to isolate NTLM hashes and Kerberos tickets in a protected container that even local admins cannot access.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "j-credguard",
        },
        {
          id: "lsass-protection",
          label: "LSASS Protection",
          detail:
            "Runs the Local Security Authority Subsystem Service as a Protected Process Light (PPL), preventing unauthorized processes from reading its memory.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "j-lsass",
        },
        {
          id: "wdigest",
          label: "WDigest Authentication",
          detail:
            "Legacy authentication provider that stores plaintext passwords in LSASS memory. Enabled by default on older Windows versions.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "j-wdigest",
        },
        {
          id: "cached-creds",
          label: "Cached Credentials Count",
          detail:
            "Number of previous domain logon credentials cached locally. Higher values increase the number of credentials available for offline extraction.",
          currentState: "10",
          correctState: "2",
          states: ["0", "1", "2", "5", "10"],
          rationaleId: "j-cached",
        },
      ],
      rationales: [
        {
          id: "j-credguard",
          text: "Credential Guard isolates credentials using hardware virtualization, making them inaccessible even to processes running as SYSTEM or local admin.",
        },
        {
          id: "j-lsass",
          text: "LSASS protection prevents tools like Mimikatz from reading credential material from the LSASS process memory.",
        },
        {
          id: "j-wdigest",
          text: "WDigest stores plaintext passwords in memory. Disabling it eliminates one of the easiest credential theft vectors.",
        },
        {
          id: "j-cached",
          text: "Reducing cached credentials to 2 limits offline credential extraction while still allowing laptop users to log in when disconnected.",
        },
      ],
      feedback: {
        perfect:
          "Credential protection fully hardened. Credential Guard, LSASS protection, WDigest disabled, and cached credentials minimized — this configuration defeats most credential theft techniques.",
        partial:
          "Some protections are enabled, but gaps remain. Each disabled protection is a potential avenue for credential theft using well-known tools.",
        wrong:
          "Credential protection is critically misconfigured. With WDigest enabled and no LSASS protection, tools like Mimikatz can extract plaintext passwords in seconds.",
      },
    },
  ],

  hints: [
    "NTLM is the most commonly exploited authentication protocol in Active Directory attacks. Disabling it and enforcing Kerberos with AES encryption significantly raises the bar for attackers.",
    "The tiered admin model prevents credential theft escalation by ensuring high-privilege credentials never touch lower-tier systems where they could be harvested.",
    "Credential Guard and LSASS protection work together to make credential dumping tools like Mimikatz ineffective, even when an attacker has local admin access.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Active Directory hardening is fundamental to enterprise security. Organizations with hardened AD environments experience significantly fewer successful attacks.",
  toolRelevance: [
    "PingCastle",
    "Purple Knight",
    "BloodHound",
    "Microsoft Security Compliance Toolkit",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
