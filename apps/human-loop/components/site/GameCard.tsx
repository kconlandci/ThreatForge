import type { LucideIcon } from "lucide-react";

/**
 * A static card illustration styled like the battle's oversight cards: cost gem, art window,
 * name banner, rules text and a joke line. Decorative (used inside aria-hidden illustrations).
 */
export function GameCard({
  name,
  cost,
  kind,
  text,
  flavor,
  Icon,
  tone = "teal",
  className = "",
  style,
}: {
  name: string;
  cost: number;
  kind: "skill" | "power";
  text: string;
  flavor?: string;
  Icon: LucideIcon;
  tone?: "teal" | "ink" | "orange";
  className?: string;
  style?: React.CSSProperties;
}) {
  const art = {
    teal: "bg-teal text-paper",
    ink: "bg-ink text-paper",
    orange: "bg-orange text-ink",
  }[tone];
  return (
    <div
      className={`relative flex w-[8.75rem] flex-col rounded-[14px] border-2 border-ink bg-paper p-1.5 shadow-[0_4px_0_0_var(--hl-ink)] sm:w-[9.5rem] ${className}`}
      style={style}
    >
      <span className="absolute -left-2.5 -top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-orange font-display text-base font-bold text-ink">
        {cost}
      </span>
      <div className={`relative grid h-[4.25rem] place-items-center overflow-hidden rounded-[9px] ${art}`}>
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1.2px, transparent 0)",
            backgroundSize: "10px 10px",
          }}
        />
        <Icon className="relative h-8 w-8" strokeWidth={2.25} aria-hidden="true" />
      </div>
      <div className="px-1 pb-1 pt-2 text-center">
        <p className="font-display text-[15px] font-bold leading-none text-ink">{name}</p>
        <p className="mt-1 font-display text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">{kind}</p>
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink">{text}</p>
        {flavor ? <p className="mt-1.5 text-[10.5px] italic leading-snug text-muted">{flavor}</p> : null}
      </div>
    </div>
  );
}
