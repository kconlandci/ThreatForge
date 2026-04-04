// ============================================================
// Renderer: Action + Rationale
// Used by: Endpoint Isolation, Firewall Hardening, MFA Fatigue,
//          Network Segmentation
// ============================================================

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { RendererProps } from "../LabEngine";
import type { ActionRationaleScenario } from "../../types/manifest";

const COLOR_MAP: Record<string, { selected: string; base: string }> = {
  blue:   { selected: "bg-blue-500/20 border-blue-500 text-blue-300", base: "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500" },
  green:  { selected: "bg-green-500/20 border-green-500 text-green-300", base: "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500" },
  yellow: { selected: "bg-yellow-500/20 border-yellow-500 text-yellow-300", base: "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500" },
  orange: { selected: "bg-orange-500/20 border-orange-500 text-orange-300", base: "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500" },
  red:    { selected: "bg-red-500/20 border-red-500 text-red-300", base: "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500" },
};

const DEFAULT_COLOR = COLOR_MAP.blue;

export default function ActionRationaleRenderer({ scenario, onSubmit, phase, feedbackResult }: RendererProps) {
  const s = scenario as ActionRationaleScenario;
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedRationale, setSelectedRationale] = useState<string | null>(null);

  const isLocked = phase === "feedback";

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

  return (
    <div className="space-y-4">
      {/* Scenario title */}
      {s.title && <h2 className="text-lg font-semibold text-white">{s.title}</h2>}

      {/* Context */}
      <div className="bg-slate-800 rounded-xl p-4">
        <p className="text-sm text-slate-300 leading-relaxed">{s.context}</p>
      </div>

      {/* Display fields */}
      {s.displayFields.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-2">
          {s.displayFields.map((field, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-400">{field.label}</span>
              <span className={
                field.emphasis === "critical" ? "text-red-400 font-medium" :
                field.emphasis === "warn" ? "text-yellow-400 font-medium" :
                "text-white"
              }>
                {field.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Evidence */}
      {s.evidence && s.evidence.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 font-mono text-xs text-green-400 space-y-1">
          {s.evidence.map((e, i) => (
            <div key={i}>→ {e}</div>
          ))}
        </div>
      )}

      {/* Log entry */}
      {s.logEntry && (
        <div className="bg-slate-800/50 rounded-xl p-3 font-mono text-xs text-slate-300 whitespace-pre-wrap">
          {s.logEntry}
        </div>
      )}

      {/* Action selection */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Choose Action
        </h3>
        <div className="grid gap-2">
          {s.actions.map((action) => {
            const colors = COLOR_MAP[action.color || "blue"] || DEFAULT_COLOR;
            const isSelected = selectedAction === action.id;
            return (
              <button
                key={action.id}
                onClick={() => !isLocked && setSelectedAction(action.id)}
                disabled={isLocked}
                className={`p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                  isSelected ? colors.selected : colors.base
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
                className={`p-3 rounded-xl border-2 text-left text-sm transition-all ${
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

      {/* Submit button */}
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
        <div className={`rounded-xl p-4 border-2 ${
          feedbackResult.type === "perfect"
            ? "bg-green-500/10 border-green-500/40"
            : feedbackResult.type === "partial"
            ? "bg-yellow-500/10 border-yellow-500/40"
            : "bg-red-500/10 border-red-500/40"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {feedbackResult.type === "perfect" ? (
              <CheckCircle size={18} className="text-green-400" />
            ) : feedbackResult.type === "partial" ? (
              <CheckCircle size={18} className="text-yellow-400" />
            ) : (
              <XCircle size={18} className="text-red-400" />
            )}
            <span className={`text-sm font-semibold capitalize ${
              feedbackResult.type === "perfect" ? "text-green-400" :
              feedbackResult.type === "partial" ? "text-yellow-400" : "text-red-400"
            }`}>
              {feedbackResult.type === "perfect" ? "Correct!" :
               feedbackResult.type === "partial" ? "Partially Correct" : "Incorrect"}
            </span>
          </div>
          <p className="text-sm text-slate-300">{feedbackResult.message}</p>
        </div>
      )}
    </div>
  );
}
