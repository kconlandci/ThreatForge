# Human Loop, Phase 2: the hunt counts, and cards force choices

Creative director, 2026-09-28. This is a plan, not a build. Nothing in `apps/human-loop` was
edited (git status clean). Every number here comes from the real engine, run in private copies.

**Gate: no Stage 2a code starts until the owner has sent phone feedback on Phase 1a (commit 18a810e).**
If that feedback changes the evidence sheet, the plan card or the toasts, fold it in here first.

Inputs: the judge's Phase 2 draft (`fun/result.json` plan.phases[1]), the balance harness
(`phase2/sim`), the content audit (`phase2/content-audit.md`), the grading plan
(`phase2/grading-impact.md`) and three designs (Scarcity, Depth, Tempo).

My own measurements are in `phase2/director/`:
- `sim/` is the depth harness plus four things: an Escalate-exhaust rule, a `careful-pol` bot that
  buys the policy early, a safe-turn-1 layout search, and proof rows read from content.
- `app/` is the depth engine plus `rules.exhaust`, with `scripts/proof-rows.py` applied to its content.
- Main results: `sim/results/dir-final.txt` (2000 story seeds, 400 dailies x 3 shuffles per pathway),
  `dir-final-content.txt` (the same run on the scripted content), `search-t1safe.json`,
  `dir-pol.txt`, `dir-t2*.txt` and `dir-daily-nocoffee.txt`.

---

## 0. Scores and the choice

Each design is scored 1-5. For cognitive load and build risk, 5 means the lowest load and the lowest risk.

| Design | Fun | Learning | Load (ESL phone) | Balance evidence | Build risk | Total |
|---|---|---|---|---|---|---|
| Scarcity (2 Inspects, badge) | 3 | 3.5 | 4.5 | 3 | 3 | 17 |
| **Depth (Name the Clue)** | 3.5 | **4.5** | 4 | **5** | **4** | **21** |
| Tempo (waves, carry, late check) | **4.5** | 3.5 | 2 | 3.5 | 2 | 15.5 |

**Scarcity: why these scores**
- The badge gives a big skill gap (+24 to +38).
- It is emulated, not engine-native, and 2 of its 30 band checks fail.
- The wrap-up beat and the stop guarantee had harness bugs.
- "Let it run, then Roll Back" becomes the dominant good play, which teaches the wrong habit.
- Coffee is dead (played in 0-5% of runs).

**Depth: why these scores**
- It is engine-native, and it meets all bands in all 10 pathway and mode cells.
- Harness and engine agree on 45,500 of 45,500 runs, and applying it as real content reproduces the numbers exactly.
- Every seed is winnable with 3 stars (oracle 100%).
- It keeps the lesson "stop it before it runs, and say why".
- Weak spots:
  - The cost-2 policy is never bought by careful play in HD and CY.
  - In CN, FS and BA it is a **trap on turn 1**: buying it right away drops 3 stars to 0%, because turn 1 there has a risky plan (measured, `dir-pol.txt`).

**Tempo: why these scores**
- Its rhythm is the most fun, but it adds 3 new ideas: saved energy, an undo timer and late checks on done plans.
- It also needs a new Done strip, per-pathway generator rules and fragile searched layouts.
- That is too much at once for the owner's "one decision per screen" players.
- In dailies, its skill mostly disappears.

**Choice: a Depth backbone with four director changes. Each one was measured.**
1. **Escalate: "Once per shift" (it exhausts), instead of a budget counter.** Scarcity's idea: no
   number to track and no refusal message. Measured against the budget: story identical in all 5
   pathways, dailies within 1.5 points.
2. **Story turn 1 = 2 safe plans (at least one "scary-safe") in all 5 pathways.** The cost-2
   policy on turn 1 becomes a true *investment choice*, never a trap:
   - A careful player who skips it lands in the band.
   - A player who invests early scores higher (`careful-pol`: story 80-100% vs careful 56-67%).
   - In dailies, buying it eagerly is slightly worse, so judgment matters.
   - The CN, FS and BA orders were re-searched for this (83-101 legal layouts each, 16-18 pass all bands).
