import s from "./battle.module.css";

/** Energy left this turn: one big orange orb at the left edge of the hand. */
export function EnergyOrb({ energy, max, coach = false }: { energy: number; max: number; coach?: boolean }) {
  return (
    <div
      className={s.energy}
      role="img"
      aria-label={`${energy} of ${max} energy left`}
      data-coach={coach ? "on" : undefined}
    >
      <span className={`${s.energyOrb} ${energy === 0 ? s.energyEmpty : ""}`} aria-hidden="true">
        {energy}
      </span>
      <span className={s.energyLabel} aria-hidden="true">
        Energy
      </span>
    </div>
  );
}
