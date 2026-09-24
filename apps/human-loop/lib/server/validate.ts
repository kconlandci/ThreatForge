/**
 * Input validation for the API routes. Pure functions, no I/O except `readJsonBody`.
 *
 * Rules match the client form (components/site/SignUpForm.tsx) so anything the form accepts, the
 * server accepts too. The server is still the source of truth: it never trusts the client.
 */
import { PATHWAYS } from "@/lib/types";
import type { SaveData } from "@/lib/game/types";

/** Sign-up bodies are tiny. Anything bigger is not from our form. */
export const LEAD_MAX_BYTES = 4 * 1024;
/** Cap for PUT /api/progress bodies. */
export const SAVE_MAX_BYTES = 256 * 1024;

/** Real saves nest about 6 levels deep. Deeper input is junk and could overflow JSON.stringify. */
export const SAVE_MAX_DEPTH = 24;

export const NAME_MAX = 80;
export const EMAIL_MAX = 254;

/** Same pattern as the sign-up form. */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** `Date.prototype.toISOString()` shape, e.g. 2026-09-24T18:30:00.000Z. */
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;
// Control characters (C0, DEL, C1) and bidi/format controls that can spoof how a name displays.
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

const PATHWAY_IDS = new Set<string>(PATHWAYS.map((p) => p.id));

export type Valid<T> = { ok: true; value: T } | { ok: false; error: string };

export type LeadInput = { name: string; email: string; marketingOptIn: boolean };

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** True when arrays/objects nest deeper than `limit`. Iterative, so hostile input cannot blow the stack. */
export function tooDeep(value: unknown, limit: number): boolean {
  const stack: [unknown, number][] = [[value, 0]];
  while (stack.length) {
    const [node, depth] = stack.pop()!;
    if (typeof node !== "object" || node === null) continue;
    if (depth >= limit) return true;
    for (const child of Object.values(node)) {
      if (typeof child === "object" && child !== null) stack.push([child, depth + 1]);
    }
  }
  return false;
}

/** Strip control characters, collapse runs of whitespace, trim. */
export function normalizeName(raw: string): string {
  return raw.replace(CONTROL_RE, "").replace(/\s+/g, " ").trim();
}

/** Trim and lower-case the domain. The local part is left as typed. */
export function normalizeEmail(raw: string): string {
  const email = raw.trim();
  const at = email.lastIndexOf("@");
  if (at < 0) return email;
  return email.slice(0, at) + "@" + email.slice(at + 1).toLowerCase();
}

/** Validate a POST /api/lead body. Error text is short and player-facing. */
export function validateLead(body: unknown): Valid<LeadInput> {
  if (!isPlainObject(body)) return { ok: false, error: "Please send your name and email." };

  if (typeof body.name !== "string") return { ok: false, error: "Please enter your name." };
  const name = normalizeName(body.name);
  if (!name) return { ok: false, error: "Please enter your name." };
  if (name.length > NAME_MAX) return { ok: false, error: `Please use ${NAME_MAX} characters or fewer for your name.` };

  if (typeof body.email !== "string") return { ok: false, error: "Please enter your email." };
  const email = normalizeEmail(body.email);
  if (!email) return { ok: false, error: "Please enter your email." };
  if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return { ok: false, error: "That email doesn't look right. Try one like name@example.com." };
  }

  if (typeof body.marketingOptIn !== "boolean") {
    return { ok: false, error: "Please say yes or no to emails from DCI." };
  }
  if (body.ageConfirmed !== true) return { ok: false, error: "Please confirm you're 13 or older." };

  return { ok: true, value: { name, email, marketingOptIn: body.marketingOptIn } };
}

/**
 * Validate the save inside a PUT /api/progress body (`{save: SaveData}`), or a save read back from
 * the database (pass the object itself with `{ envelope: false }`).
 *
 * Returns a cleaned copy: known pathway ids only, a sane `settings` and `updatedAt`, and
 * `profile: null`. The profile (name/email) is never stored in the save blob: it lives only in the
 * `players` table, so there is exactly one place that holds personal data.
 */
export function validateSave(body: unknown, opts: { envelope?: boolean } = {}): Valid<SaveData> {
  const envelope = opts.envelope ?? true;
  if (envelope && !isPlainObject(body)) return { ok: false, error: "Expected a JSON object." };
  const save = envelope ? (body as Record<string, unknown>).save : body;
  if (!isPlainObject(save)) return { ok: false, error: "Missing save." };
  if (save.version !== 2) return { ok: false, error: "Unsupported save version." };
  if (typeof save.playerId !== "string" || save.playerId.length === 0 || save.playerId.length > 100) {
    return { ok: false, error: "Invalid playerId." };
  }
  if (!isPlainObject(save.pathways)) return { ok: false, error: "Invalid pathways." };
  if (tooDeep(save.pathways, SAVE_MAX_DEPTH)) return { ok: false, error: "Save is nested too deeply." };

  const pathways: SaveData["pathways"] = {};
  for (const [id, progress] of Object.entries(save.pathways)) {
    // Unknown ids are dropped, not rejected, so an older server never breaks a newer client.
    if (!PATHWAY_IDS.has(id)) continue;
    if (!isPlainObject(progress)) return { ok: false, error: "Invalid pathway progress." };
    pathways[id as keyof SaveData["pathways"]] = progress as unknown as NonNullable<
      SaveData["pathways"][keyof SaveData["pathways"]]
    >;
  }

  const rm = isPlainObject(save.settings) ? save.settings.reducedMotion : null;
  const settings = { reducedMotion: typeof rm === "boolean" ? rm : null };

  const updatedAt =
    typeof save.updatedAt === "string" && ISO_RE.test(save.updatedAt) && !Number.isNaN(Date.parse(save.updatedAt))
      ? save.updatedAt
      : new Date().toISOString();

  return {
    ok: true,
    value: { version: 2, playerId: save.playerId, profile: null, pathways, settings, updatedAt },
  };
}

export type BodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413 | 415; error: string };

/**
 * Read a JSON request body with a hard byte cap. Checks Content-Length first, then counts bytes
 * while streaming, so a missing or lying header cannot get past the cap.
 */
export async function readJsonBody(req: Request, maxBytes: number): Promise<BodyResult> {
  const type = req.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type.trim())) {
    return { ok: false, status: 415, error: "Send JSON with Content-Type: application/json." };
  }
  const tooLarge = { ok: false as const, status: 413 as const, error: "That request is too large." };
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge;

  let text = "";
  if (req.body) {
    const reader = req.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel().catch(() => undefined);
          return tooLarge;
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } catch {
      // The client went away mid-upload.
      return { ok: false, status: 400, error: "The request body could not be read." };
    }
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, error: "That request was not valid JSON." };
  }
}
