"use client";

/**
 * The Full-Stack Development game: the only module that brings the Full-Stack bundle (and its content)
 * into a page. app/play/full-stack renders it; no other route imports it, so no other pathway
 * ships it.
 */
import { GameShell } from "@/components/game/GameShell";
import { FULL_STACK } from "@/lib/pathways/full-stack";

export default function FullStackGame() {
  return <GameShell pathway={FULL_STACK} />;
}
