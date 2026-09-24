import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/Footer";
import { SiteHeader } from "@/components/site/Header";
import { PlayClient } from "@/components/site/PlayClient";
import { container } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Play",
  description: "Sign up or play as a guest, then pick your pathway. Help Desk is live now.",
};

/** /play: sign-up (or guest) and the pathway picker. The interactive part is a client component. */
export default function PlayPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader showPlay={false} />
      <main id="main" className="relative flex-1">
        <div
          aria-hidden="true"
          className="hl-dots pointer-events-none absolute inset-x-0 top-0 h-[28rem] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <div className={`${container} relative py-8 sm:py-12`}>
          <PlayClient />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
