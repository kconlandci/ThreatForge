import type { LabManifest } from "../../types/manifest";

export const deepfakeVoicePhishingLab: LabManifest = {
  schemaVersion: "1.1",
  id: "deepfake-voice-phishing",
  version: 1,
  title: "Deepfake Voice Phishing Detection",

  tier: "intermediate",
  track: "incident-response",
  difficulty: "moderate",
  accessLevel: "free",
  tags: [
    "deepfake",
    "vishing",
    "voice-cloning",
    "social-engineering",
    "wire-fraud",
    "incident-response",
  ],

  description:
    "Detect and respond to AI-generated voice calls that impersonate executives to authorize wire transfers, credential resets, or sensitive data access. Classify each incident and select the appropriate remediation.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify behavioral and technical indicators of AI-generated voice calls",
    "Classify deepfake voice incidents by severity and attack objective",
    "Select appropriate remediation actions for confirmed and suspected voice impersonation",
    "Distinguish genuine executive calls from AI-generated impersonation attempts",
  ],
  sortOrder: 420,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "dfv-001",
      title: "CFO Voice Clone Requesting Urgent Wire Transfer",
      description:
        "The accounts payable team received a phone call from someone who sounds exactly like the CFO, requesting an urgent $240,000 wire transfer to a new vendor account. The caller referenced a real board meeting from yesterday and used the CFO's known speech patterns. The CFO is currently in a 3-hour board meeting and unreachable.",
      evidence: [
        {
          type: "Call Recording",
          content:
            "Voice analysis shows 94% similarity to CFO's known voice profile. However, spectral analysis reveals subtle artifacts at 8-12kHz consistent with neural voice synthesis — specifically, micro-gaps in breathing patterns that are absent in natural speech.",
        },
        {
          type: "Call Metadata",
          content:
            "Caller ID shows the CFO's direct line (+1-555-0173), but the SIP headers reveal the call originated from a VoIP provider in Eastern Europe (Kyiv, UA). The CFO's phone is GPS-located at corporate HQ in the boardroom.",
        },
        {
          type: "Request Details",
          content:
            "Wire transfer of $240,000 to First National Bank, routing #071000013, account #4488-2291-0067. Account holder listed as 'Apex Consulting Partners LLC' — this entity does not exist in the company's approved vendor database.",
        },
        {
          type: "Behavioral Pattern",
          content:
            "The caller became evasive when asked for the internal purchase order number, saying 'Just use my verbal authorization — I'll send the PO when I'm out of this meeting.' The real CFO has never bypassed the PO requirement in 4 years.",
        },
      ],
      classifications: [
        {
          id: "class-confirmed-deepfake",
          label: "Confirmed Deepfake — AI Voice Impersonation",
          description:
            "Voice synthesis artifacts, spoofed caller ID, and behavioral anomalies confirm this is an AI-generated impersonation attack targeting financial controls.",
        },
        {
          id: "class-suspicious-se",
          label: "Suspicious Social Engineering — Human Impersonator",
          description:
            "A skilled human impersonator mimicking the CFO's voice using publicly available recordings and insider knowledge.",
        },
        {
          id: "class-legitimate-urgent",
          label: "Legitimate Urgent Request",
          description:
            "The CFO is making an unusual but genuine urgent request that bypasses normal procedures due to time pressure.",
        },
        {
          id: "class-internal-test",
          label: "Internal Security Test",
          description:
            "This may be an authorized social engineering test conducted by the security team to evaluate financial controls.",
        },
      ],
      correctClassificationId: "class-confirmed-deepfake",
      remediations: [
        {
          id: "rem-full-incident",
          label: "Invoke Wire Fraud Incident Response",
          description:
            "Immediately block the wire transfer if initiated, notify the CFO through a verified secondary channel, preserve all call recordings and metadata for forensics, alert the FBI IC3 for wire fraud, and implement enhanced verification for all executive financial requests.",
        },
        {
          id: "rem-verify-cfo",
          label: "Attempt to Verify with CFO Before Acting",
          description:
            "Try to reach the CFO through their known mobile number or by sending a message to the boardroom to confirm or deny the request before taking further action.",
        },
        {
          id: "rem-process-transfer",
          label: "Process Transfer with Documentation",
          description:
            "Complete the wire transfer as requested but document the verbal authorization and follow up with the CFO for a purchase order after their meeting.",
        },
        {
          id: "rem-block-number",
          label: "Block the Caller ID and Close",
          description:
            "Block the spoofed phone number and close the incident since the transfer was not completed.",
        },
      ],
      correctRemediationId: "rem-full-incident",
      rationales: [
        {
          id: "rat-full-response",
          text: "The convergence of voice synthesis artifacts, caller ID spoofing from a foreign VoIP provider, an unknown vendor account, and behavioral deviation from the CFO's established patterns confirms an active wire fraud attempt using deepfake technology. Full incident response is required to preserve evidence, prevent the transfer, and enable law enforcement action.",
        },
        {
          id: "rat-verify-first",
          text: "While verifying with the CFO is a reasonable step, it delays the critical action of blocking the wire transfer. If the transfer has already been initiated, verification alone does not stop the financial loss.",
        },
        {
          id: "rat-process",
          text: "Processing the transfer on verbal authorization alone, especially when the caller cannot provide a PO number and the vendor is unknown, would directly result in a $240,000 loss with no recovery path.",
        },
      ],
      correctRationaleId: "rat-full-response",
      feedback: {
        perfect:
          "Excellent triage. The spectral analysis artifacts, foreign VoIP origin despite local caller ID, unknown vendor, and behavioral anomalies leave no doubt this is a deepfake wire fraud attempt. Full incident response preserves evidence for law enforcement while preventing financial loss.",
        partial:
          "You identified the threat but chose an incomplete response. Verifying with the CFO is good practice but insufficient alone — the wire transfer must be blocked immediately while evidence is preserved for law enforcement.",
        wrong:
          "This call exhibits every indicator of a deepfake wire fraud attack. Processing the transfer or simply blocking the number without a full investigation would result in either financial loss or failure to capture evidence of a sophisticated threat actor.",
      },
    },
    {
      type: "triage-remediate",
      id: "dfv-002",
      title: "AI-Assisted Help Desk Social Engineering",
      description:
        "The IT help desk received a call from someone claiming to be a remote employee who needs an emergency password reset for their VPN account. The caller's voice matches the employee's profile, they know the employee's manager's name, and they correctly state their employee ID. However, the real employee's badge logged them into the office building 20 minutes ago.",
      evidence: [
        {
          type: "Voice Analysis",
          content:
            "Voice comparison with the employee's recorded voicemail greeting shows 87% similarity. The voice has a slightly flatter affect than the real employee's typical speech pattern, and response latency averages 1.2 seconds — longer than natural conversation but consistent with real-time voice synthesis processing.",
        },
        {
          type: "Identity Verification",
          content:
            "Caller correctly provided: full name (Marcus Webb), employee ID (EMP-31204), manager name (Sarah Chen), and department (Product Engineering). All verifiable from LinkedIn and the company's public org chart page.",
        },
        {
          type: "Physical Access Logs",
          content:
            "Marcus Webb's badge was used to enter Building A at 8:42 AM today — 20 minutes before this call. The caller claims to be working from home in Portland and says their badge must have been stolen. Building A security cameras show Marcus at his desk currently.",
          icon: "alert",
        },
        {
          type: "Account Status",
          content:
            "Marcus Webb's VPN account is active with no failed login attempts. His last VPN session was from his registered home IP in Portland 3 days ago. There is no open help desk ticket for password issues.",
        },
      ],
      classifications: [
        {
          id: "class-ai-se",
          label: "AI-Assisted Social Engineering",
          description:
            "An attacker using AI voice synthesis and publicly available employee data to impersonate a real employee for unauthorized credential access.",
        },
        {
          id: "class-confused-employee",
          label: "Confused Employee — Identity Mix-Up",
          description:
            "The real employee may be confused about which account they need reset, or there may be a duplicate badge situation.",
        },
        {
          id: "class-insider-threat",
          label: "Insider Threat — Credential Sharing Attempt",
          description:
            "An insider may be attempting to gain access to Marcus's account for unauthorized purposes.",
        },
        {
          id: "class-legitimate-request",
          label: "Legitimate Password Reset Request",
          description:
            "The employee genuinely needs a password reset and the badge discrepancy is a coincidence.",
        },
      ],
      correctClassificationId: "class-ai-se",
      remediations: [
        {
          id: "rem-deny-investigate",
          label: "Deny Reset and Launch Investigation",
          description:
            "Deny the password reset request, alert the security team, verify the real employee's status in person at their desk, preserve the call recording for voice forensics, and flag Marcus Webb's account for enhanced monitoring.",
        },
        {
          id: "rem-reset-proceed",
          label: "Complete the Password Reset",
          description:
            "Process the reset as requested since the caller provided correct identity verification information.",
        },
        {
          id: "rem-callback",
          label: "Callback Verification Only",
          description:
            "Hang up and call Marcus Webb's phone number on file to verify the request before proceeding.",
        },
        {
          id: "rem-escalate-manager",
          label: "Escalate to Manager for Approval",
          description:
            "Contact Sarah Chen to authorize the password reset on Marcus's behalf.",
        },
      ],
      correctRemediationId: "rem-deny-investigate",
      rationales: [
        {
          id: "rat-deny-investigate",
          text: "The physical access logs definitively prove the caller is not Marcus Webb — Marcus is at his desk in Building A while the caller claims to be remote. Combined with the voice synthesis indicators and the fact that all identity data was publicly obtainable, this is a clear impersonation attempt requiring immediate denial and investigation.",
        },
        {
          id: "rat-callback",
          text: "A callback to Marcus's phone is a good secondary verification step, but the physical evidence already conclusively disproves the caller's identity. Denying the reset should not wait for a callback.",
        },
        {
          id: "rat-reset-bad",
          text: "Completing the reset despite contradictory physical access evidence would grant an attacker VPN access to the corporate network using a legitimate employee's credentials.",
        },
      ],
      correctRationaleId: "rat-deny-investigate",
      feedback: {
        perfect:
          "Sharp analysis. The physical access logs are the smoking gun — Marcus is confirmed at his desk while the caller claims to be remote. Combined with voice synthesis indicators and publicly available identity data, this is clearly an AI-assisted impersonation. Denying the reset and launching an investigation is the only safe response.",
        partial:
          "You recognized something was wrong but your response leaves gaps. A callback is good practice, but the physical access evidence already proves the caller is an impersonator. Immediate denial plus investigation is the stronger response.",
        wrong:
          "The physical access logs prove the caller cannot be Marcus Webb. Processing a password reset or merely escalating to a manager fails to address an active impersonation attempt targeting your VPN infrastructure.",
      },
    },
    {
      type: "triage-remediate",
      id: "dfv-003",
      title: "Legitimate Executive Call Flagged as Suspicious",
      description:
        "The security team received an alert that a call to the finance department from the CEO was flagged by the new AI voice detection system as a potential deepfake. The CEO is calling from an airport lounge during a layover, requesting that Q4 bonus amounts be sent to her for review before the board call in 2 hours.",
      evidence: [
        {
          type: "AI Detection Alert",
          content:
            "The automated voice analysis system flagged the call with a 62% deepfake probability score. Note: the system's documentation states that scores below 75% are considered inconclusive, and airport/lounge background noise is a known source of false positives due to audio compression artifacts.",
        },
        {
          type: "Call Context",
          content:
            "CEO Sarah Park is confirmed to be traveling today — her executive assistant booked the flight (AA 1847, SFO to JFK) and the layover in Denver matches her itinerary. She is calling from her registered mobile number (+1-555-0188). The caller ID is not spoofed — carrier verification confirms the originating device.",
        },
        {
          type: "Request Analysis",
          content:
            "The CEO is requesting Q4 bonus review data be sent to her corporate email (s.park@company.com) — not to a personal or external address. The board meeting agenda publicly lists 'Compensation Review' as item 4. The request follows normal business workflow.",
        },
        {
          type: "Behavioral Indicators",
          content:
            "The CEO used her standard greeting, referenced her assistant by first name (Lisa), mentioned a specific prior conversation about the bonus structure with the VP of HR from last Tuesday, and offered to have Lisa confirm via Slack if needed. No urgency pressure or attempt to bypass procedures.",
        },
      ],
      classifications: [
        {
          id: "class-false-positive",
          label: "False Positive — Legitimate Executive Call",
          description:
            "The AI detection system generated a false positive due to audio quality degradation from the airport environment. All contextual and behavioral indicators confirm this is the real CEO.",
        },
        {
          id: "class-possible-deepfake",
          label: "Possible Deepfake — Requires Full Verification",
          description:
            "The AI detection flag, even at 62%, warrants treating this as a potential deepfake until fully verified through multiple independent channels.",
        },
        {
          id: "class-confirmed-deepfake",
          label: "Confirmed Deepfake — Block All Requests",
          description:
            "The AI system flagged the call as suspicious and all executive requests should be blocked until in-person verification is possible.",
        },
        {
          id: "class-insider-assist",
          label: "Insider-Assisted Deepfake",
          description:
            "An insider may have provided the attacker with the CEO's itinerary and personal details to make the deepfake more convincing.",
        },
      ],
      correctClassificationId: "class-false-positive",
      remediations: [
        {
          id: "rem-verify-fulfill",
          label: "Quick Verification Then Fulfill Request",
          description:
            "Have Lisa confirm via Slack that the CEO is calling from the airport, then send the bonus data to the CEO's corporate email as requested. Document the AI detection alert as a false positive to improve the system's accuracy.",
        },
        {
          id: "rem-block-until-office",
          label: "Block Request Until CEO Returns to Office",
          description:
            "Refuse all requests until the CEO can be verified in person at headquarters next week, regardless of the board meeting timeline.",
        },
        {
          id: "rem-full-lockdown",
          label: "Full Incident Response Lockdown",
          description:
            "Treat this as a confirmed deepfake attack, invoke the incident response plan, and freeze all executive-initiated financial and data requests.",
        },
        {
          id: "rem-send-immediately",
          label: "Send Data Immediately Without Verification",
          description:
            "The contextual evidence is strong enough to fulfill the request without any additional verification steps.",
        },
      ],
      correctRemediationId: "rem-verify-fulfill",
      rationales: [
        {
          id: "rat-verify-fulfill",
          text: "Every contextual indicator confirms legitimacy: verified mobile number, matching travel itinerary, corporate email destination, board agenda alignment, and natural behavioral patterns with no pressure tactics. A quick Slack confirmation with Lisa addresses the AI detection flag without disrupting a time-sensitive board preparation, and documenting the false positive improves the detection system.",
        },
        {
          id: "rat-block-overreaction",
          text: "Blocking the request until the CEO returns to the office is a disproportionate response to an inconclusive AI score below the system's own threshold, and would directly impact board meeting preparation.",
        },
        {
          id: "rat-lockdown-damage",
          text: "Invoking full incident response based on a 62% score — below the system's 75% confidence threshold — for a call that passes every other legitimacy test would waste resources, damage trust with the executive team, and create a boy-who-cried-wolf dynamic.",
        },
      ],
      correctRationaleId: "rat-verify-fulfill",
      feedback: {
        perfect:
          "Excellent judgment. You correctly recognized that the AI detection score was inconclusive (below the 75% threshold), identified the airport noise as a known false positive trigger, and validated legitimacy through multiple contextual signals. Quick Slack verification satisfies due diligence without disrupting operations.",
        partial:
          "Your caution is understandable given the AI alert, but the response is disproportionate to the evidence. An inconclusive score below the system's own threshold, combined with every other indicator confirming legitimacy, calls for quick verification — not a lockdown.",
        wrong:
          "Overreacting to an inconclusive AI detection score while ignoring overwhelming contextual evidence of legitimacy wastes resources and damages the security team's credibility. Conversely, skipping all verification ignores the detection alert entirely. Balance is key.",
      },
    },
  ],

  hints: [
    "AI voice synthesis often produces subtle artifacts in spectral analysis — look for unnatural breathing patterns, consistent response latency, and flat affect compared to baseline recordings.",
    "Physical access logs and carrier-verified caller ID are hard evidence that cannot be spoofed as easily as voice — use them as ground truth when voice analysis is inconclusive.",
    "AI detection systems have confidence thresholds for a reason — an inconclusive score below threshold combined with strong contextual legitimacy indicators suggests a false positive, not a confirmed attack.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Deepfake voice attacks are among the fastest-growing threats in cybersecurity, with losses exceeding $25 million in single incidents. Incident responders who can triage AI-generated voice attacks — distinguishing real threats from false positives without paralyzing business operations — are in exceptionally high demand.",
  toolRelevance: [
    "Pindrop (Voice fraud detection)",
    "Nuance Gatekeeper (Voice biometrics)",
    "Microsoft Teams Voice Security",
    "FBI IC3 (Wire fraud reporting)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
