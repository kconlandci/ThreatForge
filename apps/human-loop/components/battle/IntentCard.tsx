"use client";

import { forwardRef, type CSSProperties } from "react";
import { ChevronRight, ScrollText, Search } from "lucide-react";
import type { AgentStep } from "@/lib/game/types";
import { CATEGORY_ICON } from "./icons";
import s from "./battle.module.css";

export type IntentStamp = { label: string; tone: "good" | "bad" | "warn" };

export interface IntentCardProps {
  step: AgentStep;
  /** 1-based position in the execution order. */
  order: number;
  inspected: boolean;
  byPolicy: boolean;
  /** A card is selected: "valid" = can target this, "invalid" = can't, null = not targeting. */
  targeting: "valid" | "invalid" | null;
  /** Verb for the tap hint, e.g. "Block". */
  verb?: string;
  tail?: boolean;
  /** Tighter padding, no category icon (tight phone layouts with several intents). */
  compact?: boolean;
  /** Clamp the quip to two lines (three plans on a short screen). */
  clampQuip?: boolean;
  /** The agent is executing this one right now. */
  running?: boolean;
  stamp?: IntentStamp | null;
  leaving?: boolean;
  enterIndex?: number;
  animateIn?: boolean;
  onActivate: (viaKeyboard: boolean) => void;
}

/** One announced intent: a speech bubble from the agent with the plan, its ticket, and its quip. */
export const IntentCard = forwardRef<HTMLButtonElement, IntentCardProps>(function IntentCard(
  {
    step,
    order,
    inspected,
    byPolicy,
    targeting,
    verb,
    tail,
    compact,
    clampQuip,
    running,
    stamp,
    leaving,
    enterIndex = 0,
    animateIn,
    onActivate,
  },
  ref,
) {
  const Icon = CATEGORY_ICON[step.category];
  const quipId = `quip-${step.id}`;
  const state = inspected ? (byPolicy ? "Inspected by policy." : "Inspected.") : "Not inspected yet.";
  const label =
    targeting === "valid"
      ? `${verb ?? "Target"}: ${step.intent}. ${step.ticket}. ${state}`
      : `Plan ${order}: ${step.intent}. ${step.ticket}. ${state} ${inspected ? "Show evidence." : "Show details."}`;

  return (
    <li
      className={`${s.intentItem} ${animateIn ? s.intentEnter : ""} ${leaving ? s.leaving : ""}`}
      style={{ "--i": enterIndex } as CSSProperties}
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
          compact ? s.intentCompact : "",
        ].join(" ")}
        aria-label={label}
        aria-describedby={quipId}
        aria-disabled={leaving || undefined}
        data-step={step.id}
        data-target={targeting === "valid" ? "valid" : undefined}
        onClick={(e) => {
          if (leaving) return;
          onActivate(e.detail === 0);
        }}
      >
        <span className={s.order} aria-hidden="true">
          {order}
        </span>
        <span className={s.cat} aria-hidden="true">
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span className={s.intentBody}>
          <span className={s.ticketRow}>
            <span className={s.ticket}>{step.ticket}</span>
            <span className={s.chips} aria-hidden="true">
              {inspected ? (
                <span className={`${s.chip} ${s.chipInspected}`}>
                  <Search className="h-3 w-3" strokeWidth={3} />
                  Inspected
                </span>
              ) : (
                <span className={`${s.chip} ${s.chipUnchecked}`}>Unchecked</span>
              )}
              {byPolicy ? (
                <span className={`${s.chip} ${s.chipPolicy}`}>
                  <ScrollText className="h-3 w-3" strokeWidth={3} />
                  Policy
                </span>
              ) : null}
            </span>
          </span>
          <span className={s.intentText}>{step.intent}</span>
          <span id={quipId} className={`${s.quip} ${clampQuip ? s.quipClamp : ""}`}>
            “{step.quip}”
          </span>
        </span>
        {targeting === null && !stamp ? (
          <ChevronRight aria-hidden="true" className="h-5 w-5 flex-none self-center text-muted" />
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
