"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Info, List, Play, X } from "lucide-react";
import type { HubContent, HubTargetId } from "@/lib/game/hub";
import type { Encounter } from "@/lib/game/types";
import { DialogueBox } from "./DialogueBox";
import { TARGET_ICON } from "./RoomList";
import h from "./hub.module.css";

/** A saved battle that can be resumed, and which kind it is. */
export type ResumeKind = "practice" | "shift" | null;

export interface HubOverlayProps {
  hub: HubContent;
  encounter: Encounter;
  /** Target whose lines are showing (the avatar arrived there). */
  dialogue: HubTargetId | null;
  /** Where the avatar is walking, if anywhere. */
  walking: HubTargetId | null;
  resumeKind: ResumeKind;
  /** Practice is not done yet: the main button starts it, with a "Skip practice" link. */
  practiceNext: boolean;
  /** One-time note (e.g. an old save was cleared). */
  note?: string | null;
  onDismissNote?: () => void;
  onSkipPractice: () => void;
  reducedMotion: boolean;
  onOpenRooms: () => void;
  onCloseDialogue: () => void;
  onStartShift: () => void;
}

const startBtn =
  "inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-ink bg-orange px-5 " +
  "font-display text-lg font-bold text-ink shadow-[0_4px_0_0_var(--hl-ink)] transition-[transform,box-shadow] duration-150 " +
  "hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_var(--hl-ink)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)]";

/** The main button's label: resume what's saved, else practice first, else the real shift. */
export function startLabel(resumeKind: ResumeKind, practiceNext: boolean): string {
  if (resumeKind === "practice") return "Resume practice";
  if (resumeKind === "shift") return "Resume shift";
  return practiceNext ? "Start practice" : "Start shift";
}

const skipLink =
  "mx-auto mt-1 block min-h-11 rounded-lg px-3 font-display text-[15px] font-semibold text-ink underline underline-offset-4 " +
  "hover:bg-paper-soft";

const plainBtn =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-ink bg-paper px-4 " +
  "font-display text-base font-semibold text-ink shadow-[0_4px_0_0_var(--hl-ink)] transition-[transform,box-shadow] duration-150 " +
  "hover:bg-paper-soft active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)]";

function TargetDialogue({
  hub,
  encounter,
  target,
  label,
  reducedMotion,
  onClose,
  onStartShift,
}: {
  hub: HubContent;
  encounter: Encounter;
  target: HubTargetId;
  label: string;
  reducedMotion: boolean;
  onClose: () => void;
  onStartShift: () => void;
}) {
  const content = hub.targets[target];
  const [i, setI] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, []);
  if (!content || content.lines.length === 0) return null;
  const line = content.lines[Math.min(i, content.lines.length - 1)];
  const last = i >= content.lines.length - 1;
  const battle = content.action === "battle";
  return (
    <DialogueBox
      speaker={line.speaker}
      name={line.speaker === "narrator" ? content.label : undefined}
      role={line.speaker === "dana" ? "Help desk manager" : line.speaker === "agent" ? encounter.agent.role : undefined}
      text={line.text}
      index={i}
      total={content.lines.length}
      agentName={encounter.agent.name}
      reducedMotion={reducedMotion}
      icon={TARGET_ICON[target]}
      focusRef={nextRef}
      nextLabel={last ? "Done" : "Next"}
      onNext={() => (last ? onClose() : setI(i + 1))}
      onClose={onClose}
      primary={
        battle ? (
          <button type="button" className={startBtn} onClick={onStartShift}>
            <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
            {label}
          </button>
        ) : null
      }
    />
  );
}

/** Everything drawn over the office: the day's goal, the dialogue box, and the bottom actions. */
export function HubOverlay({
  hub,
  encounter,
  dialogue,
  walking,
  resumeKind,
  practiceNext,
  note,
  onDismissNote,
  onSkipPractice,
  reducedMotion,
  onOpenRooms,
  onCloseDialogue,
  onStartShift,
}: HubOverlayProps) {
  const walkingLabel = walking ? hub.targets[walking]?.label : null;
  const label = startLabel(resumeKind, practiceNext);
  // The note is announced through a status region that is already on the page (a region inserted
  // with its text already in it is not read), so the text arrives a moment after mount.
  const [spokenNote, setSpokenNote] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setSpokenNote(note ?? ""), 150);
    return () => window.clearTimeout(t);
  }, [note]);
  return (
    <div className={h.overlay}>
      <div className={h.top}>
        <div className={h.objective}>
          <span className={h.objectiveIcon} aria-hidden="true">
            <Flag className="h-4 w-4" strokeWidth={2.6} />
          </span>
          <span>
            <span className={h.objectiveLabel}>{walkingLabel ? "On the way" : "Today"}</span>
            <span className={`${h.objectiveText} block`}>
              {walkingLabel
                ? `Walking to ${walkingLabel}…`
                : resumeKind
                  ? `Your ${resumeKind} is on hold. ${encounter.agent.name} is waiting.`
                  : practiceNext
                    ? "Practice with ResetBot: 4 tickets, one at a time."
                    : `Supervise ${encounter.agent.name}. Tap the office to walk around.`}
            </span>
          </span>
        </div>
        {note ? (
          <div className={h.note}>
            <Info className="h-4 w-4 flex-none text-teal" aria-hidden="true" />
            <span className="min-w-0 flex-1">{note}</span>
            <button type="button" className={h.noteClose} aria-label="Dismiss note" onClick={onDismissNote}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <p className="sr-only" role="status">
        {spokenNote}
      </p>

      {/* Only walking is announced (the objective is plain text, read once with the page). */}
      <p className="sr-only" aria-live="polite">
        {walkingLabel ? `Walking to ${walkingLabel}.` : ""}
      </p>

      <div className={h.bottom}>
        {dialogue ? (
          <TargetDialogue
            key={dialogue}
            hub={hub}
            encounter={encounter}
            target={dialogue}
            label={label}
            reducedMotion={reducedMotion}
            onClose={onCloseDialogue}
            onStartShift={onStartShift}
          />
        ) : (
          <div>
            <div className={h.actions}>
              <button type="button" className={`${plainBtn} max-[389px]:px-3.5`} onClick={onOpenRooms}>
                <List className="h-5 w-5" aria-hidden="true" />
                {/* Narrow phones: icon only, so the main button fits on one line. */}
                <span className="max-[389px]:sr-only">Office list</span>
              </button>
              <button type="button" className={`${startBtn} max-[389px]:whitespace-nowrap`} onClick={onStartShift}>
                <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
                {label}
              </button>
            </div>
            {practiceNext && !resumeKind ? (
              <button type="button" className={`${skipLink} ${h.skipPractice}`} onClick={onSkipPractice}>
                Skip practice
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