3. **"Look only" is the third badge word (instead of "Read-only"):** plainer English. The 3rd tier is kept
   because without it the badge adds 7-39 points less triage value (Depth, `_noRO`).
4. **A three-level clue grade:**
   - the proof row: R "Caught with proof";
   - another real red row: R "Caught";
   - a plain row: P "Right stop, wrong line";
   - no mark: R "Caught".

   The star needs the proof row. A player who marks a real but secondary warning sign is never
   called wrong.

Also taken:
- From Tempo: no badge word that means "safe", and the one-time rush-turn tip.
- From the grading plan: rule A, and a battle-level `grading` flag instead of a version bump.
- From the content audit: unflag the rule rows, one proof row per risky plan, the display shuffle
  now, and verdict text moving to review-only `check` later.

Rejected, with the measurement behind each:

| Idea | Why not |
|---|---|
| Free glance line | Row 0 is never red in 125/125 risky plans |
| Wrap-up Roll Back beat | No careful-play effect; the 3rd star already covers rescues |
| "Spotted it, no card" | Near 0 with the hand floor; it raises random daily passes from 12% to 21.5% |
| Escalate budget counter | Replaced by Exhaust |
| 2 Inspects | Roll Back becomes the dominant play |
| Energy carry and undo window | Too much load |
| Policy on turn 2 in CN/FS/BA | Careful 92%: too easy |
| Callback policy at cost 1 | HD careful 80.3%: over the band |

---

## 1. Measured result of the chosen design (director `dir-final`)

- Story: 2000 seeds.
- Daily: 400 generated dailies x 3 deck shuffles per pathway.
- 3rd star: the proof rule, on one proof row.
- The same run on the scripted content (`dir-final-content`) is identical for every bot except guess-flag, which varies by up to 0.4 points (all at 0.6% or less).

**Story (3-star %, except where named)**

| | HD | CY | CN | FS | BA | Band |
|---|---|---|---|---|---|---|
| careful (inspect in order) | 58.6 | 67.4 | 67.2 | 60.7 | 56.1 | 40-70 |
| careful-pol (buys the policy on turn 1) | 83.6 | 85.9 | 80.3 | 100 | 87.3 | >= careful |
| triage (reads the badge) | 81.9 | 81.9 | 85.5 | 92.9 | 85.5 | > careful |
| human80 (proof row 80% of the time) | 33.4 | 33.4 | 35.2 | 38.2 | 35.2 | (info) |
| esl-mix (right 50%, wrong 20%, none 30%) | 4.6 | 4.6 | 4.9 | 5.5 | 4.9 | (info) |
| guess-flag (careful play, random line) | 0.4 | 0.3 | 0.2 | 0.2 | 0.2 | <= 1 |
| careful runs with a triage turn | 83.7 | 83.7 | 78.5 | 68.6 | 70.9 | >= 60 |
| oracle 3 stars (every seed winnable) | 100 | 100 | 100 | 100 | 100 | 100 |

- Careful and every sensible bot win 100%.
- approve-all, block-all and escalate-unknown win 0%.
- random wins 15.6-20.2%, with 0 three-star runs.
- Dead turns: 0.
- Turn 1 has 2 plans and no risk; careful plays on it every time.
- HD triage turns fall on turn 4 (the rush: 62%), turn 3 (20%), turn 2 (13%) and turn 1 (8%).

**Daily**

| | HD | CY | CN | FS | BA | Band |
|---|---|---|---|---|---|---|
| careful 3 stars | 50.1 | 45.3 | 51.9 | 45.3 | 43.1 | 40-70 |
| careful pass | 99.6 | 99.2 | 99.7 | 99.3 | 99.6 | >= 95 |
| triage 3 stars | 56.8 | 52.9 | 50.6 | 52.8 | 63.1 | (info) |
| human80 / esl-mix 3 stars | 24.8 / 4.8 | 20 / 3.4 | 20.9 / 4.1 | 22.5 / 3.5 | 29.7 / 5.1 | (info) |
| guess-flag 3 stars | 0.6 | 0.3 | 0.3 | 0.3 | 0.3 | <= 1 |
| careful runs with a triage turn | 84.7 | 89.8 | 88.3 | 89.8 | 88.1 | >= 60 |
| block-all / approve-all / escalate-unknown pass | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0.1/0/0 | <= 5 |
| random pass | 12 | 10.3 | 8.7 | 13 | 16.8 | (info) |

