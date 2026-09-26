/**
 * The Business Analyst pathway bundle. Only entry points (components/game/entries/BusinessAnalystGame.tsx),
 * tests and fixtures import it, so its content ships only with /play/business-analyst.
 */
import shiftText from "@/content/business-analyst/bank/shift.json";
import ticketsA from "@/content/business-analyst/bank/tickets-a.json";
import ticketsB from "@/content/business-analyst/bank/tickets-b.json";
import story from "@/content/business-analyst/encounter-01.json";
import hub from "@/content/business-analyst/hub.json";
import pathway from "@/content/business-analyst/pathway.json";
import practice from "@/content/business-analyst/practice.json";
import skills from "@/content/business-analyst/skills.json";
import type { HubContent } from "@/lib/game/hub";
import type { BankTicket, Encounter, ShiftText } from "@/lib/game/types";
import { getPathway } from "@/lib/types";
import { createPathway } from "../create";
import type { PathwayJson, SkillsJson } from "../types";
import { BUSINESS_ANALYST_HUB_MAP } from "./hubMap";

export const BUSINESS_ANALYST = createPathway({
  meta: getPathway("business-analyst"),
  pathway: pathway as PathwayJson,
  practice: practice as Encounter,
  story: story as Encounter,
  hub: hub as HubContent,
  skills: skills as SkillsJson,
  // One file per writer; the order is part of BANK_VERSION.
  bank: [...(ticketsA.tickets as BankTicket[]), ...(ticketsB.tickets as BankTicket[])],
  shiftText: shiftText as ShiftText,
  hubMap: BUSINESS_ANALYST_HUB_MAP,
});
