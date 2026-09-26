/**
 * Test registry: every pathway bundle the per-pathway suites run over (describe.each), and what
 * each one must satisfy. Tests only.
 */
import type { CardId, StepCategory } from "@/lib/game/types";
import type { LivePathwayId } from "@/lib/types";
import { BUSINESS_ANALYST } from "./business-analyst";
import { CLOUD_NETWORK } from "./cloud-network";
import { CYBERSECURITY } from "./cybersecurity";
import { FULL_STACK } from "./full-stack";
import { HELP_DESK } from "./help-desk";
import type { PathwayBundle } from "./types";

export const TEST_PATHWAYS: PathwayBundle[] = [HELP_DESK, CYBERSECURITY, CLOUD_NETWORK, FULL_STACK, BUSINESS_ANALYST];

export interface PathwayExpectations {
  idPrefix: string;
  practiceId: string;
  storyId: string;
  agentName: string;
  coachName: string;
  categories: StepCategory[];
  companies: string[];
  policyCard: CardId;
  /** Story plans the policy card inspects (at least). */
  policyMinStory: number;
  /** Bank plans the policy card inspects (at least). */
  policyMinBank: number;
  bankIdRe: RegExp;
  /** Every fixed step id starts with this (null: no rule). */
  fixedStepPrefix: string | null;
  hub: { battle: string; talk: string; looks: string[]; boardCode: string };
  /** The look target with skillsLink. */
  skillsLink: string;
  /** Phrases no copy may contain. */
  banned: RegExp[];
  letItRe: RegExp;
  /**
   * The words the balance bot "block every plan with a scary verb" looks for (default: the SOC's
   * list in pathway.test.ts). Cloud plans scare with other verbs (scale, fail over, reboot).
   */
  scaryRe?: RegExp;
  requireDirection: boolean;
  requireExample: boolean;
  requireQuestionHints: boolean;
  requireCoachScript: boolean;
  /** shift.json must carry its own settingDaily / settingDrill / careerInsight / fallbackDaily. */
  requireShiftTemplates: boolean;
  /** Every IPv4 in the content is in 192.0.2.x, 198.51.100.x, 203.0.113.x or 10.x. */
  ipRule: boolean;
  /** A plan's intent never uses a card or button word. */
  cardWordIntent: boolean;
  /** All plans of one bank ticket share one ticket string (the help desk's queue-cleanup ticket spans several). */
  sameTicketString: boolean;
  /** No weekday names in the bank and shift.json. */
  noWeekdaysInBank: boolean;
  /** Run the SOC balance bots (scary-verb blocker, Close/Mute blocker): neither may earn 3 stars. */
  socBots: boolean;
  /** All 9 headline pools in pathway.json (each line at most 70 characters). */
  requireHeadlines: boolean;
  mix: {
    safeMin: number;
    safeMax: number;
    scarySafeMin: number;
    routineRiskyMin: number;
    perSkillSafe: number;
    perSkillRisky: number;
    /** Both directions at least this many (0: no rule). */
    directionsMin: number;
    /** Safe bank plans with a "Patch's reason"-style row (0: no rule). */
    safeReasonMin: number;
    /** Reason rows on risky plans, as a share of all reason rows (1: no rule). */
    riskyReasonShareMax: number;
    /** |mean evidence rows safe - risky| (Infinity: no rule). */
    meanRowsDiffMax: number;
    /** Per writer letter: safe and risky plans with "<agent>'s confidence: NN%" in a non-red row (0: no rule). */
    confidencePerWriter: number;
  };
}

/** Copy rules for every pathway. */
const BANNED_CLAIMS = [/placement rate/i, /\bISO\b/, /\bWIOA\b/, /guarantee/i, /certif/i, /\bhired\b/i];

/** Real security vendors, products, threat groups and malware: never in cyber content. */
export const CYBER_BRANDS =
  /\b(CrowdStrike|SentinelOne|Okta|Duo|Microsoft|Defender|Azure|Entra|Google|Gmail|VirusTotal|MITRE|Splunk|Palo Alto|Cisco|Cloudflare|Akamai|Fortinet|Proofpoint|Mimecast|LockBit|Conti|REvil|Emotet|Cobalt Strike|Kitewire|Kiteworks)\b|\bAPT ?\d+/;

