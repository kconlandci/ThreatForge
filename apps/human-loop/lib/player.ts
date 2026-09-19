"use client";

import type { PathwayRunResult, PlayerProfile } from "./types";

const PROFILE_KEY = "human-loop:profile";
const RUNS_KEY = "human-loop:runs";

export function getProfile(): PlayerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as PlayerProfile) : null;
  } catch {
    return null;
  }
}

export function setProfile(profile: PlayerProfile) {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore — private browsing / storage disabled
  }
}

export function getRuns(): PathwayRunResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RUNS_KEY);
    return raw ? (JSON.parse(raw) as PathwayRunResult[]) : [];
  } catch {
    return [];
  }
}

export function saveRun(run: PathwayRunResult) {
  try {
    const runs = getRuns().filter((r) => r.pathwayId !== run.pathwayId);
    runs.push(run);
    window.localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  } catch {
    // ignore
  }
}
