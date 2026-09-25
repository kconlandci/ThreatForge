/**
 * Test registry: every pathway bundle the per-pathway suites run over (describe.each), and what
 * each one must satisfy. Tests only. The integrator appends CYBERSECURITY to TEST_PATHWAYS once
 * lib/pathways/cybersecurity exists; its expectations are already filled in below.
 */
import type { CardId, StepCategory } from "@/lib/game/types";
import type { LivePathwayId } from "@/lib/types";
import { HELP_DESK } from "./help-desk";
import type { PathwayBundle } from "./types";

export const TEST_PATHWAYS: PathwayBundle[] = [HELP_DESK];

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
  /\b(CrowdStrike|SentinelOne|Okta|Duo|Microsoft|Defender|Azure|Entra|Google|Gmail|VirusTotal|MITRE|Splunk|Palo Alto|Cisco|Cloudflare|Akamai|Fortinet|Proofpoint|Mimecast|LockBit|Conti|REvil|Emotet|Cobalt Strike)\b|\bAPT ?\d+/;

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
    letItRe: /let (it|Ollie|Patch) (proceed|run)/i,
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
    letItRe: /let (it|Ollie|Patch) (proceed|run)/i,
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
