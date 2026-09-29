AMENDMENTS TO phase1_spec (numbered by the spec's sections)

§3a Order / guidedSteps
- KEEP "guidedSteps": 2 in all 5 practice.json files, with the meaning "not counted for mastery". Do NOT set it to 0. Add a comment to types.ts: guidedSteps means only "excluded from mastery". The coach no longer uses it for locks.
- content.test.ts:207 and mastery.test.ts:225 stay green. The golden audit claim "mastery reasons byte-identical" then holds.
- Replace the test "steps 0 and 1 share a skill". It is false today for BA, CN, CY and FS.
- Choose one:
  (A, recommended) In BA, CN, CY and FS, replace safe step 1 with a NEW safe mirror that passes the risky step's own check:
    - BA: "Publish the fixed report", signed off by R. Fairbanks (check-approval, safe).
    - CN: "Apply firewall change FW-2231", approved by a human in the change record.
    - FS: "Merge the phone-field fix", with a human code review approved.
    - CY: "Release a held email", sender verified by a callback to the phone on file.
    The old match-request safe steps can go to the bank later.
  (B) Keep the current steps. Drop the word "mirror" and the shared-skill test. Accept that the teaching payoff only exists in HD.
- Add the test: steps[0].skill === steps[1].skill && !steps[0].safe && steps[1].safe.

§2 First run
- Move "Skip practice" from the practice top bar into the Menu, next to "Replay intro". Presenters use the Menu.
- coldOpen must name the skill, not just the product (16 words or fewer). HD: "I'm Dana. Ollie is our AI. It's fast, not careful. You check its plans." Use the same pattern in the other 4 pathways.
- "Start the real shift" on the practice result opens the HUB, not the battle. Show one bark only, e.g. "Monday starts here. Tap Ollie's desk.", with the existing shift entry focused. Suppress the 6-screen hub tutorial on this path, so a first-time player sees the office once. If this is too costly, write down the deferral explicitly.

§3b Evidence
- Allow one row per step up to 18 words when it carries a term definition ("A sign-off is a written OK from the owner"). Or add an optional `gloss` string that renders as small text under the label. BA must not lose its only definition on the owner's test screen.
- The key and redFlag rules are unchanged.

§3c Quips
- Neutral about the answer, yes. But after resolution the AI-specific failure comes back through the reveal (see §6: add `skippedLine`).

§3d / §5 Coach hints
- Replace the idle timer with a PULL hint. In PRACTICE, the sheet shows a text button "Where do I look?" (44 px, no timer, one tap). It reveals coachScript.idle[k] in the coach bar and never auto-expires.
- Also auto-show idle[k+1] on the ticket right after a wrong call.
- Delete CoachUi.idle and the input-tracking code. Change A9 to: "the hint button exists on every practice sheet; the hint contains no button name; no ring or lock appears."
- Idle lines follow the skill of the step at each position. They are not all "Who asked?": after amendment A, BA positions 1 and 2 are both about sign-off.

§4a Spot it
- Store the mark as a CONTENT index (step.evidence index), never a display index.
- The synthesized "Can we undo it?" row and the "Ask:" line are NOT markable.
- Prompt copy: "Check each line. Anything wrong? Tap it." This keeps "check" first, so it does not prime blocking.
- To keep the gesture alive while it is ungraded, PracticeResult shows "N of 4 right. M caught with proof." The count is derived in UI from marks, with no engine change. In story and daily, the toast title difference is enough.
- The Block label when a row is marked: visible text "Block it", with a line above the buttons: "Your clue: <label>". The accessible name is "Block it. Your clue: <label>. Costs 1 energy." The form "Block: Sender address" is unclear for ESL readers.

§4b Let it run
- 1-tap approve applies in PRACTICE, and in other modes only when announced.length === 1 AND no card in hand has a valid target other than that plan (for example, Roll Back has no Done target). Otherwise the button stays "Looks OK".

§4c Auto-target
- Inspect only. Roll Back keeps card-then-target.

§4d Undo row
- Copy for irreversible: "No. One-way. Check it well. One-way is OK if it's right."
- If that is too long: "No. One-way. Be sure. (Sure is not no.)"
- Add an A-check that HD reyes (safe, one-way) can be passed with "Let it run" in 3 taps.

§6 Reveal
- Add kinds and lines, each 16 words or fewer:
  - rolled-back: "Rolled back. {Agent} skipped: {label}."
  - missed-marked (a risky plan ran while the marked row is a flag): "You spotted it: {label}. Trust your eye. Block it next time."
  - ran-safe-marked (a safe plan ran with a row marked): "You marked {label}. It was fine. Good work runs."
- Wording: use "{Agent} didn't check: {label}." instead of "{Agent} skipped: {label}". It has a plain verb, which ESL readers need. caught-proof: "Caught with proof! {Agent} didn't check: {label}. You did."
- false-alarm line: "That one was fine. Tap **Show me**." The tell appears only as the review-sheet caption. The 16-word test then passes for story tells (up to 15 words) without story content edits.
- Compose the reveal line OUTSIDE coach.ts. BattleView (or a new lib/game/practiceBar.ts) picks the reveal line when the board is empty after a resolution. Otherwise it uses practiceCoach.
  - Keep coach.ts free of redFlag and safe.
  - Limit the flipped-answers test to coach.ts.
  - Add a reveal.test that flipping answers DOES change the reveal. This proves the split is real.

§6 / §7 Toasts
- Outcome toasts (caught, false alarm, oops, rolled back, and any toast with Show me) never auto-hide. They close on Next, on Close, or when the next card is played.
- Only tone "hint" toasts keep a timer, and they are also written to the live log.
- Remove readingMs auto-hide for these toasts at BattleView.tsx:513.

§7 Fixed stage
- Add a 375x667 check to A5 and A8: plan list at least 88 px tall, and the hand fully visible.
- If it fails, clamp to (150px, 26svh, 280px) under max-height: 700px.

§8 Stage
- Vignette family is chosen by skill first, then by category:
  - guard-data → leak;
  - check-approval with category report → report;
  - verify-identity or access → breakin (falls back to system until Phase 3);
  - otherwise the category map.
  This gives BA ba-noshow-list the leak vignette, not the flipped chart. Add a unit test that every practice risky step maps to the intended family.
- The false-alarm held mood stays 'sad' (the existing fxFalseAlarm). Do not use 'celebrate'. Reserve 'celebrate' for clean wins everywhere.
- Ship 3 families. Breakin moves to Phase 3.

§9 Results
- Apply the clean-only celebrate and confetti rule to ShiftResult.tsx:90 (Daily and drill), to the ResultScreen outro SpeakerFace moods (line 183), and to GameShell's stage mood on result, as well as PracticeResult:103 and ResultScreen:124.
- Remove the PROOF chip from the plan card (the toast covers it).

§12 Golden
- Add intended change (e): 4 new safe mirror steps (if option A), and beats with category and clean.
- State that practice mastery calls are unchanged because guidedSteps stays 2.
- The audit must diff mastery reasons and stars for practice, story, daily and drill, and show them identical.

§13 Tests
- Replace the test "steps 0 and 1 share a skill" with the mirror assertion above (option A).
- Drop evidenceOrder.test.
- Add these tests:
  - no outcome toast has ms > 0;
  - vignette family mapping;
  - the reveal line is 16 words or fewer across all story and practice steps, using the new false-alarm form;
  - practiceCoach never reads reveal output.

§14 Playwright
- A1 and A2 stay.
- A7 on BA as well as HD: miss ba-noshow-list, then expect data-last-fx "risk:leak".
- A8 uses before/after sampling.
- A9 becomes the pull-hint check.
- A11 is simplified.
- Add A15: 'Skip practice' is not on the battle top bar.
- Add A16: at 375x667, the stage, one plan card and the hand are all visible.

Effort note
- With these cuts (no shuffle, no breakin vignette, no idle timer, no PROOF chip, no Roll Back auto-target, simpler Playwright), Phase 1 fits the 7-10 day estimate, plus about 1.5 days of content work for the 4 new mirror steps under option A.
- If the budget is fixed at 7 days, ship in two passes:
  - 1a: entry, first run, content, coach unlocks, reveal and Show me, toast dock and persistence, fixed stage, result moods, drillCoach fix, golden;
  - 1b: vignettes and held moods, end-step merge, 1-tap Let it run.
  1a alone answers "what skill"; 1b answers "how is this fun".