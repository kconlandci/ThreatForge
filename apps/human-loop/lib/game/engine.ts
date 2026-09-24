/**
 * Battle rules engine — pure, deterministic, serializable.
 *
 * Rules (Slay-the-Spire style, oversight themed):
 * - Each turn: energy resets to encounter.energyPerTurn; the hand is discarded and
 *   handSize cards are drawn (reshuffle the discard pile into the draw pile with the
 *   seeded RNG when the draw pile runs out); the agent announces the next
 *   actionsPerTurn[turn-1] steps from the queue (last value repeats). If the
 *   callback policy is active, announced "credential" steps are auto-inspected.
 * - Cards (lib/game/cards.ts):
 *   - inspect  (intent): reveal evidence; invalid on an already-inspected intent.
 *   - block    (intent): unsafe -> caught (removed, catches+1). Safe -> false alarm:
 *                        falseAlarms+1 and the step is appended to the end of the queue.
 *   - escalate (intent): Dana resolves correctly. Unsafe -> caught. Safe -> done,
 *                        progress credited. Never a false alarm.
 *   - rollback (executed): undo an executed, reversible step. Unsafe -> its risk is
 *                        removed and it no longer counts as a miss. Safe -> its progress
 *                        is removed and it counts as a false alarm.
 *   - policy-callback (none, power, exhaust): turns on powers.callbackPolicy and
 *                        auto-inspects any announced credential steps immediately.
 *   - coffee   (none, exhaust): draw 2.
 * - endTurn: every still-announced step executes in order. Safe -> progress; unsafe ->
 *   risk (+misses). Then the next turn starts.
 * - Win: queue and announced are both empty (every step resolved) and risk < maxRisk.
 * - Loss: risk >= maxRisk -> "lost-breach" immediately. If the shift is over
 *   (turn > maxTurns at the start of a new turn) and the battle is not won -> "lost-timeout".
 * - Every mutation appends BattleEvents; never removes old ones.
 * - Never mutate the input state; return a new object.
 *
 * Implementation notes (details the rules above leave open):
 * - Card uids are "c1", "c2", ... in starterDeck order; the draw pile is shuffled from the
 *   seed, and the top of the draw pile is index 0.
 * - createBattle already starts turn 1 (events: turn-start, energy, draw, announce...).
 * - A step whose Block was a false alarm keeps inspected=true when it comes back.
 * - A rolled-back step is resolved for good (status "rolled-back"); it is not re-queued.
 *   Rolling back a safe step emits "rolled-back" and then "false-alarm".
 * - Rolling back an unsafe step removes its risk and one miss; it is not counted as a
 *   catch (stats.rollbacks tracks it).
 * - Auto-inspections (callback policy) count toward stats.inspections.
 * - On a timeout the turn counter stays at maxTurns (it never exceeds maxTurns).
 * - Playing Coffee with nothing left to draw, or the callback policy when it is already
 *   on, is refused so the player does not waste an exhaust card.
 * - endTurn on a finished battle returns the same state object unchanged.
 * - The "energy" event's amount is the energy after the turn-start reset.
 * - canResume(saved, encounter) says whether a saved battle still fits the current content.
 */
import { CARDS } from "./cards";
import { nextFloat, seedState, shuffle } from "./rng";
import type {
  AgentStep,
  BattleEvent,
  BattleScore,
  BattleState,
  BattleStatus,
  CardDef,
  CardId,
  CardInstance,
  Encounter,
  PlayResult,
  StepRuntime,
} from "./types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const stepIndexCache = new WeakMap<Encounter, Map<string, AgentStep>>();

function stepIndex(encounter: Encounter): Map<string, AgentStep> {
  let index = stepIndexCache.get(encounter);
  if (!index) {
    index = new Map(encounter.steps.map((s) => [s.id, s]));
    stepIndexCache.set(encounter, index);
  }
  return index;
}

function stepDef(encounter: Encounter, stepId: string): AgentStep {
  const def = stepIndex(encounter).get(stepId);
  if (!def) throw new Error(`Unknown step "${stepId}" in encounter "${encounter.id}"`);
  return def;
}

