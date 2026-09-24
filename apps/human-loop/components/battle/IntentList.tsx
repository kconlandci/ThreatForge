"use client";

import { Coffee } from "lucide-react";
import { stepById } from "@/lib/game/useBattle";
import type { BattleState, Encounter } from "@/lib/game/types";
import { IntentCard, type IntentStamp } from "./IntentCard";
import s from "./battle.module.css";

export interface IntentItem {
  stepId: string;
  stamp?: IntentStamp | null;
  leaving?: boolean;
  running?: boolean;
  animateIn?: boolean;
  /** Key suffix: changes when the same step is announced again (after a false alarm). */
  keySuffix?: string | number;
}

export interface IntentListProps {
  items: IntentItem[];
  encounter: Encounter;
  state: BattleState;
  autoInspected: Set<string>;
  /** When a card that targets intents is selected. */
  targeting: { valid: Set<string>; verb: string } | null;
  compact: boolean;
  headingId: string;
  /** The shift is over (changes the empty-list message). */
  over?: boolean;
  onActivate: (stepId: string, viaKeyboard: boolean) => void;
  registerIntent: (stepId: string, el: HTMLButtonElement | null) => void;
}

/** The agent's announced plans for this turn, in the order it will run them. */
export function IntentList({
  items,
  encounter,
  state,
  autoInspected,
  targeting,
  compact,
  headingId,
  over = false,
  onActivate,
  registerIntent,
}: IntentListProps) {
  const agent = encounter.agent.name;
  let order = 0;
  let enter = 0;
  return (
    <div>
      <h2 id={headingId} className={s.srOnly}>
        {agent}&apos;s plans this turn
      </h2>
      {items.length === 0 ? (
        <p className={s.intentEmpty}>
          <Coffee aria-hidden="true" className="h-5 w-5 flex-none text-teal" />
          <span>
            {over
              ? "The shift is over. No more plans today."
              : `${agent} has nothing planned right now. End the turn to see what it does next.`}
          </span>
        </p>
      ) : (
        <ul className={s.intentList} aria-labelledby={headingId}>
          {items.map((item, i) => {
            const step = stepById(encounter, item.stepId);
            if (!step) return null;
            const rt = state.steps[item.stepId];
            if (!item.leaving) order += 1;
            const targetingState = targeting && !item.leaving ? (targeting.valid.has(item.stepId) ? "valid" : "invalid") : null;
            return (
              <IntentCard
                key={`${item.stepId}-${item.keySuffix ?? ""}`}
                ref={(el) => registerIntent(item.stepId, el)}
                step={step}
                order={item.leaving ? i + 1 : order}
                inspected={!!rt?.inspected}
                byPolicy={autoInspected.has(item.stepId)}
                targeting={targetingState}
                verb={targeting?.verb}
                tail={i === 0}
                compact={compact}
                running={item.running}
                stamp={item.stamp}
                leaving={item.leaving}
                animateIn={item.animateIn}
                enterIndex={item.animateIn ? enter++ : 0}
                onActivate={(kb) => onActivate(item.stepId, kb)}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
