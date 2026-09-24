import Link from "next/link";
import { Play } from "lucide-react";
import { DciLogo } from "./Logo";
import { Wordmark } from "./Wordmark";
import { buttonClass, container } from "./ui";

/** Skip link + site header. Put it first in every page, before <main id="main">. */
export function SiteHeader({ showPlay = true }: { showPlay?: boolean }) {
  return (
    <>
      <a href="#main" className="hl-skip-link">
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper">
        <div className={`${container} flex h-16 items-center justify-between gap-3 sm:h-[72px]`}>
          <Link
            href="/"
            className="-mx-1 flex min-h-11 items-center gap-2.5 rounded-lg px-1 sm:gap-3"
          >
            <DciLogo priority className="h-8 w-auto shrink-0 sm:h-10" />
            <span aria-hidden="true" className="h-7 w-px bg-line sm:h-8" />
            <Wordmark size="sm" className="whitespace-nowrap" textClassName="max-[359px]:sr-only" />
          </Link>
          {showPlay ? (
            <Link
              href="/play"
              aria-label="Play free"
              className={buttonClass("primary", "md", "min-h-11 whitespace-nowrap px-3.5 text-[15px] max-[389px]:px-3 sm:px-5")}
            >
              <Play aria-hidden="true" className="h-4 w-4 fill-current" />
              {/* Narrow phones: "Play" alone, so the wordmark keeps its room. */}
              Play<span className="max-[389px]:hidden"> free</span>
            </Link>
          ) : null}
        </div>
      </header>
    </>
  );
}
