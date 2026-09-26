"use client";

/**
 * The Business Analyst game: the only module that brings the Business Analyst bundle (and its content)
 * into a page. app/play/business-analyst renders it; no other route imports it, so no other pathway
 * ships it.
 */
import { GameShell } from "@/components/game/GameShell";
import { BUSINESS_ANALYST } from "@/lib/pathways/business-analyst";

export default function BusinessAnalystGame() {
  return <GameShell pathway={BUSINESS_ANALYST} />;
}
