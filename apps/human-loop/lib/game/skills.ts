/**
 * The help desk skills (M3 mastery). Six lens skills are authored on every step (AgentStep.skill);
 * "approve-checked" (calibration) is computed from how the player handled safe plans.
 * Names stay at 4 words or fewer; lines stay short and plain for ESL readers.
 */
import type { DanaQuestion, MasterySkillId, SkillId } from "./types";

export interface SkillInfo {
  id: MasterySkillId;
  /** At most 4 words, e.g. "Check who's asking". */
  name: string;
  /** What it means, one line. */
  oneLiner: string;
  /** Where to look in the evidence, one line naming real evidence labels (the drill coach shows it until Solid). */
  whereToLook: string;
  /** Dana's question it belongs to; null for the calibration skill ("All 3 check out"). */
  question: DanaQuestion | null;
  /** lucide-react icon name. */
  icon: string;
}

/** Lens skills in display order (grouped by Dana's question). */
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

export const DANA_QUESTIONS: Record<DanaQuestion, string> = {
  who: "Who asked?",
  record: "Does it match the record?",
  undo: "Can we undo it?",
};

export const SKILLS: Record<MasterySkillId, SkillInfo> = {
  "verify-identity": {
    id: "verify-identity",
    name: "Check who's asking",
    oneLiner: "Is it really them? Check the address, the phone on file and the sign-in log.",
    whereToLook: "Sender address or Caller ID vs the Directory record. Was the Callback to the phone on file?",
    question: "who",
    icon: "UserCheck",
  },
  "check-approval": {
    id: "check-approval",
    name: "Check who approved",
    oneLiner: "It is them, but are they allowed to ask? Look for the owner's, HR's or the manager's OK.",
    whereToLook: "HR portal or the Ticket: is there a written OK from the owner, HR or the manager?",
    question: "who",
    icon: "BadgeCheck",
  },
  "match-request": {
    id: "match-request",
    name: "Match the request",
    oneLiner: "Right person, right device, and only what was asked. No extras.",
    whereToLook: "The Ticket vs What it will change. Same person, same device? Ollie's reason often adds extras.",
    question: "record",
    icon: "ClipboardCheck",
  },
  "confirm-fix": {
    id: "confirm-fix",
    name: "Confirm the fix",
    oneLiner: "Before you close it, check the user's reply and the logs.",
    whereToLook: "User reply and the log, after the Fix time. No reply is not a yes.",
    question: "record",
    icon: "CircleCheck",
  },
  "guard-data": {
    id: "guard-data",
    name: "Guard the data",
    oneLiner: "Where does the data go, and who can see it? Once it's out, it's out.",
    whereToLook: "What it will send and Tool it will use. Who can read it once it's sent?",
    question: "undo",
    icon: "ShieldCheck",
  },
  "safe-change": {
    id: "safe-change",
    name: "Change safely",
    oneLiner: "If it goes wrong, can we undo it? Back up first. Right time. Right target.",
    whereToLook: "Action type, Script and Backup status. Right time? Right target?",
    question: "undo",
    icon: "Wrench",
  },
  "approve-checked": {
    id: "approve-checked",
    name: "Approve what checks out",
    oneLiner: "All 3 questions check out? Approve it, even if it looks scary.",
    whereToLook: "Read every evidence line. No red flag on any of the 3 questions? Approve it.",
    question: null,
    icon: "ThumbsUp",
  },
};

export function isSkillId(value: unknown): value is SkillId {
  return typeof value === "string" && (LENS_SKILLS as string[]).includes(value);
}

export function isMasterySkillId(value: unknown): value is MasterySkillId {
  return typeof value === "string" && (MASTERY_SKILLS as string[]).includes(value);
}

export function skillName(id: MasterySkillId): string {
  return SKILLS[id].name;
}