/** Real cloud providers, network vendors, CDNs, tools, registrars and VPN products: never in cloud content. */
export const CLOUD_BRANDS =
  /\b(AWS|Amazon|EC2|S3|Azure|Microsoft|Google|GCP|Oracle|IBM|DigitalOcean|Linode|Heroku|Rackspace|Hetzner|Vultr|Cisco|Meraki|Juniper|Arista|Aruba|Ubiquiti|UniFi|Netgear|Fortinet|FortiGate|Palo Alto|SonicWall|Zscaler|Cloudflare|Akamai|Fastly|VMware|vSphere|Terraform|Kubernetes|Docker|Ansible|Datadog|Grafana|PagerDuty|SolarWinds|Veeam|ServiceNow|Jira|DigiCert|GoDaddy|Route 53|CloudWatch|WireGuard|OpenVPN|Let's Encrypt)\b/;

/**
 * Real code hosts, package registries, frameworks, databases, dev tools and AI coding products: never
 * in full-stack content. Case-sensitive on purpose. Brands that are plain English words (Express, Rails,
 * Spring, Flask, Render, Cursor, Teams, Zoom, Vault, Swift) are a writer rule, not entries here.
 */
export const DEV_BRANDS =
  /\b(GitHub|GitLab|Bitbucket|Git|npm|NPM|Yarn|pnpm|PyPI|Stack ?Overflow|Vercel|Netlify|Stripe|Twilio|SendGrid|Mailchimp|Slack|Trello|Asana|Sentry|New Relic|LaunchDarkly|Snyk|Dependabot|Jenkins|CircleCI|React|Angular|Vue|Svelte|Next\.js|Node\.js|Deno|Django|Laravel|Postgres|PostgreSQL|MySQL|MongoDB|Redis|Firebase|Supabase|Auth0|Copilot|ChatGPT|OpenAI|Anthropic|Claude|Gemini|Jules|Postman|VS Code|Visual Studio|IntelliJ|Chrome|Firefox|Safari|Jest|Cypress|Playwright|Selenium|Vitest|Webpack|HashiCorp|Figma)\b/;

/**
 * Real BI, spreadsheet, survey, CRM, data-warehouse, office and business apps: never in business
 * analyst content. Case-sensitive on purpose. Google, Microsoft, AWS, Jira, Slack, ChatGPT and the like
 * are already in CYBER/CLOUD/DEV_BRANDS. Brands that are plain English words (Word, Teams, Zoom,
 * Outlook, Sheets, Forms, Notion, Keynote, Numbers, Workday, Mode) are a writer rule, not entries here.
 */
export const BA_BRANDS =
  /\b(Excel|Tableau|Power BI|Power Query|Looker|Qlik|Salesforce|HubSpot|Zoho|Pipedrive|Marketo|Qualtrics|SurveyMonkey|Typeform|Snowflake|Databricks|BigQuery|Redshift|Alteryx|Domo|Sisense|Metabase|Mixpanel|Hotjar|Smartsheet|Airtable|Confluence|Zendesk|Freshdesk|PowerPoint|Visio|Lucidchart|Miro|SPSS|Stata|Minitab|QuickBooks|NetSuite|Calendly|Zocdoc|Dentrix|Eaglesoft|NexHealth|Samsara|FourKites|SAP)\b/;

export const EXPECT: Record<LivePathwayId, PathwayExpectations> = {
  "help-desk": {
    idPrefix: "hd",
    practiceId: "hd-00-practice",
    storyId: "hd-01-monday",
    agentName: "Ollie",
    coachName: "Dana",
    categories: ["lookup", "credential", "comms", "ticket", "access", "data"],
    companies: ["Harlow & Cole", "Bramwell Logistics", "Pinecrest Dental"],
    policyCard: "policy-callback",
    policyMinStory: 2,
    policyMinBank: 4,
    bankIdRe: /^[abc]-[a-z0-9]+(-[a-z0-9]+)*$/,
    fixedStepPrefix: null,
    hub: { battle: "ollie", talk: "dana", looks: ["whiteboard", "coffee", "printer"], boardCode: "VP-04" },
    skillsLink: "whiteboard",
    banned: BANNED_CLAIMS,
    letItRe: /let (it|Ollie|Patch|Nimbus|Piper|Quill) (proceed|run)/i,
    requireDirection: false,
    requireExample: false,
    requireQuestionHints: false,
    requireCoachScript: false,
    requireShiftTemplates: false,
    ipRule: false,
    cardWordIntent: false,
    sameTicketString: false,
    noWeekdaysInBank: true,
    socBots: false,
    requireHeadlines: false,
    mix: {
      safeMin: 0.55,
      safeMax: 0.65,
      scarySafeMin: 6,
      routineRiskyMin: 8,
      perSkillSafe: 3,
      perSkillRisky: 2,
      directionsMin: 0,
      safeReasonMin: 0,
      riskyReasonShareMax: 1,
      meanRowsDiffMax: Infinity,
      confidencePerWriter: 0,
    },
  },
  cybersecurity: {
    idPrefix: "cy",
    practiceId: "cy-00-practice",
    storyId: "cy-01-friday",
    agentName: "Patch",
    coachName: "Kofi",
    categories: ["lookup", "credential", "comms", "ticket", "data", "endpoint", "network"],
    companies: ["Harlow & Cole", "Bramwell Logistics", "Pinecrest Dental"],
    policyCard: "policy-look-first",
    policyMinStory: 2,
    policyMinBank: 4,
    bankIdRe: /^cy-[ab]-[a-z0-9]+(-[a-z0-9]+)*$/,
    fixedStepPrefix: "cy-",
    hub: { battle: "patch", talk: "kofi", looks: ["board", "coffee", "locker"], boardCode: "CT-01" },
    skillsLink: "board",
    banned: [...BANNED_CLAIMS, CYBER_BRANDS],
    letItRe: /let (it|Ollie|Patch|Nimbus|Piper|Quill) (proceed|run)/i,
    requireDirection: true,
    requireExample: true,
    requireQuestionHints: true,
    requireCoachScript: true,
    requireShiftTemplates: true,
    ipRule: true,
    cardWordIntent: true,
    sameTicketString: true,
    noWeekdaysInBank: true,
    socBots: true,
    requireHeadlines: true,
    mix: {
      safeMin: 0.55,
      safeMax: 0.65,
      scarySafeMin: 6,
      routineRiskyMin: 8,
      perSkillSafe: 3,
      perSkillRisky: 3,
      directionsMin: 6,
      safeReasonMin: 8,
      riskyReasonShareMax: 0.65,
      meanRowsDiffMax: 0.5,
      confidencePerWriter: 2,
    },
  },
  "cloud-network": {
    idPrefix: "cn",
    practiceId: "cn-00-practice",
    storyId: "cn-01-tuesday",
    agentName: "Nimbus",
    coachName: "Nadia",
    categories: ["lookup", "credential", "comms", "ticket", "access", "data", "network", "cloud"],
    companies: ["Harlow & Cole", "Bramwell Logistics", "Pinecrest Dental"],
    policyCard: "policy-change-window",
    policyMinStory: 2,
    policyMinBank: 12,
    bankIdRe: /^cn-[ab]-[a-z0-9]+(-[a-z0-9]+)*$/,
    fixedStepPrefix: "cn-",
    hub: { battle: "nimbus", talk: "nadia", looks: ["board", "coffee", "cart"], boardCode: "CW-01" },
    skillsLink: "board",
    banned: [...BANNED_CLAIMS, CYBER_BRANDS, CLOUD_BRANDS],
    letItRe: /let (it|Ollie|Patch|Nimbus|Piper|Quill) (proceed|run)/i,
    scaryRe: /\b(delete|remove|reboot|restart|fail ?over|scale|stop|shut|turn off|deny|disable|wipe|purge)\b/i,
    requireDirection: true,
    requireExample: true,
    requireQuestionHints: true,
    requireCoachScript: true,
    requireShiftTemplates: true,
    ipRule: true,
    cardWordIntent: true,
    sameTicketString: true,
    noWeekdaysInBank: true,
    socBots: true,
    requireHeadlines: true,
    mix: {
      safeMin: 0.55,
      safeMax: 0.65,
      scarySafeMin: 6,
      routineRiskyMin: 8,
      perSkillSafe: 3,
      perSkillRisky: 3,
      directionsMin: 6,
      safeReasonMin: 8,
      riskyReasonShareMax: 0.65,
      meanRowsDiffMax: 0.5,
      confidencePerWriter: 2,
    },
  },
  "full-stack": {
    idPrefix: "fs",
    practiceId: "fs-00-practice",
    storyId: "fs-01-thursday",
    agentName: "Piper",
    coachName: "Leo",
    categories: ["lookup", "credential", "comms", "ticket", "access", "data", "code"],
    companies: ["Harlow & Cole", "Bramwell Logistics", "Pinecrest Dental"],
    policyCard: "policy-code-review",
    policyMinStory: 2,
    policyMinBank: 12,
    bankIdRe: /^fs-[ab]-[a-z0-9]+(-[a-z0-9]+)*$/,
    fixedStepPrefix: "fs-",
    hub: { battle: "piper", talk: "leo", looks: ["board", "coffee", "box"], boardCode: "CR-01" },
    skillsLink: "board",
    banned: [...BANNED_CLAIMS, CYBER_BRANDS, CLOUD_BRANDS, DEV_BRANDS],
    letItRe: /let (it|Ollie|Patch|Nimbus|Piper|Quill) (proceed|run)/i,
    scaryRe: /\b(delete|remove|drop|revert|rotate|disable|turn off|wipe|purge|force|kill|shut|lock|replace)\b/i,
    requireDirection: true,
    requireExample: true,
    requireQuestionHints: true,
    requireCoachScript: true,
    requireShiftTemplates: true,
    ipRule: true,
    cardWordIntent: true,
    sameTicketString: true,
    noWeekdaysInBank: true,
    socBots: true,
    requireHeadlines: true,
    mix: {
      safeMin: 0.55,
      safeMax: 0.65,
      scarySafeMin: 6,
      routineRiskyMin: 8,
      perSkillSafe: 3,
      perSkillRisky: 3,
      directionsMin: 6,
      safeReasonMin: 8,
      riskyReasonShareMax: 0.65,
      meanRowsDiffMax: 0.5,
      confidencePerWriter: 2,
    },
  },
  "business-analyst": {
    idPrefix: "ba",
    practiceId: "ba-00-practice",
    storyId: "ba-01-wednesday",
    agentName: "Quill",
    coachName: "Marisol",
    categories: ["lookup", "comms", "ticket", "access", "data", "report"],
    companies: ["Harlow & Cole", "Bramwell Logistics", "Pinecrest Dental", "Fenwick IT Solutions"],
    policyCard: "policy-source-check",
    policyMinStory: 2,
    policyMinBank: 12,
    bankIdRe: /^ba-[ab]-[a-z0-9]+(-[a-z0-9]+)*$/,
    fixedStepPrefix: "ba-",
    hub: { battle: "quill", talk: "marisol", looks: ["board", "coffee", "cabinet"], boardCode: "SC-01" },
    skillsLink: "board",
    // "quill-bot" would spell a real AI writing app.
    banned: [...BANNED_CLAIMS, CYBER_BRANDS, CLOUD_BRANDS, DEV_BRANDS, BA_BRANDS, /quill-?bot/i, /castle fo+(ds|rs)|glimmer(line|net)/i],
    letItRe: /let (it|Ollie|Patch|Nimbus|Piper|Quill) (proceed|run)/i,
    scaryRe: /\b(delete|remove|merge|unpublish|archive|turn off|stop|pause|drop|cancel|wipe|purge|take down)\b/i,
    requireDirection: true,
    requireExample: true,
    requireQuestionHints: true,
    requireCoachScript: true,
    requireShiftTemplates: true,
    ipRule: true,
    cardWordIntent: true,
    sameTicketString: true,
    noWeekdaysInBank: true,
    socBots: true,
    requireHeadlines: true,
    mix: {
      safeMin: 0.55,
      safeMax: 0.65,
      scarySafeMin: 6,
      routineRiskyMin: 8,
      perSkillSafe: 3,
      perSkillRisky: 3,
      directionsMin: 6,
      safeReasonMin: 8,
      riskyReasonShareMax: 0.65,
      meanRowsDiffMax: 0.5,
      confidencePerWriter: 2,
    },
  },
};

export function expectFor(bundle: PathwayBundle): PathwayExpectations {
  return EXPECT[bundle.id];
}
