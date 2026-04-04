// ============================================================
// ThreatForge — In-App Review Hook
// Triggers native Android review dialog after 3rd lab completion.
// Only prompts once; safe no-op on web.
// ============================================================

import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { InAppReview } from "@capacitor-community/in-app-review";

const REVIEW_PROMPTED_KEY = "threatforge_review_prompted";
const LABS_BEFORE_REVIEW = 3;

/**
 * Returns a function that should be called after each lab completion.
 * Pass the total number of completed labs (post-recording).
 * On the 3rd completion, it fires the native in-app review dialog once.
 */
export function useAppReview() {
  const maybeRequestReview = useCallback(async (totalCompleted: number) => {
    // Only trigger on the exact threshold
    if (totalCompleted < LABS_BEFORE_REVIEW) return;

    // Already prompted — never ask again
    if (localStorage.getItem(REVIEW_PROMPTED_KEY)) return;

    // Mark as prompted immediately (even if the dialog fails to show)
    localStorage.setItem(REVIEW_PROMPTED_KEY, "1");

    // Native only — skip silently on web
    if (!Capacitor.isNativePlatform()) return;

    try {
      await InAppReview.requestReview();
    } catch (e) {
      // Google may silently suppress the dialog (quota, already reviewed, etc.)
      console.warn("[ThreatForge] In-app review request failed:", e);
    }
  }, []);

  return { maybeRequestReview };
}
