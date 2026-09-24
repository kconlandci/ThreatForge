/**
 * DCI's privacy contact (the /privacy notice links to it). Set NEXT_PUBLIC_PRIVACY_EMAIL in the
 * Vercel project before a public launch (see README, "Owner setup"). It is read at build time.
 */
export const PRIVACY_EMAIL: string | null = (() => {
  const v = process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim();
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
})();
