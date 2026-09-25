"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronRight, X, type LucideIcon } from "lucide-react";
import { SpeakerFace, speakerName, type Speaker } from "@/components/battle/SpeakerFace";
import { usePathway } from "@/lib/pathways/context";
import h from "./hub.module.css";

const CHARS_PER_SEC = 55;

/** Reveals text a few characters at a time. Tap (or reduced motion) shows it all at once. */
export function useTypewriter(text: string, instant: boolean) {
  const [count, setCount] = useState(instant ? text.length : 0);
  useEffect(() => {
    if (instant) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const n = Math.min(text.length, Math.floor(((now - started) / 1000) * CHARS_PER_SEC));
      setCount(n);
      if (n < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, instant]);
  return { shown: text.slice(0, count), done: count >= text.length, finish: () => setCount(text.length) };
}

export interface DialogueBoxProps {
  speaker: Speaker;
  /** Name shown on the tag (defaults to the speaker's name). */
  name?: string;
  role?: string;
  text: string;
  index: number;
  total: number;
  agentName: string;
  reducedMotion: boolean;
  /** Icon for narrator lines (e.g. the whiteboard). */
  icon?: LucideIcon;
  onNext: () => void;
  nextLabel: string;
  /** Big primary action (e.g. "Start shift"), always shown. */
  primary?: ReactNode;
  secondary?: ReactNode;
  focusRef?: RefObject<HTMLButtonElement | null>;
  /** Shows a close (X) button in the corner. */
  onClose?: () => void;
}

/** Visual-novel style dialogue box with a speaker tag, typewriter text, and actions. */
export function DialogueBox({
  speaker,
  name,
  role,
  text,
  index,
  total,
  agentName,
  reducedMotion,
  icon,
  onNext,
  nextLabel,
  primary,
  secondary,
  focusRef,
  onClose,
}: DialogueBoxProps) {
  const id = useId();
  const { shown, done, finish } = useTypewriter(text, reducedMotion);
  const fallbackRef = useRef<HTMLButtonElement>(null);
  const nextRef = focusRef ?? fallbackRef;
  const { coach } = usePathway();
  const displayName = name ?? speakerName(speaker, { agentName, coachName: coach.name });

  return (
    <section
      className={h.box}
      aria-labelledby={`${id}-name`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && onClose) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={`${h.nameTag} ${speaker === "narrator" ? h.nameTagNarrator : ""}`}>
        <SpeakerFace speaker={speaker} size={34} icon={icon} mood="eager" />
        <span id={`${id}-name`} className={h.name}>
          {displayName}
          {role ? <span className={h.role}>{role}</span> : null}
        </span>
      </div>
      {total > 1 ? (
        <span className={`${h.counter} ${onClose ? h.counterShift : ""}`} aria-hidden="true">
          {index + 1} / {total}
        </span>
      ) : null}
      {onClose ? (
        <button type="button" className={h.boxClose} onClick={onClose} aria-label="Close conversation">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
      {/* Screen readers get the whole line at once; the typewriter is visual only. */}
      <p id={`${id}-line`} className="sr-only" aria-live="polite">
        {text}
      </p>
      <p
        className={`${h.text} ${speaker === "narrator" ? h.textNarrator : ""}`}
        aria-hidden="true"
        onClick={() => (done ? undefined : finish())}
      >
        {shown}
        {!done ? <span className={h.caret} /> : null}
        <span className={h.ghost}>{text.slice(shown.length)}</span>
      </p>
      <div className={h.controls}>
        {secondary}
        <button
          ref={nextRef}
          type="button"
          // The first line of a conversation arrives with the box (a new live region is not read), so
          // focusing Next also reads the line.
          aria-describedby={`${id}-line`}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border-2 border-ink bg-paper px-4 font-display text-base font-semibold text-ink shadow-[0_3px_0_0_var(--hl-ink)] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_0_var(--hl-ink)]"
          onClick={() => {
            if (!done) finish();
            else onNext();
          }}
        >
          {nextLabel}
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        {primary ? <div className={h.grow}>{primary}</div> : null}
      </div>
    </section>
  );
}
