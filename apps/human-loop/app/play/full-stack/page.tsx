import type { Metadata, Viewport } from "next";
import FullStackGame from "@/components/game/entries/FullStackGame";
import { getPathway } from "@/lib/types";

const meta = getPathway("full-stack");

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

/** /play/full-stack: the playable Full-Stack Development pathway (app team hub + card battle). */
export default function FullStackPage() {
  return <FullStackGame />;
}
