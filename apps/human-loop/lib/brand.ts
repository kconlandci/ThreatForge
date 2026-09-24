/**
 * DCI brand palette. Teal is sampled from the official DCI Resources logo.
 * Orange fills carry INK text (white on orange fails contrast); use ORANGE_TEXT
 * when orange is the text color on white.
 */
export const BRAND = {
  teal: "#0F6A61",
  tealDark: "#0A4C45",
  tealTint: "#E7F1EF",
  tealTint2: "#D3E6E2",
  ink: "#111418",
  inkSoft: "#3A4149",
  muted: "#5F6B76",
  line: "#E3E7EA",
  paper: "#FFFFFF",
  paperSoft: "#F6F8F9",
  orange: "#F26B1D",
  orangeText: "#C2410C",
  orangeTint: "#FFF1E8",
  danger: "#B42318",
} as const;

/** Same palette as 0xRRGGBB numbers for Phaser. */
export const BRAND_HEX = Object.fromEntries(
  Object.entries(BRAND).map(([k, v]) => [k, parseInt(v.slice(1), 16)]),
) as Record<keyof typeof BRAND, number>;
