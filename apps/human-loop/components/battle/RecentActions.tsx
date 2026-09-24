"use client";

import { Check, TriangleAlert, Undo2 } from "lucide-react";
import { stepById } from "@/lib/game/useBattle";
import type { BattleState, Encounter } from "@/lib/game/types";
import s from "./battle.module.css";

export interface RecentActionsProps {
  state: BattleState;
  encounter: Encounter;
  /** Roll Back is selected: these executed steps can be undone. */
  targets: Set<string> | null;
  onActivate: (stepId: string, viaKeyboard: boolean) => void;
  registerTarget: (stepId: string, el: HTMLButtonElement | null) => void;
}

/** Things the agent already did, newest first. Roll Back targets these. */
export function RecentActions({ state, encounter, targets, onActivate, registerTarget }: RecentActionsProps) {
  const seen = new Set<string>();
  const ids = state.executedHistory
    .slice()
    .reverse()
    .filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
  if (ids.length === 0) return null;

  return (
    <div className={s.tray} role="group" aria-label="Recent actions by the agent">
      <span className={s.trayLabel} aria-hidden="true">
        Done
      </span>
      {ids.map((id) => {
        const step = stepById(encounter, id);
        if (!step) return null;
        const undone = state.steps[id]?.status === "rolled-back";
        const isTarget = targets?.has(id) ?? false;
        const status = undone ? "Rolled back" : step.safe ? "Went fine" : "Risky, it went through";
        return (
          <button
            key={id}
            ref={(el) => registerTarget(id, el)}
            type="button"
            className={[
              s.trayChip,
              undone ? s.trayUndone : "",
              isTarget ? s.trayTarget : "",
              targets && !isTarget ? s.trayDim : "",
            ].join(" ")}
            aria-label={isTarget ? `Roll Back: ${step.intent}` : `${step.intent}. ${status}. Show details.`}
            data-step={id}
            data-target={isTarget ? "valid" : undefined}
            onClick={(e) => onActivate(id, e.detail === 0)}
          >
            <span
              className={`${s.trayDot} ${undone ? s.trayDotUndone : step.safe ? s.trayDotSafe : s.trayDotRisk}`}
              aria-hidden="true"
            >
              {undone ? (
                <Undo2 className="h-3 w-3" strokeWidth={3} />
              ) : step.safe ? (
                <Check className="h-3 w-3" strokeWidth={3.5} />
              ) : (
                <TriangleAlert className="h-3 w-3" strokeWidth={3} />
              )}
            </span>
            <span>{step.intent}</span>
          </button>
        );
      })}
    </div>
  );
}
