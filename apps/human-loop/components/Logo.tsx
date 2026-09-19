export function LoopMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="The Human Loop icon"
    >
      <path
        d="M24 6C13.5 6 5 13.6 5 23s8.5 17 19 17"
        stroke="var(--loop-green)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M35 33l4 7-8-1"
        stroke="var(--loop-green)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M24 42c10.5 0 19-7.6 19-17S34.5 8 24 8"
        stroke="var(--loop-violet)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M13 15l-4-7 8 1"
        stroke="var(--loop-violet)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="24" cy="24" r="5.5" fill="var(--loop-text)" />
    </svg>
  );
}

export function Wordmark({
  size = "md",
  showDci = true,
}: {
  size?: "sm" | "md" | "lg";
  showDci?: boolean;
}) {
  const textSize =
    size === "lg" ? "text-3xl md:text-4xl" : size === "sm" ? "text-lg" : "text-2xl";
  const iconSize = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <div className="flex items-center gap-3">
      <LoopMark className={iconSize} />
      <div className="flex flex-col leading-none">
        <span className={`font-display font-semibold tracking-tight ${textSize}`}>
          The Human Loop
        </span>
        {showDci && (
          <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-loop-text-muted">
            DCI · The Learning Academy
          </span>
        )}
      </div>
    </div>
  );
}
