import type { LabManifest } from "../../types/manifest";

export const ssoAuthenticationHardeningLab: LabManifest = {
  schemaVersion: "1.1",
  id: "sso-authentication-hardening",
  version: 1,
  title: "SSO Authentication Hardening",

  tier: "intermediate",
  track: "identity-access",
  difficulty: "moderate",
  accessLevel: "premium",
  tags: [
    "sso",
    "saml",
    "oauth2",
    "azure-ad",
    "authentication",
    "identity",
    "mfa",
    "conditional-access",
  ],

  description:
    "Audit and harden SSO configurations across SAML, OAuth2, and Azure AD environments. Fix misconfigurations that enable authentication bypass, token theft, and identity attacks.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Identify common SSO and SAML misconfigurations",
    "Apply OAuth2 security best practices including PKCE",
    "Harden Azure AD tenant configurations for production use",
    "Understand the security implications of legacy authentication protocols",
    "Configure appropriate session management and token lifetimes",
  ],
  sortOrder: 260,

  status: "published",
  prerequisites: [],

  rendererType: "toggle-config",

  scenarios: [
    {
      type: "toggle-config",
      id: "sso-001",
      title: "SAML Identity Provider Security Audit",
      description:
        "Penetration test finding: your SAML IdP configuration has multiple weaknesses that could allow authentication bypass. Review and harden.",
      targetSystem: "Okta SAML IdP — Production SSO",
      items: [
        {
          id: "assertion-audience",
          label: "Assertion Audience",
          detail:
            "Controls which service providers (relying parties) can accept SAML assertions issued by this IdP.",
          currentState: "Any relying party accepted",
          correctState: "Restricted to registered SP entity IDs only",
          states: [
            "Any relying party accepted",
            "Restricted to registered SP entity IDs only",
          ],
          rationaleId: "rat-audience",
        },
        {
          id: "sig-verification",
          label: "Signature Verification",
          detail:
            "Determines whether SAML assertions and responses are cryptographically signed to prevent tampering.",
          currentState: "Assertions not signed",
          correctState: "Require signed assertions + signed responses",
          states: [
            "Assertions not signed",
            "Signed assertions only",
            "Require signed assertions + signed responses",
          ],
          rationaleId: "rat-signatures",
        },
        {
          id: "session-timeout",
          label: "Session Timeout",
          detail:
            "The maximum duration of a SAML session before re-authentication is required.",
          currentState: "24 hours",
          correctState: "8 hours with re-auth for sensitive apps",
          states: [
            "24 hours",
            "8 hours with re-auth for sensitive apps",
            "1 hour",
          ],
          rationaleId: "rat-session",
        },
        {
          id: "nameid-format",
          label: "NameID Format",
          detail:
            "The format used to identify the authenticated user in SAML assertions sent to service providers.",
          currentState: "Email (unencrypted)",
          correctState: "Persistent pseudonymous ID (encrypted)",
          states: [
            "Email (unencrypted)",
            "Persistent pseudonymous ID (encrypted)",
            "Transient ID",
          ],
          rationaleId: "rat-nameid",
        },
      ],
      rationales: [
        {
          id: "rat-audience",
          text: "Unrestricted audience allows any application to accept your IdP's assertions — restrict to known service providers only to prevent assertion replay attacks.",
        },
        {
          id: "rat-signatures",
          text: "Unsigned assertions can be tampered with in transit — both assertion and response signatures provide defense-in-depth against SAML manipulation attacks.",
        },
        {
          id: "rat-session",
          text: "24-hour sessions increase the window for session hijacking — 8 hours balances security with usability, and step-up re-auth for sensitive apps adds protection where it matters most.",
        },
        {
          id: "rat-nameid",
          text: "Email-based NameID leaks identity information and enables correlation across services — pseudonymous IDs protect privacy while maintaining persistent identity mapping.",
        },
      ],
      feedback: {
        perfect:
          "SAML configuration hardened against common authentication bypass attacks.",
        partial:
          "Some SAML settings still have weaknesses. Each misconfiguration creates a potential authentication bypass.",
        wrong:
          "Multiple critical SAML misconfigurations. These could allow attackers to forge authentication assertions.",
      },
    },
    {
      type: "toggle-config",
      id: "sso-002",
      title: "OAuth2 Client Security Hardening",
      description:
        "The mobile app's OAuth2 client uses deprecated flows and insecure token management. Audit and fix the configuration.",
      targetSystem: "ThreatForge Mobile App — OAuth2 Client",
      items: [
        {
          id: "grant-type",
          label: "Grant Type",
          detail:
            "The OAuth2 authorization flow used by the mobile application to obtain access tokens.",
          currentState: "Implicit flow (token in URL fragment)",
          correctState: "Authorization code with PKCE",
          states: [
            "Implicit flow (token in URL fragment)",
            "Authorization code with PKCE",
            "Client credentials",
          ],
          rationaleId: "rat-grant-type",
        },
        {
          id: "redirect-uri",
          label: "Redirect URI",
          detail:
            "How the OAuth2 authorization server validates redirect URIs provided during the authorization request.",
          currentState: "Wildcard matching (*.acmecorp.com)",
          correctState: "Exact URI matching",
          states: [
            "Wildcard matching (*.acmecorp.com)",
            "Exact URI matching",
          ],
          rationaleId: "rat-redirect",
        },
        {
          id: "refresh-token-expiry",
          label: "Refresh Token Expiry",
          detail:
            "The maximum lifetime of refresh tokens before they must be reissued through a new authorization flow.",
          currentState: "Never expires",
          correctState: "30-day absolute expiry with rotation",
          states: [
            "Never expires",
            "30-day absolute expiry with rotation",
            "24-hour expiry",
          ],
          rationaleId: "rat-refresh",
        },
        {
          id: "access-token-lifetime",
          label: "Access Token Lifetime",
          detail:
            "How long an access token remains valid before the client must use a refresh token to obtain a new one.",
          currentState: "24 hours",
          correctState: "15 minutes",
          states: ["24 hours", "1 hour", "15 minutes"],
          rationaleId: "rat-access-lifetime",
        },
      ],
      rationales: [
        {
          id: "rat-grant-type",
          text: "Implicit flow exposes tokens in URLs and browser history — authorization code with PKCE is the recommended flow for all client types including mobile and single-page applications.",
        },
        {
          id: "rat-redirect",
          text: "Wildcard redirect URIs allow open redirect attacks that can steal authorization codes — exact matching prevents attackers from redirecting auth codes to malicious endpoints.",
        },
        {
          id: "rat-refresh",
          text: "Non-expiring refresh tokens are persistent credentials — 30-day absolute expiry with rotation limits the damage window if a token is stolen while maintaining a good user experience.",
        },
        {
          id: "rat-access-lifetime",
          text: "Short-lived access tokens (15 min) limit the usefulness of stolen tokens — combine with refresh token rotation for security without requiring frequent re-authentication.",
        },
      ],
      feedback: {
        perfect:
          "OAuth2 client properly secured with modern best practices.",
        partial:
          "Some OAuth2 settings still need fixing. Each weakness creates a token theft or session hijacking opportunity.",
        wrong:
          "Multiple critical OAuth2 weaknesses. Implicit flow with wildcard redirects is a recipe for credential theft.",
      },
    },
    {
      type: "toggle-config",
      id: "sso-003",
      title: "Azure AD Tenant Security Baseline",
      description:
        "Your organization recently migrated to Azure AD. The default tenant configuration needs hardening before going into production.",
      targetSystem: "Azure AD Tenant: acmecorp.onmicrosoft.com",
      items: [
        {
          id: "guest-access",
          label: "Guest Access",
          detail:
            "Controls what external guest users can see and access in the Azure AD directory.",
          currentState: "Unrestricted (guests can see all users and groups)",
          correctState: "Restricted to assigned resources only",
          states: [
            "Unrestricted (guests can see all users and groups)",
            "Restricted to assigned resources only",
            "Blocked entirely",
          ],
          rationaleId: "rat-guest",
        },
        {
          id: "group-creation",
          label: "Self-Service Group Creation",
          detail:
            "Determines whether all users or only administrators can create new Azure AD security and Microsoft 365 groups.",
          currentState: "All users can create groups",
          correctState: "Restricted to designated administrators",
          states: [
            "All users can create groups",
            "Restricted to designated administrators",
          ],
          rationaleId: "rat-groups",
        },
        {
          id: "legacy-auth",
          label: "Legacy Authentication",
          detail:
            "Controls whether legacy authentication protocols (SMTP, IMAP, POP3) that don't support MFA are allowed.",
          currentState: "Allowed (SMTP, IMAP, POP3)",
          correctState: "Blocked via Conditional Access",
          states: [
            "Allowed (SMTP, IMAP, POP3)",
            "Blocked via Conditional Access",
          ],
          rationaleId: "rat-legacy",
        },
        {
          id: "conditional-access",
          label: "Conditional Access",
          detail:
            "The Conditional Access policies applied to control authentication requirements based on user, device, and risk context.",
          currentState: "No policies configured",
          correctState: "MFA required for all users + risk-based policies",
          states: [
            "No policies configured",
            "MFA required for all users + risk-based policies",
            "MFA for admins only",
          ],
          rationaleId: "rat-conditional",
        },
      ],
      rationales: [
        {
          id: "rat-guest",
          text: "Unrestricted guest access exposes your directory structure to external users — limit to specific resources they need to prevent reconnaissance and data leakage.",
        },
        {
          id: "rat-groups",
          text: "Self-service group creation leads to shadow IT and permission sprawl — restrict to admins who follow naming conventions and access review processes.",
        },
        {
          id: "rat-legacy",
          text: "Legacy auth protocols don't support MFA and are the primary vector for password spray attacks — block them via Conditional Access to enforce modern authentication.",
        },
        {
          id: "rat-conditional",
          text: "Conditional Access with MFA for all users is the single most effective control against account compromise. Risk-based policies add adaptive protection without impacting low-risk sessions.",
        },
      ],
      feedback: {
        perfect:
          "Azure AD tenant hardened to security baseline. These controls prevent the most common cloud identity attacks.",
        partial:
          "Some tenant settings still have gaps. Azure AD defaults prioritize convenience over security.",
        wrong:
          "Multiple tenant misconfigurations. Default Azure AD settings are not production-ready without hardening.",
      },
    },
  ],

  hints: [
    "SAML assertions without signatures can be tampered with in transit. Always require both assertion and response signatures.",
    "The implicit OAuth2 flow is deprecated for security reasons — authorization code with PKCE is the standard for all client types.",
    "Azure AD's default settings prioritize ease of use, not security. Blocking legacy auth and enabling Conditional Access are the two highest-impact changes.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Identity and access management (IAM) is the fastest-growing cybersecurity specialty. Cloud identity platforms like Azure AD, Okta, and Auth0 require specialized configuration knowledge that few security teams possess.",
  toolRelevance: [
    "Okta / Azure AD (Identity Providers)",
    "Auth0 (OAuth2/OIDC platform)",
    "Conditional Access Policies",
    "SAML Tracer (browser extension for debugging)",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
