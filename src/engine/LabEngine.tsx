// ============================================================
// ThreatForge — Shared Lab Engine
// ============================================================
// Orchestrates all lab gameplay: scoring, hints, phase transitions,
// results display. Labs provide a manifest; the engine runs them.
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Shield,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Target,
  AlertTriangle,
  ChevronRight,
  Lightbulb,
  Wrench,
} from "lucide-react";
import type { LabManifest, ScoringConfig } from "../types/manifest";

// --- Types ---

export type Phase = "intro" | "active" | "feedback" | "results";

export type GradeResult = {
  type: "perfect" | "partial" | "wrong";
  penalty: number;
  message: string;
};

// Props for renderer components
export interface RendererProps {
  scenario: LabManifest["scenarios"][number];
  onSubmit: (result: GradeResult) => void;
  phase: Phase;
  feedbackResult: GradeResult | null;
}

// Props for LabEngine
interface LabEngineProps {
  manifest: LabManifest;
  renderer: React.ComponentType<RendererProps>;
  onExit: () => void;
  onLabComplete?: (score: number, history: GradeResult[]) => void;
  onHintUsed?: (scenarioIndex: number) => void;
  renderAfterResults?: () => React.ReactNode;
}

// --- Helpers ---

function getPerformanceTier(score: number, thresholds: ScoringConfig["passingThresholds"]) {
  if (score >= thresholds.pass) return { label: "PASS", color: "text-green-400", bg: "bg-green-500/10" };
  if (score >= thresholds.partial) return { label: "PARTIAL", color: "text-yellow-400", bg: "bg-yellow-500/10" };
  return { label: "NEEDS IMPROVEMENT", color: "text-red-400", bg: "bg-red-500/10" };
}

// --- Component ---

