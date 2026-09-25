"use client";

import { useEffect, useRef } from "react";
import { ClipboardList, Play, Target, X } from "lucide-react";
import { SpeakerFace, speakerName, speakerNames } from "@/components/battle/SpeakerFace";
import r from "@/components/battle/result.module.css";
import type { Encounter } from "@/lib/game/types";
import h from "./hub.module.css";

/**
 * One screen before a Daily practice or drill: what it is, the coach's and the agent's two intro lines, and
 * one Start button. (The battle is already saved, so a reload here offers "Resume".)
 */
export function ShiftIntro({
  encounter,
  focus,
  tickets,
  onStart,
}: {
  encounter: Encounter;
  /** The daily's focus or the drill's skill, by name. */
  focus: string | null;
  /** Tickets in the shift. */
  tickets: number;
  onStart: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => btnRef.current?.focus({ preventScroll: true }), 40);
    return () => window.clearTimeout(t);
  }, []);

  const drill = encounter.mode === "drill";
  const plans = encounter.steps.length;
  const Icon = drill ? Target : ClipboardList;
  const title = drill
    ? `Drill: ${focus ?? encounter.title.replace(/^Drill: /, "")}. ${plans} plans, one at a time.`
    : `${tickets} new tickets, picked for the skills you need most.`;
  const sub = drill ? "Same skill on every plan. Some are safe, some are not." : focus ? `Focus: ${focus}` : encounter.subtitle;

  return (
    <div className={`${h.intro} ${h.brief}`} role="region" aria-labelledby="hl-brief-title">
      <button type="button" className={h.introSkip} onClick={onStart}>
        Skip
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <section className={h.briefCard}>
        <span className={h.clock} aria-hidden="true">
          <Icon className="h-6 w-6" strokeWidth={2.4} />
        </span>
        <p className={h.sceneEyebrow}>{drill ? "Practice one skill" : encounter.title}</p>
        <h2 id="hl-brief-title" className={h.sceneTitle}>
          {title}
        </h2>
        <p className={h.sceneSub}>{sub}</p>
        {encounter.intro.length ? (
          <div className={`${r.chat} text-left`}>
            {encounter.intro.slice(0, 2).map((line, i) => (
              <div key={i} className={r.line}>
                <SpeakerFace speaker={line.speaker} size={36} mood={line.speaker === "agent" ? "eager" : "idle"} />
                <p className={`${r.lineBubble} ${line.speaker === "narrator" ? r.lineNarrator : ""}`}>
                  {line.speaker !== "narrator" ? (
                    <span className={r.lineName}>{speakerName(line.speaker, speakerNames(encounter))}</span>
                  ) : null}
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <button
          ref={btnRef}
          type="button"
          className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border-2 border-ink bg-orange px-5 font-display text-lg font-bold text-ink shadow-[0_4px_0_0_var(--hl-ink)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)]"
          onClick={onStart}
        >
          <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
          Start
        </button>
      </section>
    </div>
  );
}
