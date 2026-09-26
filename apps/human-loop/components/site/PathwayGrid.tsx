import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { PATHWAYS } from "@/lib/types";
import { ComingSoonCard } from "./ComingSoonCard";
import { PATHWAY_ICONS } from "./pathwayIcons";
import { buttonClass } from "./ui";

/**
 * Landing "Five pathways": each live pathway as a feature card (all five today), and any pathway not
 * live yet as a "Coming soon" card after them.
 */
export function PathwayGrid() {
  const live = PATHWAYS.filter((p) => p.status === "live");
  const soon = PATHWAYS.filter((p) => p.status !== "live");
  // While some pathways are still coming: live cards span the whole row, and the "Coming soon" cards
  // share one row on desktop. 3 or 4 of them: narrow stacked cards in 4 columns; 1 or 2: 2 wide
  // columns, so the row never ends in empty space. A single one spans the whole row (from 2 columns up).
  const wide = soon.length <= 2;
  const alone = soon.length === 1;
  // All live (today, five): on desktop the live cards pair up in 2 columns, with the first one (Help
  // Desk, where most players start) spanning the top row when the count is odd. Phones and tablets
  // keep one card per row.
  const pair = soon.length === 0;
  const halfAtLg = (i: number) => pair && !(live.length % 2 === 1 && i === 0);
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 sm:gap-4 lg:gap-5 ${wide ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
      {live.map((p, i) => {
        const Icon = PATHWAY_ICONS[p.id];
        // A half-width desktop card: a smaller agent in the top right corner beside the title (the text
        // below it uses the full width), and the button pinned to the bottom so a row's cards line up.
        // From lg to xl (1024-1279) the agent is smaller still, so "Pathway N" and "Live now" stay on one line.
        const half = halfAtLg(i);
        return (
          <li
            key={p.id}
            className={`hl-reveal relative overflow-hidden rounded-3xl border-2 border-ink bg-teal text-paper shadow-[0_6px_0_0_var(--hl-ink)] sm:col-span-2 ${half ? "lg:col-span-1" : wide ? "lg:col-span-2" : "lg:col-span-4"}`}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
                backgroundSize: "18px 18px",
              }}
            />
            <div
              className={`relative grid gap-2 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center md:gap-8 ${half ? "lg:flex lg:h-full lg:flex-col lg:px-9" : "lg:px-12"}`}
            >
              <div className={half ? "lg:flex lg:flex-1 lg:flex-col" : undefined}>
                <div className={half ? "lg:min-h-28 lg:pr-32 xl:min-h-36 xl:pr-40" : undefined}>
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
                  <h3 className={`mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl ${half ? "" : "lg:text-5xl"}`}>
                    {p.name}
                  </h3>
                  <p className="mt-2 inline-flex items-center gap-2 text-[17px] font-semibold text-teal-tint">
                    <Bot className="h-5 w-5 shrink-0" aria-hidden="true" />
                    AI coworker: {p.agentName}
                  </p>
                </div>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-paper sm:text-xl">{p.tagline}</p>
                {p.firstShift ? (
                  <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-teal-tint">{p.firstShift}</p>
                ) : null}
                <div className={half ? "mt-6 lg:mt-auto lg:pt-6" : "mt-6"}>
                  <Link href="/play" className={buttonClass("primary", "lg", "w-full py-2.5 sm:w-auto sm:px-8")}>
                    {/* Long names ("Full-Stack Development") wrap on a phone: keep both lines centred. */}
                    <span className="min-w-0 text-center leading-tight">Play {p.name}</span>
                    <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div
                className={`relative -order-1 flex justify-center md:order-none ${half ? "lg:absolute lg:right-6 lg:top-6" : ""}`}
                aria-hidden="true"
              >
                <span
                  className={`absolute bottom-3 h-6 w-40 rounded-[50%] bg-ink/25 blur-[2px] md:w-52 ${half ? "lg:bottom-1 lg:w-20 xl:w-28" : ""}`}
                />
                <Image
                  src={`/game/sprites/${p.agentSprite ?? "ollie"}-celebrate.svg`}
                  alt=""
                  unoptimized
                  width={220}
                  height={220}
                  className={`hl-float relative h-40 w-40 sm:h-48 sm:w-48 md:h-60 md:w-60 ${half ? "lg:h-28 lg:w-28 xl:h-36 xl:w-36" : ""}`}
                />
              </div>
            </div>
          </li>
        );
      })}
      {soon.map((p, i) => (
        <li key={p.id} className={`hl-reveal ${alone ? "sm:col-span-2" : ""}`}>
          <ComingSoonCard pathway={p} number={live.length + i + 1} stackAtLg={!wide} />
        </li>
      ))}
    </ul>
  );
}
