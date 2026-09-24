/**
 * Shared, Phaser-free state for one mounted stage. Scenes read and write it; the React side
 * talks to it through the StageHandle returned by createStage().
 */
import type { SpriteKey } from "@/lib/game/assets";
import type { AgentMood, FromStage, StageBus, StageMode } from "@/lib/game/bus";
import type { HubTargetId } from "@/lib/game/hub";
import type { GridPos } from "@/lib/game/hubMap";

export type SceneKey = "boot" | StageMode;

export interface StageRuntime {
  bus: StageBus;
  /** Device pixels per CSS pixel used for the canvas (capped). */
  dpr: number;
  cssW: number;
  cssH: number;
  /** Mode React asked for. */
  mode: StageMode;
  /** Scene currently shown (null while booting or mid-switch). */
  active: StageMode | null;
  switching: boolean;
  reducedMotion: boolean;
  /** Last known avatar tile (survives hub -> battle -> hub). */
  hubPos: GridPos | null;
  /** Walk request that arrived while the hub was not active. */
  pendingWalk: HubTargetId | null;
  /** Mood React last set; fx may show a mood briefly and then return to this. */
  mood: AgentMood;
  fonts: { display: string; body: string };
  readySent: boolean;
  /** Set when the stage is destroyed; async work checks it before touching Phaser. */
  dead: boolean;
  /** Texture key currently holding each sprite, and the raster scale it was drawn at. */
  art: Partial<Record<SpriteKey, { tex: string; scale: number; placeholder: boolean }>>;
  /** Art for the other mode, still rasterizing in the background after boot (null when done). */
  artPending: Promise<void> | null;
  /** Generated fx textures are drawn at this many px per world unit. */
  fxRes: number;
  /** Battle: CSS px at the bottom of the canvas covered by DOM (the "Done" tray). */
  battleInset: number;
  emit(msg: FromStage): void;
  /** A hub/battle scene finished create() and is on screen. */
  sceneReady(mode: StageMode): void;
}

export interface StageHandle {
  setMode(mode: StageMode): void;
  setReducedMotion(value: boolean): void;
  resize(cssW: number, cssH: number): void;
  destroy(): void;
}

/** Most device pixels we will ask a weak GPU to fill per frame. */
const MAX_DEVICE_PIXELS = 6_000_000;

export function pickDpr(cssW: number, cssH: number): number {
  const raw = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  let dpr = Math.min(Math.max(raw, 1), 3);
  const area = Math.max(1, cssW * cssH);
  if (area * dpr * dpr > MAX_DEVICE_PIXELS) dpr = Math.max(1, Math.sqrt(MAX_DEVICE_PIXELS / area));
  return dpr;
}

/** Font stacks from next/font CSS variables (set on <html> by app/layout.tsx). */
export function readFonts(): { display: string; body: string } {
  const fallback = { display: "system-ui, sans-serif", body: "system-ui, sans-serif" };
  if (typeof document === "undefined") return fallback;
  const cs = getComputedStyle(document.documentElement);
  const display = cs.getPropertyValue("--font-lexend").trim();
  const body = cs.getPropertyValue("--font-atkinson").trim();
  return {
    display: display ? `${display}, system-ui, sans-serif` : fallback.display,
    body: body ? `${body}, system-ui, sans-serif` : fallback.body,
  };
}
