// ============================================================
// ThreatForge — Progress Persistence Hook
// Reads/writes progress to localStorage + Capacitor Preferences backup.
// Android OS can clear localStorage under memory pressure, so
// critical data is mirrored to Preferences (native key-value store).
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { App as CapApp } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { getLocalDateString } from "../utils/localDate";

interface ScenarioResult {
  scenarioIndex: number;
  grade: "perfect" | "partial" | "wrong";
}

interface LabProgress {
  labId: string;
  completed: boolean;
  bestScore: number;
  attempts: number;
  lastAttemptDate: string;
  completedAt: number; // epoch ms
  scenarioResults: ScenarioResult[];
}

interface ThreatForgeProgress {
  schemaVersion: number;
  userId: string | null;
  labs: Record<string, LabProgress>;
  xp: number;
  xpHistory: Array<{ date: string; amount: number; labId: string }>;
  streakDays: number;
  longestStreak: number;
  lastLabDate: string | null;
  judgmentTags: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "threatforge_progress";
const PREFS_KEY = "threatforge_progress";
const CURRENT_SCHEMA_VERSION = 2;

function getToday(): string {
  return getLocalDateString();
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

function createDefaultProgress(): ThreatForgeProgress {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    userId: null,
    labs: {},
    xp: 0,
    xpHistory: [],
    streakDays: 0,
    longestStreak: 0,
    lastLabDate: null,
    judgmentTags: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validates parsed progress data has the expected shape.
 * Returns the data if valid, or null if corrupted beyond repair.
 */
function validateProgressShape(data: unknown): Record<string, unknown> | null {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;

  // Must have labs as an object
  if (obj.labs !== undefined && (typeof obj.labs !== "object" || obj.labs === null || Array.isArray(obj.labs))) {
    return null;
  }

  // xp must be a non-negative number if present
  if (obj.xp !== undefined && (typeof obj.xp !== "number" || obj.xp < 0 || !isFinite(obj.xp))) {
    obj.xp = 0;
  }

  // streakDays must be a non-negative number if present
  if (obj.streakDays !== undefined && (typeof obj.streakDays !== "number" || obj.streakDays < 0)) {
    obj.streakDays = 0;
  }

  // longestStreak must be a non-negative number if present
  if (obj.longestStreak !== undefined && (typeof obj.longestStreak !== "number" || obj.longestStreak < 0)) {
    obj.longestStreak = 0;
  }

  // Validate individual lab records
  if (obj.labs && typeof obj.labs === "object") {
    const labs = obj.labs as Record<string, unknown>;
    for (const labId of Object.keys(labs)) {
      const lab = labs[labId];
      if (lab === null || typeof lab !== "object" || Array.isArray(lab)) {
        delete labs[labId];
        continue;
      }
      const labRecord = lab as Record<string, unknown>;
      // bestScore must be a number
      if (typeof labRecord.bestScore !== "number" || !isFinite(labRecord.bestScore)) {
        labRecord.bestScore = 0;
      }
      // attempts must be a positive number
      if (typeof labRecord.attempts !== "number" || labRecord.attempts < 0) {
        labRecord.attempts = 1;
      }
    }
  }

  // xpHistory must be an array if present
  if (obj.xpHistory !== undefined && !Array.isArray(obj.xpHistory)) {
    obj.xpHistory = [];
  }

  return obj;
}

function migrateProgress(data: Record<string, unknown>): ThreatForgeProgress {
  const version = (data.schemaVersion as number) || 0;

  // Migration from v0 (no version field) to v1
  if (version < 1) {
    // Ensure all lab records have completedAt
    const labs = (data.labs || {}) as Record<string, Record<string, unknown>>;
    for (const labId of Object.keys(labs)) {
      if (labs[labId] && typeof labs[labId].completedAt !== "number") {
        labs[labId].completedAt = 0;
      }
    }
    data.schemaVersion = 1;
  }

  // Migration from v1 to v2: ensure userId field exists
  if (version < 2) {
    if (!data.userId) {
      data.userId = null; // Will be populated by AuthContext on next save
    }
    data.schemaVersion = 2;
  }

  return data as unknown as ThreatForgeProgress;
}

function loadProgress(): ThreatForgeProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const validated = validateProgressShape(parsed);
      if (!validated) {
        console.warn("[ThreatForge] Progress data failed validation — resetting.");
        return createDefaultProgress();
      }
      const migrated = migrateProgress(validated);
      // Save migrated version back if it changed
      if ((parsed.schemaVersion || 0) < CURRENT_SCHEMA_VERSION) {
        saveProgress(migrated);
      }
      return migrated;
    }
  } catch {
    // corrupted data — reset
  }
  return createDefaultProgress();
}

