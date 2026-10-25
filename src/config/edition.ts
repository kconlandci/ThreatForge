/** Build-time edition policy. An unset edition keeps the consumer app unchanged. */
import dciLogo from "../assets/dci-logo.png";

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

export const browserTitle = edition === "dci"
  ? "Cybersecurity Judgment Labs | DCI Resources"
  : "ThreatForge: Cybersecurity Decision Simulator";

// The official logo is copied unchanged; only its display size varies by slot.
const logo = {
  src: edition === "dci" ? dciLogo : "/icon-512.png",
  alt: edition === "dci" ? "DCI Resources LLC" : displayName,
};
export const editionBranding = {
  signInLogo: edition === "dci"
    ? { ...logo, className: "w-48 h-auto object-contain mb-6" }
    : null,
  headerLogo: {
    ...logo,
    className: edition === "dci"
      ? "w-24 h-auto shrink-0 object-contain"
      : "w-10 h-10 rounded-xl",
  },
  settingsLogo: {
    ...logo,
    className: edition === "dci"
      ? "w-40 h-auto object-contain mx-auto mb-3"
      : "w-14 h-14 rounded-2xl mx-auto mb-3",
  },
  onboardingLogo: {
    ...logo,
    className: edition === "dci"
      ? "w-44 h-auto object-contain"
      : "w-20 h-20 rounded-2xl",
  },
  devLogo: edition === "dci"
    ? { ...logo, className: "w-24 h-auto object-contain mb-3" }
    : null,
};

export const paywallEnabled = edition === "consumer";
export const billingEnabled = edition === "consumer";
export const syncTarget = edition === "dci" ? "dci" : "firestore";
