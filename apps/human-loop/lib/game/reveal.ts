/**
 * Phase 1a "reveal": what the game shows and says after a plan resolves, for every mode.
 *
 * - revealFor(): the kind of result, the clue rows (content indices) and one short line that names
 *   what the agent did not check ("Ollie didn't check: Sender address.").
 * - practiceBar(): the practice coach bar right after a resolution (the reveal line). BattleView
 *   uses it before practiceCoach: `practiceBar(...) ?? coachHint(...)`.
 * - vignetteFor(), isCleanRun(), resultMood(), proofCount(): the stage vignette family and the
 *   clean-run rule the result screens share.
 *
 * This module READS the answers (safe, redFlag, key). That is why it is separate from coach.ts,
 * which must never read them (coach.test.ts checks its source). coach.ts must never import this
 * file; this file may import coach.ts types and helpers.
 *
 * Marks: the player's "spot it" mark on the evidence sheet is a CONTENT index into step.evidence
 * (never a display index). The synthesized "Can we undo it?" row and the "Ask:" line are not
 * evidence rows, so they can never be marked.
 *
 * `**word**` marks a control name, as in coach.ts (the UI renders it bold).
 */
import type { AgentMood, VignetteFamily } from "./bus";
import { coachName, type CoachHint } from "./coach";
import type { AgentStep, BattleEvent, BattleState, Encounter } from "./types";

export type RevealKind =
  /** A risky plan was stopped (Block), and the marked row is a red flag. */
  | "caught-proof"
  /** A risky plan was stopped (Block), with no mark or a mark on a row that is not a red flag. */
  | "caught"
  /** A risky plan ran, with no red flag marked. */
  | "missed"
  /** A risky plan ran although the player marked a red flag. */
  | "missed-marked"
  /** A risky plan ran, then Roll Back undid it. */
  | "rolled-back"
  /** A safe plan was blocked or rolled back. */
  | "false-alarm"
  /** A safe plan ran, with no mark. */
  | "ran-safe"
  /** A safe plan ran while a row was marked. */
  | "ran-safe-marked"
  /** Escalated to the coach (safe or risky). */
  | "escalated";

export interface Reveal {
  kind: RevealKind;
  stepId: string;
  /** Content indices of the red-flag rows (empty for a safe plan). */
  flagIdx: number[];
  /** Content index of the safe plan's key row, or null. */
  keyIdx: number | null;
  /** The player's mark, when it is a valid content index (else null). */
  markedIdx: number | null;
  /** The evidence label the line names (the marked flag, else the first red flag), or null. */
  label: string | null;
  /** One line for the coach bar, 16 words or fewer. */
  line: string;
  /** The review sheet's caption under the circled rows ("The clue"): the plan's tell. */
  caption: string;
  /** Toast title becomes PROOF_TITLE. */
  proof: boolean;
  /** The outcome toast gets a "Show me" button (Oops and False alarm, in every mode). */
  showMe: boolean;
  /** A wrong call: the next plan's sheet shows its "Where do I look?" line by itself (practice). */
  wrong: boolean;
}

export const PROOF_TITLE = "Caught with proof!";
/** The practice result's skill line. */
export const PRACTICED_LINE = "You practiced: checking an AI agent's work before it runs.";

/** The first word of the agent's name ("Ollie"). */
function agentShort(enc: Encounter): string {
  return enc.agent.name.split(" ")[0] || enc.agent.name;
}

