/** Build-time edition policy. An unset edition keeps the consumer app unchanged. */
export const edition = import.meta.env.VITE_EDITION === "dci" ? "dci" : "consumer";

export const displayName =
  edition === "dci" ? "Cybersecurity Judgment Labs" : "ThreatForge";
export const subline =
  edition === "dci"
    ? "DCI Resources — Student Edition"
    : "Cybersecurity Decision Simulator";
// The existing Settings screen has a different consumer subline.
export const settingsSubline =
  edition === "dci" ? subline : "Cyber Judgment Training";
export const supportEmail =
  edition === "dci" ? "conlan.dci@gmail.com" : "threatforge.app@gmail.com";

export const paywallEnabled = edition === "consumer";
export const billingEnabled = edition === "consumer";
export const syncTarget = edition === "dci" ? "dci" : "firestore";
