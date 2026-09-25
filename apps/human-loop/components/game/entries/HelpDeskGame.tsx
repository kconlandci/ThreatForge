"use client";

/**
 * The Help Desk game: the only module that brings the Help Desk bundle (and its content) into a
 * page. app/play/help-desk renders it; no other route imports it, so no other pathway ships it.
 */
import { GameShell } from "@/components/game/GameShell";
import { HELP_DESK } from "@/lib/pathways/help-desk";

export default function HelpDeskGame() {
  return <GameShell pathway={HELP_DESK} />;
}
