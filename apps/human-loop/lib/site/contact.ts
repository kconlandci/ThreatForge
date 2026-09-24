/**
 * DCI's privacy contact (the /privacy notice links to it). Override it with
 * NEXT_PUBLIC_PRIVACY_EMAIL in the Vercel project (read at build time, so redeploy after changing it).
 */
const DEFAULT_PRIVACY_EMAIL = "privacy@dciresourcesllc.com";

export const PRIVACY_EMAIL: string = (() => {
  const v = process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim();
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : DEFAULT_PRIVACY_EMAIL;
})();
