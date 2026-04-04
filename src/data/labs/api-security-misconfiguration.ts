import type { LabManifest } from "../../types/manifest";

export const apiSecurityMisconfigurationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "api-security-misconfiguration",
  version: 1,
  title: "API Security Misconfiguration Review",

  tier: "intermediate",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["api-security", "rest-api", "authentication", "rate-limiting", "cors", "owasp-api"],

  description:
    "Audit REST API configurations for authentication gaps, missing rate limiting, insecure CORS policies, and missing security headers that expose APIs to abuse and data exfiltration.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify authentication and authorization gaps in REST API configurations",
    "Evaluate rate limiting and CORS settings for security weaknesses",
    "Configure API security headers and access controls following OWASP API Security Top 10",
  ],
  sortOrder: 530,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "api-001",
      title: "Public REST API Authentication Settings",
      description:
        "The company's public API gateway has several authentication settings that need review. Configure each to follow security best practices.",
      targetSystem: "api.company.com (AWS API Gateway)",
      items: [
        {
          id: "auth-required",
          label: "Authentication Requirement",
          detail: "Controls whether API endpoints require a valid token or key.",
          currentState: "optional",
          correctState: "required",
          states: ["optional", "required"],
          rationaleId: "rat-auth",
        },
        {
          id: "api-key-rotation",
          label: "API Key Rotation Policy",
          detail: "Controls how often API keys are automatically rotated.",
          currentState: "never",
          correctState: "90-days",
          states: ["never", "90-days", "180-days", "365-days"],
          rationaleId: "rat-rotation",
        },
        {
          id: "verbose-errors",
          label: "Verbose Error Messages",
          detail: "Controls whether API errors include stack traces and internal details.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-errors",
        },
        {
          id: "http-methods",
          label: "Allowed HTTP Methods",
          detail: "Controls which HTTP methods are accepted on data endpoints.",
          currentState: "all-methods",
          correctState: "get-post-only",
          states: ["all-methods", "get-post-only", "get-only"],
          rationaleId: "rat-methods",
        },
      ],
      rationales: [
        { id: "rat-auth", text: "Optional authentication allows unauthenticated access — all production API endpoints must require authentication." },
        { id: "rat-rotation", text: "API keys that never rotate remain valid indefinitely after compromise. 90-day rotation limits exposure windows." },
        { id: "rat-errors", text: "Verbose errors expose internal paths, library versions, and stack traces that aid attacker reconnaissance." },
        { id: "rat-methods", text: "Unrestricted HTTP methods enable accidental or intentional data modification via unexpected verbs (TRACE, DELETE, PUT)." },
      ],
      feedback: {
        perfect: "API gateway properly configured with required authentication, key rotation, minimal error disclosure, and restricted methods.",
        partial: "Some settings remain insecure. Authentication and error disclosure are the highest-priority items.",
        wrong: "Critical API misconfigurations remain. Optional authentication on a production API is a severe access control gap.",
      },
    },
    {
      type: "toggle-config",
      id: "api-002",
      title: "Rate Limiting and Throttling Configuration",
      description:
        "The API has no rate limiting in place. Configure appropriate limits to prevent abuse, scraping, and credential stuffing.",
      targetSystem: "api.company.com — Rate Limiting Policy",
      items: [
        {
          id: "global-rate",
          label: "Global Rate Limit (per IP)",
          detail: "Maximum API requests per minute from a single IP address.",
          currentState: "unlimited",
          correctState: "1000/min",
          states: ["unlimited", "100/min", "1000/min", "10000/min"],
          rationaleId: "rat-global",
        },
        {
          id: "auth-endpoint",
          label: "Authentication Endpoint Rate Limit",
          detail: "Maximum login/token requests per minute — stricter limit for sensitive endpoints.",
          currentState: "unlimited",
          correctState: "10/min",
          states: ["unlimited", "5/min", "10/min", "60/min"],
          rationaleId: "rat-auth-rate",
        },
        {
          id: "burst-protection",
          label: "Burst Protection",
          detail: "Allows short-term spikes while preventing sustained high-volume abuse.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-burst",
        },
        {
          id: "rate-limit-headers",
          label: "Rate Limit Response Headers",
          detail: "X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After headers in responses.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rat-headers",
        },
      ],
      rationales: [
        { id: "rat-global", text: "Unlimited requests enable API scraping and enumeration. 1000/min is generous for legitimate use while stopping automated abuse." },
        { id: "rat-auth-rate", text: "Authentication endpoints with no rate limit are vulnerable to credential stuffing. 10/min per IP prevents automated attacks while allowing normal users." },
        { id: "rat-burst", text: "Burst protection handles legitimate traffic spikes (e.g., mobile app launch) without creating the same opening as unlimited sustained requests." },
        { id: "rat-headers", text: "Rate limit headers allow legitimate clients to self-throttle, reducing 429 errors for well-behaved applications." },
      ],
      feedback: {
        perfect: "Rate limiting properly configured. Authentication endpoints are tightly limited while general endpoints allow legitimate traffic.",
        partial: "Some rate limits are still too permissive. The authentication endpoint especially needs strict limits against credential stuffing.",
        wrong: "Unlimited API requests on authentication endpoints are a credential stuffing invitation. Rate limiting is non-negotiable for auth endpoints.",
      },
    },
    {
      type: "toggle-config",
      id: "api-003",
      title: "CORS Policy and Security Headers",
      description:
        "The API's CORS policy is overly permissive and critical security headers are missing. Configure appropriate settings.",
      targetSystem: "api.company.com — CORS & Security Headers",
      items: [
        {
          id: "cors-origin",
          label: "Access-Control-Allow-Origin",
          detail: "Controls which origins can make cross-origin requests to the API.",
          currentState: "*",
          correctState: "specific-origins",
          states: ["*", "specific-origins", "null"],
          rationaleId: "rat-cors",
        },
        {
          id: "cors-credentials",
          label: "Access-Control-Allow-Credentials",
          detail: "Controls whether cookies and credentials can be sent with cross-origin requests.",
          currentState: "true",
          correctState: "false",
          states: ["true", "false"],
          rationaleId: "rat-credentials",
        },
        {
          id: "security-headers",
          label: "Security Response Headers",
          detail: "X-Content-Type-Options, X-Frame-Options, Referrer-Policy headers.",
          currentState: "none",
          correctState: "all-enabled",
          states: ["none", "partial", "all-enabled"],
          rationaleId: "rat-sec-headers",
        },
        {
          id: "api-version",
          label: "Server/X-Powered-By Headers",
          detail: "Controls whether the API discloses framework and version information.",
          currentState: "exposed",
          correctState: "suppressed",
          states: ["exposed", "suppressed"],
          rationaleId: "rat-version",
        },
      ],
      rationales: [
        { id: "rat-cors", text: "Wildcard CORS origin (*) with credentials allows any website to make authenticated API requests on behalf of users — a severe security risk." },
        { id: "rat-credentials", text: "CORS credentials=true with a wildcard origin is actually blocked by browsers, but the correct combination is specific origins + false credentials for public APIs." },
        { id: "rat-sec-headers", text: "X-Content-Type-Options prevents MIME sniffing attacks; X-Frame-Options prevents clickjacking; Referrer-Policy controls information leakage via referrer headers." },
        { id: "rat-version", text: "Server headers disclosing Express v4.18.2 or Django 4.2 help attackers target known vulnerabilities in those framework versions." },
      ],
      feedback: {
        perfect: "CORS locked down to specific origins, credentials disabled, security headers added, and server fingerprinting suppressed.",
        partial: "CORS or security headers need attention. Wildcard CORS on an authenticated API is a critical misconfiguration.",
        wrong: "Wildcard CORS with credentials enabled creates cross-origin request forgery opportunities. Lock down origin lists immediately.",
      },
    },
  ],

  hints: [
    "Never use CORS wildcard (*) on APIs that use cookies or session tokens — always enumerate specific allowed origins.",
    "Authentication endpoints need 10x stricter rate limits than data endpoints — they're the primary credential stuffing target.",
    "Verbose error messages are a reconnaissance goldmine — always return generic errors in production with only a correlation ID.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "API security has become its own OWASP category (API Security Top 10). Cloud-native applications expose more API surface than traditional web apps, making API security hardening an essential skill for cloud security engineers.",
  toolRelevance: [
    "OWASP API Security Top 10",
    "Postman / Insomnia (API testing)",
    "AWS API Gateway Policies",
    "Swagger/OpenAPI (security definitions)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
