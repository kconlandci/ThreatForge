import type { LabManifest } from "../../types/manifest";

export const endpointHardeningAuditLab: LabManifest = {
  schemaVersion: "1.1",
  id: "endpoint-hardening-audit",
  version: 1,
  title: "Endpoint Hardening Audit",

  tier: "intermediate",
  track: "vulnerability-hardening",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "endpoint-security",
    "cis-benchmark",
    "hardening",
    "windows",
    "linux",
    "macos",
    "compliance",
  ],

  description:
    "Audit and remediate endpoint security configurations across Windows, Linux, and macOS systems using CIS Benchmark recommendations. Identify misconfigurations and apply appropriate hardening while balancing security with usability.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Apply CIS Benchmark recommendations to Windows, Linux, and macOS endpoints",
    "Identify common endpoint security misconfigurations",
    "Balance security hardening with user productivity requirements",
    "Understand the security implications of default endpoint configurations",
    "Prioritize hardening actions by risk severity",
  ],
  sortOrder: 255,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "endpoint-001",
      title: "Finance Workstation — CIS Benchmark Audit",
      description:
        "Compliance scan flagged a finance department workstation with multiple security configuration issues. Apply CIS Benchmark recommendations.",
      targetSystem: "FIN-WS-14 — Windows 10 Enterprise",
      items: [
        {
          id: "win-defender",
          label: "Windows Defender",
          detail:
            "Real-time antimalware protection status on the workstation.",
          currentState: "Real-time protection disabled ('for performance')",
          correctState: "Real-time protection enabled",
          states: [
            "Real-time protection disabled ('for performance')",
            "Real-time protection enabled",
          ],
          rationaleId: "rat-defender",
        },
        {
          id: "win-local-admin",
          label: "Local Admin",
          detail:
            "Built-in local administrator account configuration.",
          currentState: "Enabled, password blank",
          correctState: "Disabled",
          states: [
            "Enabled, password blank",
            "Enabled, strong password",
            "Disabled",
          ],
          rationaleId: "rat-local-admin",
        },
        {
          id: "win-usb-autorun",
          label: "USB AutoRun",
          detail:
            "Controls whether removable media automatically executes programs when inserted.",
          currentState: "Enabled",
          correctState: "Disabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "rat-autorun",
        },
        {
          id: "win-firewall",
          label: "Windows Firewall",
          detail:
            "Host-based firewall profile settings for Domain, Private, and Public networks.",
          currentState: "Off for all profiles",
          correctState: "On for all profiles (Domain, Private, Public)",
          states: [
            "Off for all profiles",
            "On for all profiles (Domain, Private, Public)",
            "On for Domain profile only",
          ],
          rationaleId: "rat-firewall",
        },
        {
          id: "win-rdp",
          label: "Remote Desktop",
          detail:
            "Remote Desktop Protocol (RDP) access and Network Level Authentication (NLA) settings.",
          currentState: "Enabled, NLA disabled",
          correctState: "Disabled (use remote management tools instead)",
          states: [
            "Enabled, NLA disabled",
            "Enabled with NLA required",
            "Disabled (use remote management tools instead)",
          ],
          rationaleId: "rat-rdp",
        },
      ],
      rationales: [
        {
          id: "rat-defender",
          text: "Disabling Defender for performance creates an unprotected endpoint — modern AV has minimal performance impact on business hardware.",
        },
        {
          id: "rat-local-admin",
          text: "Blank local admin passwords allow anyone with physical or remote access to take full control of the workstation.",
        },
        {
          id: "rat-autorun",
          text: "USB AutoRun automatically executes code from removable media — a classic malware delivery vector.",
        },
        {
          id: "rat-firewall",
          text: "Windows Firewall provides host-based protection even when the network firewall is bypassed — all profiles should be enabled.",
        },
        {
          id: "rat-rdp",
          text: "RDP on workstations without NLA is a primary ransomware entry vector — disable RDP and use enterprise remote management tools instead.",
        },
      ],
      feedback: {
        perfect:
          "Workstation hardened to CIS Benchmark standards. All high-risk configurations corrected.",
        partial:
          "Some configurations still have issues. Each unaddressed item is an exploitable weakness.",
        wrong: "Multiple critical security gaps remain. This workstation would fail a compliance audit.",
      },
    },
    {
      type: "toggle-config",
      id: "endpoint-002",
      title: "Linux Web Server — CIS Benchmark Audit",
      description:
        "Security audit of a production Ubuntu 22.04 web server revealed multiple configuration weaknesses. Harden to CIS benchmark standards.",
      targetSystem: "WEB-PROD-03 — Ubuntu 22.04 LTS",
      items: [
        {
          id: "linux-ssh-root",
          label: "SSH Root Login",
          detail:
            "Controls whether the root user can log in directly via SSH.",
          currentState: "Enabled with password auth",
          correctState: "Disabled (PermitRootLogin no)",
          states: [
            "Enabled with password auth",
            "Disabled (PermitRootLogin no)",
            "Key-only root login",
          ],
          rationaleId: "rat-ssh-root",
        },
        {
          id: "linux-fail2ban",
          label: "Brute Force Protection",
          detail:
            "Automated brute-force detection and IP blocking for SSH and other services.",
          currentState: "No fail2ban or equivalent",
          correctState: "fail2ban enabled (5 attempts, 30-min ban)",
          states: [
            "No fail2ban or equivalent",
            "fail2ban enabled (5 attempts, 30-min ban)",
          ],
          rationaleId: "rat-fail2ban",
        },
        {
          id: "linux-auto-updates",
          label: "Auto Updates",
          detail:
            "Unattended-upgrades configuration for automatic security patching.",
          currentState: "unattended-upgrades disabled",
          correctState: "Enabled for security patches only",
          states: [
            "unattended-upgrades disabled",
            "Enabled for security patches only",
            "Enabled for all packages",
          ],
          rationaleId: "rat-auto-updates",
        },
        {
          id: "linux-tmp-mount",
          label: "/tmp Mount",
          detail:
            "Mount options for the /tmp filesystem controlling code execution.",
          currentState: "Mounted without noexec",
          correctState: "Mounted with noexec,nosuid,nodev",
          states: [
            "Mounted without noexec",
            "Mounted with noexec,nosuid,nodev",
          ],
          rationaleId: "rat-tmp-mount",
        },
        {
          id: "linux-auditd",
          label: "Audit Logging",
          detail:
            "Linux audit framework configuration for system call logging and compliance.",
          currentState: "auditd not installed",
          correctState: "auditd installed with STIG rules",
          states: [
            "auditd not installed",
            "auditd installed with STIG rules",
            "Basic syslog only",
          ],
          rationaleId: "rat-auditd",
        },
      ],
      rationales: [
        {
          id: "rat-ssh-root",
          text: "SSH root login with passwords is the most common brute-force target on Linux servers — disable entirely and use sudo.",
        },
        {
          id: "rat-fail2ban",
          text: "fail2ban automatically blocks IPs after repeated failed authentication attempts — critical for internet-facing servers.",
        },
        {
          id: "rat-auto-updates",
          text: "Automated security patches prevent known-vulnerability exploitation — production servers should auto-apply security updates.",
        },
        {
          id: "rat-tmp-mount",
          text: "/tmp with noexec prevents execution of malicious binaries dropped in the temp directory — a common attack technique.",
        },
        {
          id: "rat-auditd",
          text: "auditd with STIG rules provides comprehensive system call logging required for forensics and compliance.",
        },
      ],
      feedback: {
        perfect:
          "Linux server hardened to CIS benchmark standards. Strong security baseline established.",
        partial:
          "Some configurations still need attention. Each gap is a potential entry point or lateral movement opportunity.",
        wrong: "Multiple critical Linux security gaps. This server would be an easy target for attackers.",
      },
    },
    {
      type: "toggle-config",
      id: "endpoint-003",
      title: "macOS Developer Workstation — Security Baseline",
      description:
        "IT audit of a developer's macOS workstation reveals security configurations that don't meet corporate baseline requirements. Balance security with developer productivity.",
      targetSystem: "DEV-MAC-22 — macOS Sonoma 14.x",
      items: [
        {
          id: "mac-filevault",
          label: "FileVault",
          detail:
            "Full-disk encryption for the macOS startup volume.",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Disabled", "Enabled"],
          rationaleId: "rat-filevault",
        },
        {
          id: "mac-gatekeeper",
          label: "Gatekeeper",
          detail:
            "Controls which applications are allowed to run based on code signing.",
          currentState: "Allow apps from anywhere",
          correctState: "App Store and identified developers",
          states: [
            "Allow apps from anywhere",
            "App Store and identified developers",
            "App Store only",
          ],
          rationaleId: "rat-gatekeeper",
        },
        {
          id: "mac-auto-updates",
          label: "Auto Updates",
          detail:
            "macOS software update and security patch configuration.",
          currentState: "Disabled",
          correctState: "Enabled (with 48-hour deferral for testing)",
          states: [
            "Disabled",
            "Enabled (with 48-hour deferral for testing)",
            "Enabled (immediate)",
          ],
          rationaleId: "rat-mac-updates",
        },
        {
          id: "mac-firewall",
          label: "Firewall",
          detail:
            "macOS application-level firewall and stealth mode settings.",
          currentState: "Disabled",
          correctState: "Enabled with stealth mode",
          states: [
            "Disabled",
            "Enabled without stealth mode",
            "Enabled with stealth mode",
          ],
          rationaleId: "rat-mac-firewall",
        },
        {
          id: "mac-screen-lock",
          label: "Screen Lock",
          detail:
            "Automatic screen lock timeout after idle period.",
          currentState: "30-minute timeout",
          correctState: "5-minute timeout",
          states: [
            "30-minute timeout",
            "5-minute timeout",
            "15-minute timeout",
            "Never",
          ],
          rationaleId: "rat-screen-lock",
        },
      ],
      rationales: [
        {
          id: "rat-filevault",
          text: "FileVault encrypts the disk — without it, a stolen laptop exposes all local data including source code and credentials.",
        },
        {
          id: "rat-gatekeeper",
          text: "Gatekeeper from 'App Store and identified developers' allows legitimate developer tools while blocking unsigned malware.",
        },
        {
          id: "rat-mac-updates",
          text: "Auto updates with a 48-hour deferral balance security patching with developer testing needs — immediate updates can break workflows.",
        },
        {
          id: "rat-mac-firewall",
          text: "Stealth mode firewall prevents the Mac from responding to network probes — important for developers who connect to various networks.",
        },
        {
          id: "rat-screen-lock",
          text: "5-minute screen lock prevents unauthorized access when the developer steps away — 30 minutes is excessive for a device with source code access.",
        },
      ],
      feedback: {
        perfect:
          "macOS security baseline met while preserving developer productivity. Good balance of security and usability.",
        partial:
          "Some macOS settings still need adjustment. Developer workstations contain valuable intellectual property.",
        wrong: "Multiple macOS security gaps. An unencrypted developer workstation with no firewall is a significant risk.",
      },
    },
  ],

  hints: [
    "Disabling security features 'for performance' is almost never justified on modern hardware. Windows Defender has minimal performance impact.",
    "SSH root login with password authentication is the #1 brute-force target on Linux servers. Disable it and use key-based authentication with sudo.",
    "Developer workstations need a balance of security and usability. FileVault and Gatekeeper have minimal productivity impact while providing significant protection.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Endpoint hardening is foundational security work. Whether you're in a SOC, on a vulnerability management team, or in compliance, understanding CIS Benchmarks and how to apply them across operating systems is expected knowledge for any security role.",
  toolRelevance: [
    "CIS-CAT Pro (benchmark scanning)",
    "Microsoft Intune / SCCM (endpoint management)",
    "OSSEC / Wazuh (host-based detection)",
    "Lynis (Linux hardening auditor)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
