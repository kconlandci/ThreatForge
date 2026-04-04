import type { LabManifest } from "../../types/manifest";

export const incidentEscalationJudgmentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "incident-escalation-judgment",
  version: 1,
  title: "Incident Escalation Judgment",

  tier: "advanced",
  track: "incident-response",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "incident-response",
    "escalation",
    "soc",
    "judgment",
    "vendor-breach",
    "dns-tunneling",
    "privileged-access",
  ],

  description:
    "Make critical escalation decisions for ambiguous security events. Evaluate DNS anomalies, impossible travel alerts, vendor breaches, privileged account activity, and suspicious database queries to determine the appropriate response level.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Determine appropriate escalation levels for ambiguous security events",
    "Recognize high-confidence indicators that demand immediate escalation",
    "Balance investigation time against response urgency",
    "Apply vendor breach response procedures",
    "Evaluate privileged account activity with appropriate context",
  ],
  sortOrder: 300,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "esc-001",
      title: "Unexplained DNS Query Spike",
      context:
        "Network monitoring shows a 400% increase in outbound DNS queries from subnet 10.0.47.0/24 over the past hour. The queries are to randomized subdomains of update-service-cdn.xyz. No users in that subnet have reported issues.",
      displayFields: [
        {
          label: "Source Subnet",
          value: "10.0.47.0/24 — Engineering Lab",
          emphasis: "normal",
        },
        {
          label: "DNS Query Volume",
          value: "12,400 queries/hour (baseline: 3,100)",
          emphasis: "critical",
        },
        {
          label: "Query Pattern",
          value:
            "a8f3k2.update-service-cdn.xyz, p9m1x7.update-service-cdn.xyz...",
          emphasis: "critical",
        },
        {
          label: "Domain Registration",
          value: "update-service-cdn.xyz registered 3 days ago via privacy proxy",
          emphasis: "warn",
        },
        {
          label: "Affected Hosts",
          value: "3 workstations generating queries",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "INVESTIGATE",
          label: "Investigate further before escalating",
          color: "yellow",
        },
        {
          id: "ESCALATE_SOC",
          label: "Escalate to SOC manager immediately",
          color: "red",
        },
        {
          id: "BLOCK_DOMAIN",
          label: "Block the domain at DNS firewall",
          color: "orange",
        },
        {
          id: "EMAIL_TEAM",
          label: "Send email to subnet team asking about it",
          color: "blue",
        },
      ],
      correctActionId: "ESCALATE_SOC",
      rationales: [
        {
          id: "rat-escalate",
          text: "Randomized subdomain queries to a newly registered .xyz domain is a high-confidence C2 beaconing pattern — this warrants immediate escalation, not quiet investigation.",
        },
        {
          id: "rat-block",
          text: "Blocking the domain stops the symptom but the malware remains and will find another C2 channel.",
        },
        {
          id: "rat-email",
          text: "Emailing the team delays response and tips off anyone monitoring that email.",
        },
        {
          id: "rat-investigate",
          text: "Investigation is appropriate for ambiguous alerts but this pattern is well-documented.",
        },
      ],
      correctRationaleId: "rat-escalate",
      feedback: {
        perfect:
          "Correct. Randomized subdomain queries to a newly registered domain with privacy proxy registration is a textbook C2 beaconing pattern. Immediate escalation is the right call — the SOC manager needs to coordinate containment across all three affected hosts.",
        partial:
          "You showed awareness of the threat but chose an incomplete response. Blocking the domain or investigating alone delays the coordinated response this high-confidence indicator demands.",
        wrong:
          "This is a high-confidence C2 beaconing pattern: randomized subdomains, newly registered domain, privacy proxy. Sending an email or investigating quietly wastes critical time when malware is actively communicating with an attacker.",
      },
    },
    {
      type: "action-rationale",
      id: "esc-002",
      title: "Impossible Travel — VPN or Compromise?",
      context:
        "User alex.rodriguez@acme-corp.com authenticated from Chicago office at 2:15 PM. At 2:47 PM, the same account authenticated from Amsterdam. Alex responds to your inquiry: 'I always use NordVPN for personal browsing and forgot to disconnect before checking work email.'",
      displayFields: [
        {
          label: "User",
          value: "Alex Rodriguez — Marketing Manager",
          emphasis: "normal",
        },
        {
          label: "Chicago Login",
          value: "2:15 PM CT — Office WiFi (10.0.0.0/8)",
          emphasis: "normal",
        },
        {
          label: "Amsterdam Login",
          value: "2:47 PM CT — NL IP 185.107.56.xxx",
          emphasis: "warn",
        },
        {
          label: "Authentication Method",
          value: "SSO + MFA push (approved)",
          emphasis: "normal",
        },
        {
          label: "VPN Detection",
          value: "NordVPN exit node IP confirmed by ThreatFeed",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "CLOSE_ALERT",
          label: "Close the alert — VPN explains it",
          color: "blue",
        },
        {
          id: "ESCALATE_MGR",
          label: "Escalate to security manager",
          color: "orange",
        },
        {
          id: "REAUTH_POLICY",
          label:
            "Require re-auth from real location + document VPN policy reminder",
          color: "green",
        },
        {
          id: "DISABLE_ACCOUNT",
          label: "Disable the account pending investigation",
          color: "red",
        },
      ],
      correctActionId: "REAUTH_POLICY",
      rationales: [
        {
          id: "rat-reauth",
          text: "VPN explanation is plausible but should be verified — re-auth from known location confirms identity, and personal VPN on corporate accounts violates policy.",
        },
        {
          id: "rat-close",
          text: "Closing without verification accepts an unverified explanation for anomalous activity.",
        },
        {
          id: "rat-escalate",
          text: "Escalating to security manager is appropriate if re-auth fails but premature as first step.",
        },
        {
          id: "rat-disable",
          text: "Disabling the account is disproportionate when a simple verification resolves it.",
        },
      ],
      correctRationaleId: "rat-reauth",
      feedback: {
        perfect:
          "Well handled. Re-authentication from a known location verifies the user's identity independently, and documenting the VPN policy violation addresses the root cause of the alert. This balances security with proportional response.",
        partial:
          "You recognized something needed to be done but chose either too aggressive or too passive a response. Verify the user's identity through re-authentication before escalating or closing.",
        wrong:
          "A plausible explanation doesn't equal a verified one. Always verify independently — re-auth from a known location takes minutes and confirms whether this is a policy violation or a compromise.",
      },
    },
    {
      type: "action-rationale",
      id: "esc-003",
      title: "Critical Vendor Reports Data Breach",
      context:
        "Your company's payroll processor (PayScale Partners) sends a breach notification: 'An unauthorized party accessed our systems between March 1-12. Customer data including names, SSNs, and bank account numbers may have been exposed. We have engaged Mandiant for forensic investigation. A full report is expected within 60 days.'",
      displayFields: [
        {
          label: "Vendor",
          value: "PayScale Partners — Payroll Processor",
          emphasis: "critical",
        },
        {
          label: "Breach Window",
          value: "March 1-12 (12 days)",
          emphasis: "critical",
        },
        {
          label: "Data at Risk",
          value: "Employee names, SSNs, bank routing/account numbers",
          emphasis: "critical",
        },
        {
          label: "Vendor Status",
          value: "Forensics in progress — ETA 60 days",
          emphasis: "warn",
        },
        {
          label: "Your Employees",
          value: "2,847 employees processed through PayScale",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "WAIT_REPORT",
          label: "Wait for vendor's full investigation report",
          color: "blue",
        },
        {
          id: "INVOKE_IR",
          label: "Invoke your incident response plan immediately",
          color: "red",
        },
        {
          id: "RESET_CREDS",
          label: "Reset all credentials used with vendor",
          color: "orange",
        },
        {
          id: "SEND_EMAIL",
          label: "Send company-wide warning email",
          color: "yellow",
        },
      ],
      correctActionId: "INVOKE_IR",
      rationales: [
        {
          id: "rat-ir",
          text: "'May have been exposed' likely means 'was exposed' — treat a vendor breach as your breach until proven otherwise; activate IR for legal notification, credential reset, employee communication, and regulatory assessment.",
        },
        {
          id: "rat-wait",
          text: "Waiting 60 days for the forensics report leaves your organization exposed and may violate breach notification timelines.",
        },
        {
          id: "rat-creds",
          text: "Resetting credentials is one step but insufficient without the full IR response (legal, comms, regulatory).",
        },
        {
          id: "rat-email",
          text: "Company-wide email without coordinated messaging from legal/PR could cause panic and regulatory issues.",
        },
      ],
      correctRationaleId: "rat-ir",
      feedback: {
        perfect:
          "Exactly right. A vendor breach involving SSNs and bank accounts is your breach too. Invoking the IR plan coordinates legal, HR, communications, and regulatory response — waiting for the vendor's timeline is not an option when your employees' data is at stake.",
        partial:
          "You took some action but missed the full scope. A breach of this severity requires coordinated incident response — not just credential resets or emails, but legal, regulatory, and employee notification workflows.",
        wrong:
          "With 2,847 employees' SSNs and bank account numbers potentially exposed, waiting or sending uncoordinated communications is dangerous. Invoke your IR plan to ensure legal, regulatory, and employee notification obligations are met.",
      },
    },
    {
      type: "action-rationale",
      id: "esc-004",
      title: "Privileged Account — 3 AM Group Policy Change",
      context:
        "SIEM alert: domain admin account 'sa-jpark' used at 3:12 AM to modify Group Policy objects — specifically disabling Windows Defender real-time protection on the Engineering OU. On-call rotation shows J. Park is scheduled this week.",
      displayFields: [
        {
          label: "Account",
          value: "sa-jpark (Domain Admin)",
          emphasis: "critical",
        },
        {
          label: "Time",
          value: "3:12 AM Tuesday",
          emphasis: "warn",
        },
        {
          label: "Action",
          value:
            "Modified GPO: 'Eng-Workstations' — Disabled Defender real-time protection",
          emphasis: "critical",
        },
        {
          label: "On-Call Status",
          value: "J. Park is on-call this week",
          emphasis: "normal",
        },
        {
          label: "Change Ticket",
          value: "No change request found in ServiceNow",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "CLOSE_ONCALL",
          label: "Close — on-call admin doing their job",
          color: "blue",
        },
        {
          id: "VERIFY_CONFIRM",
          label: "Verify GP changes and confirm with admin",
          color: "green",
        },
        {
          id: "ESCALATE_COMPROMISED",
          label: "Escalate as potential compromised credentials",
          color: "orange",
        },
        {
          id: "LOCK_ACCOUNT",
          label: "Lock the admin account immediately",
          color: "red",
        },
      ],
      correctActionId: "VERIFY_CONFIRM",
      rationales: [
        {
          id: "rat-verify",
          text: "On-call status explains the timing but disabling antivirus without a change ticket is a significant action that must be verified — this could be legitimate troubleshooting or a compromised admin account.",
        },
        {
          id: "rat-close",
          text: "Closing without verification normalizes uncontrolled changes to security infrastructure.",
        },
        {
          id: "rat-escalate",
          text: "Escalating as compromised credentials is appropriate if verification fails but premature.",
        },
        {
          id: "rat-lock",
          text: "Locking the admin account disrupts on-call operations without evidence of compromise.",
        },
      ],
      correctRationaleId: "rat-verify",
      feedback: {
        perfect:
          "Good judgment. On-call status provides context but doesn't explain why Defender was disabled without a change ticket. Verifying with the admin directly resolves the ambiguity — if they confirm, document the change; if they don't recognize it, escalate immediately.",
        partial:
          "You recognized this needs attention but chose a disproportionate response. Verify with the admin first — the on-call status makes compromise possible but not probable, and locking the account or escalating prematurely disrupts operations.",
        wrong:
          "Disabling antivirus via Group Policy is a high-impact change regardless of who did it. Closing without verification normalizes undocumented security changes. Always verify privileged actions that lack change management documentation.",
      },
    },
    {
      type: "action-rationale",
      id: "esc-005",
      title: "Mass Customer Data Read — New Pipeline or Exfiltration?",
      context:
        "Database monitoring flags unusual queries: sequential SELECT * reads across the entire customer table, running for 2 hours from an application service account. A new analytics pipeline was deployed yesterday to staging. No one from the data team is available to confirm — it's 11 PM on a Friday.",
      displayFields: [
        {
          label: "Query",
          value: "SELECT * FROM customers ORDER BY id — sequential full-table scan",
          emphasis: "warn",
        },
        {
          label: "Duration",
          value: "Running for 2h 14min — 2.1M records read so far",
          emphasis: "warn",
        },
        {
          label: "Source",
          value: "Service account: svc-analytics-prod",
          emphasis: "normal",
        },
        {
          label: "Source IP",
          value:
            "10.0.88.15 — unknown, not in analytics subnet (10.0.90.0/24)",
          emphasis: "critical",
        },
        {
          label: "Deployment",
          value: "Analytics pipeline v2.3 deployed to staging yesterday",
          emphasis: "normal",
        },
        {
          label: "Data Team",
          value: "Unavailable until Monday",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "KILL_SESSION",
          label: "Kill the database session immediately",
          color: "red",
        },
        {
          id: "LET_RUN",
          label: "Let it run — probably the new pipeline",
          color: "blue",
        },
        {
          id: "INVESTIGATE_ESCALATE",
          label: "Investigate query source and escalate if it doesn't match",
          color: "green",
        },
        {
          id: "WAIT_MONDAY",
          label: "Wait until Monday and ask the data team",
          color: "yellow",
        },
      ],
      correctActionId: "INVESTIGATE_ESCALATE",
      rationales: [
        {
          id: "rat-investigate",
          text: "The source IP is NOT in the analytics subnet which contradicts the 'new pipeline' theory — verify whether the source matches deployment infrastructure before deciding.",
        },
        {
          id: "rat-kill",
          text: "Killing the session might terminate a legitimate pipeline causing data team to restart Monday.",
        },
        {
          id: "rat-letrun",
          text: "Assuming benign based on deployment timing ignores the IP mismatch.",
        },
        {
          id: "rat-wait",
          text: "Waiting until Monday gives a potential attacker 60+ hours of uninterrupted data access.",
        },
      ],
      correctRationaleId: "rat-investigate",
      feedback: {
        perfect:
          "Sharp observation. The source IP doesn't match the analytics subnet — that's the critical detail. Investigating the source before taking action lets you make an informed decision: if the IP traces to deployment infrastructure, it's likely the pipeline; if not, escalate and kill the session.",
        partial:
          "You took action but missed the key indicator. The source IP (10.0.88.15) is NOT in the analytics subnet (10.0.90.0/24). This mismatch is what should drive your investigation before deciding to kill or allow the query.",
        wrong:
          "The IP mismatch is the critical detail here. The query is coming from outside the analytics subnet, which contradicts the 'new pipeline' explanation. Investigate the source immediately — don't wait, and don't assume it's benign.",
      },
    },
  ],

  hints: [
    "Randomized DNS subdomains to newly registered domains are one of the highest-confidence indicators of command-and-control traffic. Don't wait to escalate.",
    "When evaluating user explanations for anomalous activity, verify independently rather than taking the explanation at face value.",
    "Vendor breaches are YOUR problem too. Don't wait for the vendor's investigation timeline — your breach notification obligations have their own clock.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "The escalation decision is the most consequential judgment call a SOC analyst makes. Under-escalation allows threats to spread; over-escalation wastes senior resources and causes alert fatigue. Senior analysts develop this judgment through pattern recognition and deliberate practice.",
  toolRelevance: [
    "Splunk / Elastic SIEM",
    "PagerDuty (Escalation workflows)",
    "ServiceNow (Incident management)",
    "CrowdStrike Threat Intelligence",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
