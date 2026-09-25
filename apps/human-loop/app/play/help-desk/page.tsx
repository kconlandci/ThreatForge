import type { Metadata, Viewport } from "next";
import { GameShell } from "@/components/game/GameShell";

export const metadata: Metadata = {
  title: "Help Desk shift",
  description:
    "Supervise Ollie, an eager AI help desk agent. Read its plans, inspect the evidence, and stop the bad calls before they happen.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** /play/help-desk: the playable Help Desk pathway (office hub + card battle). */
export default function HelpDeskPage() {
  return <GameShell />;
}
