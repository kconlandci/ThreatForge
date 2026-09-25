/**
 * The Help Desk pathway bundle. Only entry points (components/game/entries/HelpDeskGame.tsx),
 * tests and fixtures import it, so its content ships only with /play/help-desk.
 */
import shiftText from "@/content/help-desk/bank/shift.json";
import ticketsA from "@/content/help-desk/bank/tickets-a.json";
import ticketsB from "@/content/help-desk/bank/tickets-b.json";
import ticketsC from "@/content/help-desk/bank/tickets-c.json";
import story from "@/content/help-desk/encounter-01.json";
import hub from "@/content/help-desk/hub.json";
import pathway from "@/content/help-desk/pathway.json";
import practice from "@/content/help-desk/practice.json";
import skills from "@/content/help-desk/skills.json";
import type { HubContent } from "@/lib/game/hub";
import type { BankTicket, Encounter, ShiftText } from "@/lib/game/types";
import { getPathway } from "@/lib/types";
import { createPathway } from "../create";
import type { PathwayJson, SkillsJson } from "../types";
import { HELP_DESK_HUB_MAP } from "./hubMap";

export const HELP_DESK = createPathway({
  meta: getPathway("help-desk"),
  pathway: pathway as PathwayJson,
  practice: practice as Encounter,
  story: story as Encounter,
  hub: hub as HubContent,
  skills: skills as SkillsJson,
  // One file per writer; the order is part of BANK_VERSION.
  bank: [...(ticketsA.tickets as BankTicket[]), ...(ticketsB.tickets as BankTicket[]), ...(ticketsC.tickets as BankTicket[])],
  shiftText: shiftText as ShiftText,
  hubMap: HELP_DESK_HUB_MAP,
});
