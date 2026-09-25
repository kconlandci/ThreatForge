import Image from "next/image";
import { ArrowUpRight, Check, Hand, Search, TriangleAlert } from "lucide-react";
import { CARDS } from "@/lib/game/cards";
import { GameCard } from "./GameCard";

/** "How a shift works": three steps, each with a small illustration built from game-style cards. */

function IntentArt() {
  return (
    <div className="relative flex h-full items-center justify-center gap-1 px-2">
      <Image
        src="/game/sprites/ollie-eager.svg"
        alt=""
        unoptimized
        width={220}
        height={220}
        className="hl-float -mr-3 h-28 w-28 shrink-0 sm:h-32 sm:w-32"
        style={{ ["--hl-rot" as string]: "-3deg" }}
      />
      <div className="relative w-[11.5rem] rotate-2 rounded-2xl border-2 border-ink bg-paper p-3 shadow-[0_4px_0_0_var(--hl-ink)]">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Ollie plans to
        </p>
        <p className="mt-1 font-display text-[15px] font-bold leading-tight text-ink">
          Reset MFA for J. Romero (CFO)
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted">#51876 · Harlow &amp; Cole</p>
        <p className="mt-2 rounded-lg bg-teal-tint px-2 py-1.5 text-[11.5px] leading-snug text-ink">
          &ldquo;Name matches, title matches! Resetting now!&rdquo;
        </p>
      </div>
    </div>
  );
}

function InspectArt() {
  const c = CARDS.inspect;
  return (
    <div className="relative flex h-full items-center justify-center">
      <GameCard
        name={c.name}
        cost={c.cost}
        kind={c.kind}
        text={c.text}
        flavor={c.flavor}
        Icon={Search}
        className="relative z-10 -mr-7 -rotate-6"
      />
      <div className="relative w-[10.75rem] rotate-2 rounded-2xl border-2 border-ink bg-paper py-2.5 pl-8 pr-2.5 shadow-[0_4px_0_0_var(--hl-ink)]">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Evidence</p>
        <ul className="mt-1.5 space-y-2 text-[11px] leading-snug">
          <li>
            <span className="block font-semibold text-ink">Sender</span>
            <span className="font-mono text-[10px] text-orange-text">jromero.cfo@gmail.com</span>
          </li>
          <li>
            <span className="block font-semibold text-ink">Work email</span>
            <span className="font-mono text-[10px] text-ink-soft">jromero@harlowcole.com</span>
          </li>
          <li className="flex items-start gap-1.5 rounded-lg bg-orange-tint px-1.5 py-1 text-orange-text">
            <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            <span className="font-semibold">Callback number doesn&rsquo;t match the record.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function DecideArt() {
  const b = CARDS.block;
  const e = CARDS.escalate;
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4">
      <div className="flex items-end justify-center">
        <GameCard
          name={b.name}
          cost={b.cost}
          kind={b.kind}
          text={b.text}
          Icon={Hand}
          tone="ink"
          className="relative z-10 mr-1 -rotate-[6deg]"
        />
        <GameCard
          name={e.name}
          cost={e.cost}
          kind={e.kind}
          text={e.text}
          Icon={ArrowUpRight}
          tone="orange"
          className="translate-y-2 rotate-[5deg]"
        />
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-teal px-3.5 py-1.5 font-display text-xs font-semibold text-paper shadow-[0_3px_0_0_var(--hl-ink)]">
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        Or approve it
      </span>
    </div>
  );
}

const STEPS = [
  {
    title: "Read the agent’s intent",
    body: "Each turn, the AI agent shows you its plan. Most plans are fine. A few are bad ideas that sound very sure of themselves.",
    Art: IntentArt,
  },
  {
    title: "Inspect the evidence",
    body: "Play an Inspect card to see what the agent missed. Check who asked, what the record says, and what the policy allows.",
    Art: InspectArt,
  },
  {
    title: "Approve, block, or escalate",
    body: "Good plan? Approve it. Bad plan? Block it. Not sure? Escalate to Dana, your manager. Stop the bad calls without stalling the good work.",
    Art: DecideArt,
  },
];

export function ShiftSteps() {
  return (
    <ol className="grid gap-6 md:grid-cols-3 md:gap-5 lg:gap-8">
      {STEPS.map(({ title, body, Art }, i) => (
        <li key={title} className="hl-reveal flex flex-col">
          <div
            aria-hidden="true"
            className="hl-dots relative h-[17rem] overflow-hidden rounded-3xl border border-line bg-paper-soft"
          >
            <Art />
          </div>
          <div className="mt-5 flex items-start gap-3 px-1">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-orange font-display text-base font-bold text-ink">
              {i + 1}
            </span>
            <div>
              <h3 className="font-display text-xl font-bold leading-tight text-ink">{title}</h3>
              <p className="mt-2 text-[17px] leading-relaxed text-ink-soft">{body}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
