"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Play, Target } from "lucide-react";
import { CallRow, Pips, skillIcon } from "@/components/skills/SkillBits";
import { PlanList } from "@/components/skills/PlanList";
import k from "@/components/skills/skills.module.css";
import { buttonClass } from "@/components/site/ui";
import { shiftTally } from "@/lib/game/mastery";
import { skillName } from "@/lib/game/skills";
import { orderMoves, planLines, recentCalls, reviewDays, tallyHeadline, weakestInShift } from "@/lib/game/skillsView";
import type { BattleState, Encounter, MasterySkillId, PathwayProgress, SkillLevel } from "@/lib/game/types";
import { SpeakerFace, speakerName } from "./SpeakerFace";
import r from "./result.module.css";

/** "Practice this: Approve what checks out" can be long: wrap to a balanced second line, never overflow. */
export const PRACTICE_BTN = "w-full py-2 text-balance leading-tight";

export interface SkillMove {
  skill: MasterySkillId;
  from: SkillLevel;
  to: SkillLevel;
}

export interface ShiftResultProps {
  state: BattleState;
  /** The Daily practice or drill that just ended. */
  encounter: Encounter;
  progress: PathwayProgress;
  today: string;
  /** Skills whose level changed in this shift (empty after a reload). */
  moved: SkillMove[];
  /** The daily's focus or the drill's skill. */
  focus: MasterySkillId | null;
  stage: ReactNode;
  stageReady: boolean;
  onPractice: (skill: MasterySkillId) => void;
  onOneMore: () => void;
  onSkills: () => void;
  onOffice: () => void;
}

