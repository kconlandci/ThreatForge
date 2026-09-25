/**
 * The coach's hint line (Dana on the help desk, the pathway's lead elsewhere): one short sentence
 * above the main button that says what to tap next.
 *
 * Pure (no React): a function of the battle state plus two UI facts (the selected card and the
 * open evidence sheet), so a reload, a resumed save or keyboard play all land on the same hint.
 *
 * Hints are keyed by queue position and engine state only. They never read a step's `safe`
 * flag, any evidence `redFlag`, `twist` or `direction` (lib/game/coach.test.ts enforces this): the coach may ask the
 * question, but it never gives away the answer.
 *
 * `**word**` marks the name of a control; the UI renders it bold (see hintParts()).
 */
import { CARDS } from "./cards";
import { validTargets } from "./engine";
import { DEFAULT_COACH } from "./helpDeskDefaults";
import type { BattleEvent, BattleState, CardId, Encounter, MasterySkillId, SkillLevel } from "./types";

/** What gets the pulsing ring. `card:<id>` is a stack in the hand; `plan` is every live plan. */
export type CoachTarget =
  | `card:${CardId}`
  | "plan"
  | "approve"
  | "energy"
  | "sheet:inspect"
  | "sheet:block"
  | "sheet:ok";

/** Controls that are locked for now (practice tickets 1-2 only). The engine is never told. */
export interface CoachLock {
  cards: CardId[];
  approve: boolean;
  sheetBlock: boolean;
  /** Short reason, e.g. "Inspect first. Then decide." */
  reason: string;
  /** Ends a locked control's accessible name: "Block. Locked: inspect the plan first." */
  label: string;
}

export interface CoachHint {
  /** Stable id for the beat (tests, analytics, change detection). */
  id: string;
  text: string;
  target: CoachTarget | null;
  lock?: CoachLock;
}

export interface CoachUi {
  selectedCardId: CardId | null;
  /** The step whose evidence sheet is open, if any. */
  sheetStepId: string | null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** The coach's name for this encounter (hydrated from pathway.json; the Help Desk lead by default). */
export function coachName(enc: Pick<Encounter, "coach">): string {
  return enc.coach?.name ?? DEFAULT_COACH.name;
}

/** The first word of the agent's name ("Ollie", "Patch"). */
function agentShort(enc: Encounter): string {
  return enc.agent.name.split(" ")[0] || enc.agent.name;
}

/** Split hint text into plain and bold parts. */
export function hintParts(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) => (part.startsWith("**") ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false }));
}

/** Hint text without the bold marks (screen readers, logs). */
export function plainHint(text: string): string {
  return text.replace(/\*\*/g, "");
}

function turnEvents(state: BattleState): BattleEvent[] {
  for (let i = state.events.length - 1; i >= 0; i--) if (state.events[i].t === "turn-start") return state.events.slice(i);
  return state.events;
}

function stepIndex(enc: Encounter, stepId: string): number {
  return enc.steps.findIndex((s) => s.id === stepId);
}

/** The last thing that took a plan off the board this turn (engine events only). */
function lastResolution(state: BattleState): { stepId: string; kind: "caught" | "false-alarm" | "escalated" } | null {
  const evs = turnEvents(state);
  for (let i = evs.length - 1; i >= 0; i--) {
    const ev = evs[i];
    if (ev.t === "caught") return { stepId: ev.stepId, kind: "caught" };
    if (ev.t === "false-alarm") return { stepId: ev.stepId, kind: "false-alarm" };
    if (ev.t === "escalated-safe") return { stepId: ev.stepId, kind: "escalated" };
  }
  return null;
}

