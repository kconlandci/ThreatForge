/**
 * Shared class strings for the site shell. "Game buttons": ink outline + a hard ink shadow that
 * presses down on click, so the site feels like the game's UI rather than a template.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink font-display font-semibold " +
  "select-none transition-[transform,box-shadow,background-color] duration-150 ease-out " +
  "shadow-[0_4px_0_0_var(--hl-ink)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_var(--hl-ink)] " +
  "active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)] " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_0_var(--hl-ink)] " +
  "aria-disabled:cursor-not-allowed";

const sizes = {
  md: { h: "min-h-12", px: "px-5", text: "text-base" },
  lg: { h: "min-h-[52px]", px: "px-6", text: "text-lg" },
} as const;

const tones = {
  /** Orange fill always carries ink text. */
  primary: "bg-orange text-ink",
  secondary: "bg-paper text-ink hover:bg-paper-soft",
  teal: "bg-teal text-paper",
} as const;

/** `extra` may override the size's min-height, padding or font size (the size default is then dropped). */
export function buttonClass(tone: keyof typeof tones = "primary", size: keyof typeof sizes = "md", extra = "") {
  const s = sizes[size];
  const has = (re: RegExp) => extra.split(/\s+/).some((t) => re.test(t));
  const parts = [
    base,
    has(/^min-h-/) ? "" : s.h,
    has(/^px-/) ? "" : s.px,
    has(/^text-(xs|sm|base|lg|xl|\[)/) ? "" : s.text,
    tones[tone],
    extra,
  ];
  return parts.filter(Boolean).join(" ");
}

/** Page-width container with the 16px phone gutter. */
export const container = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

/** Small uppercase label used above section headings. */
export const eyebrow =
  "font-display text-xs font-semibold uppercase tracking-[0.14em] text-teal";

/** Text link style with a visible underline. */
export const textLink =
  "font-semibold text-teal underline decoration-2 underline-offset-4 hover:text-teal-dark hover:decoration-orange";
