"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Briefcase, Building, Check, Circle, Clock, RotateCcw, ShieldCheck, Star, Target, TriangleAlert, X } from "lucide-react";
import { PlanList } from "@/components/skills/PlanList";
import { buttonClass } from "@/components/site/ui";
import { blindBlocks, blindSafeBlocks, scoreBattle } from "@/lib/game/engine";
import { skillName } from "@/lib/game/skills";
import type { BattleState, Encounter, MasterySkillId } from "@/lib/game/types";
import { PRACTICE_BTN } from "./ShiftResult";
import { usePathway } from "@/lib/pathways/context";
import { SpeakerFace, speakerName, speakerNames } from "./SpeakerFace";
import r from "./result.module.css";

export interface ResultScreenProps {
  state: BattleState;
  encounter: Encounter;
  stage: ReactNode;
  stageReady: boolean;
  onPlayAgain: () => void;
  onOffice: () => void;
  /** Once Daily practice is open: the weakest skill of this shift, for "Practice this". */
  practiceSkill?: MasterySkillId | null;
  onPractice?: (skill: MasterySkillId) => void;
}

const STAR_WORDS = ["No stars this time.", "1 star out of 3.", "2 stars out of 3.", "3 stars out of 3!"];

/** End of shift: headline, stars, stats, outro, and a debrief of every plan. */
export function ResultScreen({
  state,
  encounter,
  stage,
  stageReady,
  onPlayAgain,
  onOffice,
  practiceSkill = null,
  onPractice,
}: ResultScreenProps) {
  const { config } = usePathway();
  const score = scoreBattle(state, encounter);
  const won = state.status === "won";
  const outro = won
    ? encounter.outro.win
    : state.status === "lost-breach"
      ? encounter.outro.breach
      : encounter.outro.timeout;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const status = won ? "Shift complete" : state.status === "lost-breach" ? "Breach" : "Out of time";

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  // One row per star, the same additive rule as scoreBattle: finish, then no misses, then careful.
  const blind = blindBlocks(state, encounter).length;
  const careful = score.falseAlarms <= 1 && blind === 0;
  const checklist = [
    { label: "Finish the shift", ok: won },
    { label: "Nothing risky got through", ok: won && score.misses === 0 },
    {
      // Name the rule that actually counts: checked every risky block, but blocked good work twice
      // or more, or blocked a good plan without checking it (the star rule is unchanged).
      label:
        blind === 0 && (score.falseAlarms > 1 || blindSafeBlocks(state, encounter).length > 0)
          ? "Block good work once at most"
          : "You checked before you blocked",
      ok: won && careful,
    },
  ];

  const stats = [
    { label: "Catches", value: score.catches, Icon: ShieldCheck, bg: "var(--hl-teal)", fg: "#fff" },
    { label: "False alarms", value: score.falseAlarms, Icon: TriangleAlert, bg: "var(--hl-orange)", fg: "var(--hl-ink)" },
    { label: "Misses", value: score.misses, Icon: X, bg: "var(--hl-danger)", fg: "#fff" },
    { label: "Turns used", value: `${score.turnsUsed}/${encounter.maxTurns}`, Icon: Clock, bg: "var(--hl-ink)", fg: "#fff" },
  ];

  // One primary button: "Practice this" once Daily practice is open, else "Play again".
  const practice = practiceSkill && onPractice ? practiceSkill : null;
  const buttons = (withPathways: boolean) => (
    <div className={r.buttons}>
      {practice && onPractice ? (
        <button type="button" className={buttonClass("primary", "lg", PRACTICE_BTN)} onClick={() => onPractice(practice)}>
          <Target className="h-5 w-5 flex-none" aria-hidden="true" />
          Practice this: {skillName(practice)}
        </button>
      ) : null}
      <button type="button" className={buttonClass(practice ? "secondary" : "primary", "lg")} onClick={onPlayAgain}>
        <RotateCcw className="h-5 w-5" aria-hidden="true" />
        {practice ? config.copy.replayStory : "Play again"}
      </button>
      <button type="button" className={buttonClass("secondary", "lg")} onClick={onOffice}>
        <Building className="h-5 w-5" aria-hidden="true" />
        Back to the office
      </button>
      {withPathways ? (
        <Link href="/play" className={buttonClass("teal", "lg")}>
          Choose a pathway
        </Link>
      ) : null}
    </div>
  );

  return (
    <div className={r.page}>
      <div className={r.column}>
        <section className={r.hero} aria-labelledby="hl-result-title">
          <div className={r.heroStage}>
            {!stageReady ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={r.heroFallback}
                src={`/game/sprites/${encounter.agent.spriteKey}-${won ? "celebrate" : "sad"}.svg`}
                alt=""
                width={220}
                height={220}
              />
            ) : null}
            {stage}
            <span className={`${r.ribbon} ${won ? r.ribbonWon : r.ribbonLost}`}>{status}</span>
          </div>
          <div className={r.heroBody}>
            <h1 id="hl-result-title" ref={headingRef} tabIndex={-1} className={r.headline}>
              {score.headline}
            </h1>
            <div className={r.stars} role="img" aria-label={STAR_WORDS[score.stars]}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`${r.star} ${i < score.stars ? r.starOn : r.starOff}`}
                  style={{ "--i": i } as CSSProperties}
                  aria-hidden="true"
                >
                  <Star strokeWidth={2.2} />
                </span>
              ))}
            </div>
            <ul className={r.checklist} aria-label="How to earn the stars">
              {checklist.map((row) => (
                <li key={row.label} className={r.checkRow}>
                  <span className={`${r.checkMark} ${row.ok ? r.checkOn : r.checkOff}`} aria-hidden="true">
                    {row.ok ? <Check className="h-4 w-4" strokeWidth={3.2} /> : <Circle className="h-4 w-4" strokeWidth={2.4} />}
                  </span>
                  <span>{row.label}</span>
                  <span className="sr-only">{row.ok ? ": done" : ": not this time"}</span>
                </li>
              ))}
            </ul>
            <ul className={r.stats}>
              {stats.map(({ label, value, Icon, bg, fg }) => (
                <li key={label} className={r.stat}>
                  <span className={r.statIcon} style={{ background: bg, color: fg }} aria-hidden="true">
                    <Icon className="h-4 w-4" strokeWidth={2.8} />
                  </span>
                  <span className={r.statValue}>{value}</span>
                  <span className={r.statLabel}>{label}</span>
                </li>
              ))}
            </ul>
            {buttons(false)}
          </div>
        </section>

        <section className={r.section} aria-labelledby="hl-outro-title">
          <p className={r.eyebrow}>After the shift</p>
          <h2 id="hl-outro-title" className={r.h2}>
            {won ? config.copy.resultHeading.won : config.copy.resultHeading.lost}
          </h2>
          <div className={r.chat}>
            {outro.map((line, i) => (
              <div key={i} className={r.line}>
                <SpeakerFace speaker={line.speaker} size={40} mood={won ? "celebrate" : "sad"} />
                <p className={`${r.lineBubble} ${line.speaker === "narrator" ? r.lineNarrator : ""}`}>
                  {line.speaker !== "narrator" ? (
                    <span className={r.lineName}>{speakerName(line.speaker, speakerNames(encounter))}</span>
                  ) : null}
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={r.section} aria-labelledby="hl-skill-title">
          <p className={r.eyebrow}>The skill</p>
          <h2 id="hl-skill-title" className={r.h2}>
            What this shift teaches
          </h2>
          <div className={r.takeaway}>
            <span className={r.skillTag}>{encounter.debrief.skillTag}</span>
            <p className={r.takeawayText}>{encounter.debrief.takeaway}</p>
          </div>
        </section>

        <section className={r.section} aria-labelledby="hl-debrief-title">
          <p className={r.eyebrow}>Debrief</p>
          <h2 id="hl-debrief-title" className={r.h2}>
            {score.misses || score.falseAlarms ? "Every plan, mistakes first" : "Every plan, one by one"}
          </h2>
          <p className="mt-1 text-[15px] text-ink-soft">Tap a plan to see what happened.</p>
          <PlanList state={state} encounter={encounter} />
        </section>

        <section className={r.career} aria-labelledby="hl-career-title">
          <p className={r.careerEyebrow}>
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            <span id="hl-career-title">Career insight</span>
          </p>
          <p className={r.careerText}>{encounter.debrief.careerInsight}</p>
        </section>

        {buttons(true)}
      </div>
    </div>
  );
}
