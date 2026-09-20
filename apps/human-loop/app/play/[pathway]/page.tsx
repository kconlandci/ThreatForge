"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getPathwayPack } from "@/lib/scenarios";
import { PATHWAYS, type PathwayId } from "@/lib/types";
import { getProfile } from "@/lib/player";
import { LeadGate } from "@/components/LeadGate";
import { ScenarioEngine } from "@/components/ScenarioEngine";
import { Wordmark } from "@/components/Logo";

export default function PlayPathwayPage({
  params,
}: {
  params: Promise<{ pathway: string }>;
}) {
  const { pathway } = use(params);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getProfile()) setReady(true);
  }, []);

  const meta = PATHWAYS.find((p) => p.id === pathway);
  if (!meta) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="text-loop-text-muted">Unknown pathway.</p>
        <Link href="/play" className="mt-4 font-semibold text-loop-green">
          ← Back to all pathways
        </Link>
      </main>
    );
  }

  const pack = getPathwayPack(pathway as PathwayId);

  return (
    <main className="min-h-screen px-6 py-10 md:py-16">
      <div className="mx-auto mb-8 flex max-w-2xl items-center justify-between">
        <Link href="/play">
          <Wordmark size="sm" showDci={false} />
        </Link>
        <Link href="/play" className="text-sm font-semibold text-loop-text-muted hover:text-loop-text">
          All pathways
        </Link>
      </div>
      {ready ? (
        <ScenarioEngine pack={pack} />
      ) : (
        <LeadGate pathwayName={meta.name} onReady={() => setReady(true)} />
      )}
    </main>
  );
}
