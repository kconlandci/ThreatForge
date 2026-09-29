# Phase 2 grading impact: making the clue ("proof") count

Grading and systems analyst, 2026-09-28. This is a plan, not a build. Nothing in
`apps/human-loop` was edited. Every number below comes from the real engine, run in a private
copy at `fun/phase2/grading/app` (repo HEAD 18a810e plus a small prototype of the design in
section 3). The scripts and raw outputs are in `fun/phase2/grading/`.

---

## 0. Summary

1. **The smallest safe design works, and old saves resume.** Store the clue on the plan when it
   resolves (`StepRuntime.clue`), mark new battles with one flag (`BattleState.grading: "proof"`),
   and treat a missing flag as today's rules. All 2,000 simulated in-progress saves from today's
   engine resumed, across 5 pathways, story and practice, 200 seeds each. Each one finished with
   **the same stars and the same per-plan grades as today**. `version` stays 1, so `canResume`
   needs no change.
2. **Do not grade "no clue" as partly right (P).** In the judge's draft rule, a player who makes
   the right call but never marks a line gets P. That player never gets past **Learning** on any
   lens skill: 0% reached Practicing after 11 days, in all 5 pathways. Today it is 99-100%. So
   use rule **A**: no clue is still R ("Caught"), a wrong clue is P ("Right call, wrong clue"),
   and proof is needed only for the 3rd star. Under rule A, players who never mark keep exactly
   today's skill levels.
3. **Today's content gives the proof away by position.** In every story and bank risky plan of
   all 5 pathways (123 of 123: 20 story + 103 bank), **the last evidence row is a red flag**. The first row never is.
   "Always mark the last line" earns the same 3-star rate as a real expert: 83-100% of story runs.
   A random guess is proof 49-63% of the time, because risky plans have 2-3 red rows out of 3-4.
   Proof grading must ship **together with** the display shuffle, and with a narrower proof set
   (section 4.1). Otherwise guessing earns 3 stars in 5-14% of story runs, against the band of
   "never".
4. **The Help Desk golden barely notices the grading change, because it has blind spots.** With
   rule A, only `traces` changes: 25 of 112 traces (practice perfect 6, drill perfect 8, drill
   escalating 8, daily perfect 1, daily escalating 2). The other 11 keys are byte-identical. No
   story trace changes, and none of the 329 golden headlines is a 3-star ending. The golden's
   "perfect" bot always blocks one plan blind in the story (it runs out of Inspects), so it never
   earns 3 stars there. Before recapturing, add a "proof" policy (section 5), or the new
   3rd-star rule is not pinned at all.
5. **The proof rule also closes a loophole that exists today.** Escalating every plan without
   looking earns 3 stars today in 14 of 14 golden drill traces. `blindBlocks` counts only Block,
   not Escalate. Under proof grading those runs drop to 2 stars.

---

## 1. What proof grading touches (today's code)

