import type { LucideIcon } from "lucide-react";
import { Clock } from "lucide-react";
import type { AgentMood } from "@/lib/game/bus";
import type { DialogueLine } from "@/lib/game/types";
import s from "./battle.module.css";

export type Speaker = DialogueLine["speaker"] | "player";

const SPRITE = "/game/sprites/";

/**
 * Round portrait chip cropped from the character sprites (no extra art needed).
 * The narrator gets an icon instead of a face.
 */
export function SpeakerFace({
  speaker,
  size = 40,
  mood = "idle",
  icon: Icon = Clock,
  className = "",
}: {
  speaker: Speaker;
  size?: number;
  mood?: AgentMood;
  icon?: LucideIcon;
  className?: string;
}) {
  if (speaker === "narrator") {
    return (
      <span
        aria-hidden="true"
        className={`${s.face} ${className}`}
        style={{ width: size, height: size, display: "grid", placeItems: "center", background: "var(--hl-ink)", color: "#fff" }}
      >
        <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.2} />
      </span>
    );
  }
  const art =
    speaker === "agent"
      ? {
          url: `${SPRITE}ollie-${mood}.svg`,
          size: `${size * 1.3}px auto`,
          pos: `${-size * 0.18}px ${size * 0.06}px`,
          bg: "var(--hl-teal-tint)",
        }
      : {
          url: `${SPRITE}${speaker === "dana" ? "dana" : "player"}.svg`,
          size: `${size * 1.15}px auto`,
          pos: `50% ${size * 0.06}px`,
          bg: speaker === "dana" ? "var(--hl-orange-tint)" : "var(--hl-teal-tint)",
        };
  return (
    <span
      aria-hidden="true"
      className={`${s.face} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: art.bg,
        backgroundImage: `url(${art.url})`,
        backgroundSize: art.size,
        backgroundPosition: art.pos,
      }}
    />
  );
}

export function speakerName(speaker: Speaker, agentName: string): string {
  switch (speaker) {
    case "dana":
      return "Dana";
    case "agent":
      return agentName;
    case "player":
      return "You";
    default:
      return "";
  }
}
