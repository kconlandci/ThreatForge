// ============================================================
// ThreatForge — Purchase Hook
// Handles purchasing any product via RevenueCat
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { Purchases, type PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { ENTITLEMENT_ID } from "../config/revenuecat";
import { setPremiumStatus } from "./usePremiumStatus";

export type PurchaseError =
  | "cancelled"
  | "already_owned"
  | "not_found"
  | "network"
  | "unknown";

interface PurchaseResult {
  success: boolean;
  error?: PurchaseError;
}

interface UsePurchase {
  /** Packages from the current RevenueCat offering, keyed by underlying store product identifier. */
  packages: Record<string, PurchasesPackage> | null;
  /** True if the initial getOfferings() call failed (e.g. offline, misconfigured offering). */
  offeringsError: boolean;
  purchase: (productId: string) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  isPurchasing: boolean;
  isRestoring: boolean;
}

async function fetchPackagesByProductId(): Promise<
  Record<string, PurchasesPackage>
> {
  const offerings = await Purchases.getOfferings();
  const available = offerings.current?.availablePackages ?? [];
  const byProductId: Record<string, PurchasesPackage> = {};
  for (const pkg of available) {
    byProductId[pkg.product.identifier] = pkg;
  }
  return byProductId;
}

export function usePurchase(): UsePurchase {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [packages, setPackages] = useState<Record<
    string,
    PurchasesPackage
  > | null>(null);
  const [offeringsError, setOfferingsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPackagesByProductId()
      .then((byProductId) => {
        if (!cancelled) setPackages(byProductId);
      })
      .catch((err) => {
        console.error("[ThreatForge] Failed to load offerings:", err);
        if (!cancelled) setOfferingsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const purchase = useCallback(
    async (productId: string): Promise<PurchaseResult> => {
      setIsPurchasing(true);
      try {
        // Use the cached offering if we have it; otherwise fetch fresh
        // (e.g. the user tapped buy before the initial load finished).
        let pkg = packages?.[productId];
        if (!pkg) {
          const fresh = await fetchPackagesByProductId();
          setPackages(fresh);
          pkg = fresh[productId];
        }

        if (!pkg) {
          console.error(
            `[ThreatForge] No package found for product "${productId}" in current offering.`
          );
          return { success: false, error: "not_found" };
        }

        const { customerInfo } = await Purchases.purchasePackage({
          aPackage: pkg,
        });

        const isPremium =
          customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

        if (isPremium) {
          await setPremiumStatus(true);
          return { success: true };
        }

        // Purchase went through but entitlement not active — shouldn't happen
        return { success: false, error: "unknown" };
      } catch (err: unknown) {
        // Safely check error properties — err could be null, a primitive, or an object
        if (err != null && typeof err === "object") {
          const error = err as Record<string, unknown>;

          if (error.userCancelled === true || error.code === "1") {
            return { success: false, error: "cancelled" };
          }
          if (error.code === "7") {
            // ITEM_ALREADY_OWNED — grant access
            await setPremiumStatus(true);
            return { success: true, error: "already_owned" };
          }
        }

        console.error("[ThreatForge] Purchase failed:", err);
        return { success: false, error: "network" };
      } finally {
        setIsPurchasing(false);
      }
    },
    [packages]
  );

  const restore = useCallback(async (): Promise<PurchaseResult> => {
    setIsRestoring(true);
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const isPremium =
        customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      if (isPremium) {
        await setPremiumStatus(true);
        return { success: true };
      }

      // No active entitlement — clear local premium cache (handles refunds)
      await setPremiumStatus(false);
      return { success: false, error: "unknown" };
    } catch (err) {
      console.error("[ThreatForge] Restore failed:", err);
      return { success: false, error: "network" };
    } finally {
      setIsRestoring(false);
    }
  }, []);

  return { packages, offeringsError, purchase, restore, isPurchasing, isRestoring };
}