**Cards (careful, % of runs played)**

| Card | Story | Daily |
|---|---|---|
| Escalate | 6-25 | 44-51 |
| Roll Back | 0-10 | 6-12 |
| Coffee | 30-46 (the rush turn) | 1.5-2.4 |
| Policy | 0 in HD/CY (the investor bot uses it), 32-88 in CN/FS/BA | 3-49 |

**Pressure lever (measured, NOT adopted in 2a):** removing Coffee from the daily deck gives careful
57-65%, triage turns 65-75% and HD guess-flag 1.4% (over the band). Kept for 2d tuning.

Before and after, careful 3 stars:
- Today: story 99.3/100/98.7/98.7/98.7 (today's rule) and dailies 90-97%.
- Forced-triage runs today: story 6-18%, daily 44-65%.

---

## 2. Stage 2a: exact rules (buildable in one focused pass)

### 2.1 Cards (`lib/game/cards.ts`, global)

| Card | Change | Text (Help Desk wording) |
|---|---|---|
| coffee | cost 0, exhaust, **new `energy: 1`** (no draw) | "+1 energy this turn." |
| rollback | cost 2 -> **1** | unchanged |
| policy-callback, -look-first, -change-window, -code-review, -source-check | cost 1 -> **2** | unchanged |
| escalate | unchanged globally (cost 2); exhausts only where the encounter says so (2.2) | Story/daily card shows the extra line "Once per shift." |

Coffee is not in drill or practice decks, so the global change touches only story and daily.
Pathway `cardCopy` overrides only Coffee's flavor text, which stays.

### 2.2 Encounter rules (`Encounter.rules`, optional; absent = today's behavior)

```ts
export interface EncounterRules {
  proofStar?: boolean;       // new battles get grading "proof"
  stopGuarantee?: boolean;   // each new hand holds a Block (else an Escalate)
  inspectFloor?: number;     // each new hand holds at least this many Inspects (Phase 2a: 1)
  exhaust?: CardId[];        // these cards exhaust in this encounter (Phase 2a: ["escalate"])
  rollbackCosts3rd?: boolean;// a rolled-back risky plan costs the 3rd star (keeps the 2nd)
}
```

Hand floor (port `applyHandFloor` + `swapIn` from `phase2/design-depth/engine-rules.diff`):
- It runs in `startTurn` after the draw and before `unlockCards`.
- A missing Block (else Escalate), then missing Inspects up to the floor, are swapped in from the
  draw pile, then the discard pile. Each replaces the last hand card that is not needed for the floor.
- It uses no RNG, and the deck contents never change, so `canResume`'s deck check holds.

Story (all 5 `encounter-01.json`) and daily (gen 2) set all five rules. Drills set only `proofStar`.
Practice sets none.

### 2.3 Story layout (content, all 5 `encounter-01.json`)

- `actionsPerTurn: [2,2,2,3,1]`, `maxTurns: 6`, `energyPerTurn: 3`, `handSize: 5`, `maxRisk: 10`.
- `starterDeck`: 4 inspect, 3 block, 1 rollback.
- `unlocks`: turn 1 = the pathway's policy, turn 3 = escalate, turn 4 = coffee.
- Step order (`|` = turn break; `!` = risky). Each ticket keeps its internal order. Turn 1 = 2 safe
  plans, and no turn holds 2 risky plans.
  - **HD:** ruiz-vpn-fix, okafor-disable | romero-lookup, ruiz-vpn-close! | okafor-mail-forward, romero-mfa-reset! | ortiz-laptop, okafor-summary!, ortiz-unlock | ortiz-access!
  - **CY:** cy-lam-report-real, cy-dsp04-isolate | cy-whitcomb-signins, cy-duarte-report-close! | cy-sandoval-disable, cy-whitcomb-disable! | cy-sandoval-wipe!, cy-c2-deny, cy-sandoval-hr-list | cy-ransom-close!
  - **CN:** cn-hc-failover, cn-pd-orphan-disks | cn-test-servers-stop, cn-stonebridge-tunnel! | cn-dispatch-errors, cn-dispatch-close! | cn-stonebridge-call, cn-pd-archive-delete!, cn-dispatch-log-vendor | cn-dispatch-scale-zero!
  - **FS:** fs-pd-key-rotate, fs-track-errors | fs-lark-package!, fs-hc-flag-off | fs-track-close!, fs-hc-date-fix | fs-track-test-data, fs-lark-docs, fs-hc-late-release! | fs-pd-cleanup!
  - **BA:** ba-ontime-compare, ba-pd-export-delete | ba-hc-unpublish, ba-lark-share! | ba-ontime-close!, ba-lark-owner | ba-hc-deck-share, ba-wayfell-sample, ba-pd-merge! | ba-hc-ontime-rule!
- Writers re-read each story's intro, outro and any plan text that refers to "earlier" or "next" (for
  example "This is step 1 of the identity check" in the HD lookup: cut it). Plan ids do not change.
