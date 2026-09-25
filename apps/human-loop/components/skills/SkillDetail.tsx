"use client";

import { useId, useRef } from "react";
import { Play, Target } from "lucide-react";
import { Sheet } from "@/components/battle/Sheet";
import { buttonClass } from "@/components/site/ui";
import { reasonText } from "@/lib/game/mastery";
import { usePathway } from "@/lib/pathways/context";
import { nextPipText, recentCalls } from "@/lib/game/skillsView";
import type { MasterySkillId, SkillRecord } from "@/lib/game/types";
import { CallRow, Pips, skillIcon } from "./SkillBits";
import k from "./skills.module.css";

/** One skill in a bottom sheet: what it means, where to look, the last 6 calls and the latest tell. */
export function SkillDetail({
  skill,
  record,
  onClose,
  onPractice,
  resume = null,
}: {
  skill: MasterySkillId | null;
  record: SkillRecord | undefined;
  onClose: () => void;
  onPractice: (skill: MasterySkillId) => void;
  /** A paused battle is saved: the footer resumes it instead of starting a drill that would replace it. */
  resume?: { label: string; onResume: () => void } | null;
}) {
  const titleId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const pathway = usePathway();
  const info = skill ? pathway.skill(skill) : null;
  const Icon = skill ? skillIcon(skill) : Target;
  const miss = pathway.step(record?.miss);
  return (
    <Sheet
      open={!!skill}
      onClose={onClose}
      labelledBy={titleId}
      header={
        info ? (
          <div className="flex items-start gap-3">
            <span className={k.bigIcon} aria-hidden="true">
              <Icon className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-xl font-bold leading-tight text-ink">
                {info.name}
              </h2>
              <div className="mt-1">
                <Pips level={record?.level ?? 0} word />
              </div>
            </div>
          </div>
        ) : (
          <h2 id={titleId}>Skill</h2>
        )
      }
      footer={
        skill && resume ? (
          <button ref={btnRef} type="button" className={buttonClass("primary", "lg", "w-full")} onClick={resume.onResume}>
            <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
            {resume.label}
          </button>
        ) : skill ? (
          <button ref={btnRef} type="button" className={buttonClass("primary", "lg", "w-full")} onClick={() => onPractice(skill)}>
            <Target className="h-5 w-5" aria-hidden="true" />
            Practice this
          </button>
        ) : null
      }
    >
      {info ? (
        <>
          <div className={k.detailBlock}>
            <p className={k.detailLabel}>What it means</p>
            <p className={k.detailText}>{info.oneLiner}</p>
          </div>
          <div className={k.detailBlock}>
            <p className={k.detailLabel}>Where to look</p>
            <p className={k.detailText}>{info.whereToLook}</p>
          </div>
          {info.example ? (
            <div className={k.detailBlock}>
              <p className={k.detailLabel}>Example</p>
              <p className={k.detailText}>{info.example}</p>
            </div>
          ) : null}
          <div className={k.detailBlock}>
            <p className={k.detailLabel}>Next pip</p>
            <p className={k.detailText}>{nextPipText(skill as MasterySkillId, record?.level ?? 0)}</p>
          </div>
          <div className={k.detailBlock}>
            <p className={k.detailLabel}>Your last calls</p>
            <div className="mt-2">
              <CallRow calls={recentCalls(record)} />
            </div>
          </div>
          {miss?.tell ? (
            <div className={k.detailBlock}>
              <p className={k.detailLabel}>From your latest miss</p>
              <p className={k.tell}>
                <span className={k.tellIntent}>{miss.intent}</span>
                {record?.missWhy ? `${reasonText(record.missWhy, pathway.coach.name)}. ` : ""}
                {miss.tell}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}
