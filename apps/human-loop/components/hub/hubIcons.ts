import { Archive, Bot, Coffee, MapPin, Presentation, Printer, UserRound, type LucideIcon } from "lucide-react";
import type { HubIconName } from "@/lib/game/hub";

/** Room-list and dialogue icons a hub target may name in hub.json ("icon"). */
export const HUB_ICONS: Record<HubIconName, LucideIcon> = {
  Bot,
  UserRound,
  Presentation,
  Coffee,
  Printer,
  Archive,
};

export function hubIcon(name: string | undefined): LucideIcon {
  return (name && HUB_ICONS[name as HubIconName]) || MapPin;
}