/** End of a Daily practice or drill: counts and a quip, skills that moved, then one line per plan. */
export function ShiftResult({
  state,
  encounter,
  progress,
  today,
  moved,
  focus,
  stage,
  stageReady,
  onPractice,
  onOneMore,
  onSkills,
  onOffice,
}: ShiftResultProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const drill = encounter.mode === "drill";
  const tally = shiftTally(state, encounter);
  const judged = tally.right + tally.partly + tally.missed;
  const headline = drill ? `${tally.right} of ${judged || encounter.steps.length} right` : tallyHeadline(tally);
  const clean = tally.partly + tally.missed === 0;
  const won = state.status === "won";
  const lines = planLines(state, encounter);
  // Ollie's line fits what happened: count only risky plans that really ran (a rolled-back good
  // plan is a miss too, but nothing "got through").
  const through = lines.filter((l) => !l.step.safe && l.grade.result === "W").length;
  const o = encounter.outro;
  const outro = won
    ? through > 1 && o.winWithMisses?.length
      ? o.winWithMisses
      : through === 1 && (o.winWithOneMiss?.length || o.winWithMisses?.length)
        ? o.winWithOneMiss?.length
          ? o.winWithOneMiss
          : o.winWithMisses!
        : drill && o.drillWin?.length
          ? o.drillWin
          : o.win
    : state.status === "lost-breach"
      ? o.breach
      : o.timeout;
  // One quip: Ollie's line (or the first line when Ollie has none).
  const quip = outro.find((l) => l.speaker === "agent") ?? outro[0];
  // The same mood as the big stage Ollie (GameShell sends celebrate / sad by the outcome).
  const mood = won ? "celebrate" : "sad";

  const weakest = weakestInShift(lines, progress.skills, today);
  const ordered = orderMoves(moved, focus, lines);
  const shown = ordered.slice(0, 2);
  const more = ordered.length - shown.length;
  const drillSkill = drill ? focus : null;
  const drillLevel = drillSkill ? progress.skills?.[drillSkill]?.level ?? 0 : 0;

  return (
    <div className={r.page}>
      <div className={r.column}>
        <section className={r.hero} aria-labelledby="hl-result-title">
          <div className={r.heroStage}>
            {!stageReady ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={r.heroFallback}
                src={`/game/sprites/ollie-${mood}.svg`}
                alt=""
                width={220}
                height={220}
              />
            ) : null}
            {stage}
            <span className={`${r.ribbon} ${won ? r.ribbonWon : r.ribbonLost}`}>{drill ? "Drill done" : "Practice done"}</span>
          </div>
          <div className={r.heroBody}>
            <p className={r.eyebrow}>{encounter.title}</p>
            <h1 id="hl-result-title" ref={headingRef} tabIndex={-1} className={r.headline}>
              {headline.split(" · ").map((part, i) => (
                <Fragment key={i}>
                  {i ? "\u00a0· " : ""}
                  <span className="whitespace-nowrap">{part}</span>
                </Fragment>
              ))}
            </h1>
            {quip ? (
              <div className={`${r.chat} mt-3 text-left`}>
                <div className={r.line}>
                  <SpeakerFace speaker={quip.speaker} size={40} mood={mood} />
                  <p className={`${r.lineBubble} ${quip.speaker === "narrator" ? r.lineNarrator : ""}`}>
                    {quip.speaker !== "narrator" ? (
                      <span className={r.lineName}>{speakerName(quip.speaker, encounter.agent.name)}</span>
                    ) : null}
                    {quip.text}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {drillSkill ? (
          <section className={r.section} aria-labelledby="hl-drill-skill">
            <h2 id="hl-drill-skill" className={r.h2}>
              {skillName(drillSkill)}
            </h2>
            <div className={`${k.movedRow} mt-3`}>
              <Pips level={drillLevel} word />
              <span className="text-[16px] text-ink">
                Check back in {reviewDays(drillLevel)} {reviewDays(drillLevel) === 1 ? "day" : "days"}.
              </span>
            </div>
          </section>
        ) : (
          <section className={r.section} aria-labelledby="hl-moved">
            <h2 id="hl-moved" className={r.h2}>
              {shown.length ? "Skills moved" : focus ? `${skillName(focus)}: your last calls` : "Skills"}
            </h2>
            {shown.length ? (
              <>
                <ul className={k.moved}>
                  {shown.map((m) => {
                    const Icon = skillIcon(m.skill);
                    const Dir = m.up ? ArrowUp : ArrowDown;
                    return (
                      <li key={m.skill} className={k.movedRow}>
                        <span className={k.movedName}>
                          <Icon className="h-5 w-5 flex-none text-teal" aria-hidden="true" />
                          {skillName(m.skill)}
                        </span>
                        <span className={`${k.movedDir} ${m.up ? k.movedUp : k.movedDown}`}>
                          <Dir className="h-4 w-4" strokeWidth={2.8} aria-hidden="true" />
                          {m.up ? "Up" : "Down"}
                        </span>
                        <span className={k.movedPips}>
                          <Pips level={m.from} size="sm" />
                          <ArrowRight className="h-4 w-4" aria-label="to" />
                          <Pips level={m.to} size="sm" word />
                        </span>
                        {m.why ? <span className={k.movedWhy}>{m.why}</span> : null}
                      </li>
                    );
                  })}
                </ul>
                {more > 0 ? (
                  <button type="button" className={`${r.textLink} mt-1`} onClick={onSkills}>
                    +{more} more changed · Your skills
                  </button>
                ) : null}
              </>
            ) : focus ? (
              <div className="mt-3">
                <CallRow calls={recentCalls(progress.skills?.[focus])} />
              </div>
            ) : null}
          </section>
        )}

        <section className={r.section} aria-labelledby="hl-plans">
          <h2 id="hl-plans" className={r.h2}>
            {clean ? "Every plan" : "Every plan, mistakes first"}
          </h2>
          <p className="mt-1 text-[15px] text-ink-soft">Tap a plan to see what happened.</p>
          <PlanList state={state} encounter={encounter} />
        </section>

        <div className={r.stickyFoot}>
          {weakest ? (
            <button type="button" className={buttonClass("primary", "lg", PRACTICE_BTN)} onClick={() => onPractice(weakest)}>
              <Target className="h-5 w-5 flex-none" aria-hidden="true" />
              Practice this: {skillName(weakest)}
            </button>
          ) : (
            <button type="button" className={buttonClass("primary", "lg", "w-full")} onClick={onOneMore}>
              <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
              One more shift
            </button>
          )}
          <div className={`${r.footRow} justify-center`}>
            <button type="button" className={r.textLink} onClick={onSkills}>
              Your skills
            </button>
            <button type="button" className={r.textLink} onClick={onOffice}>
              Back to the office
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
