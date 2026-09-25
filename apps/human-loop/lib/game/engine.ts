/**
 * Battle rules engine — pure, deterministic, serializable.
 *
 * Rules (Slay-the-Spire style, oversight themed):
 * - Each turn: energy resets to encounter.energyPerTurn; the hand is discarded and
 *   handSize cards are drawn (reshuffle the discard pile into the draw pile with the
 *   seeded RNG when the draw pile runs out). Then any encounter.unlocks entry for this
 *   turn adds its cards to the hand as a bonus (they join the deck for good; no RNG is
 *   used). Then the agent announces the next actionsPerTurn[turn-1] steps from the
 *   queue (last value repeats). If the policy is on (powers.callbackPolicy), announced steps in
 *   the categories of the encounter's policy card (CARDS[id].autoInspect) are auto-inspected.
 * - Cards (lib/game/cards.ts):
 *   - inspect  (intent): reveal evidence; invalid on an already-inspected intent.
 *   - block    (intent): unsafe -> caught (removed, catches+1). Safe -> false alarm:
 *                        falseAlarms+1 and the step is appended to the end of the queue.
 *   - escalate (intent): the coach (Dana, Kofi) resolves correctly. Unsafe -> caught. Safe -> done,
 *                        progress credited. Never a false alarm.
 *   - rollback (executed): undo an executed, reversible step. Unsafe -> its risk is
 *                        removed and it no longer counts as a miss. Safe -> its progress
 *                        is removed and it counts as a false alarm.
 *   - policy cards (none, power, exhaust): any card with `autoInspect` (policy-callback:
 *                        credential; policy-look-first: endpoint + network). Turns on
 *                        powers.callbackPolicy (the saved name predates other policies) and
 *                        auto-inspects announced steps in those categories immediately.
 *                        An encounter's deck holds at most one distinct policy card
 *                        (policyCardOf); createBattle throws otherwise.
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
 *   seed, and the top of the draw pile is index 0. Unlocked cards continue the numbering in
 *   unlock order (by turn, then as listed), e.g. c8, c9, ...
 * - deckAtTurn(encounter, turn) is the whole deck on that turn: starterDeck + unlocks so far.
 * - createBattle already starts turn 1 (events: turn-start, energy, draw, announce...).
 * - A step whose Block was a false alarm keeps inspected=true when it comes back.
 * - A rolled-back step is resolved for good (status "rolled-back"); it is not re-queued.
 *   Rolling back a safe step emits "rolled-back" and then "false-alarm".
 * - Rolling back an unsafe step removes its risk and one miss; it is not counted as a
 *   catch (stats.rollbacks tracks it).
 * - Auto-inspections (policy cards) count toward stats.inspections.
 * - On a timeout the turn counter stays at maxTurns (it never exceeds maxTurns).
 * - Playing Coffee with nothing left to draw, or a policy card when the policy is already
 *   on (CARDS[id].alreadyOn), is refused so the player does not waste an exhaust card.
 * - endTurn on a finished battle returns the same state object unchanged.
 * - The "energy" event's amount is the energy after the turn-start reset.
 * - canResume(saved, encounter) says whether a saved battle still fits the current content.
 */
import { CARDS } from "./cards";
import { HEADLINES } from "./helpDeskDefaults";
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
  HeadlineKey,
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

const policyCache = new WeakMap<Encounter, CardId[]>();

/** Distinct policy cards (cards with autoInspect) in the encounter's whole deck. */
function policyCards(encounter: Encounter): CardId[] {
  let list = policyCache.get(encounter);
  if (!list) {
    list = [...new Set(deckAtTurn(encounter, encounter.maxTurns))].filter((id) => !!CARDS[id]?.autoInspect);
    policyCache.set(encounter, list);
  }
  return list;
}

/** The encounter's policy card (policy-callback on the help desk, policy-look-first in the SOC), or null. */
export function policyCardOf(encounter: Encounter): CardId | null {
  return policyCards(encounter)[0] ?? null;
}

function autoInspectPolicy(s: BattleState, encounter: Encounter, policy: CardId | null) {
  const categories = policy ? CARDS[policy]?.autoInspect : undefined;
  if (!categories?.length) return;
  for (const id of s.announced) {
    const rt = s.steps[id];
    if (!rt.inspected && categories.includes(stepDef(encounter, id).category)) {
      rt.inspected = true;
      s.stats.inspections++;
      emit(s, { t: "inspected", stepId: id, auto: true });
    }
  }
}

