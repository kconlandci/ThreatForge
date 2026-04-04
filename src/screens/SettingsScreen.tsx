import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronRight,
  Crown,
  FileText,
  Scale,
  AlertTriangle,
  Trash2,
  Mail,
  Star,
  BarChart3,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useProgress } from "../hooks/useProgress";
import { useAuth } from "../contexts/AuthContext";
import { usePurchase } from "../hooks/usePurchase";
import { usePremiumStatus } from "../hooks/usePremiumStatus";
import { Dialog } from "@capacitor/dialog";
import { Browser } from "@capacitor/browser";

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { uid } = useAuth();
  const { resetProgress } = useProgress(uid);
  const { restore, isRestoring } = usePurchase();
  const { isPremium, refreshPremiumStatus } = usePremiumStatus();
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  const handleRestore = async () => {
    setRestoreMsg(null);
    const result = await restore();
    if (result.success) {
      await refreshPremiumStatus();
      setRestoreMsg("Purchases restored successfully!");
    } else if (result.error === "network") {
      setRestoreMsg("Restore failed — check your connection.");
    } else {
      setRestoreMsg("No previous purchase found.");
    }
  };

  const handleResetProgress = async () => {
    try {
      const { value } = await Dialog.confirm({
        title: "Reset All Progress?",
        message:
          "This will clear all completed labs, scores, streaks, and XP. This cannot be undone.",
        okButtonTitle: "Reset Everything",
        cancelButtonTitle: "Cancel",
      });
      if (value) {
        resetProgress();
        navigate("/");
      }
    } catch {
      // Dialog.confirm crashes in browser — fall back to window.confirm
      const confirmed = window.confirm("Reset all progress? This cannot be undone.");
      if (confirmed) {
        resetProgress();
        navigate("/");
      }
    }
  };

  const handleSendFeedback = () => {
    window.location.href =
      "mailto:threatforge.app@gmail.com?subject=ThreatForge%20Feedback";
  };

  const handleRateApp = async () => {
    try {
      await Browser.open({
        url: "https://play.google.com/store/apps/details?id=com.threatforge.app",
      });
    } catch {
      window.location.href =
        "https://play.google.com/store/apps/details?id=com.threatforge.app";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        {/* App Info */}
        <div className="text-center mb-8">
          <img
            src="/icon-512.png"
            alt="ThreatForge"
            className="w-14 h-14 rounded-2xl mx-auto mb-3"
          />
          <h1 className="text-xl font-bold text-white">ThreatForge</h1>
          <p className="text-xs text-slate-400 mt-1">
            Cyber Judgment Training
          </p>
          <p className="text-[10px] text-slate-500 mt-1">v1.1.0</p>
          <p className="text-xs text-slate-400 mt-3 max-w-xs mx-auto leading-relaxed">
            Practice real-world cybersecurity judgment through interactive
            workplace simulations.
          </p>
        </div>

        {/* Premium */}
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
            Premium
          </h2>
          <div className="space-y-1">
            <Link
              to="/upgrade"
              className="flex items-center justify-between bg-slate-800 rounded-xl p-4 min-h-[48px] active:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Crown size={18} className="text-orange-400" />
                <span className="text-sm font-medium text-white">
                  {isPremium ? "ThreatForge Pro (Active)" : "Upgrade to Pro"}
                </span>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </Link>
            {!isPremium && (
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="flex items-center gap-3 w-full bg-slate-800 rounded-xl p-4 min-h-[48px] active:bg-slate-700 transition-colors text-left disabled:opacity-60"
              >
                {isRestoring ? (
                  <Loader2 size={16} className="text-slate-400 animate-spin" />
                ) : (
                  <RotateCcw size={16} className="text-slate-400" />
                )}
                <span className="text-sm font-medium text-white">
                  {isRestoring ? "Restoring..." : "Restore Purchases"}
                </span>
              </button>
            )}
            {restoreMsg && (
              <p className="text-xs text-slate-400 px-4 py-1">{restoreMsg}</p>
            )}
          </div>
        </section>

        {/* Data */}
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
            Data
          </h2>
          <div className="space-y-1">
            <SettingsRow
              icon={<BarChart3 size={16} />}
              label="Usage Stats"
              to="/settings/analytics"
            />
          </div>
        </section>

        {/* Legal */}
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
            Legal
          </h2>
          <div className="space-y-1">
            <SettingsRow
              icon={<FileText size={16} />}
              label="Privacy Policy"
              to="/settings/privacy"
            />
            <SettingsRow
              icon={<Scale size={16} />}
              label="Terms of Service"
              to="/settings/terms"
            />
            <SettingsRow
              icon={<AlertTriangle size={16} />}
              label="Disclaimer"
              to="/settings/disclaimer"
            />
          </div>
        </section>

        {/* Actions */}
        <section>
          <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
            Actions
          </h2>
          <div className="space-y-1">
            <button
              onClick={handleResetProgress}
              className="flex items-center gap-3 w-full bg-slate-800 rounded-xl p-4 min-h-[48px] active:bg-slate-700 transition-colors text-left"
            >
              <Trash2 size={16} className="text-red-400" />
              <span className="text-sm font-medium text-red-400">
                Reset Progress
              </span>
            </button>
            <button
              onClick={handleSendFeedback}
              className="flex items-center gap-3 w-full bg-slate-800 rounded-xl p-4 min-h-[48px] active:bg-slate-700 transition-colors text-left"
            >
              <Mail size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-white">
                Send Feedback
              </span>
            </button>
            <button
              onClick={handleRateApp}
              className="flex items-center gap-3 w-full bg-slate-800 rounded-xl p-4 min-h-[48px] active:bg-slate-700 transition-colors text-left"
            >
              <Star size={16} className="text-orange-400" />
              <span className="text-sm font-medium text-white">
                Rate This App
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between bg-slate-800 rounded-xl p-4 min-h-[48px] active:bg-slate-700 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <ChevronRight size={18} className="text-slate-500" />
    </Link>
  );
}
