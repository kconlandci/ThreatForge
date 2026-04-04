// ============================================================
// ThreatForge — Purchase Hook
// Handles purchasing any product via RevenueCat
// ============================================================

import { useState, useCallback } from "react";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { ENTITLEMENT_ID } from "../config/revenuecat";
import { setPremiumStatus } from "./usePremiumStatus";

export type PurchaseError =
  | "cancelled"
  | "already_owned"
  | "network"
  | "unknown";

interface PurchaseResult {
  success: boolean;
  error?: PurchaseError;
}

interface UsePurchase {
  purchase: (productId: string, isSubscription?: boolean) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  isPurchasing: boolean;
  isRestoring: boolean;
}

export function usePurchase(): UsePurchase {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const purchase = useCallback(
    async (productId: string): Promise<PurchaseResult> => {
      setIsPurchasing(true);
      try {
        const { customerInfo } = await Purchases.purchaseStoreProduct({
          product: {
            identifier: productId,
            // Other fields are populated by the SDK at runtime
          } as never,
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
        const error = err as { code?: string; userCancelled?: boolean };

        if (error.userCancelled || error.code === "1") {
          return { success: false, error: "cancelled" };
        }
        if (error.code === "7") {
          // ITEM_ALREADY_OWNED — grant access
          await setPremiumStatus(true);
          return { success: true, error: "already_owned" };
        }

        console.error("[ThreatForge] Purchase failed:", err);
        return { success: false, error: "network" };
      } finally {
        setIsPurchasing(false);
      }
    },
    []
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

      return { success: false, error: "unknown" };
    } catch (err) {
      console.error("[ThreatForge] Restore failed:", err);
      return { success: false, error: "network" };
    } finally {
      setIsRestoring(false);
    }
  }, []);

  return { purchase, restore, isPurchasing, isRestoring };
}
