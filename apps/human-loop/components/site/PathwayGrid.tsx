import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { PATHWAYS } from "@/lib/types";
import { ComingSoonCard } from "./ComingSoonCard";
import { PATHWAY_ICONS } from "./pathwayIcons";
import { buttonClass } from "./ui";

/** Landing "Five pathways": the live pathway as a wide feature card, the rest marked "Coming soon". */
export function PathwayGrid() {
  const live = PATHWAYS.filter((p) => p.status === "live");
  const soon = PATHWAYS.filter((p) => p.status !== "live");
  return (
    <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-5">
      {live.map((p, i) => {
        const Icon = PATHWAY_ICONS[p.id];
        return (
          <li
            key={p.id}
            className="hl-reveal relative overflow-hidden rounded-3xl border-2 border-ink bg-teal text-paper shadow-[0_6px_0_0_var(--hl-ink)] sm:col-span-2 lg:col-span-4"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
                backgroundSize: "18px 18px",
              }}
            />
            <div className="relative grid gap-2 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center md:gap-8 lg:px-12">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 font-display text-sm font-semibold text-paper">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-paper/15">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    Pathway {i + 1}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-orange px-3 py-1 font-display text-xs font-bold uppercase tracking-wide text-ink">
                    <span className="h-2 w-2 rounded-full bg-ink" aria-hidden="true" />
                    Live now
                  </span>
                </div>
                <h3 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{p.name}</h3>
                <p className="mt-2 inline-flex items-center gap-2 text-[17px] font-semibold text-teal-tint">
                  <Bot className="h-5 w-5 shrink-0" aria-hidden="true" />
                  AI coworker: {p.agentName}
                </p>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-paper sm:text-xl">{p.tagline}</p>
                <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-teal-tint">
                  Your first shift: Monday morning at Fenwick IT Solutions. Four tickets. One very eager robot.
                </p>
                <div className="mt-6">
                  <Link href="/play" className={buttonClass("primary", "lg", "w-full sm:w-auto sm:px-8")}>
                    Play Help Desk
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div className="relative -order-1 flex justify-center md:order-none" aria-hidden="true">
                <span className="absolute bottom-3 h-6 w-40 rounded-[50%] bg-ink/25 blur-[2px] md:w-52" />
                <Image
                  src="/game/sprites/ollie-celebrate.svg"
                  alt=""
                  unoptimized
                  width={220}
                  height={220}
                  className="hl-float relative h-40 w-40 sm:h-48 sm:w-48 md:h-60 md:w-60"
                />
              </div>
            </div>
          </li>
        );
      })}
      {soon.map((p, i) => (
        <li key={p.id} className="hl-reveal">
          <ComingSoonCard pathway={p} number={live.length + i + 1} stackAtLg />
        </li>
      ))}
    </ul>
  );
}
