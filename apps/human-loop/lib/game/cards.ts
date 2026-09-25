import type { CardDef, CardId } from "./types";

/**
 * Oversight cards. Numbers may be tuned by the engine owner; ids and targets are the contract.
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
    text: "Send a plan to Dana. She gets it right.",
    short: "Send a plan to Dana.",
    flavor: "Dana has seen things. Dana fears nothing.",
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
  },
  coffee: {
    id: "coffee",
    name: "Coffee",
    cost: 0,
    kind: "skill",
    target: "none",
    text: "Draw 2 cards.",
    flavor: "Brewed before Ollie “fixed” the machine.",
    exhaust: true,
    icon: "Coffee",
  },
};
