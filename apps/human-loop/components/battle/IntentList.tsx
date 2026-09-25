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
  /** Show quips on the cards (one plan, or a roomy laptop screen). */
  showQuip: boolean;
  headingId: string;
  /** The shift is over (changes the empty-list message). */
  over?: boolean;
  /** The coach points at the plans. */
  coach?: boolean;
  /** The coach's hint line already says what to do: no empty-board sentence (one instruction per screen). */
  quietEmpty?: boolean;
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
  showQuip,
  headingId,
  over = false,
  coach = false,
  quietEmpty = false,
  onActivate,
  registerIntent,
}: IntentListProps) {
  const agent = encounter.agent.name;
  const live = items.filter((i) => !i.leaving).length;
  const next = encounter.practice ? "Next ticket" : "Next turn";
  let order = 0;
  let enter = 0;
  return (
    <div>
      <h2 id={headingId} className={s.srOnly}>
        {agent}&apos;s plans this turn
      </h2>
      {items.length === 0 ? (
        quietEmpty && !over ? null : (
          <p className={s.intentEmpty}>
            <Coffee aria-hidden="true" className="h-5 w-5 flex-none text-teal" />
            <span>
              {over
                ? encounter.practice
                  ? "Practice is over."
                  : "The shift is over. No more plans today."
                : `${agent.split(" ")[0]} has nothing planned right now. Tap “${next}”.`}
            </span>
          </p>
        )
      ) : (
        <ul className={s.intentList} aria-labelledby={headingId}>
          {items.map((item, i) => {
            const step = stepById(encounter, item.stepId);
            if (!step) return null;
            const rt = state.steps[item.stepId];
            if (!item.leaving) order += 1;
            const targetingState = targeting && !item.leaving ? (targeting.valid.has(item.stepId) ? "valid" : "invalid") : null;
            const status = !rt?.inspected ? "unchecked" : autoInspected.has(item.stepId) ? "policy" : "checked";
            return (
              <IntentCard
                key={`${item.stepId}-${item.keySuffix ?? ""}`}
                ref={(el) => registerIntent(item.stepId, el)}
                step={step}
                order={live >= 2 ? (item.leaving ? i + 1 : order) : null}
                status={status}
                showQuip={showQuip}
                targeting={targetingState}
                verb={targeting?.verb}
                tail={i === 0}
                running={item.running}
                stamp={item.stamp}
                leaving={item.leaving}
                animateIn={item.animateIn}
                enterIndex={item.animateIn ? enter++ : 0}
                coach={coach && !item.leaving && (!targeting || targetingState === "valid")}
                onActivate={(kb) => onActivate(item.stepId, kb)}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
