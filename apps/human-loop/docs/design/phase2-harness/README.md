# Human Loop balance simulator (Phase 2)

A reusable harness that runs the **real** Human Loop engine (`lib/game/engine.ts`, `lib/game/shiftGen.ts`,
`lib/game/mastery.ts`, every pathway bundle from `lib/pathways/testing.ts`) with scripted players, over
many seeds, for each pathway's story shift and for generated Daily practice shifts. Designers can
change plans per turn, hand size, deck, card costs, energy, step order and the Phase 2 draft rules
from a JSON file, without touching the repo.

Nothing here writes to the app. The harness imports the TypeScript with `jiti` (from the app's own
`node_modules`) and works on deep copies of the encounters.

## Quick start

```bash
cd /tmp/claude-0/-home-user-ThreatForge/ed4523f9-c974-52bd-96e5-d4740a6e53d0/scratchpad/fun/phase2/sim

# Today's game, all 5 pathways, 1000 story seeds + 200 dailies each, every bot (about 15 s)
node run.mjs

# A variant, with per-turn detail and card ablation
node run.mjs --variant variants/p2-candidate.json --per-turn --ablate

# Many variants in one table (see Sweeps)
node sweep.mjs sweeps/story-search.json --pass-only
```

Requirements: Node 22+. The app root must have `node_modules` (a symlink is fine).

### Which app it runs

`--app <dir>`, else `$HL_APP`, else `../balance/human-loop` (a private copy of
`apps/human-loop` at commit 18a810e, with `node_modules` symlinked). To measure the live repo:
`node run.mjs --app /home/user/ThreatForge/apps/human-loop` (read-only). To try an engine or
content change, edit the private copy (or make another copy) and point `--app` at it.

## run.mjs options

| Option | Default | Meaning |
| --- | --- | --- |
| `--variant <file>` | none (baseline) | Variant JSON (below) |
| `--pathways a,b` | `all` | `help-desk,cybersecurity,cloud-network,full-stack,business-analyst` |
| `--modes story,daily` | `story,daily` | Also `practice` |
| `--seeds N` | 1000 | Story (and practice) seeds 1..N (only the deck shuffle is random) |
| `--dailies N` | 200 | Generated dailies per pathway (`planDaily`, like `balance.test.ts`: alternating a new player and one with 2 dailies done) |
| `--daily-seeds K` | 1 | Extra deck shuffles per daily |
| `--player-prefix` | `sim-` | Player ids for daily generation (`bal-` reproduces `balance.test.ts` exactly) |
| `--bots a,b` | all | See Bots |
| `--ablate` | off | Re-run careful and triage with one copy of each card removed |
| `--per-turn` | off | Per-turn table for careful and triage |
| `--quiet` | off | Skip the card lines |
| `--out <file>` | `results/<variant name>.json` | Full JSON; a `.txt` copy of the printout goes next to it |

## Bots (lib/bots.mjs)

"Knows red" means the plan was inspected (by hand or by the policy) and one of its evidence rows has
`redFlag`. Every Block/Escalate carries a clue row (the Phase 2 flag).

| Bot | Plays |
| --- | --- |
| `careful` | The `balance.test.ts` careful player, generalized to every pathway's policy card: inspect each plan in announce order, block known reds (true clue), escalate a plan it cannot inspect, drink Coffee to find a missing card, Roll Back known-bad actions. |
| `triage` | Careful, but when short it inspects one-way plans first, keeps 1 energy for a Block while 2+ plans are unknown, lets can-undo plans run (rolls back bad ones later), and with `rules.glance` blocks a plan whose free glance row is red. |
| `approve-all` | Never plays a card. |
| `block-all` | Blocks every plan (clue: row 0), Coffee for more Blocks. |
| `escalate-unknown` | Never inspects; escalates every plan it can, approves the rest (the buck-passer). |
| `random` | Random cards, random targets, random clue; stops 30% of the time (port of `balance.test.ts` randomBot). |
| `guess-flag` | Careful play, but the clue is a random evidence row ("I know it's bad, can't say why"). |
| `gut-flag` | Never inspects; blocks each plan with probability = the shift's risky share, random clue. |
| `perfect` | Knows the answers, never inspects (outcome ceiling). |

Policy purchase: at cost 1 the careful rule is exactly `balance.test.ts` (play it when a matching plan
needs inspecting now, or with 2+ spare energy). At cost 2+ it buys only when every plan on the board can
still be inspected afterwards (and one Block is left if it inspects one of them now).

## Measurements (per pathway, mode, bot)

