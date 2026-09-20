import { NextResponse } from "next/server";
import { listJson } from "@/lib/blob";
import type { PathwayId, PathwayRunResult, PlayerProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const [leads, runs] = await Promise.all([
    listJson<PlayerProfile>("leads"),
    listJson<PathwayRunResult & { playerId: string }>("progress"),
  ]);

  const uniquePlayers = new Set(runs.map((r) => r.playerId));
  const byPathway: Record<string, { runs: number; avgScorePct: number }> = {};

  const grouped = new Map<PathwayId, PathwayRunResult[]>();
  for (const r of runs) {
    if (!grouped.has(r.pathwayId)) grouped.set(r.pathwayId, []);
    grouped.get(r.pathwayId)!.push(r);
  }
  for (const [pathwayId, list] of grouped.entries()) {
    const avg =
      list.reduce((sum, r) => sum + (r.maxScore > 0 ? r.score / r.maxScore : 0), 0) / list.length;
    byPathway[pathwayId] = { runs: list.length, avgScorePct: Math.round(avg * 100) };
  }

  return NextResponse.json({
    totalLeads: leads.length,
    totalRuns: runs.length,
    uniquePlayers: uniquePlayers.size,
    byPathway,
    updatedAt: new Date().toISOString(),
  });
}
