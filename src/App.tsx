import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import HomeScreen from "./screens/HomeScreen";
import LabScreen from "./screens/LabScreen";
import ProgressScreen from "./screens/ProgressScreen";
import SettingsScreen from "./screens/SettingsScreen";
import BottomNav from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";
import { privacyPolicy, termsOfService, disclaimer } from "./data/legal";
import { useAndroidBackButton } from "./hooks/useAndroidBackButton";
import { IS_DEV } from "./config";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { REVENUECAT_API_KEY } from "./config/revenuecat";
import { trackAppOpened, trackSessionEnd, trackAppResumed } from "./hooks/useAnalytics";

// Lazy-loaded screens (not in initial bundle)
const DevScreen = lazy(() => import("./screens/DevScreen"));
const UpgradeScreen = lazy(() => import("./screens/UpgradeScreen"));
const AnalyticsScreen = lazy(() => import("./screens/AnalyticsScreen"));
const LegalTextViewer = lazy(() => import("./components/LegalTextViewer"));

function LazyFallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppLayout() {
  const location = useLocation();
  useAndroidBackButton();

  const hideNav =
    location.pathname.startsWith("/lab/") ||
    location.pathname.startsWith("/settings/") ||
    location.pathname === "/upgrade";

  return (
    <AuthGate>
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/lab/:labId" element={<LabScreen />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route
            path="/settings/privacy"
            element={
              <LegalTextViewer title="Privacy Policy" content={privacyPolicy} />
            }
          />
          <Route
            path="/settings/terms"
            element={
              <LegalTextViewer title="Terms of Service" content={termsOfService} />
            }
          />
          <Route
            path="/settings/disclaimer"
            element={
              <LegalTextViewer title="Disclaimer" content={disclaimer} />
            }
          />
          <Route path="/upgrade" element={<UpgradeScreen />} />
          <Route path="/settings/analytics" element={<AnalyticsScreen />} />
          {IS_DEV && <Route path="/dev" element={<DevScreen />} />}
          <Route path="*" element={<HomeScreen />} />
        </Routes>
      </Suspense>
      {!hideNav && <BottomNav />}
    </AuthGate>
  );
}

export default function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY }).catch((err) =>
        console.error("[ThreatForge] RevenueCat init failed:", err)
      );
    }
  }, []);

  // Analytics: track app open and session duration
  useEffect(() => {
    trackAppOpened();
    const pauseListener = CapApp.addListener("pause", () => {
      trackSessionEnd();
    });
    const resumeListener = CapApp.addListener("resume", () => {
      trackAppResumed();
    });
    // Also track on browser unload (web dev)
    const handleUnload = () => trackSessionEnd();
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      pauseListener.then((l) => l.remove());
      resumeListener.then((l) => l.remove());
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
