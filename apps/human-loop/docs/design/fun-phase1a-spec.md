# Human Loop, Phase 1a: a real choice in the first minute, and results you can see

Single source of truth for this build. It is the judge's `phase1_spec.md` with every critic
amendment applied and every critic cut taken (see "Deferred"), narrowed to Phase 1a by the
orchestrator's brief. Where the three disagree, section 0 says which wins and why.

App: `/home/user/ThreatForge/apps/human-loop`. All paths below are relative to it.

Out of scope in Phase 1a (do not change): engine rules (`lib/game/engine.ts` playCard, endTurn,
scoreBattle), stars, mastery grading (`lib/game/mastery.ts`), story/daily/drill/bank content,
`pathway.json` files other than what is listed, skills.json, hub.json.

The owner's two questions and how 1a answers them:
- "What AI skill is being learned?" The cold open names it on screen 1 ("You check its plans."),
  every reveal line names what the agent did not check ("Ollie didn't check: Sender address."),
  and the practice result says "You practiced: checking an AI agent's work before it runs."
- "How is this fun?" A real, unscripted choice on the first sheet (tap 4 from the landing page),
  a "spot it" gesture (tap the line that looks wrong), and outcomes you see on the stage (a
  vignette, a held face) before any text covers it.

---

## 0. Decisions: contradictions resolved

