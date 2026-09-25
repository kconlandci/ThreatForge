"use client";

import { useId } from "react";
import { Bot, ChevronRight, Coffee, Presentation, Printer, UserRound, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/battle/Sheet";
import { HUB_TARGET_IDS, type HubContent, type HubTargetId } from "@/lib/game/hub";
import h from "./hub.module.css";

export const TARGET_ICON: Record<HubTargetId, LucideIcon> = {
  ollie: Bot,
  dana: UserRound,
  whiteboard: Presentation,
  coffee: Coffee,
  printer: Printer,
};

/** Keyboard- and screen-reader-friendly way around the office: every spot as a button. */
export function RoomList({
  open,
  hub,
  onClose,
  onGo,
}: {
  open: boolean;
  hub: HubContent;
  onClose: () => void;
  onGo: (target: HubTargetId) => void;
}) {
  const titleId = useId();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      header={
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-teal">{hub.officeName}</p>
          <h2 id={titleId} className="mt-0.5 font-display text-xl font-bold text-ink">
            Office list
          </h2>
          <p className="mt-1 text-[15px] text-ink-soft">Pick a spot. You will walk there.</p>
        </div>
      }
    >
      <ul className={h.rooms}>
        {HUB_TARGET_IDS.map((id) => {
          const t = hub.targets[id];
          if (!t) return null;
          const Icon = TARGET_ICON[id];
          return (
            <li key={id}>
              <button
                type="button"
                className={`${h.room} ${t.action === "battle" ? h.roomStart : ""}`}
                onClick={() => onGo(id)}
              >
                <span className={h.roomIcon} aria-hidden="true">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={h.roomLabel}>{t.label}</span>
                  <span className={h.roomDesc}>{t.description}</span>
                </span>
                <ChevronRight className="h-5 w-5 flex-none text-muted" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
