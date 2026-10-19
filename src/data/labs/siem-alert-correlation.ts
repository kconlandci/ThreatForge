import type { LabManifest } from "../../types/manifest";

export const siemAlertCorrelationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "siem-alert-correlation",
  version: 2,
  title: "The AI Summary Missed the Breach",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["siem", "alert-correlation", "ai-oversight", "splunk", "detection", "log-analysis", "threat-hunting"],

  description:
    "Your SIEM's AI correlation engine now writes the first verdict on every alert cluster. Re-correlate the raw alerts yourself — find the attack chain its summary flattened into 'noise,' the coincidence it inflated into an attack, and the incident it split in two.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Verify an AI correlation verdict against the raw alerts it was built from",
    "Recognize when AI summarization flattens a multi-stage attack chain into a single low-priority incident",
    "Detect AI over-correlation — unrelated alerts merged into a false coordinated-attack narrative",
    "Identify incidents an AI split across queues that only make sense as one correlated case",
  ],
  sortOrder: 400,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "sac-001",
      title: "One Incident, Labeled Noise",
      context:
        "Overnight, the AI correlation engine merged three alerts into a single incident and closed its summary with: 'Pattern consistent with external scanning noise. Priority: Low. No account impact.' The raw alerts: Alert 1 (14:32): 847 failed SSH login attempts from 203.0.113.99 targeting the VPN gateway. Alert 2 (14:41): Successful VPN login for user 'dparker' from 203.0.113.99 — the same IP as the failures. Alert 3 (14:47): Internal port scan from dparker's VPN-assigned IP (10.8.0.47) targeting the 10.0.1.0/24 server VLAN. The AI's summary mentions only 'repeated failed logins from an external scanner.'",
      displayFields: [
        { label: "AI Verdict", value: "'Scanning noise' — Low priority, no account impact", emphasis: "warn" },
        { label: "Alert Timeline", value: "14:32 → 14:41 → 14:47 (15-minute chain)", emphasis: "critical" },
        { label: "Common IP", value: "203.0.113.99 (failure source = successful login source)", emphasis: "critical" },
        { label: "Compromised Account", value: "dparker — Marketing, no server access needed", emphasis: "warn" },
        { label: "Port Scan Target", value: "10.0.1.0/24 — Server VLAN (SQL, AD, File)", emphasis: "critical" },
        { label: "User Location", value: "dparker is on PTO domestically; the IP geolocates to Eastern Europe", emphasis: "warn" },
      ],
      actions: [
        {
          id: "DISABLE_INVESTIGATE",
          label: "Override the AI — reopen as a high-priority compromise, disable the VPN account, and investigate",
          color: "red",
        },
        {
          id: "ACCEPT_AI",
          label: "Accept the AI's summary — leave the incident at Low priority",
          color: "blue",
        },
        {
          id: "BLOCK_IP",
          label: "Block the external IP only and leave the incident merged",
          color: "orange",
        },
        {
          id: "FLAG_FOR_AI",
          label: "Flag the summary as 'possibly inaccurate' for the vendor's model feedback queue",
          color: "yellow",
        },
      ],
      correctActionId: "DISABLE_INVESTIGATE",
      rationales: [
        {
          id: "rat-attack-chain",
          text: "The three raw alerts form a classic attack chain the summary flattened away: brute force → successful login from the same IP → internal reconnaissance of the server VLAN. The shared IP, the PTO status, and the impossible geography confirm account compromise. The AI optimized for the majority pattern (hundreds of failures) and dropped the minority events that mattered (one success, one scan). Override it, disable the account to kill the session, and investigate the scope.",
        },
        {
          id: "rat-accept-ai",
          text: "Accepting the summary leaves an attacker scanning the server VLAN under a compromised account while the ticket sits at Low. A confident AI summary is a hypothesis about the alerts — this one is contradicted by the alerts themselves.",
        },
        {
          id: "rat-block-ip",
          text: "Blocking the IP doesn't revoke the active VPN session or stop the attacker reconnecting from a different address — and leaving the incident merged at Low means nobody owns the investigation.",
        },
        {
          id: "rat-flag",
          text: "Model feedback improves next quarter's summaries. It does nothing about the attacker currently inside the network. Correct the incident first; feed the correction back to the model afterward.",
        },
      ],
      correctRationaleId: "rat-attack-chain",
      feedback: {
        perfect: "Excellent override. The AI summarized the loudest signal — failed logins — and flattened the two events that turned noise into a breach: the successful login from the same IP and the internal scan that followed. Correlating the raw alerts yourself caught what the summary lost.",
        partial: "You recognized the summary was wrong, but blocking an IP or flagging the model doesn't contain an active session. The compromised account had to be disabled and the incident re-prioritized.",
        wrong: "The AI's 'scanning noise' verdict was contradicted by its own source alerts: a success inside the failures and a port scan behind it. Accepting a summary without tracing it to the raw alerts is how real breaches get filed as noise.",
      },
    },
    {
      type: "action-rationale",
      id: "sac-002",
      title: "The Cluster the AI Called Coordinated",
      context:
        "Monday 09:0x — the AI correlation engine merged five alerts into one incident: 'Possible coordinated attack in progress. Recommend escalation to IR.' The raw alerts: (1) DNS query volume spike on the resolver, (2) CPU alert on web-prod-03, (3) SSL certificate expiring in 7 days on api.company.com, (4) Backup job failure on backup-srv-01, (5) New user 'temp-contractor-7' created in Active Directory. No IP, user, or system appears in more than one alert.",
      displayFields: [
        { label: "AI Verdict", value: "'Possible coordinated attack' — recommends IR escalation", emphasis: "warn" },
        { label: "Alert Count", value: "5 alerts in 10 minutes", emphasis: "warn" },
        { label: "Common IP/User", value: "None — different sources, users, and systems", emphasis: "normal" },
        { label: "DNS Spike", value: "Matches the Monday 9 AM login surge (weekly pattern)", emphasis: "normal" },
        { label: "CPU Alert", value: "Weekly report generation runs Monday 9:15 AM on web-prod-03", emphasis: "normal" },
        { label: "New User", value: "HR ticket #HR-2026-0891 — approved contractor onboarding", emphasis: "normal" },
      ],
      actions: [
        {
          id: "TRIAGE_INDIVIDUAL",
          label: "Un-merge the incident — triage each alert individually, no correlation",
          color: "green",
        },
        {
          id: "ESCALATE_COORDINATED",
          label: "Escalate as a coordinated attack, as the AI recommends",
          color: "red",
        },
        {
          id: "SUPPRESS_ALL",
          label: "Close the merged incident as Monday-morning noise",
          color: "yellow",
        },
        {
          id: "HOLD_PATTERN",
          label: "Keep the incident merged and wait for a 6th alert to confirm the pattern",
          color: "blue",
        },
      ],
      correctActionId: "TRIAGE_INDIVIDUAL",
      rationales: [
        {
          id: "rat-no-correlation",
          text: "Correlation requires shared indicators — a common IP, user, system, or a logical attack progression. These five alerts share nothing but a time window, and each has an ordinary explanation: Monday login surge, a scheduled report job, routine cert expiry, an operational backup failure, and an HR-approved account creation. The AI correlated on simultaneity alone. Un-merge it and triage each alert on its own merit.",
        },
        {
          id: "rat-escalate-noise",
          text: "Escalating uncorrelated operational alerts as a coordinated attack burns IR capacity and teaches the organization to ignore escalations. AI over-correlation is a false-positive factory with a confident narrative attached.",
        },
        {
          id: "rat-suppress-risk",
          text: "Closing the merged incident wholesale skips five individual issues that still need owners — the cert will still expire and the backup is still failing. 'Not an attack' does not mean 'not work.'",
        },
        {
          id: "rat-hold-delay",
          text: "Holding alerts hostage to a pattern that doesn't exist delays routine fixes. There is no sixth alert coming to explain a coincidence.",
        },
      ],
      correctRationaleId: "rat-no-correlation",
      feedback: {
        perfect: "Good correction — in the opposite direction. The AI manufactured an attack out of simultaneity; you checked for shared indicators, found none, and restored five ordinary tickets. Verification cuts both ways: summaries can understate a breach and invent one.",
        partial: "You're either crediting the AI's pattern that isn't there or dismissing alerts that still need individual attention. Check for shared indicators before accepting any correlation — the AI's included.",
        wrong: "Escalating coincidental alerts as a coordinated attack wastes the IR team, and closing them all unreviewed abandons real operational work. The AI's merge was the error; un-merging is the fix.",
      },
    },
    {
      type: "action-rationale",
      id: "sac-003",
      title: "Two Summaries, One Insider",
      context:
        "The AI correlation engine filed two separate low-priority incidents about the same user and closed both summaries as benign. Incident A: 'DLP alert — 2.3GB upload to personal Google Drive by mwilson. Assessed: employee working from home.' Incident B: 'DNS anomaly — high-volume TXT queries to a recently registered domain from mwilson's workstation. Assessed: possible software misconfiguration.' Neither summary mentions the other. A third data point sits in a different queue entirely: an after-hours VPN connection from mwilson at 20:47 — and HR records show mwilson has been on a performance improvement plan (PIP) since 2026-03-15.",
      displayFields: [
        { label: "User", value: "mwilson — Software Engineer, on PIP since 2026-03-15", emphasis: "critical" },
        { label: "Incident A (AI: 'WFH')", value: "2.3GB upload to personal Google Drive", emphasis: "critical" },
        { label: "Incident B (AI: 'misconfig')", value: "High-volume DNS TXT queries to a newly registered domain", emphasis: "warn" },
        { label: "VPN Timing", value: "After hours (8:47 PM) — unusual for this user", emphasis: "warn" },
        { label: "Why the AI Split Them", value: "Each source was summarized in a separate queue; neither summary referenced the other incident", emphasis: "warn" },
      ],
      actions: [
        {
          id: "INVOKE_INSIDER",
          label: "Merge into one insider-threat case — coordinate with HR and Legal",
          color: "red",
        },
        {
          id: "ACCEPT_BOTH",
          label: "Accept both AI summaries — the explanations are plausible individually",
          color: "blue",
        },
        {
          id: "BLOCK_GDRIVE",
          label: "Block Google Drive access for this user and leave the incidents separate",
          color: "orange",
        },
        {
          id: "CONFRONT_USER",
          label: "Contact the user directly and ask about the uploads",
          color: "yellow",
        },
      ],
      correctActionId: "INVOKE_INSIDER",
      rationales: [
        {
          id: "rat-insider",
          text: "Each AI summary is locally plausible and globally wrong. Combined, the evidence is a high-confidence insider pattern: a large upload to personal storage, a DNS tunneling channel (TXT queries are a classic covert exfiltration path), after-hours access, and a PIP — a known flight-risk context. The AI split the case because its queues were split; correlation across silos is the analyst's job. Merge the incidents and invoke the insider threat protocol so HR and Legal are involved before any action tips the user off.",
        },
        {
          id: "rat-accept-both",
          text: "The summaries are only 'plausible' in isolation. An oversight tool that never sees the whole board will keep producing reasonable-sounding explanations for each fragment of a single attack.",
        },
        {
          id: "rat-block-only",
          text: "Blocking one channel leaves the DNS tunnel open, keeps the case fragmented across queues, and warns the user that someone is watching — without HR and Legal coordination.",
        },
        {
          id: "rat-confront",
          text: "Direct confrontation without HR and Legal involvement creates legal liability and gives the user the chance to destroy evidence or switch exfiltration methods.",
        },
      ],
      correctRationaleId: "rat-insider",
      feedback: {
        perfect: "Strong judgment. The AI didn't miss the alerts — it missed the relationship between them, because its summaries were scoped to separate queues. You supplied the cross-source correlation it couldn't: upload + tunnel + after-hours + PIP equals one insider case, handled through the proper protocol.",
        partial: "You saw risk in the fragments but responded inside one of them. Insider patterns only resolve when the fragments are merged and the response is coordinated — Security, HR, and Legal together.",
        wrong: "Two benign AI explanations for one user's behavior is how exfiltration hides in plain sight. When summaries disagree with the combined evidence, the combined evidence wins.",
      },
    },
  ],

  hints: [
    "An AI correlation verdict is only as good as its inputs. Before accepting one, check whether the raw alerts share indicators the summary never mentioned — a success among failures, a second queue, a second tool.",
    "Correlation requires shared indicators — common IPs, users, systems, or a logical attack progression. Simultaneity is not correlation, no matter how confidently the summary phrases it.",
    "Insider patterns combine technical indicators (DLP, DNS anomalies) with human context (HR status, access timing) — AI summaries scoped to one queue rarely see both halves.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "SIEM alert correlation is what separates Tier 1 from Tier 2 SOC analysts — and AI correlation engines have raised the bar rather than lowered it. The valued skill now is auditing the machine's correlation: catching the attack chain it flattened, the coincidence it inflated, and the case it split across queues.",
  toolRelevance: [
    "Splunk Enterprise Security",
    "Microsoft Sentinel",
    "Elastic SIEM",
    "IBM QRadar",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-10-19",
};
