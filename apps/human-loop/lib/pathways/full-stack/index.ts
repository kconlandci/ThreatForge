/**
 * The Full-Stack Development pathway bundle. Only entry points (components/game/entries/FullStackGame.tsx),
 * tests and fixtures import it, so its content ships only with /play/full-stack.
 */
import shiftText from "@/content/full-stack/bank/shift.json";
import ticketsA from "@/content/full-stack/bank/tickets-a.json";
import ticketsB from "@/content/full-stack/bank/tickets-b.json";
import story from "@/content/full-stack/encounter-01.json";
import hub from "@/content/full-stack/hub.json";
import pathway from "@/content/full-stack/pathway.json";
import practice from "@/content/full-stack/practice.json";
import skills from "@/content/full-stack/skills.json";
import type { HubContent } from "@/lib/game/hub";
import type { BankTicket, Encounter, ShiftText } from "@/lib/game/types";
import { getPathway } from "@/lib/types";
import { createPathway } from "../create";
import type { PathwayJson, SkillsJson } from "../types";
import { FULL_STACK_HUB_MAP } from "./hubMap";

export const FULL_STACK = createPathway({
  meta: getPathway("full-stack"),
  pathway: pathway as PathwayJson,
  practice: practice as Encounter,
  story: story as Encounter,
  hub: hub as HubContent,
  skills: skills as SkillsJson,
  // One file per writer; the order is part of BANK_VERSION.
  bank: [...(ticketsA.tickets as BankTicket[]), ...(ticketsB.tickets as BankTicket[])],
  shiftText: shiftText as ShiftText,
  hubMap: FULL_STACK_HUB_MAP,
});
