import type { LabManifest } from "../../types/manifest";

export const mobileDeviceSecurityAssessmentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "mobile-device-security-assessment",
  version: 1,
  title: "Mobile Device Security Assessment",

  tier: "intermediate",
  track: "vulnerability-hardening",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "mobile-security",
    "mdm",
    "byod",
    "device-management",
    "compliance",
    "android",
    "ios",
  ],

  description:
    "Assess mobile device security risks in a BYOD/MDM environment. Classify compliance violations, handle rooted devices, evaluate sideloaded app risks, and manage stale device inventory including departed employee devices.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Apply MDM compliance policies proportionally to device risk levels",
    "Handle BYOD security violations while respecting personal device ownership",
    "Recognize the security risks of rooted/jailbroken devices and sideloaded applications",
    "Manage device inventory and offboarding compliance gaps",
    "Balance executive sensitivity with security requirements",
  ],
  sortOrder: 285,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "mobile-001",
      title: "Executive Device — No Passcode, Outdated iOS",
      description:
        "MDM compliance scan flagged an executive's personal iPhone with multiple security violations.",
      evidence: [
        {
          type: "MDM Scan",
          content:
            "Device: iPhone 14 Pro, iOS 16.1 (current: 19.x). No device passcode set. MDM profile installed with 4 enterprise apps.",
        },
        {
          type: "Enterprise Apps",
          content:
            "Corporate email (Outlook), Slack, SharePoint, SAP Concur. All apps have cached credentials.",
        },
        {
          type: "User",
          content:
            "Jennifer Walsh, VP of Marketing. Device registered to personal Apple ID. BYOD agreement signed.",
        },
        {
          type: "Compliance Policy",
          content:
            "Minimum requirements: passcode, OS within 2 major versions, MDM profile active.",
        },
      ],
      classifications: [
        {
          id: "c-critical",
          label: "Critical",
          description:
            "Immediate risk requiring urgent action — device is actively exposing corporate data.",
        },
        {
          id: "c-high",
          label: "High",
          description:
            "Significant risk requiring prompt remediation within days.",
        },
        {
          id: "c-medium",
          label: "Medium",
          description:
            "Moderate risk requiring scheduled remediation within weeks.",
        },
        {
          id: "c-low",
          label: "Low",
          description:
            "Minor risk that can be addressed during next compliance cycle.",
        },
      ],
      correctClassificationId: "c-critical",
      remediations: [
        {
          id: "r-enforce",
          label: "Enforce compliance — require passcode + OS update within 48 hours or quarantine corporate apps",
          description:
            "Gives the executive a reasonable window to comply while protecting corporate data with a quarantine fallback.",
        },
        {
          id: "r-wipe",
          label: "Remotely wipe the device",
          description:
            "Removes all corporate and personal data from the device immediately.",
        },
        {
          id: "r-revoke",
          label: "Immediately revoke all corporate app access",
          description:
            "Cuts off corporate data access without notice or grace period.",
        },
        {
          id: "r-email",
          label: "Send a reminder email",
          description:
            "Notifies the user of non-compliance with no enforcement mechanism.",
        },
      ],
      correctRemediationId: "r-enforce",
      rationales: [
        {
          id: "rat-enforce",
          text: "No passcode + 3 major versions behind = critical, but this is an executive's personal device — enforcing the compliance policy with a grace period (48 hours) respects BYOD boundaries while protecting corporate data. Quarantining apps if non-compliant after 48 hours is the fallback.",
        },
        {
          id: "rat-wipe",
          text: "Remotely wiping an executive's personal device creates legal and political problems and likely violates the BYOD agreement.",
        },
        {
          id: "rat-revoke",
          text: "Immediate revocation without notice is unnecessarily hostile and damages the relationship between security and the executive team.",
        },
        {
          id: "rat-email",
          text: "A reminder email has no enforcement mechanism and the device remains exposed indefinitely.",
        },
      ],
      correctRationaleId: "rat-enforce",
      feedback: {
        perfect:
          "Excellent. You correctly classified this as critical (no passcode + severely outdated OS with cached corporate credentials) and chose a proportional response — enforcement with a 48-hour grace period respects BYOD boundaries while ensuring compliance.",
        partial:
          "You identified part of the risk but chose a disproportionate or ineffective response. The key is balancing the severity (critical) with the BYOD context (executive's personal device) through a firm but reasonable compliance enforcement window.",
        wrong:
          "An executive's iPhone with no passcode and iOS 16.1 (3 major versions behind) with cached corporate credentials is a critical risk. Neither a remote wipe nor a reminder email is the right approach — enforce compliance with a reasonable deadline and a quarantine fallback.",
      },
    },
    {
      type: "triage-remediate",
      id: "mobile-002",
      title: "Rooted Android Device — Security Researcher BYOD",
      description:
        "MDM detected a rooted Android device enrolled with corporate email access. The user is a security researcher.",
      evidence: [
        {
          type: "MDM Alert",
          content:
            "Device: Samsung Galaxy S24, Android 15. Root detected: Magisk v27.0 installed. Corporate profile: email only.",
        },
        {
          type: "User",
          content:
            "Daniel Park, Senior Security Researcher. Claims root is necessary for mobile security testing tools (Frida, Objection).",
        },
        {
          type: "Access Scope",
          content:
            "Corporate email via Gmail work profile. No access to VPN, intranet, or sensitive applications.",
        },
        {
          type: "Risk",
          content:
            "Rooted devices can bypass OS sandboxing, intercept corporate app traffic, and disable security controls.",
        },
      ],
      classifications: [
        {
          id: "c-critical",
          label: "Critical",
          description:
            "Immediate risk requiring urgent action.",
        },
        {
          id: "c-high",
          label: "High",
          description:
            "Significant risk requiring prompt remediation.",
        },
        {
          id: "c-medium",
          label: "Medium",
          description:
            "Moderate risk requiring scheduled remediation.",
        },
        {
          id: "c-low",
          label: "Low",
          description:
            "Minor risk addressable during next compliance cycle.",
        },
      ],
      correctClassificationId: "c-high",
      remediations: [
        {
          id: "r-revoke-issue",
          label: "Revoke corporate access from rooted device + issue separate managed work device",
          description:
            "Removes corporate data from the compromised device and provides a secure alternative for work use.",
        },
        {
          id: "r-exception",
          label: "Allow exception for security researchers",
          description:
            "Creates a policy exception based on the user's role and expertise.",
        },
        {
          id: "r-unroot",
          label: "Require unroot before re-enrollment",
          description:
            "Forces the user to remove root access to regain corporate access.",
        },
        {
          id: "r-accept",
          label: "Accept risk with documentation",
          description:
            "Formally accepts the risk and documents the exception.",
        },
      ],
      correctRemediationId: "r-revoke-issue",
      rationales: [
        {
          id: "rat-revoke",
          text: "Rooted devices bypass Android's security model regardless of the user's expertise — even a security researcher's rooted personal device shouldn't have corporate access. Issue a separate managed device for work.",
        },
        {
          id: "rat-exception",
          text: "Allowing exceptions for rooted devices creates a precedent that others will exploit, and root access fundamentally breaks the OS security model.",
        },
        {
          id: "rat-unroot",
          text: "Requiring unroot removes the researcher's work tools and doesn't address the need for a secure work device.",
        },
        {
          id: "rat-accept",
          text: "Risk acceptance for a rooted device with corporate email access exposes messages to interception via tools already installed on the device.",
        },
      ],
      correctRationaleId: "rat-revoke",
      feedback: {
        perfect:
          "Correct. Rooted devices fundamentally break the Android security model — no amount of user expertise changes that. Revoking corporate access and issuing a managed work device gives the researcher both the tools they need (rooted personal device) and secure corporate access (managed device).",
        partial:
          "You identified the risk level but chose a remediation that either goes too far or doesn't fully address the problem. The researcher needs root for their job — the solution is separating work and personal, not forcing them to choose.",
        wrong:
          "Root access bypasses OS sandboxing regardless of who installed it. Allowing exceptions or accepting the risk creates precedent and exposure. The correct approach separates concerns: personal rooted device for research, managed device for corporate access.",
      },
    },
    {
      type: "triage-remediate",
      id: "mobile-003",
      title: "BYOD Tablet — 14 Sideloaded Applications",
      description:
        "MDM compliance scan shows a BYOD tablet with numerous sideloaded applications accessing the inventory management system.",
      evidence: [
        {
          type: "MDM Report",
          content:
            "Device: Samsung Galaxy Tab S9, Android 14. 14 apps installed from unknown sources (not Google Play). MDM work profile active.",
        },
        {
          type: "Sideloaded Apps",
          content:
            "3 games, 2 streaming apps, 4 utility apps, 3 'premium' app versions (likely pirated), 2 unidentifiable APKs.",
        },
        {
          type: "Corporate Access",
          content:
            "Inventory management system via work profile. Processes product data and pricing for 3 retail locations.",
        },
        {
          type: "User",
          content:
            "Maria Torres, Regional Store Manager. Uses tablet daily for inventory and staff scheduling.",
        },
      ],
      classifications: [
        {
          id: "c-critical",
          label: "Critical",
          description:
            "Immediate risk requiring urgent action.",
        },
        {
          id: "c-high",
          label: "High",
          description:
            "Significant risk requiring prompt remediation.",
        },
        {
          id: "c-medium-high",
          label: "Medium-High",
          description:
            "Elevated risk requiring near-term remediation with user education.",
        },
        {
          id: "c-low",
          label: "Low",
          description:
            "Minor risk addressable during next compliance cycle.",
        },
      ],
      correctClassificationId: "c-medium-high",
      remediations: [
        {
          id: "r-allowlist",
          label: "Implement app allowlisting + move corporate access to managed work profile + educate user",
          description:
            "Protects the corporate side through work profile controls while educating the user about sideloading risks.",
        },
        {
          id: "r-remove",
          label: "Remove all sideloaded apps",
          description:
            "Deletes all non-Play Store applications from the personal device.",
        },
        {
          id: "r-block",
          label: "Block the device from corporate access",
          description:
            "Prevents the tablet from accessing any corporate resources until remediated.",
        },
        {
          id: "r-accept",
          label: "Accept — personal apps are personal business",
          description:
            "Takes no action since the apps are on the personal side of the device.",
        },
      ],
      correctRemediationId: "r-allowlist",
      rationales: [
        {
          id: "rat-allowlist",
          text: "Sideloaded apps (especially pirated versions) are a significant malware vector, but the tablet is a personal BYOD device — enforce corporate protection through the managed work profile, implement app allowlisting on the work side, and educate the user about sideloading risks.",
        },
        {
          id: "rat-remove",
          text: "Removing personal apps from a BYOD device oversteps the organization's authority and violates BYOD trust boundaries.",
        },
        {
          id: "rat-block",
          text: "Blocking a retail manager's daily tool disrupts operations at 3 store locations and is disproportionate to the risk.",
        },
        {
          id: "rat-accept",
          text: "Accepting ignores the malware risk to the work profile — sideloaded APKs can potentially escape sandboxing.",
        },
      ],
      correctRationaleId: "rat-allowlist",
      feedback: {
        perfect:
          "Well handled. You correctly identified the elevated risk (sideloaded apps including likely pirated versions and unidentifiable APKs) while respecting BYOD boundaries. App allowlisting on the work profile protects corporate data, and user education addresses the root behavior.",
        partial:
          "You identified the risk but chose a disproportionate response. On a BYOD device, you control the work profile, not the personal side. The solution is stronger work profile controls and education, not removing personal apps or blocking the device.",
        wrong:
          "Sideloaded apps (especially pirated 'premium' versions and unidentifiable APKs) are a real malware vector. But on a BYOD device, the response must respect personal ownership. Protect the corporate work profile through allowlisting and educate the user.",
      },
    },
    {
      type: "triage-remediate",
      id: "mobile-004",
      title: "MDM Compliance — Stale Device Inventory",
      description:
        "Monthly MDM compliance report shows 23 devices haven't checked in for 30+ days. Further review reveals 4 belong to departed employees.",
      evidence: [
        {
          type: "MDM Report",
          content:
            "23 devices lost contact (>30 days since last check-in). 4 devices assigned to employees terminated in the past 60 days.",
        },
        {
          type: "Departed Employees",
          content:
            "T. Williams (Sales, terminated Feb 15), K. Okafor (Engineering, terminated Feb 28), M. Santos (Marketing, resigned Mar 1), R. Patel (Finance, resigned Mar 10)",
        },
        {
          type: "Active Employees",
          content:
            "19 remaining devices: 8 show 'powered off' status, 11 show 'unknown' — could be factory reset, broken, or connectivity issue.",
        },
        {
          type: "Corporate Data",
          content:
            "All 23 devices had corporate email and at minimum SharePoint access. Finance device (R. Patel) had SAP access.",
        },
      ],
      classifications: [
        {
          id: "c-critical",
          label: "Critical",
          description:
            "Immediate risk requiring urgent action.",
        },
        {
          id: "c-high",
          label: "High",
          description:
            "Significant risk requiring prompt remediation.",
        },
        {
          id: "c-medium",
          label: "Medium",
          description:
            "Moderate risk requiring scheduled remediation.",
        },
        {
          id: "c-low",
          label: "Low",
          description:
            "Minor risk addressable during next compliance cycle.",
        },
      ],
      correctClassificationId: "c-high",
      remediations: [
        {
          id: "r-wipe-contact",
          label: "Wipe departed employee devices + contact active employees + update offboarding checklist",
          description:
            "Immediately addresses the highest-risk devices, follows up on active employees, and fixes the process gap.",
        },
        {
          id: "r-wait",
          label: "Wait for next monthly check",
          description:
            "Defers action until the next compliance review cycle.",
        },
        {
          id: "r-wipe-all",
          label: "Wipe all 23 devices",
          description:
            "Remotely wipes corporate data from all non-reporting devices.",
        },
        {
          id: "r-remove-inventory",
          label: "Remove from MDM inventory",
          description:
            "Removes the stale devices from the MDM console to clean up the dashboard.",
        },
      ],
      correctRemediationId: "r-wipe-contact",
      rationales: [
        {
          id: "rat-wipe-contact",
          text: "Departed employees with corporate data on personal devices are an immediate risk — remote wipe corporate data now. Active employees need individual follow-up to determine device status. The offboarding checklist clearly needs updating.",
        },
        {
          id: "rat-wait",
          text: "Waiting another month extends the exposure window for 4 departed employees with corporate data on their devices.",
        },
        {
          id: "rat-wipe-all",
          text: "Wiping all 23 devices destroys active employees' corporate data without cause and creates operational disruption.",
        },
        {
          id: "rat-remove",
          text: "Removing from inventory loses the ability to take remediation action on devices that still have corporate data.",
        },
      ],
      correctRationaleId: "rat-wipe-contact",
      feedback: {
        perfect:
          "Correct. You prioritized the highest-risk devices (departed employees, especially R. Patel with SAP access) for immediate wipe, recognized that active employees need individual follow-up, and identified the offboarding process gap. This is a proportional, systematic response.",
        partial:
          "You addressed part of the problem but missed the layered approach. Departed employee devices need immediate wipes, active employee devices need individual follow-up, and the offboarding process needs fixing. All three actions are required.",
        wrong:
          "Four departed employees still have corporate data (including SAP access) on personal devices. Waiting, wiping everyone, or removing from inventory all fail to address the actual risk proportionally. Wipe departed devices, contact active employees, fix the process.",
      },
    },
  ],

  hints: [
    "BYOD policies must balance security enforcement with respect for personal device ownership. You can control corporate apps and data without controlling the entire device.",
    "Rooted/jailbroken devices bypass OS-level security controls. No exception policy should allow corporate access from devices where the security model is fundamentally broken.",
    "Offboarding should always include a step for MDM device review and corporate data wipe. Missing this step is one of the most common data loss vectors.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Mobile device security management is essential as BYOD becomes the norm. Security analysts who understand MDM platforms, BYOD policies, and the balance between corporate security and personal device ownership are increasingly valuable.",
  toolRelevance: [
    "Microsoft Intune / Workspace ONE (MDM)",
    "Jamf Pro (Apple device management)",
    "Lookout / Zimperium (mobile threat defense)",
    "Google Endpoint Management",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
