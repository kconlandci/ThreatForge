import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { labCatalog } from "../data/catalog";
import { RENDERERS } from "../engine/renderers";
import LabEngine from "../engine/LabEngine";
import type { GradeResult } from "../engine/LabEngine";
import { useProgress } from "../hooks/useProgress";
import { usePremiumStatus } from "../hooks/usePremiumStatus";
import { useRecommendedLab } from "../hooks/useRecommendedLab";
import { useAuth } from "../contexts/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { useAppReview } from "../hooks/useAppReview";
import { trackLabStarted, trackLabCompleted, trackHintUsed } from "../hooks/useAnalytics";
import { ArrowRight, Lock, PartyPopper } from "lucide-react";

export default function LabScreen() {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();
  const { uid } = useAuth();
  const { progress, recordLabCompletion } = useProgress(uid);
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();
  const { maybeRequestReview } = useAppReview();

  const labStartTime = useRef(0);
  const hasTrackedStart = useRef(false);

  useEffect(() => {
    hasTrackedStart.current = false;
    labStartTime.current = 0;
  }, [labId]);

  useEffect(() => {
    if (labId && !hasTrackedStart.current) {
      labStartTime.current = Date.now();
      hasTrackedStart.current = true;
      trackLabStarted(labId);
    }
  }, [labId]);

  const manifest = labCatalog.find((l) => l.id === labId);
  const completedLabIds = Object.keys(progress.labs).filter(
    (id) => progress.labs[id]?.completed
  );
  const recommendation = useRecommendedLab(labId ?? "", completedLabIds);

  if (!manifest) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Lab not found.</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white font-medium"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Wait for premium status to resolve before gating
  if (manifest.accessLevel === "premium" && isPremiumLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    );
  }

  // Premium gate: redirect non-premium users trying to access premium labs
  if (manifest.accessLevel === "premium" && !isPremium) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Lock size={32} className="text-slate-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-white mb-1">Premium Lab</p>
          <p className="text-xs text-slate-400 mb-4">
            This simulation requires ThreatForge Pro.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/upgrade")}
              className="px-4 py-2 rounded-xl bg-orange-500 text-white font-medium text-sm min-h-[44px]"
            >
              Upgrade to Pro
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm min-h-[44px]"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Renderer = RENDERERS[manifest.rendererType];

  const handleLabComplete = (score: number, history: GradeResult[]) => {
    recordLabCompletion(
      manifest.id,
      score,
      history.map((h, i) => ({ scenarioIndex: i, grade: h.type }))
    );

    // Track analytics
    const durationSeconds = Math.round((Date.now() - labStartTime.current) / 1000);
    trackLabCompleted(manifest.id, score, durationSeconds);

    // Check if we should prompt for an in-app review.
    const alreadyCounted = progress.labs[manifest.id]?.completed ?? false;
    const totalCompleted =
      Object.values(progress.labs).filter((l) => l.completed).length +
      (alreadyCounted ? 0 : 1);
    maybeRequestReview(totalCompleted);
  };

  const handleHintUsed = (scenarioIndex: number) => {
    if (manifest) trackHintUsed(manifest.id, scenarioIndex);
  };

  const renderUpNext = () => {
    if (!recommendation) {
      return (
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <PartyPopper size={24} className="text-orange-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-white mb-1">
            You've completed all available labs!
          </p>
          <p className="text-xs text-slate-400 mb-3">
            More labs coming soon. Keep your streak alive by replaying favorites.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium min-h-[44px]"
          >
            Browse All Labs
          </button>
        </div>
      );
    }

    const isRecPremium = recommendation.lab.accessLevel === "premium" && !isPremium;

    return (
      <div className="bg-slate-800 rounded-xl p-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-1">
          Up Next
        </p>
        <p className="text-sm font-semibold text-white mb-0.5">
          {recommendation.lab.title}
        </p>
        <p className="text-xs text-slate-400 mb-3">{recommendation.reason}</p>
        {isRecPremium ? (
          <button
            onClick={() => navigate("/upgrade")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-orange-300 text-sm font-medium min-h-[44px]"
          >
            <Lock size={14} /> Unlock with Premium
          </button>
        ) : (
          <button
            onClick={() => navigate(`/lab/${recommendation.lab.id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium min-h-[44px]"
          >
            Start Lab <ArrowRight size={14} />
          </button>
        )}
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <LabEngine
        manifest={manifest}
        renderer={Renderer}
        onExit={() => navigate("/")}
        onLabComplete={handleLabComplete}
        onHintUsed={handleHintUsed}
        renderAfterResults={renderUpNext}
      />
    </ErrorBoundary>
  );
}
