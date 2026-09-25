import type { Metadata, Viewport } from "next";
import CloudNetworkGame from "@/components/game/entries/CloudNetworkGame";
import { getPathway } from "@/lib/types";

const meta = getPathway("cloud-network");

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

/** /play/cloud-network: the playable Cloud & Network pathway (NOC hub + card battle). */
export default function CloudNetworkPage() {
  return <CloudNetworkGame />;
}
