import { Bot, Lock } from "lucide-react";
import type { PathwayMeta } from "@/lib/types";
import { PATHWAY_ICONS } from "./pathwayIcons";

/**
 * A locked pathway. Not a link. On /play it is announced as a disabled group ("disabled").
 * Compact row on phones; `stackAtLg` stacks the icon above the text in narrow desktop columns.
 */
export function ComingSoonCard({
  pathway,
  number,
  as: Heading = "h3",
  disabledGroup = false,
  stackAtLg = false,
}: {
  pathway: PathwayMeta;
  number: number;
  as?: "h2" | "h3";
  disabledGroup?: boolean;
  stackAtLg?: boolean;
}) {
  const Icon = PATHWAY_ICONS[pathway.id];
  const titleId = `pathway-${pathway.id}`;
  return (
    <div
      {...(disabledGroup ? { role: "group", "aria-labelledby": titleId, "aria-disabled": true } : {})}
      className={`relative flex h-full gap-4 rounded-3xl border-2 border-dashed border-[#C9D1D6] bg-paper-soft p-4 sm:p-5 ${
        stackAtLg ? "lg:flex-col lg:gap-3 lg:p-6" : ""
      }`}
    >
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-paper text-teal">
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-paper-soft bg-ink text-paper">
          <Lock className="h-3 w-3" aria-hidden="true" />
        </span>
      </span>
      {stackAtLg ? (
        <span className="absolute right-5 top-6 hidden rounded-full bg-paper px-2.5 py-1 font-display text-[11px] font-semibold uppercase tracking-wide text-muted ring-1 ring-line lg:inline-block">
          Coming soon
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Pathway {number}
          <span className={stackAtLg ? "lg:hidden" : undefined}> · Coming soon</span>
        </p>
        <Heading id={titleId} className="mt-1 font-display text-lg font-bold leading-tight text-ink">
          {pathway.name}
        </Heading>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-teal">
          <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
          AI coworker: {pathway.agentName}
        </p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{pathway.tagline}</p>
      </div>
    </div>
  );
}
