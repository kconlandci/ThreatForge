import type { LabManifest } from "../../types/manifest";

export const oauthTokenTheftDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "oauth-token-theft-detection",
  version: 1,
  title: "OAuth/OIDC Token Theft Detection",

  tier: "advanced",
  track: "identity-access",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["oauth", "oidc", "token-theft", "authorization-code", "pkce", "identity-security"],

  description:
    "Investigate OAuth 2.0 and OIDC authentication anomalies to identify authorization code interception, token leakage, and refresh token abuse — distinguishing attacks from legitimate authentication flows.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify OAuth 2.0 authorization code interception attacks in logs",
    "Detect token leakage via referrer headers and redirect URI manipulation",
    "Distinguish malicious refresh token reuse from legitimate session extension",
  ],
  sortOrder: 540,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "oauth-001",
      title: "Authorization Code Interception via Redirect URI Manipulation",
      objective:
        "OAuth authorization logs show unusual redirect URI activity. Investigate whether an authorization code was intercepted.",
      investigationData: [
        {
          id: "auth-log",
          label: "OAuth Authorization Log",
          content:
            "Authorization request: client_id=mobile-app, redirect_uri=https://app.company.com/callback%23evil.com, scope=openid+profile+email, response_type=code. Note: URI contains fragment injection attempt (#evil.com). Authorization code issued: AC-847291",
          isCritical: true,
        },
        {
          id: "token-exchange",
          label: "Token Exchange Log",
          content:
            "Authorization code AC-847291 was exchanged for tokens at /token endpoint. Exchange successful. Client IP for exchange: 203.0.113.99 (Eastern Europe). Legitimate user's last known IP: 10.0.0.45 (corporate internal network).",
          isCritical: true,
        },
        {
          id: "pkce-check",
          label: "PKCE Implementation Check",
          content:
            "Token exchange request included code_verifier. However, code_challenge was NOT validated during the authorization request — PKCE is implemented on the client but the server doesn't enforce it.",
        },
        {
          id: "user-session",
          label: "User's Active Sessions",
          content:
            "User account now has two active sessions: Session A (internal IP, browser, normal activity) and Session B (Eastern European IP, API client, accessing user inbox and calendar data).",
        },
      ],
      actions: [
        {
          id: "REVOKE_ENFORCE_PKCE",
          label: "Revoke session B, enforce server-side PKCE, audit code issuance",
          color: "red",
        },
        {
          id: "REVOKE_ONLY",
          label: "Revoke the suspicious session only",
          color: "orange",
        },
        {
          id: "USER_RESET",
          label: "Force user password reset",
          color: "yellow",
        },
        {
          id: "MONITOR_SESSION",
          label: "Monitor session B — legitimate login from travel",
          color: "blue",
        },
      ],
      correctActionId: "REVOKE_ENFORCE_PKCE",
      rationales: [
        {
          id: "rat-code-stolen",
          text: "The authorization code was issued to an internal IP but exchanged from an Eastern European IP — classic code interception. The missing server-side PKCE enforcement is the root vulnerability. Revoke session B to stop the active breach, enforce PKCE server-side to prevent future interception, and audit whether other codes were stolen using the same technique.",
        },
        {
          id: "rat-revoke-insufficient",
          text: "Revoking the session without fixing the PKCE gap leaves the authorization endpoint vulnerable to future code interception attacks.",
        },
        {
          id: "rat-password-reset",
          text: "Password reset doesn't invalidate OAuth tokens already in circulation and doesn't fix the PKCE implementation gap.",
        },
        {
          id: "rat-monitor",
          text: "The code was authorized internally but exchanged externally — this is IP discrepancy indicates theft, not travel.",
        },
      ],
      correctRationaleId: "rat-code-stolen",
      feedback: {
        perfect: "Excellent analysis. The internal-to-external IP discrepancy on code exchange confirms interception. PKCE is the defense — but only if the server validates the code_challenge. Implement server-side PKCE enforcement as the durable fix.",
        partial: "You caught the breach but missed the root cause. Revoking the session alone lets future codes be stolen. Fix server-side PKCE validation.",
        wrong: "An authorization code exchanged from a completely different geographic IP than the user's known location is a clear interception indicator. This requires both session revocation and vulnerability patching.",
      },
    },
    {
      type: "investigate-decide",
      id: "oauth-002",
      title: "Access Token Leakage via Referrer Header",
      objective:
        "Security monitoring detected bearer tokens appearing in server access logs from third-party analytics. Investigate the token leakage.",
      investigationData: [
        {
          id: "log-evidence",
          label: "Third-Party Server Log",
          content:
            "analytics.thirdparty.com access log: GET /track.js HTTP/1.1 | Referer: https://app.company.com/dashboard?token=eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0... (full JWT visible in referrer header)",
          isCritical: true,
        },
        {
          id: "token-analysis",
          label: "Token Analysis",
          content:
            "JWT decoded: { sub: 'user123', scope: 'read write delete', exp: +24hours, iat: now }. Token is valid for 24 hours. Scope includes write and delete permissions.",
        },
        {
          id: "root-cause",
          label: "Root Cause Analysis",
          content:
            "The SPA passes tokens as URL query parameters for convenience. When users navigate to pages with analytics scripts, the full URL (including token) is sent as a Referer header to the analytics domain.",
          isCritical: true,
        },
        {
          id: "impact-scope",
          label: "Impact Scope",
          content:
            "Analytics script is loaded on all authenticated pages. Estimated 2,400 unique authenticated users have triggered the analytics request in the past 7 days, potentially leaking 2,400 active tokens to the analytics vendor.",
        },
      ],
      actions: [
        {
          id: "REVOKE_FIX_REFERRER",
          label: "Revoke all affected tokens, move tokens to headers, add Referrer-Policy",
          color: "red",
        },
        {
          id: "REMOVE_ANALYTICS",
          label: "Remove the analytics script immediately",
          color: "orange",
        },
        {
          id: "SHORTEN_EXPIRY",
          label: "Shorten token expiry to 15 minutes",
          color: "yellow",
        },
        {
          id: "NOTIFY_VENDOR",
          label: "Contact analytics vendor to delete logs",
          color: "blue",
        },
      ],
      correctActionId: "REVOKE_FIX_REFERRER",
      rationales: [
        {
          id: "rat-full-response",
          text: "The three-part response addresses the breach (revoke 2,400 exposed tokens), the architectural flaw (move tokens from URLs to Authorization headers — browsers never include headers in Referer), and the defense-in-depth control (Referrer-Policy: no-referrer-when-downgrade). This is a design pattern bug, not just a script problem.",
        },
        {
          id: "rat-remove-analytics",
          text: "Removing the analytics script stops further leakage but doesn't revoke already-exposed tokens valid for 24 hours.",
        },
        {
          id: "rat-short-expiry",
          text: "Shorter expiry reduces future exposure windows but doesn't address the 2,400 currently valid tokens already leaked.",
        },
        {
          id: "rat-vendor-only",
          text: "Vendor log deletion is a secondary action. Token revocation is the immediate priority.",
        },
      ],
      correctRationaleId: "rat-full-response",
      feedback: {
        perfect: "Complete response. Tokens in URL parameters always leak via Referer headers to third-party resources. Move to Authorization: Bearer headers (never sent in Referer), add Referrer-Policy as defense-in-depth, and revoke all exposed tokens.",
        partial: "You identified part of the solution. Removing the script or shortening expiry doesn't address the 2,400 already-leaked valid tokens. Full token revocation is required.",
        wrong: "The root cause is tokens in URL parameters — they always appear in Referer headers. Moving tokens to Authorization headers solves this permanently.",
      },
    },
    {
      type: "investigate-decide",
      id: "oauth-003",
      title: "Refresh Token Reuse Detection",
      objective:
        "OAuth server detected refresh token reuse. Determine if this represents an attack or a legitimate client issue.",
      investigationData: [
        {
          id: "token-log",
          label: "OAuth Token Log",
          content:
            "Refresh token RT-992847 used at 14:23:01 from IP 10.0.2.15 → New access token AT-001 issued. Same RT-992847 used again at 14:23:47 from IP 203.0.113.87 → System should have detected reuse and revoked all tokens in family.",
          isCritical: true,
        },
        {
          id: "revocation-status",
          label: "Token Revocation Status",
          content:
            "Refresh token rotation: ENABLED. Token family revocation on reuse: DISABLED. RT-992847 was NOT revoked after the second use. Both sessions remain active with different access tokens.",
        },
        {
          id: "client-behavior",
          label: "Legitimate Client Analysis",
          content:
            "Client app 'mobile-ios' has retry logic that may resend the refresh token request if the network times out. However, the 46-second gap between uses and the geographic IP change make a network retry extremely unlikely.",
        },
        {
          id: "session-activity",
          label: "Session Activity Comparison",
          content:
            "Session from 10.0.2.15 (internal): Normal user activity — email, calendar, documents. Session from 203.0.113.87 (external): Immediately accessed user's API tokens list and account security settings.",
          isCritical: true,
        },
      ],
      actions: [
        {
          id: "REVOKE_FAMILY_ENABLE",
          label: "Revoke entire token family, enable family revocation on reuse",
          color: "red",
        },
        {
          id: "REVOKE_EXTERNAL_ONLY",
          label: "Revoke only the external session",
          color: "orange",
        },
        {
          id: "FLAG_REVIEW",
          label: "Flag for security review but don't revoke — may be retry",
          color: "yellow",
        },
        {
          id: "FORCE_REAUTH",
          label: "Force the user to re-authenticate on all devices",
          color: "blue",
        },
      ],
      correctActionId: "REVOKE_FAMILY_ENABLE",
      rationales: [
        {
          id: "rat-token-theft",
          text: "Refresh token reuse from a different IP 46 seconds apart with the external session immediately targeting security settings is a clear token theft indicator. RFC 9700 recommends revoking the entire token family on detected reuse. Enabling family revocation prevents future attacks. Revoking only one session leaves the other potentially compromised.",
        },
        {
          id: "rat-external-only",
          text: "If the refresh token was stolen, the legitimate session's tokens are also part of the same compromised token family. Revoking only the external session may leave the attacker with other valid tokens from the family.",
        },
        {
          id: "rat-flag-only",
          text: "The external session immediately accessed security settings after token exchange — this is not a network retry behavior. Active investigation is needed, not passive flagging.",
        },
        {
          id: "rat-reauth",
          text: "Force re-authentication is correct but incomplete — it doesn't revoke the currently active token family, leaving the external session potentially active until token expiry.",
        },
      ],
      correctRationaleId: "rat-token-theft",
      feedback: {
        perfect: "Correct. RFC 9700 refresh token rotation with family revocation on reuse is the gold standard. The 46-second gap, geographic change, and immediate security settings access all confirm theft. Revoke the family and enable automatic revocation.",
        partial: "Revoking only one session misses the token family compromise. If a refresh token is stolen, all derived access tokens are potentially compromised.",
        wrong: "Refresh token reuse from a geographically different IP is a well-documented attack indicator. Passive flagging during active token abuse allows the attacker to exfiltrate data.",
      },
    },
  ],

  hints: [
    "Authorization codes should only be exchangeable from the same IP that requested them — IP discrepancy on exchange indicates code interception.",
    "Never pass OAuth tokens in URL query parameters — they appear in Referer headers, browser history, and server logs for any third-party resources.",
    "Refresh token reuse from a different IP requires revoking the entire token family, not just the suspicious session.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "OAuth 2.0 misconfigurations are responsible for major data breaches at large platforms. Understanding token lifecycle security is essential for identity engineers and application security professionals.",
  toolRelevance: [
    "OAuth 2.0 Debugger",
    "jwt.io (JWT analysis)",
    "PKCE Verifier",
    "Auth0 / Okta Security Logs",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
