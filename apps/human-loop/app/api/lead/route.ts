/**
 * POST /api/lead  {name, email, marketingOptIn, ageConfirmed: true}
 *   200 {stored: boolean, playerId: string}  and sets the httpOnly "hl_pid" cookie.
 *   400 / 413 / 415 {error}  invalid input.   429 {error}  too many sign-ups from this network.
 *
 * `stored: false` means no database is configured (or it is unreachable). The player still gets
 * a server-issued id and cookie, and the game keeps saving in the browser.
 */
import { after, NextResponse } from "next/server";
import { createPlayer, maybePurgeStalePlayers } from "@/lib/server/db";
import { newPlayerId, setPlayerCookie } from "@/lib/server/player-cookie";
import { clientIp, leadLimiter } from "@/lib/server/rate-limit";
import { LEAD_MAX_BYTES, readJsonBody, validateLead } from "@/lib/server/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function error(message: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, { status, headers: { ...NO_STORE, ...headers } });
}

/** Run housekeeping after the response is sent. Outside a request scope (tests), just run it. */
function afterResponse(task: () => Promise<void>) {
  try {
    after(task);
  } catch {
    void task();
  }
}

export async function POST(req: Request) {
  const limit = leadLimiter.check(clientIp(req));
  if (!limit.ok) {
    return error("Lots of sign-ups from this network right now. Please try again in a few minutes.", 429, {
      "Retry-After": String(limit.retryAfterSec),
    });
  }

  const body = await readJsonBody(req, LEAD_MAX_BYTES);
  if (!body.ok) return error(body.error, body.status);

  const lead = validateLead(body.value);
  if (!lead.ok) return error(lead.error, 400);

  const playerId = newPlayerId();
  const stored = await createPlayer(playerId, lead.value);
  if (stored) afterResponse(() => maybePurgeStalePlayers());

  const res = NextResponse.json({ stored, playerId }, { headers: NO_STORE });
  setPlayerCookie(res, playerId);
  return res;
}
