import { bearerStudent } from "../../server/dci/session.js";
import { prepareRequest, readJson, respond, RequestError } from "../../server/dci/http.js";
import { activeStudent, studentProgress, progressResponse, saveProgress, validateRecords, withStudentLock } from "../../server/dci/progress.js";

export default async function progress(req, res) {
  if (!prepareRequest(req, res, ["GET", "POST"])) return;
  const studentId = bearerStudent(req);
  if (!studentId) return respond(res, 401, { error: "Unauthorized" });
  try {
    const records = req.method === "POST" ? validateRecords(await readJson(req)) : null;
    const result = await withStudentLock(studentId, async () => {
      await activeStudent(studentId);
      return records === null
        ? progressResponse(await studentProgress(studentId))
        : saveProgress(studentId, records);
    });
    return respond(res, 200, result);
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 503;
    return respond(res, status, { error: status === 401 ? "Unauthorized" : status === 400 ? "Invalid request" : "Service unavailable" });
  }
}
