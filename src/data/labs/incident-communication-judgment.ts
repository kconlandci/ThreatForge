import type { LabManifest } from "../../types/manifest";

export const incidentCommunicationJudgmentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "incident-communication-judgment",
  version: 1,
  title: "Incident Communication Judgment",

  tier: "advanced",
  track: "incident-response",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "incident-response",
    "communication",
    "crisis-management",
    "breach-notification",
    "legal",
    "media-relations",
  ],

  description:
    "Make communication decisions that protect organizational credibility during active security incidents. Navigate premature press releases, uncontrolled disclosure, law enforcement coordination, vendor breach timelines, and journalist claims.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Make communication decisions that protect organizational credibility during incidents",
    "Recognize the risks of premature or uncontrolled disclosure",
    "Balance law enforcement notification with ongoing investigation needs",
    "Apply appropriate urgency to vendor breach notifications regardless of vendor timelines",
    "Respond professionally to external breach claims from media",
  ],
  sortOrder: 350,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "comm-001",
      title: "Data Breach — CEO Pushing Early Statement",
      context:
        "Your organization confirmed a data breach affecting an estimated 50,000 customer records. The CEO wants to issue a press release within the hour stating 'no financial data was exposed.' However, forensics is only 40% complete and the full scope of exposed data types hasn't been determined.",
      displayFields: [
        {
          label: "Breach Scope",
          value: "~50,000 customer records confirmed accessed",
          emphasis: "critical",
        },
        {
          label: "Forensics Status",
          value: "40% complete — data type analysis ongoing",
          emphasis: "warn",
        },
        {
          label: "CEO Request",
          value: "Press release in 1 hour: 'no financial data exposed'",
          emphasis: "warn",
        },
        {
          label: "Legal Obligation",
          value: "State breach notification laws: 30-72 day window",
          emphasis: "normal",
        },
        {
          label: "PR Pressure",
          value: "Reporter from TechCrunch called asking for comment",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "DELAY_FORENSICS",
          label: "Advise CEO to delay until forensics confirms scope",
          color: "green",
        },
        {
          id: "DRAFT_RELEASE",
          label: "Draft the press release as requested",
          color: "red",
        },
        {
          id: "GENERIC_STATEMENT",
          label: "Release a statement saying 'we're investigating' without data claims",
          color: "yellow",
        },
        {
          id: "REFUSE",
          label: "Refuse to participate in communications",
          color: "orange",
        },
      ],
      correctActionId: "DELAY_FORENSICS",
      rationales: [
        {
          id: "rat-delay",
          text: "Premature claims that prove wrong destroy credibility, create legal liability, and may need to be retracted — 'no financial data' cannot be stated at 40% forensics completion.",
        },
        {
          id: "rat-draft",
          text: "Issuing unverified claims exposes the company to fraud suits if financial data IS found later.",
        },
        {
          id: "rat-generic",
          text: "A generic 'investigating' statement is safer than specific claims but the CEO needs to understand why specifics are dangerous.",
        },
        {
          id: "rat-refuse",
          text: "Refusing to engage helps no one — the security team must advise leadership, not abstain.",
        },
      ],
      correctRationaleId: "rat-delay",
      feedback: {
        perfect:
          "Correct. At 40% forensics completion, any specific claim about data types is premature. Advising the CEO to delay protects the organization from retractions, legal liability, and credibility damage. You still have 30-72 days under most breach notification laws.",
        partial:
          "You avoided the worst outcome but missed the best response. A generic statement is safer than specific claims, but the CEO needs direct advice on why premature specifics are dangerous — not just a workaround.",
        wrong:
          "Making unverified claims or refusing to participate both fail the organization. At 40% forensics, stating 'no financial data exposed' is a liability time bomb. Advise the CEO directly on the risks of premature disclosure.",
      },
    },
    {
      type: "action-rationale",
      id: "comm-002",
      title: "Public Disclosure During Active Incident",
      context:
        "During an active ransomware incident, a well-meaning IT manager posts on the company's general Slack channel (visible to all 2,000 employees and 50 external vendor guests): 'We've been hit with ransomware on the finance servers! Everyone check your files and report anything weird!'",
      displayFields: [
        {
          label: "Channel",
          value: "#general — 2,050 members including 50 vendor guests",
          emphasis: "critical",
        },
        {
          label: "Message Visibility",
          value: "Posted 3 minutes ago, 89 views",
          emphasis: "warn",
        },
        {
          label: "Attacker Status",
          value: "Ransomware still active on 3 servers",
          emphasis: "critical",
        },
        {
          label: "IR Team",
          value: "Incident commander has NOT authorized external communication",
          emphasis: "warn",
        },
        {
          label: "Vendor Guests",
          value: "50 contractors from 12 vendor companies in channel",
          emphasis: "critical",
        },
      ],
      actions: [
        {
          id: "DELETE_SECURE",
          label: "Ask IT manager to delete the post + move comms to secured channel",
          color: "green",
        },
        {
          id: "LEAVE_POST",
          label: "Leave the post — employees need to know",
          color: "blue",
        },
        {
          id: "EDIT_POST",
          label: "Edit the post to remove details",
          color: "yellow",
        },
        {
          id: "FORWARD_ALL",
          label: "Forward the message to all employees via email",
          color: "red",
        },
      ],
      correctActionId: "DELETE_SECURE",
      rationales: [
        {
          id: "rat-delete",
          text: "Public disclosure during active response tips off the attacker (who may monitor company comms), causes panic among employees, and exposes sensitive incident details to 50 external vendor guests — all incident communications must go through a secured channel controlled by the incident commander.",
        },
        {
          id: "rat-leave",
          text: "Employees will be notified through proper channels once the IC approves — leaving the post expands the blast radius unnecessarily.",
        },
        {
          id: "rat-edit",
          text: "Editing doesn't address the 89 people who already read it or the external guests who may have already forwarded the information.",
        },
        {
          id: "rat-forward",
          text: "Forwarding expands the disclosure to the entire company and creates an even larger communication control problem.",
        },
      ],
      correctRationaleId: "rat-delete",
      feedback: {
        perfect:
          "Correct. During an active incident, all communications must flow through the incident commander. The Slack post exposed sensitive details to 50 external vendor guests and potentially tipped off the attacker. Delete, contain, and redirect to a secured channel.",
        partial:
          "You recognized the problem but chose an incomplete solution. Editing or leaving the post doesn't address the 50 external vendor guests or the 89 people who already saw it. Delete and move to a controlled channel.",
        wrong:
          "Uncontrolled disclosure during an active ransomware incident is dangerous. The attacker may monitor company communications, and 50 external vendor guests now know about your incident. All comms must go through the incident commander via secured channels.",
      },
    },
    {
      type: "action-rationale",
      id: "comm-003",
      title: "Nation-State APT — Notification Timing",
      context:
        "Your SOC confirms that an APT group (attributed to a nation-state actor) has been in your network for approximately 90 days. The attacker is still active, with persistent access to email servers and file shares. Legal wants to notify the FBI immediately. The IR lead wants to quietly monitor and map the attacker's infrastructure first.",
      displayFields: [
        {
          label: "Dwell Time",
          value: "~90 days confirmed via log analysis",
          emphasis: "critical",
        },
        {
          label: "Attacker Status",
          value: "Still active — accessing email and file shares",
          emphasis: "critical",
        },
        {
          label: "Legal Position",
          value: "FBI notification required 'as soon as practicable'",
          emphasis: "warn",
        },
        {
          label: "IR Lead Position",
          value: "Quiet monitoring to map full compromise scope",
          emphasis: "warn",
        },
        {
          label: "Data at Risk",
          value: "Executive email, product roadmaps, M&A documents",
          emphasis: "critical",
        },
      ],
      actions: [
        {
          id: "NOTIFY_AND_MONITOR",
          label: "Notify FBI while continuing monitoring — you can do both",
          color: "green",
        },
        {
          id: "DELAY_FBI",
          label: "Delay FBI notification until full scope mapped",
          color: "yellow",
        },
        {
          id: "NOTIFY_CEASE",
          label: "Notify FBI and cease all monitoring",
          color: "orange",
        },
        {
          id: "QUIET_MONITOR",
          label: "Follow IR lead — quiet monitoring takes priority",
          color: "blue",
        },
      ],
      correctActionId: "NOTIFY_AND_MONITOR",
      rationales: [
        {
          id: "rat-both",
          text: "You can notify law enforcement AND continue monitoring simultaneously — the FBI/CISA typically coordinate with your IR efforts rather than disrupting them, and delayed notification may violate legal obligations.",
        },
        {
          id: "rat-fbi-coord",
          text: "The FBI's cyber division is experienced with live investigations and won't unilaterally disrupt your monitoring.",
        },
        {
          id: "rat-cease",
          text: "Ceasing monitoring after FBI notification removes your visibility into the attacker and is unnecessary.",
        },
        {
          id: "rat-delay",
          text: "Delaying notification may violate regulatory requirements and your cyber insurance policy.",
        },
      ],
      correctRationaleId: "rat-both",
      feedback: {
        perfect:
          "Exactly right. FBI notification and continued monitoring are not mutually exclusive. The FBI cyber division routinely coordinates with organizations during live investigations. Delaying notification creates legal and regulatory risk while providing no investigative benefit.",
        partial:
          "You chose a partially correct path but missed the key insight: you can notify law enforcement AND continue your investigation simultaneously. The FBI coordinates with your IR team — they don't take over.",
        wrong:
          "This is a false choice. You don't have to pick between FBI notification and monitoring — do both. The FBI's cyber division is experienced with live APT investigations and will coordinate, not disrupt. Delaying notification or ceasing monitoring both create unnecessary risk.",
      },
    },
    {
      type: "action-rationale",
      id: "comm-004",
      title: "Vendor Breach — Confidentiality Request",
      context:
        "A critical vendor (your payroll processor) sends a breach notification at 5 PM Friday. They acknowledge unauthorized access to customer data and ask you to 'keep this notification confidential until we issue a public statement Monday morning' to manage their PR timeline.",
      displayFields: [
        {
          label: "Vendor",
          value: "PayScale Partners — payroll processor for 2,847 employees",
          emphasis: "critical",
        },
        {
          label: "Data Exposed",
          value: "Employee SSNs, bank account numbers, salary data",
          emphasis: "critical",
        },
        {
          label: "Notification Time",
          value: "Friday 5:00 PM",
          emphasis: "warn",
        },
        {
          label: "Vendor Request",
          value: "Keep confidential until Monday public statement",
          emphasis: "warn",
        },
        {
          label: "Your IR Status",
          value: "IR plan not yet activated",
          emphasis: "critical",
        },
      ],
      actions: [
        {
          id: "ACTIVATE_IR",
          label: "Activate IR plan immediately regardless of vendor timeline",
          color: "green",
        },
        {
          id: "HONOR_VENDOR",
          label: "Honor vendor's confidentiality request until Monday",
          color: "blue",
        },
        {
          id: "NOTIFY_EMPLOYEES",
          label: "Notify employees immediately via mass email",
          color: "orange",
        },
        {
          id: "WAIT_MONDAY",
          label: "Wait until Monday and assess then",
          color: "yellow",
        },
      ],
      correctActionId: "ACTIVATE_IR",
      rationales: [
        {
          id: "rat-activate",
          text: "Your obligation is to your employees and regulators, not the vendor's PR timeline — SSNs and bank details require immediate IR activation for credential resets, regulatory assessment, and employee protection.",
        },
        {
          id: "rat-honor",
          text: "Honoring the vendor's timeline leaves your employees exposed for 60+ hours with compromised SSNs and bank account numbers.",
        },
        {
          id: "rat-mass-email",
          text: "Mass employee notification before coordinated messaging causes panic and may not include actionable guidance.",
        },
        {
          id: "rat-wait",
          text: "Waiting until Monday violates your duty of care to affected employees whose financial data is compromised.",
        },
      ],
      correctRationaleId: "rat-activate",
      feedback: {
        perfect:
          "Correct. Your duty is to your 2,847 employees, not your vendor's PR timeline. SSNs and bank account numbers require immediate IR activation — credential monitoring, regulatory assessment, and coordinated employee notification cannot wait until Monday.",
        partial:
          "You took some action but didn't fully prioritize your employees. A vendor's confidentiality request never overrides your obligation to protect your people when SSNs and bank data are compromised.",
        wrong:
          "With employee SSNs and bank account numbers exposed, waiting over the weekend for the vendor's PR convenience is a serious failure of duty. Activate your IR plan immediately — your obligation is to your employees, not the vendor's timeline.",
      },
    },
    {
      type: "action-rationale",
      id: "comm-005",
      title: "Pre-Publication Breach Notification from Reporter",
      context:
        "A journalist from a major cybersecurity publication emails your security team: 'We have obtained evidence that Acme Corp customer data is for sale on a dark web marketplace. We plan to publish tomorrow at 9 AM. Would you like to comment?' Your security team has NOT detected any breach.",
      displayFields: [
        {
          label: "Source",
          value: "Journalist at CyberScoop — reputable publication",
          emphasis: "warn",
        },
        {
          label: "Claim",
          value: "Customer data for sale on dark web marketplace",
          emphasis: "critical",
        },
        {
          label: "Detection Status",
          value: "No internal indicators of compromise detected",
          emphasis: "warn",
        },
        {
          label: "Publication Timeline",
          value: "Tomorrow 9 AM",
          emphasis: "warn",
        },
        {
          label: "Response Window",
          value: "~16 hours before publication",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "TAKE_SERIOUSLY",
          label: "Take claim seriously — initiate threat hunt + prepare holding statement",
          color: "green",
        },
        {
          id: "DISMISS",
          label: "Dismiss — no internal evidence supports this",
          color: "blue",
        },
        {
          id: "PREEMPTIVE_DENIAL",
          label: "Issue preemptive denial before publication",
          color: "orange",
        },
        {
          id: "LEGAL_ACTION",
          label: "Threaten legal action to prevent publication",
          color: "red",
        },
      ],
      correctActionId: "TAKE_SERIOUSLY",
      rationales: [
        {
          id: "rat-serious",
          text: "Journalists sometimes learn about breaches before victims — a reputable publication making specific claims warrants immediate investigation, and a prepared holding statement ensures you're not caught flat-footed at 9 AM.",
        },
        {
          id: "rat-dismiss",
          text: "Dismissing without investigation is dangerous since many breaches are first discovered through external reporting, not internal detection.",
        },
        {
          id: "rat-denial",
          text: "A preemptive denial without investigation could prove false and destroy credibility if a breach is later confirmed.",
        },
        {
          id: "rat-legal",
          text: "Threatening legal action damages media relations and doesn't address the potential breach.",
        },
      ],
      correctRationaleId: "rat-serious",
      feedback: {
        perfect:
          "Excellent judgment. A reputable cybersecurity journalist making specific claims about dark web data sales is a credible lead. Initiating a threat hunt validates or refutes the claim, while preparing a holding statement ensures you control the narrative at 9 AM regardless of the outcome.",
        partial:
          "You took some action but didn't fully address the situation. With 16 hours before publication, you need both an investigation (threat hunt) and a communication plan (holding statement). One without the other leaves you exposed.",
        wrong:
          "Many breaches are first discovered through external reporting. Dismissing a credible journalist's specific claims, issuing a blind denial, or threatening legal action all leave you unprepared when the story publishes at 9 AM. Investigate and prepare.",
      },
    },
  ],

  hints: [
    "During active incidents, all communications should go through a designated incident commander. Uncontrolled disclosure can tip off attackers and cause panic.",
    "You can notify law enforcement AND continue your investigation simultaneously. FBI cyber division is experienced with coordinating live investigations.",
    "When a reputable journalist claims they have breach evidence, treat it as a credible lead. Many breaches are first discovered through external reporting, not internal detection.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Incident communication judgment separates senior security leaders from individual contributors. The technical response matters, but the communication decisions — who to tell, when, and how — often determine the total cost of a breach and the organization's reputation recovery.",
  toolRelevance: [
    "PagerDuty / OpsGenie (incident coordination)",
    "Everbridge (crisis communication)",
    "StatusPage (public incident status)",
    "CISA incident reporting portal",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
