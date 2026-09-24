"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, List, Play } from "lucide-react";
import type { HubContent, HubTargetId } from "@/lib/game/hub";
import type { Encounter } from "@/lib/game/types";
import { DialogueBox } from "./DialogueBox";
import { TARGET_ICON } from "./RoomList";
import h from "./hub.module.css";

export interface HubOverlayProps {
  hub: HubContent;
  encounter: Encounter;
  /** Target whose lines are showing (the avatar arrived there). */
  dialogue: HubTargetId | null;
  /** Where the avatar is walking, if anywhere. */
  walking: HubTargetId | null;
  hasBattle: boolean;
  reducedMotion: boolean;
  onOpenRooms: () => void;
  onGo: (target: HubTargetId) => void;
  onCloseDialogue: () => void;
  onStartShift: () => void;
}

const startBtn =
  "inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-ink bg-orange px-5 " +
  "font-display text-lg font-bold text-ink shadow-[0_4px_0_0_var(--hl-ink)] transition-[transform,box-shadow] duration-150 " +
  "hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_var(--hl-ink)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)]";

const plainBtn =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-ink bg-paper px-4 " +
  "font-display text-base font-semibold text-ink shadow-[0_4px_0_0_var(--hl-ink)] transition-[transform,box-shadow] duration-150 " +
  "hover:bg-paper-soft active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)]";

function TargetDialogue({
  hub,
  encounter,
  target,
  hasBattle,
  reducedMotion,
  onClose,
  onStartShift,
}: {
  hub: HubContent;
  encounter: Encounter;
  target: HubTargetId;
  hasBattle: boolean;
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
            {hasBattle ? "Resume shift" : "Start shift"}
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
  hasBattle,
  reducedMotion,
  onOpenRooms,
  onGo,
  onCloseDialogue,
  onStartShift,
}: HubOverlayProps) {
  const walkingLabel = walking ? hub.targets[walking]?.label : null;
  return (
    <div className={h.overlay}>
      <div className={h.top}>
        <div className={h.objective} role="status">
          <span className={h.objectiveIcon} aria-hidden="true">
            <Flag className="h-4 w-4" strokeWidth={2.6} />
          </span>
          <span>
            <span className={h.objectiveLabel}>{walkingLabel ? "On the way" : "Today"}</span>
            <span className={`${h.objectiveText} block`}>
              {walkingLabel
                ? `Walking to ${walkingLabel}…`
                : hasBattle
                  ? `Your shift is on hold. ${encounter.agent.name} is waiting.`
                  : `Supervise ${encounter.agent.name}. Tap the office to walk around.`}
            </span>
          </span>
        </div>
      </div>

      <div className={h.bottom}>
        {dialogue ? (
          <TargetDialogue
            key={dialogue}
            hub={hub}
            encounter={encounter}
            target={dialogue}
            hasBattle={hasBattle}
            reducedMotion={reducedMotion}
            onClose={onCloseDialogue}
            onStartShift={onStartShift}
          />
        ) : (
          <div className={h.actions}>
            <button type="button" className={plainBtn} onClick={onOpenRooms}>
              <List className="h-5 w-5" aria-hidden="true" />
              Office list
            </button>
            <button type="button" className={startBtn} onClick={() => onGo("resetbot")}>
              <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
              {hasBattle ? "Back to your shift" : `Go to ${encounter.agent.name.split(" ")[0]}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
