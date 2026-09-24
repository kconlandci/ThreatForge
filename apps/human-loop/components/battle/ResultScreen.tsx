"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Briefcase, Building, Clock, RotateCcw, ShieldCheck, Star, TriangleAlert, X } from "lucide-react";
import { buttonClass } from "@/components/site/ui";
import { scoreBattle } from "@/lib/game/engine";
import type { BattleState, Encounter } from "@/lib/game/types";
import { Debrief } from "./Debrief";
import { SpeakerFace, speakerName } from "./SpeakerFace";
import r from "./result.module.css";

export interface ResultScreenProps {
  state: BattleState;
  encounter: Encounter;
  stage: ReactNode;
  stageReady: boolean;
  onPlayAgain: () => void;
  onOffice: () => void;
}

const STAR_WORDS = ["No stars this time.", "1 star out of 3.", "2 stars out of 3.", "3 stars out of 3!"];

/** End of shift: headline, stars, stats, outro, and a debrief of every plan. */
export function ResultScreen({ state, encounter, stage, stageReady, onPlayAgain, onOffice }: ResultScreenProps) {
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

  const stats = [
    { label: "Catches", value: score.catches, Icon: ShieldCheck, bg: "var(--hl-teal)", fg: "#fff" },
    { label: "False alarms", value: score.falseAlarms, Icon: TriangleAlert, bg: "var(--hl-orange)", fg: "var(--hl-ink)" },
    { label: "Misses", value: score.misses, Icon: X, bg: "var(--hl-danger)", fg: "#fff" },
    { label: "Turns used", value: `${score.turnsUsed}/${encounter.maxTurns}`, Icon: Clock, bg: "var(--hl-ink)", fg: "#fff" },
  ];

  const buttons = (withPathways: boolean) => (
    <div className={r.buttons}>
      <button type="button" className={buttonClass("primary", "lg")} onClick={onPlayAgain}>
        <RotateCcw className="h-5 w-5" aria-hidden="true" />
        Play again
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
                src={`/game/sprites/resetbot-${won ? "celebrate" : "sad"}.svg`}
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
            <p className={r.starsLabel}>
              {won
                ? "1 star for finishing. 1 for no misses. 1 for one false alarm or fewer."
                : "Finish the shift to earn stars. Try again: you know more now."}
            </p>
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
            {won ? "Dana stops by" : "Dana stops by. She has notes."}
          </h2>
          <div className={r.chat}>
            {outro.map((line, i) => (
              <div key={i} className={r.line}>
                <SpeakerFace speaker={line.speaker} size={40} mood={won ? "celebrate" : "sad"} />
                <p className={`${r.lineBubble} ${line.speaker === "narrator" ? r.lineNarrator : ""}`}>
                  {line.speaker !== "narrator" ? (
                    <span className={r.lineName}>{speakerName(line.speaker, encounter.agent.name)}</span>
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
            Every plan, one by one
          </h2>
          <Debrief state={state} encounter={encounter} />
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