/** Words as the content tests and the Playwright checks count them: tokens with a letter or digit. */
export function wordCount(text: string): number {
  return text
    .replace(/\*\*/g, "")
    .split(/\s+/)
    .filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

/** A mark can only sit on a real evidence row (a content index). */
export function isMarkable(step: AgentStep, idx: number | null | undefined): idx is number {
  return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 && idx < step.evidence.length;
}

export function flagIndices(step: AgentStep): number[] {
  return step.evidence.flatMap((e, i) => (e.redFlag ? [i] : []));
}

export function keyIndex(step: AgentStep): number | null {
  if (!step.safe) return null;
  const i = step.evidence.findIndex((e) => e.key);
  return i >= 0 ? i : null;
}

function stepOf(enc: Encounter, id: string): AgentStep | undefined {
  return enc.steps.find((s) => s.id === id);
}

type Resolution = Extract<BattleEvent, { t: "caught" | "false-alarm" | "escalated-safe" | "rolled-back" | "executed" }>;

const isResolution = (ev: BattleEvent): ev is Resolution =>
  ev.t === "caught" || ev.t === "false-alarm" || ev.t === "escalated-safe" || ev.t === "rolled-back" || ev.t === "executed";

/**
 * The latest thing that happened to a plan, from engine events only. null when the plan has not
 * resolved yet, or it is back on the board (a blocked safe plan comes back in line).
 */
function lastResolutionOf(state: BattleState, stepId: string): Resolution | null {
  for (let i = state.events.length - 1; i >= 0; i--) {
    const ev = state.events[i];
    if (ev.t === "announce" && ev.stepId === stepId) return null;
    if (isResolution(ev) && ev.stepId === stepId) return ev;
  }
  return null;
}

/**
 * The reveal for one plan, or null while it is unresolved. `markedIdx` is the player's mark on
 * this plan at the moment it resolved (content index; anything else is ignored).
 */
export function revealFor(state: BattleState, enc: Encounter, stepId: string, markedIdx?: number | null): Reveal | null {
  const step = stepOf(enc, stepId);
  if (!step) return null;
  const res = lastResolutionOf(state, stepId);
  if (!res) return null;

  const agent = agentShort(enc);
  const flagIdx = flagIndices(step);
  const keyIdx = keyIndex(step);
  const mark = isMarkable(step, markedIdx) ? markedIdx : null;
  const markedFlag = mark !== null && step.evidence[mark].redFlag;
  const firstFlag = flagIdx.length ? step.evidence[flagIdx[0]].label : null;
  const flagLabel = markedFlag ? step.evidence[mark].label : firstFlag;
  const caption = step.tell ?? step.lesson;
  const base = { stepId, flagIdx, keyIdx, markedIdx: mark, caption, proof: false, showMe: false, wrong: false };
  const didntCheck = (label: string | null) => (label ? `${agent} didn't check: ${label}.` : `${agent} didn't check.`);

  switch (res.t) {
    case "caught": {
      if (res.by === "escalate") {
        return { ...base, kind: "escalated", label: flagLabel, line: `${coachName(enc)} caught it. ${didntCheck(flagLabel)}` };
      }
      if (markedFlag) {
        return { ...base, kind: "caught-proof", label: flagLabel, proof: true, line: `${PROOF_TITLE} ${didntCheck(flagLabel)} You did.` };
      }
      return { ...base, kind: "caught", label: flagLabel, line: `Caught! ${didntCheck(flagLabel)}` };
    }
    case "escalated-safe":
      return { ...base, kind: "escalated", label: null, line: `${coachName(enc)} checked it. It was fine. Good work should run.` };
    case "false-alarm":
      return { ...base, kind: "false-alarm", label: null, showMe: true, wrong: true, line: "That one was fine. Tap **Show me**." };
    case "rolled-back":
      // A safe plan's rollback is followed by a false-alarm event, so this is a risky plan.
      return { ...base, kind: "rolled-back", label: flagLabel, line: `Rolled back. ${didntCheck(flagLabel)}` };
    case "executed": {
      if (step.safe) {
        if (mark !== null) {
          const label = step.evidence[mark].label;
          return { ...base, kind: "ran-safe-marked", label, line: `You marked ${label}. It was fine. Good work should run.` };
        }
        const checked = !!state.steps[stepId]?.inspected;
        return {
          ...base,
          kind: "ran-safe",
          label: null,
          line: checked ? "You checked. It was fine. Good work should run." : "That one was fine. Check first next time.",
        };
      }
      if (markedFlag) {
        return {
          ...base,
          kind: "missed-marked",
          label: flagLabel,
          showMe: true,
          wrong: true,
          line: `You spotted it: ${flagLabel}. Trust your eye. Block it next time.`,
        };
      }
      // Nobody looked at all (it ran without an Inspect): say that too, the way ran-safe does.
      const looked = !!state.steps[stepId]?.inspected;
      return {
        ...base,
        kind: "missed",
        label: flagLabel,
        showMe: true,
        wrong: true,
        line: looked
          ? `${didntCheck(flagLabel)} Tap **Show me**.`
          : `Nobody checked: ${flagLabel ?? "the plan"}. Tap **Show me**. Check first next time.`,
      };
    }
  }
}

/** Options for practiceBar: what the player already did with the reveal. */
export interface PracticeBarOpts {
  /** Plans whose Show me review the player already opened: the line stops asking for it. */
  reviewed?: ReadonlySet<string>;
}

const SHOW_ME_ASK = " Tap **Show me**.";

/**
 * The practice coach bar right after a resolution, or null (then use practiceCoach). It shows the
 * reveal line until the player plays a card or a new turn starts after a block; after a plan ran
 * (endTurn already put the next ticket on the board) it stays through that turn's start.
 *
 * It says one thing and asks for at most one tap:
 * - a catch starts at "{Agent} didn't check…" (the toast above already says "Caught!");
 * - "Tap Show me" goes once the player opened that plan's review;
 * - the plan now on the board decides the tail: already checked (a blocked safe plan came back)
 *   -> "It's back. Tap the plan to look again." (Inspect has nothing left to show); new, and the
 *   player has inspected twice already -> no tail (the ring on Inspect is enough); else
 *   "Next plan: **Inspect** it."
 */
export function practiceBar(
  state: BattleState,
  enc: Encounter,
  marks: ReadonlyMap<string, number>,
  opts: PracticeBarOpts = {},
): Pick<CoachHint, "id" | "text" | "target"> | null {
  if (!enc.practice) return null;
  let turnStarts = 0;
  let res: Resolution | null = null;
  for (let i = state.events.length - 1; i >= 0; i--) {
    const ev = state.events[i];
    if (ev.t === "card-played") return null;
    if (ev.t === "turn-start") turnStarts++;
    if (isResolution(ev)) {
      res = ev;
      break;
    }
  }
  // (A rolled-back safe plan ends with a false-alarm event, so the scan finds that first.)
  if (!res) return null;
  if (turnStarts > (res.t === "executed" ? 1 : 0)) return null;
  const reveal = revealFor(state, enc, res.stepId, marks.get(res.stepId));
  if (!reveal) return null;
  const id = `r-${reveal.kind}`;
  let line = reveal.line;
  if (reveal.kind === "caught-proof" && line.startsWith(`${PROOF_TITLE} `)) line = line.slice(PROOF_TITLE.length + 1);
  else if (reveal.kind === "caught" && line.startsWith("Caught! ")) line = line.slice("Caught! ".length);
  if (opts.reviewed?.has(res.stepId)) line = line.replace(SHOW_ME_ASK, "");
  if (state.status !== "playing") return { id, text: `${line} Tap **See how you did**.`, target: null };
  if (state.announced.length === 0) return { id, text: `${line} Tap **Next ticket**.`, target: "approve" };
  const next = state.announced[0];
  // One instruction: the plan that came back (the bar's Show me button stays for the last one).
  if (state.steps[next]?.inspected) return { id, text: `${line.replace(SHOW_ME_ASK, "")} It's back. Tap the plan to look again.`, target: "plan" };
  const inspects = state.events.filter((ev) => ev.t === "card-played" && ev.cardId === "inspect").length;
  if (inspects >= 2) return { id, text: line, target: "card:inspect" };
  return { id, text: `${line} Next plan: **Inspect** it.`, target: "card:inspect" };
}

/**
 * The stage vignette when a risky plan runs: by skill first (data leaks look like a leak even in
 * a report), then by category. "breakin" is Phase 3, so identity and access plans use "system".
 */
export function vignetteFor(step: Pick<AgentStep, "skill" | "category" | "vignette">): VignetteFamily {
  if (step.vignette) return step.vignette;
  if (step.skill === "guard-data") return "leak";
  if (step.category === "report") return "report";
  return "system";
}

/** Won, and no risky plan ran without being rolled back. Confetti and "celebrate" need it. */
export function isCleanRun(state: BattleState, enc: Encounter): boolean {
  if (state.status !== "won") return false;
  return enc.steps.every((s) => s.safe || state.steps[s.id]?.status !== "executed");
}

/** The agent's mood on every result screen and on the stage at the result. */
export function resultMood(state: BattleState, enc: Encounter): AgentMood {
  if (state.status !== "won") return "sad";
  return isCleanRun(state, enc) ? "celebrate" : "idle";
}

/** Risky plans stopped while a red flag was marked ("M caught with proof"). */
export function proofCount(state: BattleState, enc: Encounter, marks: ReadonlyMap<string, number>): number {
  return enc.steps.filter((s) => revealFor(state, enc, s.id, marks.get(s.id))?.kind === "caught-proof").length;
}

/** The practice result headline: "3 of 4 right." plus " 1 caught with proof." when any. */
export function practiceScoreLine(right: number, total: number, proof: number): string {
  return proof > 0 ? `${right} of ${total} right. ${proof} caught with proof.` : `${right} of ${total} right.`;
}
