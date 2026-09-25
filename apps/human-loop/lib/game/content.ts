/**
 * Legacy Help Desk exports, kept for tests and fixtures only (lib/game/fixtures.ts and *.test.ts).
 * Runtime code gets the pathway as a PathwayBundle (props / usePathway()); ESLint forbids
 * importing this module anywhere else.
 */
import { HELP_DESK } from "@/lib/pathways/help-desk";
import type { AgentStep, BankTicket, Encounter, PathwayProgress, ShiftSpec, ShiftText } from "./types";
import type { HubContent } from "./hub";

/** The real first shift ("Monday, 8:57 AM"). */
export const HELP_DESK_ENCOUNTER: Encounter = HELP_DESK.story;
/** The 4-ticket practice shift that comes before it. */
export const HELP_DESK_PRACTICE: Encounter = HELP_DESK.practice;
export const HELP_DESK_HUB: HubContent = HELP_DESK.hub;
export const HELP_DESK_ENCOUNTERS: Encounter[] = HELP_DESK.encounters;
export const HELP_DESK_BANK: BankTicket[] = HELP_DESK.bank;
export const BANK_VERSION: string = HELP_DESK.bankVersion;
export const SHIFT_TEXT: ShiftText = HELP_DESK.shiftText;

export function helpDeskEncounter(id: string | null | undefined): Encounter {
  return HELP_DESK.encounter(id);
}

export function shiftSpecUsable(spec: ShiftSpec | null | undefined): spec is ShiftSpec {
  return HELP_DESK.shiftUsable(spec);
}

export function shiftEncounter(spec: ShiftSpec): Encounter {
  return HELP_DESK.shiftEncounter(spec);
}

export function encounterFor(encounterId: string | null | undefined, progress?: Pick<PathwayProgress, "shift"> | null): Encounter {
  return HELP_DESK.encounterFor(encounterId, progress);
}

export function helpDeskStep(id: string | null | undefined): AgentStep | undefined {
  return HELP_DESK.step(id);
}
