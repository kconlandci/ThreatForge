"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Clock, X } from "lucide-react";
import type { Encounter } from "@/lib/game/types";
import { DialogueBox } from "./DialogueBox";
import h from "./hub.module.css";

/**
 * First-visit intro over the office: narrator lines as scene cards, Dana and the agent as a
 * visual-novel exchange. Skippable at any time.
 */
export function IntroSequence({
  encounter,
  reducedMotion,
  onDone,
  onSkipPractice,
}: {
  encounter: Encounter;
  reducedMotion: boolean;
  onDone: () => void;
  /** Practice comes next: the last screen offers "Skip practice" (for presenters). */
  onSkipPractice?: () => void;
}) {
  const lines = encounter.intro;
  const [i, setI] = useState(0);
  const line = lines[Math.min(i, lines.length - 1)];
  const last = i >= lines.length - 1;
  const nextRef = useRef<HTMLButtonElement>(null);
  const sceneBtnRef = useRef<HTMLButtonElement>(null);
  const next = () => (last ? onDone() : setI(i + 1));
  const lastLabel = encounter.practice ? "Start practice" : "Let's go";
  const skip =
    last && onSkipPractice ? (
      <button type="button" className={h.skip} onClick={onSkipPractice}>
        Skip practice
      </button>
    ) : null;

  useEffect(() => {
    const t = window.setTimeout(() => (line?.speaker === "narrator" ? sceneBtnRef.current : nextRef.current)?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [i, line?.speaker]);

  if (!line) return null;
  const agentTalking = line.speaker === "agent";
  const danaTalking = line.speaker === "dana";
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
          {skip}
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
              src="/game/sprites/dana.svg"
              alt=""
              className={`${h.actor} ${h.actorDana} ${danaTalking ? h.actorTalking : h.actorQuiet}`}
              width={40}
              height={74}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/game/sprites/resetbot-${agentTalking ? "eager" : "idle"}.svg`}
              alt=""
              className={`${h.actor} ${h.actorBot} ${agentTalking ? h.actorTalking : h.actorQuiet}`}
              width={220}
              height={220}
              style={{ visibility: seenSpeaker ? "visible" : "hidden" }}
            />
          </div>
          <DialogueBox
            speaker={line.speaker}
            role={danaTalking ? "Help desk manager" : agentTalking ? encounter.agent.role : undefined}
            text={line.text}
            index={i}
            total={lines.length}
            agentName={encounter.agent.name}
            reducedMotion={reducedMotion}
            focusRef={nextRef}
            nextLabel={last ? lastLabel : "Next"}
            onNext={next}
            secondary={
              skip ??
              (i > 0 ? (
                <button type="button" className={h.skip} onClick={() => setI(i - 1)}>
                  Back
                </button>
              ) : null)
            }
          />
        </>
      )}
    </div>
  );
}
