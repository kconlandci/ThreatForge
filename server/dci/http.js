import { isAllowedOrigin } from "./config.js";

export class RequestError extends Error {
  constructor(status = 400) {
    super("Invalid request");
    this.status = status;
  }
}

export function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store");
  if (body === undefined) return res.end();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(body));
}

export function prepareRequest(req, res, methods) {
  const origin = req.headers?.origin;
  if (origin !== undefined) {
    if (typeof origin !== "string" || !isAllowedOrigin(origin)) {
      respond(res, 401, { error: "Unauthorized" });
      return false;
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", [...methods, "OPTIONS"].join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") {
    respond(res, 204);
    return false;
  }
  if (!methods.includes(req.method)) {
    res.setHeader("Allow", [...methods, "OPTIONS"].join(", "));
    respond(res, 405, { error: "Method not allowed" });
    return false;
  }
  return true;
}

export async function readJson(req) {
  const maxBytes = 128 * 1024;
  if (Number(req.headers?.["content-length"] ?? 0) > maxBytes) throw new RequestError();
  let body = req.body;
  if (body === undefined) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > maxBytes) throw new RequestError();
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks).toString("utf8");
  }
  if (typeof body === "string" || Buffer.isBuffer(body)) {
    if (Buffer.byteLength(body) > maxBytes) throw new RequestError();
    try { body = JSON.parse(body.toString()); } catch { throw new RequestError(); }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new RequestError();
  return body;
}
