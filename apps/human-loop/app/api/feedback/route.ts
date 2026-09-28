/**
 * POST /api/feedback  {message, rating?: 1-5, pathway?, screen?}
 *   200 {stored: boolean}   stored: false when no feedback storage is configured.
 *   400 / 413 / 415 {error} invalid input.   429 {error} too many notes from this network.
 *   503 {error} + Retry-After  storage is configured but busy (Airtable rate limit, outage).
 * No names, emails or player ids are stored with a note.
 */
import { NextResponse } from "next/server";
import { createFeedback } from "@/lib/server/storage";
import { clientIp, feedbackLimiter } from "@/lib/server/rate-limit";
import { FEEDBACK_MAX_BYTES, readJsonBody, validateFeedback } from "@/lib/server/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function error(message: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, { status, headers: { ...NO_STORE, ...headers } });
}

export async function POST(req: Request) {
  const body = await readJsonBody(req, FEEDBACK_MAX_BYTES);
  if (!body.ok) return error(body.error, body.status);

  const note = validateFeedback(body.value);
  if (!note.ok) return error(note.error, 400);

  const ip = clientIp(req);
  const limit = feedbackLimiter.check(ip);
  if (!limit.ok) {
    return error("Lots of notes from this network right now. Please try again in a few minutes.", 429, {
      "Retry-After": String(limit.retryAfterSec),
    });
  }

  const version = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);
  const { stored, retryAfterSec } = await createFeedback(note.value, version);
  if (!stored && retryAfterSec !== undefined) {
    feedbackLimiter.release(ip);
    return error("We couldn't send it just now. Please try again in a minute.", 503, {
      "Retry-After": String(retryAfterSec),
    });
  }
  return NextResponse.json({ stored }, { headers: NO_STORE });
}
