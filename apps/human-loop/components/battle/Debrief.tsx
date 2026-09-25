import { Check, Flag, Minus, TriangleAlert, X } from "lucide-react";
import type { BattleState, Encounter } from "@/lib/game/types";
import { debriefRows, type Grade } from "@/lib/game/useBattle";
import { Artifact } from "./EvidencePanel";
import r from "./result.module.css";

const GRADE: Record<Grade, { cls: string; label: string; Icon: typeof Check }> = {
  good: { cls: r.gradeGood, label: "Good call", Icon: Check },
  ok: { cls: r.gradeOk, label: "Okay, with a cost", Icon: Minus },
  bad: { cls: r.gradeBad, label: "Missed", Icon: X },
  none: { cls: r.gradeNone, label: "Not reached", Icon: Minus },
};

/** Every plan of the shift: was it safe, what happened, the lesson, and what gave it away. */
export function Debrief({
  state,
  encounter,
  only,
  mistakesFirst = false,
}: {
  state: BattleState;
  encounter: Encounter;
  /** Show only these steps (the practice result lists just the mistakes). */
  only?: Set<string>;
  /** List misses first, then calls that cost something, then the rest (each group in queue order). */
  mistakesFirst?: boolean;
}) {
  const rank: Record<Grade, number> = { bad: 0, ok: 1, good: 2, none: 3 };
  const rows = debriefRows(state, encounter)
    .filter((row) => !only || only.has(row.step.id))
    .map((row, i) => ({ row, i }))
    .sort((a, b) => (mistakesFirst ? rank[a.row.grade] - rank[b.row.grade] : 0) || a.i - b.i)
    .map(({ row }) => row);
  return (
    <ol className={r.debrief}>
      {rows.map(({ step, resolution, grade, redFlags }) => {
        const g = GRADE[grade];
        return (
          <li key={step.id} className={r.row}>
            <div className={r.rowHead}>
              {step.safe ? (
                <span className={`${r.verdict} ${r.verdictSafe}`}>
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                  Safe
                </span>
              ) : (
                <span className={`${r.verdict} ${r.verdictRisky}`}>
                  <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
                  Risky
                </span>
              )}
              <span className={r.rowTicket}>{step.ticket}</span>
              <span className={`${r.grade} ${g.cls}`} role="img" aria-label={g.label}>
                <g.Icon className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              </span>
            </div>
            <h3 className={r.rowTitle}>{step.intent}</h3>
            <p className={r.resolution}>{resolution}</p>
            <p className={r.lesson}>
              <strong>Lesson: </strong>
              {step.lesson}
            </p>
            {!step.safe && redFlags.length ? (
              <div className={r.flags}>
                <p className={r.flagsTitle}>
                  <Flag className="h-4 w-4" aria-hidden="true" strokeWidth={2.6} />
                  What gave it away
                </p>
                <ul className={r.flagList}>
                  {redFlags.map((f) => (
                    <li key={f.label}>
                      <p className={r.flagLabel}>{f.label}</p>
                      <Artifact label={f.label} detail={f.detail} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
