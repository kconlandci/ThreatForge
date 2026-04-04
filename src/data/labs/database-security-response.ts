import type { LabManifest } from "../../types/manifest";

export const databaseSecurityResponseLab: LabManifest = {
  schemaVersion: "1.1",
  id: "database-security-response",
  version: 1,
  title: "Database Security Response",

  tier: "advanced",
  track: "vulnerability-hardening",
  difficulty: "challenging",
  accessLevel: "free",
  tags: [
    "database",
    "sql-injection",
    "encryption",
    "data-breach",
    "forensics",
    "compliance",
  ],

  description:
    "Respond to database security incidents including SQL injection attacks, unauthorized data access, encryption failures, and compliance violations involving sensitive data stores.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Classify database security incidents by severity and data impact",
    "Select appropriate containment and remediation for database breaches",
    "Balance incident response with data availability requirements",
  ],
  sortOrder: 450,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "dbsec-001",
      title: "Active SQL Injection on Production",
      description:
        "The WAF and database monitoring systems are alerting on suspicious query patterns against the production customer database. The attack appears to be ongoing.",
      evidence: [
        {
          type: "WAF Log",
          content:
            "Blocked 47 SQLi attempts in the last hour, but 3 UNION-based payloads bypassed WAF rules and reached the database. Source IP: 198.51.100.23.",
        },
        {
          type: "DB Audit Log",
          content:
            "SELECT * FROM users UNION SELECT username, password_hash, email, ssn, NULL FROM customers — returned 50,000 rows. Query executed 6 minutes ago.",
        },
        {
          type: "Network",
          content:
            "Outbound data transfer spike of 12MB to external IP in the last 10 minutes. Attack is ongoing — new queries arriving every 90 seconds.",
        },
      ],
      classifications: [
        {
          id: "c-breach",
          label: "Critical data breach",
          description:
            "Confirmed unauthorized access to sensitive data with evidence of exfiltration.",
        },
        {
          id: "c-attempted",
          label: "Attempted breach",
          description:
            "Attack detected but no evidence of successful data access.",
        },
        {
          id: "c-fp",
          label: "False positive",
          description:
            "Alert triggered by legitimate application behavior.",
        },
        {
          id: "c-vuln",
          label: "Vulnerability only",
          description:
            "Exploitable flaw identified but no evidence of active exploitation.",
        },
      ],
      correctClassificationId: "c-breach",
      remediations: [
        {
          id: "r-full-contain",
          label: "Block attacker IP + WAF rule + emergency patch + breach notification",
          description:
            "Full containment: block source, harden WAF, patch the vulnerability, and initiate breach notification procedures.",
        },
        {
          id: "r-block-only",
          label: "Block IP only",
          description:
            "Block the attacker's source IP address at the firewall.",
        },
        {
          id: "r-offline",
          label: "Take app offline",
          description:
            "Shut down the application entirely to stop the attack.",
        },
        {
          id: "r-monitor",
          label: "Monitor for more activity",
          description:
            "Continue monitoring to gather more intelligence before acting.",
        },
      ],
      correctRemediationId: "r-full-contain",
      rationales: [
        {
          id: "rat-1",
          text: "With 50,000 rows exfiltrated including SSNs, this is a confirmed breach requiring full containment — blocking, patching, and regulatory notification are all mandatory.",
        },
        {
          id: "rat-2",
          text: "Blocking the IP alone is insufficient — the attacker can pivot to a new IP within minutes, and the vulnerability remains exploitable.",
        },
        {
          id: "rat-3",
          text: "Monitoring an active data exfiltration lets the attacker extract more records. Containment must come before intelligence gathering.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Correct. Active exfiltration of PII including SSNs is a confirmed data breach. Full containment plus breach notification is the only appropriate response — blocking the IP alone won't stop a determined attacker.",
        partial:
          "You recognized the severity, but your remediation is incomplete. Active data breaches involving PII require simultaneous containment actions and regulatory notification — partial measures leave gaps.",
        wrong:
          "Monitoring or taking minimal action during active data exfiltration is negligent. With 50,000 customer records including SSNs already extracted, every second of delay increases regulatory and legal exposure.",
      },
    },
    {
      type: "triage-remediate",
      id: "dbsec-002",
      title: "Encryption at Rest Disabled After Migration",
      description:
        "A routine compliance audit has flagged that Transparent Data Encryption (TDE) is disabled on a production database containing customer PII.",
      evidence: [
        {
          type: "Audit Finding",
          content:
            "TDE status: DISABLED on PROD-CUST-DB-02. Last encryption status change: March 4 (23 days ago) during cloud migration.",
        },
        {
          type: "Migration Log",
          content:
            "Database migrated from on-prem to cloud on March 4. TDE was disabled to resolve a migration compatibility issue and was documented as 'to be re-enabled post-migration' — but the follow-up task was never created.",
        },
        {
          type: "Data Scope",
          content:
            "Database contains PII for 200,000 customers including names, addresses, phone numbers, and email addresses. No SSNs or financial data. No evidence of unauthorized access during the unencrypted period.",
        },
      ],
      classifications: [
        {
          id: "c-active-breach",
          label: "Active breach",
          description:
            "Unauthorized access to unencrypted data is confirmed.",
        },
        {
          id: "c-compliance",
          label: "Compliance violation/high risk",
          description:
            "Regulatory requirement not met — data at risk even without confirmed access.",
        },
        {
          id: "c-low-risk",
          label: "Low risk misconfiguration",
          description:
            "Configuration error with minimal security impact.",
        },
        {
          id: "c-no-issue",
          label: "No issue",
          description:
            "Encryption at rest is not required for this data type.",
        },
      ],
      correctClassificationId: "c-compliance",
      remediations: [
        {
          id: "r-immediate-notify",
          label: "Enable TDE immediately + compliance notification",
          description:
            "Re-enable encryption now and notify the compliance team of the 23-day gap.",
        },
        {
          id: "r-maintenance",
          label: "Enable TDE during next maintenance window",
          description:
            "Schedule TDE re-enablement for the next planned maintenance window.",
        },
        {
          id: "r-quarterly",
          label: "Document and schedule for next quarter",
          description:
            "Add to the quarterly security backlog for planned remediation.",
        },
        {
          id: "r-no-action",
          label: "No action needed",
          description:
            "The data type doesn't require encryption at rest.",
        },
      ],
      correctRemediationId: "r-immediate-notify",
      rationales: [
        {
          id: "rat-1",
          text: "PII for 200K customers unencrypted for 23 days is a compliance violation requiring immediate remediation and disclosure to the compliance team, regardless of whether access occurred.",
        },
        {
          id: "rat-2",
          text: "Waiting for a maintenance window adds more days of non-compliance. TDE can be enabled online without downtime on most modern database platforms.",
        },
        {
          id: "rat-3",
          text: "Quarterly scheduling for a known compliance gap is unacceptable — regulatory fines are based on how long the violation persists, not just that it occurred.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Correct. Even without evidence of unauthorized access, 200K customer PII records unencrypted for 23 days is a clear compliance violation. Immediate TDE re-enablement plus compliance notification is the right call.",
        partial:
          "You recognized the issue but your timeline is too relaxed. Compliance violations involving PII are time-sensitive — every additional day of non-compliance increases regulatory risk.",
        wrong:
          "Dismissing or significantly delaying remediation of an encryption gap on PII data shows poor compliance judgment. Regulations require both protection and timely disclosure of gaps.",
      },
    },
    {
      type: "triage-remediate",
      id: "dbsec-003",
      title: "Suspicious Query Pattern from App Server",
      description:
        "Database monitoring flagged unusual query patterns originating from an application server during off-hours. The queries are coming from the legitimate application service account.",
      evidence: [
        {
          type: "DB Monitor",
          content:
            "SELECT * queries against 14 tables including customer_data and employee_records between 02:00-04:00 AM. Normal app behavior queries 3 specific tables with column-specific SELECTs.",
        },
        {
          type: "Source",
          content:
            "All queries originate from APP-SRV-03 using service account 'svc_webapp' — this is the legitimate production application service account with valid credentials.",
        },
        {
          type: "Investigation",
          content:
            "Further investigation reveals a developer left a debug query script running in a staging configuration file that was accidentally pointed at the production database connection string. The script was part of a data export test.",
        },
      ],
      classifications: [
        {
          id: "c-exfil",
          label: "Data exfiltration",
          description:
            "Intentional unauthorized extraction of sensitive data.",
        },
        {
          id: "c-insider",
          label: "Insider threat",
          description:
            "Malicious activity by an authorized internal user.",
        },
        {
          id: "c-config-error",
          label: "Configuration error",
          description:
            "Accidental misconfiguration causing unintended data access.",
        },
        {
          id: "c-normal",
          label: "Normal behavior",
          description:
            "Expected application behavior — no security concern.",
        },
      ],
      correctClassificationId: "c-config-error",
      remediations: [
        {
          id: "r-revoke-fix",
          label: "Revoke staging access to production + fix config",
          description:
            "Remove the staging environment's ability to connect to production databases and correct the connection string.",
        },
        {
          id: "r-full-ir",
          label: "Full incident response",
          description:
            "Activate the IR plan and investigate as a potential insider threat.",
        },
        {
          id: "r-block-server",
          label: "Block the app server",
          description:
            "Firewall the application server to prevent further queries.",
        },
        {
          id: "r-ignore",
          label: "Ignore — it's the app service account",
          description:
            "No action needed since the queries came from a legitimate account.",
        },
      ],
      correctRemediationId: "r-revoke-fix",
      rationales: [
        {
          id: "rat-1",
          text: "A staging config pointing to production is a serious configuration error. Revoking cross-environment access and fixing the connection string addresses the root cause without overreacting.",
        },
        {
          id: "rat-2",
          text: "Full incident response is disproportionate for a confirmed accidental misconfiguration — it wastes resources and creates unnecessary alarm.",
        },
        {
          id: "rat-3",
          text: "Ignoring the issue because the account is legitimate misses the point — legitimate credentials were used in an unintended way, and the configuration gap must be closed.",
        },
      ],
      correctRationaleId: "rat-1",
      feedback: {
        perfect:
          "Good analysis. You correctly identified the root cause as a configuration error and selected a proportional fix. Revoking staging-to-production access prevents recurrence, and the developer's mistake doesn't warrant a full IR activation.",
        partial:
          "You were on the right track but either over- or under-responded. Configuration errors are real security issues that need fixing, but they don't require the same response as malicious activity.",
        wrong:
          "Either ignoring this or treating it as a full insider threat misses the mark. Configuration errors that expose production data are serious and need targeted remediation, not extremes.",
      },
    },
  ],

  hints: [
    "When evaluating database incidents, always check the data scope first — what type of data was accessed and how much. This drives both classification severity and regulatory obligations.",
    "Legitimate credentials used in unexpected ways often indicate configuration errors rather than insider threats. Investigate context before escalating.",
    "Encryption compliance violations are time-sensitive. The duration of the gap matters as much as the gap itself for regulatory purposes.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Database security combines technical depth with compliance knowledge. DBA security specialists command premium salaries, especially in finance and healthcare.",
  toolRelevance: [
    "Imperva Database Security",
    "IBM Guardium",
    "Oracle Audit Vault",
    "SQLMap (defensive testing)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
