import type { PathwayId } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

export type CardId =
  | "inspect"
  | "block"
  | "escalate"
  | "rollback"
  | "policy-callback"
  | "policy-look-first"
  | "policy-change-window"
  | "policy-code-review"
  | "policy-source-check"
  | "coffee";

/** What a card is played on. */
export type CardTarget =
  /** One of the agent's announced intents this turn. */
  | "intent"
  /** A step the agent already executed (and that is reversible). */
  | "executed"
  /** No target. */
  | "none";

export interface CardDef {
  id: CardId;
  name: string;
  cost: number;
  kind: "skill" | "power";
  target: CardTarget;
  /** Rules text, one short sentence. */
  text: string;
  /** Shorter rules text for a card partly covered by its neighbour in the fan (the full text is in the prompt). */
  short?: string;
  /** Joke line shown small under the rules text. */
  flavor: string;
  /** Removed for the rest of the battle once played. */
  exhaust?: boolean;
  /** lucide-react icon name used by the UI, e.g. "Search". */
  icon: string;
  /**
   * A policy card: while it is on (powers.callbackPolicy), announced plans in these categories are
   * inspected automatically. An encounter holds at most one policy card (see engine policyCardOf).
   */
  autoInspect?: StepCategory[];
  /** The refusal when a policy card is played while its policy is already on. */
  alreadyOn?: string;
  /** A policy card: the toast (title, text) and battle log line when the player turns it on. */
  policyOn?: { title: string; text: string; log: string };
}

/* ------------------------------------------------------------------ */
/* Encounter content (authored as JSON in /content)                    */
/* ------------------------------------------------------------------ */

/** Per pathway, content/<id>/pathway.json "categories" lists the ones its content may use. */
export type StepCategory = "lookup" | "credential" | "comms" | "ticket" | "access" | "data" | "endpoint" | "network" | "cloud" | "code" | "report";

/** Lens skills: each help desk step is tagged with the one skill it tests (authored). */
export type SkillId =
  | "verify-identity"
  | "check-approval"
  | "match-request"
  | "confirm-fix"
  | "guard-data"
  | "safe-change";
/** Lens skills plus the calibration skill "approve what checks out" (computed, never authored). */
export type MasterySkillId = SkillId | "approve-checked";
/** The coach's three questions, shared by every pathway: Who asked? / Does it match the record? / Can we undo it? */
export type CheckQuestion = "who" | "record" | "undo";
/** @deprecated Use CheckQuestion. */
export type DanaQuestion = CheckQuestion;
/** Hidden generator and analytics tag. Never shown before a plan resolves; the coach never reads it. */
export type StepTwist = "scary-safe" | "routine-risky";
/** Hidden tag on a risky plan: the agent does too much ("over") or trusts too much ("under"). */
export type StepDirection = "over" | "under";

export interface Evidence {
  label: string;
  detail: string;
  /** Used for the debrief ("what gave it away"); never shown as a flag before resolution. */
  redFlag: boolean;
}

export interface DialogueLine {
  /** "coach" is the pathway's lead (Dana on the help desk). */
  speaker: "coach" | "agent" | "narrator";
  text: string;
}

/** One action the AI agent intends to take. */
export interface AgentStep {
  id: string;
  /** Ticket reference shown on the intent, e.g. "#51876 · Harlow & Cole". */
  ticket: string;
  /** Short action label, e.g. "Reset MFA for J. Romero (CFO)". */
  intent: string;
  /** The agent's line, in its voice, when it announces this intent. */
  quip: string;
  category: StepCategory;
  /** Ground truth: is it OK to let this happen? */
  safe: boolean;
  /** Can Rollback undo it after it executed? (An email that was sent cannot be unsent.) */
  reversible: boolean;
  /**
   * Optional text for the evidence sheet's "Can we undo it?" row, shown instead of the default
   * answer. For plans that change nothing (a phone call, a config copy), where "No, it can't be
   * undone" would read like a red flag. Only cloud, full-stack and business-analyst content set it.
   */
  undoNote?: string;
  /** Work credit when a safe step gets done (executed or escalated). */
  progress: number;
  /** Risk added when an unsafe step executes. */
  risk: number;
  /** Revealed by Inspect. Ordered from least to most telling. */
  evidence: Evidence[];
  /** Player-facing result text for each resolution. */
  outcome: { executed: string; blocked: string; escalated: string; rolledBack?: string };
  /** One sentence for the debrief: why this was fine / not fine. */
  lesson: string;
  /** The lens skill this plan tests (content tests require it on every help desk step). */
  skill?: SkillId;
  /** At most 80 characters: the one fact that decided it. Shown only after the plan resolves. */
  tell?: string;
  twist?: StepTwist;
  /** Risky plans only (required in cybersecurity content). Hidden like twist; the coach never reads it. */
  direction?: StepDirection;
}

