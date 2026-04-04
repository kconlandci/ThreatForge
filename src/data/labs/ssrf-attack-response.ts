import type { LabManifest } from "../../types/manifest";

export const ssrfAttackResponseLab: LabManifest = {
  schemaVersion: "1.1",
  id: "ssrf-attack-response",
  version: 1,
  title: "SSRF Attack Detection & Response",

  tier: "intermediate",
  track: "vulnerability-hardening",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["ssrf", "server-side-request-forgery", "cloud-metadata", "imds", "web-security", "owasp"],

  description:
    "Detect and respond to Server-Side Request Forgery attacks targeting internal services and cloud metadata APIs, distinguishing malicious SSRF from legitimate webhook and URL fetch functionality.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify SSRF attack patterns targeting cloud metadata endpoints and internal services",
    "Distinguish blind SSRF from in-band SSRF based on response patterns",
    "Select appropriate remediation combining URL allowlisting and network-level controls",
  ],
  sortOrder: 550,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "ssrf-001",
      title: "SSRF Targeting AWS IMDSv1 Metadata Service",
      description:
        "WAF logs show requests to a URL fetching feature that appear to target the AWS Instance Metadata Service. Classify and respond.",
      evidence: [
        {
          type: "WAF Log",
          content:
            "POST /api/preview-url | URL parameter: http://169.254.169.254/latest/meta-data/iam/security-credentials/prod-role | Response: 200 OK | 47ms | Source: 91.227.96.14",
        },
        {
          type: "Application Response",
          content:
            "Response body contains JSON: { AccessKeyId: 'ASIA...', SecretAccessKey: 'wJalr...', Token: 'IQoJb...', Expiration: '2026-03-27T16:00:00Z' } — AWS temporary credentials for the production IAM role.",

        },
        {
          type: "Impact Assessment",
          content:
            "The leaked credentials are for 'prod-role' which has s3:*, ec2:Describe*, rds:Describe* permissions. Credentials are valid for approximately 6 hours. The attacker has full read access to all S3 buckets and can enumerate all EC2/RDS resources.",
        },
        {
          type: "Instance Metadata Config",
          content:
            "EC2 instance is using IMDSv1 (no session token required). IMDSv2 (which requires a PUT pre-flight request) is not enforced. Application has no URL allowlist for the fetch feature.",

        },
      ],
      classifications: [
        { id: "critical-ssrf", label: "Critical SSRF — Active Credential Theft", description: "Cloud credentials actively exfiltrated; requires immediate response" },
        { id: "medium-ssrf", label: "Medium SSRF — Internal Access", description: "Internal network access without credential theft" },
        { id: "false-positive", label: "False Positive — Legitimate URL Fetch", description: "Normal application behavior triggered WAF alert" },
        { id: "probing-only", label: "Low — Probing Only, No Success", description: "SSRF attempt blocked before reaching metadata service" },
      ],
      correctClassificationId: "critical-ssrf",
      remediations: [
        {
          id: "revoke-enforce-patch",
          label: "Revoke credentials, enforce IMDSv2, add URL allowlist",
          description: "Immediately revoke the leaked credentials, require IMDSv2 on all instances, implement URL allowlist in the fetch feature",
        },
        {
          id: "revoke-only",
          label: "Revoke the credentials only",
          description: "Invalidate the leaked IAM role credentials",
        },
        {
          id: "block-ip",
          label: "Block the attacker's IP and monitor",
          description: "Block the source IP at the WAF and monitor for new attempts",
        },
        {
          id: "disable-feature",
          label: "Disable the URL fetch feature temporarily",
          description: "Take the vulnerable endpoint offline until a fix is deployed",
        },
      ],
      correctRemediationId: "revoke-enforce-patch",
      rationales: [
        {
          id: "rat-full-response",
          text: "This is a confirmed credential theft. The three-part response addresses all attack vectors: revoke the leaked credentials (stop attacker access), enforce IMDSv2 (prevent SSRF-based IMDS access even if SSRF persists), and implement URL allowlist (fix the root cause). Revoking credentials alone leaves the SSRF open for another attempt.",
        },
        {
          id: "rat-revoke-only",
          text: "Revoking credentials stops the current attacker but leaves the SSRF vulnerability open. Another attacker can use the same technique minutes later.",
        },
      ],
      correctRationaleId: "rat-full-response",
      feedback: {
        perfect: "Complete response. AWS IMDSv1 SSRF is a high-profile attack vector (used in the Capital One breach). Revoke credentials, enforce IMDSv2, and implement URL allowlisting — all three are required.",
        partial: "You identified the severity but the remediation misses steps. Credential revocation alone doesn't fix the underlying SSRF. IMDSv2 enforcement prevents SSRF from reaching metadata even if the endpoint vulnerability persists.",
        wrong: "Production IAM credentials leaked via SSRF is a critical incident. Blocking a single IP or taking only partial action leaves the vulnerability open for exploitation.",
      },
    },
    {
      type: "triage-remediate",
      id: "ssrf-002",
      title: "Blind SSRF via DNS Callback Detection",
      description:
        "Security monitoring detected DNS lookups from the application server to external attacker-controlled domains correlating with URL parameter manipulation.",
      evidence: [
        {
          type: "DNS Log Evidence",
          content:
            "DNS query from app-server-01 (10.0.1.50) for: probe-ssrf.attacker-collaborator.net — correlates with POST /webhook/validate containing URL=http://probe-ssrf.attacker-collaborator.net",

        },
        {
          type: "HTTP Response",
          content:
            "HTTP response to attacker: 'Webhook URL validation: pending'. No sensitive data visible in response body. The SSRF is 'blind' — server makes the request but response isn't returned to attacker directly.",
        },
        {
          type: "Follow-Up Probes",
          content:
            "After DNS callback confirmed SSRF exists: URLs submitted: http://192.168.0.1 (internal router admin), http://10.0.1.100:5432 (PostgreSQL port scan), http://10.0.1.200:8080 (internal API). DNS shows resolution attempts for all.",
        },
        {
          type: "Code Review",
          content:
            "Webhook validation: requests.get(user_provided_url, timeout=5) — No URL scheme validation, no private IP range blocking, no DNS rebinding protection.",
        },
      ],
      classifications: [
        { id: "blind-ssrf-active", label: "Blind SSRF — Active Internal Reconnaissance", description: "Confirmed SSRF used for internal network scanning" },
        { id: "external-only", label: "External SSRF — Low Risk", description: "SSRF confirmed but only reaching external URLs" },
        { id: "false-positive-dns", label: "False Positive — Normal DNS Activity", description: "DNS lookups are coincidental, not SSRF-related" },
        { id: "probing-blocked", label: "SSRF Probing — Blocked by Firewall", description: "SSRF confirmed but internal requests blocked at network level" },
      ],
      correctClassificationId: "blind-ssrf-active",
      remediations: [
        {
          id: "allowlist-block-private",
          label: "Implement URL allowlist, block RFC1918 ranges, validate DNS resolution",
          description: "Only allow known webhook domains, block private IP ranges before DNS resolution, add DNS rebinding protection",
        },
        {
          id: "firewall-block",
          label: "Add firewall rules blocking outbound to private ranges from app server",
          description: "Network-level block on RFC1918 outbound connections from the application server",
        },
        {
          id: "disable-webhook",
          label: "Disable the webhook validation feature",
          description: "Remove the webhook URL validation functionality entirely",
        },
        {
          id: "rate-limit-only",
          label: "Add rate limiting to the webhook endpoint",
          description: "Limit webhook validation requests to slow down reconnaissance",
        },
      ],
      correctRemediationId: "allowlist-block-private",
      rationales: [
        {
          id: "rat-full-ssrf-fix",
          text: "Defense-in-depth for SSRF requires both application-layer and network-layer controls: allowlist limits requests to known valid destinations, RFC1918 blocking prevents internal network access, and DNS validation ensures the resolved IP isn't a private range (preventing DNS rebinding attacks that bypass IP checks).",
        },
        {
          id: "rat-firewall-only",
          text: "Firewall rules are a good compensating control but don't address the root cause. URL allowlisting is the proper application-layer fix. Both together provide defense-in-depth.",
        },
      ],
      correctRationaleId: "rat-full-ssrf-fix",
      feedback: {
        perfect: "Correct. Blind SSRF for internal reconnaissance requires defense-in-depth: application-layer allowlist, network-layer RFC1918 blocking, and DNS rebinding protection together. Each layer stops different bypass techniques.",
        partial: "Firewall-only or allowlist-only is a start but not complete. SSRF defense requires both application and network controls — one layer can be bypassed without the other.",
        wrong: "Rate limiting slows but doesn't stop SSRF exploitation. The architectural fix — URL allowlisting and RFC1918 blocking — is required.",
      },
    },
    {
      type: "triage-remediate",
      id: "ssrf-003",
      title: "False Positive — Legitimate Webhook Integration",
      description:
        "WAF flagged a webhook registration request to an internal IP range. Determine if this is a real SSRF attempt or legitimate functionality.",
      evidence: [
        {
          type: "WAF Alert",
          content:
            "POST /integrations/webhook | URL: http://10.50.0.25:8080/events | Rule: SSRF_PRIVATE_IP | Score: 75 | Response: 200",
        },
        {
          type: "Business Context",
          content:
            "10.50.0.25 is in the dedicated integration network segment (10.50.0.0/16) specifically allocated for internal microservices that receive webhook events from the platform. This segment is documented in the architecture diagram.",
        },
        {
          type: "Configured Allowlist",
          content:
            "The webhook service has an IP allowlist configured: only 10.50.0.0/16 is permitted as webhook target — all other private ranges (10.0.0.0/8 excluding /16, 172.16.0.0/12, 192.168.0.0/16) are blocked.",
        },
        {
          type: "Authentication Check",
          content:
            "The registration was made by an authenticated service account 'integration-svc-01' with the 'webhook:write' permission. Request came from the CI/CD deployment pipeline during automated service configuration.",
        },
      ],
      classifications: [
        { id: "false-positive-legitimate", label: "False Positive — Legitimate Internal Webhook", description: "Authorized internal integration within allowed network segment" },
        { id: "ssrf-attempt", label: "SSRF Attempt — Investigate Further", description: "Suspicious private IP target requires investigation" },
        { id: "policy-violation", label: "Policy Violation — Requires Approval", description: "Technically functional but requires security approval before allowing" },
        { id: "misconfiguration", label: "Misconfiguration — Should Use Public URL", description: "Should be reconfigured to use a public-facing URL instead" },
      ],
      correctClassificationId: "false-positive-legitimate",
      remediations: [
        {
          id: "tune-waf-document",
          label: "Tune WAF rule to allow 10.50.0.0/16 webhook targets, document allowlist",
          description: "Create WAF exception for the authorized integration network segment",
        },
        {
          id: "block-investigate",
          label: "Block and investigate the integration service",
          description: "Prevent the webhook registration and audit the service",
        },
        {
          id: "require-approval",
          label: "Require CISO approval for all internal webhook targets",
          description: "Add governance layer before allowing any private IP webhooks",
        },
        {
          id: "force-public-url",
          label: "Force use of public URL — no internal IPs allowed",
          description: "Architectural requirement to use only public-facing endpoints for webhooks",
        },
      ],
      correctRemediationId: "tune-waf-document",
      rationales: [
        {
          id: "rat-legitimate",
          text: "This is a legitimate internal integration: the IP is in the documented and allowlisted integration segment, the request came from an authorized service account during CI/CD deployment, and the webhook system already blocks unauthorized private ranges. The WAF rule should be tuned to recognize the authorized integration network.",
        },
        {
          id: "rat-block-disruptive",
          text: "Blocking a legitimate CI/CD-deployed integration disrupts the deployment pipeline without any security benefit.",
        },
      ],
      correctRationaleId: "rat-legitimate",
      feedback: {
        perfect: "Good judgment. The integration segment is specifically designed for internal webhooks, the allowlist is properly configured, and the request came from an authorized service account. This is exactly the kind of legitimate internal integration that should work.",
        partial: "Your caution is understandable, but the existing controls (IP allowlist, authenticated service account, dedicated segment) already address SSRF risk. Tuning the WAF to reflect the architecture is the right move.",
        wrong: "Not every internal IP in a webhook is an SSRF attack. The dedicated integration segment with an IP allowlist is proper security architecture — don't break it by applying SSRF rules designed for uncontrolled inputs.",
      },
    },
  ],

  hints: [
    "169.254.169.254 is the AWS Instance Metadata Service — any URL fetch to this IP is a confirmed SSRF targeting cloud credentials.",
    "Blind SSRF can be detected via DNS callbacks even when no data is returned in the HTTP response.",
    "Legitimate internal webhooks in dedicated network segments with allowlists are not SSRF — understand your architecture before blocking.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "SSRF targeting cloud metadata endpoints is one of the most impactful modern attack techniques — it was used in the Capital One breach to steal AWS credentials. Cloud security engineers must understand IMDSv2 and URL allowlisting.",
  toolRelevance: [
    "Burp Suite Collaborator (blind SSRF detection)",
    "AWS IMDSv2 (mitigation)",
    "ssrf-sheriff (testing tool)",
    "Cloudflare WAF (SSRF rules)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
