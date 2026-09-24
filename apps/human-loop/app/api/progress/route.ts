/**
 * Cloud save for signed-up players, keyed by the httpOnly "hl_pid" cookie.
 *
 * GET    -> {cloud, save}   `cloud` is true only when the database answered and this player exists.
 *                           No cookie, no database, or no player: {cloud: false, save: null}.
 * PUT    {save} -> {stored}  401 without a cookie; 400 / 413 / 415 {stored: false, error} on bad input.
 *                           Stores only for an existing player row. No database: {stored: false}.
 * DELETE -> {ok: true}      Deletes the player row and save, clears the cookie.
 *                           503 {ok: false, error} if the database could not be reached (cookie kept,
 *                           so a retry can still find the data).
 */
import { NextResponse } from "next/server";
import { deletePlayer, isDatabaseConfigured, loadCloudSave, storeCloudSave } from "@/lib/server/db";
import { clearPlayerCookie, readPlayerId } from "@/lib/server/player-cookie";
import { saveLimiter } from "@/lib/server/rate-limit";
import { readJsonBody, SAVE_MAX_BYTES, validateSave } from "@/lib/server/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export async function GET(req: Request) {
  const playerId = readPlayerId(req);
  if (!playerId || !isDatabaseConfigured()) return json({ cloud: false, save: null });
  return json(await loadCloudSave(playerId));
}

export async function PUT(req: Request) {
  const playerId = readPlayerId(req);
  if (!playerId) return json({ stored: false, error: "Sign up to back up your progress." }, 401);

  const limit = saveLimiter.check(playerId);
  if (!limit.ok) {
    return json({ stored: false, error: "Saving a lot right now. Try again in a moment." }, 429, {
      "Retry-After": String(limit.retryAfterSec),
    });
  }

  const body = await readJsonBody(req, SAVE_MAX_BYTES);
  if (!body.ok) return json({ stored: false, error: body.error }, body.status);

  const save = validateSave(body.value);
  if (!save.ok) return json({ stored: false, error: save.error }, 400);

  return json({ stored: await storeCloudSave(playerId, save.value) });
}

export async function DELETE(req: Request) {
  const playerId = readPlayerId(req);
  if (playerId && !(await deletePlayer(playerId))) {
    return json({ ok: false, error: "We couldn't delete your data right now. Please try again." }, 503);
  }
  const res = json({ ok: true });
  clearPlayerCookie(res);
  return res;
}
