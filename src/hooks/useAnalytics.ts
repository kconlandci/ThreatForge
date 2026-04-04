// ============================================================
// ThreatForge — Lightweight Analytics Hook
// Tracks user events in localStorage for local usage insights.
// ============================================================

import { getLocalDateString } from "../utils/localDate";

const ANALYTICS_KEY = "threatforge_analytics";

// --- Event Types ---

interface LabStartedEvent {
  type: "lab_started";
  labId: string;
  timestamp: number;
}

interface LabCompletedEvent {
  type: "lab_completed";
  labId: string;
  score: number;
  duration_seconds: number;
  timestamp: number;
}

interface HintUsedEvent {
  type: "hint_used";
  labId: string;
  scenarioIndex: number;
  timestamp: number;
}

interface PathStartedEvent {
  type: "path_started";
  pathId: string;
  timestamp: number;
}

interface AppOpenedEvent {
  type: "app_opened";
  timestamp: number;
}

interface SessionEndEvent {
  type: "session_end";
  duration_seconds: number;
  timestamp: number;
}

type AnalyticsEvent =
  | LabStartedEvent
  | LabCompletedEvent
  | HintUsedEvent
  | PathStartedEvent
  | AppOpenedEvent
  | SessionEndEvent;

// --- Storage ---

function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("[ThreatForge Analytics] Corrupted data (non-array) — resetting.");
      localStorage.removeItem(ANALYTICS_KEY);
      return [];
    }
    return parsed;
  } catch {
    localStorage.removeItem(ANALYTICS_KEY);
    return [];
  }
}

function pushEvent(event: AnalyticsEvent) {
  try {
    const events = loadEvents();
    events.push(event);
    // Cap at 5000 events to avoid localStorage bloat
    const trimmed = events.length > 5000 ? events.slice(-5000) : events;
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error("[ThreatForge Analytics] Failed to save event:", err);
  }
}

// --- Public API ---

let sessionStartTime: number | null = null;

export function trackAppOpened() {
  sessionStartTime = Date.now();
  pushEvent({ type: "app_opened", timestamp: Date.now() });
}

export function trackSessionEnd() {
  if (sessionStartTime) {
    const duration = Math.round((Date.now() - sessionStartTime) / 1000);
    pushEvent({ type: "session_end", duration_seconds: duration, timestamp: Date.now() });
    sessionStartTime = null;
  }
}

export function trackLabStarted(labId: string) {
  pushEvent({ type: "lab_started", labId, timestamp: Date.now() });
}

export function trackLabCompleted(labId: string, score: number, durationSeconds: number) {
  pushEvent({
    type: "lab_completed",
    labId,
    score,
    duration_seconds: durationSeconds,
    timestamp: Date.now(),
  });
}

export function trackHintUsed(labId: string, scenarioIndex: number) {
  pushEvent({ type: "hint_used", labId, scenarioIndex, timestamp: Date.now() });
}

export function trackPathStarted(pathId: string) {
  pushEvent({ type: "path_started", pathId, timestamp: Date.now() });
}

// --- Aggregation helpers (for AnalyticsScreen) ---

export interface AnalyticsSummary {
  totalSessions: number;
  avgSessionSeconds: number;
  labsStarted: number;
  labsCompleted: number;
  completionRate: number;
  avgScore: number;
  topLabs: Array<{ labId: string; count: number }>;
  labsPerDay: Array<{ date: string; count: number }>;
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const events = loadEvents();

  // Sessions
  const sessionEvents = events.filter((e) => e.type === "session_end") as SessionEndEvent[];
  const appOpenedCount = events.filter((e) => e.type === "app_opened").length;
  const totalSessions = Math.max(appOpenedCount, sessionEvents.length);
  const avgSessionSeconds =
    sessionEvents.length > 0
      ? Math.round(sessionEvents.reduce((s, e) => s + e.duration_seconds, 0) / sessionEvents.length)
      : 0;

  // Labs
  const started = events.filter((e) => e.type === "lab_started") as LabStartedEvent[];
  const completed = events.filter((e) => e.type === "lab_completed") as LabCompletedEvent[];
  const labsStarted = started.length;
  const labsCompleted = completed.length;
  const completionRate = labsStarted > 0 ? Math.round((labsCompleted / labsStarted) * 100) : 0;
  const avgScore =
    completed.length > 0
      ? Math.round(completed.reduce((s, e) => s + e.score, 0) / completed.length)
      : 0;

  // Top labs
  const labCounts: Record<string, number> = {};
  for (const e of completed) {
    labCounts[e.labId] = (labCounts[e.labId] || 0) + 1;
  }
  const topLabs = Object.entries(labCounts)
    .map(([labId, count]) => ({ labId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Labs per day (last 14 days)
  const now = new Date();
  const days: Array<{ date: string; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const count = completed.filter((e) => {
      const eDate = getLocalDateString(new Date(e.timestamp));
      return eDate === dateStr;
    }).length;
    days.push({ date: dateStr, count });
  }

  return {
    totalSessions,
    avgSessionSeconds,
    labsStarted,
    labsCompleted,
    completionRate,
    avgScore,
    topLabs,
    labsPerDay: days,
  };
}

export function clearAnalytics() {
  localStorage.removeItem(ANALYTICS_KEY);
}
