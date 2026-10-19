import type { LabManifest } from "../../types/manifest";

export const incidentDocumentationReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "incident-documentation-review",
  version: 2,
  title: "Verify the AI's Timeline",

  tier: "beginner",
  track: "incident-response",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["incident-response", "documentation", "ai-oversight", "post-incident", "timeline", "lessons-learned"],

  description:
    "The IR team's AI assistant now drafts every post-incident report from tickets, chat, and tool logs. Its narratives are fluent, confident — and yours to verify before they go to leadership and legal. Check the draft against the primary records.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Verify an AI-drafted incident timeline against primary system records",
    "Detect wrong timestamps sourced from ticket metadata instead of event logs",
    "Correct responder attribution the AI inferred from chat authorship rather than tool audit trails",
    "Identify incident steps missing from an AI draft because they happened outside chat",
  ],
  sortOrder: 710,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "doc-001",
      title: "Two Timestamps, Both Wrong",
      context:
        "The AI-drafted post-incident report for yesterday's malware containment is ready for leadership. Its timeline reads: '14:05 — Threat detected. 14:20 — Host contained. Total detection-to-containment: 15 minutes.' Before approving it, you spot-check the draft against the primary records. The EDR console shows the alert fired at 13:12 and sat unacknowledged in the queue for 53 minutes. The host isolation action in the EDR audit log is timestamped 15:47. The AI appears to have built its timeline from the incident ticket's 'created' and 'updated' fields — when the ticket was opened and last edited — not from the event logs.",
      displayFields: [
        { label: "AI Draft: Detection", value: "14:05 (sourced from ticket creation time)", emphasis: "warn" },
        { label: "EDR Record: Alert Fired", value: "13:12 — 53 minutes earlier than the draft claims", emphasis: "critical" },
        { label: "AI Draft: Containment", value: "14:20 (sourced from a ticket update)", emphasis: "warn" },
        { label: "EDR Audit: Host Isolated", value: "15:47 — 87 minutes later than the draft claims", emphasis: "critical" },
        { label: "True Detection→Containment", value: "2 hours 35 minutes — the draft reports 15 minutes", emphasis: "critical" },
      ],
      actions: [
        {
          id: "CORRECT_FROM_LOGS",
          label: "Return the draft — rebuild the timeline from EDR and system logs before it goes to leadership",
          color: "red",
        },
        {
          id: "ACCEPT_FLATTERING",
          label: "Approve as drafted — the sequence of events is right, the times are close enough",
          color: "blue",
        },
        {
          id: "REMOVE_TIMES",
          label: "Approve after deleting the specific times — keep the narrative, drop the numbers",
          color: "orange",
        },
        {
          id: "ASK_AI_REGEN",
          label: "Send it back to the AI assistant to regenerate the timeline",
          color: "yellow",
        },
      ],
      correctActionId: "CORRECT_FROM_LOGS",
      rationales: [
        {
          id: "rat-correct-logs",
          text: "The draft's two anchor timestamps are both wrong, and wrong in the direction that flatters the response: a 2h35m detection-to-containment became '15 minutes.' Leadership will make resourcing and SLA decisions from these numbers, and if this incident is ever audited, the EDR logs — not the AI's narrative — are the record. Rebuild the timeline from the primary logs, and note the 53-minute queue delay honestly: it identifies a real staffing gap that the flattering version hides.",
        },
        {
          id: "rat-accept",
          text: "'Close enough' times in an incident report are fabricated metrics. Detection and containment times drive SLA reporting, staffing decisions, and legal timelines — a 15-minute claim contradicted by your own EDR is worse than no claim at all.",
        },
        {
          id: "rat-remove",
          text: "Deleting the numbers doesn't fix the report — incident documentation standards require exact timestamps precisely because narratives without them can't be audited, correlated, or defended.",
        },
        {
          id: "rat-regen",
          text: "Regeneration re-runs the same sourcing error: the assistant built the timeline from ticket fields because those were the fields it had. Correction means supplying the primary records, not a second roll of the same dice.",
        },
      ],
      correctRationaleId: "rat-correct-logs",
      feedback: {
        perfect: "Correct. You caught the AI sourcing timestamps from ticket metadata instead of event logs — and noticed both errors flattered the response. The verified timeline (13:12 detection, 15:47 containment, and an honest 53-minute queue delay) is the one leadership and auditors need.",
        partial: "Softening the draft — removing times, or asking for a regeneration — leaves a wrong or empty timeline in an official record. Incident timelines are rebuilt from primary logs, not negotiated down.",
        wrong: "A fluent AI narrative with invented-feeling precision is still invented. Approving a 15-minute containment that the EDR contradicts at 2h35m puts a false metric into leadership reporting and legal exposure into the file.",
      },
    },
    {
      type: "action-rationale",
      id: "doc-002",
      title: "Credit to the Wrong Responder",
      context:
        "The next AI draft covers the same incident's containment section: 'At 15:47, J. Rivera (Tier 2) isolated the affected host and contained the threat.' You check the EDR console audit trail: the isolation action at 15:47 was executed by M. Chen (Tier 1), working from the runbook. Rivera joined the incident bridge an hour later and wrote most of the messages in the incident channel — which is where the AI appears to have inferred authorship from. One more discrepancy: the draft never mentions the compromised service account's password reset, though the IdP log shows Chen performed it at 16:05. It happened outside the chat channel, so the draft's source material doesn't include it.",
      displayFields: [
        { label: "AI Draft: Isolation By", value: "J. Rivera (Tier 2)", emphasis: "warn" },
        { label: "EDR Audit Trail: Isolation By", value: "M. Chen (Tier 1) — 15:47, via runbook", emphasis: "critical" },
        { label: "How the AI Decided", value: "Rivera authored most incident-channel messages", emphasis: "warn" },
        { label: "Missing Step", value: "Service account password reset (IdP log, 16:05, by Chen) — absent from the draft", emphasis: "critical" },
        { label: "Why It Matters", value: "Attribution feeds performance reviews, runbook validation, and audit records", emphasis: "normal" },
      ],
      actions: [
        {
          id: "CORRECT_ATTRIBUTION",
          label: "Correct the attribution from the EDR audit trail and insert the missing password reset from the IdP log",
          color: "red",
        },
        {
          id: "ACCEPT_DRAFT",
          label: "Approve — the team contained it together; individual credit is a detail",
          color: "blue",
        },
        {
          id: "REMOVE_NAMES",
          label: "Approve after removing all names — credit the team generically",
          color: "orange",
        },
        {
          id: "ASK_CHEN_CONFIRM",
          label: "Ask Chen to confirm in the channel so the AI can regenerate the section correctly",
          color: "yellow",
        },
      ],
      correctActionId: "CORRECT_ATTRIBUTION",
      rationales: [
        {
          id: "rat-attribution",
          text: "Incident records drive performance reviews, runbook validation, and regulatory audits — 'who did what, when' is evidence, not courtesy. The AI inferred authorship from chat volume because chat was its source; the EDR audit trail is the authoritative record, and it names Chen. Correct the draft from the audit trail, and restore the missing password reset from the IdP log — an action performed outside chat is invisible to a chat-sourced summary, which is exactly why human verification exists.",
        },
        {
          id: "rat-accept",
          text: "Crediting the wrong responder in an official record misstates an audit fact and erases the Tier 1 analyst who actually executed containment — corrosive to both the record and the team.",
        },
        {
          id: "rat-remove-names",
          text: "Generic team credit destroys the audit value of the report. Investigations, reviews, and compliance all require named, timestamped actions.",
        },
        {
          id: "rat-ask-chen",
          text: "Chen's confirmation adds nothing the EDR audit trail doesn't already prove — and routing verification through the person being verified defeats the point of checking primary records.",
        },
      ],
      correctRationaleId: "rat-attribution",
      feedback: {
        perfect: "Correct on both discrepancies. The AI inferred authorship from who talked the most; you verified against the tool audit trail and restored a containment step that happened where the AI couldn't see it. Documentation is evidence — this is what verifying it looks like.",
        partial: "Stripping names or accepting 'the team did it' preserves the error in softer language. The audit trail names the responder and the IdP log holds the missing step — correct the record from them.",
        wrong: "Approving a report that credits the wrong analyst and omits a containment step creates a false official record. AI drafts inherit the blind spots of their sources — chat-heavy, tool-light — until a human checks the systems of record.",
      },
    },
    {
      type: "action-rationale",
      id: "doc-003",
      title: "The Polished Draft Meets Legal",
      context:
        "Legal has requested the incident timeline for a breach notification assessment. The AI-drafted report — already circulated internally — states: 'Initial access time: unknown (insufficient data). Discovery: an employee noticed unusual activity and reported it. Containment followed promptly.' You know the underlying systems tell a more precise story: the VPN gateway logs contain the first malicious login (02:16, three days before discovery), the 'discovery' was an EDR alert (the employee's report came after the alert fired), and the notification clock legally starts at discovery, not at the employee's call. Legal is about to rely on the draft.",
      displayFields: [
        { label: "AI Draft: Initial Access", value: "'Unknown — insufficient data'", emphasis: "warn" },
        { label: "VPN Logs: Initial Access", value: "First malicious login 02:16, three days before discovery", emphasis: "critical" },
        { label: "AI Draft: Discovery", value: "'An employee noticed unusual activity'", emphasis: "warn" },
        { label: "EDR Record: Discovery", value: "Automated EDR alert fired first; employee report followed", emphasis: "critical" },
        { label: "Legal Stakes", value: "Breach notification deadlines run from the true discovery time", emphasis: "critical" },
      ],
      actions: [
        {
          id: "RECONSTRUCT_LOGS",
          label: "Reconstruct the timeline from VPN, EDR, and IdP logs and issue a corrected report to Legal before they rely on the draft",
          color: "red",
        },
        {
          id: "SEND_WITH_CAVEAT",
          label: "Send Legal the draft with a note that times are 'approximate'",
          color: "orange",
        },
        {
          id: "ESTIMATE_DETAILS",
          label: "Fill the gaps with the IR team's best recollections so the report reads complete",
          color: "yellow",
        },
        {
          id: "LET_LEGAL_ASK",
          label: "Send the draft as-is — Legal will ask if they need more precision",
          color: "blue",
        },
      ],
      correctActionId: "RECONSTRUCT_LOGS",
      rationales: [
        {
          id: "rat-reconstruct",
          text: "'Unknown' in an AI draft often means 'not in the sources the assistant was given' — the VPN logs hold the initial access time, and the EDR holds the true discovery event. Both facts change the legal analysis: dwell time and the start of the notification clock. Reconstruct the timeline from system logs while they are retained, and correct the record proactively — a corrected report issued by you is a QA success; the same correction extracted later by opposing counsel is a credibility failure.",
        },
        {
          id: "rat-caveat",
          text: "A caveat doesn't cure wrong facts. Legal will build notification decisions on the discovery description, and 'approximate' attached to a false statement is still a false statement in the file.",
        },
        {
          id: "rat-estimates",
          text: "Recollection-based details in a legal record are dangerous — they can be contradicted by logs, and the contradiction impeaches the whole report. Logs first, narrative second.",
        },
        {
          id: "rat-let-ask",
          text: "Legal asked for the timeline because they intend to rely on it. Waiting for them to discover that the draft understates dwell time by three days abdicates the verification duty that made this your review.",
        },
      ],
      correctRationaleId: "rat-reconstruct",
      feedback: {
        perfect: "Correct. You treated 'unknown' and 'an employee noticed' as claims to verify, found both contradicted by primary logs, and corrected the record before Legal built a notification decision on it. That is the entire discipline: AI drafts the story, primary evidence decides what's true.",
        partial: "Caveats and estimates both leave Legal relying on a narrative the logs refute. When a draft is headed for a legal decision, the only acceptable fix is reconstruction from the systems of record.",
        wrong: "Three days of dwell time and the true discovery trigger were sitting in the VPN and EDR logs while the official report said 'unknown.' Sending that draft onward unverified is how organizations miss notification deadlines they didn't know had started.",
      },
    },
  ],

  hints: [
    "AI report drafts are only as accurate as their sources. Ticket fields and chat logs produce fluent, wrong timelines — event logs, EDR audit trails, and IdP records are the systems of record.",
    "Check error direction: AI-sourced timeline errors often flatter the response (faster detection, quicker containment). A draft that makes the team look good deserves more scrutiny, not less.",
    "Steps that happen outside the channels an AI reads — console actions, phone calls, automated resets — go missing from its drafts. Verify containment completeness against tool logs, not the narrative.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Incident documentation has become a verification job. AI assistants draft the first version of nearly every report, and the professionals who stand out are the ones who can audit a polished narrative against EDR audit trails, IdP logs, and VPN records — because legal defensibility, regulatory compliance, and organizational learning all depend on the verified version, not the fluent one.",
  toolRelevance: [
    "PagerDuty / Opsgenie (incident timeline tracking)",
    "Jira (action item tracking)",
    "Confluence (incident documentation templates)",
    "Splunk (log-based timeline reconstruction)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-10-19",
};