| Area | Where | Today | Phase 2 change |
|---|---|---|---|
| Mark state | `components/battle/BattleView.tsx:262` `marks` Map | UI memory only; lost on reload; cleared when a plan comes back (`afterCommit`, :400) | Keep the UI Map for unresolved plans. The engine becomes the record once a plan resolves. |
| Play API | `engine.ts playCard(state, enc, uid, target)`; `useBattle.play(uid, target)`; the one caller is `BattleView.tryPlay` (:598) | No clue | Add an optional 5th argument `clue?: number \| null`. Block/Escalate record it. `tryPlay` passes `marksRef.current.get(target)`. That covers both the sheet button and the hand-card-then-plan path. |
| End turn | `engine.ts endTurn(state, enc)`; `useBattle.endTurn()`; `BattleView:696` | No marks | Add an optional `marks?: Record<stepId, number>`, so "spotted it, no card" can be graded. |
| Stars | `engine.ts scoreBattle` (careful = falseAlarms <= 1 and `blindBlocks` = 0) **and a copy in `ResultScreen.tsx:68-80`** | Blind Block only | Proof battles: careful = falseAlarms <= 1 and `unprovedCatches` = 0. Move the checklist rule into one shared engine helper, so the two copies cannot drift. |
| Headline | `engine.ts headlineKey` | "perfect" = 0 misses and 0 false alarms | A no-proof win would read "Flawless shift" under 2 stars. Add a key for that case (section 3.6). |
| Lens grade | `mastery.ts gradePlan(step, runtime)`, 1 function, 6 callers: `gradeBattle`, `shiftTally`, `callsFromBattle`, `useBattle.debriefRows`, `skillsView.planLines/liveGrade`, `PracticeResult` | Reads status, inspected, requeues | Also read `runtime.clue` / `runtime.noStop`. The signature is unchanged, so no caller changes. |
| Reasons | `mastery.ts MISS_REASONS`; `save.ts toSkillRecord` drops any `missWhy` not in the list | 5 P reasons | Add "Right call, wrong clue" and "Spotted it, no card". If they are missing, the "latest miss" note loses its reason on reload. |
| Reveal / Show me | `reveal.ts revealFor(state, enc, id, markedIdx)`; `proofCount(state, enc, marks)` | The mark comes from the UI Map | Prefer `state.steps[id].clue` when it exists. The caught-proof toast, Show me "Your mark" and the practice score line then survive a reload. |
| History / result | `GameShell.onBattleSave` (:742) writes `HistoryEntry`; `save.ts toHistoryEntry` whitelists new fields | right/partly/missed | Optional `proof?: number` (validated int 0-20, like `right`). The owner's success measure ("70% of catches with proof") then lives in Save data. The Airtable schema does not change. |
| Saves | `engine.canResume` (version === 1, step ids, deck); `save.ts toProgress` passes battles through | - | No change needed (measured, section 4.4). |

---

## 2. What the design must do

- A plan's clue is recorded **once, when it resolves**, in the saved state. Stars, the debrief,
  skills and Show me all read that one record, so they never disagree, even after a reload.
  (Today the "Caught with proof!" toast and the practice "caught with proof" count read UI memory.
  After a reload they quietly drop to plain "Caught".)
- A missing clue means "old battle, old rules". It must never be read as "no proof".
- An invalid clue is **ignored, not refused**. A glitch in the marking UI must never block the
  core action (Block/Escalate).
- A clue counts only on a plan the player **inspected** (policy auto-inspect included). The
  glance row (evidence[0]) does not need an exception: it is **never** a red flag in current
  story or bank content (0 of 123).

---

## 3. Recommended smallest safe design (prototyped: `fun/phase2/grading/out/prototype.diff`)

### 3.1 State (types.ts)
```ts
interface StepRuntime { ...; clue?: number | null; noStop?: boolean }  // proof battles only
interface BattleState { version: 1; grading?: "proof"; ... }              // absent = older battle
card-played event: { t: "card-played"; cardId; targetStepId?; clue?: number } // only when given
```
- `createBattle` sets `grading: "proof"`. The engine writes `clue` **only** when `grading` is set:
  a number, or null for no mark. When a plan is announced again, its clue goes back to null (a
  false-alarm plan returns to the line; this matches the UI clearing its mark today).
- `noStop` is set on a risky plan that ran while the hand held no Block or Escalate the player
  could afford.
- Why a battle flag and not a version bump: `canResume` rejects `version !== 1`. A bump would
  throw away every in-progress battle on deploy. An optional field costs nothing and keeps
  `isStepRuntime` valid.
- Size: about 10 bytes per resolved plan (about 150 bytes a battle), against a 256 KB cap.
  Airtable's `packSaveData` already drops battle state first when a save is too big.

### 3.2 Play API
- `playCard(state, enc, uid, target?, clue?)`: the clue is used only for Block and Escalate. It
  is kept if it is an integer row index of an inspected plan, and set to null otherwise.