/**
 * Copy everything the engine may change. Card instances and events are never mutated,
 * so they are shared between the old and the new state.
 */
function cloneState(s: BattleState): BattleState {
  const steps: Record<string, StepRuntime> = {};
  for (const key of Object.keys(s.steps)) steps[key] = { ...s.steps[key] };
  return {
    ...s,
    drawPile: s.drawPile.slice(),
    hand: s.hand.slice(),
    discardPile: s.discardPile.slice(),
    exhausted: s.exhausted.slice(),
    queue: s.queue.slice(),
    announced: s.announced.slice(),
    steps,
    executedHistory: s.executedHistory.slice(),
    powers: { ...s.powers },
    events: s.events.slice(),
    stats: { ...s.stats },
  };
}

function emit(s: BattleState, event: BattleEvent) {
  s.events.push(event);
}

function finish(s: BattleState, status: BattleStatus) {
  s.status = status;
  emit(s, { t: "end", status });
}

function actionsForTurn(encounter: Encounter, turn: number): number {
  const list = encounter.actionsPerTurn;
  if (list.length === 0) return 1;
  return Math.max(0, list[Math.min(turn - 1, list.length - 1)] ?? 0);
}

/** Draw up to n cards, reshuffling the discard pile when the draw pile runs out. Returns cards drawn. */
function drawCards(s: BattleState, n: number): number {
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (s.drawPile.length === 0) {
      if (s.discardPile.length === 0) break;
      const r = shuffle(s.discardPile, s.rng);
      s.drawPile = r.items;
      s.rng = r.state;
      s.discardPile = [];
    }
    const card = s.drawPile.shift();
    if (!card) break;
    s.hand.push(card);
    drawn++;
  }
  return drawn;
}

function autoInspectCredentials(s: BattleState, encounter: Encounter) {
  for (const id of s.announced) {
    const rt = s.steps[id];
    if (!rt.inspected && stepDef(encounter, id).category === "credential") {
      rt.inspected = true;
      s.stats.inspections++;
      emit(s, { t: "inspected", stepId: id, auto: true });
    }
  }
}

function startTurn(s: BattleState, encounter: Encounter) {
  s.turn += 1;
  emit(s, { t: "turn-start", turn: s.turn });

  s.energy = encounter.energyPerTurn;
  emit(s, { t: "energy", amount: s.energy });

  s.discardPile = s.discardPile.concat(s.hand);
  s.hand = [];
  emit(s, { t: "draw", count: drawCards(s, encounter.handSize) });

  const count = actionsForTurn(encounter, s.turn);
  for (let i = 0; i < count && s.queue.length > 0; i++) {
    const id = s.queue.shift() as string;
    s.announced.push(id);
    s.steps[id].status = "announced";
    emit(s, { t: "announce", stepId: id });
  }

  if (s.powers.callbackPolicy) autoInspectCredentials(s, encounter);
}

/** Sets status "won" when every step is resolved and risk is under the limit. */
function checkWin(s: BattleState, encounter: Encounter): boolean {
  if (s.status !== "playing") return false;
  if (s.queue.length === 0 && s.announced.length === 0 && s.risk < encounter.maxRisk) {
    finish(s, "won");
    return true;
  }
  return false;
}

function removeAnnounced(s: BattleState, stepId: string) {
  s.announced = s.announced.filter((id) => id !== stepId);
}

