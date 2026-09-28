import type { HubTargetId } from "./hub";
import type { StageSetup } from "./hubMap";

export type FxName = "inspect" | "catch" | "risk" | "execute-safe" | "false-alarm" | "escalate" | "rollback" | "win" | "lose";

/**
 * The outcome vignette a risky plan plays on the stage when it runs (Phase 1a ships 3 families;
 * "breakin" is Phase 3). lib/game/reveal.ts vignetteFor() picks it from the plan.
 */
export type VignetteFamily = "leak" | "report" | "system";

export interface FxMessage {
  type: "fx";
  fx: FxName;
  /** 0..1, scales shake/particles. */
  intensity?: number;
  /** fx "risk" only: which outcome vignette to play (missing: the old generic effect). */
  vignette?: VignetteFamily;
  /** fx "win" only: no risky plan got through. Confetti and the held "celebrate" need it. */
  clean?: boolean;
}

/** Messages from React to the Phaser stage. */
export type ToStage =
  | { type: "mode"; mode: StageMode }
  | { type: "walk-to"; target: HubTargetId }
  | FxMessage
  | { type: "agent-mood"; mood: AgentMood }
  /** Battle: CSS px at the bottom of the stage covered by the DOM "Done" tray (the agent sits above it). */
  | { type: "stage-inset"; bottom: number }
  | { type: "reduced-motion"; value: boolean };

/** Messages from the Phaser stage to React. */
export type FromStage =
  | { type: "ready" }
  /** The player tapped an interactable (the avatar starts walking to it). */
  | { type: "hub-tap"; target: HubTargetId }
  /** The avatar reached an interactable. */
  | { type: "hub-arrived"; target: HubTargetId }
  /** Avatar grid position changed (for saving). */
  | { type: "hub-moved"; x: number; y: number }
  /** The WebGL context was lost (the canvas is blank until "restored"). */
  | { type: "lost" }
  | { type: "restored" }
  /** The stage could not start (e.g. the Phaser download failed twice). */
  | { type: "failed" };

export type StageMode = "hub" | "battle";
export type AgentMood = "idle" | "eager" | "busted" | "sad" | "celebrate";

/* ------------------------------------------------------------------ */
/* Show, then tell (Phase 1a): shared timing and held moods            */
/* ------------------------------------------------------------------ */

/** A vignette's length on the stage (normal motion). */
export const VIGNETTE_MS = 1100;
/** fx "risk": the agent looks eager this long (during the vignette), then its held mood shows. */
export const RISK_EAGER_MS = 1200;
/** An outcome toast appears this long after its stage message (normal / reduced motion). */
export const TOAST_DELAY_MS = 600;
export const TOAST_DELAY_REDUCED_MS = 400;
/** The toast's Next button takes input this long after the toast appears. */
export const BEAT_READY_AFTER_TOAST_MS = 350;

export function toastDelayMs(reducedMotion: boolean): number {
  return reducedMotion ? TOAST_DELAY_REDUCED_MS : TOAST_DELAY_MS;
}

/**
 * The mood the agent keeps after a stage message, until the next "agent-mood" message (a turn
 * beat). null: the message does not change the held mood. A false alarm holds "sad" (blocking good
 * work has a cost); safe work that runs clears it back to "idle"; "celebrate" is only for a clean win.
 */
export function heldMood(msg: ToStage): AgentMood | null {
  if (msg.type === "agent-mood") return msg.mood;
  if (msg.type !== "fx") return null;
  switch (msg.fx) {
    case "risk":
      return "sad";
    case "catch":
      return "busted";
    case "false-alarm":
      return "sad";
    // Good work ran: whatever an earlier catch or false alarm left on the face, it clears.
    case "execute-safe":
      return "idle";
    case "win":
      return msg.clean === true ? "celebrate" : "idle";
    default:
      return null;
  }
}

/**
 * Test hook text for a stage message (BattleView mirrors it on the stage wrapper as data-last-fx):
 * "risk:leak", "catch", "win:clean", "win". null for messages that are not fx.
 */
export function fxTag(msg: ToStage): string | null {
  if (msg.type !== "fx") return null;
  if (msg.fx === "risk" && msg.vignette) return `risk:${msg.vignette}`;
  if (msg.fx === "win" && msg.clean === true) return "win:clean";
  return msg.fx;
}

type Listener<T> = (msg: T) => void;

export class Channel<T> {
  private listeners = new Set<Listener<T>>();
  emit(msg: T) {
    for (const l of [...this.listeners]) l(msg);
  }
  on(l: Listener<T>): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
}

export interface StageBus {
  toStage: Channel<ToStage>;
  fromStage: Channel<FromStage>;
}

export function createBus(): StageBus {
  return { toStage: new Channel<ToStage>(), fromStage: new Channel<FromStage>() };
}

/** Props of components/game/PhaserStage.tsx (client-only, loaded with next/dynamic ssr:false). */
export interface PhaserStageProps {
  bus: StageBus;
  /** The pathway's room and cast (read once, when the stage mounts). */
  stage: StageSetup;
  mode: StageMode;
  reducedMotion: boolean;
  /** Where the avatar starts in the hub (grid coords); null = default spawn. */
  initialHubPos: { x: number; y: number } | null;
  className?: string;
}
