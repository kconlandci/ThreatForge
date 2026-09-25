"use client";

import { forwardRef, type CSSProperties } from "react";
import { Check, ScrollText, Search } from "lucide-react";
import type { AgentStep } from "@/lib/game/types";
import s from "./battle.module.css";

export type IntentStamp = { label: string; tone: "good" | "bad" | "warn" };

export type PlanStatus = "unchecked" | "checked" | "policy";

const STATUS_WORDS: Record<PlanStatus, string> = {
  unchecked: "Not checked",
  checked: "Checked",
  policy: "Checked by policy",
};

export interface IntentCardProps {
  step: AgentStep;
  /** 1-based position in the execution order; null hides the badge (one plan on the board). */
  order: number | null;
  status: PlanStatus;
  /** Show ResetBot's quip on the card (otherwise it is in the evidence sheet). */
  showQuip: boolean;
  /** A card is selected: "valid" = can target this, "invalid" = can't, null = not targeting. */
  targeting: "valid" | "invalid" | null;
  /** Verb for the tap hint, e.g. "Block". */
  verb?: string;
  tail?: boolean;
  /** The agent is executing this one right now. */
  running?: boolean;
  stamp?: IntentStamp | null;
  leaving?: boolean;
  enterIndex?: number;
  animateIn?: boolean;
  /** The coach points at this plan. */
  coach?: boolean;
  onActivate: (viaKeyboard: boolean) => void;
}

/** One announced plan: a speech bubble from the agent with the plan, a status icon and (room permitting) its quip. */
export const IntentCard = forwardRef<HTMLButtonElement, IntentCardProps>(function IntentCard(
  {
    step,
    order,
    status,
    showQuip,
    targeting,
    verb,
    tail,
    running,
    stamp,
    leaving,
    enterIndex = 0,
    animateIn,
    coach,
    onActivate,
  },
  ref,
) {
  const quipId = `quip-${step.id}`;
  const words = STATUS_WORDS[status];
  const label =
    targeting === "valid"
      ? `${verb ?? "Target"}: ${step.intent}. ${words}.`
      : `${order ? `Plan ${order}: ` : "Plan: "}${step.intent}. ${words}. Open details.`;

  return (
    <li
      className={`${s.intentItem} ${animateIn ? s.intentEnter : ""} ${leaving ? s.leaving : ""}`}
      style={{ "--i": enterIndex } as CSSProperties}
      data-coach={coach ? "on" : undefined}
      data-coach-arrow={coach ? "side" : undefined}
      // A leaving plan is on its way out: hidden from assistive tech and focus, so a closing sheet
      // returns focus to the main button instead of to a card that is about to disappear.
      aria-hidden={leaving || undefined}
      inert={leaving || undefined}
    >
      <button
        ref={ref}
        type="button"
        className={[
          s.intent,
          tail ? s.intentTail : "",
          targeting === "valid" ? s.targetable : "",
          targeting === "invalid" ? s.notTarget : "",
          running ? s.running : "",
        ].join(" ")}
        aria-label={label}
        aria-describedby={showQuip ? quipId : undefined}
        aria-disabled={leaving || undefined}
        data-step={step.id}
        data-target={targeting === "valid" ? "valid" : undefined}
        onClick={(e) => {
          if (leaving) return;
          onActivate(e.detail === 0);
        }}
      >
        {order ? (
          <span className={s.order} aria-hidden="true">
            {order}
          </span>
        ) : null}
        <span className={s.intentBody}>
          <span className={s.intentText}>{step.intent}</span>
          {showQuip ? (
            <span id={quipId} className={s.quip}>
              “{step.quip}”
            </span>
          ) : null}
        </span>
        {!stamp ? (
          <span
            className={`${s.statusIcon} ${status === "unchecked" ? s.statusOpen : s.statusDone}`}
            aria-hidden="true"
            title={words}
          >
            {status === "unchecked" ? (
              <Search className="h-4 w-4" strokeWidth={2.6} />
            ) : status === "policy" ? (
              <ScrollText className="h-4 w-4" strokeWidth={2.6} />
            ) : (
              <Check className="h-5 w-5" strokeWidth={3.2} />
            )}
          </span>
        ) : null}
        {targeting === "valid" && verb ? (
          <span className={s.tapHint} aria-hidden="true">
            {verb}
          </span>
        ) : null}
        {stamp ? (
          <span
            className={`${s.stamp} ${stamp.tone === "good" ? s.stampGood : stamp.tone === "bad" ? s.stampBad : s.stampWarn}`}
            aria-hidden="true"
          >
            {stamp.label}
          </span>
        ) : null}
      </button>
    </li>
  );
});
