import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Target,
  Infinity,
  Lock,
  CheckCircle,
  Loader2,
  Zap,
  Award,
  Crown,
} from "lucide-react";
import { labCatalog } from "../data/catalog";
import { usePurchase } from "../hooks/usePurchase";
import { usePremiumStatus } from "../hooks/usePremiumStatus";
import {
  SUBSCRIPTION_ID,
  LIFETIME_PRODUCT_ID,
} from "../config/revenuecat";

type PlanKey = "monthly" | "yearly" | "lifetime";

interface PricingPlan {
  key: PlanKey;
  label: string;
  price: string;
  period: string;
  badge: string | null;
  productId: string;
  icon: typeof Zap;
  savings: string | null;
}

const PLANS: PricingPlan[] = [
  {
    key: "monthly",
    label: "Monthly",
    price: "$4.99",
    period: "/month",
    badge: null,
    productId: `${SUBSCRIPTION_ID}:monthly`,
    icon: Zap,
    savings: null,
  },
  {
    key: "yearly",
    label: "Yearly",
    price: "$29.99",
    period: "/year",
    badge: "Save 50%",
    productId: `${SUBSCRIPTION_ID}:yearly`,
    icon: Award,
    savings: "vs. $59.88/yr monthly",
  },
  {
    key: "lifetime",
    label: "Lifetime",
    price: "$49.99",
    period: "one-time",
    badge: "Best Value",
    productId: LIFETIME_PRODUCT_ID,
    icon: Crown,
    savings: "Pay once, own forever",
  },
];

function goBack(navigate: ReturnType<typeof useNavigate>) {
  if (window.history.state?.idx > 0) {
    navigate(-1);
  } else {
    navigate("/");
  }
}

export default function UpgradeScreen() {
  const navigate = useNavigate();
  const { purchase, restore, isPurchasing, isRestoring } = usePurchase();
  const { isPremium, refreshPremiumStatus } = usePremiumStatus();
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("lifetime");

  const premiumLabs = labCatalog.filter(
    (l) => l.accessLevel === "premium" && l.status === "published"
  );
  const premiumCount = premiumLabs.length;

  const valueProps = [
    {
      icon: Shield,
      text: `Unlock all ${premiumCount} premium judgment simulations`,
    },
    {
      icon: Target,
      text: "Real incident response, cloud security & threat hunting",
    },
    {
      icon: Infinity,
      text: "All future labs included as they're released",
    },
  ];

  const handlePurchase = async () => {
    setErrorMsg(null);
    const plan = PLANS.find((p) => p.key === selectedPlan);
    if (!plan) return;

    const result = await purchase(plan.productId);

    if (result.success) {
      await refreshPremiumStatus();
      setPurchaseSuccess(true);
    } else if (result.error === "cancelled") {
      // User cancelled — do nothing
    } else if (result.error === "network") {
      setErrorMsg("Purchase failed — check your connection and try again.");
    } else {
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  const handleRestore = async () => {
    setErrorMsg(null);
    const result = await restore();

    if (result.success) {
      await refreshPremiumStatus();
      setPurchaseSuccess(true);
    } else if (result.error === "network") {
      setErrorMsg("Restore failed — check your connection and try again.");
    } else {
      setErrorMsg("No previous purchase found.");
    }
  };

  const isBusy = isPurchasing || isRestoring;
  const activePlan = PLANS.find((p) => p.key === selectedPlan)!;

  // Already premium — show confirmation
  if (isPremium || purchaseSuccess) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => goBack(navigate)}
              aria-label="Go back"
              className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-2"
            >
              <ArrowLeft size={20} className="text-slate-400" />
            </button>
            <h1 className="text-sm font-semibold text-white">
              ThreatForge Pro
            </h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto p-4 pt-16 text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            You're a Pro Member!
          </h2>
          <p className="text-sm text-slate-400 mb-8">
            All premium labs are unlocked. Thank you for your support.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm"
          >
            Start Exploring
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => goBack(navigate)}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-2"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <h1 className="text-sm font-semibold text-white">
            ThreatForge Pro
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-12">
        {/* Hero */}
        <div className="text-center mb-6 pt-4">
          <h2 className="text-2xl font-bold text-white mb-2">
            Upgrade to Pro
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            Unlock every premium simulation and level up your cyber judgment.
          </p>
        </div>

        {/* Value Props */}
        <div className="space-y-3 mb-8">
          {valueProps.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3 bg-slate-800 rounded-xl p-3"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-orange-400" />
                </div>
                <span className="text-sm text-slate-300">{item.text}</span>
              </div>
            );
          })}
        </div>

        {/* Pricing Cards */}
        <div className="space-y-3 mb-6">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.key;
            const Icon = plan.icon;
            return (
              <button
                key={plan.key}
                onClick={() => setSelectedPlan(plan.key)}
                disabled={isBusy}
                className={`w-full rounded-xl p-4 text-left transition-all relative ${
                  isSelected
                    ? "bg-slate-800 border-2 border-orange-500 ring-1 ring-orange-500/30"
                    : "bg-slate-800/60 border-2 border-slate-700 active:border-slate-600"
                } ${isBusy ? "opacity-60" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-orange-500 text-[9px] font-bold text-white">
                    {plan.badge}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-orange-500/20"
                        : "bg-slate-700/50"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={
                        isSelected ? "text-orange-400" : "text-slate-400"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold text-white">
                        {plan.price}
                      </span>
                      <span className="text-xs text-slate-400">
                        {plan.period}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {plan.label}
                      {plan.savings && (
                        <span className="text-orange-400/80 ml-2">
                          {plan.savings}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-orange-500 bg-orange-500"
                        : "border-slate-600"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Error Message */}
        {errorMsg && (
          <p className="text-xs text-red-400 text-center mb-3">{errorMsg}</p>
        )}

        {/* CTA */}
        <button
          onClick={handlePurchase}
          disabled={isBusy}
          className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-semibold text-base mb-2 active:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isPurchasing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </>
          ) : (
            `Get ${activePlan.label} — ${activePlan.price}`
          )}
        </button>
        <p className="text-[10px] text-slate-500 text-center mb-4">
          {selectedPlan === "lifetime"
            ? "One-time purchase. Secured by Google Play."
            : "Cancel anytime. Secured by Google Play."}
        </p>

        {/* Restore */}
        <button
          onClick={handleRestore}
          disabled={isBusy}
          className="w-full text-center text-xs text-slate-500 py-2 min-h-[48px] disabled:opacity-40 flex items-center justify-center gap-1"
        >
          {isRestoring ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Restoring...
            </>
          ) : (
            "Restore Purchase"
          )}
        </button>

        {/* Premium Lab Preview */}
        {premiumLabs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              What You'll Unlock
            </h3>
            <div className="space-y-2">
              {premiumLabs.map((lab) => {
                const tierColor =
                  lab.difficulty === "easy"
                    ? "bg-green-500/15 text-green-400"
                    : lab.difficulty === "moderate"
                    ? "bg-blue-500/15 text-blue-400"
                    : "bg-purple-500/15 text-purple-400";

                return (
                  <div
                    key={lab.id}
                    className="bg-slate-800 rounded-xl p-3 flex items-start gap-3"
                  >
                    <Lock
                      size={14}
                      className="text-slate-500 mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {lab.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tierColor}`}
                        >
                          {lab.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {lab.description.split(".")[0]}.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
