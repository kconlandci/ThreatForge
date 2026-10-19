import type { LabManifest } from "../../types/manifest";

export const aiIncidentReportReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "ai-incident-report-review",
  version: 1,
  title: "Sign-Off: Review the AI's Incident Report",

  tier: "intermediate",
  track: "incident-response",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "ai-oversight",
    "incident-response",
    "soc",
    "report-review",
    "authentication",
    "timeline-verification",
  ],

  description:
    "An AI copilot drafted the incident report for an overnight password spray and recommends closing it as benign noise. Work the raw auth logs, EDR notes, and session records it summarized — then decide whether to sign, correct, or escalate.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Trace an AI-generated incident narrative back to the raw evidence it summarized",
    "Detect events an AI summary omitted — and hosts it misattributed — before signing a report",
    "Distinguish sign-off, correction, and escalation decisions for AI-produced incident reports",
    "Recognize why a single successful authentication inside a spray inverts an incident's severity",
    "Read an AI tool's data-scope limits so 'no activity observed' is never mistaken for 'nothing happened'",
  ],
  sortOrder: 445,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "air-001",
      title: "The Report on Your Desk",
      objective:
        "The SOC's AI copilot drafted incident report INC-2481 for last night's authentication alerts and recommends closure. You are the analyst asked to sign it. Before you do, check the report's central claim against the raw authentication log.",
      investigationData: [
        {
          id: "ai-report",
          label: "AI Incident Report (INC-2481)",
          content:
            "Copilot summary: 'Between 02:11–02:19 UTC, 214 failed login attempts targeted 38 accounts from a single external IP — a pattern consistent with commodity password spraying. No successful authentications occurred. No accounts were compromised. Recommendation: close as benign noise.'",
        },
        {
          id: "auth-log",
          label: "Raw IdP Authentication Log (extract)",
          content:
            "02:11:03–02:19:47 UTC — 214 × FAILURE, source 185.220.14.7, 38 distinct accounts. At 02:16:41 UTC, between the failures: 1 × SUCCESS — user j.okafor — source 185.220.14.7 — ASN AS9009. Failures resume immediately after and continue to 02:19.",
          isCritical: true,
        },
        {
          id: "asn-context",
          label: "ASN Intelligence",
          content:
            "AS9009 is a hosting-provider ASN frequently used by credential-stuffing and spray operations. Company users authenticate from three known ASNs (HQ ISP, two mobile carriers). AS9009 has never appeared in this organization's authentication history.",
          isCritical: true,
        },
        {
          id: "user-context",
          label: "Account Context — j.okafor",
          content:
            "Systems administrator. Holds VPN access and jump-host privileges. No travel, PTO, or after-hours work on file for last night.",
        },
      ],
      actions: [
        {
          id: "reject-escalate",
          label:
            "Refuse sign-off — reopen as suspected account compromise and escalate",
          color: "red",
        },
        {
          id: "sign-close",
          label: "Sign the report and close INC-2481 as noise",
        },
        {
          id: "sign-with-note",
          label: "Sign, but add a note to keep an eye on j.okafor's account",
        },
        {
          id: "ask-ai-recheck",
          label: "Send it back to the copilot and ask it to double-check its summary",
        },
      ],
      correctActionId: "reject-escalate",
      rationales: [
        {
          id: "rat-escalate",
          text: "The raw log contradicts the report's central claim: there WAS a successful authentication, from the spray's own IP, on an ASN this organization has never used, against an admin account with no travel on file. A success inside a spray means compromise until proven otherwise — the report cannot be signed, and the incident escalates now, while the session may still be live.",
        },
        {
          id: "rat-sign",
          text: "Signing accepts a summary the raw evidence disproves. The one event the AI dropped is the only event in the chain that changes the outcome — 214 failures are noise; 1 success is a breach.",
        },
        {
          id: "rat-note",
          text: "A note on a closed ticket changes nothing: the account stays enabled, the incident leaves the queue, and no one owns the follow-up. Suspicion without escalation is how compromises age quietly.",
        },
        {
          id: "rat-ask-ai",
          text: "Asking the same summarizer to check its own work is not verification. It already flattened 215 events into 'no successes' once; independent review means reading the primary evidence yourself — which is what you just did.",
        },
      ],
      correctRationaleId: "rat-escalate",
      feedback: {
        perfect:
          "Exactly right. You caught the dropped event: one successful login, mid-spray, from a never-seen ASN, on a privileged account. The AI's confident 'no successful authentications' was false, and signing would have closed a live compromise as noise.",
        partial:
          "You sensed something was off, but a note or a re-check by the same AI leaves the incident closed and the account active. A success inside a spray demands escalation, not annotation.",
        wrong:
          "The report's key claim was contradicted by the raw log: a successful authentication from the spray source on an unrecognized ASN. Never sign an AI incident narrative you haven't traced to primary evidence.",
      },
    },
    {
      type: "investigate-decide",
      id: "air-002",
      title: "The Wrong Host",
      objective:
        "You refused to sign. Digging into the copilot's timeline, you find its second error: it attributes the 02:16 session to j.okafor's assigned laptop. Verify that attribution against the endpoint and VPN records before containment is planned around it.",
      investigationData: [
        {
          id: "ai-timeline",
          label: "AI Report — Timeline Excerpt",
          content:
            "'02:16 — Successful authentication, j.okafor, workstation WS-4417 (user's assigned device). Session assessed as the user's own activity.'",
        },
        {
          id: "edr-telemetry",
          label: "EDR Telemetry — WS-4417",
          content:
            "WS-4417 was powered off from 01:58 to 06:30 UTC (lid closed, no network interfaces active). No EDR events from WS-4417 exist during the incident window. The 02:16 session's device fingerprint matches no managed endpoint.",
          isCritical: true,
        },
        {
          id: "vpn-session",
          label: "VPN Session Record",
          content:
            "Session from 185.220.14.7 authenticated as j.okafor. Device posture check FAILED (no disk-encryption attestation, unmanaged browser profile) — session admitted under legacy exception rule VPN-EX-07.",
          isCritical: true,
        },
        {
          id: "asset-inventory",
          label: "Asset Inventory",
          content:
            "WS-4417 is j.okafor's assigned laptop and the only device registered to the account. The session's device fingerprint (OS build + browser) matches nothing in inventory.",
        },
      ],
      actions: [
        {
          id: "revoke-and-hunt",
          label:
            "Revoke j.okafor's sessions and tokens, force a reset, and hunt the unmanaged-device session",
          color: "red",
        },
        {
          id: "isolate-laptop",
          label: "Isolate and reimage WS-4417 — the report names it as the source",
        },
        {
          id: "accept-attribution",
          label: "Accept the AI's attribution — the session came from the user's laptop",
        },
        {
          id: "note-and-close",
          label: "Note the discrepancy in the ticket and proceed — attribution is a minor detail",
        },
      ],
      correctActionId: "revoke-and-hunt",
      rationales: [
        {
          id: "rat-revoke",
          text: "The EDR record proves WS-4417 was off. The AI mapped the session to the user's assigned asset because that is the device the account 'should' use — summarizers resolve identities to inventory, not to observed telemetry. The real source is an unmanaged device on a live session: revoke the tokens, force a credential reset, and hunt that session's activity.",
        },
        {
          id: "rat-isolate",
          text: "Isolating a powered-off, uninvolved laptop does nothing to the attacker's session and destroys your fastest containment option. Attribution errors turn into containment errors — clean the machine that actually connected, which here means killing the session, not wiping WS-4417.",
        },
        {
          id: "rat-accept",
          text: "Accepting the attribution means accepting 'the user's own activity' as the conclusion — the incident dies here. The primary telemetry says otherwise.",
        },
        {
          id: "rat-minor",
          text: "Host attribution is the backbone of scoping: it decides what gets isolated, imaged, and hunted. An attribution error is never a minor detail in an incident report.",
        },
      ],
      correctRationaleId: "rat-revoke",
      feedback: {
        perfect:
          "Correct. The AI resolved the session to the user's assigned laptop; the EDR proved that laptop was off and the real source was an unmanaged device. Containment followed the evidence — tokens revoked, session hunted — not the narrative.",
        partial:
          "You caught that the attribution was shaky, but isolating WS-4417 or noting the discrepancy leaves the attacker's actual session untouched. Contain the session the telemetry shows, not the asset the report names.",
        wrong:
          "The named workstation was powered off throughout the incident. Trusting the AI's attribution would have contained the wrong machine and left a live attacker session running under a privileged account.",
      },
    },
    {
      type: "investigate-decide",
      id: "air-003",
      title: "What the Session Touched",
      objective:
        "The copilot's report also states: 'No post-authentication activity observed.' Scope the incident properly — pull the VPN and server telemetry for the 02:16 session and decide what this incident actually covers.",
      investigationData: [
        {
          id: "ai-scope-line",
          label: "AI Report — Scope Statement",
          content:
            "'No post-authentication activity observed.' Methodology footnote (page 2 of the copilot's working notes): this report was generated from identity-provider logs only. VPN concentrator and file-server telemetry were not in scope for this summary.",
        },
        {
          id: "vpn-session-log",
          label: "VPN / Jump Host Session Log",
          content:
            "Session 02:16–02:47 UTC (31 minutes). 02:21 — authenticated to jump host JUMP-02. 02:29 — RDP session opened to FILE-SRV-03. Session terminated 02:47 (not by user action — connection dropped).",
          isCritical: true,
        },
        {
          id: "file-server-audit",
          label: "FILE-SRV-03 Audit Log",
          content:
            "02:31 — directory enumeration of \\\\FILE-SRV-03\\Finance (full listing read). No bulk download or file modification recorded in the window.",
          isCritical: true,
        },
        {
          id: "change-calendar",
          label: "Change & On-Call Records",
          content:
            "No change window, maintenance task, or on-call assignment for j.okafor last night. The on-call administrator was a different engineer, who made no logins in the window.",
        },
      ],
      actions: [
        {
          id: "expand-scope",
          label:
            "Expand the incident: include JUMP-02 and FILE-SRV-03, preserve their logs, and hunt for persistence",
          color: "red",
        },
        {
          id: "account-only",
          label: "Keep the scope to the account — password already reset, close it out",
        },
        {
          id: "trust-ai-scope",
          label: "Accept 'no post-authentication activity' and limit the investigation to the IdP logs",
        },
        {
          id: "call-user-first",
          label: "Call j.okafor first and ask whether any of this was them",
        },
      ],
      correctActionId: "expand-scope",
      rationales: [
        {
          id: "rat-expand",
          text: "The session lived for 31 minutes, reached a jump host, and enumerated a finance share. 'No activity observed' meant 'not in the data I was given' — the copilot's own footnote admits VPN and file-server telemetry were out of its scope. Scope follows the session evidence: preserve JUMP-02 and FILE-SRV-03 logs now and hunt for persistence before anything is closed.",
        },
        {
          id: "rat-account-only",
          text: "A password reset doesn't rewind 31 minutes of access. Whatever the session established — accounts, keys, scheduled tasks — survives a reset. Scoping to the account declares victory over the one part of the incident you can see.",
        },
        {
          id: "rat-trust",
          text: "The AI's scope statement is a statement about its inputs, not about the world. Treating an unexamined data source as a negative finding is the most dangerous sentence in AI-generated reports.",
        },
        {
          id: "rat-call",
          text: "The evidence already excludes the user: unmanaged device, failed posture check, no on-call duty. Calling first delays log preservation and, if the account is attacker-controlled, warns the operator that they've been noticed.",
        },
      ],
      correctRationaleId: "rat-expand",
      feedback: {
        perfect:
          "Right. The report's 'no post-authentication activity' dissolved the moment you read its data scope — and the session telemetry showed a jump-host login and a finance-share enumeration. Scope is set by evidence, never by a summary's blind spots.",
        partial:
          "You questioned the AI's scope, but limiting the response to the account (or pausing to interview the user) leaves two servers' worth of session activity unexamined and their logs unpreserved.",
        wrong:
          "An AI that never saw the VPN or file-server logs cannot testify about them. The session touched a jump host and a finance server — an incident scoped to the IdP alone would have missed the actual intrusion.",
      },
    },
    {
      type: "investigate-decide",
      id: "air-004",
      title: "The Corrected Report",
      objective:
        "The copilot has regenerated its report (v2). It now includes the successful login — but reclassifies it. Make the final disposition call for INC-2481.",
      investigationData: [
        {
          id: "ai-report-v2",
          label: "AI Incident Report v2 — Revised Summary",
          content:
            "'One successful authentication occurred (02:16, j.okafor) — assessed as likely the user traveling: source IP geolocates to Romania. No post-authentication activity observed. Recommendation: close with a precautionary password reset.'",
        },
        {
          id: "hr-travel-records",
          label: "HR & Badge Records",
          content:
            "j.okafor has no travel request, no remote-work-from-abroad approval, and badged into HQ at 08:12 local time the same morning. The account's previous 12 months of logins are all from HQ and home ISPs.",
          isCritical: true,
        },
        {
          id: "asn-recheck",
          label: "ASN Re-Check",
          content:
            "AS9009 is a hosting/datacenter ASN. A traveling employee in Romania would authenticate from a Romanian consumer ISP or mobile carrier — not from a datacenter range associated with commercial VPN exit nodes and spray infrastructure.",
          isCritical: true,
        },
        {
          id: "v2-scope-note",
          label: "Report v2 — Data Scope",
          content:
            "Unchanged from v1: generated from IdP logs only. The v2 report still contains no mention of JUMP-02, FILE-SRV-03, or the 31-minute session — the telemetry you reviewed in the previous step was never supplied to the copilot.",
        },
      ],
      actions: [
        {
          id: "escalate-compromise",
          label:
            "Reject closure — declare a confirmed account-compromise incident and escalate to the IR lead",
          color: "red",
        },
        {
          id: "close-with-reset",
          label: "Close with the precautionary password reset, as v2 recommends",
        },
        {
          id: "sign-v2",
          label: "Sign v2 — the correction addresses the original concern",
        },
        {
          id: "monitor-30",
          label: "Close the incident and monitor the account for 30 days instead",
        },
      ],
      correctActionId: "escalate-compromise",
      rationales: [
        {
          id: "rat-escalate-final",
          text: "v2 fixed the omission but invented the explanation. 'Likely travel' is contradicted by HR records, by the badge log, and by the ASN itself — datacenter ranges are not how traveling employees connect. And the report still omits the jump-host and file-server activity entirely, because its data scope never changed. This is a confirmed compromise of a privileged account with hands-on-keyboard activity: it gets an IR escalation, not a closure.",
        },
        {
          id: "rat-reset-only",
          text: "A 'precautionary' reset treats a confirmed intrusion as a hygiene task. It does nothing about the session's 31 minutes, possible persistence, or the finance share enumeration.",
        },
        {
          id: "rat-sign-v2",
          text: "Signing v2 repeats the original mistake one level up: accepting a fluent narrative over primary records. A corrected report still has to survive contact with the evidence — this one doesn't.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring is what you do with a suspicion. You have a confirmed compromise of an admin account with post-authentication activity — that is an incident to run, not a metric to watch.",
        },
      ],
      correctRationaleId: "rat-escalate-final",
      feedback: {
        perfect:
          "Correct final call. The regenerated report fixed the dropped event but replaced skepticism with a story — 'likely travel' that HR records, badge logs, and the ASN type all refute. AI revisions deserve the same verification as AI drafts, especially when the revision makes the problem smaller.",
        partial:
          "You declined to fully trust v2, but resets and monitoring periods are responses to suspicion, not to a confirmed compromise with hands-on activity. This incident needed formal escalation.",
        wrong:
          "v2's 'likely travel' was an invented benign explanation: no travel on file, a badge swipe at HQ that morning, and a datacenter ASN. Signing or closing on it would have filed a real breach as a resolved non-event — the exact failure this lab exists to prevent.",
      },
    },
  ],

  hints: [
    "An AI incident summary is a claim about the evidence, not the evidence itself. Before signing, sample the raw logs specifically for the events the summary says never happened.",
    "When an AI attributes an event to a host or user, check the primary telemetry (EDR, session records). Summarizers map activity to assigned assets; attackers use whatever device they have.",
    "Read the AI's data scope before trusting a negative. 'No activity observed' usually means the relevant logs were never in the model's inputs — absence of evidence in its scope is not evidence of absence.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "AI copilots now draft the first version of most incident reports in modern SOCs — and the analysts who advance are the ones who can audit those drafts against raw telemetry. Sign-off is becoming a distinct, promotable skill: the human in the loop is accountable for everything the machine wrote, including the parts it quietly left out.",
  toolRelevance: [
    "Microsoft Security Copilot / Sentinel",
    "Splunk AI Assistant",
    "CrowdStrike Charlotte AI",
    "Elastic AI Assistant",
  ],

  createdAt: "2026-10-19",
  updatedAt: "2026-10-19",
};
