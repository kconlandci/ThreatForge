/**
 * The "hl_pid" cookie: a random, server-issued player id (UUID v4). It links a browser to its
 * cloud save. It carries no personal data and is never used for ads or tracking.
 */
import type { NextResponse } from "next/server";
import { isUuid } from "./validate";

export const PLAYER_COOKIE = "hl_pid";
export const PLAYER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, in seconds

export function newPlayerId(): string {
  return crypto.randomUUID();
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // Browsers treat http://localhost as secure, so this is safe for `next start` too.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Read and validate the player id from a request's Cookie header. Malformed ids count as absent. */
export function readPlayerId(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== PLAYER_COOKIE) continue;
    let value = part.slice(eq + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      return null;
    }
    return isUuid(value) ? value.toLowerCase() : null;
  }
  return null;
}

export function setPlayerCookie(res: NextResponse, playerId: string): void {
  res.cookies.set(PLAYER_COOKIE, playerId, cookieOptions(PLAYER_COOKIE_MAX_AGE));
}

export function clearPlayerCookie(res: NextResponse): void {
  res.cookies.set(PLAYER_COOKIE, "", { ...cookieOptions(0), expires: new Date(0) });
}