/** The pathway's lead, who coaches, resolves escalations and says the debrief lines. */
export interface CoachInfo {
  name: string;
  role: string;
  /** Sprite key, e.g. "dana" (public/game/sprites/dana.svg). */
  spriteKey: string;
}

/** Result-screen headline pools (engine.ts HEADLINES has the Help Desk lines). */
export type HeadlineKey = "perfect" | "sharp" | "lucky" | "jumpy" | "leaky" | "scraped" | "breach" | "timeout" | "playing";

/** What kind of shift an encounter is. Missing means "story" (or "practice" when practice is set). */
export type EncounterMode = "story" | "practice" | "daily" | "drill";

export interface Encounter {
  id: string;
  pathwayId: PathwayId;
  title: string;
  subtitle: string;
  agent: {
    name: string;
    role: string;
    /** Sprite key from lib/game/assets.ts, e.g. "ollie". */
    spriteKey: string;
    personality: string;
  };
  /** Company / shift setup paragraph shown before the battle. */
  setting: string;
  intro: DialogueLine[];
  maxRisk: number;
  /** The shift ends after this many turns. */
  maxTurns: number;
  energyPerTurn: number;
  handSize: number;
  /** Intents the agent announces per turn; index = turn - 1, last value repeats. */
  actionsPerTurn: number[];
  steps: AgentStep[];
  starterDeck: CardId[];
  /**
   * Cards added to the player's deck during the battle: on the start of `turn`, each listed card
   * goes into the hand as a bonus (after the normal draw) and then stays in the deck.
   */
  unlocks?: { turn: number; cards: CardId[] }[];
  /** A practice shift (read by the UI only): no stars, no stats, energy hidden. */
  practice?: boolean;
  mode?: EncounterMode;
  /** The first N steps are coached step by step, so they never count as skill evidence. */
  guidedSteps?: number;
  outro: {
    win: DialogueLine[];
    breach: DialogueLine[];
    timeout: DialogueLine[];
    /** Optional: a win where risky plans got through (the practice result uses it). */
    winWithMisses?: DialogueLine[];
    /** Optional (generated shifts): a win where exactly one risky plan got through. */
    winWithOneMiss?: DialogueLine[];
    /** Optional (drills): a clean drill win. */
    drillWin?: DialogueLine[];
  };
  debrief: { skillTag: string; takeaway: string; careerInsight: string };
  /**
   * Hydrated by lib/pathways/create.ts from pathway.json (never authored in encounter JSON).
   * Missing means the Help Desk defaults (Dana).
   */
  coach?: CoachInfo;
  /** Hydrated like coach: per-pathway headline lines; a missing key uses the engine's default pool. */
  headlines?: Partial<Record<HeadlineKey, string[]>>;
  /** Practice only: the coach's lines on the first two evidence sheets (coach.ts p0-c, p1-c). */
  coachScript?: { firstSafeSheet: string; firstRiskySheet: string };
  /**
   * Hydrated like coach, from pathway.json "noBlockCue": with no Block card in hand, the shift hint
   * and the evidence sheet say what can still stop a wrong plan (Escalate, Coffee). Missing means off
   * (the Help Desk, whose hint text the golden pins).
   */
  noBlockCue?: boolean;
}

/** The Help Desk clients. Each pathway lists its own in pathway.json "companies" (content tests check them). */
export type BankCompany = "Harlow & Cole" | "Bramwell Logistics" | "Pinecrest Dental";

/** A ticket from a pathway's bank (content/<pathway>/bank/tickets-*.json). */
export interface BankTicket {
  /** Writer letter + "-" + kebab slug, e.g. "a-sim-swap"; at most 24 characters. */
  id: string;
  /** One of the pathway's companies (pathway.json). */
  company: string;
  /** At most 40 characters, player-facing, e.g. "Call about a new phone". */
  title: string;
  difficulty: 1 | 2 | 3;
  /** 1-3 plans in announce (chain) order; step id = `${id}-${index + 1}`. */
  steps: AgentStep[];
}

