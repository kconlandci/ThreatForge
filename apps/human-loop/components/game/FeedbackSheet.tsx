"use client";

/**
 * Menu > Send feedback: a star rating and a short note, sent to /api/feedback (Airtable). No name
 * or email is asked for; the pathway and the screen go with the note so the team can find the spot.
 */
import { useId, useState } from "react";
import { Send, Star } from "lucide-react";
import { Sheet } from "@/components/battle/Sheet";
import { buttonClass } from "@/components/site/ui";

const MAX = 1000;
type Status = "idle" | "sending" | "sent" | "error";

export function FeedbackSheet({
  open,
  onClose,
  pathwayId,
  screen,
}: {
  open: boolean;
  onClose: () => void;
  pathwayId: string;
  screen: string;
}) {
  const titleId = useId();
  const noteId = useId();
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState("");

  const close = () => {
    onClose();
    if (status === "sent") {
      setRating(null);
      setMessage("");
      setStatus("idle");
    }
  };

  const send = async () => {
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, rating, pathway: pathwayId, screen }),
      });
      const data = (await res.json().catch(() => ({}))) as { stored?: boolean; error?: string };
      if (res.ok && data.stored) {
        setStatus("sent");
        return;
      }
      setErrorText(data.error ?? "We couldn't send it just now. Please try again later.");
      setStatus("error");
    } catch {
      setErrorText("You seem to be offline. Please try again later.");
      setStatus("error");
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      labelledBy={titleId}
      header={
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-teal">Help us improve</p>
          <h2 id={titleId} className="mt-0.5 font-display text-xl font-bold text-ink">
            Send feedback
          </h2>
        </div>
      }
    >
      {status === "sent" ? (
        <div className="py-2" role="status">
          <p className="font-display text-lg font-bold text-ink">Thank you!</p>
          <p className="mt-1 text-[16px] text-ink-soft">We read every note.</p>
          <button type="button" className={buttonClass("secondary", "md", "mt-5 w-full")} onClick={close}>
            Back to the game
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <fieldset>
            <legend className="font-display text-[16px] font-bold text-ink">How is it going?</legend>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={rating === n}
                  aria-label={`${n} of 5 stars`}
                  onClick={() => setRating(rating === n ? null : n)}
                  className="grid h-11 w-11 place-items-center rounded-xl border-2 border-ink bg-paper"
                >
                  <Star
                    className={`h-6 w-6 ${rating !== null && n <= rating ? "fill-orange text-ink" : "text-ink-soft"}`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <label htmlFor={noteId} className="mt-5 block font-display text-[16px] font-bold text-ink">
            What should we fix or add?
          </label>
          <textarea
            id={noteId}
            value={message}
            maxLength={MAX}
            rows={5}
            onChange={(e) => {
              setMessage(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            className="mt-2 w-full rounded-xl border-2 border-ink bg-paper p-3 text-[16px] leading-snug text-ink"
            placeholder="Something confusing, broken, or fun?"
          />
          <p className="mt-1 text-[14px] text-muted">
            Please don&rsquo;t include private information. We don&rsquo;t ask for your name.
          </p>

          <p aria-live="polite" className="mt-2 min-h-5 text-[15px] font-semibold text-ink">
            {status === "error" ? errorText : status === "sending" ? "Sending…" : ""}
          </p>

          <button
            type="submit"
            className={buttonClass("primary", "md", "mt-2 w-full")}
            aria-disabled={!message.trim() || status === "sending" || undefined}
          >
            <Send className="h-5 w-5" aria-hidden="true" />
            Send
          </button>
        </form>
      )}
    </Sheet>
  );
}
