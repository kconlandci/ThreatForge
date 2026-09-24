import { ChartColumnIncreasing, Cloud, CodeXml, Headset, ShieldCheck, type LucideIcon } from "lucide-react";
import type { PathwayId } from "@/lib/types";

/** One icon per DCI career pathway (site shell only). */
export const PATHWAY_ICONS: Record<PathwayId, LucideIcon> = {
  "help-desk": Headset,
  cybersecurity: ShieldCheck,
  "cloud-network": Cloud,
  "full-stack": CodeXml,
  "business-analyst": ChartColumnIncreasing,
};
