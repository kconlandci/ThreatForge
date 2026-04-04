import type { LabManifest } from "../../types/manifest";

export const physicalSecurityAssessmentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "physical-security-assessment",
  version: 1,
  title: "Physical Security Assessment",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["physical-security", "tailgating", "badge-cloning", "social-engineering", "access-control"],

  description:
    "Make real-time decisions about physical security incidents including tailgating attempts, suspicious badge activity, unauthorized access, and social engineering at physical entry points.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Recognize common physical security attack techniques",
    "Apply appropriate responses to tailgating and unauthorized access",
    "Balance security enforcement with professional courtesy",
  ],
  sortOrder: 420,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "psa-001",
      title: "Delivery Person Tailgating",
      context:
        "You badge into the secure entrance at 8:47 AM. A person in a delivery uniform carrying a large box approaches behind you and says: 'Hey, can you hold the door? I have a package for someone on the third floor. My hands are full.' They have no visitor badge and are not on the expected delivery schedule.",
      displayFields: [
        { label: "Location", value: "Badge-controlled main entrance", emphasis: "normal" },
        { label: "Person", value: "Delivery uniform, large box, no badge visible", emphasis: "warn" },
        { label: "Time", value: "8:47 AM — peak entry time", emphasis: "normal" },
        { label: "Delivery Schedule", value: "No scheduled deliveries until 10:00 AM", emphasis: "warn" },
        { label: "Visitor Badge", value: "None visible", emphasis: "critical" },
      ],
      actions: [
        {
          id: "DIRECT_RECEPTION",
          label: "Politely direct them to the reception desk",
          color: "green",
        },
        {
          id: "HOLD_DOOR",
          label: "Hold the door — they look legitimate",
          color: "blue",
        },
        {
          id: "CONFRONT_DEMAND",
          label: "Demand to see their ID and verify the delivery",
          color: "orange",
        },
        {
          id: "CALL_SECURITY",
          label: "Call security and refuse entry",
          color: "red",
        },
      ],
      correctActionId: "DIRECT_RECEPTION",
      rationales: [
        {
          id: "rat-reception",
          text: "Directing to reception is the correct balance of security and professionalism. Reception can verify the delivery, issue a visitor badge, and provide escorted access. This follows the visitor management policy without creating a confrontation.",
        },
        {
          id: "rat-hold-door",
          text: "Holding the door bypasses all access controls. Delivery uniforms are one of the easiest social engineering props to obtain.",
        },
        {
          id: "rat-confront",
          text: "Confrontationally demanding ID creates an unpleasant interaction and is not your role as an employee. Access verification is reception's and security's responsibility.",
        },
        {
          id: "rat-call-security",
          text: "Calling security immediately is an overreaction for someone who may be a legitimate delivery person. Direct to reception first.",
        },
      ],
      correctRationaleId: "rat-reception",
      feedback: {
        perfect: "Perfect response. Directing to reception follows security protocol while remaining professional. Reception handles verification, badging, and escort — that's their job, not yours.",
        partial: "Your intent is right but the execution could be better. Being too aggressive or too lenient are both problems. Reception is the right intermediary.",
        wrong: "Holding the door for an unbadged person bypasses all physical security controls. Delivery uniforms are trivial social engineering props.",
      },
    },
    {
      type: "action-rationale",
      id: "psa-002",
      title: "Simultaneous Badge Use — Possible Clone",
      context:
        "The access control system generates an alert: Employee badge #4472 (assigned to Sarah Chen, Engineering) was used at Building A main entrance at 10:14:32 AM. At 10:14:47 AM (15 seconds later), the same badge number was used at Building B rear entrance — 200 meters away. Sarah Chen confirmed at her desk in Building B by her manager.",
      displayFields: [
        { label: "Badge ID", value: "#4472 — Sarah Chen, Engineering", emphasis: "normal" },
        { label: "Building A Swipe", value: "10:14:32 AM — Main entrance", emphasis: "critical" },
        { label: "Building B Swipe", value: "10:14:47 AM — Rear entrance (15 sec later)", emphasis: "critical" },
        { label: "Distance", value: "Buildings are 200m apart (impossible in 15 sec)", emphasis: "critical" },
        { label: "Sarah's Location", value: "Confirmed at desk in Building B", emphasis: "normal" },
      ],
      actions: [
        {
          id: "DISABLE_REPLACE",
          label: "Disable badge, issue replacement, review Building A footage",
          color: "red",
        },
        {
          id: "CHECK_GLITCH",
          label: "Check for system glitch — likely a reader malfunction",
          color: "blue",
        },
        {
          id: "ASK_SARAH",
          label: "Ask Sarah if she lent her badge to someone",
          color: "orange",
        },
        {
          id: "MONITOR_BADGE",
          label: "Monitor the badge for more anomalies",
          color: "yellow",
        },
      ],
      correctActionId: "DISABLE_REPLACE",
      rationales: [
        {
          id: "rat-clone",
          text: "Simultaneous use of the same badge in two locations 200 meters apart is physically impossible and proves badge cloning. Disabling the badge immediately prevents further unauthorized access. Issuing a replacement maintains Sarah's legitimate access. Reviewing Building A footage identifies the person using the cloned badge.",
        },
        {
          id: "rat-glitch",
          text: "Two different card readers in different buildings both generating valid swipe events 15 seconds apart is not a system glitch — it's two physical cards.",
        },
        {
          id: "rat-ask-sarah",
          text: "Sarah is at her desk — she didn't lend her badge. The Building A swipe is clearly from a clone. Asking Sarah delays the response.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring means the cloned badge continues to grant unauthorized access while you wait. The evidence is already conclusive.",
        },
      ],
      correctRationaleId: "rat-clone",
      feedback: {
        perfect: "Decisive response. Simultaneous badge use in two locations proves cloning beyond any doubt. Immediate badge disable + replacement + camera review is the complete response.",
        partial: "You're partially right but the evidence is conclusive — this doesn't need monitoring or investigation. Two swipes, 200m apart, 15 seconds — that's a cloned badge.",
        wrong: "This is not a system glitch. Two valid swipes from physically impossible locations means a cloned badge. Every minute of delay is a minute of unauthorized access.",
      },
    },
    {
      type: "action-rationale",
      id: "psa-003",
      title: "After-Hours Server Room Access",
      context:
        "Access control logs show junior developer Alex Park (badge #2891) entered the server room at 2:17 AM on Saturday. Alex's role is frontend development — no server infrastructure responsibilities. No maintenance tickets are open for the weekend. The server room requires badge + PIN, and Alex's access was granted during onboarding but never reviewed.",
      displayFields: [
        { label: "Employee", value: "Alex Park — Junior Frontend Developer", emphasis: "normal" },
        { label: "Access Time", value: "Saturday 2:17 AM", emphasis: "warn" },
        { label: "Location", value: "Server Room B — Production infrastructure", emphasis: "warn" },
        { label: "Access Level", value: "Badge + PIN (granted at onboarding, never audited)", emphasis: "warn" },
        { label: "Open Tickets", value: "None for weekend maintenance", emphasis: "normal" },
      ],
      actions: [
        {
          id: "CONTACT_REVIEW",
          label: "Contact Alex, review camera footage, and audit access rights",
          color: "orange",
        },
        {
          id: "REVOKE_ESCALATE",
          label: "Immediately revoke access and escalate to manager",
          color: "red",
        },
        {
          id: "LOG_IGNORE",
          label: "Log it — developers sometimes work weekends",
          color: "blue",
        },
        {
          id: "WAIT_MONDAY",
          label: "Wait until Monday to ask Alex in person",
          color: "yellow",
        },
      ],
      correctActionId: "CONTACT_REVIEW",
      rationales: [
        {
          id: "rat-investigate-first",
          text: "The access is unusual but may have an explanation — perhaps Alex was asked by a senior engineer to check something, or is working on a deployment. Contacting Alex provides immediate context, camera footage verifies the activity, and auditing the access rights addresses the root cause (over-provisioned access from onboarding).",
        },
        {
          id: "rat-revoke-premature",
          text: "Immediately revoking access and escalating assumes malicious intent. The access may have a legitimate explanation. Investigate first, then act based on findings.",
        },
        {
          id: "rat-ignore",
          text: "A frontend developer in the server room at 2 AM on Saturday with no maintenance ticket warrants at minimum a phone call. Logging without inquiry is insufficient.",
        },
        {
          id: "rat-wait",
          text: "Waiting until Monday means 48+ hours of potential exposure if the access was unauthorized. The situation warrants prompt (but not aggressive) investigation.",
        },
      ],
      correctRationaleId: "rat-investigate-first",
      feedback: {
        perfect: "Well balanced. Unusual access warrants investigation but not assumption of malice. Contacting Alex, reviewing footage, and auditing access rights addresses both the immediate situation and the underlying over-provisioning issue.",
        partial: "Your response is either too aggressive or too passive. Unusual access needs prompt investigation — but investigate before jumping to disciplinary action.",
        wrong: "Ignoring or delaying investigation of unexplained after-hours server room access is a security gap. But revoking access without understanding the context creates unnecessary friction.",
      },
    },
  ],

  hints: [
    "Tailgating prevention is everyone's responsibility — but directing to reception is more appropriate than personal confrontation.",
    "Simultaneous badge use in different locations is definitive proof of badge cloning. No investigation needed — act immediately.",
    "Unusual physical access warrants prompt investigation but not automatic assumption of malicious intent. Context matters.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Physical security is often overlooked in cybersecurity training, but the most sophisticated digital defenses can be completely bypassed through physical access. Many compliance frameworks require physical security assessments.",
  toolRelevance: [
    "HID Access Control Systems",
    "Verkada Camera Systems",
    "Lenel OnGuard",
    "Security Operations Center (SOC)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
