"use client";

/**
 * Error boundary for every page. A damaged saved game (or any bug) lands here instead of a blank
 * "Application error" screen, with a way out: try again, or reset the save on this device.
 */
import Image from "next/image";
import { useEffect } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/site/ui";
import { resetSavedGameAndReload } from "@/lib/client/resetStorage";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[human-loop] page error", error.digest ?? error.message);
  }, [error]);

  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-paper px-4 py-10 text-center">
      <div className="max-w-md">
        <Image
          src="/game/sprites/resetbot-busted.svg"
          alt=""
          unoptimized
          width={220}
          height={220}
          className="mx-auto h-32 w-32"
        />
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink">Something broke</h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          ResetBot swears it didn&rsquo;t touch anything. Try again. If it keeps happening, reset the saved game on
          this device.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className={buttonClass("primary", "lg")}>
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            Try again
          </button>
          <button type="button" onClick={resetSavedGameAndReload} className={buttonClass("secondary", "lg")}>
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            Reset saved game
          </button>
        </div>
      </div>
    </main>
  );
}
