import { createHmac } from "node:crypto";
import { RequestError } from "./http.js";

// An installation ID is routing metadata, never a credential. The raw value
// stays in memory here; Airtable receives only its student-scoped digest.
export function validateClientId(clientId) {
  if (typeof clientId !== "string" || clientId.length !== 36 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(clientId)) throw new RequestError();
  return clientId;
}

export function deriveSourceKey(studentId, clientId) {
  if (!/^rec[A-Za-z0-9]{14}$/.test(studentId)) throw new RequestError(401);
  validateClientId(clientId);
  const secret = process.env.DCI_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Session configuration unavailable");
  return createHmac("sha256", secret).update(studentId).update("\0").update(clientId).digest("hex").slice(0, 32);
}
