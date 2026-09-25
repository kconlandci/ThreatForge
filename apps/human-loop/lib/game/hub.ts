import type { DialogueLine } from "./types";

/** Things the player can walk to in the Help Desk office hub. */
export type HubTargetId = "ollie" | "dana" | "whiteboard" | "coffee" | "printer";

export interface HubTargetContent {
  /** Accessible name / room-list label, e.g. "Ollie's desk". */
  label: string;
  /** One line for the room list. */
  description: string;
  /** "battle" starts the shift; "talk" and "look" show lines in the dialogue box. */
  action: "battle" | "talk" | "look";
  lines: DialogueLine[];
  /** Optional: lines for a returning player (once Daily practice is open) instead of the first-day lines. */
  returningLines?: DialogueLine[];
}

export interface HubContent {
  officeName: string;
  targets: Record<HubTargetId, HubTargetContent>;
}

export const HUB_TARGET_IDS: HubTargetId[] = ["ollie", "dana", "whiteboard", "coffee", "printer"];
