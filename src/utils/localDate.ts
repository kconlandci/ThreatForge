/**
 * Returns the current local date as YYYY-MM-DD string.
 * Unlike toISOString().slice(0,10), this respects the user's timezone.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