- **Layout guard (content.test):** turn 1 = 2 safe plans, at least one of them `twist: "scary-safe"`;
  no turn holds 2 risky plans; each ticket's plans keep their authored relative order.

### 2.4 Daily generator (`lib/game/shiftGen.ts`)

- New `ShiftSpec.gen?: 2`. `planDaily` and `planDrill` write `gen: 2`.
- `DAILY_ACTIONS_PER_TURN` becomes `[2,2]` for gen 2. Keep `DAILY_ACTIONS_PER_TURN_V1 = [1,2]` for specs without `gen`.
- `turnOfPlan` and `dailyOrderOk` take the spec's shape. Order rules are unchanged: plan 1 is a
  plain safe plan, and never 2 risky plans on one turn. Measured: 100% of generated dailies pass.
- `buildShift`:
  - A gen-2 daily gets `actionsPerTurn [2,2]` and `rules {proofStar, stopGuarantee, inspectFloor:1, exhaust:["escalate"], rollbackCosts3rd}`.
  - A spec without `gen` builds exactly as today (`[1,2]`, no rules).
  - A gen-2 drill gets `rules {proofStar:true}`; everything else is unchanged.
- `DAILY_DECK` is unchanged (so in-progress daily battles still pass `canResume`).
- `specProblem` accepts `gen` absent or 2.

### 2.5 Proof, clue and stars (engine)

- `Evidence.proof?: boolean` marks the one proof row of a risky plan.
- `proofRow(step)` returns:
  - the index of the row with `proof`;
  - else the last `redFlag` row whose label does not match `RULE_LABEL`;
  - else -1.
- `RULE_LABEL = /\b(policy|runbook|playbook)\b|^change type$|^crm rules$/i`, exported from a new `lib/game/evidence.ts`.
- `playCard(state, enc, uid, target?, clue?: string | null)`. The clue is the **evidence label**
  (labels are unique inside every plan; add a test), not an index. Row labels survive the 2b/2c
  row inserts, and index drift would corrupt saves.
- On Block or Escalate:
  - `rt.clue` = the label if it exists in the plan, else `null`. An invalid clue is ignored and never refuses the play.
  - Only when `state.grading === "proof"`, the plan is risky, it was inspected (by hand or policy) and the clue is non-null:
    `rt.clueHit` = `"proof"` if the label is on `proofRow`, `"flag"` if that row is `redFlag`, else `"off"`.
  - The value is frozen at play time, so later content edits never change a finished grade.
