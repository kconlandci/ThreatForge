import { TABLES } from "../../server/dci/config.js";
import { listRecords, updateRecords, formulaString } from "../../server/dci/airtable.js";
import { issueSession, matchesAccessCode } from "../../server/dci/session.js";
import { prepareRequest, readJson, respond } from "../../server/dci/http.js";

export default async function signin(req, res) {
  if (!prepareRequest(req, res, ["POST"])) return;
  try {
    const body = await readJson(req);
    if (typeof body.email !== "string" || typeof body.accessCode !== "string" ||
        body.email.length > 320 || body.accessCode.length < 1 || body.accessCode.length > 1024) {
      throw new Error("Unauthorized");
    }
    const email = body.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Unauthorized");
    const students = await listRecords(TABLES.students, { filterByFormula: `LOWER({Email})=${formulaString(email)}` });
    const student = students.length === 1 ? students[0] : null;
    const matches = matchesAccessCode(body.accessCode, student?.fields?.["Access Code Hash"]);
    if (!student || student.fields.Status !== "Active" || !matches) throw new Error("Unauthorized");
    const session = issueSession(student.id);
    await updateRecords(TABLES.students, [{ id: student.id, fields: { "Last Active": new Date().toISOString() } }]);
    return respond(res, 200, {
      name: student.fields.Name ?? "", pathway: student.fields["Pathway / Cohort"] ?? "",
      studentId: student.id, ...session,
    });
  } catch {
    // Intentionally identical for an unknown email, inactive student, wrong code,
    // malformed body, or unavailable backing service. Never log submitted codes.
    return respond(res, 401, { error: "Unauthorized" });
  }
}
