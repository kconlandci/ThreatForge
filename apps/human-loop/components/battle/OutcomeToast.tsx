"use client";

import type { CSSProperties } from "react";
import { CircleCheck, Info, OctagonAlert, TriangleAlert, X } from "lucide-react";
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
  /** Auto-dismiss time, used for the countdown bar. */
  ms: number;
  /**
   * Agent turn: the label of the main button that advances ("Next", "Next turn"...). The toast
   * itself then has no button: the one advance control sits in the thumb zone, where Approve was.
   */
  nextLabel?: string;
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
 * The outcome of the last action ("Caught! …", "Oops. …"). Visual only: the same text goes to
 * the BattleLog live region, so screen readers hear it once.
 *
 * Agent beats never time out: the main button ("Next") advances them. Other toasts show a
 * countdown that pauses while held (`paused`).
 */
export function OutcomeToast({
  toast,
  chip = null,
  paused = false,
  onHold,
  onDismiss,
}: {
  toast: ActiveToast | null;
  chip?: ToastChip | null;
  paused?: boolean;
  /** Pointer or focus entered (true) or left (false) the toast. */
  onHold?: (held: boolean) => void;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  const Icon = TONE_ICON[toast.tone];
  return (
    <div className={s.toastWrap}>
      <div
        className={`${s.toast} ${TONE_CLASS[toast.tone]} ${paused ? s.toastPaused : ""}`}
        data-toast={toast.tone}
        style={{ "--ms": `${toast.ms}ms` } as CSSProperties}
        onPointerEnter={() => onHold?.(true)}
        onPointerLeave={() => onHold?.(false)}
        onFocus={() => onHold?.(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHold?.(false);
        }}
      >
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
          <button type="button" className={s.toastBtn} onClick={onDismiss} aria-label="Dismiss message">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        {toast.nextLabel ? null : <span key={`t${toast.id}`} className={s.toastTimer} aria-hidden="true" />}
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