- When a plan is announced again (a blocked safe plan), `clue` and `clueHit` are deleted.
- `endTurn(state, enc, marks?: Record<string,string>)` records `rt.clue` on plans that run, for Show
  me after a reload. It does not affect grading.
- A `card-played` event carries `clue?: string` only when one was given.
- `createBattle` sets `grading: "proof"` when `encounter.rules?.proofStar`. `version` stays 1.
- New helper `starChecks(state, enc)` returns `{ won, noMiss, careful, falseAlarms, blind, proofDone, proofNeeded }`.
  `scoreBattle` and `ResultScreen` both use it (this removes the copy at ResultScreen.tsx:68-80).
  - For a proof battle: `careful = falseAlarms <= 1 && unprovenStops.length === 0`.
  - `unprovenStops` = risky plans that are blocked or escalated without `clueHit === "proof"`, plus rolled-back risky plans when `rollbackCosts3rd` is set.
  - A battle without `grading` keeps today's blind-block rule.
- New `HeadlineKey` `"unproved"` for a win with 0 misses, at most 1 false alarm and some unproven stop.
  HD default: "Nothing got past you. Next time, mark the clue." Other pathways fall back to the default pool.

### 2.6 Mastery (`lib/game/mastery.ts` gradePlan; the signature does not change)

| Risky plan, inspected, stopped (Block or Escalate) | Grade | Reason |
|---|---|---|
| clueHit "proof" | R | "Caught with proof" |
| clueHit "flag" | R | "Caught" |
| clueHit "off" | P | "Right stop, wrong line" (add it to `MISS_REASONS`; the stored string is fixed forever) |
| no clue or no grading | R | "Caught" (unchanged) |

- Not inspected, rolled back, and every safe plan: unchanged.
- Practice records clues (for Show me) but never gets `grading`, so it never grades them.
- `HistoryEntry.proof?: number` counts clueHit "proof". `save.ts toHistoryEntry` validates it as an int 0-20, like `right`.

### 2.7 Stakes badge (new `lib/game/stakes.ts`, UI only)

- `stakesOf(step)`: `category === "lookup"` gives `"look"`; else `reversible` gives `"undo"`; else `"oneway"`.
- Words: **One-way** (Lock icon), **Can undo** (Undo2 icon), **Look only** (Eye icon).
- A chip on every `IntentCard`, after the intent. It never uses colour alone.
- Aria text: "Plan 2: Delete the old Pinecrest archive. One-way. Not checked."
- The badge derives from existing fields, so there is no content change.
- It shows in story, daily and drill. It stays hidden in practice (practice is unchanged in 2a).

### 2.8 Display shuffle (new `lib/game/evidenceOrder.ts`, UI only)

- `evidenceOrder(seed, stepId, n)` returns a permutation of `0..n-1` with row 0 fixed.
  It uses a seeded Fisher-Yates on `hash(seed + stepId)`, the same as `rng.ts`.
- `EvidencePanel` (live sheet and ReviewSheet) renders in that order.
- Marks and clues always use the content index or label, never the display position.
- It applies in every mode, practice included (this closes the known gap "proof-by-position on practice ticket 1").
- Deterministic across a reload.

### 2.9 Content script (Stage 2a, mechanical; writers pick by hand in 2b/2c)

`phase2/director/scripts/proof-rows.py` goes into the repo as `scripts/phase2-proof-rows.py`. It is
idempotent and makes minimal JSON diffs. It runs over story, bank and practice:
- Every rule row on a risky plan gets `redFlag: false` (48 rows).
- Each of the 133 risky plans gets exactly one `"proof": true`: an existing one, else the last
  red fact row. It is never row 0 and never a rule row.
- 47 proof rows are not the last row.

The report (`phase2/director/sim/results/proof-rows-report.txt`) lists every plan's pick for the 2b/2c writers.

### 2.10 Player-facing beats and copy (one decision per screen)

