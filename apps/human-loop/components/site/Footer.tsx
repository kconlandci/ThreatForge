import Link from "next/link";
import { DciLogo } from "./Logo";
import { LoopMark } from "./Wordmark";
import { container } from "./ui";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-line bg-paper-soft">
      <div className={`${container} flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-4">
          <DciLogo decorative className="h-10 w-auto" />
          <p className="max-w-sm text-[15px] leading-snug text-ink-soft">
            <span className="inline-flex items-center gap-1.5 font-display font-semibold text-ink">
              <LoopMark className="h-4 w-4" />
              Human Loop
            </span>{" "}
            is a training game by DCI Resources.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-orange"
          >
            Privacy notice
          </Link>
          <Link
            href="/play"
            className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-orange"
          >
            Play
          </Link>
          <p className="text-muted">© {year} DCI Resources</p>
        </nav>
      </div>
    </footer>
  );
}
