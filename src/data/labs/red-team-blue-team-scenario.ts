import type { LabManifest } from "../../types/manifest";

export const redTeamBlueTeamScenarioLab: LabManifest = {
  schemaVersion: "1.1",
  id: "red-team-blue-team-scenario",
  version: 1,
  title: "Red Team / Blue Team Scenario",

  tier: "advanced",
  track: "incident-response",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "red-team",
    "blue-team",
    "purple-team",
    "adversary-simulation",
    "containment",
    "lateral-movement",
    "exfiltration",
    "incident-response",
  ],

  description:
    "Make real-time defensive decisions during a simulated red team engagement. Balance detection fidelity, containment urgency, and operational security to neutralize the adversary without tipping off the attacker or causing unnecessary business disruption.",
  estimatedMinutes: 20,
  learningObjectives: [
    "Evaluate the tradeoff between immediate containment and continued monitoring to gather adversary intelligence",
    "Apply containment strategies that neutralize the threat without alerting the attacker to defensive awareness",
    "Make emergency containment decisions for critical infrastructure under time pressure",
    "Assess data exfiltration scope and determine engagement conclusion criteria",
    "Coordinate blue team actions with purple team objectives during active engagements",
  ],
  sortOrder: 428,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "rt-001",
      title: "Initial Foothold — Phishing Compromise Detected",
      context:
        "During an authorized red team engagement, your SOC detects a successful phishing compromise. An analyst identified a suspicious OAuth token grant on a marketing department user's M365 account — the red team has obtained mailbox access and is reading emails. The engagement rules specify that the blue team should respond as if this were a real attack. The red team does not know they have been detected. You have a narrow window to act before the adversary pivots deeper.",
      displayFields: [
        { label: "Engagement", value: "Operation Crimson Dawn — Week 2 of 4", emphasis: "normal" },
        { label: "Compromised Account", value: "jpark@company.com (Marketing Coordinator)", emphasis: "warn" },
        { label: "Access Type", value: "OAuth app consent — full mailbox read via Graph API", emphasis: "critical" },
        { label: "Activity", value: "142 emails read in 18 minutes, keyword search for 'VPN', 'password', 'credentials'", emphasis: "critical" },
        { label: "Lateral Movement", value: "None detected yet — still in mailbox reconnaissance phase", emphasis: "warn" },
        { label: "Red Team Awareness", value: "Red team does NOT know they have been detected", emphasis: "normal" },
      ],
      actions: [
        {
          id: "SILENT_REVOKE",
          label: "Silently revoke the OAuth token and monitor for re-compromise attempts",
          color: "green",
        },
        {
          id: "DISABLE_ACCOUNT",
          label: "Disable the user account and reset all credentials immediately",
          color: "orange",
        },
        {
          id: "FULL_LOCKDOWN",
          label: "Lock down all marketing department accounts and alert the department",
          color: "red",
        },
        {
          id: "OBSERVE_ONLY",
          label: "Continue observing without any intervention to gather more intelligence",
          color: "blue",
        },
      ],
      correctActionId: "SILENT_REVOKE",
      rationales: [
        {
          id: "rat-1",
          text: "Silently revoking the OAuth token eliminates the adversary's current access without signaling that detection has occurred. Monitoring for re-compromise attempts reveals the red team's backup access methods and persistence mechanisms. This approach preserves the blue team's tactical advantage — the adversary will attempt re-access using an alternative technique, which provides additional intelligence about their playbook while keeping them contained.",
        },
        {
          id: "rat-2",
          text: "Disabling the account and resetting credentials is an appropriate containment action but overtly signals to the adversary that they've been detected. In a real engagement, this causes the attacker to accelerate their timeline, switch to pre-positioned persistence mechanisms, or go dormant — all of which reduce the blue team's ability to map the full scope of compromise.",
        },
        {
          id: "rat-3",
          text: "A department-wide lockdown is disproportionate to a single compromised OAuth token and causes unnecessary business disruption. Alerting the department also risks information leaking back to the red team through social channels, eliminating the element of surprise.",
        },
        {
          id: "rat-4",
          text: "Pure observation without intervention allows the adversary to continue reconnaissance and potentially discover VPN credentials or other sensitive information in the mailbox. The 142 emails already read may contain actionable intelligence for the attacker. Observation is only appropriate when the adversary's actions pose no additional risk — which is not the case when they are actively searching for credential material.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Excellent tactical decision. Silent revocation removes the threat while preserving your detection advantage. Monitoring for re-compromise attempts reveals the adversary's secondary access methods — a textbook purple team maneuver that maximizes both defensive value and intelligence gathering.",
        partial:
          "Your containment instinct is correct, but consider the operational security dimension. In adversary engagements, HOW you contain matters as much as WHAT you contain. Overt actions telegraph detection and cause adversaries to change behavior unpredictably.",
        wrong:
          "Either you over-escalated (department lockdown for a single token) or you under-responded (pure observation while the adversary searches for credentials). The optimal response eliminates access silently while maintaining the blue team's information advantage.",
      },
    },
    {
      type: "action-rationale",
      id: "rt-002",
      title: "Lateral Movement — Domain Controller at Risk",
      context:
        "The red team has escalated. After their initial OAuth token was revoked, they pivoted to a previously planted backdoor on a developer workstation (installed during week 1 via a supply chain package). They have now obtained domain admin credentials through Kerberoasting and are performing LDAP reconnaissance against the domain controller. Your SIEM shows the DC being queried for all service accounts, group memberships, and trust relationships. The red team is 1-2 steps from full domain compromise.",
      displayFields: [
        { label: "Threat Vector", value: "Kerberoasted service account — svc_sqlreport (domain admin)", emphasis: "critical" },
        { label: "Source Host", value: "DEV-WS-19 (developer workstation with supply chain backdoor)", emphasis: "critical" },
        { label: "Target", value: "DC01.corp.company.com — Primary Domain Controller", emphasis: "critical" },
        { label: "LDAP Queries", value: "Full enumeration: users, groups, trusts, SPNs — 847 queries in 4 minutes", emphasis: "critical" },
        { label: "Time Pressure", value: "Estimated 10-15 minutes before adversary attempts DCSync or GPO modification", emphasis: "warn" },
        { label: "Business Impact", value: "DC isolation would disrupt authentication for all 3,200 domain users", emphasis: "warn" },
      ],
      actions: [
        {
          id: "CONTAIN_SOURCE",
          label: "Isolate DEV-WS-19 and reset the compromised service account credential",
          color: "red",
        },
        {
          id: "ISOLATE_DC",
          label: "Network-isolate the domain controller immediately",
          color: "red",
        },
        {
          id: "RESET_KRBTGT",
          label: "Perform emergency KRBTGT password reset (double rotation)",
          color: "orange",
        },
        {
          id: "MONITOR_DCSYNC",
          label: "Monitor for DCSync attempt and intervene only if it begins",
          color: "yellow",
        },
      ],
      correctActionId: "CONTAIN_SOURCE",
      rationales: [
        {
          id: "rat-1",
          text: "Isolating the source host (DEV-WS-19) cuts the adversary's network path to the DC while resetting svc_sqlreport invalidates their stolen domain admin credential. This is the surgical containment option — it stops the attack chain at its origin without disrupting authentication services for 3,200 users. The red team loses both their foothold and their privileged credential simultaneously. Follow up with Kerberos ticket analysis to confirm no TGTs were issued to other hosts.",
        },
        {
          id: "rat-2",
          text: "Isolating the DC stops the immediate threat but causes organization-wide authentication failure affecting all 3,200 users. This is a nuclear option appropriate only if you have evidence the DC is already compromised (e.g., DCSync completed, Golden Ticket created). The LDAP queries indicate reconnaissance, not compromise — containment at the source is less disruptive and equally effective.",
        },
        {
          id: "rat-3",
          text: "KRBTGT double-reset invalidates all Kerberos tickets organization-wide, forcing every user and service to re-authenticate. This is the correct response if a Golden Ticket has been created, but it causes massive disruption and the evidence shows the adversary is still in the reconnaissance phase — they have not yet performed DCSync. Premature KRBTGT rotation is a disproportionate response at this stage.",
        },
        {
          id: "rat-4",
          text: "Waiting for DCSync is a dangerous gamble. DCSync completes in seconds once initiated, and the adversary would obtain the NTLM hash of every account in the domain including KRBTGT. At that point, containment requires full KRBTGT rotation and complete credential reset for all domain accounts. The cost of intervention now is far lower than the cost of intervention after DCSync.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Decisive and proportionate. Isolating the source host and resetting the compromised credential surgically severs the attack chain without causing organization-wide disruption. You correctly identified that the adversary is still in reconnaissance — containment at the source is sufficient when the DC itself has not been compromised.",
        partial:
          "Your response addresses the threat, but the collateral impact needs consideration. Domain controller isolation or KRBTGT rotation are appropriate for confirmed DC compromise — the evidence here shows reconnaissance, not compromise. Surgical containment at the source host achieves the same security outcome with dramatically less business impact.",
        wrong:
          "Either you waited too long (DCSync monitoring is a gamble with catastrophic downside) or you escalated beyond what the evidence supports (DC isolation for reconnaissance activity). Match your containment scope to the confirmed stage of the attack — the adversary is operating from DEV-WS-19 with a stolen credential, and both can be neutralized directly.",
      },
    },
    {
      type: "action-rationale",
      id: "rt-003",
      title: "Data Exfiltration — Assess Damage and Conclude Engagement",
      context:
        "Post-containment forensics revealed that before the blue team detected the lateral movement in scenario 2, the red team had already staged and exfiltrated a test dataset from the file server. The exfiltrated data was the pre-agreed canary dataset (non-sensitive test records planted specifically for the engagement), but the exfiltration method used a DNS tunneling technique that was completely undetected by your security stack. The engagement is approaching its conclusion. You need to assess the finding and determine next steps.",
      displayFields: [
        { label: "Exfiltrated Data", value: "Canary dataset — 2,400 synthetic employee records (non-sensitive)", emphasis: "normal" },
        { label: "Exfiltration Method", value: "DNS tunneling via TXT record queries to attacker-controlled domain", emphasis: "critical" },
        { label: "Detection Status", value: "ZERO alerts generated — DNS tunnel bypassed all monitoring", emphasis: "critical" },
        { label: "Volume", value: "~4.7 MB exfiltrated over 6 hours via 23,000 DNS queries", emphasis: "warn" },
        { label: "DNS Monitoring", value: "Corporate DNS logs captured queries but no anomaly detection rules exist", emphasis: "warn" },
        { label: "Engagement Timeline", value: "Day 12 of 14 — purple team debrief scheduled in 48 hours", emphasis: "normal" },
      ],
      actions: [
        {
          id: "DOCUMENT_GAP",
          label: "Document the DNS tunneling gap and prioritize detection rule development for the debrief",
          color: "green",
        },
        {
          id: "EMERGENCY_BLOCK",
          label: "Emergency-block all DNS TXT record queries organization-wide immediately",
          color: "red",
        },
        {
          id: "MINIMIZE_FINDING",
          label: "Note that only canary data was exfiltrated — classify as low-impact finding",
          color: "yellow",
        },
        {
          id: "EXTEND_ENGAGEMENT",
          label: "Request engagement extension to test additional exfiltration channels",
          color: "blue",
        },
      ],
      correctActionId: "DOCUMENT_GAP",
      rationales: [
        {
          id: "rat-1",
          text: "The critical finding is not the canary data — it is the complete absence of DNS tunneling detection. If 4.7 MB of data can be exfiltrated via 23,000 anomalous DNS queries over 6 hours with zero alerts, a real adversary could use the same channel to exfiltrate actual sensitive data. Documenting this gap with full technical detail (query volume, timing, encoding method) gives the detection engineering team a concrete specification for building DNS anomaly detection rules. Present this as a high-priority finding at the purple team debrief with a proposed detection rule and validation test.",
        },
        {
          id: "rat-2",
          text: "Blanket-blocking DNS TXT records would break legitimate services that depend on them (SPF validation, DKIM, DMARC, Let's Encrypt certificate validation, various SaaS integrations). The correct response is anomaly-based detection — identifying abnormal query volume, entropy, and timing patterns — not protocol-level blocking that creates availability issues.",
        },
        {
          id: "rat-3",
          text: "The nature of the exfiltrated data is irrelevant to the severity of the finding. The canary dataset was a test — the detection gap is real. Classifying this as low-impact because only test data was taken fundamentally misunderstands the purpose of red team engagements: the goal is to identify defensive weaknesses, and a completely undetected exfiltration channel is a critical weakness regardless of what data traversed it.",
        },
        {
          id: "rat-4",
          text: "While testing additional exfiltration channels has value, the engagement is 12 days in with a debrief in 48 hours. The DNS tunneling finding is already a high-impact deliverable. Additional testing should be scoped into a follow-up engagement after the current gaps are remediated, not bolted onto the end of this one.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Mature assessment. You correctly identified the DNS tunneling detection gap as the critical finding — not the canary data itself — and chose the constructive path of detailed documentation and detection rule development for the debrief. This is how purple team engagements produce lasting security improvements.",
        partial:
          "You recognized the issue but your chosen response either breaks legitimate DNS services (TXT blocking) or undervalues the finding (low-impact classification). The exfiltration channel being completely undetected is a critical gap regardless of what data was exfiltrated. Focus on building detection, not blocking protocols.",
        wrong:
          "A completely undetected exfiltration channel is one of the most critical findings a red team engagement can produce. Whether the data was canary records or crown jewels is irrelevant — the gap exists and a real adversary would exploit it. Document, build detection, and present at the debrief.",
      },
    },
  ],

  hints: [
    "In adversary engagements, operational security works both ways. Consider whether your containment action reveals to the attacker that they have been detected. Silent containment preserves the blue team's information advantage and forces the adversary to expose additional TTPs when they attempt to regain access.",
    "Match your containment scope to the confirmed stage of the attack. Reconnaissance-phase threats can often be neutralized surgically at the source; confirmed compromise of critical infrastructure may require broader isolation. Over-containment causes business disruption; under-containment allows escalation.",
    "Red team findings are measured by the detection gap they reveal, not by the sensitivity of the data they access. A completely undetected technique chain is a critical finding even if no sensitive data was touched — because the same technique chain would work against real sensitive data.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Purple team operators who can think simultaneously from both offensive and defensive perspectives are among the most valuable security professionals. The ability to detect an adversary without revealing your awareness, contain surgically without over-disrupting, and translate engagement findings into actionable detection improvements requires deep technical skill combined with tactical judgment that only comes from experience.",

  toolRelevance: [
    "CrowdStrike Falcon / Microsoft Defender for Endpoint",
    "Splunk / Elastic SIEM",
    "Cobalt Strike (red team perspective)",
    "BloodHound / SharpHound",
    "Zeek / Suricata (network monitoring)",
    "Azure AD / Entra ID audit logs",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