/** Row 1 of the action bar while a card is selected. */
export function cardPrompt(state: BattleState, enc: Encounter, cardId: CardId): CoachHint {
  const def = CARDS[cardId];
  const id = `card-${cardId}`;
  if (!def) return { id, text: "", target: null };
  if (def.cost > state.energy) return { id: `${id}-energy`, text: `Not enough energy. ${def.name} costs ${def.cost}.`, target: null };
  if (def.target === "none") {
    return { id, text: cardId === "coffee" ? "Coffee. Tap Play." : `${def.name}. Tap Play.`, target: null };
  }
  const targets = validTargets(state, enc, cardId);
  if (def.target === "executed") {
    return targets.length
      ? { id, text: "Now tap a Done action to undo it.", target: null }
      : { id: `${id}-none`, text: "Nothing to undo right now.", target: null };
  }
  if (targets.length === 0) {
    return {
      id: `${id}-none`,
      text: cardId === "inspect" ? "Every plan is already checked." : "No plans to pick right now.",
      target: null,
    };
  }
  const one = state.announced.length === 1;
  const what = cardId === "inspect" ? "inspect it" : cardId === "block" ? "block it" : cardId === "escalate" ? `send it to ${coachName(enc)}` : "play it";
  return { id, text: one ? `Now tap the plan to ${what}.` : `Tap a plan to ${what}.`, target: "plan" };
}

/* ------------------------------------------------------------------ */
/* Practice                                                            */
/* ------------------------------------------------------------------ */

const LOCK_INSPECT_FIRST: Omit<CoachLock, "approve"> = {
  cards: ["block"],
  sheetBlock: true,
  reason: "Inspect first. Then decide.",
  label: "inspect the plan first",
};

const HIDDEN = "Evidence is hidden. Tap **Inspect** to see it.";
/** Practice sheet lines for tickets 1 and 2 when the encounter has no coachScript (the Help Desk lines). */
const FIRST_SAFE_SHEET = "Real ticket. Work email. Public guide. Tap **Looks OK**.";
const FIRST_RISKY_SHEET = "Who asked? Check the **sender address**. Wrong? Tap **Block**.";
const YOUR_CALL_SHEET = "Your call. Wrong? **Block**. Fine? **Looks OK**.";

/**
 * The practice shift's script. k = the queue position (0-3) of the plan on the board; tickets 1
 * and 2 are guided (with locks), tickets 3 and 4 are the player's call.
 */
export function practiceCoach(state: BattleState, enc: Encounter, ui: CoachUi): CoachHint {
  if (state.status !== "playing") {
    return { id: "p-end", text: "Tap **See how you did**.", target: null };
  }
  const board = state.announced;

  if (board.length === 0) {
    const last = lastResolution(state);
    const k = last ? stepIndex(enc, last.stepId) : -1;
    if (last && k <= 2 && last.kind === "caught") {
      return { id: `p${k}-caught`, text: "Caught! A blocked plan never runs. Tap **Next ticket**.", target: "approve" };
    }
    if (last && k <= 2 && last.kind === "false-alarm") {
      return {
        id: `p${k}-false-alarm`,
        text: "That one was fine. Blocked good work comes back later. Tap **Next ticket**.",
        target: "approve",
      };
    }
    return { id: `p${k}-empty`, text: "Tap **Next ticket**.", target: k >= 0 && k <= 2 ? "approve" : null };
  }

  const stepId = board[0];
  const k = stepIndex(enc, stepId);
  const rt = state.steps[stepId];
  const inspected = !!rt?.inspected;
  const sheetOpen = !!ui.sheetStepId && board.includes(ui.sheetStepId);
  let hint: CoachHint;

  if (k === 0) {
    if (!inspected) {
      const lock = { ...LOCK_INSPECT_FIRST, approve: true };
      hint = sheetOpen
        ? { id: "p0-b", text: HIDDEN, target: "sheet:inspect", lock }
        : { id: "p0-a", text: `${agentShort(enc)} has a plan. Check it first: tap **Inspect**.`, target: "card:inspect", lock };
    } else {
      const lock: CoachLock = {
        cards: ["block"],
        sheetBlock: true,
        approve: sheetOpen,
        reason: "This one is fine. Approve it.",
        label: "this one is fine, approve it",
      };
      hint = sheetOpen
        ? { id: "p0-c", text: enc.coachScript?.firstSafeSheet ?? FIRST_SAFE_SHEET, target: "sheet:ok", lock }
        : { id: "p0-d", text: `Looks fine. Tap **Approve** to let ${agentShort(enc)} do it.`, target: "approve", lock };
    }
  } else if (k === 1) {
    if (!inspected) {
      const lock = { ...LOCK_INSPECT_FIRST, approve: true };
      hint = sheetOpen
        ? { id: "p1-b", text: HIDDEN, target: "sheet:inspect", lock }
        : { id: "p1-a", text: "New ticket. **Inspect** it first.", target: "card:inspect", lock };
    } else {
      hint = sheetOpen
        ? { id: "p1-c", text: enc.coachScript?.firstRiskySheet ?? FIRST_RISKY_SHEET, target: "sheet:block" }
        : { id: "p1-d", text: "Something wrong? Tap **Block**, then tap the plan.", target: "card:block" };
    }
  } else if (k === 2) {
    const returned = (rt?.requeues ?? 0) > 0;
    if (!inspected) {
      hint = sheetOpen
        ? { id: "p2-hidden", text: HIDDEN, target: "sheet:inspect" }
        : returned
          ? { id: "p2-back", text: "It's back. Look again, then decide.", target: "plan" }
          : { id: "p2-a", text: "This one sounds scary. Is it? **Inspect** to find out.", target: "card:inspect" };
    } else {
      hint = sheetOpen
        ? { id: "p2-b-sheet", text: YOUR_CALL_SHEET, target: null }
        : { id: "p2-b", text: "Your call: **Block** it, or tap **Approve**.", target: null };
    }
  } else if (!inspected) {
    hint = sheetOpen
      ? { id: "p3-hidden", text: HIDDEN, target: null }
      : { id: "p3-a", text: "Last ticket. Looks routine. Check it anyway.", target: null };
  } else {
    hint = sheetOpen
      ? { id: "p3-b-sheet", text: YOUR_CALL_SHEET, target: null }
      : { id: "p3-b", text: "Wrong? **Block** it. Fine? Tap **Approve**.", target: null };
  }

  // A card is picked (and the sheet is closed): say where to tap. Locks stay as they were.
  if (ui.selectedCardId && !sheetOpen) {
    const prompt = cardPrompt(state, enc, ui.selectedCardId);
    return { ...prompt, id: `p${k}-${prompt.id}`, lock: hint.lock };
  }
  return hint;
}

