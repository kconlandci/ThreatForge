import type { LabManifest } from "../../types/manifest";

export const shadowItDiscoveryLab: LabManifest = {
  schemaVersion: "1.1",
  id: "shadow-it-discovery",
  version: 1,
  title: "Shadow IT Discovery",

  tier: "intermediate",
  track: "blue-team-foundations",
  difficulty: "moderate",
  accessLevel: "free",
  tags: [
    "shadow-it",
    "saas-governance",
    "risk-assessment",
    "data-governance",
    "cloud-security",
    "compliance",
  ],

  description:
    "Discover and assess unauthorized SaaS applications and cloud services employees are using without IT approval. Classify risk levels, determine appropriate remediation strategies, and balance security with business productivity.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Classify shadow IT discoveries by risk severity based on data exposure and compliance impact",
    "Distinguish between shadow IT that should be onboarded versus blocked versus migrated",
    "Evaluate the security posture of unauthorized SaaS applications against organizational requirements",
    "Select remediation strategies that balance security enforcement with business enablement",
  ],
  sortOrder: 410,

  status: "published",
  prerequisites: [],

  rendererType: "triage-remediate",

  scenarios: [
    {
      type: "triage-remediate",
      id: "shadow-001",
      title: "Marketing Team Using Canva with SSO",
      description:
        "During a routine CASB audit, you discover that 14 marketing team members have been using Canva Pro with their corporate SSO credentials for the past 3 months. They are creating branded social media graphics and client presentations. The team lead set up the account using a corporate credit card and enabled SSO through the company's identity provider.",
      evidence: [
        { type: "CASB Log", content: "Canva Pro — 14 active users via corporate SSO — 3 months of usage — 847 design files created" },
        { type: "Data Classification", content: "Files contain brand assets, marketing copy, and stock images. No PII, financial data, or trade secrets detected." },
        { type: "Authentication", content: "SSO via Okta — MFA enforced — corporate email domain only" },
        { type: "Compliance", content: "Canva SOC 2 Type II certified. Data stored in US regions. GDPR DPA available." },
        { type: "Business Impact", content: "Marketing team reports 40% faster content production since adoption. Removing access would impact Q2 campaign deadlines." },
      ],
      classifications: [
        { id: "c-low", label: "Low Risk — Onboard", description: "The application poses minimal security risk and provides clear business value. Formal onboarding into the IT portfolio is appropriate." },
        { id: "c-moderate", label: "Moderate Risk — Restrict", description: "The application has some security concerns that require restrictions or additional controls before continued use." },
        { id: "c-critical", label: "Critical Risk — Block Immediately", description: "The application poses an unacceptable security risk and must be blocked regardless of business impact." },
      ],
      correctClassificationId: "c-low",
      remediations: [
        { id: "r-onboard", label: "Formally onboard into IT portfolio with governance controls", description: "Add Canva to the approved application list, establish an enterprise agreement, configure DLP policies, and assign an IT application owner." },
        { id: "r-block", label: "Block access and migrate to an approved design tool", description: "Revoke SSO access, block at the proxy level, and provide an alternative approved tool for the marketing team." },
        { id: "r-monitor", label: "Continue monitoring without formal action", description: "Leave the current setup in place and monitor through CASB without formalizing governance or controls." },
      ],
      correctRemediationId: "r-onboard",
      rationales: [
        { id: "rat-onboard", text: "The application uses corporate SSO with MFA, holds SOC 2 Type II certification, contains no sensitive data, and delivers measurable business value. Formal onboarding adds governance without disrupting productivity." },
        { id: "rat-block", text: "Blocking a low-risk, SOC 2 certified tool that 14 people depend on would damage IT credibility and slow business operations without a proportional security benefit." },
        { id: "rat-monitor", text: "Monitoring without governance leaves the organization without contractual protections, proper licensing, or DLP integration — creating compliance gaps over time." },
      ],
      correctRationaleId: "rat-onboard",
      feedback: {
        perfect:
          "Excellent. This is a textbook case for shadow IT onboarding. Canva has strong security certifications, the team implemented SSO correctly, and the data exposure is minimal. Formalizing governance adds enterprise controls while preserving the productivity gains the team has already demonstrated.",
        partial:
          "You assessed part of the situation correctly, but your response is disproportionate to the actual risk. Consider the full picture: SSO authentication, SOC 2 compliance, no sensitive data, and proven business value. Not all shadow IT is dangerous — some should be embraced with proper governance.",
        wrong:
          "Blocking or ignoring a well-implemented, SOC 2 certified tool with corporate SSO and no sensitive data is a misallocation of security resources. This approach damages the security team's credibility and pushes shadow IT further underground.",
      },
    },
    {
      type: "triage-remediate",
      id: "shadow-002",
      title: "Developer Using Personal AWS Account with Company Data",
      description:
        "A network monitoring alert flagged unusual data transfers to an AWS IP range not associated with your corporate AWS organization. Investigation reveals that a senior developer has been running a personal AWS account to prototype a machine learning model using production customer data. The developer says the corporate ML infrastructure request has been pending for 6 weeks.",
      evidence: [
        { type: "Network Log", content: "DLP alert: 2.3 GB outbound transfer to AWS IP 52.xx.xx.xx — not in corporate AWS CIDR range — destination account ID unknown" },
        { type: "Data Classification", content: "Transfer contains customer transaction records including names, email addresses, purchase history, and partial payment tokens." },
        { type: "Authentication", content: "Personal AWS account — root credentials — no MFA enabled — IAM best practices not followed" },
        { type: "Compliance", content: "Customer PII stored outside corporate data boundary. Potential GDPR Article 33 notification requirement. No DPA with personal account." },
        { type: "Developer Statement", content: "Frustrated by 6-week infrastructure provisioning delay. Claims data is 'anonymized' but DLP scan confirms PII fields are in cleartext." },
      ],
      classifications: [
        { id: "c-low", label: "Low Risk — Onboard", description: "The application poses minimal security risk and provides clear business value." },
        { id: "c-moderate", label: "Moderate Risk — Restrict", description: "The application has security concerns requiring restrictions before continued use." },
        { id: "c-critical", label: "Critical Risk — Immediate Containment", description: "Active data breach conditions exist. Customer PII is exposed outside corporate controls with no data processing agreement." },
      ],
      correctClassificationId: "c-critical",
      remediations: [
        { id: "r-contain", label: "Immediately revoke access, secure the data, and initiate breach assessment", description: "Block the developer's network access to the personal account, work with the developer to delete customer data from the personal AWS account, preserve audit logs, and engage legal for breach notification assessment." },
        { id: "r-migrate", label: "Fast-track corporate ML infrastructure and migrate the project", description: "Expedite the developer's infrastructure request and help them move the project to the corporate AWS environment with proper controls." },
        { id: "r-formalize", label: "Add the personal AWS account to the corporate organization", description: "Bring the personal account under corporate governance by adding it to the AWS Organization and applying security controls." },
      ],
      correctRemediationId: "r-contain",
      rationales: [
        { id: "rat-contain", text: "Customer PII in a personal AWS account with no MFA, no DPA, and no corporate oversight constitutes an active data exposure. Immediate containment and breach assessment take priority over the developer's project timeline." },
        { id: "rat-migrate", text: "Migration addresses the long-term need but does not address the immediate data exposure. Customer PII must be secured before any infrastructure planning." },
        { id: "rat-formalize", text: "A personal account with root credentials and customer PII cannot simply be absorbed into the corporate org — the data exposure must be contained and assessed first." },
      ],
      correctRationaleId: "rat-contain",
      feedback: {
        perfect:
          "Correct. This is a critical data exposure incident, not just a shadow IT governance issue. Customer PII in a personal AWS account with root credentials and no MFA creates immediate regulatory and breach notification obligations. Containment must precede any conversation about infrastructure improvements.",
        partial:
          "You identified some risk, but your response does not match the severity. Customer PII outside corporate controls with no data processing agreement is a potential reportable breach. Migration and governance improvements come after the immediate exposure is contained.",
        wrong:
          "This is not a low-risk situation. Customer PII including names, emails, and payment tokens is sitting in a personal AWS account with root credentials and no MFA. This requires immediate containment and legal engagement for breach assessment — not onboarding or gradual migration.",
      },
    },
    {
      type: "triage-remediate",
      id: "shadow-003",
      title: "Project Team Using Slack Free Tier",
      description:
        "A cross-functional project team of 22 people has been using a Slack free-tier workspace for 5 months to coordinate a product launch. The workspace contains project timelines, vendor communications, competitive analysis documents, and internal strategy discussions. Messages older than 90 days are no longer accessible due to the free tier's message history limits.",
      evidence: [
        { type: "CASB Discovery", content: "Slack workspace 'ProjectPhoenix' — 22 members — free tier — 5 months of activity — corporate email addresses used for registration" },
        { type: "Data Classification", content: "Workspace contains competitive intelligence, vendor pricing negotiations, product roadmap details, and internal strategy discussions." },
        { type: "Authentication", content: "Email/password authentication only. No SSO integration. No MFA enforced. 3 members have left the company but accounts remain active." },
        { type: "Retention", content: "Free tier limits: only last 90 days of messages accessible. Older messages containing vendor negotiations are no longer retrievable for compliance or legal hold." },
        { type: "Compliance", content: "Company retention policy requires 3-year preservation of business communications. Legal hold obligation exists for ongoing vendor dispute." },
      ],
      classifications: [
        { id: "c-low", label: "Low Risk — Onboard", description: "Minimal security risk with clear business value." },
        { id: "c-moderate", label: "Moderate Risk — Migrate with Controls", description: "The platform has authentication and retention gaps that create compliance exposure, but the collaboration need is legitimate." },
        { id: "c-critical", label: "Critical Risk — Block Immediately", description: "Unacceptable security risk requiring immediate shutdown." },
      ],
      correctClassificationId: "c-moderate",
      remediations: [
        { id: "r-migrate", label: "Migrate to corporate messaging platform with SSO, retention, and offboarding controls", description: "Move the team to the approved corporate collaboration tool (e.g., Microsoft Teams or Slack Enterprise Grid), enforce SSO and MFA, apply retention policies, and deactivate the free workspace after migration." },
        { id: "r-upgrade", label: "Upgrade the existing Slack workspace to a paid plan", description: "Purchase a Slack Business+ or Enterprise Grid license for the existing workspace and retroactively enable compliance features." },
        { id: "r-block", label: "Block Slack access immediately and direct the team to email", description: "Shut down the workspace, block Slack at the proxy, and instruct the team to use email for project coordination." },
      ],
      correctRemediationId: "r-migrate",
      rationales: [
        { id: "rat-migrate", text: "Migration to the corporate platform addresses all gaps simultaneously: SSO authentication, MFA enforcement, retention compliance, and automated offboarding. Upgrading the existing rogue workspace creates a governance precedent problem." },
        { id: "rat-upgrade", text: "Upgrading the existing workspace rewards policy circumvention and does not recover the 90+ days of messages already lost. It also leaves the workspace outside corporate administration." },
        { id: "rat-block", text: "Immediately blocking access disrupts a 22-person product launch and pushes the team to find yet another unauthorized tool. Migration preserves productivity while establishing proper controls." },
      ],
      correctRationaleId: "rat-migrate",
      feedback: {
        perfect:
          "Excellent. You correctly identified the moderate risk level — the authentication gaps and retention violations are serious but not an active breach. Migration to the corporate platform addresses SSO, MFA, retention, and offboarding in one move while preserving the team's collaboration workflow.",
        partial:
          "You identified some of the issues, but your approach either overreacts or underreacts to the situation. The lost message retention and ex-employee access are real compliance problems, but the team has a legitimate collaboration need that must be addressed, not just shut down.",
        wrong:
          "This situation has real compliance exposure — ex-employees with active access, lost messages under legal hold, and no authentication controls — but it is not an active data breach. Blocking 22 people mid-launch is disproportionate, while ignoring the gaps invites regulatory penalties.",
      },
    },
  ],

  hints: [
    "Not all shadow IT is malicious. Evaluate the actual data exposure and compliance impact before deciding on severity — some unauthorized tools should be onboarded, not blocked.",
    "Authentication posture is a key risk indicator. Corporate SSO with MFA is vastly different from email/password with no second factor.",
    "Consider whether your remediation rewards or discourages policy circumvention. Upgrading a rogue tool sends a different message than migrating to the approved platform.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Shadow IT is one of the fastest-growing risk categories in enterprise security. Gartner estimates that 30-40% of IT spending occurs outside the IT department's control. Security teams that default to blocking everything lose credibility. The best practitioners triage shadow IT by actual risk and work to onboard valuable tools with proper governance.",
  toolRelevance: [
    "Netskope / Microsoft Defender for Cloud Apps (CASB)",
    "Okta / Azure AD (Identity Governance)",
    "Oomnitza / Productiv (SaaS Management)",
    "Varonis (Data Governance)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
