"use client";

/**
 * The Cybersecurity game: the only module that brings the Cybersecurity bundle (and its content)
 * into a page. app/play/cybersecurity renders it; no other route imports it, so no other pathway
 * ships it.
 */
import { GameShell } from "@/components/game/GameShell";
import { CYBERSECURITY } from "@/lib/pathways/cybersecurity";

export default function CybersecurityGame() {
  return <GameShell pathway={CYBERSECURITY} />;
}
