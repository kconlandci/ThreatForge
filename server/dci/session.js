import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { SESSION_LIFETIME_SECONDS } from "./config.js";

function sessionSecret() {
  const secret = process.env.DCI_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Session configuration unavailable");
  return secret;
}

function signature(payload) {
  return createHmac("sha256", sessionSecret()).update(payload).digest();
}

export function hashAccessCode(code) {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

export function matchesAccessCode(code, storedHash) {
  const candidate = Buffer.from(hashAccessCode(code), "hex");
  // Compare a fixed-size dummy digest too when the stored digest is absent/bad.
  const wellFormed = typeof storedHash === "string" && /^[a-fA-F0-9]{64}$/.test(storedHash);
  const expected = wellFormed ? Buffer.from(storedHash, "hex") : Buffer.alloc(32);
  return timingSafeEqual(candidate, expected) && wellFormed;
}

export function issueSession(studentId, now = Date.now()) {
  if (!/^rec[A-Za-z0-9]{14}$/.test(studentId)) throw new Error("Invalid identity");
  const exp = Math.floor(now / 1000) + SESSION_LIFETIME_SECONDS;
  const payload = Buffer.from(JSON.stringify({ studentId, exp })).toString("base64url");
  return { token: `${payload}.${signature(payload).toString("base64url")}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifySession(token, now = Date.now()) {
  try {
    if (typeof token !== "string" || token.length > 1024) return null;
    const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
    if (!match) return null;
    const expected = signature(match[1]);
    const supplied = Buffer.from(match[2], "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    // Reject alternative encodings of the same signed bytes.
    if (supplied.toString("base64url") !== match[2]) return null;
    const decoded = Buffer.from(match[1], "base64url");
    if (decoded.toString("base64url") !== match[1]) return null;
    const payload = JSON.parse(decoded.toString("utf8"));
    if (!/^rec[A-Za-z0-9]{14}$/.test(payload.studentId) || !Number.isSafeInteger(payload.exp)) return null;
    if (payload.exp <= Math.floor(now / 1000)) return null;
    if (payload.exp > Math.floor(now / 1000) + SESSION_LIFETIME_SECONDS) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerStudent(req) {
  const authorization = req.headers?.authorization;
  if (typeof authorization !== "string") return null;
  const match = /^Bearer (\S+)$/.exec(authorization);
  return match ? verifySession(match[1])?.studentId ?? null : null;
}
