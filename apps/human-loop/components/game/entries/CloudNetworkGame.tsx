"use client";

/**
 * The Cloud & Network game: the only module that brings the Cloud & Network bundle (and its content)
 * into a page. app/play/cloud-network renders it; no other route imports it, so no other pathway
 * ships it.
 */
import { GameShell } from "@/components/game/GameShell";
import { CLOUD_NETWORK } from "@/lib/pathways/cloud-network";

export default function CloudNetworkGame() {
  return <GameShell pathway={CLOUD_NETWORK} />;
}
