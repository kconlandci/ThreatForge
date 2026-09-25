/**
 * Small shared pieces for the skill screens: level pips, result shapes (check / half / cross, so
 * color is never the only signal), skill and question icons.
 */
import {
  BadgeCheck,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  ListChecks,
  ShieldCheck,
  ThumbsUp,
  Undo2,
  UserCheck,
  UserSearch,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { LEVEL_NAMES } from "@/lib/game/mastery";
import { SKILL_BASE } from "@/lib/game/skills";
import { levelText } from "@/lib/game/skillsView";
import type { CallGrade, CheckQuestion, MasterySkillId, SkillLevel } from "@/lib/game/types";
import k from "./skills.module.css";

const SKILL_ICONS: Record<string, LucideIcon> = {
  UserCheck,
  BadgeCheck,
  ClipboardCheck,
  CircleCheck,
  ShieldCheck,
  Wrench,
  ThumbsUp,
};

export function skillIcon(skill: MasterySkillId): LucideIcon {
  return SKILL_ICONS[SKILL_BASE[skill].icon] ?? ListChecks;
}

export const QUESTION_ICON: Record<CheckQuestion, LucideIcon> = {
  who: UserSearch,
  record: ClipboardList,
  undo: Undo2,
};

export function questionIcon(q: CheckQuestion | null): LucideIcon {
  return q ? QUESTION_ICON[q] : ListChecks;
}

/** 4 pips. With `word`, the level word follows ("Practicing"). Screen readers hear "Level 2 of 4: Practicing". */
export function Pips({ level, word = false, size = "md" }: { level: SkillLevel; word?: boolean; size?: "sm" | "md" }) {
  return (
    <span className={k.pipsWrap}>
      <span className={`${k.pips} ${size === "sm" ? k.pipsSm : ""}`} role="img" aria-label={levelText(level)}>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`${k.pip} ${i <= level ? k.pipOn : ""}`} />
        ))}
      </span>
      {word && level > 0 ? (
        <span className={k.levelWord} aria-hidden="true">
          {LEVEL_NAMES[level]}
        </span>
      ) : null}
    </span>
  );
}

const SHAPE_LABEL: Record<CallGrade | "none", string> = {
  R: "Right",
  P: "Partly right",
  W: "Missed",
  none: "Not reached",
};

/** The result shape: a check (right), a half circle (partly), a cross (missed), a dash (not reached). */
export function ResultShape({
  grade,
  size = 22,
  label = true,
}: {
  grade: CallGrade | null;
  size?: number;
  /** false: decorative (the text next to it already says the result). */
  label?: boolean;
}) {
  const g = grade ?? "none";
  const cls = g === "R" ? k.shapeR : g === "P" ? k.shapeP : g === "W" ? k.shapeW : k.shapeNone;
  return (
    <svg
      className={`${k.shape} ${cls}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={label ? "img" : undefined}
      aria-label={label ? SHAPE_LABEL[g] : undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <circle cx="12" cy="12" r="10.5" className={k.shapeRing} />
      {g === "R" ? <path d="M7 12.5l3.2 3.2L17 8.8" className={k.shapeMark} /> : null}
      {g === "P" ? <path d="M12 1.5a10.5 10.5 0 0 1 0 21z" className={k.shapeHalf} /> : null}
      {g === "W" ? <path d="M8 8l8 8M16 8l-8 8" className={k.shapeMark} /> : null}
      {g === "none" ? <path d="M8 12h8" className={k.shapeMark} /> : null}
    </svg>
  );
}

export function shapeLabel(grade: CallGrade | null): string {
  return SHAPE_LABEL[grade ?? "none"];
}

/** A row of result shapes for a skill's last calls, oldest first. */
export function CallRow({ calls }: { calls: { grade: CallGrade }[] }) {
  if (!calls.length) return <p className={k.muted}>No calls yet.</p>;
  const words = calls.map((c) => shapeLabel(c.grade).toLowerCase()).join(", ");
  return (
    <span className={k.callRow} role="img" aria-label={`Last ${calls.length} ${calls.length === 1 ? "call" : "calls"}, oldest first: ${words}`}>
      {calls.map((c, i) => (
        <ResultShape key={i} grade={c.grade} size={24} label={false} />
      ))}
    </span>
  );
}
