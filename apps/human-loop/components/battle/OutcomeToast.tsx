"use client";

import type { CSSProperties, Ref } from "react";
import { ChevronRight, CircleCheck, Eye, Info, OctagonAlert, TriangleAlert, X } from "lucide-react";
import { ResultShape, shapeLabel, skillIcon } from "@/components/skills/SkillBits";
import { skillName } from "@/lib/game/skills";
import type { CallGrade, MasterySkillId } from "@/lib/game/types";
import type { ToastSpec } from "@/lib/game/useBattle";
import s from "./battle.module.css";

/** The skill a resolved plan tested, and how it went (shape + color, so color is never the only signal). */
export interface ToastChip {
  skill: MasterySkillId;
  /** The result shape, only once the plan's outcome is final. */
  grade: CallGrade | null;
  /** A word instead of a shape while it isn't final: "Back in line", "Can still roll back", "Not checked". */
  note?: string | null;
}

export interface ActiveToast extends ToastSpec {
  id: number;
  /** Auto-dismiss time (ms), used for the countdown bar. 0: stays until closed (every outcome). */
  ms: number;
  /** Agent turn: the label of the toast's Next button ("Next", "Next ticket", "Finish"...). */
  nextLabel?: string;
  /** Oops and False alarm: the plan whose clue "Show me" opens. */
  showMe?: string;
}

const TONE_CLASS = {
  good: s.toastGood,
  bad: s.toastBad,
  warn: s.toastWarn,
  info: s.toastInfo,
  hint: s.toastHint,
} as const;

const TONE_ICON = {
  good: CircleCheck,
  bad: OctagonAlert,
  warn: TriangleAlert,
  info: Info,
  hint: Info,
} as const;

/**
 * The outcome of the last action ("Caught! …", "Oops. …"), docked under the stage so it never
 * covers the agent. Visual only: the same text goes to the BattleLog live region, so screen
 * readers hear it once.
 *
 * Outcome toasts never time out. An agent beat has its own Next button (and Show me after a wrong
 * call); a card play's toast has Close (and Show me). Only "hint" toasts count down, pausing while
 * held (`paused`).
 */
export function OutcomeToast({
  toast,
  chip = null,
  paused = false,
  onHold,
  onDismiss,
  onShowMe,
  nextRef,
  showMeRef,
}: {
  toast: ActiveToast | null;
  chip?: ToastChip | null;
  paused?: boolean;
  /** Pointer or focus entered (true) or left (false) the toast. */
  onHold?: (held: boolean) => void;
  /** Next (agent beats) or Close. */
  onDismiss: () => void;
  onShowMe?: (stepId: string) => void;
  nextRef?: Ref<HTMLButtonElement>;
  showMeRef?: Ref<HTMLButtonElement>;
}) {
  if (!toast) return null;
  const Icon = TONE_ICON[toast.tone];
  const timed = toast.ms > 0;
  const showMe = toast.showMe && onShowMe ? toast.showMe : null;
  return (
    <div className={s.toastWrap}>
      <div
        className={`${s.toast} ${TONE_CLASS[toast.tone]} ${paused ? s.toastPaused : ""}`}
        data-toast={toast.tone}
        data-toast-id={toast.id}
        style={{ "--ms": `${toast.ms}ms` } as CSSProperties}
        onPointerEnter={() => onHold?.(true)}
        onPointerLeave={() => onHold?.(false)}
        onFocus={() => onHold?.(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHold?.(false);
        }}
      >
        <div className={s.toastMain}>
          <span key={`i${toast.id}`} className={`${s.toastIcon} ${s.toastSwap}`} aria-hidden="true">
            <Icon className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div key={`b${toast.id}`} className={`${s.toastBody} ${s.toastSwap}`}>
            <p className={s.toastTitle}>
              {toast.tone === "hint" ? null : toast.title}
              {toast.meta ? <span className={s.toastMeta}>{toast.meta}</span> : null}
            </p>
            <p className={s.toastText}>{toast.text}</p>
            {chip ? <SkillChip chip={chip} /> : null}
          </div>
          {toast.nextLabel ? null : (
            <button type="button" className={s.toastBtn} onClick={onDismiss} aria-label={timed ? "Dismiss message" : "Close"}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {toast.nextLabel || showMe ? (
          <div className={s.toastActions}>
            {showMe ? (
              <button ref={showMeRef} type="button" className={s.toastShowMe} onClick={() => onShowMe?.(showMe)} data-show-me={showMe}>
                <Eye className="h-4 w-4" aria-hidden="true" />
                Show me
              </button>
            ) : null}
            {toast.nextLabel ? (
              <button ref={nextRef} type="button" className={s.toastNext} onClick={onDismiss} data-toast-next="">
                {toast.nextLabel}
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
        {timed ? <span key={`t${toast.id}`} className={s.toastTimer} aria-hidden="true" /> : null}
      </div>
    </div>
  );
}

function SkillChip({ chip }: { chip: ToastChip }) {
  const Icon = skillIcon(chip.skill);
  return (
    <p className={s.skillChip}>
      <Icon className="h-3.5 w-3.5 flex-none" strokeWidth={2.6} aria-hidden="true" />
      <span>{skillName(chip.skill)}</span>
      {chip.note ? <span className={s.skillChipNote}>· {chip.note}</span> : null}
      {chip.grade && !chip.note ? (
        <>
          <ResultShape grade={chip.grade} size={16} label={false} />
          <span className={s.srOnly}>{shapeLabel(chip.grade)}</span>
        </>
      ) : null}
    </p>
  );
}
