import { useMemo } from "react";
import { Flame, Zap, Trophy, Shield } from "lucide-react";
import { labCatalog } from "../data/catalog";
import { useProgress } from "../hooks/useProgress";
import { useAuth } from "../contexts/AuthContext";

export default function ProgressScreen() {
  const { uid } = useAuth();
  const { progress, getTotalCompleted } = useProgress(uid);
  const completedCount = getTotalCompleted();
  const totalLabs = useMemo(() => labCatalog.filter((l) => l.status === "published").length, []);
  const pct = totalLabs > 0 ? Math.round((completedCount / totalLabs) * 100) : 0;

  // Simple level: 1 level per 200 XP
  const level = Math.max(1, Math.floor(progress.xp / 200) + 1);

  const completedLabs = useMemo(
    () => Object.values(progress.labs).filter((l) => l.completed),
    [progress.labs]
  );

  return (
    <div className="min-h-screen bg-slate-900 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        <h1 className="text-xl font-bold text-white mb-6">Progress</h1>

        {/* XP + Level */}
        <div className="bg-slate-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-orange-400" />
              <span className="text-sm font-semibold text-white">
                Level {level}
              </span>
            </div>
            <span className="text-sm text-orange-400 font-bold">
              {progress.xp} XP
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all"
              style={{ width: `${(progress.xp % 200) / 2}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {200 - (progress.xp % 200)} XP to next level
          </p>
        </div>

        {/* Streak */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-slate-800 rounded-xl p-4 text-center">
            <Flame size={20} className="text-orange-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">
              {progress.streakDays}
            </div>
            <div className="text-[10px] text-slate-500 uppercase">
              Day Streak
            </div>
          </div>
          <div className="flex-1 bg-slate-800 rounded-xl p-4 text-center">
            <Trophy size={20} className="text-yellow-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">
              {progress.longestStreak}
            </div>
            <div className="text-[10px] text-slate-500 uppercase">
              Best Streak
            </div>
          </div>
        </div>

        {/* Completion */}
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Catalog Progress</span>
            <span className="text-sm font-bold text-white">
              {completedCount}/{totalLabs}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{pct}% complete</p>
        </div>

        {/* Completed labs */}
        {completedLabs.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Completed Labs
            </h2>
            <div className="space-y-2">
              {completedLabs.map((lp) => {
                const manifest = labCatalog.find((l) => l.id === lp.labId);
                return (
                  <div
                    key={lp.labId}
                    className="bg-slate-800 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-green-400" />
                      <span className="text-sm text-white">
                        {manifest?.title ?? lp.labId}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-400">
                      {lp.bestScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {completedLabs.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">
            Complete a lab to see your progress here.
          </p>
        )}
      </div>
    </div>
  );
}
