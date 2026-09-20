import Link from "next/link";
import type { PathwayMeta, PathwayRunResult } from "@/lib/types";

const ICONS: Record<string, string> = {
  "help-desk": "🎧",
  cybersecurity: "🛡️",
  "full-stack": "💻",
  "business-analyst": "📊",
  "cloud-network": "☁️",
};

export function PathwayCard({
  pathway,
  href,
  run,
}: {
  pathway: PathwayMeta;
  href: string;
  run?: PathwayRunResult;
}) {
  const accent = pathway.accent === "violet" ? "var(--loop-violet)" : "var(--loop-green)";
  const pct = run ? Math.round((run.score / run.maxScore) * 100) : null;

  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between rounded-2xl border border-loop-border bg-loop-bg-card p-6 transition hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:shadow-[0_0_0_1px_var(--accent),0_18px_40px_-24px_var(--accent)]"
      style={{ ["--accent" as string]: accent }}
    >
      <div>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-3xl">{ICONS[pathway.id] ?? "🧭"}</span>
          {pct !== null && (
            <span
              className="rounded-full border px-2.5 py-1 text-xs font-semibold"
              style={{ borderColor: accent, color: accent }}
            >
              {pct}% cleared
            </span>
          )}
        </div>
        <h3 className="font-display text-xl font-semibold text-loop-text">{pathway.name}</h3>
        <p className="mt-1.5 text-sm text-loop-text-muted">{pathway.tagline}</p>
      </div>
      <div
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition group-hover:gap-2.5"
        style={{ color: accent }}
      >
        {run ? "Play again" : "Start"}
        <span aria-hidden>→</span>
      </div>
    </Link>
  );
}
