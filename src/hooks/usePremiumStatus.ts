// ============================================================
// ThreatForge — Premium Status Hook
// Phase 2: RevenueCat as source of truth, Preferences cache fallback
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { Preferences } from "@capacitor/preferences";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { ENTITLEMENT_ID } from "../config/revenuecat";

const PREMIUM_KEY = "threatforge_is_premium";
const PREMIUM_CACHE_TIME_KEY = "threatforge_premium_cache_time";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7-day offline grace period

interface PremiumStatus {
  isPremium: boolean;
  isLoading: boolean;
  refreshPremiumStatus: () => Promise<void>;
}

async function checkRevenueCat(): Promise<boolean | null> {
  try {
    const { isConfigured } = await Purchases.isConfigured();
    if (!isConfigured) return null; // SDK not ready yet
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return null; // RevenueCat unreachable
  }
}

async function readCache(): Promise<boolean> {
  try {
    const { value: premiumValue } = await Preferences.get({
      key: PREMIUM_KEY,
    });
    const { value: cacheTimeValue } = await Preferences.get({
      key: PREMIUM_CACHE_TIME_KEY,
    });

    if (premiumValue !== "true") return false;

    const cacheTime = cacheTimeValue ? parseInt(cacheTimeValue, 10) : 0;
    const isExpired = Date.now() - cacheTime > CACHE_TTL_MS;

    if (isExpired) {
      console.warn(
        "[ThreatForge] Premium cache expired — treating as non-premium until verified."
      );
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function usePremiumStatus(): PremiumStatus {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkPremiumStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try RevenueCat first (source of truth)
      const rcResult = await checkRevenueCat();

      if (rcResult !== null) {
        // RevenueCat responded — update cache and state
        setIsPremium(rcResult);
        await setPremiumStatus(rcResult);
        return;
      }

      // RevenueCat unreachable — fall back to cache
      console.warn(
        "[ThreatForge] RevenueCat unreachable, falling back to cache."
      );
      const cached = await readCache();
      setIsPremium(cached);
    } catch (error) {
      console.error("[ThreatForge] Failed to check premium status:", error);
      const cached = await readCache();
      setIsPremium(cached);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  return { isPremium, isLoading, refreshPremiumStatus: checkPremiumStatus };
}

/** Write premium status to local cache */
export async function setPremiumStatus(isPremium: boolean): Promise<void> {
  await Preferences.set({
    key: PREMIUM_KEY,
    value: isPremium ? "true" : "false",
  });
  await Preferences.set({
    key: PREMIUM_CACHE_TIME_KEY,
    value: Date.now().toString(),
  });
}
