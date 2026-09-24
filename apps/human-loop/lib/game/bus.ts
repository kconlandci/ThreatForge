import type { HubTargetId } from "./hub";

/** Messages from React to the Phaser stage. */
export type ToStage =
  | { type: "mode"; mode: StageMode }
  | { type: "walk-to"; target: HubTargetId }
  | {
      type: "fx";
      fx:
        | "inspect"
        | "catch"
        | "risk"
        | "execute-safe"
        | "false-alarm"
        | "escalate"
        | "rollback"
        | "win"
        | "lose";
      /** 0..1, scales shake/particles. */
      intensity?: number;
    }
  | { type: "agent-mood"; mood: AgentMood }
  /** Battle: CSS px at the bottom of the stage covered by the DOM "Done" tray (ResetBot sits above it). */
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
  mode: StageMode;
  reducedMotion: boolean;
  /** Where the avatar starts in the hub (grid coords); null = default spawn. */
  initialHubPos: { x: number; y: number } | null;
  className?: string;
}
