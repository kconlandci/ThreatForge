import { HELP_DESK_CARD_COPY } from "./helpDeskDefaults";
import type { CardDef, CardId } from "./types";

/**
 * Oversight cards. Numbers may be tuned by the engine owner; ids and targets are the contract.
 * Mechanics live here for every pathway; a pathway may reword name/text/short/flavor through
 * pathway.json "cards" (see PathwayBundle.cardCopy). The rules text here is the Help Desk wording.
 * A card with `autoInspect` is a policy card (engine.ts policyCardOf).
 * Costs are balanced against encounter energy (3 per turn) by lib/game/balance.test.ts.
 */
export const CARDS: Record<CardId, CardDef> = {
  inspect: {
    id: "inspect",
    name: "Inspect",
    cost: 1,
    kind: "skill",
    target: "intent",
    text: "See the evidence behind a plan.",
    flavor: "Trust, but read the logs.",
    icon: "Search",
  },
  block: {
    id: "block",
    name: "Block",
    cost: 1,
    kind: "skill",
    target: "intent",
    text: "Stop a plan. A safe one goes back in line.",
    short: "Stop a plan. Safe ones come back.",
    flavor: "“Hold on there, buddy.”",
    icon: "Hand",
  },
  escalate: {
    id: "escalate",
    name: "Escalate",
    cost: 2,
    kind: "skill",
    target: "intent",
    ...HELP_DESK_CARD_COPY.escalate,
    icon: "ArrowUpRight",
  },
  rollback: {
    id: "rollback",
    name: "Roll Back",
    cost: 2,
    kind: "skill",
    target: "executed",
    text: "Undo a done action, if it can be undone.",
    short: "Undo a done action.",
    flavor: "Ctrl+Z, but for your career.",
    icon: "Undo2",
  },
  "policy-callback": {
    id: "policy-callback",
    name: "Policy: Callback",
    cost: 1,
    kind: "power",
    target: "none",
    text: "MFA, password and unlock plans get auto-inspected.",
    short: "Auto-inspects MFA & resets.",
    flavor: "Guardrails scale. You don't.",
    exhaust: true,
    icon: "ScrollText",
    autoInspect: ["credential"],
    alreadyOn: "The callback policy is already on.",
    policyOn: {
      title: "Policy: Callback is on",
      text: "From now on, password, MFA, and unlock plans get inspected automatically.",
      log: "Policy: Callback is on. Password, MFA, and unlock plans get inspected automatically.",
    },
  },
  "policy-look-first": {
    id: "policy-look-first",
    name: "Policy: Look First",
    cost: 1,
    kind: "power",
    target: "none",
    text: "Device and network plans get auto-inspected.",
    short: "Auto-inspects device & network.",
    flavor: "Lock it out? Look first.",
    exhaust: true,
    icon: "ScrollText",
    autoInspect: ["endpoint", "network"],
    alreadyOn: "The Look First policy is already on.",
    policyOn: {
      title: "Policy: Look First is on",
      text: "From now on, device and network plans get inspected automatically.",
      log: "Policy: Look First is on. Device and network plans get inspected automatically.",
    },
  },
  coffee: {
    id: "coffee",
    name: "Coffee",
    cost: 0,
    kind: "skill",
    target: "none",
    text: "Draw 2 cards.",
    flavor: HELP_DESK_CARD_COPY.coffeeFlavor,
    exhaust: true,
    icon: "Coffee",
  },
};
