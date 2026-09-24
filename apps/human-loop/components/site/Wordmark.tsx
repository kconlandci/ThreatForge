/**
 * "Human Loop" wordmark: a teal loop with an orange dot riding it (the human in the loop),
 * set next to the name in Lexend. Decorative mark; the text carries the name.
 */
export function LoopMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <path
        d="M31.47 11.97A14 14 0 1 1 21.22 6.05"
        fill="none"
        stroke="var(--hl-teal)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <circle cx="27" cy="7.9" r="5" fill="var(--hl-orange)" stroke="var(--hl-ink)" strokeWidth="2" />
    </svg>
  );
}

export function Wordmark({
  size = "md",
  className = "",
  textClassName = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** e.g. hide the words visually on very narrow screens ("max-[359px]:sr-only"). */
  textClassName?: string;
}) {
  const text = { sm: "text-base sm:text-lg", md: "text-2xl", lg: "text-3xl sm:text-4xl" }[size];
  const mark = { sm: "h-[22px] w-[22px] sm:h-6 sm:w-6", md: "h-8 w-8", lg: "h-10 w-10 sm:h-12 sm:w-12" }[size];
  return (
    <span className={`inline-flex items-center gap-1.5 font-display sm:gap-2 font-bold tracking-tight text-ink ${text} ${className}`}>
      <LoopMark className={`${mark} shrink-0`} />
      <span className={textClassName}>
        Human <span className="text-teal">Loop</span>
      </span>
    </span>
  );
}
