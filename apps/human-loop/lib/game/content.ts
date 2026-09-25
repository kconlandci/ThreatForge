import type { HubContent } from "./hub";
import { bankVersionOf, buildShift, specProblem } from "./shiftGen";
import type { AgentStep, BankTicket, Encounter, PathwayProgress, ShiftSpec, ShiftText } from "./types";
import ticketsA from "@/content/help-desk/bank/tickets-a.json";
import ticketsB from "@/content/help-desk/bank/tickets-b.json";
import ticketsC from "@/content/help-desk/bank/tickets-c.json";
import shiftText from "@/content/help-desk/bank/shift.json";
import encounter01 from "@/content/help-desk/encounter-01.json";
import hub from "@/content/help-desk/hub.json";
import practice from "@/content/help-desk/practice.json";

/** The real first shift ("Monday, 8:57 AM"). */
export const HELP_DESK_ENCOUNTER = encounter01 as Encounter;
/** The 4-ticket practice shift that comes before it. */
export const HELP_DESK_PRACTICE = practice as Encounter;
export const HELP_DESK_HUB = hub as HubContent;

export const HELP_DESK_ENCOUNTERS: Encounter[] = [HELP_DESK_PRACTICE, HELP_DESK_ENCOUNTER];

/** The help desk ticket bank for Daily practice and drills (one file per writer). */
export const HELP_DESK_BANK: BankTicket[] = [
  ...(ticketsA.tickets as BankTicket[]),
  ...(ticketsB.tickets as BankTicket[]),
  ...(ticketsC.tickets as BankTicket[]),
];
/** Changes whenever a ticket or step id is added, removed or reordered. */
export const BANK_VERSION = bankVersionOf(HELP_DESK_BANK);
/** Intro and outro pools for generated shifts. */
export const SHIFT_TEXT = shiftText as ShiftText;

/** The help desk encounter with this id (a saved battle's encounterId), or the real shift. */
export function helpDeskEncounter(id: string | null | undefined): Encounter {
  return HELP_DESK_ENCOUNTERS.find((e) => e.id === id) ?? HELP_DESK_ENCOUNTER;
}

/** A saved Daily practice or drill spec can be rebuilt from the current bank. */
export function shiftSpecUsable(spec: ShiftSpec | null | undefined): spec is ShiftSpec {
  return !!spec && specProblem(HELP_DESK_BANK, spec) === null;
}

/** Built encounters by spec, so the same spec always gives the same object (React deps, engine caches). */
const built = new Map<string, Encounter>();

/** The encounter for a generated shift spec (cached). Throws if the spec doesn't fit the bank. */
export function shiftEncounter(spec: ShiftSpec): Encounter {
  const key = JSON.stringify([spec.id, spec.seed, spec.stepIds, spec.ticketIds, spec.focus, spec.kind, spec.bankVersion]);
  let enc = built.get(key);
  if (!enc) {
    enc = buildShift(HELP_DESK_BANK, spec, SHIFT_TEXT, { agent: HELP_DESK_ENCOUNTER.agent });
    if (built.size >= 8) built.delete(built.keys().next().value as string);
    built.set(key, enc);
  }
  return enc;
}

/**
 * The encounter a saved battle belongs to: the generated shift in progress.shift when the ids
 * match (and it still fits the bank), else the fixed shift with that id (or the real shift).
 */
export function encounterFor(encounterId: string | null | undefined, progress?: Pick<PathwayProgress, "shift"> | null): Encounter {
  const spec = progress?.shift;
  if (spec && spec.id === encounterId && shiftSpecUsable(spec)) return shiftEncounter(spec);
  return helpDeskEncounter(encounterId);
}

let allSteps: Map<string, AgentStep> | null = null;

/** Any help desk plan by id: the fixed shifts and the bank (e.g. to show a skill's latest tell). */
export function helpDeskStep(id: string | null | undefined): AgentStep | undefined {
  if (!id) return undefined;
  allSteps ??= new Map(
    [...HELP_DESK_ENCOUNTERS.flatMap((e) => e.steps), ...HELP_DESK_BANK.flatMap((t) => t.steps)].map((s) => [s.id, s]),
  );
  return allSteps.get(id);
}