- `endTurn(state, enc, marks?)`: records the mark on each plan that runs (for "spotted it, no
  card" and for Show me after a reload).
- `useBattle.play(uid, target, clue?)` and `endTurn(marks?)`. BattleView changes 2 lines
  (:598, :696). The "Let it run" practice path goes through the same `endTurn`.

### 3.3 Stars
- Proof battle: 3rd star = won, and falseAlarms <= 1, and **every risky plan stopped by Block or
  Escalate had a red-flag clue**. A blind block has no proof automatically, because a clue needs
  an inspected plan. So `blindBlocks` stays only for the "lucky" headline.
- Roll Back is not a catch (the plan is already graded P "Caught it late"). It needs no proof,
  and it cannot carry one: the sheet does not offer marks on plans that already ran.
- Escalate: a player who escalates without a clue loses the 3rd star. That is consistent ("Not
  sure?" is not proof), and it closes the blind-escalate loophole (section 0, point 5).
- `ResultScreen` checklist row 3: a new label for proof battles, e.g. "You named the clue for each
  catch". It must come from one engine helper (for example `starChecks(state, enc)`), not a
  second copy of the rule.

### 3.4 Mastery: rule A (measured against B and A0 in section 4.3)

| Risky plan, inspected, then... | Today | **Rule A (recommended)** | Rule B (judge's draft) | Rule A0 |
|---|---|---|---|---|
| Block/Escalate + red-flag clue | R Caught | **R "Caught with proof"** | R | R |
| Block/Escalate, no clue | R Caught | **R "Caught"** (unchanged) | P "Right call, no clue" | R |
| Block/Escalate + non-flag clue | R Caught | **P "Right call, wrong clue"** | P | R |
| Ran while a red flag was marked, no affordable stop card | W | **P "Spotted it, no card"** | P | P |
| Ran while a red flag was marked, and a stop card was in hand | W | W (the reveal already says "Trust your eye. Block it next time.") | W | W |
| Not inspected (Lucky guess, coach did the check), Roll Back, safe plans | unchanged | unchanged | unchanged | unchanged |

Why A:
- It never punishes the ESL player who finds the right answer but cannot name it. That player
  keeps R and simply misses the 3rd star.
- It does penalize a confident wrong reason, which is a real misconception (like "Lucky guess").
- It teaches calibration: mark when you are sure. A guess is worse than no mark.
- Levels, spacing, the one-level-per-shift cap, need() and the Daily focus pick need **no
  change**.

The reason strings are English idioms. Ask the copy writer for ESL-plainer versions before build.
Candidates: "Right stop. Wrong line." and "You saw it. No card." The stored strings must then
stay fixed, because saves keep them.

### 3.5 Reveal, debrief, Show me
- `revealFor` reads the recorded clue first. The kinds `caught-proof`, `missed-marked` and
  `ran-safe-marked` then survive a reload, and so do `proofCount` and PracticeResult's "N caught
  with proof".
- The debrief `resolutionText` needs 2 new lines: "You blocked it and named the clue. Caught with
  proof!" and "You blocked it. Your clue was not the risk." (proposal).
- `showMe` is unchanged (Oops and False alarm). Consider also opening Show me on "Right call,
  wrong clue": it is the one place the player learns which line was the clue.

### 3.6 Headlines
Proof battle, won, 0 misses, falseAlarms <= 1, no blind block, but some catch unproved: today's
key would be "perfect"/"sharp" ("Flawless shift...") next to 2 stars. Add a key such as
`unproved` with a Help Desk default using only `{agent}`, for example: "Nothing got past you.
Next time, mark the clue." `headlinePool` already falls back to the default pool for pathways that
do not set it. Measured golden effect: **0 of 329** headline entries change, because none of them
comes from the perfect/sharp pools (section 5).

### 3.7 Practice
Practice counts for skills from ticket 3 on (`guidedSteps` 2). Under rule A, a first-day player
who marks a wrong line on ticket 3 or 4 gets a P in their first minute. Proposal: practice
battles still record clues (for the result line and Show me), but they grade the old way. This is
a second value, `grading: "clues"` (record only), set when `mode === "practice"`. Owner decision
(section 8).

---

## 4. Measurements

### 4.1 How guessable is the proof? (`out/content-stats.json`)
Risky plans, by pathway. "Random" is the chance that a random line is a red flag.

| Pathway | Story risky | Rows | Red rows per plan | Random = proof | Last row is red | First row is red |
|---|---|---|---|---|---|---|
| Help Desk | 4 | 3-4 | 1-3 | 0.63 (bank 0.62) | 4/4 (bank 21/21) | 0 |
| Cybersecurity | 4 | 4 | 2-3 | 0.63 (bank 0.58) | 4/4 (bank 21/21) | 0 |
| Cloud & Network | 4 | 4 | 2 | 0.50 (bank 0.49) | 4/4 (bank 20/20) | 0 |
| Full-Stack | 4 | 4 | 2 | 0.50 (bank 0.49) | 4/4 (bank 20/20) | 0 |
| Business Analyst | 4 | 4 | 2 | 0.50 (bank 0.51) | 4/4 (bank 21/21) | 0 |

Practice: the last row is red on 1 of 2 risky tickets in every pathway. This matches the known
gap "proof-by-position still works on practice ticket 1". Every risky plan has at least one red
row, and no safe plan has one, so proof is always possible.

**Story 3-star rate by player type** (my careful bot, 300 seeds a pathway, HD/CY/CN/FS/BA):

| Player | Today | Proof, any red row counts | Proof, only 1 row per plan counts |
|---|---|---|---|
| Names the clue every time | 83/100/93/93/93 | 83/100/93/93/93 | same |
| Right calls, never marks | 83/100/93/93/93 | **0/0/0/0/0** | 0 |
| Right calls, marks a random line | same as today | **13/14/5/5/5** | **0/0/1/1/1** |
| Always marks the last line | same as today | **83/100/93/93/93** | 83-100 without a shuffle; about the random row with one |
| Names it 80% of the time, else no mark | same as today | 36/40/39/39/39 | same |
| "ESL": right 50%, wrong line 20%, none 30% | same as today | 6/6/7/7/7 | same |

What this means:
1. The display shuffle is **required** in the same release. Without it, the last-line trick is as
   good as expertise.
2. With "any red row counts", guessing earns 3 stars in 5-14% of runs. With 1 proof row per plan
   (or at most 1-2 of 4, for a true "ticket says / record says" pair), it drops to 0-1%.
   Concretely: add `Evidence.proof?: true` on 1 row (2 at most) per risky plan, lint it, and keep
   `redFlag` for the circles in review. Or narrow `redFlag` itself. The review sheet is already
   titled "The clue" (singular), and the reveal line names one label. This is content work, and
   the content auditor owns it.
3. "Every catch" is strict. At 80% per-catch accuracy, only 36-40% of runs earn 3 stars, the
   bottom of the 40-70% band. The band is reached through the **per-catch accuracy** of real
   players, not by relaxing the rule. "All but one catch" would give random guessers about 48%.
   Recommend: keep it strict, and measure real accuracy in playtests via the `proof` field in
   history.

### 4.2 Which grades move (dailies, risky calls, 30 players x 10 days)
HD shown; the other pathways follow the same pattern (`out/mastery-sim.txt`).
- Rule A: never marks: R83 P0 W17 (**identical to today**). Names it: R84 P4 W13 ("spotted it,
  no card" turns about 4 points of W into P). Random line: R57 P30 W13. ESL: R68 P19 W13.
- Rule B: never marks: **R0 P80 W20**. ESL: R40 P46 W15.

### 4.3 Skill levels after 11 days (lens skills; mean level, % at Practicing or above, % at Solid or above)

| Player (HD) | Today | Rule A | Rule B | Rule A0 |
|---|---|---|---|---|
| Names the clue | 3.57 / 99 / 91 | 3.63 / 99 / 95 | 3.63 / 99 / 95 | 3.63 / 99 / 95 |
| Never marks | 3.57 / 99 / 91 | **3.57 / 99 / 91** | **1.00 / 0 / 0** | 3.57 / 99 / 91 |
| Random line | 3.57 / 99 / 91 | 3.20 / 97 / 82 (1 proof row: 2.41 / 74 / 53) | 3.20 / 97 / 82 | 3.61 / 99 / 95 |
| ESL mix | 3.57 / 99 / 91 | 3.35 / 99 / 86 | 2.79 / 89 / 69 | 3.61 / 99 / 92 |

Under rule B, a never-marker cannot reach Practicing, because `criteriaLevel` needs an uppercase
R on a risky plan. It is stuck at Learning in all 5 pathways. Rule A0 rewards the random guesser
as much as the expert. **Rule A** is the only one that leaves the never-marker unchanged,
penalizes guessing, and costs a mixed ESL player only 5 points of Solid (91 to 86).

### 4.4 Save compatibility (`out/save-compat.txt`)
Today's engine was imported read-only from the repo. It played 2 turns and saved the state as
JSON. The prototype then resumed it and finished it, with the UI now sending clues.
- 2,000 of 2,000 resumed. All were graded under the old rules (`grading` absent, clues ignored).
  All had the same stars and the same per-plan result and reason as today's engine finishing the
  same battle.
- New battles: 1,000 of 1,000 JSON round trips kept `grading` and every `clue`, and still passed
  `canResume`.
- Not covered by this test: Phase 2 **content and deck** changes. `canResume` rejects a battle
  whose step ids or deck changed (for example fewer Inspects, or a story step removed). Those
  in-progress story battles then restart fresh, with no crash. That is today's behavior, but tell
  players in the release note. Swapping step order (story steps 1 and 2) keeps the id set, so
  those battles resume with their saved queue. Daily and drill specs survive the evidence
  migration, because `bankVersionOf` hashes ids only.
- Future risk: a clue is a **row index**. After proof battles exist, reordering or inserting
  evidence rows in a shipped plan would silently move stored clues. Rule: do the row migration in
  the same release, and after that only append rows. A content test can pin each risky plan's
  proof-row label per index.

---

## 5. Golden plan (Help Desk, `lib/game/__golden__/help-desk.json`)

Measured with the prototype, content unchanged (`out/golden-diff.txt`, `out/golden-proof-{A,B}.json`):

| Key | Rule A | Rule B |
|---|---|---|
| bankVersion, plans (270), built (100), full (15), skills, cards, reasons, ui, practice, story | identical | identical |
| headlines (329) | identical | identical |
| traces (112) | **25 changed**: practice perfect 6, drill perfect 8, drill escalating 8, daily perfect 1, daily escalating 2. Cause: `scoreBattle.stars` 3 to 2 (1 daily went 2 to 1). | **38 changed**: the 25 plus story perfect 12 (debrief reasons "Right call, no clue") and 1 more daily |

**Coverage gaps to fix before the recapture.** Without them the new rule is not pinned:
1. No story trace reaches 3 stars. The golden `perfect` bot runs out of Inspects and blocks
   `ortiz-access` blind on every seed (2 stars today).
2. No headline comes from the perfect/sharp pools. The 3-star ending text is not pinned.

**Recommended recapture order.** Each step is its own audited recapture, with a note in the
`golden.test.ts` header in the same style as the Phase 1a notes.
1. **Grading only** (this document; content unchanged). First add 2 policies to `capture()`:
   `proof` (perfect, plus a clue on the first proof row) and `guess` (perfect, plus clue = row 0).
   This adds about 60 new trace keys and 160 headline keys (additions only). Expected audit
   result: exactly the 25 listed traces change, plus the new keys. The fixture headlines,
   `reasons` and every `story|*` trace stay identical.
2. **Card fixes** (Coffee, Policy cost 2, Escalate budget): `cards` (coffee, policy-callback) and
   the traces of every policy that plays those cards.
3. **Content migration** (Evidence.check, the proof-row set, the story step swap,
   actionsPerTurn): `story`, `practice`, `built`, `full`, all story traces and headlines. Audit
   with the Phase 1a method: swap the old text back in and check that the rest is equal.

Splitting it this way keeps each diff small enough to read. One combined recapture would change
almost every key, and nothing could be audited.

---

## 6. Tests

Failing under the prototype (rule A), all expected:
- `engine.test.ts`: "wins when every step is resolved...", "scores stars from misses and false
  alarms", "withholds the third star for risky plans blocked without inspecting them". They
  expect 3 stars for clue-less careful play. Pass clues, or assert 2 and add a proof case.
- `balance.test.ts` "stars reward care" (hd-01-monday): careful 3-star rate 0 against >= 0.4. The
  bot must pass the proof row. Add a guess-flag bot with a limit near 0, and a never-marks bot
  that still wins.
- `golden.test.ts` traces (section 5).
- Rule B only: `mastery.test.ts` "counts a plan inspected by Policy: Callback as inspected".

New tests to add. 6 are prototyped and passing in `out/proof.test.ts`:
- clue recorded on Block/Escalate; invalid clue ignored, never refused; no clue gives R but no 3rd
  star; wrong clue gives P; legacy battle ignores clues; JSON round trip and resume.
- To add: re-announce clears the clue; `noStop` gives "Spotted it, no card"; escalate-blind loses
  the 3rd star; ResultScreen checklist equals `scoreBattle` (one helper); `toSkillRecord` keeps
  the new missWhy reasons; `toHistoryEntry` validates `proof`; a content lint (1-2 proof rows per
  risky plan, 0 on safe, never row 0); shuffle determinism (same seed and step, same order, and
  marks are content indices).
- e2e `scripts/e2e/first-five.mjs` A6 already marks the first red row and checks "Your clue". Add
  a reload after marking and blocking: the toast and the practice score must still say proof.

---

## 7. Risks and mitigations

| Risk | Evidence | Mitigation |
|---|---|---|
| **Wrong row on a phone.** The whole row is the button, and the gaps between rows are covered (row padding 6 px with -6 px margins over a 10 px gap), so any tap near a line marks it. | CSS `.evRowBtn`, `.evList` | The "Your clue: <label>" line above Block and the "Block it" label already exist; keep both. Under rule A a wrong mark costs P plus the star, so tapping a row again must clearly unmark it (it does; say so in the prompt). Never auto-submit a mark. |
| **Players who never mark** get 0% 3-star runs. | 4.1 | Teach it in practice (caught-proof already exists). Result checklist row: "Name the clue for each catch". Their skills are unaffected under rule A. |
| **ESL players who are right but cannot name the clue.** | 4.3 | Rule A (no penalty). A proof row should be a concrete fact line (ticket vs record), not a judgment. That is the Evidence.check migration. |
| **Guessing / position.** | 4.1 | Shuffle in the same release, and 1 proof row (2 at most) per risky plan. Add a band test: guess-flag 3-star <= 1%. |
| **Blocks from the hand path skip the sheet.** | BattleView :598 is the single chokepoint | Pass `marks.get(target)` there, not in EvidencePanel. |
| **Policy auto-inspected plans.** | Marks need an inspected plan, and auto counts | To get proof, the player must still open the sheet and mark. That is fine, but the coach tip should say so. |
| **Clue by index after a content edit.** | 4.4 | Append-only rows after release, plus a content test. |
| **Stars rule duplicated in ResultScreen.** | `ResultScreen.tsx:68` | One shared engine helper. |
| **"best" stars across the rule change.** Old 3-star bests were earned under the old rule. | `GameShell :780` | Leave them. Do not rewrite history. |
| **Test-run side effect.** Vitest in a copy whose node_modules is symlinked writes its cache to the repo's `node_modules/.vite` (gitignored; `git status` clean). | observed | Point the private copy's vitest config `cacheDir` into the scratchpad. |

---

## 8. Decisions for the owner (short)

1. **Rule A for skills** (no clue = still right; wrong clue = partly right). The judge's rule B
   locks non-markers at "Learning" forever.
2. **The shuffle and one proof line per risky plan ship with the grading**, or guessing earns 3
   stars.
3. **Practice records clues but does not grade them** (`grading: "clues"`), so a new player is not
   marked down in the first minute.
4. **Recapture the golden in 3 audited steps**, starting by adding a "proof" policy.

---

## 9. Files

- `fun/phase2/grading/out/prototype.diff`: the engine/types/mastery/reveal prototype (77 lines).
- `fun/phase2/grading/out/proof.test.ts`: 6 contract tests (pass in the copy).
- `fun/phase2/grading/scripts/`: `content-stats.mjs`, `mastery-sim.mjs` (env HL_PROOF=0,
  HL_NOCLUE=A|B|A0, HL_ONEFLAG=1), `save-compat.mjs`, `golden-policies.mjs`, `story-perfect.mjs`,
  `golden-diff.py`, `load.mjs` (jiti loader: `node scripts/x.mjs <appDir>`).
- `fun/phase2/grading/out/`: `content-stats.json`, `mastery-sim.txt`, `mastery-sim-oneflag.txt`,
  `save-compat.txt`, `golden-diff.txt`, `golden-head.json`, `golden-proof-A.json`,
  `golden-proof-B.json`, `vitest-proof.txt`.
