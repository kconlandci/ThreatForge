import type { HubContent } from "./hub";
import type { Encounter } from "./types";
import encounter01 from "@/content/help-desk/encounter-01.json";
import hub from "@/content/help-desk/hub.json";

export const HELP_DESK_ENCOUNTER = encounter01 as Encounter;
export const HELP_DESK_HUB = hub as HubContent;
