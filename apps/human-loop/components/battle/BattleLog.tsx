import s from "./battle.module.css";

/**
 * Polite live region for screen readers: the latest battle lines (card results, what the
 * agent did, new turns). Visually hidden; the toasts and meters show the same information.
 */
export function BattleLog({ lines }: { lines: { id: number; text: string }[] }) {
  return (
    <div className={s.srOnly} role="log" aria-live="polite" aria-relevant="additions" aria-label="Battle log">
      {lines.map((l) => (
        <p key={l.id}>{l.text}</p>
      ))}
    </div>
  );
}