export default function LabEngine({ manifest, renderer: Renderer, onExit, onLabComplete, onHintUsed, renderAfterResults }: LabEngineProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [score, setScore] = useState<number>(manifest.scoring.maxScore);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<GradeResult | null>(null);
  const [history, setHistory] = useState<GradeResult[]>([]);

  const scenario = manifest.scenarios[scenarioIndex];
  const isLastScenario = scenarioIndex >= manifest.scenarios.length - 1;

  // Fire onLabComplete when entering results phase
  const hasCalledComplete = useRef(false);
  useEffect(() => {
    if (phase === "results" && !hasCalledComplete.current) {
      hasCalledComplete.current = true;
      onLabComplete?.(score, history);
    }
    if (phase === "intro") {
      hasCalledComplete.current = false;
    }
  }, [phase, score, history, onLabComplete]);

  // Hint handling
  const useHint = useCallback(() => {
    if (hintsUsed < 3) {
      setHintVisible(true);
      if (!hintVisible) {
        setScore((s) => Math.max(0, s - manifest.scoring.hintPenalty));
        setHintsUsed((h) => h + 1);
        onHintUsed?.(scenarioIndex);
      }
    }
  }, [hintsUsed, hintVisible, manifest.scoring.hintPenalty, onHintUsed, scenarioIndex]);

  // Submission from renderer
  const handleSubmit = useCallback((result: GradeResult) => {
    setScore((s) => Math.max(0, s - result.penalty));
    setFeedbackResult(result);
    setHistory((h) => [...h, result]);
    setPhase("feedback");
  }, []);

  // Advance to next scenario or results
  const advance = useCallback(() => {
    if (isLastScenario) {
      setPhase("results");
    } else {
      setScenarioIndex((i) => i + 1);
      setFeedbackResult(null);
      setHintVisible(false);
      setPhase("active");
    }
  }, [isLastScenario]);

  // Restart
  const restart = useCallback(() => {
    setPhase("intro");
    setScenarioIndex(0);
    setScore(manifest.scoring.maxScore);
    setHintsUsed(0);
    setHintVisible(false);
    setFeedbackResult(null);
    setHistory([]);
  }, [manifest.scoring.maxScore]);

  // --- INTRO ---
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-lg mx-auto pt-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Shield className="text-orange-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{manifest.title}</h1>
              <div className="flex gap-2 mt-1">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                  {manifest.tier}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">
                  {manifest.track}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-300 mb-6">{manifest.description}</p>

          {/* Objectives */}
          <div className="bg-slate-800 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Learning Objectives
            </h2>
            <ul className="space-y-2">
              {manifest.learningObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <Target size={14} className="text-orange-400 mt-0.5 shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Meta */}
          <div className="flex gap-4 text-sm text-slate-400 mb-8">
            <span>{manifest.scenarios.length} scenarios</span>
            <span>~{manifest.estimatedMinutes} min</span>
            <span className="capitalize">{manifest.difficulty}</span>
          </div>

          {/* Start button */}
          <button
            onClick={() => setPhase("active")}
            aria-label="Start lab"
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg transition-colors flex items-center justify-center gap-2"
          >
            Start Lab <ArrowRight size={20} />
          </button>

          <button
            onClick={onExit}
            aria-label="Back to catalog"
            className="w-full mt-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm transition-colors"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  // --- RESULTS ---
  if (phase === "results") {
    const tier = getPerformanceTier(score, manifest.scoring.passingThresholds);
    const perfectCount = history.filter((h) => h.type === "perfect").length;
    const partialCount = history.filter((h) => h.type === "partial").length;
    const wrongCount = history.filter((h) => h.type === "wrong").length;

    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-lg mx-auto pt-8">
          {/* Score */}
          <div className={`rounded-2xl p-6 text-center mb-6 ${tier.bg}`}>
            <Trophy className={`mx-auto mb-2 ${tier.color}`} size={40} />
            <div className={`text-5xl font-bold ${tier.color}`}>{score}</div>
            <div className="text-slate-400 text-sm mt-1">out of {manifest.scoring.maxScore}</div>
            <div className={`text-lg font-semibold mt-2 ${tier.color}`}>{tier.label}</div>
          </div>

          {/* Breakdown */}
          <div className="bg-slate-800 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Breakdown
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-green-400">
                <span>Perfect answers</span><span>{perfectCount}</span>
              </div>
              <div className="flex justify-between text-yellow-400">
                <span>Partial answers</span><span>{partialCount}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Wrong answers</span><span>{wrongCount}</span>
              </div>
              {hintsUsed > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Hints used ({hintsUsed} × -{manifest.scoring.hintPenalty})</span>
                  <span>-{hintsUsed * manifest.scoring.hintPenalty}</span>
                </div>
              )}
            </div>
          </div>

          {/* Career Insight */}
          <div className="bg-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={16} className="text-orange-400" />
              <h2 className="text-sm font-semibold text-orange-400">Career Insight</h2>
            </div>
            <p className="text-sm text-slate-300">{manifest.careerInsight}</p>
          </div>

          {/* Tool Relevance */}
          <div className="bg-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Wrench size={16} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-400">Related Tools</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {manifest.toolRelevance.map((tool, i) => (
                <span key={i} className="px-2 py-1 rounded bg-slate-700 text-xs text-slate-300">
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* Up Next */}
          {renderAfterResults?.()}

          {/* Actions */}
          <button
            onClick={restart}
            aria-label="Retry lab"
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <RotateCcw size={18} /> Retry Lab
          </button>
          <button
            onClick={onExit}
            aria-label="Back to catalog"
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  // --- ACTIVE + FEEDBACK (delegated to renderer) ---
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-orange-400" />
            <span className="text-sm font-medium text-white truncate max-w-[180px]">
              {manifest.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Scenario counter */}
            <span className="text-xs text-slate-400">
              {scenarioIndex + 1}/{manifest.scenarios.length}
            </span>
            {/* Score */}
            <span className="text-sm font-bold text-orange-400">{score}</span>
            {/* Hint button */}
            {phase === "active" && hintsUsed < 3 && (
              <button
                onClick={useHint}
                aria-label={`Use hint (${3 - hintsUsed} remaining)`}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors"
              >
                <HelpCircle size={14} />
                <span>{3 - hintsUsed}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hint display */}
      {hintVisible && phase === "active" && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-200">{manifest.hints[hintsUsed - 1]}</p>
          </div>
        </div>
      )}

      {/* Renderer */}
      <div className="max-w-lg mx-auto p-4">
        <Renderer
          key={scenarioIndex}
          scenario={scenario}
          onSubmit={handleSubmit}
          phase={phase}
          feedbackResult={feedbackResult}
        />
      </div>

      {/* Next button (feedback phase only) — sticky at bottom */}
      {phase === "feedback" && (
        <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-3">
          <div className="max-w-lg mx-auto">
            <button
              onClick={advance}
              aria-label={isLastScenario ? "View results" : "Next scenario"}
              className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isLastScenario ? "View Results" : "Next Scenario"}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