function saveProgress(progress: ThreatForgeProgress) {
  progress.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    // QuotaExceededError: localStorage is full (5-10 MiB limit in WebView)
    console.error("[ThreatForge] Failed to save progress:", error);
    // Attempt to save a minimal version (drop xpHistory if needed)
    try {
      const minimal = {
        ...progress,
        xpHistory: progress.xpHistory.slice(-50),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      console.error(
        "[ThreatForge] Even minimal save failed. Progress may be lost."
      );
    }
  }
}

/**
 * Mirror progress to Capacitor Preferences (survives localStorage clears).
 * This is fire-and-forget — errors are logged but don't block the UI.
 */
function mirrorToPreferences(progress: ThreatForgeProgress) {
  Preferences.set({
    key: PREFS_KEY,
    value: JSON.stringify(progress),
  }).catch((err) => {
    console.warn("[ThreatForge] Failed to mirror progress to Preferences:", err);
  });
}

/**
 * Attempt to recover progress from Capacitor Preferences
 * when localStorage is empty (e.g. after Android clears WebView storage).
 */
async function recoverFromPreferences(): Promise<ThreatForgeProgress | null> {
  try {
    const { value } = await Preferences.get({ key: PREFS_KEY });
    if (value) {
      const parsed = JSON.parse(value);
      const validated = validateProgressShape(parsed);
      if (validated) {
        const migrated = migrateProgress(validated);
        console.info("[ThreatForge] Recovered progress from Preferences backup.");
        return migrated;
      }
    }
  } catch {
    // Preferences unavailable or corrupted
  }
  return null;
}

export function useProgress(userId?: string | null) {
  const [progress, setProgress] = useState<ThreatForgeProgress>(loadProgress);
  const hasAttemptedRecovery = useRef(false);

  // On mount, check if localStorage was cleared and recover from Preferences
  useEffect(() => {
    if (hasAttemptedRecovery.current) return;
    hasAttemptedRecovery.current = true;

    const localData = localStorage.getItem(STORAGE_KEY);
    if (!localData) {
      // localStorage is empty — try Preferences backup
      recoverFromPreferences().then((recovered) => {
        if (recovered) {
          saveProgress(recovered);
          setProgress(recovered);
        }
      });
    }
  }, []);

  // Persist progress when app is backgrounded (Android can kill WebView)
  useEffect(() => {
    const listener = CapApp.addListener("pause", () => {
      // Re-read current state and save (ensures latest is persisted)
      const current = loadProgress();
      saveProgress(current);
      mirrorToPreferences(current);
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  const recordLabCompletion = useCallback(
    (labId: string, score: number, scenarioResults: ScenarioResult[]) => {
      setProgress((prev) => {
        const next = { ...prev, labs: { ...prev.labs } };
        const today = getToday();

        // Populate userId from auth if available and not yet set
        if (userId && !next.userId) {
          next.userId = userId;
        }

        // Update lab record
        const existing = next.labs[labId];
        next.labs[labId] = {
          labId,
          completed: true,
          bestScore: existing ? Math.max(existing.bestScore, score) : score,
          attempts: existing ? existing.attempts + 1 : 1,
          lastAttemptDate: today,
          completedAt: Date.now(),
          scenarioResults,
        };

        // XP: base 100 + score bonus (max 50)
        const xpGain = 100 + Math.min(Math.round(score / 2), 50);
        next.xp = (next.xp || 0) + xpGain;
        next.xpHistory = [
          ...(next.xpHistory || []),
          { date: today, amount: xpGain, labId },
        ];

        // Streak logic
        if (next.lastLabDate === today) {
          // Already counted today — no streak change
        } else if (next.lastLabDate === getYesterday()) {
          next.streakDays = (next.streakDays || 0) + 1;
        } else {
          next.streakDays = 1;
        }
        next.lastLabDate = today;
        next.longestStreak = Math.max(
          next.longestStreak || 0,
          next.streakDays || 0
        );

        saveProgress(next);
        mirrorToPreferences(next);
        return next;
      });
    },
    [userId]
  );

  const getLabProgress = useCallback(
    (labId: string): LabProgress | undefined => {
      return progress.labs[labId];
    },
    [progress]
  );

  const isLabCompleted = useCallback(
    (labId: string): boolean => {
      return progress.labs[labId]?.completed ?? false;
    },
    [progress]
  );

  const getTotalCompleted = useCallback((): number => {
    return Object.values(progress.labs).filter((l) => l.completed).length;
  }, [progress]);

  const resetProgress = useCallback(() => {
    const fresh = createDefaultProgress();
    saveProgress(fresh);
    mirrorToPreferences(fresh);
    setProgress(fresh);
  }, []);

  return {
    progress,
    recordLabCompletion,
    getLabProgress,
    isLabCompleted,
    getTotalCompleted,
    resetProgress,
  };
}

export type { ThreatForgeProgress, LabProgress, ScenarioResult };
