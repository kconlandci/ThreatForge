"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Play, RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/site/ui";
import type { BattleState, Encounter } from "@/lib/game/types";
import { Debrief } from "./Debrief";
import { SpeakerFace, speakerName } from "./SpeakerFace";
import r from "./result.module.css";

export interface PracticeResultProps {
  state: BattleState;
  /** The practice shift that just ended. */
  encounter: Encounter;
  /** The real shift that comes next (its intro lines show under "Up next"). */
  next: Encounter;
  stage: ReactNode;
  stageReady: boolean;
  onStartShift: () => void;
  onPracticeAgain: () => void;
  onOffice: () => void;
}

/** Plans the player got wrong: risky ones that ran, and good ones they blocked. */
export function practiceMistakes(state: BattleState, encounter: Encounter): { misses: string[]; falseAlarms: string[] } {
  const misses: string[] = [];
  const falseAlarms: string[] = [];
  for (const step of encounter.steps) {
    const rt = state.steps[step.id];
    if (!rt) continue;
    if (!step.safe && rt.status === "executed") misses.push(step.id);
    if (step.safe && (rt.requeues > 0 || rt.status === "rolled-back")) falseAlarms.push(step.id);
  }
  return { misses, falseAlarms };
}

export function practiceHeadline(state: BattleState, encounter: Encounter): string {
  const { misses, falseAlarms } = practiceMistakes(state, encounter);
  if (state.status === "lost-timeout") return "Out of time. Good plans got stuck in line.";
  if (misses.length) {
    return `You finished. ${misses.length} risky ${misses.length === 1 ? "plan" : "plans"} got through.`;
  }
  const blocked = state.stats.falseAlarms;
  if (falseAlarms.length || blocked) {
    const n = Math.max(1, blocked);
    return `You finished. Good work got blocked ${n} ${n === 1 ? "time" : "times"}.`;
  }
  return "You checked first. That's the job.";
}

/** End of practice: no stars, no stats. What happened, what gave it away, and the real shift next. */
export function PracticeResult({
  state,
  encounter,
  next,
  stage,
  stageReady,
  onStartShift,
  onPracticeAgain,
  onOffice,
}: PracticeResultProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const { misses, falseAlarms } = practiceMistakes(state, encounter);
  const mistakes = new Set([...misses, ...falseAlarms]);
  const clean = state.status === "won" && mistakes.size === 0;
  // A "win" where risky plans got through gets its own outro: no praise for approving everything.
  const outro =
    state.status === "won"
      ? misses.length && encounter.outro.winWithMisses
        ? encounter.outro.winWithMisses
        : encounter.outro.win
      : state.status === "lost-breach"
        ? encounter.outro.breach
        : encounter.outro.timeout;
  // Risky plans got through: practising again is the main suggestion; the real shift is still one tap away.
  const againFirst = misses.length > 0;
  const mood = state.status === "won" ? "celebrate" : "sad";

  return (
    <div className={r.page}>
      <div className={r.column}>
        <section className={r.hero} aria-labelledby="hl-result-title">
          <div className={r.heroStage}>
            {!stageReady ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={r.heroFallback}
                src={`/game/sprites/resetbot-${clean || state.status === "won" ? "celebrate" : "sad"}.svg`}
                alt=""
                width={220}
                height={220}
              />
            ) : null}
            {stage}
            <span className={`${r.ribbon} ${state.status === "won" ? r.ribbonWon : r.ribbonLost}`}>Practice done</span>
          </div>
          <div className={r.heroBody}>
            <h1 id="hl-result-title" ref={headingRef} tabIndex={-1} className={r.headline}>
              {practiceHeadline(state, encounter)}
            </h1>
            <div className={`${r.chat} mt-4 text-left`}>
              {outro.map((line, i) => (
                <div key={i} className={r.line}>
                  <SpeakerFace speaker={line.speaker} size={40} mood={mood} />
                  <p className={`${r.lineBubble} ${line.speaker === "narrator" ? r.lineNarrator : ""}`}>
                    {line.speaker !== "narrator" ? (
                      <span className={r.lineName}>{speakerName(line.speaker, encounter.agent.name)}</span>
                    ) : null}
                    {line.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {mistakes.size ? (
          <section className={r.section} aria-labelledby="hl-giveaway-title">
            <h2 id="hl-giveaway-title" className={r.h2}>
              What gave it away
            </h2>
            <Debrief state={state} encounter={encounter} only={mistakes} />
          </section>
        ) : null}

        <section className={r.section} aria-labelledby="hl-next-title">
          <p className={r.eyebrow}>{next.title}</p>
          <h2 id="hl-next-title" className={r.h2}>
            Up next: the real shift
          </h2>
          <div className={r.chat}>
            {next.intro.map((line, i) => (
              <div key={i} className={r.line}>
                <SpeakerFace speaker={line.speaker} size={40} mood="eager" />
                <p className={`${r.lineBubble} ${line.speaker === "narrator" ? r.lineNarrator : ""}`}>
                  {line.speaker !== "narrator" ? <span className={r.lineName}>{speakerName(line.speaker, next.agent.name)}</span> : null}
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className={r.stickyFoot}>
          {againFirst ? (
            <button type="button" className={buttonClass("primary", "lg", "w-full")} onClick={onPracticeAgain}>
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              Practice again
            </button>
          ) : (
            <button type="button" className={buttonClass("primary", "lg", "w-full")} onClick={onStartShift}>
              <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
              Start the real shift
            </button>
          )}
          <div className={r.footRow}>
            {againFirst ? (
              <button type="button" className={buttonClass("secondary", "md", "flex-1 whitespace-nowrap px-3")} onClick={onStartShift}>
                <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
                Start the real shift
              </button>
            ) : (
              <button type="button" className={buttonClass("secondary", "md", "flex-1 whitespace-nowrap px-3")} onClick={onPracticeAgain}>
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
                Practice again
              </button>
            )}
            <button type="button" className={r.textLink} onClick={onOffice}>
              Back to the office
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
