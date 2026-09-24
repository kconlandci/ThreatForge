/**
 * GET /api/cron/purge — the daily retention job (vercel.json "crons").
 * Deletes players with no sign-up or save activity for 24 months, as the privacy notice promises,
 * even when nobody signs up for a while (sign-ups also trigger it, at most once a day).
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET set, this route
 * refuses every request (401), so it can't be triggered by anyone else.
 */
import { NextResponse } from "next/server";
import { maybePurgeStalePlayers } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const purged = await maybePurgeStalePlayers(Date.now(), true);
  return NextResponse.json({ ok: true, purged }, { headers: { "Cache-Control": "no-store" } });
}
