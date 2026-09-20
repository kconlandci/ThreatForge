import { NextRequest, NextResponse } from "next/server";
import { saveJson } from "@/lib/blob";
import type { PlayerProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body?.email === "string" ? body.email.trim().slice(0, 200) : "";
  const pathwayInterest =
    typeof body?.pathwayInterest === "string" ? body.pathwayInterest.slice(0, 60) : undefined;

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid name and email are required." }, { status: 400 });
  }

  const playerId =
    typeof body?.playerId === "string" && body.playerId.length > 0
      ? body.playerId
      : crypto.randomUUID();

  const profile: PlayerProfile & { pathwayInterest?: string } = {
    playerId,
    name,
    email,
    pathwayInterest,
    createdAt: new Date().toISOString(),
  };

  await saveJson("leads", playerId, profile);

  return NextResponse.json({ playerId });
}
