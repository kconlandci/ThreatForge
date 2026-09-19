import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { PathwayCard } from "@/components/PathwayCard";
import { PATHWAYS } from "@/lib/types";

const STATS = [
  { value: "87%", label: "DCI graduate job-placement rate" },
  { value: "5", label: "career pathways, one oversight skill" },
  { value: "ISO 21001", label: "certified training organization" },
  { value: "$0", label: "cost to play — no signup wall to browse" },
];

const STEPS = [
  {
    title: "Meet the agent",
    body: "Every pathway drops you into a real workplace already using an AI agent to do part of the job — a ticket bot, a SOC agent, a coding copilot, a reporting assistant, a cloud-ops agent.",
  },
  {
    title: "Review its move",
    body: "The agent shows you exactly what it wants to do next. You decide: approve, reject, edit, or escalate — with the same context a real employee would have.",
  },
  {
    title: "See what happens",
    body: "Every choice has a consequence, good or bad, plus a plain-English explanation of the judgment call — and where it shows up in the actual job.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <Wordmark size="sm" />
        <nav className="flex items-center gap-6 text-sm font-semibold text-loop-text-muted">
          <Link href="/impact" className="hover:text-loop-text">
            Impact
          </Link>
          <a
            href="https://www.dciresourcesllc.com"
            target="_blank"
            rel="noreferrer"
            className="hidden hover:text-loop-text sm:inline"
          >
            DCI Resources
          </a>
          <Link
            href="/play"
            className="rounded-lg bg-loop-green px-4 py-2 text-loop-bg transition hover:brightness-110"
          >
            Play now
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-10 text-center md:pb-24 md:pt-16">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-loop-border bg-loop-bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-loop-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-loop-green" />
          An AI Oversight Simulator from DCI · The Learning Academy
        </div>
        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
          You&rsquo;re not competing<br className="hidden md:block" /> with AI. You&rsquo;re{" "}
          <span className="text-loop-green">supervising</span> it.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-loop-text-muted">
          Every tech job now has an AI agent doing part of the work. The skill that keeps you
          employed isn&rsquo;t outrunning it — it&rsquo;s knowing when to trust it, when to stop it, and
          when to call in a human. Play all 5 DCI career pathways and find out if you have it.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/play"
            className="rounded-xl bg-loop-green px-7 py-3.5 text-center font-semibold text-loop-bg transition hover:brightness-110"
          >
            Enter the simulator →
          </Link>
          <Link
            href="/impact"
            className="rounded-xl border border-loop-border px-7 py-3.5 text-center font-semibold text-loop-text transition hover:border-loop-green"
          >
            View live impact dashboard
          </Link>
        </div>
      </section>

      <section className="border-y border-loop-border bg-loop-bg-elevated">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-10 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl font-bold text-loop-green">{s.value}</div>
              <div className="mt-1 text-xs text-loop-text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title}>
              <div className="mb-3 font-display text-sm font-bold text-loop-violet">
                0{i + 1}
              </div>
              <h3 className="font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-loop-text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pathways" className="mx-auto max-w-5xl px-6 pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold md:text-3xl">
              5 pathways. 5 agents to watch.
            </h2>
            <p className="mt-1 text-loop-text-muted">Pick one to try it right now — takes about 5 minutes.</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PATHWAYS.map((p) => (
            <PathwayCard key={p.id} pathway={p} href={`/play/${p.id}`} />
          ))}
        </div>
      </section>

      <footer className="border-t border-loop-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-10 text-center">
          <Wordmark size="sm" />
          <p className="max-w-xl text-xs text-loop-text-muted">
            DCI Resources, LLC (&ldquo;DCI &middot; The Learning Academy&rdquo;) is a Connecticut-based,
            ISO 21001-certified workforce development organization delivering WIOA/ETPL-approved,
            AI-enhanced IT career training. Learn more at{" "}
            <a href="https://www.dciresourcesllc.com" target="_blank" rel="noreferrer" className="underline">
              dciresourcesllc.com
            </a>
            .
          </p>
        </div>
      </footer>
    </main>
  );
}