| # | Topic | Judge | Critic | Phase 1a decision |
|---|---|---|---|---|
| 1 | guidedSteps | set to 0 | keep 2 | **Keep 2** in all 5 practice.json. It now means only "not counted for mastery". The coach never reads it. Mastery reasons stay byte-identical. |
| 2 | Mirror ticket | swap steps 0/1 | option A: 4 new safe mirrors | **Option A.** Ticket 1 risky, ticket 2 a NEW safe mirror that passes the same check (drafts in §5). HD already has one (reyes-jam-guide). |
| 3 | Coach idle help | 8 s idle timer | pull hint | **Pull hint** "Where do I look?" (practice only). No timer, no input tracking. Auto-shown on the plan right after a wrong call. |
| 4 | False-alarm held mood | celebrate | sad | **sad**. "celebrate" is only for a clean win, everywhere. |
| 5 | Vignette family | by category | skill first, then category | **Orchestrator rule:** `skill === "guard-data"` -> leak; else `category === "report"` -> report; else system. breakin deferred to Phase 3. Consequence: the HD ticket-1 miss plays "system", the BA ticket-4 miss plays "leak" (A7). Implemented: `lib/game/reveal.ts vignetteFor()`. |
| 6 | Reveal wording | "{Agent} skipped: {label}" | "{Agent} didn't check: {label}." | **"didn't check"** (plain verb). Used by caught, caught-proof, missed, rolled-back, escalated. |
| 7 | False-alarm line | "That one was fine. {tell}" | "That one was fine. Tap **Show me**." | **Critic.** The tell appears only as the review-sheet caption. |
| 8 | Where the reveal line is composed | coach.ts | outside coach.ts | **Outside**: `reveal.ts practiceBar()`. coach.ts never imports reveal.ts and never reads safe/redFlag/key (tests). |
| 9 | Won with misses: mood | stage sad, portrait idle | (silent) | **idle everywhere** (stage held mood, result portraits, ResultScreen outro faces, ShiftResult). One helper: `reveal.resultMood()`; `bus.heldMood()` for fx win clean:false -> idle. |
| 10 | Block label with a mark | "Block: <label>" | "Block it" + "Your clue: <label>" line | **Critic.** |
| 11 | Spot-it prompt | "Anything wrong? Tap that line." | "Check each line. Anything wrong? Tap it." | **"Check each line. Anything wrong? Mark that line."** (review fix: no "Tap" on the owner's BA test screen, A14; matches the "Marked" badge). |
| 12 | Undo row (irreversible) | "No. One-way. Be extra sure." | "No. One-way. Check it well. One-way is OK if it's right." | **"No. One-way. That is OK if it is right."** The critic's 12-word line breaks the 90-word first sheet; its fallback uses parentheses (hard for ESL). This keeps "one-way can be fine". Reversible: "Yes. It can be undone after it runs." Read-only: unchanged. `undoNote` still overrides. Same copy in every mode. |
| 13 | Skip practice | practice top bar | Menu only | **Menu only**, next to "Replay intro", while practice is not done. |
| 14 | "Start the real shift" | opens the story battle | opens the hub with one bark | **Hub with one bark** (practice `hubBark`), the hub's main button focused, first-visit desk lines skipped on this path. |
| 15 | 1-tap "Let it run" | any 1-plan board | practice, or a narrow story rule | **Practice only.** Story/daily/drill keep "Looks OK". The narrow rule is deferred. |
| 16 | Auto-target | Inspect and Roll Back | Inspect only | **Inspect only**, all modes. |
| 17 | BA definition | 14-word cap drops it | 18-word row or `gloss` | **`gloss` field** (optional, 12 words or fewer, one per plan, rendered small under the label). Detail rows stay 14 words or fewer. |
| 18 | key row | at most 1 per safe step | unchanged | **Exactly 1 on every practice safe plan** (so Show me can tick it); 0 on risky plans; optional elsewhere. |
| 19 | Mark index | display index | content index | **Content index** into `step.evidence`. Display order = content order (shuffle cut). The undo row and the Ask line are not markable. |
| 20 | Toast timers | readingMs | outcome toasts never auto-hide | **Critic.** Only tone "hint" toasts keep a timer. |
| 21 | Where coldOpen lives | practice.json | (same) | **practice.json `coldOpen`**, required by content tests. `hubBark` is optional in practice.json; `create.ts` hydrates a default. |
| 22 | Scope | whole Phase 1 | split 1a/1b | The orchestrator's 1a = critic's 1a **plus** vignettes + held moods + 1-tap Let it run in practice. The end-step merge stays in 1b (Deferred). |

---

## 1. Player-facing behavior, beat by beat

### 1.1 Landing and /play (new player, phone)
1. Landing `/`: the hero "Play free" button goes to `/play`. Each pathway button on the landing
   page (`components/site/PathwayGrid.tsx` and any "Play <Pathway>" link) goes to `/play/<id>`.
2. `/play` without a profile (`components/site/PlayClient.tsx` SignUpView, `SignUpForm.tsx`):
   - In the teal welcome panel, directly under the subtitle, a full-width primary orange button
     **"Play now"** (guest; calls `onGuest`). It is above the fold at 390x844 AND 375x667.
   - Subtitle: "No sign-up needed. Save your progress later." It is true: on the picker a guest
     has "Save your progress", which opens the sign-up form inline; `signUp()` keeps the guest's
     progress. `?next=` is parsed by `lib/site/nextPathway.ts safeNextPathway()` (exact live id only,
     unit-tested).
   - The name/email form stays below under a small heading "Save your progress (optional)".
   - Under 768 px the old "Play as guest" button is removed; on desktop keep it (it may also say
     "Play now"). 13+ and consent rules unchanged.
3. `?next=<id>`: `GameShell` boot with no profile does `router.replace(\`/play?next=${pathway.id}\`)`
   (today `router.replace("/play")`, GameShell.tsx ~458). After guest or sign-up, PlayClient does
   `router.push(\`/play/${next}\`)` when `next` is one of the 5 pathway ids, else shows the picker.
4. Picker: unchanged cards, except "Start over" is hidden for a guest with no progress in any
   pathway. (The compact 5-tile grid is deferred.)

Tap budget: landing -> Play free (1) -> Play now (2) -> pathway card (3, scrolling allowed) ->
Inspect card (4) = the first real decision. Deep link `/play/<id>`: Play now (1) -> Inspect (2).

### 1.2 First run: no intro slides, a cold open that names the skill
- `GameShell`: when `!introSeen && !practiceDone`, set `introSeen = true` and call
  `startPractice()` directly. IntroSequence is not shown.
- The practice board's coach bar on ticket 1 (not inspected, sheet closed) reads
  `${coldOpen} **Inspect** its plan.`, ring on the Inspect card.
  HD: "I'm Dana. Ollie is our AI. It's fast, not careful. You check its plans. **Inspect** its plan."
- Menu (GameShell `GameMenu`) gains:
  - **"Replay intro"**: opens `IntroSequence` (existing component and practice.json `intro` lines)
    as an overlay; its last button closes it and returns to the view it was opened from. It never
    starts or restarts a battle.
  - **"Skip practice"**: only while practice is not done. Uses the existing `skipPractice`.
- The practice battle top bar has NO "Skip practice".

### 1.3 A practice ticket (all 5 pathways, 4 tickets)
Order (content order): 1 risky "who asked / who approved", 2 its safe mirror (same skill),
3 scary-safe, 4 routine-risky. One plan per turn (`actionsPerTurn [1]`), cards Inspect + Block.

1. Board: the plan card (ticket, intent, the agent's quip), the hand, the coach bar.
2. Tap the **Inspect** card. `validTargets` has exactly one plan, so it plays at once (auto-target)
   and the evidence sheet opens, inspected. (Tapping the plan card first still opens the sheet
   un-inspected with its own Inspect button.)
3. The sheet (decision screen), top to bottom:
   - ticket + intent (the quip is hidden when the board already shows it: `showQuip`);
   - prompt: "Check each line. Anything wrong? Mark that line." (every mode, on an inspected, unresolved plan);
   - evidence rows in CONTENT order, each a button (spot it, §3);
   - the "Can we undo it?" row (plain text, not markable), copy per §0 #12;
   - the "Ask:" line (plain text, not markable);
   - PRACTICE ONLY: a text button **"Where do I look?"** (44 px tall). One tap shows
     `coachScript.idle[k]` (k = the plan's content index) in the sheet's coach line and the coach
     bar. It never expires; the button is then replaced by the line (aria-live polite).
   - when a row is marked: a line above the buttons "Your clue: <label>";
   - two equal buttons (same size, same weight, both outlined; no orange ring in practice):
     **Block** (or **"Block it"** when a row is marked) and **"Let it run"** (practice, inspected)
     / "Looks OK" (other modes, inspected) / "Not now" (not inspected).
4. "Let it run" (practice) closes the sheet and approves (endTurn) in ONE tap. The practice board's
   main button also reads "Let it run" (one action, one name; story/daily/drill keep "Approve N plans").
5. The stage plays the outcome FIRST (vignette + face, §4), then the outcome toast appears docked
   below the stage (600 ms later; 400 ms with reduced motion). The toast never auto-hides.
6. Oops and False alarm toasts have a secondary **"Show me"** button next to Next (all modes).
7. The coach bar shows the reveal line (§2) until the player plays a card.
8. Tap Next (toast) -> next ticket. Taps per plan: safe = Inspect, Let it run, Next (3);
   risky = Inspect, mark, Block, Next (4).

After a wrong call (missed, missed-marked, false-alarm), the NEXT plan's sheet shows its
"Where do I look?" line automatically once inspected (the button is already "pressed").

### 1.4 Show me (review sheet), every mode
`EvidencePanel mode="review"` opened from the toast's Show me:
- read-only; focus moves to its heading **"The clue"**;
- risky plan: every red-flag row (`reveal.flagIdx`) circled in red pen (`data-clue="flag"`, inline
  SVG ellipse, drawn in 500 ms; instantly with reduced motion), caption under the rows =
  `reveal.caption` (the plan's `tell`);
- safe plan: the key row (`reveal.keyIdx`) ticked green (`data-clue="key"`), same caption;
- the player's own mark, if any, keeps its "Marked" badge;
- the player's mark, when the review does not circle it: one line under the rows, "Your mark: {label}.
  Odd, but not the risk." (or "... It checks out." on the key row);
- one button **"Got it"**: closes and returns focus to the toast's Next, or to the main button when
  the toast has no Next (Block outcomes).

### 1.5 Practice result (PracticeResult.tsx)
- Headline: `practiceScoreLine(right, 4, proof)` -> "3 of 4 right." or "4 of 4 right. 2 caught with
  proof." The proof sentence renders on its own line (never "right. 2" / "caught with proof."). (`right = steps.length - mistakes.size`; `proof = proofCount(state, enc, marks)`; marks
  come up from BattleView in memory; after a reload proof is 0 and the sentence is omitted).
- Subline: the existing mistake text.
- Line: `PRACTICED_LINE` = "You practiced: checking an AI agent's work before it runs."
- Heading "What gave it away" -> **"The clue"** (also in Debrief.tsx).
- Buttons: primary **"Start the real shift"**, secondary **"Practice again"**.
- Portrait mood `resultMood(state, enc)`; confetti only when `isCleanRun(state, enc)`.

### 1.6 Start the real shift -> the office, one bark
- "Start the real shift" goes to the HUB (not the battle).
- The coach says ONE line: practice `hubBark` (HD "Monday starts here. Tap **Start shift**.") in
  the dialogue box, one screen, no "1 of 6". The line names the focused main button; the bark has no
  "OK" button (its X closes it, and focus stays in the game) and the TODAY banner is hidden while it
  is up: one instruction on the screen.
- Focus lands on the hub's main button ("Start shift").
- On this path the agent desk's first-visit `lines` are skipped: "Start shift" (or reaching the
  desk) starts the story at turn 1. The coach's 6 talk lines only play if the player taps the coach.

### 1.7 Result screens (all modes)
Celebrate and confetti only on a clean run (won, no risky plan left executed):
PracticeResult.tsx (~103), ResultScreen.tsx (~124 portrait, ~183 outro SpeakerFace moods),
ShiftResult.tsx (~90, Daily and drill), GameShell result stage mood (~589). All use
`resultMood()` / `isCleanRun()` from `lib/game/reveal.ts`.

---

## 2. Reveal (implemented: `lib/game/reveal.ts`, tested: `lib/game/reveal.test.ts`)

`revealFor(state, enc, stepId, markedIdx?) -> Reveal | null` (null until resolved, and null again
once a blocked safe plan is back on the board). Fields: `kind, stepId, flagIdx, keyIdx,
markedIdx, label, line, caption, proof, showMe, wrong`.

| kind | when | line (16 words or fewer; `**x**` = bold control) | showMe | wrong |
|---|---|---|---|---|
| caught-proof | risky blocked, marked row is a red flag | "Caught with proof! {Agent} didn't check: {label}. You did." | no | no |
| caught | risky blocked, no mark or mark not a flag | "Caught! {Agent} didn't check: {first flag}." | no | no |
| missed | risky ran, no flag marked | inspected: "{Agent} didn't check: {first flag}. Tap **Show me**." / not inspected: "Nobody checked: {first flag}. Tap **Show me**. Check first next time." | yes | yes |
| missed-marked | risky ran, a flag was marked | "You spotted it: {label}. Trust your eye. Block it next time." | yes | yes |
| rolled-back | risky ran, then Roll Back | "Rolled back. {Agent} didn't check: {first flag}." | no | no |
| false-alarm | safe blocked or rolled back | "That one was fine. Tap **Show me**." | yes | yes |
| ran-safe | safe ran, no mark | inspected: "You checked. It was fine. Good work should run." / not: "That one was fine. Check first next time." | no | no |
| ran-safe-marked | safe ran with a mark | "You marked {label}. It was fine. Good work should run." | no | no |
| escalated | escalated (safe or risky) | risky "{Coach} caught it. {Agent} didn't check: {label}." / safe "{Coach} checked it. It was fine. Good work should run." | no | no |

- `{Agent}` = first word of the agent name. `{label}` = the marked flag's label, else the first
  red-flag row's label (content order). `caption` = `tell` (review sheet only).
- Toast title for caught-proof: `PROOF_TITLE` = "Caught with proof!" (BattleView overrides the
  beat's "Caught!" title). No PROOF chip on the plan card.
- `practiceBar(state, enc, marks, { reviewed })`: practice only. After a resolution and before the
  next card play. The line drops the toast's title for caught/caught-proof (it starts at "{Agent}
  didn't check…") and drops " Tap **Show me**." once that plan's review was opened (`reviewed`). Tail:
  board empty -> `"{line} Tap **Next ticket**."` target "approve"; the plan on the board is already
  inspected (a blocked safe plan came back) -> `"{line} It's back. Tap the plan to look again."`
  target "plan" (never Inspect: nothing left to inspect); a new plan -> `"{line} Next plan:
  **Inspect** it."` target "card:inspect", or just `"{line}"` with the same ring once the player has
  played Inspect twice; battle over -> `"{line} Tap **See how you did**."`. Otherwise null. Only one
  Show me is on screen at a time: the bar hides its own while the toast has one. BattleView uses
  `practiceBar(...) ?? coachHint(...)` for the coach bar in practice. In story/daily/drill the
  coach bar does not change in Phase 1a.
- Other helpers: `isMarkable, flagIndices, keyIndex, vignetteFor, isCleanRun, resultMood,
  proofCount, practiceScoreLine, PRACTICED_LINE, wordCount`.

---

## 3. Spot it (EvidencePanel.tsx, battle.module.css), every mode

- Only on an inspected, unresolved plan. Rows are `<button aria-pressed>` in a `<ul>`; Up/Down
  arrows move between rows (roving tabindex); Tab leaves the list to Block, then the approve
  button. Visible focus ring. Each button's accessible name is "<label>: <detail>[ <gloss>]".
- One mark per plan; tapping the marked row unmarks it. BattleView keeps
  `Map<stepId, contentIndex>` in memory (not saved). The mark for a plan is cleared when that plan
  is announced again.
- Marked row: red-pen loop (inline SVG rounded rect that hugs the row, so it never crosses the row
  label at any width; danger token; it wipes in over 500 ms with a clip-path, drawn instantly with
  reduced motion; dashes are not used: with non-scaling-stroke Chromium ignores pathLength), a "Marked" text badge with an icon (not color alone), live
  region "Marked: <label>" / "Unmarked: <label>".
- Block when a row is marked: visible "Block it", the line "Your clue: <label>" above the buttons,
  accessible name "Block it. Your clue: <label>. Costs 1 energy." (practice hides energy: omit
  "Costs 1 energy.").
- Nothing reveals correctness before resolution. No `redFlag`, `key` or `data-clue` reaches the
  DOM before the plan resolves.
- `gloss`: small text under the row's label, inside the row button.
- Filename/code chips (artifact text) wrap between whole tokens only, never inside a token
  (`white-space: nowrap` per chip, wrapping allowed between chips).
- Phones: sheet max-height 72svh.

---

## 4. Show, then tell (stage, toasts, fixed stage)

### 4.1 Stage messages (implemented in `lib/game/bus.ts`)
- `FxMessage { type: "fx"; fx: FxName; intensity?; vignette?: VignetteFamily; clean?: boolean }`.
  `vignette` only on fx "risk" (= `vignetteFor(step)`); `clean` only on fx "win" (= `isCleanRun`).
- `heldMood(msg)`: agent-mood -> its mood; risk -> sad; catch -> busted; false-alarm -> sad;
  execute-safe -> idle (good work that runs clears a busted or sad face); win -> clean ? celebrate :
  idle; others -> null (no change). The held mood stays until the next
  "agent-mood" message (a turn beat).
- `fxTag(msg)`: "risk:leak" / "risk:report" / "risk:system" / "catch" / "win:clean" / "win" / ...
- Timing constants: `VIGNETTE_MS 1100`, `RISK_EAGER_MS 1200`, `TOAST_DELAY_MS 600`,
  `TOAST_DELAY_REDUCED_MS 400`, `BEAT_READY_AFTER_TOAST_MS 350`, `toastDelayMs(rm)`.

### 4.2 eventsToBeats (lib/game/useBattle.ts)
- New optional 3rd parameter `state?: BattleState` (the state after the events). Existing callers
  (golden traces) pass 2 arguments and get identical toasts and logs.
- executed risky: `{ type: "fx", fx: "risk", intensity, vignette: vignetteFor(step) }`.
- end won: `{ fx: "win", clean }` with `clean = state ? isCleanRun(state, enc) : undefined`, then
  `mood(clean ? "celebrate" : "idle")`. Lost: unchanged.
- New pure `toastMs(toast)`: 0 for every tone except "hint" (which keeps `readingMs`). BattleView
  uses it for player-phase toasts (today `readingMs` at BattleView.tsx ~513).

### 4.3 BattleScene / createStage
- fxRisk plays the vignette of `msg.vignette` (~1100 ms, Phaser Graphics + existing textures,
  8 objects or fewer, positioned from layout points P); the agent shows "eager" for
  RISK_EAGER_MS, then settles on the held mood. Families:
  - leak: 5 envelopes/papers arc from the desk to the right edge into a faceless grey "?" silhouette;
  - report: a mini bar chart flips upside down;
  - system: a small monitor turns red with 3 error lines and 3 spark particles.
  Jokes target the agent only, never victims. No vignette given: the old generic effect.
- createStage sets `rt.mood = heldMood(msg) ?? rt.mood` for every message, so update() settles on
  the held mood after a transient mood.
- fxWin: confetti only when `clean === true`. A win with misses shows no cheer word (no "Shift
  saved!"), only a soft flash. A clean win right after a catch waits VIGNETTE_MS, so "Busted!" and
  the face play first.
- Reduced motion: the vignette's end frame fades in (calmShow 200 ms in, 900 ms hold, 300 ms out).
  No movement, flight, particles or shake.

### 4.4 Toasts (BattleView.tsx, OutcomeToast.tsx)
- Dock: move `toastAnchor` after `stageWrap` in the DOM, absolutely positioned at the top of the
  plans/hand area. It may cover the plan list, never the stage. Next and Show me sit inside the
  toast in the thumb zone.
- Timing: `showAgentBeat` and `tryPlay` call `showToast` `toastDelayMs(reducedMotion)` after
  emitting the stage message. The beat's Next is ready `BEAT_READY_AFTER_TOAST_MS` after the toast
  appears. Player-phase toasts (Caught!, Policy, Coffee) use the same dock and delay.
- Outcome toasts (caught, false alarm, oops, done, rolled back, escalated, any with Show me) never
  auto-hide: they close on Next, Close, or the next card play. Only tone "hint" toasts keep a timer
  (and are also written to the live log).
- Test hooks: stageWrap carries `data-last-fx = fxTag(msg)` and `data-agent-mood` = the held mood
  (track with `heldMood`), updated as each message is emitted.
- The agent-phase skip link always reads "Skip" (drop the `phaseHasRiskAhead` wording). It has the
  same ready guard as Next (no skipping an outcome before its toast is in), and a held Enter/Space
  never pages through toasts (key-repeat guard on the toast dock).
- A card-play outcome toast (no Next) also closes when the player picks a card or taps a plan, so it
  never covers the plans they are about to pick. Agent-beat toasts (with Next) stay.
- End of battle: the stage end card waits 2200 ms (400 ms reduced motion). Practice has no stage end
  card (the coach bar and "See how you did" say it); elsewhere it sits on the stage's bottom edge with
  no white veil. The end bar's reveal line is also sent to the polite live region.

### 4.5 Fixed stage (battle.module.css, Hand.tsx)
- `.stageWrap { flex: 0 0 clamp(170px, 30svh, 280px) }`; under `@media (max-height: 700px)`
  `clamp(150px, 26svh, 280px)`. Keep the short-landscape override (max-height: 560px block).
  The plan list is the flexible, scrolling region (at least 88 px tall at 375x667).
- Practice hand: `!showCost` -> 17% of the column height and cards 1.12 x their width tall (CSS
  `--ch`); 2 card types elsewhere: 20%; else 25% at 1.42. At 375x667 the first plan card and its quip
  fit without scrolling (A16).
- Freeze `showQuip` while a phase or plan-leaving animation runs. Hand card width stays at its
  turn-start value until the next deal. The stage height does not change during a payoff.

---

## 5. Practice content (content/<pathway>/practice.json). HD is done: copy its shape.

Template: `content/help-desk/practice.json`. Rules (enforced by `lib/game/content.test.ts`,
constants in `lib/pathways/testing.ts`):
1. Order: `[risky no-twist, safe no-twist mirror, safe "scary-safe", risky "routine-risky"]`;
   `steps[0].skill === steps[1].skill === EXPECT.practiceMirrorSkill`.
2. `guidedSteps: 2` stays. `actionsPerTurn [1]`, handSize, energyPerTurn, starterDeck, maxRisk,
   maxTurns unchanged. Risky risk sum < maxRisk (practice never breaches).
3. `coldOpen` (required): 16 words or fewer, names the coach, the agent, "AI", and the skill
   ("check"), no button names, no `**`. Pattern: "I'm {Coach}. {Agent} is our AI. It's fast,
   not careful. You check its {plans|code|reports}."
4. `coachScript: { idle: [4 lines] }` only (delete firstSafeSheet/firstRiskySheet). Each line 12
   words or fewer, says where to look, the same form for safe or risky, no button names
   (`DECISION_WORD_RE`; "Rollback plan" as a record name is fine, "Roll Back" is not), no verdicts. Lines follow the skill at each position.
5. `hubBark` optional (default "{Day} starts here. Tap **Start shift**."). It must end with
   "Tap **Start shift**." (the focused hub button). Only write it to improve on the default.
6. Evidence: every `detail` 14 words or fewer, facts only, no verdict words (`PRACTICE_VERDICT_RE`:
   "that is the", "no match", "which matches", "is on file for", "looks fine", "is safe",
   "suspicious", "fake", "no client data", ...). Where a check needs a record, the record is its
   own row. Row 0 never a flag. Practice risky plans need not end with a flag: the routine-risky
   ticket (4) ends with a plain fact in all 5 pathways, so "mark the last line" is never a sure way
   to proof (content.test). Story/daily/bank keep "red flags last". Ticket 1's rows (labels +
   details + gloss) 36 words or fewer; any plan 50 or fewer.
7. `key: true` on exactly one row of every safe plan (the row that makes it OK), never on risky.
8. `gloss` optional, at most one per plan, 12 words or fewer.
9. Quips: equally eager on safe and risky plans, never name the flaw; every noun matches the
   evidence. Every sentence of practice copy 15 words or fewer.
10. Intro (shown only by "Replay intro"): the last line must not promise to show what to tap.
    HD: "Practice first. Four tickets, one at a time. You make the calls."
11. Fictional names only (RETIRED_NAMES and the brand regexes). The new names below are DRAFTS:
    run the name check before shipping.

### 5.1 Cold opens and idle lines
| Pathway | coldOpen | idle[0] = idle[1] | idle[2] | idle[3] |
|---|---|---|---|---|
| HD (done) | I'm Dana. Ollie is our AI. It's fast, not careful. You check its plans. | Who asked? Compare the sender with the directory. | Big action. Check the device record and the runbook. | What was asked? Compare the ticket with what it will share. |
| CY | I'm Kofi. Patch is our AI. It's fast, not careful. You check its plans. | Who sent it? Compare the sender with the record on file. | Big action. Check the alert and the playbook. | What was asked? Compare the threat note with the change. |
| CN | I'm Nadia. Nimbus is our AI. It's fast, not careful. You check its plans. | Who approved it? Check the change approval and the calendar. | Big action. Check the schedule and the rollback plan. | What was asked? Compare the request with what it will share. |
| FS | I'm Leo. Piper is our AI. It's fast, not careful. You check its code. | Who approved it? Check the code review and the policy. | Big action. Check the error monitor and the rollback plan. | What was asked? Compare the ticket with what it will log. |
| BA | I'm Marisol. Quill is our AI. It's fast, not careful. You check its reports. | Who signed off? Check the sign-off record and the policy. | Big action. Check who asked and the version history. | What was asked? Compare the request with the export preview. |

### 5.2 New safe mirrors (critic amendment A). Replace the old match-request safe step.
Each is `safe: true, risk: 0, progress: 1`, no twist, no direction. Keep row 0 the request.

**CY: `cy-lin-release-verified`** (verify-identity, comms, reversible false)
- ticket "#60912 · Bramwell Logistics"; intent "Release a held invoice email to P. Lin"
- quip "A held email! Releasing it to P. Lin now. Freedom for emails!"
- evidence: Release request: "\"Please release the held invoice from Brindlemoor Freight.\" P. Lin, Accounts" ·
  Sender address: "billing@brindlemoorfreight.com" · Vendor record (key): "Brindlemoor Freight · billing@brindlemoorfreight.com · vendor since 2021" ·
  Mail check: "Domain registered 2019. Sender checks pass. The email has a PDF invoice."
- outcome: executed "Lin gets the invoice. Accounts pays on time. Brindlemoor sends a thank-you." ·
  blocked "The invoice stays held. Brindlemoor calls twice. Accounts asks why." ·
  escalated "Kofi checks it. \"Real vendor, real domain. Let that one go.\""
- tell "The sender's domain matches the vendor record, and it's years old."
- lesson "Who sent it? The domain matches the vendor record. Held mail can be real."

**CN: `cn-fw-2231-approved`** (check-approval, network, reversible true)
- ticket "#70912 · Bramwell Logistics"; intent "Apply firewall change CHG-4102 for Bramwell"
- quip "Firewall change is ready! Applying it now. My favorite paperwork."
- evidence: Change ticket: "CHG-4102 lets BL-FW-01 send backups to the new site. Written by Nimbus." ·
  Change approval (key, gloss "An approval is a human's written OK."): "Approved by: A. Mensah, Bramwell's approver, 4:10 PM." ·
  Change calendar: "Tonight's approved list for Bramwell: CHG-4102, 12:00 to 2:00 AM."
- outcome: executed "Backups reach the new site by 1 AM. Nimbus calls it a flawless migration." ·
  blocked "The approved change misses its window. Mensah asks why." ·
  escalated "Nadia checks it. \"Human approval, on tonight's list. That one can run.\"" ·
  rolledBack "You undo the change. Backups stop reaching the new site. Mensah is confused."
- tell "A. Mensah, a human, approved it, and it's on tonight's list."
- lesson "Who approved it? A human approver signed it, and it is on tonight's list."

**FS: `fs-phone-merge-reviewed`** (check-approval, code, reversible true)
- ticket "#80912 · Pinecrest Dental"; intent "Merge PR #229: fix the phone field"
- quip "The phone fix is ready! Merging it now. Four lines of joy."
- evidence: Pull request: "PR #229 by Piper: the phone field takes dashes and spaces." ·
  Code review (key, gloss "A code review is a human check."): "Approved by: V. Iyer, senior developer, 2:50 PM. 290 tests passed." ·
  Policy CR-02: "Piper may open pull requests. A human must approve before any merge."
- outcome: executed "Patients can type dashes again. Ibarra sends a thumbs-up." ·
  blocked "The reviewed fix waits. Patients still see 'not valid.' Ibarra calls again." ·
  escalated "Leo checks it. \"Human review, tests pass. That one can merge.\"" ·
  rolledBack "You undo the merge. The phone field rejects dashes again. Ibarra sighs."
- tell "V. Iyer, a human, reviewed and approved this exact change."
- lesson "Who approved it? A human reviewer approved this exact change before the merge."

**BA: `ba-fixed-report-signed`** (check-approval, report, reversible true)
- ticket "#90912 · Harlow & Cole"; intent "Publish the fixed advisor survey report"
- quip "Report's done! The chart goes up. Publishing it to the advisors now!"
- evidence: Report draft: "Advisor survey report, version 2. The typo in chart 3 is fixed." ·
  Sign-off record (key, gloss "Sign-off: the owner's written OK."): "Signed off by: R. Fairbanks, the report's owner, 11:40 AM." ·
  Policy SC-02: "Quill may draft reports. Only a human owner may sign off."
- outcome: executed "The advisors get the survey report. Fairbanks sends a thumbs-up." ·
  blocked "The signed-off report waits. Fairbanks asks why it isn't out yet." ·
  escalated "Marisol checks it. \"The owner signed off. That one can go out.\"" ·
  rolledBack "You unpublish the report. Advisors see a blank page. Fairbanks is puzzled."
- tell "R. Fairbanks, the owner, signed off. A human, not Quill."
- lesson "Who signed off? The report's owner, a human, signed off. Signed-off work can go out."

BA ticket 1 (`ba-self-signoff`, the owner's test screen, no word "Tap", 90 words or fewer, rows
36 words or fewer) keeps its definition through `gloss` on "Sign-off record". Rows (35 words):
Report draft: "Reply-time report. Publishing shows it to 30 advisors." · Sign-off record (flag,
gloss "Sign-off: the owner's written OK."): "Signed off by: Quill (AI). Human reviewer: none." ·
Policy SC-02 (flag): "Only a human owner may sign off reports." (Drop the "Quill's reason" row
here; the reveal brings the self-sign-off back.)

### 5.3 Neutral quips for the other plans (judge §3c drafts; check nouns against evidence)
- CY romero-release: "The CFO wants his email back! Releasing it now. CFOs hate waiting."
- CY cdn-deny: "Bad IP spotted! Adding a deny rule now. Firewalls love me."
- CN fw-self-approve: "Firewall change is ready! Shipping it before lunch. So efficient!"
- CN xray-link: "X-rays to send! Making a share link now. Links are so easy!"
- FS self-merge: "The fix is done! Merging to main now. Ship it!"
- FS form-log: "More logging! Now we'll see every bug. I love clues."
- BA self-signoff: "Report's done! The chart goes up. Publishing it to the advisors now!"
- BA noshow-list: "The no-show list is ready! Emailing it to the clinic team now."
(The scary-safe quips may stay if they pass the rules.) The AI-specific failure ("I signed off my
own report!") comes back after resolution through the reveal line and the flagged row.

---

## 6. Coach (lib/game/coach.ts, practice)

- Delete `LOCK_INSPECT_FIRST` and every CoachLock return. Keep the `CoachLock` type and the
  optional `lock` field (EvidencePanel/BattleView still compile); practiceCoach never sets it.
- `CoachUi` gains `hint?: boolean` (the pull hint is shown for the open sheet's plan). No idle.
- `k` = the content index of the plan on the board. Beats:
  - status not playing: `p-end` "Tap **See how you did**." (unchanged)
  - board empty: `p{k}-empty` "Tap **Next ticket**." target "approve"
  - not inspected, sheet closed: k === 0 and no requeue: `p0-a` `${coldOpen} **Inspect** its plan.`
    (no coldOpen: "{Agent} has a plan. Check it first: tap **Inspect**."), target "card:inspect";
    requeued and not inspected: `p{k}-back` "It's back. Look again, then decide." target "plan";
    (inspected, sheet closed, requeued: `p{k}-back` "It's back. Tap the plan to look again." target "plan")
    else `p{k}-a` "Next plan. **Inspect** it." target "card:inspect"
  - not inspected, sheet open: `p{k}-hidden` "Evidence is hidden. Tap **Inspect** to see it." target "sheet:inspect"
  - inspected, sheet open: `ui.hint` ? `p{k}-look` `coachScript.idle[k]` : `p{k}-sheet` "" ; target null
  - inspected, sheet closed: `p{k}-call` "Block it or let it run." target null (both choices,
    never one)
  - a card selected and the sheet closed: the card prompt (as today), id `p{k}-card-...`
- Never targets "sheet:block", "sheet:ok" or "approve" while a plan is unresolved. Never reads
  safe, redFlag, key, twist, direction; never imports reveal.ts.
- `sheetCoach` passes `hint` through.
- Keep `drillCoach` as is; fix its caller (GameShell ~864):
  `drillCoach(drillSkill, level, pathway.skill(drillSkill).whereToLook)`.

---

## 7. Deferred (critic cuts and Phase 1b)

- Evidence display shuffle (`evidenceOrder.ts`, judge 4e) and its test: Phase 2, with the
  story verdict migration. Display order = content order in 1a.
- breakin vignette: Phase 3 (identity/access plans use "system").
- PROOF chip on the plan card: cut (the toast title carries it).
- Roll Back auto-target: cut (Inspect only).
- 8 s idle timer, `CoachUi.idle`, input tracking, timed A9: cut (pull hint instead).
- Compact 5-tile picker grid: deferred (the "Start over" hide fix stays).
- 1-tap "Let it run" in story/daily/drill, and its narrow rule: deferred.
- End-step merge ("See how you did" on the last beat, 1500 ms end effect, no separate Finish,
  replacing "<Agent> is working..." with the coach line): Phase 1b.
- Grading spot-it (proof in stars/mastery): Phase 2. Presenter `?demo=turn2` link, card economy,
  3rd-star retune: Phase 2. Tap-to-define chips: Phase 3 (`gloss` is the 1a stand-in).
- Reveal lines in the story/daily coach bar: later (1a changes only toasts and Show me there).
- Playwright simplifications taken: A8 samples at turn start and 1 s after each action; A11
  checks only data attributes and toast delay; A13's Daily/drill sub-check dropped.

---

## 8. Acceptance checks

### 8.1 vitest (gates: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`,
`npm run check:bundles`)
- Done (foundation): `reveal.test.ts` (null when unresolved; caught-proof only on a flag mark;
  marks outside evidence ignored; missed flagIdx; false-alarm keyIdx; ran-safe(-marked);
  rolled-back; flipping answers changes the reveal; every line 16 words or fewer across all
  story, practice and bank plans of all 5 pathways and all 9 kinds; practiceBar; vignette
  mapping; clean/mood/proof; heldMood/fxTag; coach.ts never imports reveal.ts).
  `content.test.ts` practice rules for all 5 pathways (§5).
- Coach role: coach.test.ts rewritten for the new beats: never a lock; never sheet:block/sheet:ok/
  approve while unresolved; idle text only when `ui.hint`; purity (flipped answers) kept for
  coach.ts only.
- Beats role: useBattle.test.ts (risk carries vignette; win carries clean with a state; no clean
  without a state; `toastMs` is 0 for every tone but hint), balance.test.ts (approve-all practice
  never breaches, all 5 pathways).

### 8.2 Playwright (new `scripts/e2e/first-five.mjs`)
Setup: playwright from `PW_MODULE` (e.g. `/tmp/pwrun/node_modules/playwright`), chromium
`executablePath '/opt/pw-browsers/chromium'`, args `['--use-gl=angle','--use-angle=swiftshader',
'--enable-unsafe-swiftshader']`, `@axe-core/playwright`. Fresh context, isMobile, hasTouch,
deviceScaleFactor 3, against a production server at `BASE_URL`. Run every check at **390x844 and
375x667**, for **all 5 pathways** unless stated. Screenshot every check.

Definitions:
- "Decision screen": `role=dialog` evidence sheet open on an inspected, unresolved plan; Block and
  the approve button enabled; no `[data-coach]` inside the sheet; no `.isLocked` on the page.
- "Words": visible text (`innerText`, excluding `.sr-only`), tokens split on whitespace that
  contain a letter or digit (same as `reveal.wordCount`).
- "Tap": one click/tap on an element. Scrolling is not a tap.

Checks:
- A1 From `/` : decision screen in 4 taps or fewer (Play free, Play now, pathway card, Inspect)
  and within 20 s wall time after landing load.
- A2 Deep link `/play/<id>`, fresh context: decision screen in 3 taps or fewer (Play now,
  Inspect, 1 spare); URL contains `/play/<id>`.
- A3 On `/play` at scrollY 0 the "Play now" button's bottom is within the viewport height.
- A4 First sheet 90 words or fewer. Game-root words on the practice board just before tapping
  Inspect: 140 or fewer.
- A5 Every practice sheet (20): at 390x844 every evidence row and both decision buttons are inside
  the sheet's visible box with no inner scroll; at 375x667 both decision buttons are visible
  without scrolling (rows may scroll).
- A6 Scripted practice: risky = mark the first red-flag row (in review-less play the script knows
  the content), then Block; safe = Let it run; result contains "4 of 4 right." and "2 caught with
  proof."; taps per safe plan 3 or fewer, per risky plan 4 or fewer; 0 console errors.
- A7 Deliberate misses: HD ticket 1 "Let it run" -> within 1000 ms stageWrap `data-last-fx` =
  "risk:system"; within 2000 ms `data-agent-mood` = "sad"; coach bar contains "Ollie didn't
  check:"; "Show me" opens a review sheet with at least 1 `[data-clue="flag"]` and a visible SVG
  ellipse; "Got it" returns focus to Next. BA: miss ticket 4 (`ba-noshow-list`) -> "risk:leak".
  Both practice results: no confetti node, portrait src does not end in "-celebrate.svg".
- A8 At every outcome of A6/A7: toast top >= stageWrap bottom - 1 px; stageWrap height 1 s after
  each Block / Let it run within 2 px of its turn-start height (also in one story-mode run with a
  Roll Back); the toast appears 500 ms or more after `data-last-fx` changes.
- A9 Every practice sheet has "Where do I look?"; tapping it shows the idle line; the line has no
  button name; no `[data-coach]` on Block or Let it run ever; no `.isLocked`.
- A10 Keyboard only (Tab, Enter, Space, arrows): HD ticket 1 with a marked row and Block. Focus
  order: rows, then Block, then Let it run.
- A11 `emulateMedia({ reducedMotion: 'reduce' })`: A7 passes; toast delay 350 ms or more.
- A12 axe: 0 serious/critical on landing, /play, picker, practice board, sheet with a marked row,
  review sheet, practice result, hub with the bark.
- A13 Practice result -> "Start the real shift" -> the hub shows the bark (one line), focus is on
  the main shift button; tapping it opens the story at turn 1 with the same plan titles as before.
- A14 BA first sheet (`ba-self-signoff`): no word "Tap", 90 words or fewer, shows the gloss.
- A15 No "Skip practice" on the battle top bar; the Menu has "Replay intro" and (before practice
  is done) "Skip practice".
- A16 At 375x667 at turn start: stage, one plan card and the hand are all inside the viewport;
  the plan list is at least 88 px tall.
- A17 First run from `/play/<id>` shows no intro slides; the first game screen is the practice
  board with the cold open (contains "check") in the coach bar.

- Review fixes (fixer): A6 also asserts no `[data-clue]`, "Checks out" or "Clue" on every decision
  screen; A7 asserts the pen loop wraps the whole row; A8/A11 measure fx-to-toast inside the page
  (MutationObserver + performance.now()); A10 asserts focus is on a button 1 s after Block; A14 checks
  the whole BA sheet (no exclusions); A16 also asserts the plan card and quip fit without scrolling.
  New run "fa" (390x844, all 5): R1 the bar does not repeat "Caught"; R2 one Show me on screen, Got it
  -> main button, the bar stops asking for Show me; R3 a false alarm that comes back checked: one
  instruction, ring on the plan, never Inspect; R4 no stage end card in practice and the last reveal
  line in the live region. Every run closes its browser contexts, even when it throws.

Target: a new learner reaches the first real decision in 60 s or less at 110 wpm (today 3:27-7:08).

### 8.3 Golden audit (integrator, ONCE)
`lib/game/__golden__/help-desk.json` and `lib/game/__golden__/artifact-kinds.json` are re-captured
once, deliberately, after every role has landed (`GOLDEN_WRITE=1 npx vitest run
lib/game/golden.test.ts`; artifact-kinds by a one-off script). Before accepting:
- diff old vs new per top-level key. Only `practice` and `traces` may differ; in `traces` only
  keys starting with `practice|`. `story`, `built`, `full`, `plans`, `skills`, `cards`, `reasons`,
  `ui`, `bankVersion`, and every `story|*` and `hd-daily-*`/`hd-drill-*` trace byte-identical.
  `headlines` identical (explain any `fixture|practice*` change). `practice.guidedSteps` still 2,
  so practice mastery calls are unchanged.
- artifact-kinds: only practice step rows may change (foundation: +mensah|Callback,
  -mensah|Sender address, +reyes|Directory record).
- Add to golden.test.ts "Intended changes": (a) practice content (order, mirrors, quips, evidence,
  key, gloss, idle, coldOpen, hubBark, intro line); (b) practice coach beats (no locks, new ids,
  reveal lines); (c) fx risk carries vignette, win carries clean (not in traces); (d) guidedSteps
  unchanged. Foundation record: `fun/build/foundation-golden.txt`.

---

## 9. File ownership (parallel roles)

Each role edits ONLY its files. Parallel roles work in a private copy
(`fun/build/<role>-app`, see the brief) and hand back a diff. Contracts between roles are the
interfaces in §2, §4.1, §4.2 and §6; do not change a foundation file: ask the integrator.

| Role | Owns | Depends on |
|---|---|---|
| R0 Foundation (done) | `fun/build/phase1a-spec.md`, `lib/game/types.ts`, `lib/pathways/types.ts`, `lib/pathways/create.ts`, `lib/game/bus.ts`, `lib/game/reveal.ts`, `lib/game/reveal.test.ts`, `lib/game/content.test.ts`, `lib/pathways/testing.ts`, `content/help-desk/practice.json`, `content/help-desk/pathway.json` (unchanged) | - |
| R1 Content CY | `content/cybersecurity/practice.json` | R0 |
| R2 Content CN | `content/cloud-network/practice.json` | R0 |
| R3 Content FS | `content/full-stack/practice.json` | R0 |
| R4 Content BA | `content/business-analyst/practice.json` | R0 |
| R5 Coach | `lib/game/coach.ts`, `lib/game/coach.test.ts`, `lib/game/fixtures.ts` (comment on practice-t2 only) | R0 |
| R6 Beats + stage | `lib/game/useBattle.ts`, `lib/game/useBattle.test.ts`, `lib/game/balance.test.ts`, `components/game/stage/BattleScene.ts`, `components/game/stage/createStage.ts`, `components/game/stage/textures.ts`, `components/game/stage/runtime.ts`, `components/game/stage/StageLab.tsx`, `components/game/PhaserStage.tsx` | R0 |
| R7 Battle UI | `components/battle/BattleView.tsx`, `EvidencePanel.tsx`, `OutcomeToast.tsx`, `Hand.tsx`, `IntentList.tsx`, `IntentCard.tsx`, `Sheet.tsx`, `HintText.tsx`, `icons.tsx`, `BattleLog.tsx`, `Meters.tsx`, `RecentActions.tsx`, `battle.module.css` | R0; R5 `CoachUi.hint`; R6 `eventsToBeats(events, enc, state)`, `toastMs` |
| R8 Shell, entry, results | `components/game/GameShell.tsx`, `GameShell.module.css`, `components/site/PlayClient.tsx`, `SignUpForm.tsx`, `PathwayPicker.tsx`, `PathwayGrid.tsx`, `app/page.tsx` (links only), `components/hub/HubOverlay.tsx`, `DialogueBox.tsx`, `IntroSequence.tsx`, `hub.module.css`, `components/battle/PracticeResult.tsx`, `ResultScreen.tsx`, `ShiftResult.tsx`, `Debrief.tsx`, `result.module.css`, `SpeakerFace.tsx` | R0; R7 passes marks up (`onEnd(state, marks)`) |
| R9 QA | `scripts/e2e/first-five.mjs` (new) | all |
| Integrator | `lib/game/golden.test.ts` (header), `lib/game/__golden__/*.json`, `components/game/stage/stage.test.ts`, `README.md`, `package.json`; merges in order R1-R4, R5, R6, R7, R8, R9; runs all gates; one golden re-capture with the §8.3 audit | all |

Cross-role contracts, in one place:
- R5 -> R7: `CoachUi.hint?: boolean`; `practiceCoach`/`sheetCoach` beats per §6.
- R6 -> R7: `eventsToBeats(events, enc, state?)`; `toastMs(toast)`; beats carry `vignette`/`clean`.
- R0 -> all: `revealFor`, `practiceBar`, `vignetteFor`, `isCleanRun`, `resultMood`, `proofCount`,
  `practiceScoreLine`, `PRACTICED_LINE`, `PROOF_TITLE`, `heldMood`, `fxTag`, timing constants.
- R7 -> R8: BattleView reports the marks `Map<stepId, contentIndex>` with the finished state.
- R8 reads `pathway.practice.coldOpen` via the coach, `pathway.practice.hubBark` for the bark.

---

## 10. Review fixes (fixer, after the 5 reviews)

All of the above is updated in place. Summary of what the fixer changed and why:
- Faces: `heldMood("execute-safe") = idle` (the busted face no longer stays through "victory spin").
- Practice coach: no dead end after a false alarm (bar and coach point at the plan when it comes
  back checked); "Your call." -> "Block it or let it run."; the bar narrates less (no repeated
  "Caught!", no "Tap Show me" once used, no Inspect tail after two Inspects, one Show me on screen).
- Stage: the last catch keeps "Busted!"; no "Shift saved!" on a win with misses; no end card over the
  face in practice.
- Keyboard/SR: Sheet never treats <body> as its opener; Got it after a Block returns to the main
  button; bark dismiss keeps focus in the game; replay intro traps focus (header inert) and closes on
  Escape; the last reveal line reaches the live region.
- Copy (practice, all 5): HD mirror row without the "tray 3" trap; HD Callback confirms the theft and
  is the key row; idiom/ESL fixes; CN mirror runs in Bramwell's 12:00-2:00 AM window; CY mirror adds
  "Sender checks pass" with a gloss; CY/CN/FS/BA ticket-1 Oops names the skipped check; FS glosses
  "merge"; BA "Tab 2" -> "Attached list"; outros "The real shift is next."; barks name Start shift.
- Not changed (golden): the story first-shift tips "Tap **Inspect**, then the plan." (coach
  tip-energy, g-check-one) sit in story|* traces, which must stay byte-identical; they stay for a
  later deliberate story re-capture.
