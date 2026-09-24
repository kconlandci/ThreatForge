/**
 * POST /api/logout -> {ok: true}
 * Signs this browser out: clears the "hl_pid" cookie only. The player's sign-up and cloud save are
 * left alone (use DELETE /api/progress to delete them). Used by "Not you? Sign out" on shared devices.
 */
import { NextResponse } from "next/server";
import { clearPlayerCookie } from "@/lib/server/player-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  clearPlayerCookie(res);
  return res;
}