- **Story turn 1 (first shift).** The board shows 2 plans, each with a badge, and the Policy arrives
  as a bonus card. The coach tip replaces "Tap **Inspect**, then the plan...":
  "**2 plans**, **3 energy**. Inspect them, or buy the **Policy**?" (9 words, target null).
  - Decision: look now, or invest.
  - The policy unlock tip keeps its text but must not ring the card.
- **Sheet (unchanged Phase 1a gesture).** Mark the line, then Block or Let it run. Toasts after a stop:
  - proof: "Caught with proof!" + "{Agent} didn't check: {label}." (existing caught-proof)
  - flag: "Caught! The key clue: {label}." (6 words + label)
  - off: "Right stop. Wrong line." + a "Show me" button (opens the review with the proof row circled)
  - no mark, first time in the shift: "Caught! Mark the line for the 3rd star." Later ones: "Caught!"
- **Rush turn (turn 4, first story shift only, before any play).**
  "Not enough energy for all 3? Look at One-way first." (10 words, target null)
- **Coffee.**
  - The unlock tip becomes "New card: **Coffee**. Free. 1 more energy now."
  - Out of energy with Coffee in hand: "Out of energy. Play **Coffee** or tap **Approve**."
  - Remove every "draw 2" line: coach.ts:222 and :332, EvidencePanel.tsx:234 and :238, the engine.ts:29 comment.
- **Escalate.** The card shows "Once per shift." (Hand/CardView, only when `enc.rules.exhaust` includes escalate).
- **Result screen star rows** (proof battle):
  - "Finish the shift"
  - "Nothing risky got through"
  - "Mark the clue on every catch (3 of 4)", using `proofDone/proofNeeded`
  - When the false alarms are the reason: "Block good work once at most"
- **Release note:** "Your current story shift restarts. Your skills and history are kept."

### 2.11 Save compatibility (what happens on deploy)

| Saved thing | Result | Why |
|---|---|---|
| In-progress **story** battle | Starts fresh; skills, history, dailies and drills kept | The deck changed, so `canResume` returns false (Depth measured 0/1500 resume) |
| In-progress **daily** battle (spec without `gen`) | Resumes and finishes under today's rules | `DAILY_DECK` unchanged; the spec builds as gen 1; no `grading` on the saved state. New card costs apply (global) |
| In-progress **drill** / **practice** battle | Resumes under today's rules | Decks unchanged; no `grading` |
| New battles | `grading: "proof"` + clues survive JSON round trips | Grading plan: 1000/1000 |
| Saved daily/drill specs | Rebuild | `bankVersion` hashes ids only; the 2a content edits change no ids |
| `SkillRecord.missWhy` "Right stop, wrong line" | Kept on reload | Added to `MISS_REASONS` |

Test fixture: `registry.test` M3 mid-Monday resume becomes "starts fresh, keeps history and skills".
Add a test: a pre-2a daily save (gen absent) resumes and scores with the blind-block rule.

### 2.12 Help Desk golden: 5 audited recaptures, in this order

Each recapture is one commit-sized step. Each is logged in the `golden.test.ts` header with its audit sentence.

| Step | Change | Expected diff (anything else = stop) |
|---|---|---|
| G1 | Engine mechanics with every rule off: `rules`, clue arg, `energy`, hand floor, exhaust rule, `starChecks`, `grading` | **0 changes** (Depth S0 measured 0) |
| G2 | Capture policies `proof` (perfect + clue = proof row label) and `guess` (perfect + clue = row 1 label) added to `capture()` | Additions only (new trace keys); every old key byte-identical |
| G3 | CARDS: Coffee energy and text, Roll Back 1, policies 2 | `cards` (coffee, rollback, policy-callback) + traces whose card-prompt cost text or plays change; practice traces identical |
| G4 | Rules + layouts: story JSON (order, apt, deck, unlocks, rules), daily gen 2, drill proofStar | `story` + all story traces, daily traces, `plans`/`built` for dailies, drill traces (blind-escalate 3 stars end); practice traces identical; `bankVersion` identical |
| G5 | Content script (proof rows, rule rows unflagged) + headline `unproved` | `story`/`built`/`full`/`practice` evidence flags; traces only where a debrief line names the clue; `artifact-kinds.json` identical |

