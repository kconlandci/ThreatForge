import type { LabManifest } from "../../types/manifest";

export const goldenTicketDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "golden-ticket-detection",
  version: 1,
  title: "Golden Ticket Attack Detection",

  tier: "advanced",
  track: "identity-access",
  difficulty: "challenging",
  accessLevel: "free",
  tags: [
    "active-directory",
    "golden-ticket",
    "kerberos",
    "krbtgt",
    "persistence",
    "advanced-threats",
  ],

  description:
    "Detect and respond to Golden Ticket attacks in Active Directory environments by analyzing Kerberos authentication anomalies, KRBTGT account activity, and domain controller event logs.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Identify Kerberos authentication anomalies indicative of Golden Ticket usage",
    "Analyze domain controller logs for KRBTGT compromise indicators",
    "Execute appropriate containment for Golden Ticket attacks",
  ],
  sortOrder: 470,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "gt-001",
      title: "TGT with Impossible Lifetime",
      description:
        "Domain controller monitoring has flagged an anomalous Ticket Granting Ticket with characteristics that deviate significantly from the Kerberos policy.",
      evidence: [
        {
          type: "Kerberos Log",
          content:
            "TGT presented for DA account 'corp\\admin.jthompson' with lifetime of 87,600 hours (10 years). Domain Kerberos policy max lifetime: 10 hours.",
        },
        {
          type: "DC Event Log",
          content:
            "No corresponding AS-REQ (Event 4768) found on any domain controller for this TGT. The ticket appeared without a normal authentication request.",
        },
        {
          type: "Source Host",
          content:
            "TGT presented from workstation WKS-MKTG-14, which is assigned to a marketing intern. admin.jthompson is a Tier 0 domain admin who has never logged into this workstation.",
        },
      ],
      classifications: [
        {
          id: "c-golden",
          label: "Golden Ticket attack",
          description:
            "Forged TGT created using a compromised KRBTGT hash, allowing arbitrary domain access.",
        },
        {
          id: "c-legit",
          label: "Legitimate admin activity",
          description:
            "Normal administrative operation using valid credentials.",
        },
        {
          id: "c-misconfig",
          label: "Misconfigured Kerberos policy",
          description:
            "A GPO or policy error causing incorrect ticket lifetimes.",
        },
        {
          id: "c-fp",
          label: "False positive",
          description:
            "Monitoring system error or log parsing issue.",
        },
      ],
      correctClassificationId: "c-golden",
      remediations: [
        {
          id: "r-krbtgt-full",
          label: "Double KRBTGT password reset + isolate source host + forest-wide credential audit",
          description:
            "Reset KRBTGT twice to invalidate all forged tickets, isolate the compromised workstation, and audit all privileged credentials.",
        },
        {
          id: "r-user-reset",
          label: "Reset user password only",
          description:
            "Change the domain admin account password.",
        },
        {
          id: "r-monitor",
          label: "Monitor for more activity",
          description:
            "Continue observing to confirm the attack before taking action.",
        },
        {
          id: "r-policy",
          label: "Update Kerberos policy",
          description:
            "Modify the Kerberos ticket lifetime policy to enforce stricter limits.",
        },
      ],
      correctRemediationId: "r-krbtgt-full",
      rationales: [
        {
          id: "rat-1",
          text: "A 10-year TGT with no AS-REQ from an unrelated workstation is definitive evidence of a Golden Ticket. The KRBTGT hash is compromised and must be reset twice to invalidate all forged tickets.",
        },
        {
          id: "rat-2",
          text: "Resetting only the user password is futile — Golden Tickets are forged using the KRBTGT hash, not the individual user's credentials.",
        },
        {
          id: "rat-3",
          text: "Monitoring a confirmed Golden Ticket attack lets the attacker maintain persistent domain-wide access. Immediate KRBTGT reset is mandatory.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Textbook detection. The impossible ticket lifetime, missing AS-REQ, and source/account mismatch are the three classic Golden Ticket indicators. The double KRBTGT reset is the only way to invalidate forged tickets across the domain.",
        partial:
          "You recognized the threat but your remediation is incomplete. Golden Ticket attacks require KRBTGT password resets, not just user-level actions. The KRBTGT hash is the root of the compromise.",
        wrong:
          "Missing a Golden Ticket attack or delaying response gives the attacker persistent, unrestricted domain access. The combination of impossible lifetime, no AS-REQ, and host mismatch leaves no room for doubt.",
      },
    },
    {
      type: "triage-remediate",
      id: "gt-002",
      title: "KRBTGT Password Age Alert",
      description:
        "A routine Active Directory health check has flagged the KRBTGT account for password age non-compliance. No anomalous authentication activity has been detected.",
      evidence: [
        {
          type: "AD Health Check",
          content:
            "KRBTGT account password last changed: 18 months ago. Organizational policy requires annual rotation. Industry best practice recommends rotation every 180 days.",
        },
        {
          type: "Authentication Logs",
          content:
            "No anomalous TGTs detected in the past 90 days. All Kerberos authentication patterns within normal baselines. No alerts from Microsoft Defender for Identity.",
        },
        {
          type: "Compliance",
          content:
            "Annual KRBTGT rotation is mandated by internal security policy SEC-POL-042 and referenced in the latest audit report as a required control.",
        },
      ],
      classifications: [
        {
          id: "c-active",
          label: "Active compromise",
          description:
            "Evidence suggests the KRBTGT account has been compromised.",
        },
        {
          id: "c-compliance",
          label: "Compliance violation",
          description:
            "Policy requirement not met, increasing organizational risk.",
        },
        {
          id: "c-operational",
          label: "Operational risk",
          description:
            "No policy violation, but the extended password age increases the window of vulnerability.",
        },
        {
          id: "c-no-issue",
          label: "No issue",
          description:
            "KRBTGT rotation is not a security concern.",
        },
      ],
      correctClassificationId: "c-operational",
      remediations: [
        {
          id: "r-scheduled",
          label: "Schedule KRBTGT double-reset during maintenance",
          description:
            "Plan the double-reset for the next maintenance window with proper change management and monitoring.",
        },
        {
          id: "r-immediate",
          label: "Reset immediately",
          description:
            "Perform the double KRBTGT reset right now.",
        },
        {
          id: "r-no-action",
          label: "No action needed",
          description:
            "The current password age is acceptable.",
        },
        {
          id: "r-full-ir",
          label: "Full incident response",
          description:
            "Activate the IR plan and investigate for potential compromise.",
        },
      ],
      correctRemediationId: "r-scheduled",
      rationales: [
        {
          id: "rat-1",
          text: "With no evidence of compromise, a scheduled double-reset during maintenance is the responsible approach — it reduces risk without causing disruption from an unplanned change.",
        },
        {
          id: "rat-2",
          text: "An immediate unplanned KRBTGT reset can cause widespread authentication failures if not properly coordinated. The risk of disruption outweighs the benefit when no active threat is detected.",
        },
        {
          id: "rat-3",
          text: "Taking no action leaves the extended password age as an operational risk. KRBTGT rotation is a critical hygiene control even without evidence of misuse.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Good judgment. No evidence of active compromise means this is an operational risk, not an emergency. A scheduled double-reset with proper change management minimizes both security risk and operational disruption.",
        partial:
          "Your assessment is partially correct. While the stale KRBTGT password is a concern, the response should match the actual risk level. Without compromise indicators, a planned reset is more appropriate than an emergency action.",
        wrong:
          "Either ignoring KRBTGT password age or treating it as an active compromise is miscalibrated. It's an operational risk that needs scheduled remediation, not an emergency or a non-issue.",
      },
    },
    {
      type: "triage-remediate",
      id: "gt-003",
      title: "Forged PAC Detected",
      description:
        "Domain controller logs show a PAC (Privilege Attribute Certificate) validation failure during a Kerberos service ticket request. This coincides with a recently compromised service account.",
      evidence: [
        {
          type: "DC Event Log",
          content:
            "Event 4769 with failure code 0x1F — PAC signature validation failed. The PAC checksum does not match the current KRBTGT encryption key. Ticket was presented for CIFS service on FILE-SRV-02.",
        },
        {
          type: "Related Incident",
          content:
            "Service account 'svc_backup' on FILE-SRV-02 was compromised 3 days ago via credential stuffing. Password was reset, but the attacker had 6 hours of access before detection.",
        },
        {
          type: "Forensic Analysis",
          content:
            "Memory dump from the compromised server shows Mimikatz artifacts. The attacker had local admin privileges and could have extracted cached Kerberos tickets or hashes from LSASS.",
        },
      ],
      classifications: [
        {
          id: "c-golden-attempt",
          label: "Golden Ticket attempt",
          description:
            "A forged TGT using a compromised KRBTGT hash, evidenced by PAC signature mismatch.",
        },
        {
          id: "c-silver",
          label: "Silver Ticket attempt",
          description:
            "A forged service ticket using a compromised service account hash.",
        },
        {
          id: "c-pac-error",
          label: "PAC configuration error",
          description:
            "A misconfiguration causing legitimate PAC validation to fail.",
        },
        {
          id: "c-normal",
          label: "Normal behavior",
          description:
            "Expected authentication activity requiring no action.",
        },
      ],
      correctClassificationId: "c-golden-attempt",
      remediations: [
        {
          id: "r-emergency-krbtgt",
          label: "Emergency KRBTGT double-reset + full IR",
          description:
            "Immediately reset KRBTGT twice and activate full incident response to assess the scope of the compromise.",
        },
        {
          id: "r-svc-only",
          label: "Reset service account only",
          description:
            "Change the compromised service account password again.",
        },
        {
          id: "r-pac-reconfig",
          label: "Reconfigure PAC validation",
          description:
            "Adjust PAC validation settings to resolve the signature mismatch.",
        },
        {
          id: "r-log-monitor",
          label: "Monitor and log",
          description:
            "Increase logging verbosity and monitor for additional failures.",
        },
      ],
      correctRemediationId: "r-emergency-krbtgt",
      rationales: [
        {
          id: "rat-1",
          text: "A PAC signature failing against the KRBTGT key means the ticket was forged with a different KRBTGT hash — this is a Golden Ticket. Mimikatz on the server confirms the attacker had the tools to extract it.",
        },
        {
          id: "rat-2",
          text: "Resetting only the service account won't help — if the KRBTGT hash was extracted via Mimikatz, the attacker can forge tickets for any account in the domain.",
        },
        {
          id: "rat-3",
          text: "Reconfiguring PAC validation to accept the mismatched signature would effectively whitelist forged tickets — this is the worst possible response.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Excellent analysis. The PAC signature failing against the KRBTGT key, combined with Mimikatz evidence on a recently compromised server, confirms a Golden Ticket attempt. The emergency double KRBTGT reset plus full IR is the only adequate response.",
        partial:
          "You identified the threat partially, but the remediation needs to target the KRBTGT hash, not just the service account. When Mimikatz is involved and PAC signatures fail, assume the KRBTGT hash is compromised.",
        wrong:
          "Missing the connection between Mimikatz artifacts, PAC signature failure, and Golden Ticket attacks leaves the domain fully compromised. The attacker has persistent, unrestricted access until KRBTGT is reset twice.",
      },
    },
  ],

  hints: [
    "Golden Tickets have three telltale signs: impossible ticket lifetimes, missing AS-REQ entries on domain controllers, and tickets appearing from unexpected hosts.",
    "KRBTGT password resets must always be done twice — the first reset is cached, and a single reset leaves previously forged tickets valid.",
    "When Mimikatz artifacts are found on a compromised host with local admin access, always assume the worst — the KRBTGT hash may have been extracted.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Golden Ticket attacks represent one of the most severe Active Directory compromises. Detection and response expertise in this area is rare and highly valued.",
  toolRelevance: [
    "Microsoft Defender for Identity",
    "BloodHound",
    "Mimikatz (defensive understanding)",
    "Purple Knight",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