/** Shell text for generated shifts (content/<pathway>/bank/shift.json). */
export interface ShiftText {
  version: number;
  /** Daily setting template: {n} tickets, {companies}, {agent} (short name). Default: the Help Desk line. */
  settingDaily?: string;
  /** Drill setting template: {companies}, {agent}. */
  settingDrill?: string;
  careerInsight?: string;
  /** Ticket ids for the daily used when no draw passes the rules. Default: shiftGen FALLBACK_DAILY. */
  fallbackDaily?: string[];
  intros: DialogueLine[][];
  outros: {
    win: DialogueLine[][];
    winWithMisses: DialogueLine[][];
    /** Exactly one risky plan got through ("One of my plans got through…"). */
    winWithOneMiss?: DialogueLine[][];
    /** A drill with nothing missed. */
    drillWin?: DialogueLine[][];
    timeout: DialogueLine[][];
    breach: DialogueLine[][];
  };
}

/** A generated shift (Daily practice or a drill). The encounter is rebuilt from it by buildShift. */
export interface ShiftSpec {
  kind: "daily" | "drill";
  /** Encounter id: "hd-daily-7" or "hd-drill-verify-identity-2". */
  id: string;
  /** Battle seed (uint32). */
  seed: number;
  /** progress.dailyCount (daily) or drills started for the skill (drill) when it was planned. */
  n: number;
  ticketIds: string[];
  /** Every plan, in the final announce order. */
  stepIds: string[];
  focus: MasterySkillId[];
  /** YYYY-MM-DD. */
  createdOn: string;
  bankVersion: string;
}

/* ------------------------------------------------------------------ */
/* Mastery                                                             */
/* ------------------------------------------------------------------ */

/** Right, Partly right, Wrong. */
export type CallGrade = "R" | "P" | "W";

/** One piece of skill evidence from one plan. */
export interface Call {
  stepId: string;
  skill: MasterySkillId;
  grade: CallGrade;
  /** The plan was safe (stored as a lowercase grade). */
  safe: boolean;
  /** Short player-facing reason, e.g. "Caught", "Lucky guess". */
  reason: string;
}

export type SkillLevel = 0 | 1 | 2 | 3 | 4;

export interface SkillRecord {
  /** Last 6 grades, oldest first; uppercase = risky plan, lowercase = safe plan, e.g. "RrPWr". */
  recent: string;
  /** Total calls. */
  n: number;
  level: SkillLevel;
  /** Last 3 distinct YYYY-MM-DD with a call, oldest first. */
  days: string[];
  /** Day of the last call (YYYY-MM-DD). */
  last: string;
  /** Day the skill reached Solid (YYYY-MM-DD), or null below Solid. */
  solidOn: string | null;
  /** Step id of the latest call that was not right (its tell shows in the skill detail). Optional: older saves lack it. */
  miss?: string;
  /** When `miss` was only partly right: its reason ("Fixed it later"). Absent for a real miss (W). */
  missWhy?: string;
}

/* ------------------------------------------------------------------ */
/* Battle runtime state (pure JSON: saved to localStorage / cloud)     */
/* ------------------------------------------------------------------ */

export type StepStatus = "queued" | "announced" | "executed" | "blocked" | "escalated" | "rolled-back";

export interface StepRuntime {
  stepId: string;
  status: StepStatus;
  inspected: boolean;
  /** Times this (safe) step was blocked and sent back to the queue. */
  requeues: number;
  resolvedOnTurn: number | null;
}

export interface CardInstance {
  uid: string;
  cardId: CardId;
}

export type BattleStatus = "playing" | "won" | "lost-breach" | "lost-timeout";

export type BattleEvent =
  | { t: "turn-start"; turn: number }
  | { t: "announce"; stepId: string }
  | { t: "card-played"; cardId: CardId; targetStepId?: string }
  | { t: "inspected"; stepId: string; auto: boolean }
  | { t: "executed"; stepId: string; safe: boolean; risk: number; progress: number }
  | { t: "caught"; stepId: string; by: "block" | "escalate" }
  | { t: "false-alarm"; stepId: string }
  | { t: "escalated-safe"; stepId: string; progress: number }
  | { t: "rolled-back"; stepId: string; riskRemoved: number; progressRemoved: number }
  | { t: "power"; power: "callbackPolicy" }
  | { t: "draw"; count: number }
  | { t: "unlock"; cardIds: CardId[] }
  | { t: "energy"; amount: number }
  | { t: "end"; status: BattleStatus };

