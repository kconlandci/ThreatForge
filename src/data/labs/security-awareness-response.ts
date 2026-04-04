import type { LabManifest } from "../../types/manifest";

export const securityAwarenessResponseLab: LabManifest = {
  schemaVersion: "1.1",
  id: "security-awareness-response",
  version: 1,
  title: "Security Awareness Response",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "security-awareness",
    "social-engineering",
    "user-education",
    "incident-reporting",
    "human-factor",
  ],

  description:
    "Handle security awareness incidents reported by employees — from suspicious USB drives to shoulder surfing concerns — using proportional responses that protect the organization without creating fear.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Select proportional responses to user-reported security concerns",
    "Balance security enforcement with a positive security culture",
    "Identify which user reports require escalation vs. simple guidance",
  ],
  sortOrder: 430,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "aware-001",
      title: "USB Drive Found in Parking Lot",
      context:
        "An employee found a branded USB drive in the company parking lot and brought it to the security desk. The drive has the company logo printed on it and looks like the ones given out at last year's conference. The employee asks if they should plug it in to check whose it is.",
      displayFields: [
        {
          label: "Reporter",
          value: "Mark Daniels — Sales Associate",
          emphasis: "normal",
        },
        {
          label: "Item",
          value: "USB drive with company branding",
          emphasis: "warn",
        },
        {
          label: "Location Found",
          value: "Employee parking lot, near building entrance",
          emphasis: "warn",
        },
        {
          label: "Drive Status",
          value: "Not plugged in — employee brought it to security desk",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "FORENSIC_ANALYSIS",
          label: "Secure the drive for forensic analysis",
          color: "green",
        },
        {
          id: "PLUG_IN_AIRGAP",
          label: "Plug it into an air-gapped machine to check contents",
          color: "orange",
        },
        {
          id: "RETURN_OWNER",
          label: "Try to find the owner and return it",
          color: "yellow",
        },
        {
          id: "DISCARD",
          label: "Throw the drive away",
          color: "blue",
        },
      ],
      correctActionId: "FORENSIC_ANALYSIS",
      rationales: [
        {
          id: "rat-forensic",
          text: "Found USB drives are a common attack vector — they must be analyzed in a sandbox, never plugged into corporate machines.",
        },
        {
          id: "rat-airgap",
          text: "Even air-gapped machines can be compromised by malicious USB firmware that executes on insertion before any OS-level scan.",
        },
        {
          id: "rat-return",
          text: "Returning the drive without analysis risks delivering a weaponized device directly to an employee's workstation.",
        },
        {
          id: "rat-discard",
          text: "Discarding the drive destroys potential threat intelligence about an active attack campaign targeting the organization.",
        },
      ],
      correctRationaleId: "rat-forensic",
      feedback: {
        perfect:
          "Correct. USB drop attacks are a well-documented social engineering technique. Securing the drive for forensic analysis in a sandbox environment lets you determine if it's malicious without risking any corporate systems.",
        partial:
          "You took action, but your approach has risks. Even air-gapped analysis can be dangerous with USB-based attacks. Proper forensic sandboxing is the safe approach.",
        wrong:
          "Returning or discarding the drive misses the security implications entirely. Found USB drives should always be treated as potentially hostile and sent to forensics.",
      },
    },
    {
      type: "action-rationale",
      id: "aware-002",
      title: "Employee Reports Shoulder Surfing",
      context:
        "An employee reports that during a meeting in the shared conference room, a visitor from a partner company appeared to be watching them type their password into a laptop. The employee is unsure if the visitor actually saw the full password but feels uncomfortable about it.",
      displayFields: [
        {
          label: "Reporter",
          value: "Lisa Tran — Product Manager",
          emphasis: "normal",
        },
        {
          label: "Concern",
          value: "Visitor may have observed password entry",
          emphasis: "warn",
        },
        {
          label: "Visitor",
          value: "Partner company rep — escorted, signed NDA",
          emphasis: "normal",
        },
        {
          label: "Confidence",
          value: "Employee uncertain if full password was visible",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "CHANGE_PASSWORD_NOTE",
          label: "Have the employee change their password and note the visitor",
          color: "green",
        },
        {
          id: "FULL_INVESTIGATION",
          label: "Launch a full investigation into the visitor",
          color: "red",
        },
        {
          id: "DISMISS",
          label: "Reassure the employee and take no action",
          color: "blue",
        },
        {
          id: "REVOKE_VISITOR",
          label: "Immediately revoke all visitor access to the building",
          color: "orange",
        },
      ],
      correctActionId: "CHANGE_PASSWORD_NOTE",
      rationales: [
        {
          id: "rat-proportional",
          text: "Proportional response — credential change mitigates the risk without overreacting.",
        },
        {
          id: "rat-investigation",
          text: "A full investigation for an uncertain observation is disproportionate and could damage the partner relationship.",
        },
        {
          id: "rat-dismiss",
          text: "Dismissing the report discourages future reporting and leaves a potential credential compromise unaddressed.",
        },
        {
          id: "rat-revoke",
          text: "Revoking all visitor access based on one uncertain report is an overreaction that disrupts business operations.",
        },
      ],
      correctRationaleId: "rat-proportional",
      feedback: {
        perfect:
          "Well handled. A password change eliminates the credential risk, documenting the visitor creates a record if a pattern emerges later, and the proportional response keeps the employee comfortable reporting future concerns.",
        partial:
          "Your intent was right, but the response was either too aggressive or too passive. Proportional response means addressing the risk without creating unnecessary disruption.",
        wrong:
          "Either dismissing the report or launching a disproportionate response undermines security culture. Employees need to see that their reports lead to reasonable action.",
      },
    },
    {
      type: "action-rationale",
      id: "aware-003",
      title: "Phishing Simulation Reporter",
      context:
        "An employee forwarded a suspicious email to the security team's phishing inbox. Upon review, the email is actually the company's own phishing simulation sent by the security awareness team. The employee followed correct procedure by reporting it rather than clicking the link.",
      displayFields: [
        {
          label: "Reporter",
          value: "James Park — Junior Accountant",
          emphasis: "normal",
        },
        {
          label: "Email",
          value: "Phishing simulation — internal security awareness test",
          emphasis: "normal",
        },
        {
          label: "Employee Action",
          value: "Reported to phishing inbox without clicking",
          emphasis: "normal",
        },
        {
          label: "Simulation Status",
          value: "Active campaign — 34% click rate so far",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "THANK_CONFIRM",
          label: "Thank the employee and confirm it was a test",
          color: "green",
        },
        {
          id: "KEEP_SECRET",
          label: "Don't acknowledge — preserve simulation integrity",
          color: "orange",
        },
        {
          id: "SCOLD_PROCEDURE",
          label: "Tell them they wasted security team's time",
          color: "red",
        },
        {
          id: "IGNORE",
          label: "Silently close the ticket with no response",
          color: "yellow",
        },
      ],
      correctActionId: "THANK_CONFIRM",
      rationales: [
        {
          id: "rat-reinforce",
          text: "Positive reinforcement encourages future reporting — never punish or embarrass users who report.",
        },
        {
          id: "rat-secret",
          text: "Ignoring correct behavior teaches employees that reporting has no value, reducing future report rates.",
        },
        {
          id: "rat-scold",
          text: "Scolding an employee for correct behavior is the fastest way to destroy a security-positive culture.",
        },
        {
          id: "rat-no-response",
          text: "No response leaves the employee uncertain and less likely to report real threats in the future.",
        },
      ],
      correctRationaleId: "rat-reinforce",
      feedback: {
        perfect:
          "Perfect response. Thanking the employee reinforces the exact behavior you want — reporting suspicious emails. This employee is now more likely to catch a real phishing attack. The simulation integrity impact is minimal compared to the culture benefit.",
        partial:
          "Your caution about simulation integrity is understandable, but the employee did exactly what they should do. Acknowledging correct behavior is more valuable than preserving one simulation's statistics.",
        wrong:
          "Scolding or ignoring an employee who followed correct procedure is deeply counterproductive. The entire point of phishing simulations is to train employees to report — this employee succeeded.",
      },
    },
  ],

  hints: [
    "Found USB drives should always be treated as hostile until forensic analysis proves otherwise — USB drop attacks are a common social engineering technique.",
    "Proportional response is key — match the severity of your action to the severity of the reported concern without under- or over-reacting.",
    "Security awareness programs succeed when employees feel rewarded for reporting. Never punish someone for following correct procedure.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Security awareness is a critical soft skill. Building a security-positive culture where employees feel comfortable reporting is more effective than any technical control.",
  toolRelevance: [
    "KnowBe4",
    "Proofpoint Security Awareness",
    "SANS Security Awareness",
    "Cofense Reporter",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
