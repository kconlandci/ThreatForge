import type { HubContent } from "./hub";
import type { Encounter } from "./types";
import encounter01 from "@/content/help-desk/encounter-01.json";
import hub from "@/content/help-desk/hub.json";
import practice from "@/content/help-desk/practice.json";

/** The real first shift ("Monday, 8:57 AM"). */
export const HELP_DESK_ENCOUNTER = encounter01 as Encounter;
/** The 4-ticket practice shift that comes before it. */
export const HELP_DESK_PRACTICE = practice as Encounter;
export const HELP_DESK_HUB = hub as HubContent;

export const HELP_DESK_ENCOUNTERS: Encounter[] = [HELP_DESK_PRACTICE, HELP_DESK_ENCOUNTER];

/** The help desk encounter with this id (a saved battle's encounterId), or the real shift. */
export function helpDeskEncounter(id: string | null | undefined): Encounter {
  return HELP_DESK_ENCOUNTERS.find((e) => e.id === id) ?? HELP_DESK_ENCOUNTER;
}
