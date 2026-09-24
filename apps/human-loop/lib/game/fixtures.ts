/**
 * Battle fixtures for building and screenshotting the battle UI.
 *
 * Every fixture is produced by driving the real engine with a scripted player, so the
 * states are always valid for the current content. `fixtureBattle(name)` is used by the
 * dev-only `?fixture=` switch on /play/help-desk (see components/game/GameShell.tsx).
 */
import { CARDS } from "./cards";
import { HELP_DESK_ENCOUNTER } from "./content";
import { createBattle, endTurn, playCard, validTargets } from "./engine";
import type { BattleState, CardId, Encounter } from "./types";

export type FixtureName = "start" | "mid" | "rollback" | "won" | "lost" | "timeout";
export const FIXTURE_NAMES: FixtureName[] = ["start", "mid", "rollback", "won", "lost", "timeout"];

type Policy = (s: BattleState, e: Encounter) => BattleState;

/** Play the first card of `cardId` in hand on `target` (or the first valid target). */
export function tryPlay(s: BattleState, e: Encounter, cardId: CardId, target?: string): BattleState {
  const card = s.hand.find((c) => c.cardId === cardId);
  if (!card) return s;
  const targets = validTargets(s, e, cardId);
  const t = CARDS[cardId].target === "none" ? undefined : target ?? targets[0];
  if (CARDS[cardId].target !== "none" && (!t || !targets.includes(t))) return s;
  const r = playCard(s, e, card.uid, t);
  return r.ok ? r.state : s;
}

/** A careful player that knows the answers: inspect, then block or escalate the unsafe plans. */
const perfectTurn: Policy = (start, e) => {
  let s = start;
  for (const id of s.announced.slice()) {
    const step = e.steps.find((x) => x.id === id);
    if (!step || step.safe) continue;
    const before = s;
    s = tryPlay(s, e, "block", id);
    if (s === before) s = tryPlay(s, e, "escalate", id);
  }
  for (const id of s.announced.slice()) s = tryPlay(s, e, "inspect", id);
  return s;
};

/** A player who trusts the robot completely. */
const trustingTurn: Policy = (s) => s;

/** A player who blocks everything they can. */
const jumpyTurn: Policy = (start, e) => {
  let s = start;
  for (const id of s.announced.slice()) s = tryPlay(s, e, "block", id);
  return s;
};

function run(seed: number, policy: Policy, e: Encounter, maxTurns = 20): BattleState {
  let s = createBattle(e, seed);
  for (let i = 0; i < maxTurns && s.status === "playing"; i++) {
    s = policy(s, e);
    if (s.status !== "playing") break;
    s = endTurn(s, e);
  }
  return s;
}

function search(want: BattleState["status"], policy: Policy, e: Encounter): BattleState {
  for (let seed = 1; seed < 400; seed++) {
    const s = run(seed, policy, e);
    if (s.status === want) return s;
  }
  return run(1, policy, e);
}

export function fixtureBattle(name: FixtureName, encounter: Encounter = HELP_DESK_ENCOUNTER): BattleState {
  const e = encounter;
  switch (name) {
    case "start":
      return createBattle(e, 7);
    case "mid": {
      // Turn 3: one risky plan already slipped through and the last intent is inspected.
      for (let seed = 11; seed < 300; seed++) {
        let s = createBattle(e, seed);
        s = endTurn(s, e);
        s = endTurn(s, e);
        if (s.status !== "playing") continue;
        const after = tryPlay(s, e, "inspect", s.announced[s.announced.length - 1]);
        if (after !== s) return after;
      }
      return createBattle(e, 11);
    }
    case "rollback": {
      // Something reversible and risky has executed, and Roll Back is in hand when possible.
      for (let seed = 1; seed < 200; seed++) {
        let s = createBattle(e, seed);
        s = endTurn(s, e);
        s = endTurn(s, e);
        if (s.status === "playing" && s.hand.some((c) => c.cardId === "rollback")) return s;
      }
      return fixtureBattle("mid", e);
    }
    case "won":
      return search("won", perfectTurn, e);
    case "lost":
      return search("lost-breach", trustingTurn, e);
    case "timeout":
      return search("lost-timeout", jumpyTurn, e);
  }
}
