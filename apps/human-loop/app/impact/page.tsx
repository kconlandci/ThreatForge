"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { PATHWAYS } from "@/lib/types";

type Stats = {
  totalLeads: number;
  totalRuns: number;
  uniquePlayers: number;
  byPathway: Record<string, { runs: number; avgScorePct: number }>;
  updatedAt: string;
};

export default function ImpactPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  return (
    <main className="min-h-screen px-6 py-14 md:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Wordmark size="sm" />
          </Link>
          <Link href="/play" className="text-sm font-semibold text-loop-text-muted hover:text-loop-text">
            Play the simulator
          </Link>
        </div>

        <h1 className="mt-10 font-display text-3xl font-semibold md:text-4xl">Live impact dashboard</h1>
        <p className="mt-2 max-w-xl text-loop-text-muted">
          Every playthrough here is a real, opted-in visitor learning what AI oversight looks like in
          a DCI career pathway — and a warm lead for the actual program.
        </p>

        {error && (
          <p className="mt-8 rounded-xl border border-loop-border bg-loop-bg-card p-6 text-sm text-loop-text-muted">
            Stats aren&rsquo;t connected yet — this dashboard goes live once cloud storage is wired up.
          </p>
        )}

        {!error && (
          <>
            <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3">
              <StatTile label="Interested visitors" value={stats?.uniquePlayers ?? "—"} />
              <StatTile label="Scenarios played" value={stats?.totalRuns ?? "—"} />
              <StatTile label="Leads captured" value={stats?.totalLeads ?? "—"} />
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-loop-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-loop-bg-elevated text-xs uppercase tracking-wide text-loop-text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Pathway</th>
                    <th className="px-5 py-3 font-semibold">Runs</th>
                    <th className="px-5 py-3 font-semibold">Avg. oversight score</th>
                  </tr>
                </thead>
                <tbody>
                  {PATHWAYS.map((p) => {
                    const row = stats?.byPathway?.[p.id];
                    return (
                      <tr key={p.id} className="border-t border-loop-border">
                        <td className="px-5 py-3 font-medium">{p.name}</td>
                        <td className="px-5 py-3 text-loop-text-muted">{row?.runs ?? 0}</td>
                        <td className="px-5 py-3 text-loop-text-muted">
                          {row ? `${row.avgScorePct}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {stats?.updatedAt && (
              <p className="mt-4 text-xs text-loop-text-muted">
                Updated {new Date(stats.updatedAt).toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-loop-border bg-loop-bg-card p-6 text-center">
      <div className="font-display text-3xl font-bold text-loop-green">{value}</div>
      <div className="mt-1 text-xs text-loop-text-muted">{label}</div>
    </div>
  );
}