/* ------------------------------------------------------------------ */
/* Real shift                                                          */
/* ------------------------------------------------------------------ */

/** The first-shift tip for a card that just joined the hand. */
export function unlockTip(id: CardId, enc: Encounter): string {
  switch (id) {
    case "policy-callback":
      return "New card: **Policy: Callback**. It inspects every MFA, password and unlock plan.";
    case "policy-look-first":
      return "New card: **Policy: Look First**. It inspects every device and network plan.";
    case "policy-change-window":
      return "New card: **Policy: Change Window**. It inspects every network and cloud plan.";
    case "escalate":
      return `New card: **Escalate**. Not sure? Send the plan to ${coachName(enc)}.`;
    case "rollback":
      return "New card: **Roll Back**. It undoes an action in the **Done** row.";
    case "coffee":
      return "New card: **Coffee**. Free. Draw 2 more cards.";
    case "inspect":
      return "New card: **Inspect**. See the evidence behind a plan.";
    case "block":
      return "New card: **Block**. Stop a plan.";
  }
}

/**
 * First-shift tips, derived only from events (so they survive a reload). One at a time, and only
 * at the start of a turn: once the player has acted (played a card), the coach's generic "what to do
 * next" hints take over. An unlock tip also needs the card to be usable right now (enough energy,
 * and for Roll Back something in the Done row), so the ring never points at a card that can't help.
 */
export function firstShiftTip(state: BattleState, enc: Encounter): CoachHint | null {
  if (state.status !== "playing") return null;
  const evs = turnEvents(state);
  const played = new Set(evs.flatMap((ev) => (ev.t === "card-played" ? [ev.cardId] : [])));

  if (state.turn === 1 && played.size === 0) {
    return {
      id: "tip-energy",
      text: "Tap **Inspect**, then the plan. Cards cost energy: the orange number.",
      target: "card:inspect",
    };
  }

  // The first turn with two or more plans: they run in order.
  let turn = 0;
  let maxBefore = 0;
  let count = 0;
  for (const ev of state.events) {
    if (ev.t === "turn-start") {
      if (turn > 0 && turn < state.turn) maxBefore = Math.max(maxBefore, count);
      turn = ev.turn;
      count = 0;
    } else if (ev.t === "announce") count++;
  }
  const announcedNow = evs.filter((ev) => ev.t === "announce").length;
  const twoPlanTurn = announcedNow >= 2 && maxBefore < 2;
  if (twoPlanTurn && played.size === 0 && state.announced.length >= 2) {
    return { id: "tip-two-plans", text: "**Two plans** now. They run in order, top to bottom.", target: "plan" };
  }

  // The two-plans tip used the turn's first moment, so its unlock tip gets the next one.
  if (played.size > (twoPlanTurn ? 1 : 0)) return null;
  for (const ev of evs) {
    if (ev.t !== "unlock") continue;
    for (const id of ev.cardIds) {
      if (played.has(id) || !state.hand.some((c) => c.cardId === id)) continue;
      if (CARDS[id].cost > state.energy) continue;
      if (CARDS[id].target === "executed" && validTargets(state, enc, id).length === 0) continue;
      return { id: `tip-${id}`, text: unlockTip(id, enc), target: `card:${id}` };
    }
  }
  return null;
}

