import { NextRequest, NextResponse } from "next/server";
import { saveJson } from "@/lib/blob";
import type { PathwayRunResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const playerId = typeof body?.playerId === "string" ? body.playerId : "";
  const run = body?.run as PathwayRunResult | undefined;

  if (!playerId || !run || !run.pathwayId) {
    return NextResponse.json({ error: "Missing playerId or run result." }, { status: 400 });
  }

  const id = `${playerId}__${run.pathwayId}__${Date.now()}`;
  await saveJson("progress", id, { playerId, ...run });

  return NextResponse.json({ ok: true });
}
