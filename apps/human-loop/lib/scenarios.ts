import type { PathwayId, PathwayPack } from "./types";
import helpDesk from "./scenarios/help-desk.json";
import cybersecurity from "./scenarios/cybersecurity.json";
import fullStack from "./scenarios/full-stack.json";
import businessAnalyst from "./scenarios/business-analyst.json";
import cloudNetwork from "./scenarios/cloud-network.json";

const PACKS: Record<PathwayId, PathwayPack> = {
  "help-desk": helpDesk as PathwayPack,
  cybersecurity: cybersecurity as PathwayPack,
  "full-stack": fullStack as PathwayPack,
  "business-analyst": businessAnalyst as PathwayPack,
  "cloud-network": cloudNetwork as PathwayPack,
};

export function getPathwayPack(id: PathwayId): PathwayPack {
  return PACKS[id];
}

export function getAllPacks(): PathwayPack[] {
  return Object.values(PACKS);
}
