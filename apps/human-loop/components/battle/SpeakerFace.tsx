import type { LucideIcon } from "lucide-react";
import { Clock } from "lucide-react";
import type { AgentMood } from "@/lib/game/bus";
import { usePathway } from "@/lib/pathways/context";
import { coachName } from "@/lib/game/coach";
import type { DialogueLine, Encounter } from "@/lib/game/types";
import s from "./battle.module.css";

export type Speaker = DialogueLine["speaker"] | "player";

const SPRITE = "/game/sprites/";

/**
 * Round portrait chip cropped from the character sprites (no extra art needed): the pathway's
 * coach (orange tint) and agent (its mood portrait), or the player. The narrator gets an icon.
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
  const { stage } = usePathway();
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
          url: `${SPRITE}${stage.agentSprite}-${mood}.svg`,
          size: `${size * 1.3}px auto`,
          pos: `${-size * 0.18}px ${size * 0.06}px`,
          bg: "var(--hl-teal-tint)",
        }
      : {
          url: `${SPRITE}${speaker === "coach" ? stage.coachSprite : "player"}.svg`,
          size: `${size * 1.15}px auto`,
          pos: `50% ${size * 0.06}px`,
          bg: speaker === "coach" ? "var(--hl-orange-tint)" : "var(--hl-teal-tint)",
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

export function speakerName(speaker: Speaker, names: { agentName: string; coachName: string }): string {
  switch (speaker) {
    case "coach":
      return names.coachName;
    case "agent":
      return names.agentName;
    case "player":
      return "You";
    default:
      return "";
  }
}

/** The names an encounter's lines are spoken with. */
export function speakerNames(enc: Encounter): { agentName: string; coachName: string } {
  return { agentName: enc.agent.name, coachName: coachName(enc) };
}
