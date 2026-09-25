import type { Metadata, Viewport } from "next";
import CybersecurityGame from "@/components/game/entries/CybersecurityGame";
import { getPathway } from "@/lib/types";

const meta = getPathway("cybersecurity");

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

/** /play/cybersecurity: the playable Cybersecurity pathway (SOC hub + card battle). */
export default function CybersecurityPage() {
  return <CybersecurityGame />;
}
