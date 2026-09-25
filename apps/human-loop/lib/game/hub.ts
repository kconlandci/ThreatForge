import type { DialogueLine } from "./types";

/** Something the player can walk to in a pathway's hub (a key of hub.json "targets"), e.g. "ollie". */
export type HubTargetId = string;

/** Icon names a hub target may use (components/hub/hubIcons.ts maps them to lucide icons). */
export const HUB_ICON_NAMES = ["Bot", "UserRound", "Presentation", "Coffee", "Printer", "Archive"] as const;
export type HubIconName = (typeof HUB_ICON_NAMES)[number];

export interface HubTargetContent {
  /** Accessible name / room-list label, e.g. "Ollie's desk". */
  label: string;
  /** One line for the room list. */
  description: string;
  /**
   * "battle" starts the shift (the agent's desk); "talk" is the coach; "look" shows lines in the
   * dialogue box. Exactly one battle and one talk target per hub.
   */
  action: "battle" | "talk" | "look";
  /** Room-list icon (one of HUB_ICON_NAMES). */
  icon?: string;
  /** This look target also offers "Your skills" (exactly one per hub, e.g. the whiteboard). */
  skillsLink?: boolean;
  lines: DialogueLine[];
  /** Optional: lines for a returning player (once Daily practice is open) instead of the first-day lines. */
  returningLines?: DialogueLine[];
}

export interface HubContent {
  officeName: string;
  /** Room-list order = key order. */
  targets: Record<HubTargetId, HubTargetContent>;
}

/** The target with this action ("battle": the agent's desk; "talk": the coach). */
export function hubTargetByAction(hub: HubContent, action: HubTargetContent["action"]): HubTargetId | null {
  return Object.keys(hub.targets).find((id) => hub.targets[id].action === action) ?? null;
}

/** The look target that links to "Your skills", if any. */
export function skillsLinkTarget(hub: HubContent): HubTargetId | null {
  return Object.keys(hub.targets).find((id) => hub.targets[id].skillsLink) ?? null;
}