/** Hints for anyone (tired or returning players too). Only engine state, never the answers. */
export function genericHint(state: BattleState): CoachHint {
  const board = state.announced;
  if (board.length === 0) return { id: "g-empty", text: "Nothing to check. Tap **Next turn**.", target: "approve" };
  if (state.energy === 0) return { id: "g-energy", text: "Out of energy. Tap **Approve**.", target: "approve" };
  const unchecked = board.filter((id) => !state.steps[id]?.inspected).length;
  const canInspect = state.hand.some((c) => c.cardId === "inspect") && state.energy >= CARDS.inspect.cost;
  if (unchecked > 0 && canInspect) {
    if (board.length === 1) return { id: "g-check-one", text: "Check the plan: tap **Inspect**, then the plan.", target: "card:inspect" };
    return {
      id: "g-check",
      text: `${unchecked} ${unchecked === 1 ? "plan" : "plans"} not checked. Tap **Inspect**, then a plan.`,
      target: "card:inspect",
    };
  }
  if (unchecked > 0) {
    const escalate = state.hand.some((c) => c.cardId === "escalate");
    return {
      id: "g-no-inspect",
      text: escalate ? "No Inspect left. **Block**, **Escalate**, or **Approve**." : "No Inspect left. **Block** or **Approve**.",
      target: null,
    };
  }
  return { id: "g-checked", text: "All checked. Stop anything wrong, then tap **Approve**.", target: null };
}

export function shiftCoach(state: BattleState, enc: Encounter, ui: CoachUi & { firstShift: boolean }): CoachHint {
  if (state.status !== "playing") return { id: "end", text: "Tap **See how you did**.", target: null };
  if (ui.selectedCardId) return cardPrompt(state, enc, ui.selectedCardId);
  const generic = genericHint(state);
  // "Out of energy" and "No Inspect left" are what to do now: they beat any tip.
  if (ui.firstShift && generic.id !== "g-energy" && generic.id !== "g-no-inspect") {
    const tip = firstShiftTip(state, enc);
    if (tip) return tip;
  }
  return generic;
}

/** The hint inside the evidence sheet (practice only; the real shift shows the 3 questions). */
export function sheetCoach(
  state: BattleState,
  enc: Encounter,
  stepId: string,
  ui: Pick<CoachUi, "selectedCardId">,
): Pick<CoachHint, "text" | "target" | "lock"> | null {
  if (!enc.practice || !state.announced.includes(stepId)) return null;
  const { text, target, lock } = practiceCoach(state, enc, { selectedCardId: ui.selectedCardId, sheetStepId: stepId });
  return { text, target, lock };
}

/** The hint line for any encounter. */
export function coachHint(
  state: BattleState,
  enc: Encounter,
  ui: CoachUi & { firstShift: boolean },
): CoachHint {
  return enc.practice ? practiceCoach(state, enc, ui) : shiftCoach(state, enc, ui);
}

/**
 * Drill coach: the skill's "Where to look" line (the pathway's copy, from PathwayBundle.skill) for
 * the top of the evidence sheet, until the skill reaches Solid (level 3). It reads only the skill
 * id and level, never a step's `safe`, `redFlag`, `twist` or `direction`, so a safe and a risky
 * plan of the same skill get the same line.
 */
export function drillCoach(skill: MasterySkillId | undefined, level: SkillLevel = 0, whereToLook?: string): string | null {
  if (!skill || level >= 3 || !whereToLook) return null;
  return `Where to look: ${whereToLook}`;
}