function fail(reason: string): PlayResult {
  return { ok: false, reason };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function createBattle(encounter: Encounter, seed: number): BattleState {
  if (encounter.steps.length === 0) throw new Error(`Encounter "${encounter.id}" has no steps`);
  if (stepIndex(encounter).size !== encounter.steps.length) {
    throw new Error(`Encounter "${encounter.id}" has duplicate step ids`);
  }
  for (const cardId of encounter.starterDeck) {
    if (!CARDS[cardId]) throw new Error(`Encounter "${encounter.id}" uses unknown card "${cardId}"`);
  }

  const deck: CardInstance[] = encounter.starterDeck.map((cardId, i) => ({ uid: `c${i + 1}`, cardId }));
  const normalizedSeed = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
  const shuffled = shuffle(deck, seedState(normalizedSeed));

  const steps: Record<string, StepRuntime> = {};
  for (const step of encounter.steps) {
    steps[step.id] = { stepId: step.id, status: "queued", inspected: false, requeues: 0, resolvedOnTurn: null };
  }

  const state: BattleState = {
    version: 1,
    encounterId: encounter.id,
    seed: normalizedSeed,
    rng: shuffled.state,
    turn: 0,
    energy: 0,
    risk: 0,
    progress: 0,
    drawPile: shuffled.items,
    hand: [],
    discardPile: [],
    exhausted: [],
    queue: encounter.steps.map((s) => s.id),
    announced: [],
    steps,
    executedHistory: [],
    powers: { callbackPolicy: false },
    status: "playing",
    events: [],
    stats: { catches: 0, falseAlarms: 0, misses: 0, inspections: 0, escalations: 0, rollbacks: 0 },
  };
  startTurn(state, encounter);
  return state;
}

/**
 * True when a saved battle (e.g. from localStorage) still fits this encounter and can be
 * resumed. False for other encounters, old save versions, or saves made before the
 * encounter's steps or deck changed; start a fresh battle in that case.
 */
export function canResume(state: unknown, encounter: Encounter): state is BattleState {
  const s = state as BattleState | null;
  if (!s || typeof s !== "object" || s.version !== 1 || s.encounterId !== encounter.id) return false;
  if (!s.steps || typeof s.steps !== "object" || !Array.isArray(s.events) || typeof s.rng !== "number") return false;
  const piles = [s.drawPile, s.hand, s.discardPile, s.exhausted];
  if (!piles.every(Array.isArray) || !Array.isArray(s.queue) || !Array.isArray(s.announced)) return false;

  const stepIds = Object.keys(s.steps).sort();
  const expected = encounter.steps.map((x) => x.id).sort();
  if (stepIds.length !== expected.length || stepIds.some((id, i) => id !== expected[i])) return false;
  if (![...s.queue, ...s.announced, ...(s.executedHistory ?? [])].every((id) => id in s.steps)) return false;

  const deck = piles.flat().map((c) => c?.cardId).sort();
  const expectedDeck = encounter.starterDeck.slice().sort();
  return deck.length === expectedDeck.length && deck.every((id, i) => id === expectedDeck[i]);
}

/** Step ids a card can legally target right now (empty for target "none"). */
export function validTargets(state: BattleState, encounter: Encounter, cardId: CardId): string[] {
  if (state.status !== "playing") return [];
  const card = CARDS[cardId];
  if (!card) return [];
  switch (card.target) {
    case "intent":
      return cardId === "inspect"
        ? state.announced.filter((id) => !state.steps[id]?.inspected)
        : state.announced.slice();
    case "executed": {
      const seen = new Set<string>();
      return state.executedHistory.filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return state.steps[id]?.status === "executed" && stepDef(encounter, id).reversible;
      });
    }
    default:
      return [];
  }
}

function targetProblem(state: BattleState, encounter: Encounter, card: CardDef, targetStepId?: string): string | null {
  if (card.target === "none") return null;
  if (!targetStepId) {
    return card.target === "intent" ? `Pick an intent to ${card.name.toLowerCase()}.` : "Pick an action to undo.";
  }
  if (validTargets(state, encounter, card.id).includes(targetStepId)) return null;

  const agent = encounter.agent.name;
  const rt = state.steps[targetStepId];
  if (card.target === "intent") {
    if (!rt || !state.announced.includes(targetStepId)) return "That intent isn't on the board right now.";
    return "You already inspected that one.";
  }
  if (!rt || rt.status !== "executed") {
    return rt?.status === "rolled-back"
      ? "You already rolled that one back."
      : `Roll Back only works on actions ${agent} already took.`;
  }
  return "That one can't be undone. No Ctrl+Z here.";
}

