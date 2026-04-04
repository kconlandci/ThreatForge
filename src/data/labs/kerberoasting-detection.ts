import type { LabManifest } from "../../types/manifest";

export const kerberoastingDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "kerberoasting-detection",
  version: 1,
  title: "Kerberoasting Attack Detection",

  tier: "advanced",
  track: "identity-access",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["active-directory", "kerberoasting", "kerberos", "service-accounts", "credential-theft"],

  description:
    "Investigate suspicious Kerberos ticket requests to identify Kerberoasting attacks targeting Active Directory service account credentials.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify anomalous TGS-REQ patterns indicative of Kerberoasting",
    "Analyze service account configurations for Kerberoasting vulnerability",
    "Distinguish legitimate service ticket requests from attack patterns",
  ],
  sortOrder: 370,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "kerb-001",
      title: "Mass TGS Requests from Single Workstation",
      objective:
        "A SIEM correlation rule triggered on unusual Kerberos traffic. Investigate the anomalous TGS requests.",
      investigationData: [
        {
          id: "event-logs",
          label: "Windows Event Log — Event ID 4769",
          content:
            "47 TGS-REQ events from workstation WS-ACCT-03 (10.0.2.47) within 3 minutes. Each request targets a different SPN (service principal name). Normal baseline for this host is 2-3 TGS requests per hour.",
          isCritical: true,
        },
        {
          id: "encryption-type",
          label: "Encryption Type Analysis",
          content:
            "All 47 requests specify RC4_HMAC_MD5 (etype 23) encryption. Corporate policy enforces AES256 for all service accounts. RC4 downgrade is a known Kerberoasting indicator — attackers request RC4 because it's faster to crack offline.",
          isCritical: true,
        },
        {
          id: "user-context",
          label: "Requesting User Profile",
          content:
            'User: jthompson (Accounts Payable clerk). No administrative privileges. No legitimate reason to request tickets for SQL, Exchange, or IIS service accounts. Workstation has PowerShell execution logged at 14:32 UTC — same timeframe.',
        },
        {
          id: "spn-targets",
          label: "Targeted Service Principal Names",
          content:
            "SPNs include: MSSQLSvc/sql-prod-01, HTTP/exchange-01, HTTP/intranet-01, MSSQLSvc/sql-hr-02, and 43 others. These are high-value service accounts with domain admin-equivalent privileges.",
        },
      ],
      actions: [
        {
          id: "ISOLATE_RESET",
          label: "Isolate workstation and reset all targeted service account passwords",
          color: "red",
        },
        {
          id: "MONITOR_24H",
          label: "Monitor for 24 hours before acting",
          color: "yellow",
        },
        {
          id: "RESET_USER",
          label: "Reset jthompson's password only",
          color: "orange",
        },
        {
          id: "CLOSE_BENIGN",
          label: "Close — Kerberos traffic is normal",
          color: "blue",
        },
      ],
      correctActionId: "ISOLATE_RESET",
      rationales: [
        {
          id: "rat-kerberoast",
          text: "The volume (47 in 3 minutes), RC4 downgrade, non-admin user targeting high-value SPNs, and concurrent PowerShell execution are textbook Kerberoasting. Isolating the workstation stops further extraction, and resetting service account passwords invalidates any captured ticket hashes before they can be cracked.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring gives the attacker time to crack the extracted RC4 hashes offline. Kerberoasting is passive after extraction — the damage is already done.",
        },
        {
          id: "rat-user-only",
          text: "Resetting only the user password doesn't invalidate the already-extracted service ticket hashes. The attacker can crack them offline indefinitely.",
        },
        {
          id: "rat-benign",
          text: "47 RC4 TGS requests from a non-admin user in 3 minutes is not normal Kerberos traffic by any metric.",
        },
      ],
      correctRationaleId: "rat-kerberoast",
      feedback: {
        perfect:
          "Excellent. You identified all four Kerberoasting indicators: volume anomaly, RC4 downgrade, non-admin user targeting SPNs, and PowerShell usage. Isolating and resetting service account passwords is critical because the attack is passive after extraction.",
        partial:
          "You caught the anomaly but your response is incomplete. Resetting only the user password doesn't help — the extracted service ticket hashes can be cracked offline. All targeted service accounts must be reset.",
        wrong:
          "This is a clear Kerberoasting attack. 47 RC4 TGS requests from a non-admin user is not normal. Ignoring or delaying response gives the attacker time to crack high-value service account passwords.",
      },
    },
    {
      type: "investigate-decide",
      id: "kerb-002",
      title: "IT Admin Running Service Account Audit",
      objective:
        "Similar TGS request pattern detected from an IT workstation. Determine if this is an attack or legitimate activity.",
      investigationData: [
        {
          id: "event-logs",
          label: "Windows Event Log — Event ID 4769",
          content:
            "12 TGS-REQ events from workstation IT-ADMIN-02 (10.0.1.15) within 5 minutes during business hours (10:47 AM). Requests target service accounts in the IT-managed SPN list.",
        },
        {
          id: "encryption-type",
          label: "Encryption Type Analysis",
          content:
            "All requests use AES256_CTS_HMAC_SHA1 (etype 18) — the corporate standard. No RC4 downgrade detected.",
        },
        {
          id: "user-context",
          label: "Requesting User Profile",
          content:
            'User: kadmin (IT Infrastructure team lead). Member of "Service Account Admins" group. Has an approved change ticket CHG-2026-0412: "Quarterly service account audit — verify SPN health and encryption types."',
        },
        {
          id: "change-ticket",
          label: "Change Management Record",
          content:
            "CHG-2026-0412: Approved by CISO on 2026-03-25. Scope: Enumerate and validate all service account SPNs. Scheduled: 2026-03-27 10:00-12:00. Tools approved: PowerShell Get-ADServiceAccount.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "VERIFY_DOCUMENT",
          label: "Verify change ticket and document as authorized activity",
          color: "green",
        },
        {
          id: "ISOLATE_INVESTIGATE",
          label: "Isolate workstation — same pattern as Kerberoasting",
          color: "red",
        },
        {
          id: "ESCALATE_SOC",
          label: "Escalate to SOC Tier 2 for deeper analysis",
          color: "orange",
        },
        {
          id: "CLOSE_SILENT",
          label: "Close silently — admins don't need scrutiny",
          color: "blue",
        },
      ],
      correctActionId: "VERIFY_DOCUMENT",
      rationales: [
        {
          id: "rat-authorized",
          text: "The approved change ticket, proper AES256 encryption (no RC4 downgrade), authorized admin user, business-hours timing, and CISO approval all confirm this is legitimate audit activity. Verifying and documenting creates an audit trail without disrupting authorized work.",
        },
        {
          id: "rat-isolate-admin",
          text: "Isolating an IT admin workstation during an approved audit disrupts operations and damages the security team's relationship with IT.",
        },
        {
          id: "rat-escalate-waste",
          text: "Escalating a clearly documented and approved activity to Tier 2 wastes analyst time and creates unnecessary noise.",
        },
        {
          id: "rat-close-silent",
          text: "Closing without verification misses the documentation step — all TGS anomalies should be verified and logged even when likely legitimate.",
        },
      ],
      correctRationaleId: "rat-authorized",
      feedback: {
        perfect:
          "Good judgment. The approved change ticket, proper AES256 encryption, and authorized admin user clearly indicate legitimate activity. Verifying and documenting is the right balance of due diligence without obstruction.",
        partial:
          "Your response is either too aggressive or too passive. An approved audit with proper encryption from an authorized admin needs verification and documentation, not isolation or silent closure.",
        wrong:
          "Isolating an admin during approved work or closing without documentation are both inappropriate. Always verify the change ticket and create an audit trail.",
      },
    },
    {
      type: "investigate-decide",
      id: "kerb-003",
      title: "Single RC4 Request to SQL Service Account",
      objective:
        "A single anomalous TGS request was detected. Determine if this warrants investigation or is benign.",
      investigationData: [
        {
          id: "event-log",
          label: "Windows Event Log — Event ID 4769",
          content:
            "Single TGS-REQ for SPN MSSQLSvc/sql-finance-01:1433 from workstation DEV-WS-08 (10.0.3.22). Encryption type: RC4_HMAC_MD5 (etype 23).",
          isCritical: true,
        },
        {
          id: "user-context",
          label: "Requesting User Profile",
          content:
            'User: mrodriguez (Senior Developer). Has legitimate SQL access for the finance reporting project. Member of "SQL-Finance-ReadOnly" group. No previous RC4 requests in 90-day history.',
        },
        {
          id: "workstation-check",
          label: "Endpoint Analysis",
          content:
            "DEV-WS-08: No suspicious processes detected. No PowerShell anomalies. However, the ODBC driver version is outdated (17.4) and may be requesting RC4 as a fallback due to a known compatibility issue with older drivers.",
        },
        {
          id: "baseline",
          label: "Historical Baseline",
          content:
            "mrodriguez normally generates 1-2 TGS requests per day for this SPN with AES256. This is the first RC4 request. No other SPNs were requested.",
        },
      ],
      actions: [
        {
          id: "INVESTIGATE_ODBC",
          label: "Investigate ODBC driver and check for Kerberoasting tools",
          color: "orange",
        },
        {
          id: "ISOLATE_IMMEDIATE",
          label: "Isolate workstation immediately",
          color: "red",
        },
        {
          id: "CLOSE_BENIGN",
          label: "Close — single request is not Kerberoasting",
          color: "green",
        },
        {
          id: "RESET_SPN",
          label: "Reset SQL service account password",
          color: "yellow",
        },
      ],
      correctActionId: "INVESTIGATE_ODBC",
      rationales: [
        {
          id: "rat-investigate",
          text: "A single RC4 request from a legitimate user could be the outdated ODBC driver or the start of targeted Kerberoasting. Investigating the driver version and checking for attack tools (Rubeus, Invoke-Kerberoast) disambiguates without overreacting or under-reacting.",
        },
        {
          id: "rat-isolate-premature",
          text: "Isolating a developer workstation based on a single RC4 request disrupts their sprint. The evidence is ambiguous and warrants investigation before containment.",
        },
        {
          id: "rat-close-early",
          text: "Closing without investigating ignores the RC4 anomaly. Even with a plausible explanation, the driver hypothesis needs to be confirmed.",
        },
        {
          id: "rat-reset-premature",
          text: "Resetting the SQL service account password based on one request would disrupt the finance reporting application for all users.",
        },
      ],
      correctRationaleId: "rat-investigate",
      feedback: {
        perfect:
          "Smart approach. A single RC4 request is ambiguous — it could be a driver issue or early-stage Kerberoasting. Checking the ODBC version and scanning for attack tools provides the evidence needed for a definitive decision.",
        partial:
          "Your response is reasonable but either too aggressive or too passive for ambiguous evidence. When indicators are unclear, investigate before committing to containment or closure.",
        wrong:
          "Immediately isolating or immediately closing both miss the point. Ambiguous indicators require investigation to determine the correct response.",
      },
    },
  ],

  hints: [
    "Kerberoasting generates a high volume of TGS requests in a short time — volume and speed are primary indicators.",
    "RC4 encryption downgrade is a key Kerberoasting indicator. Legitimate services typically use AES256 when properly configured.",
    "A single anomalous request may be a driver issue, but it still warrants investigation. Don't dismiss RC4 requests without checking.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Active Directory security is one of the most critical enterprise security specializations. Understanding Kerberos attacks like Kerberoasting and Golden Ticket is essential for any identity security role.",
  toolRelevance: [
    "BloodHound",
    "Microsoft Defender for Identity",
    "Rubeus (defensive understanding)",
    "Windows Event Log (Event ID 4769)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
