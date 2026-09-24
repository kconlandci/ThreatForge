import { Zap } from "lucide-react";
import s from "./battle.module.css";

/** Energy as orbs: filled = available, dashed = spent this turn. */
export function EnergyOrbs({ energy, max }: { energy: number; max: number }) {
  const total = Math.max(max, energy);
  return (
    <span className={s.orbs} role="img" aria-label={`Energy: ${energy} of ${max}`}>
      <Zap aria-hidden="true" className="h-4 w-4 text-orange-text" strokeWidth={2.6} />
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`${s.orb} ${i < energy ? (i >= max ? s.orbBonus : s.orbFull) : s.orbSpent}`}
        />
      ))}
    </span>
  );
}
