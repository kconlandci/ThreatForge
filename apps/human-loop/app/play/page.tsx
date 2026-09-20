"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { PathwayCard } from "@/components/PathwayCard";
import { PATHWAYS } from "@/lib/types";
import { getRuns } from "@/lib/player";
import type { PathwayRunResult } from "@/lib/types";

export default function PlayHubPage() {
  const [runs, setRuns] = useState<PathwayRunResult[]>([]);

  useEffect(() => {
    setRuns(getRuns());
  }, []);

  return (
    <main className="min-h-screen px-6 py-14 md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Wordmark size="sm" />
          </Link>
          <Link href="/impact" className="text-sm font-semibold text-loop-text-muted hover:text-loop-text">
            Impact dashboard
          </Link>
        </div>

        <div className="mt-10 max-w-2xl">
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            Pick a pathway. Meet its AI agent.
          </h1>
          <p className="mt-3 text-loop-text-muted">
            Each track drops you into a real DCI career pathway with an AI agent already doing part of
            the job. Your call: approve, reject, edit, or escalate — before it ships.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PATHWAYS.map((p) => (
            <PathwayCard
              key={p.id}
              pathway={p}
              href={`/play/${p.id}`}
              run={runs.find((r) => r.pathwayId === p.id)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
