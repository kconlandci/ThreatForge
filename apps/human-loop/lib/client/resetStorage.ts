"use client";

/** Last resort from an error screen: drop the saved game on this device and reload. */
export function resetSavedGameAndReload() {
  try {
    window.localStorage.removeItem("human-loop:save:v2");
  } catch {
    // Storage blocked: reloading is all we can do.
  }
  window.location.assign("/play");
}
