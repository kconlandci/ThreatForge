import type { LabManifest } from "../../types/manifest";

export const credentialStuffingDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "credential-stuffing-detection",
  version: 1,
  title: "Credential Stuffing Attack Detection",

  tier: "beginner",
  track: "blue-team-foundations",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["credential-stuffing", "account-takeover", "authentication", "login-monitoring", "bot-detection"],

  description:
    "Identify credential stuffing attacks from automated login traffic patterns, distinguish them from legitimate failed logins, and determine the appropriate response to protect user accounts.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify credential stuffing patterns from login failure rate and distribution data",
    "Distinguish automated attacks from legitimate user behavior",
    "Select appropriate defensive responses including bot challenges and rate limiting",
  ],
  sortOrder: 570,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "cs-001",
      title: "High-Volume Login Failure Spike",
      context:
        "SIEM alert: Login failures spiked from a normal baseline of 50/hour to 12,000/hour over the past 45 minutes. Failures are distributed across 4,200 distinct usernames. Source: 350 distinct IPs distributed across 22 countries. User-Agent strings show 7 distinct values consistent with browser fingerprint rotation.",
      displayFields: [
        { label: "Login Failures", value: "12,000/hour (baseline: 50/hour)", emphasis: "critical" },
        { label: "Distinct Usernames", value: "4,200 different accounts targeted", emphasis: "critical" },
        { label: "Source IPs", value: "350 IPs across 22 countries", emphasis: "warn" },
        { label: "Success Rate", value: "47 successful logins from attack IPs", emphasis: "critical" },
        { label: "User-Agent", value: "7 rotating values — automated pattern", emphasis: "warn" },
      ],
      actions: [
        {
          id: "BLOCK_NOTIFY_MFA",
          label: "Enable CAPTCHA, force MFA on affected accounts, notify compromised users",
          color: "red",
        },
        {
          id: "BLOCK_IPS",
          label: "Block all 350 source IPs",
          color: "orange",
        },
        {
          id: "RATE_LIMIT",
          label: "Apply rate limiting to the login endpoint",
          color: "yellow",
        },
        {
          id: "MONITOR_24H",
          label: "Monitor for 24 hours to gather more data",
          color: "blue",
        },
      ],
      correctActionId: "BLOCK_NOTIFY_MFA",
      rationales: [
        {
          id: "rat-comprehensive",
          text: "47 successful logins from attack IPs confirm account takeovers are occurring NOW. CAPTCHA stops the bot traffic immediately. The 47 compromised accounts need forced MFA enrollment to prevent attacker re-access even with valid credentials. Notifying the affected users triggers password resets. IP blocking alone doesn't help with a 350-IP distributed attack.",
        },
        {
          id: "rat-ip-block",
          text: "350 distributed IPs across 22 countries — blocking all of them is whack-a-mole. The attacker will rotate to new IPs. Address the authentication layer instead.",
        },
        {
          id: "rat-rate-limit",
          text: "Rate limiting at the login endpoint helps prospectively but doesn't address the 47 accounts already compromised.",
        },
        {
          id: "rat-monitor",
          text: "47 accounts are being compromised right now. Waiting 24 hours for more data allows the attacker to take over hundreds more accounts.",
        },
      ],
      correctRationaleId: "rat-comprehensive",
      feedback: {
        perfect: "Correct. Credential stuffing with 47 active takeovers requires immediate multi-pronged response: CAPTCHA stops the ongoing attack, MFA on compromised accounts prevents attacker re-access, and user notification triggers password resets.",
        partial: "You stopped part of the attack but missed the 47 already-compromised accounts. Rate limiting or IP blocking prospectively without addressing active takeovers leaves those users exposed.",
        wrong: "47 successful logins from attack IPs are confirmed account takeovers. Monitoring while accounts are being compromised is not an acceptable response.",
      },
    },
    {
      type: "action-rationale",
      id: "cs-002",
      title: "Low-and-Slow Distributed Stuffing",
      context:
        "Unusual login patterns detected: each of 800 different IPs has made exactly 3 login attempts over the past 6 hours, all at 2-minute intervals. Total failures: 1,980. Total successes: 43. Rate is low enough to avoid rate limiting thresholds. User-Agents all appear as legitimate mobile browsers.",
      displayFields: [
        { label: "Attack Technique", value: "Low-and-slow: 3 attempts per IP, 2-min intervals", emphasis: "warn" },
        { label: "Source IPs", value: "800 unique IPs (residential proxy network)", emphasis: "warn" },
        { label: "Success Rate", value: "43 successes / 2,023 total attempts (2.1%)", emphasis: "critical" },
        { label: "Detection Method", value: "Velocity correlation across IPs — pattern not per-IP", emphasis: "normal" },
        { label: "Credential Source", value: "Matches format of 2024 breach dump for this service", emphasis: "critical" },
      ],
      actions: [
        {
          id: "DEVICE_FINGERPRINT_NOTIFY",
          label: "Deploy device fingerprinting, challenge new devices, notify 43 users",
          color: "red",
        },
        {
          id: "INCREASE_RATE_LIMIT",
          label: "Lower rate limit threshold to 3 attempts per IP",
          color: "orange",
        },
        {
          id: "GEO_BLOCK",
          label: "Geoblock all IPs outside the primary user base country",
          color: "yellow",
        },
        {
          id: "NO_ACTION",
          label: "No action — rate is normal per-IP",
          color: "blue",
        },
      ],
      correctActionId: "DEVICE_FINGERPRINT_NOTIFY",
      rationales: [
        {
          id: "rat-device-fp",
          text: "Low-and-slow attacks specifically evade per-IP rate limits. Device fingerprinting detects bot behavior at the browser level regardless of IP rotation. Challenging unrecognized devices on login stops the attack even with valid credentials. Notifying the 43 compromised users is non-negotiable — they need to reset passwords and review account activity.",
        },
        {
          id: "rat-rate-limit-useless",
          text: "The attack uses exactly 3 attempts per IP specifically to stay under rate limits. Lowering the threshold to 3 would block every IP after its first 2 failed attempts, creating massive false positives for legitimate users with typo-prone passwords.",
        },
        {
          id: "rat-geoblock",
          text: "Residential proxy networks use IPs in the target country specifically to evade geoblocking. The attack IPs already appear domestic.",
        },
        {
          id: "rat-no-action",
          text: "43 accounts were successfully compromised. The pattern is real — it just bypasses per-IP detection. Aggregate analysis detected it.",
        },
      ],
      correctRationaleId: "rat-device-fp",
      feedback: {
        perfect: "Sharp analysis. Low-and-slow attacks are designed to evade per-IP rate limits. Device fingerprinting works at a different layer — browser/device behavior — making it effective against rotating IP attacks.",
        partial: "You identified the attack but the response doesn't address the right layer. Per-IP controls won't stop distributed stuffing. Device-level controls are needed.",
        wrong: "A 2.1% success rate with 800 IPs all making exactly 3 attempts is clearly coordinated stuffing, not random failed logins. Take action on the 43 compromised accounts.",
      },
    },
    {
      type: "action-rationale",
      id: "cs-003",
      title: "Monday Morning Login Failure Spike — False Positive",
      context:
        "Help desk is flooded with calls. SIEM shows 2,400 failed login attempts in the past hour from 1,900 distinct user IPs — a 48x increase over the Friday baseline. All attempts show as 'wrong password.' The failures started at 8:47 AM Monday.",
      displayFields: [
        { label: "Timing", value: "Monday 8:47 AM — start of business week", emphasis: "normal" },
        { label: "Sources", value: "1,900 distinct user IPs — residential, corporate, mobile", emphasis: "normal" },
        { label: "Failure Type", value: "All 'wrong password' — no username enumeration pattern", emphasis: "normal" },
        { label: "Help Desk", value: "Flooded with calls: 'password expired' and 'SSO not working'", emphasis: "warn" },
        { label: "System Event", value: "Password policy change deployed Friday 5 PM — min length 8→14 chars", emphasis: "critical" },
      ],
      actions: [
        {
          id: "INVESTIGATE_POLICY",
          label: "Correlate with Friday's password policy change, extend grace period",
          color: "green",
        },
        {
          id: "INCIDENT_RESPONSE",
          label: "Declare credential stuffing incident, invoke IR plan",
          color: "red",
        },
        {
          id: "FORCE_RESET_ALL",
          label: "Force password reset for all 1,900 users",
          color: "orange",
        },
        {
          id: "LOCK_ACCOUNTS",
          label: "Lock all accounts with failed logins",
          color: "yellow",
        },
      ],
      correctActionId: "INVESTIGATE_POLICY",
      rationales: [
        {
          id: "rat-policy-correlation",
          text: "The simultaneous spike at start of business week, help desk calls about 'password expired,' and Friday policy change all point to a policy rollout issue — not an attack. Investigating and extending the grace period is proportional. Declaring a credential stuffing incident would waste IR resources and cause major operational disruption for a self-inflicted policy issue.",
        },
        {
          id: "rat-false-alarm",
          text: "1,900 distinct user IPs from residential and corporate networks, all failing on 'wrong password,' with help desk calls about password expiry, is not an attacker pattern — it's users whose cached credentials no longer meet the new policy.",
        },
        {
          id: "rat-force-reset",
          text: "Forcing a password reset when users are already locked out of a policy change compounds the disruption unnecessarily.",
        },
        {
          id: "rat-lock-accounts",
          text: "Locking 1,900 accounts that are failing due to a policy change would cause an organization-wide lockout right at the start of the business week.",
        },
      ],
      correctRationaleId: "rat-policy-correlation",
      feedback: {
        perfect: "Excellent judgment. Context is everything. Monday morning login spike + password policy change = policy issue, not attack. Correlating with operational events before declaring an incident prevents costly false alarms.",
        partial: "You avoided the worst responses, but declaring a full incident for a password policy rollout issue wastes IR resources. Check operational context before escalating.",
        wrong: "Locking 1,900 accounts or forcing resets during a policy rollout issue would cause organization-wide business disruption. Always correlate login failure spikes with system events.",
      },
    },
  ],

  hints: [
    "Credential stuffing uses real credentials from breaches — success rates of 1-3% indicate valid credentials being tested, unlike random brute force which has near-zero success.",
    "Low-and-slow attacks stay under per-IP rate limits by distributing attempts across hundreds of IPs. Device fingerprinting detects bot behavior regardless of IP.",
    "Always correlate login failure spikes with operational events (password policy changes, SSO outages) before declaring an attack.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Credential stuffing causes more account takeovers than brute force combined, because attackers use real credentials from data breaches. Detection requires aggregate analysis across all users, not just per-account thresholds.",
  toolRelevance: [
    "Splunk (login anomaly detection)",
    "Cloudflare Bot Management",
    "Have I Been Pwned (breach monitoring)",
    "Google reCAPTCHA Enterprise",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
