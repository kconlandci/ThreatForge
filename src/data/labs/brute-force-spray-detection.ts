import type { LabManifest } from "../../types/manifest";

export const bruteForceSprayDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "brute-force-spray-detection",
  version: 1,
  title: "Brute Force & Spray Detection",

  tier: "intermediate",
  track: "detection-hunting",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: ["brute-force", "password-spray", "impossible-travel", "detection-engineering", "triage"],

  description:
    "Classify authentication attack patterns from SIEM log evidence, select the correct remediation, and justify your analysis with the right rationale.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Distinguish brute force, password spray, and impossible travel patterns",
    "Select proportional remediation based on attack type",
    "Justify classification using IP-to-user relationship analysis",
  ],
  sortOrder: 140,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "bfsd-001",
      title: "Single IP, Single User — High Volume",
      description:
        "SOC Tier 1 alerted on high volume of failed logins targeting a single user from one internal IP address.",
      evidence: [
        { type: "SIEM Log", content: "10:01:02 | j_smith | 192.168.1.45 | FAILURE | Event 4625\n10:01:05 | j_smith | 192.168.1.45 | FAILURE | Event 4625\n10:01:08 | j_smith | 192.168.1.45 | FAILURE | Event 4625\n10:01:12 | j_smith | 192.168.1.45 | FAILURE | Event 4625\n10:01:15 | j_smith | 192.168.1.45 | SUCCESS | Event 4624" },
        { type: "Pattern", content: "1 Source IP → 1 Target User → 5 attempts in 13 seconds → SUCCESS" },
      ],
      classifications: [
        { id: "c-brute", label: "Brute Force", description: "Single IP hammering a single account with many password attempts." },
        { id: "c-spray", label: "Password Spray", description: "Single IP trying one password against many different users." },
        { id: "c-travel", label: "Impossible Travel", description: "Same account logging in from distant locations simultaneously." },
      ],
      correctClassificationId: "c-brute",
      remediations: [
        { id: "r-isolate", label: "Isolate Source IP", description: "Block the attacking IP at the firewall to stop the attack." },
        { id: "r-block-cidr", label: "Block External CIDR", description: "Block the entire external IP range at the perimeter." },
        { id: "r-reset", label: "Force Password Reset", description: "Expire the compromised user's password immediately." },
      ],
      correctRemediationId: "r-isolate",
      rationales: [
        { id: "rat-1", text: "Single source IP targeting one user with rapid attempts is targeted brute force. Isolating the IP stops the attack." },
        { id: "rat-2", text: "Multiple IPs targeting one user indicates a botnet-assisted attack." },
        { id: "rat-3", text: "Single IP targeting many users indicates password spraying." },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect: "Correct. A single IP hammering a single account is classic brute force. The success at the end makes IP isolation critical.",
        partial: "Partially correct. Watch the 1:1 relationship between IP and username — that's the brute force signature.",
        wrong: "Incorrect. This is a targeted brute force attack from a single internal source against one user.",
      },
    },
    {
      type: "triage-remediate",
      id: "bfsd-002",
      title: "Single IP, Many Users — Sales Department",
      description:
        "Unusual activity detected across the entire Sales department. All failures originate from a single external IP.",
      evidence: [
        { type: "SIEM Log", content: "11:20:01 | a_doe    | 45.12.33.1 | FAILURE | Event 4625\n11:20:05 | b_wayne  | 45.12.33.1 | FAILURE | Event 4625\n11:20:10 | c_kent   | 45.12.33.1 | FAILURE | Event 4625\n11:20:15 | d_prince | 45.12.33.1 | FAILURE | Event 4625\n11:20:20 | e_stone  | 45.12.33.1 | FAILURE | Event 4625" },
        { type: "Pattern", content: "1 Source IP → 5 Different Users → 1 attempt each → All FAILURE" },
      ],
      classifications: [
        { id: "c-brute", label: "Brute Force", description: "Single IP hammering a single account with many passwords." },
        { id: "c-spray", label: "Password Spray", description: "Single IP trying one password against many different users." },
        { id: "c-travel", label: "Impossible Travel", description: "Same account logging in from distant locations." },
      ],
      correctClassificationId: "c-spray",
      remediations: [
        { id: "r-isolate", label: "Isolate Source IP", description: "Block the single attacking IP at the firewall." },
        { id: "r-block-cidr", label: "Block External CIDR", description: "Block the external IP range at the perimeter to stop the spray." },
        { id: "r-reset", label: "Force Password Reset", description: "Expire passwords for all targeted users." },
      ],
      correctRemediationId: "r-block-cidr",
      rationales: [
        { id: "rat-1", text: "Single user login failure is likely a forgotten password." },
        { id: "rat-2", text: "Internal IP scanning for ports is a worm characteristic." },
        { id: "rat-3", text: "One source IP targeting many users with one attempt each is password spraying. Block the CIDR to prevent rotation." },
      ],
      correctRationaleId: "rat-3",
      feedback: {
        perfect: "Spot on. Password spraying targets many users to avoid account lockout thresholds. Blocking the CIDR prevents the attacker from rotating IPs.",
        partial: "Partial credit. The 1:Many IP-to-User ratio is the hallmark of a spray attack.",
        wrong: "Incorrect. This is a password spray targeting the entire Sales department from an external IP.",
      },
    },
    {
      type: "triage-remediate",
      id: "bfsd-003",
      title: "Service Account — Two Regions in 8 Minutes",
      description:
        "Service account 'admin_srv' shows successful logons from New York and Moscow within an 8-minute window.",
      evidence: [
        { type: "SIEM Log", content: "09:00:00 | admin_srv | 20.1.1.5   | SUCCESS | New York\n09:08:00 | admin_srv | 185.2.2.1  | SUCCESS | Moscow" },
        { type: "Pattern", content: "1 User → 2 Locations → 8 minutes apart → Both SUCCESS" },
        { type: "GeoIP", content: "New York to Moscow: ~7,500 km. Minimum travel time: ~10 hours." },
      ],
      classifications: [
        { id: "c-brute", label: "Brute Force", description: "Rapid password guessing against one account." },
        { id: "c-spray", label: "Password Spray", description: "Trying common passwords across many accounts." },
        { id: "c-travel", label: "Impossible Travel", description: "Same account authenticating from geographically impossible locations." },
      ],
      correctClassificationId: "c-travel",
      remediations: [
        { id: "r-isolate", label: "Isolate Source IP", description: "Block the Moscow IP at the perimeter." },
        { id: "r-block-cidr", label: "Block External CIDR", description: "Block the entire external range." },
        { id: "r-reset", label: "Force Password Reset", description: "Expire the compromised service account credentials immediately." },
      ],
      correctRemediationId: "r-reset",
      rationales: [
        { id: "rat-1", text: "Impossible geographic distance traveled in 8 minutes confirms credential compromise. Reset credentials to invalidate all sessions." },
        { id: "rat-2", text: "Authorized VPN usage from offshore contractors explains the dual logins." },
        { id: "rat-3", text: "Standard load balancer IP rotation across regions." },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect: "Excellent. 7,500 km in 8 minutes is physically impossible. This confirms credential compromise — password reset invalidates the stolen credentials.",
        partial: "Mostly correct. While it could theoretically be a VPN, the security-first posture treats impossible travel as account takeover.",
        wrong: "Incorrect. Two successful logins from distant countries in 8 minutes is a critical indicator of compromise.",
      },
    },
  ],

  hints: [
    "Look at the User column. Is it the same person every time, or different people?",
    "Check the Source IP. Is the attack coming from one place or many?",
    "Compare geographic distance against the time between logins. Can a human travel that fast?",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Detection engineering is a game of ratios. Always look at the relationship between Source IPs and User Accounts. A 1:1 ratio is brute force; a 1:Many ratio is password spray. High-fidelity alerts are built on these logical patterns.",
  toolRelevance: [
    "Splunk (SPL queries for auth log analysis)",
    "Microsoft Sentinel (KQL detection rules)",
    "Elastic SIEM (detection rules)",
    "MITRE ATT&CK — Credential Access (TA0006)",
  ],

  createdAt: "2026-03-22",
  updatedAt: "2026-03-22",
};
