import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { House, Play } from "lucide-react";
import { SiteFooter } from "@/components/site/Footer";
import { SiteHeader } from "@/components/site/Header";
import { buttonClass, container } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="relative flex-1">
        <div
          aria-hidden="true"
          className="hl-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_35%,black_10%,transparent_65%)]"
        />
        <div className={`${container} relative flex flex-col items-center py-12 text-center sm:py-20`}>
          <div aria-hidden="true" className="flex items-center justify-center">
            <span className="font-display text-[7.5rem] font-bold leading-none tracking-tighter text-teal-tint-2 sm:text-[11rem]">
              4
            </span>
            <Image
              src="/game/sprites/ollie-busted.svg"
              alt=""
              unoptimized
              priority
              width={220}
              height={220}
              className="hl-float -mx-3 h-36 w-36 sm:-mx-4 sm:h-52 sm:w-52"
            />
            <span className="font-display text-[7.5rem] font-bold leading-none tracking-tighter text-teal-tint-2 sm:text-[11rem]">
              4
            </span>
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Page not found</h1>
          <p className="mt-3 max-w-md text-lg leading-relaxed text-ink-soft">
            Ollie turned this page off and on again. It didn&rsquo;t come back on. Let&rsquo;s get you back on
            track.
          </p>
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/" className={buttonClass("secondary", "lg")}>
              <House className="h-5 w-5" aria-hidden="true" />
              Back to home
            </Link>
            <Link href="/play" className={buttonClass("primary", "lg")}>
              <Play className="h-5 w-5 fill-current" aria-hidden="true" />
              Play free
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
