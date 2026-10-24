import { bearerStudent } from "../../server/dci/session.js";
import { prepareRequest, readJson, respond, RequestError } from "../../server/dci/http.js";
import { activeStudent, readProgress, reconcileSummary, saveProgress, validateRecords, withStudentLock } from "../../server/dci/progress.js";
import { deriveSourceKey, validateClientId } from "../../server/dci/source.js";

export default async function progress(req, res) {
  if (!prepareRequest(req, res, ["GET", "POST"])) return;
  const studentId = bearerStudent(req);
  if (!studentId) return respond(res, 401, { error: "Unauthorized" });
  try {
    const body = req.method === "POST" ? await readJson(req) : null;
    // Reject a missing ID instead of rewriting an immutable legacy row.
    const sourceKey = body ? deriveSourceKey(studentId, validateClientId(body.clientId)) : null;
    const records = body ? validateRecords(body) : null;
    const result = await withStudentLock(studentId, async () => {
      await activeStudent(studentId);
      return records === null
        ? readProgress(studentId)
        : saveProgress(studentId, records, sourceKey);
    });
    respond(res, 200, result);
    if (records === null) {
      // Send logical GET results first. Awaiting here keeps the local handler
      // alive for a bounded best-effort repair without delaying the response.
      try { await withStudentLock(studentId, () => reconcileSummary(studentId)); } catch { /* A later GET can retry. */ }
    }
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 503;
    return respond(res, status, { error: status === 401 ? "Unauthorized" : status === 400 ? "Invalid request" : "Service unavailable" });
  }
}
