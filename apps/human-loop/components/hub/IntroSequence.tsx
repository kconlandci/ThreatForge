"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Clock, X } from "lucide-react";
import { SPRITES, type SpriteKey } from "@/lib/game/assets";
import type { Encounter } from "@/lib/game/types";
import { usePathway } from "@/lib/pathways/context";
import { DialogueBox } from "./DialogueBox";
import h from "./hub.module.css";

/**
 * The intro lines: narrator lines as scene cards, the coach and the agent as a visual-novel
 * exchange. Skippable at any time. New players no longer see it first (Phase 1a: practice opens
 * with the coach's cold open); it plays from Menu > Replay intro, and for a returning player whose
 * practice is done but who never saw it. "Skip practice" lives in the Menu.
 */
export function IntroSequence({
  encounter,
  reducedMotion,
  onDone,
  lastLabel: lastLabelProp,
}: {
  encounter: Encounter;
  reducedMotion: boolean;
  onDone: () => void;
  /** The last button (default "Start practice" / "Let's go"). Replay: "Back to the game". */
  lastLabel?: string;
}) {
  const { coach, stage } = usePathway();
  const coachArt = SPRITES[stage.coachSprite as SpriteKey];
  const lines = encounter.intro;
  const [i, setI] = useState(0);
  const line = lines[Math.min(i, lines.length - 1)];
  const last = i >= lines.length - 1;
  const nextRef = useRef<HTMLButtonElement>(null);
  const sceneBtnRef = useRef<HTMLButtonElement>(null);
  const next = () => (last ? onDone() : setI(i + 1));
  const lastLabel = lastLabelProp ?? (encounter.practice ? "Start practice" : "Let's go");

  useEffect(() => {
    const t = window.setTimeout(() => (line?.speaker === "narrator" ? sceneBtnRef.current : nextRef.current)?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [i, line?.speaker]);

  if (!line) return null;
  const agentTalking = line.speaker === "agent";
  const coachTalking = line.speaker === "coach";
  const seenSpeaker = lines.slice(0, i + 1).some((l) => l.speaker !== "narrator");

  return (
    <div className={h.intro} role="region" aria-label="Intro">
      <button type="button" className={h.introSkip} onClick={onDone}>
        Skip intro
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      {line.speaker === "narrator" ? (
        <div className={h.scene} key={i}>
          <span className={h.clock} aria-hidden="true">
            <Clock className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <p className={h.sceneEyebrow}>{encounter.title}</p>
          <p id={`hl-intro-scene-${i}`} className={h.sceneTitle}>
            {line.text}
          </p>
          <p className={h.sceneSub}>{encounter.subtitle}</p>
          <button
            ref={sceneBtnRef}
            type="button"
            aria-describedby={`hl-intro-scene-${i}`}
            className="mt-4 inline-flex min-h-12 items-center gap-1.5 rounded-xl border-2 border-ink bg-orange px-5 font-display text-base font-bold text-ink shadow-[0_4px_0_0_var(--hl-ink)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)]"
            onClick={next}
          >
            {last ? lastLabel : "Next"}
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className={h.dots} aria-hidden="true">
            {lines.map((_, n) => (
              <span key={n} className={`${h.dot} ${n === i ? h.dotOn : ""}`} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className={h.cast} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coachArt?.file ?? `/game/sprites/${stage.coachSprite}.svg`}
              alt=""
              className={`${h.actor} ${h.actorDana} ${coachTalking ? h.actorTalking : h.actorQuiet}`}
              width={coachArt?.w ?? 40}
              height={coachArt?.h ?? 74}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/game/sprites/${stage.agentSprite}-${agentTalking ? "eager" : "idle"}.svg`}
              alt=""
              className={`${h.actor} ${h.actorBot} ${agentTalking ? h.actorTalking : h.actorQuiet}`}
              width={220}
              height={220}
              style={{ visibility: seenSpeaker ? "visible" : "hidden" }}
            />
          </div>
          <DialogueBox
            speaker={line.speaker}
            role={coachTalking ? coach.role : agentTalking ? encounter.agent.role : undefined}
            text={line.text}
            index={i}
            total={lines.length}
            agentName={encounter.agent.name}
            reducedMotion={reducedMotion}
            focusRef={nextRef}
            nextLabel={last ? lastLabel : "Next"}
            onNext={next}
            secondary={
              i > 0 ? (
                <button type="button" className={h.skip} onClick={() => setI(i - 1)}>
                  Back
                </button>
              ) : null
            }
          />
        </>
      )}
    </div>
  );
}
