import type { LabManifest } from "../../types/manifest";

export const privilegeEscalationDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "privilege-escalation-detection",
  version: 1,
  title: "Privilege Escalation Detection",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "privilege-escalation",
    "detection",
    "edr",
    "suid",
    "powershell",
    "active-directory",
  ],

  description:
    "Analyze EDR alerts, IDS findings, and SIEM events to distinguish legitimate privilege usage from real escalation attempts across Windows and Linux environments.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Identify legitimate vs. suspicious privilege escalation patterns",
    "Investigate process chains and user context before making containment decisions",
    "Recognize common false positive sources in privilege monitoring",
    "Understand the importance of change management for privileged access",
    "Evaluate SUID binaries in context of deployment automation",
  ],
  sortOrder: 240,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "privesc-001",
      title: "Unusual Runas Activity After Hours",
      objective:
        "EDR alert shows administrative tools launched by a standard user account outside business hours. Investigate.",
      investigationData: [
        {
          id: "edr-alert",
          label: "EDR Alert",
          content:
            "Process: mmc.exe spawned via runas.exe by user t.nguyen at 11:42 PM. Parent chain: explorer.exe → cmd.exe → runas.exe → mmc.exe. Workstation: ACCT-WS-12.",
          isCritical: true,
        },
        {
          id: "user-profile",
          label: "User Profile",
          content:
            "Tina Nguyen, Accounting Clerk, hired 2 years ago. No prior history of using administrative tools. Role requires only standard Office applications and ERP access.",
        },
        {
          id: "badge-log",
          label: "Badge Log",
          content:
            "Badge-out at 5:31 PM, no re-entry recorded. Activity originates from a remote VPN session established at 11:38 PM from residential IP range.",
        },
        {
          id: "ad-context",
          label: "Active Directory",
          content:
            "t.nguyen has no admin group membership. Runas used cached credentials from local admin account 'admin_local' — a default account that was supposed to be disabled during last quarter's hardening project.",
        },
      ],
      actions: [
        {
          id: "INVESTIGATE_PARENT",
          label: "Investigate parent process chain and verify with manager",
          color: "yellow",
        },
        {
          id: "CLOSE_STANDARD",
          label: "Close alert — runas is a standard Windows tool",
          color: "green",
        },
        {
          id: "DISABLE_ACCOUNT",
          label: "Disable the account immediately",
          color: "red",
        },
        {
          id: "BLOCK_RUNAS",
          label: "Block runas enterprise-wide",
          color: "orange",
        },
      ],
      correctActionId: "INVESTIGATE_PARENT",
      rationales: [
        {
          id: "rat-investigate",
          text: "Standard user + admin tools + after hours + no prior history warrants investigation before action. The VPN session and cached local admin credentials need verification — this could be credential theft or account compromise, but premature action without context risks disrupting legitimate activity.",
        },
        {
          id: "rat-runas-normal",
          text: "Runas itself isn't malicious, but the context — after hours, VPN, accounting clerk using admin tools — transforms a normal utility into a suspicious indicator.",
        },
        {
          id: "rat-disable-premature",
          text: "Disabling the account without investigation may be premature and could tip off an attacker if the account is compromised, or disrupt a legitimate (if unusual) business need.",
        },
        {
          id: "rat-block-runas",
          text: "Blocking runas enterprise-wide breaks legitimate admin workflows across IT and development teams — it's a sledgehammer approach to a targeted problem.",
        },
      ],
      correctRationaleId: "rat-investigate",
      feedback: {
        perfect:
          "Correct. The combination of anomalies demands investigation, but the evidence isn't conclusive enough for immediate containment. Verify the VPN session, check with Tina's manager, and audit the local admin account.",
        partial:
          "You identified something was off, but your response was either too aggressive or too passive. Context-gathering should precede containment for ambiguous alerts.",
        wrong:
          "This alert has multiple red flags — after-hours admin tool usage by an accounting clerk via VPN with cached admin credentials. Dismissing or over-reacting both miss the mark.",
      },
    },
    {
      type: "investigate-decide",
      id: "privesc-002",
      title: "SUID Binary in /tmp — Ansible Deployment",
      objective:
        "Host-based IDS flagged a new SUID binary in /tmp on a production Linux server. Assess the threat.",
      investigationData: [
        {
          id: "ids-alert",
          label: "IDS Alert",
          content:
            "New file /tmp/ansible_tmp_config with SUID bit set, owner root, created 10 minutes ago. File permissions: -rwsr-xr-x. Alert severity: High.",
          isCritical: true,
        },
        {
          id: "ansible-log",
          label: "Ansible Tower Log",
          content:
            'Playbook "server-hardening-v3.2" executed at matching timestamp. Target host matches PROD-WEB-04. Task: "Deploy config validation utility". Initiated by DevOps user k.patel.',
        },
        {
          id: "file-analysis",
          label: "File Analysis",
          content:
            "ELF 64-bit LSB executable, compiled 2 days ago. SHA256 hash matches artifact in Ansible artifact repository (verified). No VirusTotal hits. Strings analysis shows configuration validation functions.",
        },
        {
          id: "server-context",
          label: "Server Context",
          content:
            "PROD-WEB-04, Ubuntu 22.04, runs customer-facing REST API. Last Ansible deployment was 2 weeks ago. Server handles 12,000 requests/hour during peak.",
        },
      ],
      actions: [
        {
          id: "VERIFY_ANSIBLE",
          label: "Verify against Ansible playbook changelog — likely legitimate",
          color: "green",
        },
        {
          id: "DELETE_BINARY",
          label: "Delete the binary immediately",
          color: "red",
        },
        {
          id: "ISOLATE_SERVER",
          label: "Isolate the server from the network",
          color: "red",
        },
        {
          id: "ESCALATE_ROOTKIT",
          label: "Escalate as rootkit installation",
          color: "orange",
        },
      ],
      correctActionId: "VERIFY_ANSIBLE",
      rationales: [
        {
          id: "rat-verify-ansible",
          text: "Ansible timestamp match + hash verification against the artifact repository + known playbook strongly suggests authorized deployment. However, SUID in /tmp should be documented as a practice issue, and a cleanup task should be added to the playbook.",
        },
        {
          id: "rat-delete-binary",
          text: "Deleting the binary could break the active deployment and cause the hardening playbook to fail, potentially leaving the server in a partially configured state.",
        },
        {
          id: "rat-isolate-prod",
          text: "Isolating a production API server handling 12,000 requests/hour has significant business impact and should only be done when evidence strongly indicates compromise.",
        },
        {
          id: "rat-rootkit-waste",
          text: "Escalating as a rootkit installation when all evidence points to Ansible wastes incident response resources and erodes trust in the alerting system.",
        },
      ],
      correctRationaleId: "rat-verify-ansible",
      feedback: {
        perfect:
          "Well analyzed. The corroborating evidence from Ansible Tower, hash verification, and deployment context confirm a legitimate operation. Flag the SUID-in-tmp practice for DevOps to fix.",
        partial:
          "You were on the right track but chose a disproportionate response. SUID binaries in /tmp are suspicious, but context from deployment tools should inform your decision.",
        wrong:
          "The evidence clearly links this to an Ansible deployment. Deleting, isolating, or escalating without checking deployment logs causes unnecessary disruption.",
      },
    },
    {
      type: "investigate-decide",
      id: "privesc-003",
      title: "Encoded PowerShell from SYSTEM Account",
      objective:
        "EDR flagged encoded PowerShell execution from a service account running as NT AUTHORITY\\SYSTEM. Investigate.",
      investigationData: [
        {
          id: "edr-alert",
          label: "EDR Alert",
          content:
            "powershell.exe -enc RwBlAHQALQBIAG8AdABGAGkAeAAgAHwAIABFAHgAcABvAHIAdAAtAEMAcwB2ACAAQwA6AFwAUAByAG8AZwByAGEAbQBEAGEAdABhAFwAUwBDAEMATQBcAHAAYQB0AGMAaABfAGkAbgB2AGUAbgB0AG8AcgB5AC4AYwBzAHYA — Parent: sccm_client.exe — User: NT AUTHORITY\\SYSTEM",
          isCritical: true,
        },
        {
          id: "decoded-command",
          label: "Decoded Command",
          content:
            'Base64 decodes to: "Get-HotFix | Export-Csv C:\\ProgramData\\SCCM\\patch_inventory.csv" — A standard patch inventory collection command.',
        },
        {
          id: "sccm-console",
          label: "SCCM Console",
          content:
            'Scheduled task "Weekly Patch Inventory" configured to run encoded PowerShell every Sunday at 2:00 AM. Last modified by sccm-admin 3 months ago. Task has run successfully 12 consecutive times.',
        },
        {
          id: "file-hash",
          label: "File Hash Verification",
          content:
            "powershell.exe hash matches known-good Microsoft binary (SHA256 verified against Microsoft catalog). No DLL sideloading detected. sccm_client.exe also verified legitimate.",
        },
      ],
      actions: [
        {
          id: "VERIFY_SCCM",
          label: "Verify script matches known SCCM task hash — flag encoding practice for review",
          color: "green",
        },
        {
          id: "KILL_PROCESS",
          label: "Kill the process immediately",
          color: "red",
        },
        {
          id: "QUARANTINE_ENDPOINT",
          label: "Quarantine the endpoint",
          color: "red",
        },
        {
          id: "BLOCK_ENCODED_PS",
          label: "Block all encoded PowerShell enterprise-wide",
          color: "orange",
        },
      ],
      correctActionId: "VERIFY_SCCM",
      rationales: [
        {
          id: "rat-verify-sccm",
          text: "Decoded content matches legitimate patch management activity, parent process is verified SCCM client, and the scheduled task has a consistent history. However, encoded PowerShell is a detection evasion technique that should be discouraged even in legitimate tools — flag for the SCCM team to switch to plain-text scripts.",
        },
        {
          id: "rat-kill-disrupts",
          text: "Killing a valid SCCM task disrupts patch management and inventory collection across the fleet, potentially causing compliance gaps.",
        },
        {
          id: "rat-quarantine-waste",
          text: "Quarantining an endpoint for a known scheduled task wastes SOC resources and takes a machine out of production unnecessarily.",
        },
        {
          id: "rat-blanket-block",
          text: "Blanket blocking encoded PowerShell breaks many legitimate admin scripts, SCCM deployments, and automation workflows across the enterprise.",
        },
      ],
      correctRationaleId: "rat-verify-sccm",
      feedback: {
        perfect:
          "Correct approach. The decoded command is benign, the SCCM lineage checks out, and the task has a clean history. Flagging the encoding practice improves long-term detection fidelity.",
        partial:
          "You recognized the encoded PowerShell risk but overreacted. When the decoded content, parent process, and scheduled task all align, verification is the right response.",
        wrong:
          "Killing processes, quarantining endpoints, or blanket-blocking encoded PowerShell for a verified SCCM task causes operational disruption without security benefit.",
      },
    },
    {
      type: "investigate-decide",
      id: "privesc-004",
      title: "Developer Gets Domain Admin — No Ticket",
      objective:
        "SIEM alert: developer account m.santos was added to Domain Admins group via Group Policy update. Investigate.",
      investigationData: [
        {
          id: "siem-event",
          label: "SIEM Event",
          content:
            "Event ID 4728: m.santos added to CN=Domain Admins,CN=Users,DC=acmecorp,DC=com at 3:15 PM by admin account sa-jpark. Source: DC-PROD-01.",
          isCritical: true,
        },
        {
          id: "developer-context",
          label: "Developer Context",
          content:
            "Miguel Santos, Senior Backend Developer, working on Active Directory integration feature for new SSO project. Has been with the company for 4 years. Currently assigned to Project Phoenix (AD migration).",
        },
        {
          id: "verbal-report",
          label: "Verbal Report",
          content:
            'M. Santos says: "IT said they\'d give me the access I need for the migration project — I talked to James Park last week about it. He said he\'d take care of it."',
        },
        {
          id: "change-management",
          label: "Change Management",
          content:
            "No ticket in ServiceNow for Domain Admin access grant. No Change Advisory Board (CAB) approval. No entry in the Privileged Access Request (PAR) system. James Park (sa-jpark) confirms he made the change based on a hallway conversation.",
        },
      ],
      actions: [
        {
          id: "ESCALATE_IAM",
          label: "Escalate to IAM team — verbal approval for Domain Admin violates change management",
          color: "yellow",
        },
        {
          id: "APPROVE_RETROACTIVE",
          label: "Approve retroactively — project need is legitimate",
          color: "green",
        },
        {
          id: "REMOVE_AND_TICKET",
          label: "Remove access and tell developer to submit a ticket",
          color: "orange",
        },
        {
          id: "LOCK_BOTH",
          label: "Lock both accounts pending investigation",
          color: "red",
        },
      ],
      correctActionId: "ESCALATE_IAM",
      rationales: [
        {
          id: "rat-escalate-iam",
          text: "Legitimate project need doesn't bypass change management for the highest-privilege group in Active Directory. Domain Admin access requires documented approval, CAB review, and time-limited grants regardless of intent. Escalation ensures the process is followed without being punitive.",
        },
        {
          id: "rat-retroactive-bad",
          text: "Retroactive approval normalizes policy bypass and sets a precedent where anyone can get Domain Admin through a hallway conversation — this undermines the entire privileged access framework.",
        },
        {
          id: "rat-remove-adversarial",
          text: "Removing access without escalation creates an adversarial relationship with the developer and doesn't address the admin who granted it without a ticket.",
        },
        {
          id: "rat-lock-disproportionate",
          text: "Locking both accounts is disproportionate when the issue is procedural, not malicious. The developer and admin both acted in good faith — the process failed, not the people.",
        },
      ],
      correctRationaleId: "rat-escalate-iam",
      feedback: {
        perfect:
          "Excellent judgment. Domain Admin is the keys to the kingdom — no verbal approval should ever suffice. Escalating to IAM ensures proper process without punishing well-intentioned employees.",
        partial:
          "You identified the issue but chose a response that's either too lenient or too harsh. Change management violations for Domain Admin need formal escalation, not informal fixes.",
        wrong:
          "Domain Admin access granted via hallway conversation is a serious change management violation. Whether you approve it retroactively or lock accounts, you're missing the real issue: process enforcement.",
      },
    },
  ],

  hints: [
    "Always check the parent process chain — legitimate admin tools launched by unexpected parents are more suspicious than the tools themselves.",
    "SUID binaries in /tmp are suspicious, but configuration management tools like Ansible sometimes create them temporarily. Check the deployment logs.",
    "Encoded PowerShell is a red flag, but legitimate tools like SCCM sometimes use it. Decode the command and verify against known tasks.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Privilege escalation detection is a core SOC and threat hunting skill. Senior analysts distinguish themselves by quickly validating context — checking deployment tools, change tickets, and user roles before escalating.",
  toolRelevance: [
    "CrowdStrike Falcon (EDR)",
    "Splunk (SIEM correlation)",
    "OSSEC / Wazuh (HIDS)",
    "Active Directory audit logs",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
