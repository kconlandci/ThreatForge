"use client";

import type { CSSProperties } from "react";
import { CircleCheck, Info, OctagonAlert, TriangleAlert, X } from "lucide-react";
import type { ToastSpec } from "@/lib/game/useBattle";
import s from "./battle.module.css";

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
  paused = false,
  onHold,
  onDismiss,
}: {
  toast: ActiveToast | null;
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
