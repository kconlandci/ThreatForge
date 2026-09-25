"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Debrief } from "@/components/battle/Debrief";
import { SKILLS } from "@/lib/game/skills";
import { QUESTION_TITLES, planLines } from "@/lib/game/skillsView";
import type { BattleState, Encounter } from "@/lib/game/types";
import { ResultShape, questionIcon } from "./SkillBits";
import k from "./skills.module.css";

/**
 * One line per plan, mistakes first: the result shape, Dana's question and the skill, the plan
 * itself (small, grey), then the tell. In a drill (one skill) the plan leads instead of the skill. Tapping a line opens the full debrief row (what happened, the lesson, what gave it away).
 */
export function PlanList({ state, encounter }: { state: BattleState; encounter: Encounter }) {
  const lines = useMemo(() => planLines(state, encounter), [state, encounter]);
  // In a drill every line has the same skill, so the plan itself leads each line.
  const drill = encounter.mode === "drill";
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const base = useId();
  return (
    <ol className={k.plans}>
      {lines.map(({ step, grade, question, text }) => {
        const isOpen = open.has(step.id);
        const QIcon = questionIcon(question);
        const panelId = `${base}-${step.id}`;
        return (
          <li key={step.id} className={k.plan}>
            <button
              type="button"
              className={k.planBtn}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() =>
                setOpen((cur) => {
                  const next = new Set(cur);
                  if (next.has(step.id)) next.delete(step.id);
                  else next.add(step.id);
                  return next;
                })
              }
            >
              <ResultShape grade={grade.result} size={26} />
              <span className={k.planMain}>
                <span className={k.planHead}>
                  <span className={k.planQ} role="img" aria-label={question ? QUESTION_TITLES[question] : "All 3 check out"}>
                    <QIcon className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
                  </span>
                  {drill ? step.intent : step.skill ? SKILLS[step.skill].name : "Plan"}
                </span>
                {drill ? null : <span className={`${k.planIntent} block`}>{step.intent}</span>}
                <span className={`${k.planText} block`}>{text}</span>
              </span>
              <ChevronDown className={`${k.chev} ${isOpen ? k.chevOpen : ""} h-5 w-5`} aria-hidden="true" />
            </button>
            <div id={panelId} className={k.planMore} hidden={!isOpen}>
              {isOpen ? <Debrief state={state} encounter={encounter} only={new Set([step.id])} /> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
