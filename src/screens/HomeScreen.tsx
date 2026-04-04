import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Server,
  Flame,
  Cloud,
  ChevronRight,
  ChevronDown,
  Lock,
  CheckCircle,
  Zap,
  Play,
} from "lucide-react";
import { labCatalog } from "../data/catalog";
import { learningPaths } from "../data/paths";
import { useProgress } from "../hooks/useProgress";
import { usePremiumStatus } from "../hooks/usePremiumStatus";
import { useActivePath } from "../hooks/useRecommendedLab";
import { useAuth } from "../contexts/AuthContext";
import Onboarding, { isOnboardingComplete } from "../components/Onboarding";
import type { LearningPath } from "../data/paths";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Server,
  Flame,
  Cloud,
};

export default function HomeScreen() {
  const [showOnboarding, setShowOnboarding] = useState(!isOnboardingComplete());
  const [showAllLabs, setShowAllLabs] = useState(false);
  const navigate = useNavigate();
  const { uid } = useAuth();
  const { progress, getLabProgress, isLabCompleted, getTotalCompleted } =
    useProgress(uid);
  const { isPremium } = usePremiumStatus();

  const publishedLabs = useMemo(() => labCatalog.filter((l) => l.status === "published"), []);
  const freeLabs = useMemo(() => publishedLabs.filter((l) => l.accessLevel === "free"), [publishedLabs]);
  const premiumLabs = useMemo(() => publishedLabs.filter((l) => l.accessLevel === "premium"), [publishedLabs]);
  const completedCount = getTotalCompleted();
  const allFreeComplete =
    freeLabs.length > 0 && freeLabs.every((l) => isLabCompleted(l.id));

  const activePath = useActivePath(progress.labs);

  return (
    <>
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}

      <div className="min-h-screen bg-slate-900 p-4 pb-24">
        <div className="max-w-lg mx-auto pt-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <img src="/icon-512.png" alt="ThreatForge" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="text-xl font-bold text-white">ThreatForge</h1>
              <p className="text-xs text-slate-400">
                Cybersecurity Decision Simulator
              </p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 mb-6 px-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Zap size={12} className="text-orange-400" />
              <span className="font-medium">{progress.xp} XP</span>
            </div>
            {progress.streakDays > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Flame size={12} className="text-orange-400" />
                <span className="font-medium">
                  {progress.streakDays} day streak
                </span>
              </div>
            )}
            <div className="text-xs text-slate-500">
              {completedCount}/{publishedLabs.length} completed
            </div>
          </div>

          {/* Continue Your Path */}
          {activePath && (
            <section className="mb-6">
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-white">
                    Continue: {activePath.path.name}
                  </h2>
                  <span className="text-[10px] text-slate-400">
                    {activePath.completedCount}/{activePath.path.labIds.length}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{
                      width: `${
                        (activePath.completedCount /
                          activePath.path.labIds.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {labCatalog.find((l) => l.id === activePath.nextLabId)
                      ?.title ?? "Next lab"}
                  </span>
                  <button
                    onClick={() => navigate(`/lab/${activePath.nextLabId}`)}
                    aria-label="Continue learning path"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium min-h-[36px] active:bg-orange-600 transition-colors"
                  >
                    <Play size={12} /> Continue
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Learning Paths */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Learning Paths
            </h2>
            <div className="space-y-3">
              {learningPaths.map((path) => (
                <PathCard
                  key={path.id}
                  path={path}
                  isLabCompleted={isLabCompleted}
                  getLabProgress={getLabProgress}
                  isPremium={isPremium}
                />
              ))}
            </div>
          </section>

          {/* Upgrade prompt */}
          {allFreeComplete && !isPremium && (
            <Link
              to="/upgrade"
              className="block bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6 active:bg-orange-500/20 transition-colors"
            >
              <p className="text-sm text-orange-200 text-center">
                Ready for more? Unlock intermediate labs with ThreatForge
                Premium.
              </p>
            </Link>
          )}

          {/* All Labs (collapsible) */}
          <section className="mb-8">
            <button
              onClick={() => setShowAllLabs(!showAllLabs)}
              className="flex items-center gap-2 w-full mb-3 min-h-[44px]"
            >
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                All Labs
              </h2>
              <ChevronDown
                size={14}
                className={`text-slate-500 transition-transform ${
                  showAllLabs ? "rotate-180" : ""
                }`}
              />
              <span className="text-[10px] text-slate-500 ml-auto">
                {publishedLabs.length} labs
              </span>
            </button>
            {showAllLabs && (
              <>
                {/* Free Labs */}
                <h3 className="text-xs text-slate-500 mb-2 px-1">Free</h3>
                <div className="space-y-2 mb-4">
                  {freeLabs.map((lab) => (
                    <LabCard
                      key={lab.id}
                      lab={lab}
                      labProgress={getLabProgress(lab.id)}
                    />
                  ))}
                </div>
                {/* Premium Labs */}
                {premiumLabs.length > 0 && (
                  <>
                    <h3 className="text-xs text-slate-500 mb-2 px-1">
                      Premium
                    </h3>
                    <div className="space-y-2">
                      {premiumLabs.map((lab) => (
                        <LabCard
                          key={lab.id}
                          lab={lab}
                          locked={!isPremium}
                          labProgress={getLabProgress(lab.id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

// --- Path Card ---

function PathCard({
  path,
  isLabCompleted,
  getLabProgress,
  isPremium,
}: {
  path: LearningPath;
  isLabCompleted: (id: string) => boolean;
  getLabProgress: (id: string) => { completed: boolean; bestScore: number } | undefined;
  isPremium: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = path.labIds.filter((id) => isLabCompleted(id)).length;
  const total = path.labIds.length;
  const Icon = ICON_MAP[path.icon] ?? null;

  // Get difficulty range
  const difficulties = path.labIds
    .map((id) => labCatalog.find((l) => l.id === id)?.tier)
    .filter(Boolean);
  const unique = [...new Set(difficulties)];
  const diffBadge = unique.length > 1 ? `${unique[0]} → ${unique[unique.length - 1]}` : unique[0] ?? "";

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 min-h-[56px] active:bg-slate-750 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
          {Icon ? <Icon size={18} className="text-orange-400" /> : <img src="/icon-512.png" alt="" className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {path.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500 capitalize">{diffBadge}</span>
            <span className="text-[10px] text-slate-500">
              {completedCount}/{total}
            </span>
          </div>
          {/* Mini progress */}
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden mt-1.5 w-full max-w-[120px]">
            <div
              className="h-full bg-orange-500 rounded-full transition-all"
              style={{ width: `${total > 0 ? (completedCount / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-500 shrink-0 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1.5">
          <p className="text-xs text-slate-400 mb-2">{path.description}</p>
          {path.labIds.map((labId, idx) => {
            const lab = labCatalog.find((l) => l.id === labId);
            if (!lab) return null;
            const lp = getLabProgress(labId);
            const isLocked = lab.accessLevel === "premium" && !isPremium;
            return (
              <Link
                key={labId}
                to={isLocked ? "/upgrade" : `/lab/${labId}`}
                className={`flex items-center gap-2 py-2 px-2 rounded-lg min-h-[44px] ${
                  isLocked
                    ? "opacity-60"
                    : "active:bg-slate-700"
                } transition-colors`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
                  {lp?.completed ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <span className="text-xs text-white flex-1 truncate">
                  {lab.title}
                </span>
                {lp?.completed && (
                  <span className="text-[10px] text-green-400">
                    {lp.bestScore}
                  </span>
                )}
                {isLocked ? (
                  <Lock size={12} className="text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-slate-600 shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Lab Card (for All Labs section) ---

interface LabCardProps {
  lab: (typeof labCatalog)[number];
  locked?: boolean;
  labProgress?: {
    completed: boolean;
    bestScore: number;
  };
}

function LabCard({ lab, locked, labProgress }: LabCardProps) {
  const tierColor =
    lab.tier === "beginner"
      ? "text-green-400 bg-green-500/15"
      : lab.tier === "intermediate"
      ? "text-blue-400 bg-blue-500/15"
      : "text-purple-400 bg-purple-500/15";

  return (
    <Link
      to={locked ? "/upgrade" : `/lab/${lab.id}`}
      className={`block bg-slate-800 rounded-xl p-3 transition-colors ${
        locked
          ? "opacity-70 active:opacity-80"
          : "active:bg-slate-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-white truncate">
              {lab.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tierColor}`}
            >
              {lab.tier}
            </span>
            <span className="text-[10px] text-slate-500">
              ~{lab.estimatedMinutes} min
            </span>
            {labProgress?.completed && (
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <CheckCircle size={10} />
                {labProgress.bestScore}
              </span>
            )}
          </div>
        </div>
        {locked ? (
          <Lock size={14} className="text-slate-500 shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-slate-600 shrink-0" />
        )}
      </div>
    </Link>
  );
}
