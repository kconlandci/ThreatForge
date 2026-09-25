/**
 * The Cloud & Network pathway bundle. Only entry points (components/game/entries/CloudNetworkGame.tsx),
 * tests and fixtures import it, so its content ships only with /play/cloud-network.
 */
import shiftText from "@/content/cloud-network/bank/shift.json";
import ticketsA from "@/content/cloud-network/bank/tickets-a.json";
import ticketsB from "@/content/cloud-network/bank/tickets-b.json";
import story from "@/content/cloud-network/encounter-01.json";
import hub from "@/content/cloud-network/hub.json";
import pathway from "@/content/cloud-network/pathway.json";
import practice from "@/content/cloud-network/practice.json";
import skills from "@/content/cloud-network/skills.json";
import type { HubContent } from "@/lib/game/hub";
import type { BankTicket, Encounter, ShiftText } from "@/lib/game/types";
import { getPathway } from "@/lib/types";
import { createPathway } from "../create";
import type { PathwayJson, SkillsJson } from "../types";
import { CLOUD_NETWORK_HUB_MAP } from "./hubMap";

export const CLOUD_NETWORK = createPathway({
  meta: getPathway("cloud-network"),
  pathway: pathway as PathwayJson,
  practice: practice as Encounter,
  story: story as Encounter,
  hub: hub as HubContent,
  skills: skills as SkillsJson,
  // One file per writer; the order is part of BANK_VERSION.
  bank: [...(ticketsA.tickets as BankTicket[]), ...(ticketsB.tickets as BankTicket[])],
  shiftText: shiftText as ShiftText,
  hubMap: CLOUD_NETWORK_HUB_MAP,
});
