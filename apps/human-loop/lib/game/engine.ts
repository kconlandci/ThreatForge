/**
 * Battle rules engine — pure, deterministic, serializable.
 *
 * STUB: signatures are the contract; the engine owner implements the bodies.
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
 */
import type { BattleScore, BattleState, CardId, Encounter, PlayResult } from "./types";

export function createBattle(encounter: Encounter, seed: number): BattleState {
  void encounter;
  void seed;
  throw new Error("not implemented");
}

/** Step ids a card can legally target right now (empty for target "none"). */
export function validTargets(state: BattleState, encounter: Encounter, cardId: CardId): string[] {
  void state;
  void encounter;
  void cardId;
  throw new Error("not implemented");
}

/** Play the card with this uid from the hand. Returns ok:false with a player-facing reason when illegal. */
export function playCard(
  state: BattleState,
  encounter: Encounter,
  cardUid: string,
  targetStepId?: string,
): PlayResult {
  void state;
  void encounter;
  void cardUid;
  void targetStepId;
  throw new Error("not implemented");
}

/** Let the agent carry out every remaining announced intent, then start the next turn. */
export function endTurn(state: BattleState, encounter: Encounter): BattleState {
  void state;
  void encounter;
  throw new Error("not implemented");
}

export function scoreBattle(state: BattleState, encounter: Encounter): BattleScore {
  void state;
  void encounter;
  throw new Error("not implemented");
}
