import type { Metadata, Viewport } from "next";
import BusinessAnalystGame from "@/components/game/entries/BusinessAnalystGame";
import { getPathway } from "@/lib/types";

const meta = getPathway("business-analyst");

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

/** /play/business-analyst: the playable Business Analyst pathway (analytics corner hub + card battle). */
export default function BusinessAnalystPage() {
  return <BusinessAnalystGame />;
}