export interface BattleState {
  version: 1;
  encounterId: string;
  seed: number;
  /** Internal seeded-RNG state; advancing it keeps battles deterministic and resumable. */
  rng: number;
  turn: number;
  energy: number;
  risk: number;
  progress: number;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhausted: CardInstance[];
  /** Step ids not yet announced, in order. Blocked safe steps are appended again. */
  queue: string[];
  /** Step ids announced this turn, in the order they will execute at end of turn. */
  announced: string[];
  steps: Record<string, StepRuntime>;
  /** Step ids in the order they executed. */
  executedHistory: string[];
  powers: { callbackPolicy: boolean };
  status: BattleStatus;
  /** Append-only. The UI and stage animate events past the last index they saw. */
  events: BattleEvent[];
  stats: {
    catches: number;
    falseAlarms: number;
    misses: number;
    inspections: number;
    escalations: number;
    rollbacks: number;
  };
}

export interface BattleScore {
  stars: 0 | 1 | 2 | 3;
  catches: number;
  falseAlarms: number;
  /** Unsafe steps that executed and were not rolled back. */
  misses: number;
  turnsUsed: number;
  /** Short, funny one-liner for the result screen. */
  headline: string;
}

export type PlayResult = { ok: true; state: BattleState } | { ok: false; reason: string };

/* ------------------------------------------------------------------ */
/* Save data                                                           */
/* ------------------------------------------------------------------ */

export interface PathwayProgress {
  introSeen: boolean;
  /** Avatar grid position in the hub. */
  hub: { x: number; y: number } | null;
  /** In-progress battle, for resume after reload. */
  battle: BattleState | null;
  /**
   * The last finished battle until its result screen has been left, so a reload (or Pause)
   * right after the end still shows the result and debrief.
   */
  pendingResult?: BattleState | null;
  best: { stars: number; completedAt: string } | null;
  attempts: number;
  wins: number;
  /** The practice shift was finished or skipped (see lib/client/save.ts practiceDone()). */
  practiceDone?: boolean;
  history: HistoryEntry[];
  /* M3 mastery (all optional: older saves load with empty defaults; see lib/game/mastery.ts). */
  skills?: Partial<Record<MasterySkillId, SkillRecord>>;
  /** The in-progress Daily practice or drill, kept until its result screen is left. */
  shift?: ShiftSpec | null;
  /** Daily practice shifts started. */
  dailyCount?: number;
  /** Drills started, per skill. */
  drillCount?: Partial<Record<MasterySkillId, number>>;
  /** Ticket ids of the last 2 dailies, oldest first. */
  recentTickets?: string[][];
  /** stepId -> the last day (YYYY-MM-DD) it counted as skill evidence; trimmed to 7 days. */
  scored?: Record<string, string>;
  /** The last 10 `${encounterId}:${seed}` battles already applied to skills. */
  applied?: string[];
  /** The last 14 distinct days (YYYY-MM-DD) with a finished shift. */
  days?: string[];
}

export interface HistoryEntry {
  encounterId: string;
  status: BattleStatus;
  stars: number;
  at: string;
  catches: number;
  falseAlarms: number;
  misses: number;
  mode?: EncounterMode;
  /** Plans graded right / partly right / missed (see mastery.gradePlan). */
  right?: number;
  partly?: number;
  missed?: number;
  /** The first focus skill of a daily, or the drill's skill. */
  focus?: MasterySkillId;
}

export interface SaveProfile {
  name: string;
  email: string;
  /** Guests play without giving name/email; progress stays on this device. */
  guest: boolean;
  consentAt: string | null;
  marketingOptIn: boolean;
}

export interface SaveData {
  version: 2;
  /** Server-issued when the player signs up; a local random id for guests. */
  playerId: string;
  profile: SaveProfile | null;
  pathways: Partial<Record<PathwayId, PathwayProgress>>;
  settings: { reducedMotion: boolean | null };
  updatedAt: string;
  /**
   * A sign-up the server could not take yet (rate limited, down or offline). Sent again on the
   * next visit to /play or when the browser comes back online. Never uploaded as part of a save.
   */
  pendingLead?: { name: string; email: string; marketingOptIn: boolean; consentAt: string } | null;
}
