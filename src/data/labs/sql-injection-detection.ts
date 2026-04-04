import type { LabManifest } from "../../types/manifest";

export const sqlInjectionDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "sql-injection-detection",
  version: 1,
  title: "SQL Injection Detection & Response",

  tier: "beginner",
  track: "vulnerability-hardening",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["sql-injection", "sqli", "web-security", "owasp", "waf", "database"],

  description:
    "Analyze WAF logs, application logs, and database query patterns to identify SQL injection attacks, distinguish them from legitimate queries, and determine appropriate response actions.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify SQL injection attack patterns in application and WAF logs",
    "Distinguish UNION-based, blind, and error-based SQLi techniques",
    "Select appropriate response actions based on attack severity and scope",
  ],
  sortOrder: 500,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "sqli-001",
      title: "UNION-Based SQLi in Search Parameter",
      objective:
        "WAF triggered an alert on search functionality. Determine if this is a real SQL injection attack and what action to take.",
      investigationData: [
        {
          id: "waf-log",
          label: "WAF Alert Log",
          content:
            "Rule: SQL_INJECTION_UNION | Score: 90 | Request: GET /search?q=shoes%27+UNION+SELECT+username%2Cpassword%2CNULL+FROM+users-- | Source IP: 45.227.253.98 | Response: 200 OK",
          isCritical: true,
        },
        {
          id: "db-log",
          label: "Database Query Log",
          content:
            "Query executed: SELECT * FROM products WHERE name LIKE '%shoes' UNION SELECT username,password,NULL FROM users--% ' | Rows returned: 47 | Execution time: 12ms | User table rows visible in response: YES",
          isCritical: true,
        },
        {
          id: "response-sample",
          label: "HTTP Response Sample",
          content:
            "Response body contains product names mixed with what appear to be email addresses and hashed strings (bcrypt format). The application returned HTTP 200 with data leakage confirmed.",
        },
        {
          id: "ip-context",
          label: "Source IP Intelligence",
          content:
            "IP 45.227.253.98: No prior legitimate traffic. Shodan shows it's a VPS in Brazil. ThreatFeed tags: scanner, SQL injection, data harvesting. 127 requests to /search in the past 10 minutes.",
        },
      ],
      actions: [
        {
          id: "BLOCK_PATCH",
          label: "Block IP, patch the query, notify data owner",
          color: "red",
        },
        {
          id: "MONITOR_ONLY",
          label: "Monitor — WAF already blocked it",
          color: "yellow",
        },
        {
          id: "BLOCK_IP",
          label: "Block the IP only",
          color: "orange",
        },
        {
          id: "CLOSE_FP",
          label: "Close — false positive from WAF",
          color: "blue",
        },
      ],
      correctActionId: "BLOCK_PATCH",
      rationales: [
        {
          id: "rat-confirmed-exploit",
          text: "The database log confirms the UNION query executed successfully and returned user credentials. The WAF logged but did not block the request (HTTP 200 returned). This is a confirmed active data breach requiring IP block, emergency parameterized query patch, and data owner notification.",
        },
        {
          id: "rat-waf-blocked",
          text: "The WAF logged the attack but the HTTP 200 response and leaked data in the DB log confirm the WAF was in monitoring mode, not blocking mode.",
        },
        {
          id: "rat-ip-only",
          text: "Blocking the IP alone doesn't fix the vulnerable query. Another attacker will find and exploit the same endpoint.",
        },
        {
          id: "rat-false-pos",
          text: "The DB log showing user table data in the response confirms this is not a false positive.",
        },
      ],
      correctRationaleId: "rat-confirmed-exploit",
      feedback: {
        perfect:
          "Correct. The DB log confirms successful exploitation — user data was returned. The WAF was in detect-only mode. All three actions are required: block the IP to stop ongoing extraction, patch the query with parameterized inputs, and notify the data owner of the confirmed breach.",
        partial:
          "You took some action but missed critical steps. Blocking an IP without patching leaves the vulnerability open. Data leakage has occurred — data owner notification is legally required.",
        wrong:
          "The DB log proves data was extracted. Closing as a false positive or only monitoring misses an active, successful SQL injection attack.",
      },
    },
    {
      type: "investigate-decide",
      id: "sqli-002",
      title: "Blind Boolean-Based SQLi Probe",
      objective:
        "Multiple WAF alerts for a login endpoint. Investigate whether data has been extracted.",
      investigationData: [
        {
          id: "waf-alerts",
          label: "WAF Alert Pattern",
          content:
            "142 alerts over 20 minutes on POST /api/login. Payloads alternate between: admin' AND 1=1-- and admin' AND 1=2-- . All received different HTTP status codes: 200 vs 401, confirming conditional responses.",
          isCritical: true,
        },
        {
          id: "db-log",
          label: "Database Query Log",
          content:
            "All queries are SELECT queries on the users table. No INSERT, UPDATE, or DELETE operations. Queries execute in 1-3ms each. No bulk data exfiltration patterns. Attacker appears to be probing structure, not extracting data yet.",
        },
        {
          id: "current-status",
          label: "Current Attack Status",
          content:
            "Pattern analysis: attacker is using boolean-based blind SQLi to enumerate database structure (table names, column count). Data extraction has not started. WAF is in blocking mode — all 142 requests returned WAF block pages after rule match.",
        },
        {
          id: "endpoint-check",
          label: "Endpoint Vulnerability Check",
          content:
            "Code review of /api/login: Uses string concatenation — query = 'SELECT * FROM users WHERE username=' + username + '...'. Confirmed vulnerable. No parameterized queries in this module.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "PATCH_BLOCK",
          label: "Patch query to parameterized, add rate limiting, block IP",
          color: "red",
        },
        {
          id: "WAF_HANDLING",
          label: "WAF is handling it — no code changes needed yet",
          color: "yellow",
        },
        {
          id: "JUST_BLOCK",
          label: "Block the IP — data hasn't been extracted yet",
          color: "orange",
        },
        {
          id: "RATE_LIMIT",
          label: "Add rate limiting only — attacker can't extract without more requests",
          color: "blue",
        },
      ],
      correctActionId: "PATCH_BLOCK",
      rationales: [
        {
          id: "rat-vuln-exists",
          text: "The WAF is blocking the current attacker, but the underlying vulnerability is confirmed via code review. WAF rules can be bypassed with encoding or payload variation. Patching the parameterized query is the only durable fix. Block + rate limit + patch together address the current attack and future variants.",
        },
        {
          id: "rat-waf-sufficient",
          text: "WAF rules are a compensating control, not a fix. The vulnerable query remains and WAF can be bypassed with obfuscation, encoding, or novel payloads.",
        },
        {
          id: "rat-block-only",
          text: "IP blocking is trivially bypassed by rotating IPs. The vulnerability must be fixed.",
        },
        {
          id: "rat-rate-limit",
          text: "Rate limiting slows automated exploitation but doesn't prevent it. A slow, low-rate attack can still extract data over time.",
        },
      ],
      correctRationaleId: "rat-vuln-exists",
      feedback: {
        perfect:
          "Excellent. Even though data wasn't extracted yet, the confirmed vulnerability means it's only a matter of time. The WAF is a speed bump, not a solution. Patch the code, block the IP, and add rate limiting as defense-in-depth.",
        partial:
          "You recognized the risk but chose an incomplete response. WAF-only or IP-only approaches don't fix the root cause — the vulnerable query.",
        wrong:
          "A confirmed vulnerable query with an active attacker requires code remediation. WAF bypass techniques are well-documented — patch the root cause.",
      },
    },
    {
      type: "investigate-decide",
      id: "sqli-003",
      title: "False Positive — Legitimate Search with Apostrophe",
      objective:
        "WAF flagged a search query as SQL injection. Verify before taking action.",
      investigationData: [
        {
          id: "waf-alert",
          label: "WAF Alert",
          content:
            "Rule: SQLI_SINGLE_QUOTE | Score: 35 | Request: GET /search?q=O%27Brien+shoes | Source IP: 10.0.0.0/8 (internal network) | Response: 200 OK — 12 products returned",
        },
        {
          id: "db-log",
          label: "Database Query Log",
          content:
            "Query: SELECT * FROM products WHERE name LIKE '%O\\'Brien shoes%' | Apostrophe properly escaped by ORM | Rows returned: 12 | No UNION, no comment syntax, no conditional logic.",
        },
        {
          id: "user-context",
          label: "User Context",
          content:
            "Authenticated session: employee ID E-4872. Internal IP 10.8.2.15 (corporate network). User searched for \"O'Brien shoes\" — a legitimate brand name with an apostrophe. Session active for 45 minutes with normal browsing pattern.",
        },
        {
          id: "response-check",
          label: "Response Content",
          content:
            "Response contains only product catalog data — no database metadata, no user records, no schema information. ORM correctly escaped the apostrophe before query execution.",
        },
      ],
      actions: [
        {
          id: "CLOSE_FP",
          label: "Close as false positive — tune WAF rule",
          color: "green",
        },
        {
          id: "BLOCK_USER",
          label: "Block the user account pending investigation",
          color: "red",
        },
        {
          id: "ESCALATE_T2",
          label: "Escalate to Tier 2 for deeper analysis",
          color: "orange",
        },
        {
          id: "QUARANTINE_SESSION",
          label: "Terminate session and require re-authentication",
          color: "yellow",
        },
      ],
      correctActionId: "CLOSE_FP",
      rationales: [
        {
          id: "rat-fp-clear",
          text: "The apostrophe in 'O'Brien' is a legitimate Irish name. The ORM properly escaped it, no SQL syntax was injected, the response contains only normal product data, and the user is internal with an authenticated session. This is a false positive from an overly sensitive WAF rule. Closing and tuning reduces future noise.",
        },
        {
          id: "rat-block-user",
          text: "Blocking an authenticated employee for searching a brand name with an apostrophe would cause unnecessary disruption and erode trust in the security team.",
        },
        {
          id: "rat-escalate",
          text: "The evidence clearly shows a false positive — no SQL syntax, internal user, proper ORM escaping. Tier 2 escalation wastes resources.",
        },
        {
          id: "rat-session-kill",
          text: "Terminating a legitimate session for a false positive alert creates friction without any security benefit.",
        },
      ],
      correctRationaleId: "rat-fp-clear",
      feedback: {
        perfect:
          "Sharp analysis. Apostrophes in names are a classic WAF false positive trigger. The ORM escaping, internal user context, and clean response content all confirm this is benign. Tuning the rule prevents future alert fatigue.",
        partial:
          "Your caution is understandable but this is clearly a false positive. Internal user, ORM-escaped query, no injected syntax — don't penalize legitimate users for using possessive apostrophes.",
        wrong:
          "Taking punitive action against an employee for searching a name with an apostrophe based on a low-score WAF alert is disproportionate and unsupported by the evidence.",
      },
    },
  ],

  hints: [
    "Check whether the WAF blocked the request or just logged it — a 200 response after a SQLi alert means the attack may have succeeded.",
    "Blind SQLi uses conditional logic (AND 1=1 vs AND 1=2) to extract data slowly. It's harder to detect but just as dangerous.",
    "Not every WAF alert is a real attack — apostrophes in legitimate names are the most common SQL injection false positive.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "SQL injection remains one of the most exploited vulnerabilities despite being fully preventable with parameterized queries. Application security engineers and SOC analysts need to recognize both successful attacks and false positives quickly.",
  toolRelevance: [
    "Burp Suite (SQLi testing)",
    "SQLMap (automated detection)",
    "OWASP ZAP",
    "ModSecurity WAF",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
