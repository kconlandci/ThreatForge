"use client";

/**
 * React glue for the battle engine, plus pure helpers the battle UI shares:
 * - useBattle(): holds the BattleState, calls the engine, and reports every committed state.
 * - eventsToBeats(): turns new BattleEvents into "beats" (toast + log lines + stage messages).
 * - progress / debrief helpers used by the meters and the result screen.
 *
 * The helpers are pure so they can be unit tested without React.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentMood, ToStage } from "./bus";
import { CARDS } from "./cards";
import { deckAtTurn, endTurn as engineEndTurn, playCard as enginePlayCard } from "./engine";
import { gradePlan, type PlanGrade } from "./mastery";
import type {
  AgentStep,
  BattleEvent,
  BattleState,
  BattleStatus,
  CallGrade,
  CardId,
  CardInstance,
  Encounter,
  Evidence,
  PlayResult,
  StepRuntime,
} from "./types";

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export interface BattleApi {
  state: BattleState;
  /** Play a card from the hand. On success the new state is committed. */
  play: (cardUid: string, targetStepId?: string) => PlayResult;
  /** Let the agent run the announced intents and start the next turn. Returns the new state. */
  endTurn: () => BattleState;
}

export function useBattle(
  encounter: Encounter,
  initial: BattleState,
  onCommit?: (state: BattleState) => void,
): BattleApi {
  const [state, setState] = useState(initial);
  const ref = useRef(initial);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  const commit = useCallback((next: BattleState) => {
    ref.current = next;
    setState(next);
    onCommitRef.current?.(next);
  }, []);

  const play = useCallback(
    (cardUid: string, targetStepId?: string) => {
      const result = enginePlayCard(ref.current, encounter, cardUid, targetStepId);
      if (result.ok) commit(result.state);
      return result;
    },
    [encounter, commit],
  );

  const endTurn = useCallback(() => {
    const prev = ref.current;
    const next = engineEndTurn(prev, encounter);
    if (next !== prev) commit(next);
    return next;
  }, [encounter, commit]);

  return { state, play, endTurn };
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

const indexCache = new WeakMap<Encounter, Map<string, AgentStep>>();

export function stepById(encounter: Encounter, id: string): AgentStep | undefined {
  let map = indexCache.get(encounter);
  if (!map) {
    map = new Map(encounter.steps.map((s) => [s.id, s]));
    indexCache.set(encounter, map);
  }
  return map.get(id);
}

/** The first word of the agent's name, for short UI labels ("Ollie"; "Test Bot" -> "Test"). */
export function agentShortName(encounter: Encounter): string {
  return encounter.agent.name.split(" ")[0] || encounter.agent.name;
}

const RESOLVED: StepRuntime["status"][] = ["executed", "blocked", "escalated", "rolled-back"];

/** Steps that are done for good (the progress meter). */
export function resolvedCount(state: BattleState): number {
  return Object.values(state.steps).filter((s) => RESOLVED.includes(s.status)).length;
}

/** Step ids the callback policy inspected automatically. */
export function autoInspectedIds(state: BattleState): Set<string> {
  const ids = new Set<string>();
  for (const ev of state.events) if (ev.t === "inspected" && ev.auto) ids.add(ev.stepId);
  return ids;
}

export { deckAtTurn };

/** Fixed order of the hand's stacks: the core loop first, then the cards that unlock later. */
export const HAND_ORDER: CardId[] = ["inspect", "block", "escalate", "rollback", "policy-callback", "coffee"];

export interface HandStack {
  cardId: CardId;
  /** Uids of every copy in hand, in hand order. Playing the stack uses the first. */
  uids: string[];
}

/**
 * Group the hand into one stack per card type, in HAND_ORDER. Types in `last` (the cards that
 * are NEW this turn) go to the right end, so the new card is never half hidden in the fan.
 */
export function groupHand(hand: CardInstance[], last?: ReadonlySet<CardId>): HandStack[] {
  const by = new Map<CardId, string[]>();
  for (const c of hand) {
    const list = by.get(c.cardId);
    if (list) list.push(c.uid);
    else by.set(c.cardId, [c.uid]);
  }
  const all = [...HAND_ORDER, ...[...by.keys()].filter((id) => !HAND_ORDER.includes(id))];
  const order = last?.size ? [...all.filter((id) => !last.has(id)), ...all.filter((id) => last.has(id))] : all;
  return order.filter((id) => by.has(id)).map((cardId) => ({ cardId, uids: by.get(cardId) as string[] }));
}

/**
 * Cards that wear the NEW ribbon: unlocked at the start of this turn and not played yet. A card
 * unlocked on an earlier turn loses its ribbon, so ribbons never pile up in the hand.
 */
export function newCardIds(state: BattleState): Set<CardId> {
  const fresh = new Set<CardId>();
  const evs = eventsThisTurn(state);
  for (const ev of evs) if (ev.t === "unlock") ev.cardIds.forEach((id) => fresh.add(id));
  for (const ev of evs) if (ev.t === "card-played") fresh.delete(ev.cardId);
  return fresh;
}

/** Events since the current turn started (the turn-start event included). */
export function eventsThisTurn(state: BattleState): BattleEvent[] {
  for (let i = state.events.length - 1; i >= 0; i--) {
    if (state.events[i].t === "turn-start") return state.events.slice(i);
  }
  return state.events;
}

/** Card types unlocked at the start of the current turn. */
export function unlockedThisTurn(state: BattleState): CardId[] {
  return eventsThisTurn(state).flatMap((ev) => (ev.t === "unlock" ? ev.cardIds : []));
}

/** New events since `prev` (the engine only ever appends). */
export function newEvents(prev: BattleState, next: BattleState): BattleEvent[] {
  return next.events.slice(prev.events.length);
}

/* ------------------------------------------------------------------ */
/* Beats                                                               */
/* ------------------------------------------------------------------ */

export type ToastTone = "good" | "bad" | "warn" | "info" | "hint";

export interface ToastSpec {
  tone: ToastTone;
  title: string;
  text: string;
  /** Small tag, e.g. "Risk +5". */
  meta?: string;
  stepId?: string;
}

export interface Beat {
  /** player = a card play; agent = one executed intent; turn = a new turn; end = battle over. */
  kind: "player" | "agent" | "turn" | "end";
  toast?: ToastSpec;
  /** Screen-reader log lines (also the history). */
  log: string[];
  /** Messages for the Phaser stage. */
  stage: ToStage[];
  /** agent beats: the step that just ran, how much risk it added, and whether it was safe. */
  stepId?: string;
  risk?: number;
  safe?: boolean;
  /** turn beats: the new turn number and how many intents were announced. */
  turn?: number;
  announced?: number;
  /** turn beats: cards that joined the hand (and the deck) this turn. */
  unlocked?: CardId[];
  /** player beats: open the evidence panel for this step (a manual Inspect). */
  openEvidence?: string;
  status?: BattleStatus;
}

const fx = (name: Extract<ToStage, { type: "fx" }>["fx"], intensity?: number): ToStage =>
  intensity === undefined ? { type: "fx", fx: name } : { type: "fx", fx: name, intensity };
const mood = (m: AgentMood): ToStage => ({ type: "agent-mood", mood: m });

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Group new engine events into beats the UI plays one at a time.
 * A card play becomes one "player" beat; endTurn becomes one "agent" beat per executed
 * intent, then a "turn" beat (or an "end" beat when the battle is over).
 */
export function eventsToBeats(events: BattleEvent[], encounter: Encounter): Beat[] {
  const beats: Beat[] = [];
  const agent = agentShortName(encounter);
  let cur: Beat | null = null;
  const start = (b: Beat) => {
    beats.push(b);
    cur = b;
    return b;
  };
  const current = (): Beat => cur ?? start({ kind: "player", log: [], stage: [] });
  const intentOf = (id: string) => stepById(encounter, id)?.intent ?? "that plan";

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const step = "stepId" in ev ? stepById(encounter, ev.stepId) : undefined;
    switch (ev.t) {
      case "card-played": {
        const card = CARDS[ev.cardId];
        start({
          kind: "player",
          log: [`You played ${card.name}${ev.targetStepId ? ` on "${intentOf(ev.targetStepId)}"` : ""}.`],
          stage: [],
        });
        break;
      }
      case "inspected": {
        const b = current();
        if (ev.auto) {
          b.log.push(`Policy check: "${intentOf(ev.stepId)}" was inspected automatically.`);
        } else {
          const n = step?.evidence.length ?? 0;
          b.log.push(`Evidence found: ${n} ${n === 1 ? "clue" : "clues"} for "${intentOf(ev.stepId)}".`);
          b.stage.push(fx("inspect", 0.6));
          b.openEvidence = ev.stepId;
        }
        break;
      }
      case "caught": {
        const b = current();
        const byDana = ev.by === "escalate";
        const text = (byDana ? step?.outcome.escalated : step?.outcome.blocked) ?? "Stopped.";
        b.toast = {
          tone: "good",
          title: byDana ? "Dana caught it!" : "Caught!",
          text,
          stepId: ev.stepId,
        };
        b.log.push(`${byDana ? "Dana caught it" : "Caught"}: "${intentOf(ev.stepId)}". ${text}`);
        b.stage.push(byDana ? fx("escalate", 0.7) : fx("catch", clamp01(0.5 + (step?.risk ?? 3) / encounter.maxRisk)));
        break;
      }
      case "false-alarm": {
        const b = current();
        const afterRollback = events[i - 1]?.t === "rolled-back";
        if (afterRollback) {
          const text = step?.outcome.rolledBack ?? "You undid work that was fine.";
          b.toast = { tone: "warn", title: "Rolled back good work.", text, meta: "False alarm", stepId: ev.stepId };
          b.log.push(`False alarm: you rolled back "${intentOf(ev.stepId)}", which was fine. ${text}`);
        } else {
          const text = step?.outcome.blocked ?? "That one was fine.";
          b.toast = { tone: "warn", title: "False alarm.", text: `${text} It goes back in line.`, stepId: ev.stepId };
          b.log.push(`False alarm: "${intentOf(ev.stepId)}" was fine. It goes back in line. ${text}`);
        }
        b.stage.push(fx("false-alarm", 0.6));
        break;
      }
      case "escalated-safe": {
        const b = current();
        const text = step?.outcome.escalated ?? "Dana handled it.";
        b.toast = { tone: "info", title: "Escalated. It was fine.", text, stepId: ev.stepId };
        b.log.push(`Escalated "${intentOf(ev.stepId)}". It was fine. ${text}`);
        b.stage.push(fx("escalate", 0.5));
        break;
      }
      case "rolled-back": {
        const b = current();
        b.stage.push(fx("rollback", 0.7));
        if (ev.riskRemoved > 0 || !stepById(encounter, ev.stepId)?.safe) {
          const text = step?.outcome.rolledBack ?? "Undone.";
          b.toast = {
            tone: "good",
            title: "Rolled back!",
            text,
            meta: ev.riskRemoved > 0 ? `Risk −${ev.riskRemoved}` : undefined,
            stepId: ev.stepId,
          };
          b.log.push(`Rolled back "${intentOf(ev.stepId)}". Risk down ${ev.riskRemoved}. ${text}`);
        }
        break;
      }
      case "power": {
        const b = current();
        b.toast = {
          tone: "info",
          title: "Policy: Callback is on",
          text: "From now on, password, MFA, and unlock plans get inspected automatically.",
        };
        b.log.push("Policy: Callback is on. Password, MFA, and unlock plans get inspected automatically.");
        b.stage.push(fx("inspect", 0.4));
        break;
      }
      case "draw": {
        const b = cur as Beat | null;
        if (b && b.kind === "player") {
          b.toast = {
            tone: "info",
            title: "Coffee break",
            text: ev.count === 1 ? "You drew 1 card." : `You drew ${ev.count} cards.`,
          };
          b.log.push(`You drew ${ev.count} ${ev.count === 1 ? "card" : "cards"}.`);
        }
        break;
      }
      case "executed": {
        const text = ev.safe ? step?.outcome.executed ?? "Done." : step?.outcome.executed ?? "That went badly.";
        start({
          kind: "agent",
          stepId: ev.stepId,
          risk: ev.risk,
          safe: ev.safe,
          toast: ev.safe
            ? { tone: "good", title: "Done.", text, stepId: ev.stepId }
            : { tone: "bad", title: "Oops.", text, meta: `Risk +${ev.risk}`, stepId: ev.stepId },
          log: [
            ev.safe
              ? `${agent} did it: "${intentOf(ev.stepId)}". ${text}`
              : `${agent} did it: "${intentOf(ev.stepId)}". That was risky. Risk up ${ev.risk}. ${text}`,
          ],
          stage: ev.safe
            ? [fx("execute-safe", 0.6)]
            : [fx("risk", clamp01(0.35 + ev.risk / encounter.maxRisk))],
        });
        break;
      }
      case "turn-start": {
        start({
          kind: "turn",
          turn: ev.turn,
          announced: 0,
          log: [`Turn ${ev.turn} of ${encounter.maxTurns}.`],
          stage: [],
        });
        break;
      }
      case "announce": {
        const b = current();
        b.announced = (b.announced ?? 0) + 1;
        b.log.push(`${agent} plans to: ${intentOf(ev.stepId)} (${step?.ticket ?? ""}).`);
        break;
      }
      case "unlock": {
        const b = current();
        b.unlocked = [...(b.unlocked ?? []), ...ev.cardIds];
        for (const id of ev.cardIds) b.log.push(`New card: ${CARDS[id]?.name ?? id}.`);
        break;
      }
      case "energy":
        break;
      case "end": {
        const won = ev.status === "won";
        start({
          kind: "end",
          status: ev.status,
          log: [
            won
              ? "Shift complete!"
              : ev.status === "lost-breach"
                ? "Breach! Risk hit the limit."
                : "Out of time. The shift is over.",
          ],
          stage: [fx(won ? "win" : "lose", 1), mood(won ? "celebrate" : ev.status === "lost-breach" ? "busted" : "sad")],
        });
        break;
      }
    }
  }

  // A turn beat sets the agent's resting mood for the new turn.
  for (const b of beats) {
    if (b.kind === "turn") b.stage.push(mood((b.announced ?? 0) > 0 ? "eager" : "idle"));
  }
  return beats;
}