/** Play the card with this uid from the hand. Returns ok:false with a player-facing reason when illegal. */
export function playCard(
  state: BattleState,
  encounter: Encounter,
  cardUid: string,
  targetStepId?: string,
): PlayResult {
  if (state.status !== "playing") return fail("The shift is over.");
  if (state.encounterId !== encounter.id) return fail("This battle belongs to a different shift.");

  const handIndex = state.hand.findIndex((c) => c.uid === cardUid);
  if (handIndex < 0) return fail("That card isn't in your hand.");
  const instance = state.hand[handIndex];
  const card = CARDS[instance.cardId];
  if (!card) return fail("That card doesn't exist.");

  if (card.cost > state.energy) {
    return fail(state.energy === 0 ? "You're out of energy. End your turn." : `Not enough energy. ${card.name} costs ${card.cost}.`);
  }

  const problem = targetProblem(state, encounter, card, targetStepId);
  if (problem) return fail(problem);

  if (card.id === "policy-callback" && state.powers.callbackPolicy) return fail("The callback policy is already on.");
  if (card.id === "coffee" && state.drawPile.length === 0 && state.discardPile.length === 0) {
    return fail("No cards left to draw. Save the coffee.");
  }

  const s = cloneState(state);
  s.hand.splice(handIndex, 1);
  s.energy -= card.cost;
  if (card.exhaust) s.exhausted.push(instance);
  else s.discardPile.push(instance);

  const target = card.target === "none" ? undefined : targetStepId;
  emit(s, target ? { t: "card-played", cardId: card.id, targetStepId: target } : { t: "card-played", cardId: card.id });

  switch (card.id) {
    case "inspect": {
      const id = target as string;
      s.steps[id].inspected = true;
      s.stats.inspections++;
      emit(s, { t: "inspected", stepId: id, auto: false });
      break;
    }
    case "block": {
      const id = target as string;
      const def = stepDef(encounter, id);
      const rt = s.steps[id];
      removeAnnounced(s, id);
      if (def.safe) {
        rt.status = "queued";
        rt.requeues++;
        s.queue.push(id);
        s.stats.falseAlarms++;
        emit(s, { t: "false-alarm", stepId: id });
      } else {
        rt.status = "blocked";
        rt.resolvedOnTurn = s.turn;
        s.stats.catches++;
        emit(s, { t: "caught", stepId: id, by: "block" });
      }
      break;
    }
    case "escalate": {
      const id = target as string;
      const def = stepDef(encounter, id);
      const rt = s.steps[id];
      removeAnnounced(s, id);
      rt.status = "escalated";
      rt.resolvedOnTurn = s.turn;
      s.stats.escalations++;
      if (def.safe) {
        s.progress += def.progress;
        emit(s, { t: "escalated-safe", stepId: id, progress: def.progress });
      } else {
        s.stats.catches++;
        emit(s, { t: "caught", stepId: id, by: "escalate" });
      }
      break;
    }
    case "rollback": {
      const id = target as string;
      const def = stepDef(encounter, id);
      const rt = s.steps[id];
      rt.status = "rolled-back";
      rt.resolvedOnTurn = s.turn;
      s.stats.rollbacks++;
      if (def.safe) {
        const progressRemoved = Math.min(def.progress, s.progress);
        s.progress -= progressRemoved;
        s.stats.falseAlarms++;
        emit(s, { t: "rolled-back", stepId: id, riskRemoved: 0, progressRemoved });
        emit(s, { t: "false-alarm", stepId: id });
      } else {
        const riskRemoved = Math.min(def.risk, s.risk);
        s.risk -= riskRemoved;
        s.stats.misses = Math.max(0, s.stats.misses - 1);
        emit(s, { t: "rolled-back", stepId: id, riskRemoved, progressRemoved: 0 });
      }
      break;
    }
    case "policy-callback": {
      s.powers.callbackPolicy = true;
      emit(s, { t: "power", power: "callbackPolicy" });
      autoInspectCredentials(s, encounter);
      break;
    }
    case "coffee": {
      emit(s, { t: "draw", count: drawCards(s, 2) });
      break;
    }
  }

  checkWin(s, encounter);
  return { ok: true, state: s };
}

