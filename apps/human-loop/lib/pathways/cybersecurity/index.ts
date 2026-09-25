/**
 * The Cybersecurity pathway bundle. Only entry points (components/game/entries/CybersecurityGame.tsx),
 * tests and fixtures import it, so its content ships only with /play/cybersecurity.
 */
import shiftText from "@/content/cybersecurity/bank/shift.json";
import ticketsA from "@/content/cybersecurity/bank/tickets-a.json";
import ticketsB from "@/content/cybersecurity/bank/tickets-b.json";
import story from "@/content/cybersecurity/encounter-01.json";
import hub from "@/content/cybersecurity/hub.json";
import pathway from "@/content/cybersecurity/pathway.json";
import practice from "@/content/cybersecurity/practice.json";
import skills from "@/content/cybersecurity/skills.json";
import type { HubContent } from "@/lib/game/hub";
import type { BankTicket, Encounter, ShiftText } from "@/lib/game/types";
import { getPathway } from "@/lib/types";
import { createPathway } from "../create";
import type { PathwayJson, SkillsJson } from "../types";
import { CYBERSECURITY_HUB_MAP } from "./hubMap";

export const CYBERSECURITY = createPathway({
  meta: getPathway("cybersecurity"),
  pathway: pathway as PathwayJson,
  practice: practice as Encounter,
  story: story as Encounter,
  hub: hub as HubContent,
  skills: skills as SkillsJson,
  // One file per writer; the order is part of BANK_VERSION.
  bank: [...(ticketsA.tickets as BankTicket[]), ...(ticketsB.tickets as BankTicket[])],
  shiftText: shiftText as ShiftText,
  hubMap: CYBERSECURITY_HUB_MAP,
});
