"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Play, RotateCcw, Target } from "lucide-react";
import { PlanList } from "@/components/skills/PlanList";
import { buttonClass } from "@/components/site/ui";
import { gradePlan } from "@/lib/game/mastery";
import { skillName } from "@/lib/game/skills";
import type { BattleState, Encounter, MasterySkillId } from "@/lib/game/types";
import { PRACTICE_BTN } from "./ShiftResult";
import { SpeakerFace, speakerName, speakerNames } from "./SpeakerFace";
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
  /** Once Daily practice is open: the weakest skill of this shift, for "Practice this". */
  practiceSkill?: MasterySkillId | null;
  onPractice?: (skill: MasterySkillId) => void;
}

/** Plans the player got wrong: risky ones that ran, and good ones they blocked. */
export function practiceMistakes(state: BattleState, encounter: Encounter): { misses: string[]; falseAlarms: string[] } {
  const misses: string[] = [];
  const falseAlarms: string[] = [];
  // Same grading as the debrief and skills (mastery.gradePlan): a risky plan that got through, or a
  // safe plan that was blocked or rolled back (approve-checked graded W).
  for (const step of encounter.steps) {
    const g = gradePlan(step, state.steps[step.id]);
    if (!step.safe && g.result === "W") misses.push(step.id);
    if (step.safe && g.calls.some((c) => c.skill === "approve-checked" && c.grade === "W")) falseAlarms.push(step.id);
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
  practiceSkill = null,
  onPractice,
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
  // After the first Monday, practice is a replay: "Practice this" leads, and the real shift intro is left out.
  const practice = practiceSkill && onPractice ? practiceSkill : null;
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
                src={`/game/sprites/${encounter.agent.spriteKey}-${clean || state.status === "won" ? "celebrate" : "sad"}.svg`}
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
                      <span className={r.lineName}>{speakerName(line.speaker, speakerNames(encounter))}</span>
                    ) : null}
                    {line.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={r.section} aria-labelledby="hl-giveaway-title">
          <h2 id="hl-giveaway-title" className={r.h2}>
            {mistakes.size ? "What gave it away" : "Every plan"}
          </h2>
          <p className="mt-1 text-[15px] text-ink-soft">Tap a plan to see what happened.</p>
          <PlanList state={state} encounter={encounter} />
        </section>

        {practice ? null : (
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
                  {line.speaker !== "narrator" ? <span className={r.lineName}>{speakerName(line.speaker, speakerNames(next))}</span> : null}
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        </section>
        )}

        <div className={r.stickyFoot}>
          {practice && onPractice ? (
            <button type="button" className={buttonClass("primary", "lg", PRACTICE_BTN)} onClick={() => onPractice(practice)}>
              <Target className="h-5 w-5 flex-none" aria-hidden="true" />
              Practice this: {skillName(practice)}
            </button>
          ) : againFirst ? (
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
            {againFirst && !practice ? (
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
