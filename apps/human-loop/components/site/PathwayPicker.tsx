import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, Star } from "lucide-react";
import { PATHWAYS } from "@/lib/types";
import type { PathwayProgress } from "@/lib/game/types";
import { ComingSoonCard } from "./ComingSoonCard";
import { PATHWAY_ICONS } from "./pathwayIcons";
import { buttonClass } from "./ui";

export function Stars({ count, size = "h-6 w-6" }: { count: number; size?: string }) {
  const n = Math.max(0, Math.min(3, Math.round(count)));
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="sr-only">{`${n} of 3 stars`}</span>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          strokeWidth={2}
          className={`${size} ${i < n ? "fill-orange text-ink" : "fill-paper-soft text-[#9AA6AF]"}`}
        />
      ))}
    </span>
  );
}

/** Pathway picker for /play. Help Desk is live and links to /play/help-desk; the rest are "Coming soon". */
export function PathwayPicker({ helpDesk }: { helpDesk: PathwayProgress | null }) {
  const live = PATHWAYS.find((p) => p.status === "live")!;
  const soon = PATHWAYS.filter((p) => p.status !== "live");
  const attempts = helpDesk?.attempts ?? 0;
  const best = helpDesk?.best?.stars ?? null;
  const inProgress = helpDesk?.battle?.status === "playing";
  const cta = inProgress ? "Resume shift" : attempts > 0 ? "Play again" : "Start shift";
  const LiveIcon = PATHWAY_ICONS[live.id];

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-paper shadow-[0_6px_0_0_var(--hl-ink)]">
        <div className="grid sm:grid-cols-[15rem_1fr]">
          <div className="relative flex h-40 items-end justify-center overflow-hidden bg-teal pt-3 sm:h-auto sm:pt-6" aria-hidden="true">
            <div
              className="absolute inset-0 opacity-[0.16]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
                backgroundSize: "16px 16px",
              }}
            />
            <span className="absolute bottom-3 h-5 w-32 rounded-[50%] bg-ink/25" />
            <Image
              src="/game/sprites/resetbot-idle.svg"
              alt=""
              unoptimized
              priority
              width={220}
              height={220}
              className="hl-float relative h-36 w-36 sm:h-52 sm:w-52"
            />
          </div>
          <div className="flex flex-col p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-teal">
                <LiveIcon className="h-4 w-4" aria-hidden="true" />
                Pathway 1
              </span>
              <span className="rounded-full border-2 border-ink bg-orange px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wide text-ink">
                Live now
              </span>
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-ink">{live.name}</h2>
            <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-teal">
              <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
              AI coworker: {live.agentName}
            </p>
            <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">{live.tagline}</p>

            <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-paper-soft px-4 py-3">
              <div className="flex items-center gap-2">
                <dt className="font-display text-sm font-semibold text-muted">Best</dt>
                <dd>
                  {best !== null ? (
                    <Stars count={best} />
                  ) : (
                    <span className="text-[15px] font-semibold text-ink">Not played yet</span>
                  )}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-display text-sm font-semibold text-muted">Shifts played</dt>
                <dd className="font-display text-lg font-bold text-ink">{attempts}</dd>
              </div>
              {inProgress ? (
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Status</dt>
                  <dd className="rounded-full bg-teal-tint px-2.5 py-0.5 text-sm font-semibold text-teal-dark">
                    Shift in progress
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-5">
              <Link
                href={`/play/${live.id}`}
                aria-label={`${cta}: ${live.name}`}
                className={buttonClass("primary", "lg", "w-full sm:w-auto sm:px-8")}
              >
                {cta}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <h2 className="mt-10 flex items-center gap-3 font-display text-xl font-bold text-ink">
        More pathways
        <span className="rounded-full bg-paper-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted ring-1 ring-line">
          Coming soon
        </span>
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {soon.map((p, i) => (
          <li key={p.id}>
            <ComingSoonCard pathway={p} number={i + 2} disabledGroup />
          </li>
        ))}
      </ul>
    </div>
  );
}
