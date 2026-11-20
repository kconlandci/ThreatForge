"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { buttonClass } from "@/components/site/ui";
import { SITE_URL } from "@/lib/site/address";

/**
 * "Share": the phone's share sheet with a short line and the pathway's link, or a copied link where
 * sharing isn't available. The text never holds a name or any other personal detail.
 */
export function ShareButton({ text, path, className = "" }: { text: string; path: string; className?: string }) {
  const [note, setNote] = useState("");
  const share = async () => {
    const url = `${SITE_URL}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Human Loop", text, url });
        return;
      } catch (e) {
        // Closed the share sheet; any other error falls back to copying the link.
        if ((e as { name?: string })?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setNote("Link copied.");
    } catch {
      setNote(url);
    }
  };
  return (
    <>
      <button type="button" className={buttonClass("secondary", "lg", className)} onClick={() => void share()} data-share="">
        <Share2 className="h-5 w-5" aria-hidden="true" />
        Share
      </button>
      <p aria-live="polite" className="min-h-0 text-center text-[14px] font-semibold text-ink empty:hidden">
        {note}
      </p>
    </>
  );
}