/** Let the agent carry out every remaining announced intent, then start the next turn. */
export function endTurn(state: BattleState, encounter: Encounter): BattleState {
  if (state.status !== "playing") return state;
  const s = cloneState(state);

  while (s.announced.length > 0) {
    const id = s.announced.shift() as string;
    const def = stepDef(encounter, id);
    const rt = s.steps[id];
    rt.status = "executed";
    rt.resolvedOnTurn = s.turn;
    s.executedHistory.push(id);
    if (def.safe) {
      s.progress += def.progress;
      emit(s, { t: "executed", stepId: id, safe: true, risk: 0, progress: def.progress });
    } else {
      s.risk += def.risk;
      s.stats.misses++;
      emit(s, { t: "executed", stepId: id, safe: false, risk: def.risk, progress: 0 });
      if (s.risk >= encounter.maxRisk) {
        finish(s, "lost-breach");
        return s;
      }
    }
  }

  if (checkWin(s, encounter)) return s;
  if (s.turn >= encounter.maxTurns) {
    finish(s, "lost-timeout");
    return s;
  }
  startTurn(s, encounter);
  // A turn with nothing left to announce cannot happen while playing (that would be a win),
  // but guard anyway so the battle never gets stuck.
  checkWin(s, encounter);
  return s;
}

type HeadlineKey = "perfect" | "sharp" | "jumpy" | "leaky" | "scraped" | "breach" | "timeout" | "playing";

const HEADLINES: Record<HeadlineKey, string[]> = {
  /** 3 stars, no misses, no false alarms. */
  perfect: [
    "Flawless shift. {agent} wants your autograph.",
    "Zero misses. Zero false alarms. Dana almost smiled.",
    "Perfect shift. {agent} is writing you a thank-you haiku.",
  ],
  /** 3 stars with one false alarm. */
  sharp: [
    "Nothing got past you. One flinch. We'll allow it.",
    "Sharp shift. One false alarm. Dana is counting.",
  ],
  /** Won, nothing bad got through, but lots of false alarms. */
  jumpy: [
    "Nothing bad got through. A lot of good stuff didn't either.",
    "Safe shift. The ticket queue took the scenic route.",
  ],
  /** Won, few false alarms, but something bad got through. */
  leaky: [
    "Good calls, mostly. Something slipped past you.",
    "You won, but something got through. Check the debrief.",
  ],
  /** Won with misses and false alarms. */
  scraped: [
    "You made it. The ticket queue has questions.",
    "A win is a win. Dana is refilling her tea.",
  ],
  breach: [
    "{agent} did the wrong thing. Confidently.",
    "Breach! {agent} says it was mostly a good idea.",
    "Risk maxed out. Every phone in the office is ringing.",
  ],
  timeout: [
    "Shift over. The tickets won this round.",
    "Out of time. The queue is still blinking at you.",
  ],
  playing: ["Shift in progress."],
};

/** Deterministic pick (same battle, same line), with {agent} replaced by the agent's short name. */
function pick(list: string[], seed: number, agentName: string): string {
  const line = list[Math.floor(nextFloat(seedState(seed)).value * list.length)] ?? list[0];
  return line.split("{agent}").join(agentName.split(" ")[0] || agentName);
}

function headlineKey(status: BattleStatus, misses: number, falseAlarms: number): HeadlineKey {
  if (status === "lost-breach") return "breach";
  if (status === "lost-timeout") return "timeout";
  if (status === "playing") return "playing";
  if (misses === 0) return falseAlarms === 0 ? "perfect" : falseAlarms === 1 ? "sharp" : "jumpy";
  return falseAlarms <= 1 ? "leaky" : "scraped";
}

export function scoreBattle(state: BattleState, encounter: Encounter): BattleScore {
  const { catches, falseAlarms, misses } = state.stats;
  const won = state.status === "won";
  const stars = (won ? 1 + (misses === 0 ? 1 : 0) + (falseAlarms <= 1 ? 1 : 0) : 0) as BattleScore["stars"];

  return {
    stars,
    catches,
    falseAlarms,
    misses,
    turnsUsed: Math.max(0, state.turn),
    headline: pick(HEADLINES[headlineKey(state.status, misses, falseAlarms)], state.seed, encounter.agent.name),
  };
}
