"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Play, Target } from "lucide-react";
import { buttonClass } from "@/components/site/ui";
import { isDue } from "@/lib/game/mastery";
import { MASTERY_SKILLS, skillName } from "@/lib/game/skills";
import { usePathway } from "@/lib/pathways/context";
import {
  QUESTION_TITLES,
  dueTagSkills,
  metSkills,
  needReason,
  nextUpSkill,
  skillGroups,
  weekDots,
} from "@/lib/game/skillsView";
import type { CheckQuestion, MasterySkillId, PathwayProgress } from "@/lib/game/types";
import { Pips, questionIcon, skillIcon } from "./SkillBits";
import { SkillDetail } from "./SkillDetail";
import k from "./skills.module.css";

export interface SkillsScreenProps {
  progress: PathwayProgress;
  /** YYYY-MM-DD, the player's local day. */
  today: string;
  /** Tickets in the next drill for a skill (the drill is planned ahead, so the button tells the truth). */
  drillTickets: (skill: MasterySkillId) => number;
  onPractice: (skill: MasterySkillId) => void;
  onBack: () => void;
  /**
   * A paused shift, daily or drill is saved: "Practice this" would replace it, so the buttons
   * resume it instead ("Resume shift").
   */
  resume?: { label: string; onResume: () => void } | null;
}

/** Your skills: the coach's 3 questions (with the pathway's hints), the one skill to practice next, the skills met so far, and the week. */
export function SkillsScreen({ progress, today, drillTickets, onPractice, onBack, resume = null }: SkillsScreenProps) {
  const { coach, skills: copy } = usePathway();
  const skills = progress.skills;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState<MasterySkillId | null>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const met = metSkills(skills);
  const next = nextUpSkill(skills, today);
  const NextIcon = skillIcon(next);
  const groups = skillGroups(skills);
  const unmet = MASTERY_SKILLS.length - met.length;
  const dots = weekDots(progress.days, today);
  const practiced = dots.filter((d) => d.done).length;
  const anyDue = met.some((s) => isDue(skills?.[s], today));
  // "Review due" tags only on the 2 due skills that need it most; the grey line covers the rest.
  const tagged = new Set(dueTagSkills(skills, today));
  const tickets = resume ? 0 : drillTickets(next);

  return (
    <div className={k.page}>
      <div className={k.column}>
        <button type="button" className={k.back} onClick={onBack}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          Back to the office
        </button>
        <h1 ref={headingRef} tabIndex={-1} className={k.title}>
          Your skills
        </h1>
        <ul
          className={`${k.questions} ${copy.questionHints ? k.questionsHinted : ""}`}
          aria-label={`${coach.name}'s 3 questions`}
        >
          {(["who", "record", "undo"] as CheckQuestion[]).map((q) => {
            const Icon = questionIcon(q);
            const hint = copy.questionHints?.[q];
            return (
              <li key={q} className={k.question}>
                <span className={k.questionIcon} aria-hidden="true">
                  <Icon className="h-4 w-4" strokeWidth={2.6} />
                </span>
                {hint ? (
                  <span className="min-w-0">
                    {QUESTION_TITLES[q]}
                    <span className={k.questionHint}>{hint}</span>
                  </span>
                ) : (
                  QUESTION_TITLES[q]
                )}
              </li>
            );
          })}
        </ul>

        <section className={k.nextCard} aria-labelledby="hl-next-up">
          <p id="hl-next-up" className={k.eyebrow}>
            Next up
          </p>
          <p className={k.nextName}>
            <span className={k.bigIcon} aria-hidden="true">
              <NextIcon className="h-5 w-5" strokeWidth={2.4} />
            </span>
            {skillName(next)}
          </p>
          <p className={k.reason}>{needReason(skills?.[next], today)}</p>
          {resume ? (
            <>
              <p className={k.reason}>Finish your open shift first.</p>
              <button type="button" className={buttonClass("primary", "lg")} onClick={resume.onResume}>
                <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
                {resume.label}
              </button>
            </>
          ) : (
            <button type="button" className={buttonClass("primary", "lg")} onClick={() => onPractice(next)}>
              <Target className="h-5 w-5" aria-hidden="true" />
              Practice this · {tickets} tickets
            </button>
          )}
        </section>

        {groups.map((g) => {
          const QIcon = questionIcon(g.question);
          return (
            <section key={g.title} className={k.section} aria-labelledby={`hl-group-${g.question ?? "all"}`}>
              <h2 id={`hl-group-${g.question ?? "all"}`} className={k.h2}>
                <span className={k.h2Icon} aria-hidden="true">
                  <QIcon className="h-4 w-4" strokeWidth={2.6} />
                </span>
                {g.title}
              </h2>
              <ul className={k.rows}>
                {g.skills.map((id) => {
                  const rec = skills?.[id];
                  const Icon = skillIcon(id);
                  const due = tagged.has(id);
                  return (
                    <li key={id}>
                      <button type="button" className={k.row} onClick={() => setOpen(id)} aria-haspopup="dialog">
                        <span className={k.rowIcon} aria-hidden="true">
                          <Icon className="h-5 w-5" strokeWidth={2.3} />
                        </span>
                        <span className={k.rowMain}>
                          <span className={k.rowName}>{skillName(id)}</span>
                          <span className={k.rowLevel}>
                            <Pips level={rec?.level ?? 0} word />
                            {due ? (
                              <span className={k.due}>
                                <Clock className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                                Review due
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <ChevronRight className="h-5 w-5 flex-none text-muted" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {unmet > 0 ? (
          <p className={k.more}>
            {met.length === 0
              ? "Play a shift to find your skills."
              : `${unmet} more ${unmet === 1 ? "skill" : "skills"} to find.`}
          </p>
        ) : null}

        <section className={k.week} aria-labelledby="hl-week">
          <h2 id="hl-week" className={k.weekTitle}>
            Days practiced this week
          </h2>
          <p className="sr-only">
            You practiced on {practiced} of the last 7 days.
          </p>
          <ol className={k.dots} aria-hidden="true">
            {dots.map((d) => (
              <li key={d.day} className={`${k.dotCol} ${d.today ? k.dotToday : ""}`}>
                <span className={`${k.dot} ${d.done ? k.dotOn : ""}`} />
                <span>{d.today ? "Today" : d.letter}</span>
              </li>
            ))}
          </ol>
          {anyDue ? <p className={k.refresh}>Skills need a refresh. A quick practice keeps them sharp.</p> : null}
        </section>
      </div>

      <SkillDetail
        skill={open}
        record={open ? skills?.[open] : undefined}
        onClose={() => setOpen(null)}
        onPractice={(s) => {
          setOpen(null);
          onPractice(s);
        }}
        resume={resume}
      />
    </div>
  );
}
