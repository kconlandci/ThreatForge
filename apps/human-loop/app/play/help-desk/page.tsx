import type { Metadata, Viewport } from "next";
import HelpDeskGame from "@/components/game/entries/HelpDeskGame";
import { getPathway } from "@/lib/types";

const meta = getPathway("help-desk");

export const metadata: Metadata = {
  title: meta.pageTitle,
  description: meta.pageDescription,
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** /play/help-desk: the playable Help Desk pathway (office hub + card battle). */
export default function HelpDeskPage() {
  return <HelpDeskGame />;
}