Method for each step: capture to a temp file, run `golden-diff.py` (grading dir), then paste the
per-key counts into the header. For G4, also re-run `node sim/run.mjs --app <repo> --variant
variants/phase2a-built.json`. It must reproduce `dir-final-content.txt` within ±1 point (2000
seeds) before G4 is accepted.

### 2.13 Tests

**Change, all expected:**
- `content.test.ts:142` and `bank.test.ts:103`: "last row is the most telling", plus the red-row order rules.
- 3 `engine.test.ts` star tests.
- `balance.test.ts`: careful story/daily expectations and `clean >= 0.8`.
- Coach first-shift tips.
- `useBattle` deck per turn.
- The `shiftGen` shape tests.
- The `mastery` blind-Escalate fixture.
- The registry M3 fixture.
- The golden tests.

**New:**
- `proof.test.ts` (port `grading/out/proof.test.ts` + 6 more):
  - label clue recorded;
  - invalid clue ignored;
  - flag/off/proof grades;
  - re-announce clears the clue;
  - a legacy battle ignores clues;
  - blind escalate loses the 3rd star;
  - rollbackCosts3rd;
  - the ResultScreen rows equal `scoreBattle`.
- `handFloor.test.ts`: every new story/daily hand holds at least 1 Inspect and 1 Block when the deck has them; the deck multiset is unchanged; deterministic.
- `evidenceOrder.test.ts`: row 0 fixed; same seed+id gives the same order; about uniform over 10k seeds.
- `stakes.test.ts`.
- **Content lint (hard, all pathways):**
  - exactly 1 proof row per risky plan and 0 on safe plans;
  - the proof row is `redFlag`, not row 0, not `RULE_LABEL`;
  - rule rows are never red;
  - labels are unique per plan.
- Layout guard (2.3).
- **`balance.test.ts` rewritten on the harness bots**
  - Port careful, careful-pol, triage, guess-flag, no-mark, block-all, approve-all, escalate-unknown and oracle into `lib/game/__sim__/bots.ts` (test-only).
  - Seeds: story 1000, dailies 200 per pathway.
  - Assertions per pathway:
    - careful 3 stars in [40,70] (story and daily);
    - careful win 100% and daily pass at least 95%;
    - triage 3 stars at least careful + 10 in the story;
    - careful runs with a triage turn at least 60%;
    - guess-flag 3 stars at most 1.5% (1000 seeds is noisy; the 2000-seed harness gate is 1%);
    - oracle 3 stars 100%;
    - approve-all, block-all and escalate-unknown pass or win at most 5%;
    - no-mark wins 100% with 0 three-star runs.

**Gates:** `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`,
`npm run check:bundles`, and `npm run e2e:first-five` (Phase 1a checks A1-A17 must stay green).

**E2E additions** (`scripts/e2e/first-five.mjs`, 390x844 and 375x667, all 5 pathways):
- B1: story turn 1 shows 2 plan cards, each with a badge chip (a text node, not colour only).
- B2: the chips fit on one line at 375 px; no horizontal scroll.
- B3: marking a line then tapping Block shows a clue toast within 1 s.
- B4: the result screen's third star row reads "Mark the clue on every catch (n of m)".
- B5: axe finds 0 serious or critical issues on the board with chips.
- B6: evidence row order differs between 2 seeds for the same plan, and row 0 is first in both.

### 2.14 File ownership (parallel builders)

R1 lands types first (half a day). Everyone codes against section 2 in the meantime.

