// ============================================================
// Renderer: Toggle / Config
// Used by: Port Exposure, Firewall Hardening, Zone Assignment
// ============================================================

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { RendererProps } from "../LabEngine";
import type { ToggleConfigScenario } from "../../types/manifest";

export default function ToggleConfigRenderer({ scenario, onSubmit, phase, feedbackResult }: RendererProps) {
  const s = scenario as ToggleConfigScenario;
  const [itemStates, setItemStates] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const item of s.items) init[item.id] = item.currentState;
    return init;
  });

  const isLocked = phase === "feedback";

  const cycleState = (itemId: string, states: string[]) => {
    if (isLocked) return;
    setItemStates((prev) => {
      const current = prev[itemId];
      const idx = states.indexOf(current);
      const next = states[(idx + 1) % states.length];
      return { ...prev, [itemId]: next };
    });
  };

  const handleSubmit = () => {
    let correctCount = 0;
    for (const item of s.items) {
      if (itemStates[item.id] === item.correctState) correctCount++;
    }

    const total = s.items.length;
    if (correctCount === total) {
      onSubmit({ type: "perfect", penalty: 0, message: s.feedback.perfect });
    } else if (correctCount >= Math.ceil(total / 2)) {
      onSubmit({ type: "partial", penalty: 10, message: s.feedback.partial });
    } else {
      onSubmit({ type: "wrong", penalty: 20, message: s.feedback.wrong });
    }
  };

  // Build a rationale lookup
  const rationaleMap = new Map(s.rationales.map((r) => [r.id, r.text]));

  return (
    <div className="space-y-4">
      {/* Title + target */}
      <h2 className="text-lg font-semibold text-white">{s.title}</h2>
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Target System</span>
          <span className="text-orange-300 font-mono">{s.targetSystem}</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{s.description}</p>
      </div>

      {/* Config items */}
      <div className="space-y-3">
        {s.items.map((item) => {
          const currentVal = itemStates[item.id];
          const isCorrect = currentVal === item.correctState;
          const showResult = phase === "feedback";

          return (
            <div
              key={item.id}
              className={`rounded-xl border-2 p-4 transition-all ${
                showResult
                  ? isCorrect
                    ? "border-green-500/40 bg-green-500/5"
                    : "border-red-500/40 bg-red-500/5"
                  : "border-slate-700 bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{item.label}</span>
                <button
                  onClick={() => cycleState(item.id, item.states)}
                  disabled={isLocked}
                  className={`min-w-[88px] min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                    currentVal === item.states[0]
                      ? "bg-yellow-500/20 border border-yellow-500/50 text-yellow-300"
                      : "bg-slate-700 border border-slate-600 text-slate-300"
                  } ${isLocked ? "opacity-70 cursor-default" : "cursor-pointer active:scale-95"}`}
                >
                  {currentVal}
                </button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{item.detail}</p>

              {/* Feedback per-item */}
              {showResult && (
                <div className="mt-2 flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  )}
                  <span className="text-xs text-slate-300">
                    {isCorrect
                      ? rationaleMap.get(item.rationaleId) ?? "Correct."
                      : `Should be ${item.correctState}. ${rationaleMap.get(item.rationaleId) ?? ""}`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      {phase === "active" && (
        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
        >
          Submit Configuration
        </button>
      )}

      {/* Overall feedback */}
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
