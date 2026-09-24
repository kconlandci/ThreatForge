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
}

/* ------------------------------------------------------------------ */
/* Encounter content (authored as JSON in /content)                    */
/* ------------------------------------------------------------------ */

export type StepCategory = "lookup" | "credential" | "comms" | "ticket" | "access" | "data";

export interface Evidence {
  label: string;
  detail: string;
  /** Used for the debrief ("what gave it away"); never shown as a flag before resolution. */
  redFlag: boolean;
}

export interface DialogueLine {
  speaker: "dana" | "agent" | "narrator";
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
}

export interface Encounter {
  id: string;
  pathwayId: PathwayId;
  title: string;
  subtitle: string;
  agent: {
    name: string;
    role: string;
    /** Sprite key from lib/game/assets.ts, e.g. "resetbot". */
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
  outro: { win: DialogueLine[]; breach: DialogueLine[]; timeout: DialogueLine[] };
  debrief: { skillTag: string; takeaway: string; careerInsight: string };
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
  history: {
    encounterId: string;
    status: BattleStatus;
    stars: number;
    at: string;
    catches: number;
    falseAlarms: number;
    misses: number;
  }[];
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
