/**
 * The oversight skills (M3 mastery), shared by every pathway. Six lens skills are authored on
 * every step (AgentStep.skill); "approve-checked" (calibration) is computed from how the player
 * handled safe plans. Names stay at 4 words or fewer; lines stay short and plain for ESL readers.
 *
 * Ids, names, icons and the question each skill belongs to are shared (SKILL_BASE), so a skill
 * means the same thing on the help desk and in the SOC. The player-facing copy (what it means,
 * where to look) differs by pathway: it lives in content/<pathway>/skills.json and reaches the UI
 * through PathwayBundle.skill(id).
 */
import type { CheckQuestion, MasterySkillId, SkillId } from "./types";

export interface SkillBase {
  id: MasterySkillId;
  /** At most 4 words, e.g. "Check who's asking". */
  name: string;
  /** The question it belongs to; null for the calibration skill ("All 3 check out"). */
  question: CheckQuestion | null;
  /** lucide-react icon name. */
  icon: string;
}

/** A pathway's copy for one skill (content/<pathway>/skills.json). */
export interface SkillCopy {
  /** What it means, one line. */
  oneLiner: string;
  /** Where to look in the evidence, one line naming real evidence labels (the drill coach shows it until Solid). */
  whereToLook: string;
  /** Optional worked example (SkillDetail shows it only when present). */
  example?: string;
  /** Evidence labels the whereToLook line names (content tests check they exist). */
  lookFor?: string[];
}

export interface SkillInfo extends SkillBase, SkillCopy {}

/** Lens skills in display order (grouped by question). */
export const LENS_SKILLS: SkillId[] = [
  "verify-identity",
  "check-approval",
  "match-request",
  "confirm-fix",
  "guard-data",
  "safe-change",
];

/** Every mastery skill in display order; also the stable tie-break order. */
export const MASTERY_SKILLS: MasterySkillId[] = [...LENS_SKILLS, "approve-checked"];

/** The 3 questions, word for word the same in every pathway. */
export const QUESTION_TITLES: Record<CheckQuestion, string> = {
  who: "Who asked?",
  record: "Does it match the record?",
  undo: "Can we undo it?",
};

/** @deprecated Use QUESTION_TITLES. */
export const DANA_QUESTIONS = QUESTION_TITLES;

export const SKILL_BASE: Record<MasterySkillId, SkillBase> = {
  "verify-identity": { id: "verify-identity", name: "Check who's asking", question: "who", icon: "UserCheck" },
  "check-approval": { id: "check-approval", name: "Check who approved", question: "who", icon: "BadgeCheck" },
  "match-request": { id: "match-request", name: "Match the request", question: "record", icon: "ClipboardCheck" },
  "confirm-fix": { id: "confirm-fix", name: "Confirm the fix", question: "record", icon: "CircleCheck" },
  "guard-data": { id: "guard-data", name: "Guard the data", question: "undo", icon: "ShieldCheck" },
  "safe-change": { id: "safe-change", name: "Change safely", question: "undo", icon: "Wrench" },
  "approve-checked": { id: "approve-checked", name: "Approve what checks out", question: null, icon: "ThumbsUp" },
};

export function isSkillId(value: unknown): value is SkillId {
  return typeof value === "string" && (LENS_SKILLS as string[]).includes(value);
}

export function isMasterySkillId(value: unknown): value is MasterySkillId {
  return typeof value === "string" && (MASTERY_SKILLS as string[]).includes(value);
}

export function skillName(id: MasterySkillId): string {
  return SKILL_BASE[id].name;
}

/** The question a skill belongs to (null for approve-checked). */
export function skillQuestion(id: MasterySkillId): CheckQuestion | null {
  return SKILL_BASE[id].question;
}
