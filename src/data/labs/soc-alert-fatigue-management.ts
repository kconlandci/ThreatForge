import type { LabManifest } from "../../types/manifest";

export const socAlertFatigueManagementLab: LabManifest = {
  schemaVersion: "1.1",
  id: "soc-alert-fatigue-management",
  version: 2,
  title: "Don't Ship the AI's Detection Rule",

  tier: "intermediate",
  track: "blue-team-foundations",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "siem",
    "alert-tuning",
    "ai-oversight",
    "detection-engineering",
    "soc-operations",
    "alert-fatigue",
    "severity-mapping",
  ],

  description:
    "An AI tuning assistant analyzed 90 days of alert data and produced a change package that would cut SOC queue volume by 40%. Your job: review every proposed change before it ships — keep the genuine wins, fix the ones that trade blind spots for quiet, and reject the ones that mute real detections.",
  estimatedMinutes: 18,
  learningObjectives: [
    "Evaluate AI-proposed detection tuning changes for coverage loss before approving them",
    "Distinguish noise reduction that preserves detection from suppression that creates blind spots",
    "Recognize when a high false-positive rate argues for context enrichment rather than demotion",
    "Price every tuning change in detection coverage, not in alert-count reduction",
    "Catch AI proposals that normalize attacker behavior through behavioral baselines",
  ],
  sortOrder: 430,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "fatigue-001",
      title: "The Suppression Package",
      description:
        "The AI tuning assistant's headline proposal: a suppression package projected to remove 1,150 alerts a day from the queue. Each change below is staged as the AI wrote it. Set the version that should actually ship — the AI optimized for queue volume, and nobody has yet priced its changes in detection coverage. That review is yours.",
      targetSystem: "Microsoft Sentinel — AI Tuning Assistant, Change Set #14",
      items: [
        {
          id: "svc-account-suppression",
          label: "Suppress All Service-Account Alerts",
          detail:
            "AI rationale: 'Service accounts generate 38% of queue volume, mostly expired-credential retry loops.' The staged rule suppresses EVERY alert type for svc-* accounts — including successful interactive logons and impossible-travel detections on those accounts. Service accounts hold elevated privileges across the estate.",
          currentState: "Suppress all svc-account alerts",
          correctState: "Suppress only expired-credential retry alerts for svc accounts",
          states: [
            "Suppress all svc-account alerts",
            "Suppress only expired-credential retry alerts for svc accounts",
            "Keep all svc-account alerts unchanged",
          ],
          rationaleId: "rat-svc",
        },
        {
          id: "ps-rule-merge",
          label: "Merge Overlapping PowerShell Rules",
          detail:
            "Three rules (any PowerShell execution, encoded-command execution, AMSI-flagged content) fire duplicate alerts for single events. The AI proposes merging them into one correlation rule that preserves each detection and fires once, at the highest applicable severity.",
          currentState: "Merge into a single correlation rule",
          correctState: "Merge into a single correlation rule",
          states: [
            "Merge into a single correlation rule",
            "Keep the three rules separate",
            "Delete two rules and keep only AMSI content detection",
          ],
          rationaleId: "rat-ps-merge",
        },
        {
          id: "login-threshold",
          label: "Raise Failed-Login Threshold to 25 per Hour",
          detail:
            "AI rationale: 'Raising the failed-authentication threshold from 5 in 10 minutes to 25 in 1 hour removes a projected 22% of remaining queue volume.' Commodity password sprays and distributed credential-stuffing tools are routinely throttled to stay under common thresholds — 20 attempts per hour per source is a typical evasion setting.",
          currentState: "Raise to 25 failures in 1 hour",
          correctState: "Keep 5 failures in 10 minutes",
          states: [
            "Raise to 25 failures in 1 hour",
            "Keep 5 failures in 10 minutes",
            "Lower to 3 failures in 10 minutes",
          ],
          rationaleId: "rat-threshold",
        },
        {
          id: "scanner-autoclose",
          label: "Auto-Close Scheduled Scanner Alerts",
          detail:
            "Alerts from known vulnerability scanner IPs (Qualys, Nessus) during documented scan windows are 100% false positives — 85 per scan day. The AI proposes auto-closing them with a maintenance-window tag while keeping the full event in the audit log.",
          currentState: "Auto-close with maintenance window tag",
          correctState: "Auto-close with maintenance window tag",
          states: [
            "Auto-close with maintenance window tag",
            "Keep analyst review for all scanner alerts",
            "Suppress entirely — generate no record",
          ],
          rationaleId: "rat-scanner",
        },
      ],
      rationales: [
        {
          id: "rat-svc",
          text: "The AI correctly identified the noise source and then suppressed an entire identity class to kill it. Expired-credential retries are the noise; interactive logons and impossible travel on privileged service accounts are among the highest-value detections in the SIEM. The scoped fix removes the retry noise and keeps the detections that exist precisely because service accounts are powerful and rarely watched by a human user.",
        },
        {
          id: "rat-ps-merge",
          text: "Ship this one as proposed. The merge eliminates duplicate alerts for the same event while preserving every detection in the cluster — and correlation actually raises fidelity, because an encoded command that also trips AMSI content inspection is a higher-confidence alert than either signal alone. Not every AI change is a trap; approving the good ones cleanly is part of the review.",
        },
        {
          id: "rat-threshold",
          text: "The AI priced this change in queue volume; price it in attacker behavior instead. A 25-per-hour threshold sits above the throttling settings of common spray tools, converting the noisiest real attack pattern into a silent one. The existing 5-in-10-minutes threshold catches realistic sprays while the enrichment pipeline handles typo noise — reject the raise.",
        },
        {
          id: "rat-scanner",
          text: "Ship as proposed. The alerts are predictable, authorized, and 100% false positives, and the proposal keeps the audit record — auto-close with a tag is not suppression. The distinction matters: removing work from the queue while preserving the evidence trail is legitimate tuning; deleting the trail would not be.",
        },
      ],
      feedback: {
        perfect:
          "A clean review: you shipped the two genuine wins (rule merge, scanner auto-close), scoped the service-account suppression down to the actual noise, and rejected the threshold raise that would have silenced real password sprays. Queue volume drops — and no detection class went dark to pay for it.",
        partial:
          "Some of your calls price the AI's changes correctly, but check each one for the coverage it removes. Suppressing by identity class and raising thresholds above attacker throttling are the two classic ways tuning packages buy quiet with blind spots.",
        wrong:
          "Approving this package as staged would have muted every alert on your most privileged accounts and raised the spray threshold above common evasion settings — a 40% quieter queue and a materially blinder SOC. Every AI tuning change must be priced in detection coverage before it ships.",
      },
    },
    {
      type: "toggle-config",
      id: "fatigue-002",
      title: "The Severity Remap",
      description:
        "The AI's second proposal remaps alert severities 'based on observed analyst behavior' — how often analysts close each alert type, and how fast. Review each remap. Remember: an analyst closing an alert as a false positive often means the alert lacked context, not that the threat was small.",
      targetSystem: "SOAR Platform — AI Severity Remapping Proposal",
      items: [
        {
          id: "impossible-travel-remap",
          label: "Impossible Travel: High → Low",
          detail:
            "AI rationale: 'Analysts close 60% of impossible-travel alerts as VPN-related false positives; demote to Low.' When the alert is a true positive, it means an adversary is authenticated right now from a second geography. The false positives come from missing VPN egress context in the alert — the IdP feed exists but was never joined.",
          currentState: "Demote to Low",
          correctState: "Keep High — add VPN egress context enrichment",
          states: [
            "Demote to Low",
            "Keep High unchanged",
            "Keep High — add VPN egress context enrichment",
          ],
          rationaleId: "rat-travel",
        },
        {
          id: "ransomware-remap",
          label: "Ransomware Behavior: Medium → Critical",
          detail:
            "The AI proposes promoting EDR ransomware behavior (mass encryption patterns, shadow-copy deletion) from the flat Medium default to Critical with automatic Tier 3 escalation and a 5-minute SLA. Historical rate: 0.3 alerts/day, false-positive rate under 5%, and damage is irreversible on a minutes timeline.",
          currentState: "Promote to Critical — auto-escalate to Tier 3 with 5-minute SLA",
          correctState: "Promote to Critical — auto-escalate to Tier 3 with 5-minute SLA",
          states: [
            "Promote to Critical — auto-escalate to Tier 3 with 5-minute SLA",
            "Keep Medium — standard queue",
            "Promote to High — standard Tier 2 queue",
          ],
          rationaleId: "rat-ransomware",
        },
        {
          id: "exfil-remap",
          label: "Large Outbound Transfer: High → Informational",
          detail:
            "AI rationale: '65% of large uploads to personal cloud storage are closed as legitimate personal use; demote to Informational.' The remaining 35% include genuine exfiltration of sensitive data — and a completed upload cannot be un-sent.",
          currentState: "Demote to Informational",
          correctState: "Keep High",
          states: [
            "Demote to Informational",
            "Keep High",
            "Promote to Critical — auto-escalate to Tier 3",
          ],
          rationaleId: "rat-exfil",
        },
        {
          id: "phishing-click-remap",
          label: "Phishing Link Clicked: High → Critical",
          detail:
            "The AI proposes promoting user-clicked-phishing alerts (12/day, ~20% false positives from safe-link rewrites) to Critical with Tier 3 auto-escalation, because 'credential theft may follow within hours.' Current handling: High, Tier 2 queue, with a 1–4 hour response window before harvested credentials are typically used.",
          currentState: "Promote to Critical — auto-escalate to Tier 3",
          correctState: "Keep High — standard Tier 2 queue",
          states: [
            "Promote to Critical — auto-escalate to Tier 3",
            "Keep High — standard Tier 2 queue",
            "Demote to Medium",
          ],
          rationaleId: "rat-phishing",
        },
      ],
      rationales: [
        {
          id: "rat-travel",
          text: "A 60% false-positive rate caused by a missing data join is a tooling gap, not a severity signal. The AI read analyst close behavior as 'this doesn't matter'; the correct inference is 'this alert arrives without the context analysts need.' Joining the VPN egress feed attacks the false positives directly while a true positive — an adversary authenticated right now — keeps the High severity it deserves.",
        },
        {
          id: "rat-ransomware",
          text: "Ship it. This is the textbook Critical profile: extremely low false-positive rate, active irreversible destruction, and a response window measured in minutes. The AI's promotion — with Tier 3 auto-escalation and the tightest SLA — is exactly right, and approving correct changes without edits is part of a good review.",
        },
        {
          id: "rat-exfil",
          text: "'Mostly benign' is the natural habitat of exfiltration. A 35% true-positive rate on an irreversible-impact alert is a strong detection, not noise; demoting it to Informational means nobody looks until after the data is gone. Keep High — Critical would over-escalate at this volume and false-positive mix, but High keeps a human on it inside the response window.",
        },
        {
          id: "rat-phishing",
          text: "The AI overcorrected here. Twelve alerts a day at 20% false positives would flood Tier 3 with escalations and desensitize the exact team the ransomware promotion is trying to protect. High with Tier 2 handling fits the 1–4 hour credential-use window — urgency is real, but it is structured-investigation urgency, not minutes-to-irreversible-loss urgency.",
        },
      ],
      feedback: {
        perfect:
          "Well judged in both directions: you refused the two demotions that confused false-positive rates with low stakes, fixed impossible travel with enrichment instead of burial, approved the ransomware promotion as written, and declined to flood Tier 3 with phishing clicks. Severity now tracks confidence × urgency × irreversibility — not analyst close rates.",
        partial:
          "Review any remap you approved that moves severity toward the AI's framing. Close-rate statistics describe alert quality and analyst tooling; severity must describe the threat. Demotions hide real detections, and reflexive promotions burn out the top tier.",
        wrong:
          "This remap, shipped as staged, would have demoted an active-compromise signal and a data-loss signal while flooding Tier 3 with a mid-urgency alert type. Analyst behavior data tells you where alerts lack context — never, by itself, what a threat is worth.",
      },
    },
    {
      type: "toggle-config",
      id: "fatigue-003",
      title: "The Auto-Close Rules",
      description:
        "The final proposal: SOAR auto-close rules that would resolve four alert patterns without analyst review. Auto-close is the sharpest tool in the package — a wrong rule doesn't just mis-prioritize an alert, it erases the human from the loop entirely. Decide which patterns may safely close themselves.",
      targetSystem: "SOAR Platform — AI Auto-Close Rule Proposal",
      items: [
        {
          id: "autoclose-single-failure",
          label: "Auto-Close Single Failed Logins",
          detail:
            "Single failed authentication events (below the 5-in-10-minutes threshold) that match no other risk signal: auto-close after logging. These are overwhelmingly mistyped passwords and are already logged for correlation.",
          currentState: "Auto-close single failed logins",
          correctState: "Auto-close single failed logins",
          states: [
            "Auto-close single failed logins",
            "Keep in the analyst queue",
          ],
          rationaleId: "rat-single",
        },
        {
          id: "autoclose-after-hours-admin",
          label: "Auto-Close After-Hours Admin Logons",
          detail:
            "AI rationale: 'Behavioral baseline shows admin j.okafor logs on after hours an average of twice a month; auto-close after-hours admin logons matching this baseline.' The baseline was built from 90 days of history — a window in which an attacker using the account would also have been 'learned' as normal.",
          currentState: "Auto-close when matching the behavioral baseline",
          correctState: "Reject — keep alerting, add on-call roster context",
          states: [
            "Auto-close when matching the behavioral baseline",
            "Reject — keep alerting, add on-call roster context",
            "Auto-close only during declared change windows",
          ],
          rationaleId: "rat-afterhours",
        },
        {
          id: "autoclose-dormant-account",
          label: "Auto-Close Dormant-Account Activity",
          detail:
            "AI rationale: 'Accounts inactive 90+ days generate low-value alerts; auto-close activity alerts for dormant accounts.' Dormant accounts are a classic attacker target: rarely watched, often over-privileged, and any activity on them is anomalous by definition.",
          currentState: "Auto-close dormant-account activity alerts",
          correctState: "Reject — escalate dormant-account activity to High",
          states: [
            "Auto-close dormant-account activity alerts",
            "Reject — escalate dormant-account activity to High",
            "Keep at current severity",
          ],
          rationaleId: "rat-dormant",
        },
        {
          id: "autoclose-duplicates",
          label: "Auto-Close True Duplicates",
          detail:
            "Alerts already merged into a parent incident as duplicates (same event, multiple sensors) would auto-close with a link to the parent preserved. The parent incident remains fully analyst-reviewed.",
          currentState: "Auto-close duplicates linked to parent incident",
          correctState: "Auto-close duplicates linked to parent incident",
          states: [
            "Auto-close duplicates linked to parent incident",
            "Keep duplicates open until parent closes",
          ],
          rationaleId: "rat-dupe",
        },
      ],
      rationales: [
        {
          id: "rat-single",
          text: "Ship it. A lone failed login with no corroborating signal is the definition of sub-threshold noise, and it remains logged for the correlation rules that detect patterns across events. Auto-closing it removes queue clutter without removing evidence.",
        },
        {
          id: "rat-afterhours",
          text: "This rule would teach the SOC to ignore the exact pattern of a real compromise: a privileged account authenticating at unusual hours. Worse, the baseline is self-fulfilling — 90 days of 'normal' can include an attacker's own activity, which the model then certifies as the account's habits. Keep the alerts; give analysts the on-call roster as context so legitimate late work is recognized in seconds instead of auto-forgiven in advance.",
        },
        {
          id: "rat-dormant",
          text: "The AI inverted the risk. Dormancy doesn't make activity low-value — it makes activity high-signal, because a legitimate owner who never uses an account explains none of its logons. Attackers prize dormant accounts precisely because nobody is watching. This pattern should be escalated, not auto-closed.",
        },
        {
          id: "rat-dupe",
          text: "Ship it. A true duplicate — the same event already under review in a parent incident — adds no information, and the link preserves the audit trail. This is the legitimate core of auto-close: eliminating copies, not eliminating judgment.",
        },
      ],
      feedback: {
        perfect:
          "Exactly the right line: duplicates and sub-threshold singles may close themselves, but behavioral baselines and dormancy never earn auto-forgiveness — they describe the two patterns attackers most want a SOC to stop seeing. The queue gets quieter and the dangerous alerts get louder.",
        partial:
          "Check the two rules you may have approved on the AI's plausibility. 'Usually works late' and 'dormant means low-value' are both inverted-risk claims: the first can be trained by the attacker, the second mistakes absence of an owner for absence of threat.",
        wrong:
          "Shipped as staged, this package would have auto-closed after-hours admin logons against a learnable baseline and erased dormant-account activity outright — two of the highest-signal patterns in identity security. Auto-close is for copies and noise, never for anomalies with a plausible story attached.",
      },
    },
  ],

  hints: [
    "An AI tuner optimizes the metric it was given — in this package, queue volume. Price every proposed change in detection coverage before approving it: what would an attacker gain if this shipped?",
    "When an AI cites a false-positive rate to justify demotion or auto-close, ask what context would fix the false positives. Missing enrichment is a tooling gap, not a severity signal.",
    "'The account usually does this' is a baseline an attacker can hide inside — or train. Dormant-account and after-hours activity deserves more scrutiny, not automated forgiveness.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Detection tuning is becoming a review discipline: AI assistants now generate the change packages, and senior analysts and detection engineers are accountable for what ships. The professionals who thrive are the ones who can look at a plausible, well-formatted AI proposal and find the one line that would have blinded the SOC — before it reaches production.",
  toolRelevance: [
    "Splunk / Elastic SIEM",
    "Microsoft Sentinel",
    "Palo Alto XSOAR / Splunk SOAR",
    "CrowdStrike Falcon LogScale",
    "ServiceNow SecOps",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-10-19",
};
