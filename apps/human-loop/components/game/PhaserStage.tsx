"use client";

/**
 * STUB: the stage owner replaces this with the real Phaser stage.
 * Load it with next/dynamic({ ssr: false }).
 */
import { useEffect } from "react";
import type { PhaserStageProps } from "@/lib/game/bus";

export default function PhaserStage({ bus, mode, className }: PhaserStageProps) {
  useEffect(() => {
    bus.fromStage.emit({ type: "ready" });
  }, [bus]);
  return <div className={className} data-stage-mode={mode} aria-hidden="true" />;
}
