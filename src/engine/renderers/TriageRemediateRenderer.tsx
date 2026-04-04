// ============================================================
// Renderer: Triage + Remediate
// Used by: Web App Vulnerability Triage, Malware Classification
// ============================================================

import { useState } from "react";
import { CheckCircle, XCircle, FileText } from "lucide-react";
import type { RendererProps } from "../LabEngine";
import type { TriageRemediateScenario } from "../../types/manifest";

export default function TriageRemediateRenderer({ scenario, onSubmit, phase, feedbackResult }: RendererProps) {
  const s = scenario as TriageRemediateScenario;
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null);
  const [selectedRemediation, setSelectedRemediation] = useState<string | null>(null);
  const [selectedRationale, setSelectedRationale] = useState<string | null>(null);

  const isLocked = phase === "feedback";

  const handleSubmit = () => {
    if (!selectedClassification || !selectedRemediation || !selectedRationale) return;

    const classCorrect = selectedClassification === s.correctClassificationId;
    const remCorrect = selectedRemediation === s.correctRemediationId;
    const ratCorrect = selectedRationale === s.correctRationaleId;

    const correctCount = [classCorrect, remCorrect, ratCorrect].filter(Boolean).length;

    if (correctCount === 3) {
      onSubmit({ type: "perfect", penalty: 0, message: s.feedback.perfect });
    } else if (correctCount === 2) {
      onSubmit({ type: "partial", penalty: 10, message: s.feedback.partial });
    } else {
      onSubmit({ type: "wrong", penalty: 20, message: s.feedback.wrong });
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <h2 className="text-lg font-semibold text-white">{s.title}</h2>

      {/* Description */}
      <div className="bg-slate-800 rounded-xl p-4">
        <p className="text-sm text-slate-300 leading-relaxed">{s.description}</p>
      </div>

      {/* Evidence */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
          <FileText size={14} />
          Evidence
        </h3>
        <div className="space-y-2">
          {s.evidence.map((ev, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {ev.type}
              </span>
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed mt-1">
                {ev.content}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Classification */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Step 1 — Classify the Issue
        </h3>
        <div className="grid gap-2">
          {s.classifications.map((c) => {
            const isSelected = selectedClassification === c.id;
            return (
              <button
                key={c.id}
                onClick={() => !isLocked && setSelectedClassification(c.id)}
                disabled={isLocked}
                className={`min-h-[44px] p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "bg-blue-500/20 border-blue-500 text-blue-200"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                } ${isLocked ? "opacity-70 cursor-default" : "cursor-pointer"}`}
              >
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{c.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Remediation */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Step 2 — Select Remediation
        </h3>
        <div className="grid gap-2">
          {s.remediations.map((r) => {
            const isSelected = selectedRemediation === r.id;
            return (
              <button
                key={r.id}
                onClick={() => !isLocked && setSelectedRemediation(r.id)}
                disabled={isLocked}
                className={`min-h-[44px] p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "bg-orange-500/20 border-orange-500 text-orange-200"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                } ${isLocked ? "opacity-70 cursor-default" : "cursor-pointer"}`}
              >
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{r.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Rationale */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Step 3 — Justify Your Decision
        </h3>
        <div className="grid gap-2">
          {s.rationales.map((r) => {
            const isSelected = selectedRationale === r.id;
            return (
              <button
                key={r.id}
                onClick={() => !isLocked && setSelectedRationale(r.id)}
                disabled={isLocked}
                className={`min-h-[44px] p-3 rounded-xl border-2 text-left text-sm transition-all ${
                  isSelected
                    ? "bg-orange-500/20 border-orange-500 text-orange-200"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                } ${isLocked ? "opacity-70 cursor-default" : "cursor-pointer"}`}
              >
                {r.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      {phase === "active" && (
        <button
          onClick={handleSubmit}
          disabled={!selectedClassification || !selectedRemediation || !selectedRationale}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold transition-colors"
        >
          Submit Answer
        </button>
      )}

      {/* Feedback */}
      {phase === "feedback" && feedbackResult && (
        <div
          className={`rounded-xl p-4 border-2 ${
            feedbackResult.type === "perfect"
              ? "bg-green-500/10 border-green-500/40"
              : feedbackResult.type === "partial"
              ? "bg-yellow-500/10 border-yellow-500/40"
              : "bg-red-500/10 border-red-500/40"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {feedbackResult.type === "perfect" ? (
              <CheckCircle size={18} className="text-green-400" />
            ) : feedbackResult.type === "partial" ? (
              <CheckCircle size={18} className="text-yellow-400" />
            ) : (
              <XCircle size={18} className="text-red-400" />
            )}
            <span
              className={`text-sm font-semibold capitalize ${
                feedbackResult.type === "perfect"
                  ? "text-green-400"
                  : feedbackResult.type === "partial"
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {feedbackResult.type === "perfect"
                ? "Correct!"
                : feedbackResult.type === "partial"
                ? "Partially Correct"
                : "Incorrect"}
            </span>
          </div>
          <p className="text-sm text-slate-300">{feedbackResult.message}</p>
        </div>
      )}
    </div>
  );
}