| Role | Owns | Delivers |
|---|---|---|
| R1 Engine | `lib/game/types.ts`, `engine.ts`, `cards.ts`, `evidence.ts` (new), `engine.test.ts`, `proof.test.ts` + `handFloor.test.ts` (new), `fixtures.ts` | 2.1, 2.2, 2.5; G1 |
| R2 Grading & save | `mastery.ts`, `mastery.test.ts`, `reveal.ts`, `reveal.test.ts`, `skillsView.ts`, `lib/client/save.ts` (+tests) | 2.6; reveal reads `rt.clue` first and circles `proofRow` |
| R3 Generator | `shiftGen.ts`, `shiftGen.test.ts`, `lib/pathways/create.ts` (pass `rules` through, if it whitelists keys) | 2.4 |
| R4 Content | 5 × `content/*/encounter-01.json`, `scripts/phase2-proof-rows.py`, bank + practice JSON (script output only), `content.test.ts`, `bank.test.ts`, `helpDeskDefaults.ts` (headline `unproved`) | 2.3, 2.9, lint, layout guard; story copy re-read |
| R5 Battle UI | `IntentCard.tsx`, `EvidencePanel.tsx`, `BattleView.tsx`, `Hand.tsx`/`CardView.tsx`, `ResultScreen.tsx`, `battle.module.css`, `stakes.ts` + `evidenceOrder.ts` (new, with tests) | 2.7, 2.8, clue pass-through in `tryPlay` and `endTurn`, toasts, star rows |
| R6 Coach & beats | `coach.ts`, `coach.test.ts`, `useBattle.ts`, `useBattle.test.ts`, `OutcomeToast.tsx` | 2.10 copy, Coffee lines, first-shift tips, clue toast beats |
| Integrator | `golden.test.ts`, `__golden__/*`, `balance.test.ts`, `lib/game/__sim__/*`, `registry.test.ts`, `scripts/e2e/first-five.mjs`, README | G1-G5 audits, balance port, e2e, release note |

Conflict rule: BattleView gets exactly 2 call-site lines from R2/R6 needs. Only R5 edits BattleView.

**Effort:** about 5-7 focused dev days, or about 2.5 calendar days with 6 builders and the integrator.

---

## 3. Later stages (outline)

**2b: Honest evidence, story and practice** (about 2 days)
- Add `Evidence.check?: string` (12 words or fewer, review only, never in the DOM before resolution,
  never read by coach.ts) and `side?: "ticket" | "record"`.
- ReviewSheet shows `check` under the proof row, the key row and a marked decoy row.
- Writers:
  - cut the 13 story verdict rows to `check`;
  - hand-pick the proof row on all 20 story risky plans (the 2a script picks are the defaults);
  - decide whether each other red row stays red (grades "Caught") or becomes plain with a `check`;
  - rewrite story confession quips (5) and "checked" quips (14);
  - fix HD practice `mensah-remote-wipe` "from the phone on file".
- Turn the hard lint on for story and practice.
- Golden: one content recapture (1a method: swap the old text back in and diff).
- Saves: clues are labels, so row inserts and renames never move a stored grade. `clueHit` is frozen.

**2c: Honest evidence, bank** (about 3-4 days, about 15 writer-hours)
- 247 bank plans: 52 CUT, 18 PAIR, proof picks, reassurance (56 rows), quips (59).
- Hard lint on everything.
- Soft gates in `balance.test`:
  - reassurance: safe share minus risky share is 15 points or less;
  - quip keyword guesser decides 15% of plans or fewer, or has precision of 70% or less.
- Add 1-2 **risky "Look only" plans per bank** (reading records the agent should not open), so "Look only" stops meaning "safe".
- Reversibility audit: a plan whose harm cannot be undone (for example an MFA reset for an impostor) is `reversible: false` even if the setting can be undone.
- Fix `business-analyst/bank/shift.json:41` ("stayed in" should be "stayed out").
- Re-run the harness; the daily bands must hold.

**2d: Tune with people** (1-2 days + a playtest)
- Read `HistoryEntry.proof` from real players, and phone-test the rush turn and the chips.
- Levers, all pre-measured:
  - remove Coffee from `DAILY_DECK` (dailies easier);
  - show "Proof 3/4" progress in-shift;
  - the strict daily pass (at least half the risky plans R: Tempo measured exploit passes going to 0%);
  - Tempo's "Next up" strip as a Phase 4 candidate.