| Column / JSON key | Definition |
| --- | --- |
| `win%` / `win` | Battle status `won` |
| `3*%` / `star3` | Today's `scoreBattle` stars (3rd star = no blind Block and at most 1 false alarm) |
| `3*pf%` / `star3Proof` | Phase 2 draft 3rd star: won, no miss, at most 1 false alarm, and **every catch had proof** (the plan was seen and the clue row counts as proof, see `rules.proofRow`) |
| `pass%` / `pass`, `passP2` | Daily: won with at most 1 plan graded W (today's `mastery.gradePlan`; `passP2` uses the flag-aware Phase 2 grades) |
| `triag%` / `anyTriage` | Runs with at least one **triage turn**: at turn start, uninspected plans > Inspects affordable (Inspect cards in hand, capped by energy), or uninspected plans >= energy (inspecting them all leaves nothing for a Block). Coffee-as-energy counts toward energy |
| `blind%` / `anyForcedBlind` | Runs with at least one **forced blind call** (the task's definition): uninspected plans > Inspects affordable at turn start |
| `short%` / `anyShort` | Runs where the bot actually ended a turn with a plan it never inspected, or a known red it could not stop |
| `blnd/r` / `blindRuns` | Plans that ran without being inspected, per run |
| `unusE` / `unusedEnergy` | Energy left when the bot pressed end turn, summed per run (turns that end in a mid-turn win are not counted) |
| `dead` / `deadTurns` | Turns with nothing worth a card: every plan already inspected (auto) and clean, and nothing bad to roll back |
| `0card` / `zeroCardTurns` | Turns the bot ended without playing a card |
| `noRsk` / `noRiskTurns` | Turns where every announced plan was safe (only "confirm" work; the per-turn table shows turn 1) |
| `pl/t` / `plansPerTurn` | Plans announced per turn (all turns) |
| `miss`, `FA` | Risky plans that ran, false alarms, per run |
| `proof%` / `proofShare` | Catches with proof / all catches |
| `esc` | Escalations per run |
| `noStp%` / `anyStopless` | Runs with a turn where a risky plan is up and the hand holds no Block or Escalate |
| `luckM%` / `anyLuckMiss` | Runs where a plan's red flag was on screen and the turn ended with no playable Block/Escalate (card or energy luck) |
| cards: `played` / `decisive` / `x` / `held→used` | Per card: % runs it was played; % runs it did something that mattered (Inspect/Block/Escalate/Roll Back on a risky plan; policy auto-inspected a risky plan; Coffee's drawn card or energy got used that turn); plays per run; % of turns it sat in hand that it was played |
| ablation `Δwin/Δ3*` | Change in points when one copy of that card is removed from the deck (starter deck first, else the latest unlock) |
| `perTurn` (JSON) | Per turn index: reached %, plans, triage %, forced blind %, no-risk %, dead %, zero-card %, short %, energy left |

## Variant files (variants/*.json)

```jsonc
{
  "name": "my-idea",                    // results/<name>.json
  "notes": "free text, printed",
  "cards": { "coffee": { "cost": 0 }, "policy": { "cost": 2 } },   // "policy" = every policy card
  "rules": {                             // Phase 2 draft mechanics, emulated in lib/game.mjs
    "coffee": "draw2" | "energy",        // Coffee draws 2 (today) or gives coffeeEnergy energy
    "coffeeEnergy": 1,
    "escalateBudget": null | 2,          // Escalates per shift
    "stopGuarantee": ["daily"],          // modes where each new hand gets a Block/Escalate swapped in
    "wrapUpRollback": false,             // a won shift gets one extra Roll Back beat
    "glance": false,                     // evidence[0] is free; a clue on row 0 counts as seen
    "flagNeedsInspect": true,            // proof needs the plan seen
    "spottedNoCardPartly": false,        // red on screen + no playable stop -> grade P, not W
    "proofRow": "any" | "last",          // which red rows count as proof
    "starRule": "blind" | "proof"        // which 3rd star the band check uses
  },
  "all":   { /* encounter overrides for every mode */ },
  "story": { "actionsPerTurn": [2,2,2,3], "energyPerTurn": 3, "handSize": 5, "maxTurns": 6, "maxRisk": 10,
             "starterDeck": ["inspect", "..."], "deck": { "add": ["block"], "remove": ["inspect"] },
             "unlocks": [{ "turn": 1, "cards": ["policy"] }],          // "policy" = the pathway's policy card
             "stepOrder": { "swap": [[1, 2]] } | { "order": ["step-id", 3, "..."] } },
  "daily": { /* same keys, applied to each generated daily */ },
  "shiftGen": { "dailyActionsPerTurn": [2, 2] },   // the generator orders plans for this AND the daily uses it
  "pathways": { "cybersecurity": { "story": { "stepOrder": { "swap": [[8, 9]] } }, "rules": { } } },
  "bands": { "guessStar3Max": 1 }        // override any band (see Bands)
}
```

Layers merge in this order: `all` -> `story`/`daily` -> `pathways.<id>.all` -> `pathways.<id>.<mode>`.
`deck.add/remove` accumulate; other keys replace.

Included variants: `baseline` (as shipped), `p2-rules` (the judge's card fixes, fairness and proof star,
today's shapes), `p2-candidate` (the best measured Phase 2 setup so far; read its notes).

## Sweeps (sweeps/*.json)

```jsonc
{
  "name": "story-shape",
  "base": "variants/p2-rules.json",        // path relative to this folder, or an inline variant object
  "modes": ["story"], "pathways": ["help-desk"],  // optional
  "combine": "product" | "each",            // every combination, or each value alone (plus the base)
  "keys":  { "story.actionsPerTurn": "apt" },       // short column labels
  "names": { "{\"remove\":[\"inspect\"]}": "3insp" }, // short value labels (JSON of the value)
  "grid":  { "story.actionsPerTurn": [[1,2,2,3],[2,2,2,3]], "cards.policy": [{"cost":1},{"cost":2}] }
}
```

`node sweep.mjs sweeps/<file>.json [--seeds 500] [--dailies 100] [--pathways ...] [--pass-only]`.
Dotted paths go into the variant. Output: `results/sweep-<name>.json` and `.txt`.

Included sweeps: `rules-each` (each Phase 2 rule alone), `story-shape`, `policy-timing`,
`story-search` (shapes x step swaps), `cy-story`, `daily-shape`, `daily-apt`.

## Bands (from the Phase 2 draft)

Printed at the end of every run and stored in `result.bands`: careful faces a triage turn in >= 60% of
runs; careful 3-star (under `rules.starRule`) 40-70%; careful wins >= 80%; approve-all and block-all
win (story) or pass (daily) <= 5%; guess-flag and gut-flag 3-star <= 0% (the candidate relaxes this to
1%: a random clue can always be right by luck).

## Fidelity check

With no variant, the harness reproduces `lib/game/balance.test.ts` exactly on the same inputs:
Help Desk story, 200 seeds, careful 199/200 three stars, perfect 100% win and 0 three-stars, yes-bot
100% breach; Help Desk dailies with `--player-prefix bal- --dailies 120`: careful pass 97.5% and clean
85.8% (R/P/W 993/26/20), perfect pass 100% clean 98.3%, block-everything pass 1.7%. The random bot
differs slightly because it also rolls a clue.

`lib/load.mjs` checks at start-up that the engine sees the `CARDS` object the harness patches (a cost
override that the engine ignored would silently void every card-cost experiment).

## What is emulated, not engine

The engine has no clue flags, Coffee-as-energy, Escalate budget, stop guarantee or wrap-up beat yet.
`lib/game.mjs` adds them around `createBattle` / `playCard` / `endTurn`:

- Clue flags and proof live in a side table; the Phase 2 grade (`gradesP2`, `passP2`) is computed in
  `lib/sim.mjs` from it. Safe plans keep today's `mastery.gradePlan`.
- Coffee-as-energy builds the next state directly (removes the card, adds energy, logs `card-played`).
- The stop guarantee swaps a Block (else Escalate) from the draw or discard pile into a hand that has
  none, giving back a non-Inspect card.
- The wrap-up beat reopens a won battle with a turn of energy and a Roll Back pulled into hand.
- `shiftGen.dailyActionsPerTurn` patches the exported `DAILY_ACTIONS_PER_TURN` array in place (the
  generator's order rules read it by reference), then restores it.

So these numbers say what the rules would do if the engine implemented them this way. When the engine
gets them, drop the emulation and rerun: the numbers should not move.

## Files

```
run.mjs            one variant, full report
sweep.mjs          many variants, compact table
compare.mjs        results side by side: node compare.mjs results/a.json results/b.json [--bot triage]
lib/load.mjs       jiti loader for the app (+ shared-CARDS check)
lib/runner.mjs     runVariant(): builds encounters/dailies, runs bots, bands
lib/game.mjs       engine wrapper: Phase 2 mechanics + per-turn measurements
lib/bots.mjs       scripted players
lib/sim.mjs        one run -> record; records -> aggregate
lib/variant.mjs    variant schema, overrides, card patching
lib/rngLocal.mjs   copy of the engine's mulberry32 (for bot randomness)
variants/          baseline, p2-rules, p2-candidate
sweeps/            the sweeps listed above
results/           outputs (.json full data, .txt printouts)
```

## Director pass (phase2/director, 2026-09-28)

Copy of design-depth/sim + design-depth/app, with: engine `rules.exhaust` (Escalate once per shift), a `careful-pol`
bot (buys the policy at the first chance), `search.mjs --t1safe` (turn 1 = 2 safe plans, one scary-safe),
harness `redIndex` prefers an `Evidence.proof` row, and `../scripts/proof-rows.py` applied to `../app/content`.
- variants/dir-final.json: the Phase 2a design (encounter overrides on the depth engine).
- variants/dir-final-content.json: same, run on the app with scripted proof rows (identical except guess-flag jitter).
- variants/phase2a-built.json: bot knowledge only, for the built repo (`--app /home/user/ThreatForge/apps/human-loop`).