/**
 * How long a toast stays up: enough time to read it for slow readers and ESL learners
 * (about 120 words a minute). The toast also pauses while it is hovered, touched or focused.
 */
export function readingMs(toast: ToastSpec | undefined, min = 3200, max = 15000): number {
  if (!toast) return min;
  const chars = toast.title.length + toast.text.length;
  return Math.max(min, Math.min(max, 1500 + chars * 80));
}

/* ------------------------------------------------------------------ */
/* Debrief                                                             */
/* ------------------------------------------------------------------ */

export type Grade = "good" | "ok" | "bad" | "none";

const GRADE_OF: Record<CallGrade, Grade> = { R: "good", P: "ok", W: "bad" };

export interface DebriefRow {
  step: AgentStep;
  runtime: StepRuntime;
  /** How it ended, in plain words. */
  resolution: string;
  /** From mastery.gradePlan (R good, P ok, W bad), so the debrief, results and skills agree. */
  grade: Grade;
  /** The full grade: result, short reason ("Lucky guess") and skill calls. */
  plan: PlanGrade;
  redFlags: Evidence[];
}

function resolutionText(step: AgentStep, runtime: StepRuntime, agent: string): string {
  const falseBlocks =
    runtime.requeues > 0 ? ` You blocked it ${runtime.requeues === 1 ? "once" : `${runtime.requeues} times`} first.` : "";
  if (step.safe) {
    switch (runtime.status) {
      case "executed":
        return `You approved it.${falseBlocks}`;
      case "escalated":
        return `You escalated it. Dana said it was fine.${falseBlocks}`;
      case "rolled-back":
        return "You rolled it back. That undid good work.";
      default:
        return `It never got done.${falseBlocks}`;
    }
  }
  switch (runtime.status) {
    case "blocked":
      return runtime.inspected
        ? "You blocked it. Caught!"
        : "You blocked it without looking at the evidence. Caught, but it was a lucky guess.";
    case "escalated":
      return runtime.inspected
        ? "You escalated it. Dana caught it."
        : "You escalated it without looking at the evidence. Dana did the check.";
    case "rolled-back":
      return "It got through, then you rolled it back.";
    case "executed":
      return `${agent} did it. It got through.`;
    default:
      return "The shift ended before it came up.";
  }
}

export function debriefRows(state: BattleState, encounter: Encounter): DebriefRow[] {
  const agent = agentShortName(encounter);
  return encounter.steps.map((step) => {
    const runtime: StepRuntime = state.steps[step.id] ?? {
      stepId: step.id,
      status: "queued",
      inspected: false,
      requeues: 0,
      resolvedOnTurn: null,
    };
    const plan = gradePlan(step, runtime);
    return {
      step,
      runtime,
      resolution: resolutionText(step, runtime, agent),
      grade: plan.result ? GRADE_OF[plan.result] : "none",
      plan,
      redFlags: step.evidence.filter((e) => e.redFlag),
    };
  });
}
