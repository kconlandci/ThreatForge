// Server-only configuration. Credentials belong in the ignored .env.local.
export const AIRTABLE_BASE_ID = "appspi3IDg1WzOECA";
export const TABLES = Object.freeze({
  students: "tblAhHfBLMV0lfaEP",
  units: "tble5Ke2MTWdS8VyR",
  progress: "tblzcw3zC53G1tHv6",
});

// Set the single production app origin during the later deployment step.
export const PRODUCTION_ORIGIN = null;
export const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

export function isAllowedOrigin(origin) {
  if (origin === PRODUCTION_ORIGIN && PRODUCTION_ORIGIN !== null) return true;
  try {
    const url = new URL(origin);
    return url.origin === origin && (
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) ||
      origin === "https://localhost"
    );
  } catch {
    return false;
  }
}