/** Unlock entries in the order their cards are numbered: by turn, then as authored. */
function sortedUnlocks(encounter: Encounter): { turn: number; cards: CardId[] }[] {
  return (encounter.unlocks ?? []).slice().sort((a, b) => a.turn - b.turn);
}

/** The whole deck on this turn: the starter deck plus every card unlocked so far. */
export function deckAtTurn(encounter: Encounter, turn: number): CardId[] {
  const deck = encounter.starterDeck.slice();
  for (const u of sortedUnlocks(encounter)) if (u.turn <= turn) deck.push(...u.cards);
  return deck;
}

/** Put this turn's unlocked cards into the hand, numbering them after every earlier card. */
function unlockCards(s: BattleState, encounter: Encounter) {
  let next = encounter.starterDeck.length;
  const added: CardId[] = [];
  for (const u of sortedUnlocks(encounter)) {
    if (u.turn < s.turn) next += u.cards.length;
    else if (u.turn === s.turn) {
      for (const cardId of u.cards) {
        next += 1;
        s.hand.push({ uid: `c${next}`, cardId });
        added.push(cardId);
      }
    }
  }
  if (added.length) emit(s, { t: "unlock", cardIds: added });
}

function startTurn(s: BattleState, encounter: Encounter) {
  s.turn += 1;
  emit(s, { t: "turn-start", turn: s.turn });

  s.energy = encounter.energyPerTurn;
  emit(s, { t: "energy", amount: s.energy });

  s.discardPile = s.discardPile.concat(s.hand);
  s.hand = [];
  emit(s, { t: "draw", count: drawCards(s, encounter.handSize) });
  unlockCards(s, encounter);

  const count = actionsForTurn(encounter, s.turn);
  for (let i = 0; i < count && s.queue.length > 0; i++) {
    const id = s.queue.shift() as string;
    s.announced.push(id);
    s.steps[id].status = "announced";
    emit(s, { t: "announce", stepId: id });
  }

  if (s.powers.callbackPolicy) autoInspectPolicy(s, encounter, policyCardOf(encounter));
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
  for (const u of encounter.unlocks ?? []) {
    if (!Number.isInteger(u.turn) || u.turn < 1 || u.turn > encounter.maxTurns) {
      throw new Error(`Encounter "${encounter.id}" unlocks cards on turn ${u.turn}, outside 1..${encounter.maxTurns}`);
    }
    for (const cardId of u.cards) {
      if (!CARDS[cardId]) throw new Error(`Encounter "${encounter.id}" unlocks unknown card "${cardId}"`);
    }
  }
  const policies = policyCards(encounter);
  if (policies.length > 1) {
    throw new Error(`Encounter "${encounter.id}" has ${policies.length} different policy cards (${policies.join(", ")}); use one`);
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

const STEP_STATUSES = new Set<string>(["queued", "announced", "executed", "blocked", "escalated", "rolled-back"]);

function isStepRuntime(value: unknown): value is StepRuntime {
  const rt = value as StepRuntime | null;
  return !!rt && typeof rt === "object" && STEP_STATUSES.has(rt.status) && typeof rt.inspected === "boolean";
}

/**
 * True when a saved battle (e.g. from localStorage) still fits this encounter and can be
 * resumed. False for other encounters, old save versions, or saves made before the
 * encounter's steps or deck changed (the deck must be starterDeck + the unlocks up to the saved
 * turn); start a fresh battle in that case.
 */
export function canResume(state: unknown, encounter: Encounter): state is BattleState {
  const s = state as BattleState | null;
  if (!s || typeof s !== "object" || s.version !== 1 || s.encounterId !== encounter.id) return false;
  if (!s.steps || typeof s.steps !== "object" || !Array.isArray(s.events) || typeof s.rng !== "number") return false;
  const piles = [s.drawPile, s.hand, s.discardPile, s.exhausted];
  if (!piles.every(Array.isArray) || !Array.isArray(s.queue) || !Array.isArray(s.announced)) return false;

  if (!s.powers || typeof s.powers !== "object" || !s.stats || typeof s.stats !== "object") return false;
  if (typeof s.turn !== "number" || typeof s.energy !== "number" || typeof s.risk !== "number") return false;

  const stepIds = Object.keys(s.steps).sort();
  const expected = encounter.steps.map((x) => x.id).sort();
  if (stepIds.length !== expected.length || stepIds.some((id, i) => id !== expected[i])) return false;
  const own = (id: unknown) => typeof id === "string" && Object.prototype.hasOwnProperty.call(s.steps, id);
  if (!Array.isArray(s.executedHistory ?? [])) return false;
  if (![...s.queue, ...s.announced, ...(s.executedHistory ?? [])].every(own)) return false;
  const rts: unknown[] = Object.values(s.steps);
  if (!rts.every((rt) => isStepRuntime(rt))) return false;

  const cards = piles.flat();
  if (!cards.every((c) => !!c && typeof c === "object" && typeof c.uid === "string")) return false;
  if (new Set(cards.map((c) => c.uid)).size !== cards.length) return false;
  const deck = cards.map((c) => c.cardId).sort();
  const expectedDeck = deckAtTurn(encounter, s.turn).sort();
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
    return fail(
      state.energy === 0
        ? "Out of energy. Tap “Approve”."
        : `Not enough energy. ${card.name} costs ${card.cost}.`,
    );
  }

  const problem = targetProblem(state, encounter, card, targetStepId);
  if (problem) return fail(problem);

  if (card.autoInspect && state.powers.callbackPolicy) return fail(card.alreadyOn ?? "That policy is already on.");
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

  if (card.autoInspect) {
    s.powers.callbackPolicy = true;
    emit(s, { t: "power", power: "callbackPolicy" });
    autoInspectPolicy(s, encounter, card.id);
    checkWin(s, encounter);
    return { ok: true, state: s };
  }

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

/** The default (Help Desk) headline pools; see helpDeskDefaults.ts. */
export { HEADLINES };

function headlinePool(encounter: Encounter, key: HeadlineKey): string[] {
  const own = encounter.headlines?.[key];
  return own?.length ? own : HEADLINES[key];
}

/** Deterministic pick (same battle, same line), with {agent} replaced by the agent's short name. */
function pick(list: string[], seed: number, agentName: string): string {
  const line = list[Math.floor(nextFloat(seedState(seed)).value * list.length)] ?? list[0];
  return line.split("{agent}").join(agentName.split(" ")[0] || agentName);
}

function headlineKey(status: BattleStatus, misses: number, falseAlarms: number, blind = 0): HeadlineKey {
  if (status === "lost-breach") return "breach";
  if (status === "lost-timeout") return "timeout";
  if (status === "playing") return "playing";
  if (misses === 0 && falseAlarms <= 1 && blind > 0) return "lucky";
  if (misses === 0) return falseAlarms === 0 ? "perfect" : falseAlarms === 1 ? "sharp" : "jumpy";
  return falseAlarms <= 1 ? "leaky" : "scraped";
}

/** Risky steps the player blocked without ever seeing their evidence (a guess, not a check). */
export function blindBlocks(state: BattleState, encounter: Encounter): string[] {
  return encounter.steps
    .filter((x) => !x.safe && state.steps[x.id]?.status === "blocked" && !state.steps[x.id]?.inspected)
    .map((x) => x.id);
}

/** Safe steps the player blocked before ever seeing their evidence (good work stopped on a guess). */
export function blindSafeBlocks(state: BattleState, encounter: Encounter): string[] {
  const safe = new Set(encounter.steps.filter((x) => x.safe).map((x) => x.id));
  const seen = new Set<string>();
  const out = new Set<string>();
  for (const ev of state.events) {
    if (ev.t === "inspected") seen.add(ev.stepId);
    else if (ev.t === "card-played" && ev.cardId === "block" && ev.targetStepId && safe.has(ev.targetStepId) && !seen.has(ev.targetStepId)) {
      out.add(ev.targetStepId);
    }
  }
  return [...out];
}

export function scoreBattle(state: BattleState, encounter: Encounter): BattleScore {
  const { catches, falseAlarms, misses } = state.stats;
  const won = state.status === "won";
  // The third star rewards checking before blocking: a risky plan blocked without inspecting it
  // (a lucky guess from its wording) does not count as careful oversight.
  const blind = blindBlocks(state, encounter).length;
  const careful = falseAlarms <= 1 && blind === 0;
  const stars = (won ? 1 + (misses === 0 ? 1 : 0) + (careful ? 1 : 0) : 0) as BattleScore["stars"];

  return {
    stars,
    catches,
    falseAlarms,
    misses,
    turnsUsed: Math.max(0, state.turn),
    headline: pick(headlinePool(encounter, headlineKey(state.status, misses, falseAlarms, blind)), state.seed, encounter.agent.name),
  };
}
