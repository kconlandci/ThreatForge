"use client";

/**
 * The Phaser stage (hub office + battle close-up). Client-only: load it with
 * next/dynamic(() => import("@/components/game/PhaserStage"), { ssr: false }).
 *
 * Phaser itself is imported inside the effect, so it never reaches the server and only
 * downloads when a stage mounts. One Phaser.Game per mount; StrictMode's double mount is
 * safe because a cancelled mount never creates its game.
 *
 * Sizing: the stage fills its parent box (give the parent or className a size).
 */
import { useEffect, useRef } from "react";
import type { PhaserStageProps } from "@/lib/game/bus";
import type { StageHandle } from "./stage/runtime";

export default function PhaserStage({ bus, mode, reducedMotion, initialHubPos, className }: PhaserStageProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<StageHandle | null>(null);
  // Latest props for the async mount, without re-creating the game when they change.
  const modeRef = useRef(mode);
  const reducedRef = useRef(reducedMotion);
  const initialPosRef = useRef(initialHubPos);
  modeRef.current = mode;
  reducedRef.current = reducedMotion;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let cancelled = false;
    let handle: StageHandle | null = null;

    // Each mount gets its own layer so a game that is still tearing down never shares a parent.
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;overflow:hidden;";
    box.appendChild(layer);

    const size = () => ({ w: box.clientWidth, h: box.clientHeight });
    const ro = new ResizeObserver(() => {
      const s = size();
      if (s.w > 0 && s.h > 0) handle?.resize(s.w, s.h);
    });
    ro.observe(box);

    (async () => {
      const { createStage } = await import("./stage/createStage");
      if (cancelled) return;
      const s = size();
      handle = createStage({
        parent: layer,
        bus,
        mode: modeRef.current,
        reducedMotion: reducedRef.current,
        initialHubPos: initialPosRef.current,
        cssW: s.w || 1,
        cssH: s.h || 1,
      });
      handleRef.current = handle;
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __hlStage?: unknown }).__hlStage = (handle as unknown as { debug: unknown }).debug;
      }
    })().catch((err) => {
      console.error("[stage] failed to start", err);
    });

    return () => {
      cancelled = true;
      ro.disconnect();
      handleRef.current = null;
      if (handle) {
        handle.destroy();
        // Phaser removes its canvas on its next tick; hide the layer now, drop it shortly after.
        layer.style.display = "none";
        window.setTimeout(() => layer.remove(), 1000);
      } else {
        layer.remove();
      }
    };
  }, [bus]);

  useEffect(() => {
    handleRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    handleRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  return (
    <div
      ref={boxRef}
      className={className}
      data-stage-mode={mode}
      aria-hidden="true"
      style={{
        position: className && /\b(absolute|fixed|sticky)\b/.test(className) ? undefined : "relative",
        // With no className, fill the parent.
        width: className ? undefined : "100%",
        height: className ? undefined : "100%",
        minHeight: 1,
      }}
    />
  );
}
