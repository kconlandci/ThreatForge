"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EnergyOrbs } from "./EnergyOrbs";
import s from "./battle.module.css";

export interface MetersProps {
  risk: number;
  maxRisk: number;
  resolved: number;
  total: number;
  turn: number;
  maxTurns: number;
  energy: number;
  maxEnergy: number;
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

/** Top HUD: Risk (orange, red near the limit), Progress (teal), turn, energy. */
export function Meters({ risk, maxRisk, resolved, total, turn, maxTurns, energy, maxEnergy }: MetersProps) {
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
  const progPct = Math.min(100, (resolved / Math.max(1, total)) * 100);

  return (
    <div className={s.meters}>
      <div ref={riskRef} className={`${s.meter} ${danger ? s.riskDanger : ""}`} style={{ position: "relative" }}>
        <div className={s.meterHead}>
          <span id="hl-risk-label">Risk</span>
          <span className={s.meterValue}>
            {risk}/{maxRisk}
          </span>
        </div>
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

      <div className={s.meter}>
        <div className={s.meterHead}>
          <span id="hl-progress-label">Progress</span>
          <span className={s.meterValue}>
            {resolved}/{total}
          </span>
        </div>
        <div
          className={s.meterTrack}
          role="meter"
          aria-labelledby="hl-progress-label"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={resolved}
          aria-valuetext={`${resolved} of ${total} plans handled`}
        >
          <div className={`${s.meterFill} ${s.progressFill}`} style={{ width: `${progPct}%` }} />
          <div className={s.meterTicks} style={{ "--ticks": total } as CSSProperties} />
        </div>
      </div>

      <div className={s.meterSide}>
        <span className={s.turnChip}>
          Turn {turn} of {maxTurns}
        </span>
        <EnergyOrbs energy={energy} max={maxEnergy} />
      </div>
    </div>
  );
}
