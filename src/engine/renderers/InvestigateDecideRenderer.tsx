// ============================================================
// Renderer: Investigate + Decide
// Used by: SIEM Auth Log Review, Threat Intel Triage, Phishing
// ============================================================

import { useState } from "react";
import { CheckCircle, XCircle, Search, Eye, EyeOff } from "lucide-react";
import type { RendererProps } from "../LabEngine";
import type { InvestigateDecideScenario } from "../../types/manifest";

export default function InvestigateDecideRenderer({ scenario, onSubmit, phase, feedbackResult }: RendererProps) {
  const s = scenario as InvestigateDecideScenario;
  const [viewedSources, setViewedSources] = useState<Set<string>>(new Set());
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedRationale, setSelectedRationale] = useState<string | null>(null);

  const isLocked = phase === "feedback";

  const toggleSource = (id: string) => {
    if (isLocked) return;
    setViewedSources((prev) => new Set(prev).add(id));
    setExpandedSource((prev) => (prev === id ? null : id));
  };

  const handleSubmit = () => {
    if (!selectedAction || !selectedRationale) return;

    const actionCorrect = selectedAction === s.correctActionId;
    const rationaleCorrect = selectedRationale === s.correctRationaleId;

    if (actionCorrect && rationaleCorrect) {
      onSubmit({ type: "perfect", penalty: 0, message: s.feedback.perfect });
    } else if (actionCorrect || rationaleCorrect) {
      onSubmit({ type: "partial", penalty: 10, message: s.feedback.partial });
    } else {
      onSubmit({ type: "wrong", penalty: 20, message: s.feedback.wrong });
    }
  };

  // Check if learner missed critical sources
  const criticalSources = s.investigationData.filter((src) => src.isCritical);
  const missedCritical = criticalSources.filter((src) => !viewedSources.has(src.id));

  return (
    <div className="space-y-4">
      {/* Title + objective */}
      <h2 className="text-lg font-semibold text-white">{s.title}</h2>
      <div className="bg-slate-800 rounded-xl p-4">
        <p className="text-sm text-slate-300 leading-relaxed">{s.objective}</p>
      </div>

      {/* Investigation sources */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Search size={14} />
          Investigation Sources
        </h3>
        <div className="space-y-2">
          {s.investigationData.map((src) => {
            const isViewed = viewedSources.has(src.id);
            const isExpanded = expandedSource === src.id;

            return (
              <div key={src.id} className="rounded-xl border-2 border-slate-700 bg-slate-800 overflow-hidden">
                <button
                  onClick={() => toggleSource(src.id)}
                  disabled={isLocked}
                  className={`w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left transition-all ${
                    isLocked ? "cursor-default" : "cursor-pointer active:bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isViewed ? (
                      <Eye size={14} className="text-orange-400" />
                    ) : (
                      <EyeOff size={14} className="text-slate-500" />
                    )}
                    <span className={`text-sm font-medium ${isViewed ? "text-white" : "text-slate-400"}`}>
                      {src.label}
                    </span>
                  </div>
                  {src.isCritical && isLocked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">
                      KEY
                    </span>
                  )}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-slate-700">
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed mt-2 bg-slate-900/50 rounded-lg p-3">
                      {src.content}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action selection */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Choose Action
        </h3>
        <div className="grid gap-2">
          {s.actions.map((action) => {
            const isSelected = selectedAction === action.id;
            return (
              <button
                key={action.id}
                onClick={() => !isLocked && setSelectedAction(action.id)}
                disabled={isLocked}
                className={`min-h-[44px] p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-orange-500/20 border-orange-500 text-orange-200"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                } ${isLocked ? "opacity-70 cursor-default" : "cursor-pointer"}`}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rationale selection */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Justify Your Decision
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
          disabled={!selectedAction || !selectedRationale}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold transition-colors"
        >
          Submit Answer
        </button>
      )}

      {/* Feedback */}
      {phase === "feedback" && feedbackResult && (
        <div className="space-y-3">
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

          {/* Critical source feedback */}
          {missedCritical.length > 0 && (
            <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/30">
              <p className="text-xs text-red-300">
                You missed key evidence: {missedCritical.map((s) => s.label).join(", ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
