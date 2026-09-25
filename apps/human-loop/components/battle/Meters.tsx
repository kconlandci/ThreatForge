"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import s from "./battle.module.css";

export interface MetersProps {
  risk: number;
  maxRisk: number;
  /** Plans handled for good. */
  done: number;
  total: number;
  turn: number;
  maxTurns: number;
  /** The turn pill (hidden in practice). */
  showTurn: boolean;
}

/** Remembers the last value and shows a "+n" / "−n" bubble when it changes. */
function useDelta(value: number) {
  const prev = useRef(value);
  const [delta, setDelta] = useState<{ n: number; key: number } | null>(null);
  useEffect(() => {
    const d = value - prev.current;
    prev.current = value;
    if (d === 0) return;
    setDelta({ n: d, key: Date.now() });
    const t = window.setTimeout(() => setDelta(null), 1500);
    return () => window.clearTimeout(t);
  }, [value]);
  return delta;
}

/**
 * Top HUD, one row: the Risk bar on the left (ticks, no number, so it never mirrors the Done
 * count); the turn pill and "Done n/total" on the right.
 */
export function Meters({ risk, maxRisk, done, total, turn, maxTurns, showTurn }: MetersProps) {
  const riskDelta = useDelta(risk);
  const riskRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!riskDelta || riskDelta.n <= 0) return;
    const el = riskRef.current;
    if (!el || typeof el.animate !== "function" || el.closest(".hl-rm")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-5px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(3px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 420, easing: "ease-out" },
    );
  }, [riskDelta]);
  const danger = risk >= Math.ceil(maxRisk * 0.7);
  const riskPct = Math.min(100, (risk / maxRisk) * 100);

  return (
    <div className={s.hud}>
      <div ref={riskRef} className={`${s.riskRow} ${danger ? s.riskDanger : ""}`}>
        <span id="hl-risk-label" className={s.riskLabel}>
          Risk
        </span>
        <div
          className={s.meterTrack}
          role="meter"
          aria-labelledby="hl-risk-label"
          aria-valuemin={0}
          aria-valuemax={maxRisk}
          aria-valuenow={risk}
          aria-valuetext={`Risk ${risk} of ${maxRisk}${danger ? ". Danger: close to a breach." : ""}`}
        >
          <div className={`${s.meterFill} ${s.riskFill}`} style={{ width: `${riskPct}%` }} />
          <div className={s.meterTicks} style={{ "--ticks": maxRisk } as CSSProperties} />
        </div>
        {riskDelta ? (
          <span key={riskDelta.key} className={`${s.delta} ${riskDelta.n > 0 ? s.deltaUp : s.deltaDown}`} aria-hidden="true">
            {riskDelta.n > 0 ? `+${riskDelta.n}` : `−${-riskDelta.n}`}
          </span>
        ) : null}
      </div>

      <div className={s.hudRight}>
        {showTurn ? (
          <span className={s.turnPill}>
            <span aria-hidden="true">
              Turn {turn}/{maxTurns}
            </span>
            <span className={s.srOnly}>
              Turn {turn} of {maxTurns}
            </span>
          </span>
        ) : null}
        <span className={s.doneChip}>
          <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          <span aria-hidden="true">
            Done {done}/{total}
          </span>
          <span className={s.srOnly}>
            {done} of {total} plans done
          </span>
        </span>
      </div>
    </div>
  );
}
