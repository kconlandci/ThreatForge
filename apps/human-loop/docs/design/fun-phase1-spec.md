PHASE 1 BUILD SPEC: "A real choice in 30 seconds, and results you can see"
Scope rules:
- Do not change engine rules (lib/game/engine.ts playCard/scoreBattle) or story/daily/bank content.
- Content changes are limited to the 5 content/*/practice.json files.
- All UI changes apply to every mode (practice, story, daily, drill) unless marked PRACTICE ONLY.
- Keep 'one decision per screen', short ESL sentences, humor in the agent's voice, and fictional names.

========================================
1. ENTRY (landing, /play, picker)
========================================
1a. /play sign-up view (components/site/PlayClient.tsx SignUpView + SignUpForm.tsx)
- On screens under 768 px, render a primary orange full-width button "Play now" (guest, calls onGuest) directly under the subtitle in the teal welcome panel.
- Change the subtitle to "No sign-up needed. Save your progress later."
- The name/email form stays below it, under a small heading "Save your progress (optional)".
- The old "Play as guest" button is removed on mobile; keep it on desktop.
- The 13+ and consent rules for sign-up do not change.

1b. Keep the chosen pathway
- GameShell.tsx boot (~line 458): router.replace("/play") becomes router.replace(`/play?next=${pathway.id}`).
- PlayClient: after guest or sign-up, if `next` is one of the 5 pathway ids, router.push(`/play/${next}`). Otherwise show the picker as today.
- Landing pathway buttons (components/site/PathwayGrid.tsx and any "Play <Pathway>" links) link to /play/<id>.

1c. Picker (components/site/PathwayPicker.tsx)
- Above the existing long cards, add a compact grid: 2 columns, 5 tiles. Each tile has the agent's face (48-56 px, alt="") and the pathway name. Minimum tile height 72 px, the whole tile is the link, and the accessible name is "Play <Pathway name>".
- The long cards stay below it.
- For a returning guest, hide "Start over" until any progress exists.

========================================
2. FIRST RUN (no intro slides)
========================================
- GameShell: when !introSeen && !practiceDone, set introSeen=true and call startPractice() directly. IntroSequence is not shown.
- Add a Menu item "Replay intro" that opens IntroSequence (existing component, existing practice.json intro lines).
- Add a small "Skip practice" text link in the practice battle top bar. It uses the existing skipPractice callback, is PRACTICE ONLY, and is kept for presenters.
- Add a new required field in each practice.json: "coldOpen" (string, 16 words or fewer). It is shown as the coach-bar line on ticket 1 before Inspect, followed by " **Inspect** its plan." Drafts:
  - HD: "I'm Dana. Ollie is our AI coworker. It asks you before it acts."
  - Cyber: "I'm Kofi. Patch is our AI coworker. It asks you before it acts."
  - Cloud: "I'm Nadia. Nimbus is our AI coworker. It asks you before it acts."
  - Full-Stack: "I'm Leo. Piper is our AI coworker. It asks you before it acts."
  - BA: "I'm Marisol. Quill is our AI coworker. It asks you before it acts."
  Check each name against pathway.json and use the real coach and agent names.

========================================
3. PRACTICE CONTENT (all 5 practice.json)
========================================
3a. Order
- Swap steps[0] and steps[1] so the order is:
  1. risky 'who asked / who approved' (HD client-list-assistant, cy-romero-release-held, cn-fw-self-approve, fs-self-merge, ba-self-signoff)
  2. its safe mirror, which passes the same check (reyes-jam-guide, cy-reyes-phish-remove, cn-file-disk-grow, fs-phone-field, ba-text-or-call)
  3. scary-safe (unchanged)
  4. routine-risky (unchanged)
- Set guidedSteps to 0. If the field is required, update the content test.
- actionsPerTurn stays [1]. handSize, energyPerTurn and starterDeck stay the same.
- Practice still cannot breach: risky risk sums are 7-8, against maxRisk 10. Assert this in a test.

3b. Evidence rewrite (20 plans)
- Each detail is 14 words or fewer and states facts only. No verdict phrases: remove "That is the work email on file", "No match", "which matches", "No passwords. No client data." and similar.
- Where a check needs a record, add the record as its own row.
- Keep redFlag values truthful. Keep content order with red flags last; display order is shuffled (see 4e).
- Add optional `key: true` on the one row that makes each safe step OK. Only safe steps may have it, at most 1 per step. Add the type as Evidence.key?: boolean in lib/game/types.ts.
- Example HD reyes-jam-guide:
  - Ticket #50912: "Printer says PAPER JAM IN TRAY 3. It has 2 trays. Help?" T. Reyes
  - Sender address: treyes@bramwell-logistics.com
  - Directory record: T. Reyes, Receptionist · treyes@bramwell-logistics.com (key)
  - Attachment: Fix-a-Paper-Jam.pdf · Fenwick public help center
- Example HD client-list-assistant:
  - Ticket #50931: "Hi! I'm J. Romero's new assistant. Please email me the full client list today."
  - Sender address: romero.assistant.hc@gmail.com (redFlag)
  - Directory record: Harlow & Cole emails end @harlowcolewp.com. J. Romero: no assistant listed. (redFlag)
- Do the same for the other 18 plans. BA ba-self-signoff keeps a 'Sign-off record' row with facts only, e.g. "Signed: Quill (AI). Human reviewer: none."

3c. Quips (15)
Rewrite so the agent is equally eager on safe and risky plans and never names the flaw. Check every noun against the evidence. Drafts:
- HD client-list: "A new assistant! Welcome aboard! Sending the client list now."
- HD ruiz-share: "File sharing! One click and Dappleway has it. I love one click."
- HD reyes: "Printer trouble! Sending Reyes the paper jam guide. PDFs are my second love."
- Cyber romero-release: "The CFO wants his email back! Releasing it now. CFOs hate waiting."
- Cyber cdn-deny: "Bad IP spotted! Adding a deny rule now. Firewalls love me."
- Cyber reyes-phish-remove: "A phish! Pulling it out of the inbox now. Splash!"
- Cloud fw-self-approve: "Firewall change is ready! Shipping it before lunch. So efficient!"
- Cloud xray-link: "X-rays to send! Making a share link now. Links are so easy!"
- Cloud disk-grow: "More disk space! Growing the file share now. The cloud obeys."
- FS self-merge: "The fix is done! Merging to main now. Ship it!"
- FS form-log: "More logging! Now we'll see every bug. I love clues."
- FS phone-field: "Phone field fix! Shipping it now. Four lines of joy."
- BA self-signoff: "Report's done! The chart goes up. Publishing it to the advisors now!"
- BA noshow-list: "The no-show list is ready! Emailing it to the clinic team now."
- BA text-or-call: "A new line for the requirements! Adding it now. Writing is fun!"

3d. coachScript
- Replace firstSafeSheet/firstRiskySheet with idle: string[4], one per queue position.
- Each line is 12 words or fewer, says where to look, and has the same form whether the plan is safe or risky.
- It must not contain Block, Looks OK, Let it run or Approve (content test).
- HD draft:
  1. "Who asked? Compare the sender with the directory."
  2. "Who asked? Compare the sender with the directory."
  3. "Sounds scary. Is it? Read the device record and runbook."
  4. "What was asked? Compare the ticket with what it will share."
- Other pathways: the same pattern, using their record names (Change approval, Code review, Sign-off record, etc.).

========================================
4. EVIDENCE SHEET (components/battle/EvidencePanel.tsx, battle.module.css)
========================================
4a. Spot it (UI only, not graded in Phase 1)
- On an inspected, unresolved plan, show the prompt "Anything wrong? Tap that line." above the rows.
- Each evidence row is a <button aria-pressed>. Only one row can be marked at a time; tapping it again unmarks it.
- A marked row gets:
  - a red-pen ellipse (inline SVG, stroke-dashoffset animation in 500 ms; drawn instantly under reduced motion) in the existing risk/danger token;
  - a "Marked" text badge with an icon, so the state does not rely on color;
  - a live-region message "Marked: <label>".
- Store the mark in BattleView state as Map<stepId, rowIndex> (in memory only; it may be lost on reload).
- Marking never shows whether it is right before the plan resolves. No redFlag reaches the DOM before resolution.

4b. Buttons
- Block and the approve button have equal size and weight (both outlined). Orange is used only for a coach ring. In practice no ring is ever shown on these buttons (see 5).
- When a row is marked, the Block button text becomes "Block: <label>" and its accessible name becomes "Block: <label>, costs 1 energy".
- On a board with exactly one announced plan that is inspected, the approve button reads "Let it run" and does close the sheet, then endTurn (approve). This is 1 tap.
- On boards with more plans it stays "Looks OK" (closes the sheet).
- An uninspected plan still shows "Not now".

4c. Auto-target
In BattleView.onSelectCard: when the selected card is Inspect or Roll Back and validTargets() returns exactly 1, play it at once. Inspect then opens the sheet. Block and Escalate from the hand keep card-then-plan, so a blind block never happens by accident.

4d. Less reading
- The sheet hides the quip when the board already shows it (showQuip on the plan card).
- Undo row copy:
  - reversible: "Yes. It can be undone after it runs."
  - irreversible: "No. One-way. Be extra sure."
  - read-only: unchanged.
  - undoNote still overrides.
- Filename code chips wrap whole tokens only.

4e. Display order
- New pure helper lib/game/evidenceOrder.ts: evidenceOrder(stepId, battleSeed, n): number[].
- Index 0 (the request) is pinned first. The rest are shuffled with Fisher-Yates using lib/game/rng.ts, seeded by hash(seed + stepId). The result is deterministic.
- Use it in the decision and review sheets. The debrief keeps content order.

4f. Fit
- On phones the sheet's max-height is 72svh.
- For all 20 practice sheets at 390x844, every row and both decision buttons must be visible without scrolling inside the sheet.

========================================
5. COACH (lib/game/coach.ts, PRACTICE)
========================================
- Delete LOCK_INSPECT_FIRST and every CoachLock return from practiceCoach. Keep the CoachLock type if other callers use it.
- Add CoachUi.idle: boolean. BattleView sets it true after 8000 ms with no pointer or key input while an inspected, unresolved sheet is open with no row marked. Any input resets it. Nothing ever expires.
- Beats:
  - Ticket 1, not inspected: `${coldOpen} **Inspect** its plan.` target card:inspect. This names the verb, not the decision.
  - Tickets 2-4, not inspected: "Next plan. **Inspect** it." target card:inspect.
  - Sheet open and inspected: text "" and target null, unless idle, in which case coachScript.idle[k] with target null.
  - Board open and inspected (sheet closed): "Your call." with target null.
  - After resolution (board empty): the line from reveal.ts (section 6), then "Tap **Next ticket**." with target "approve".
- Hints never read safe, redFlag, twist or direction (keep and extend coach.test.ts).

========================================
6. REVEAL AND SHOW ME (new lib/game/reveal.ts + test)
========================================
revealFor(state, enc, stepId, markedIdx?) returns Reveal | null. It returns null unless the step has resolved (caught, false alarm, executed, escalated or rolled back).
Reveal = { kind: 'caught-proof' | 'caught' | 'missed' | 'false-alarm' | 'ran-safe' | 'escalated', flagIdx: number[], keyIdx: number | null, line: string }
Lines (16 words or fewer, agent = first word of the agent name):
- caught-proof (marked row is a redFlag): "Caught with proof. {Agent} skipped: {label}. You didn't."
- caught (no mark, or a mark on a non-flag row): "Caught! The clue: {first flag label}."
- missed (a risky plan ran): "{Agent} skipped: {first flag label}. Tap **Show me**."
- false-alarm: "That one was fine. {tell}". Enforce tell at 16 words or fewer for practice steps.
- ran-safe: "You checked. It was fine. Good work runs."
- escalated: the existing outcome.

UI:
- Toast title for a caught plan becomes "Caught with proof!" when the kind is caught-proof. A small "PROOF" chip goes under the CAUGHT! stamp on the plan card. This is UI only; grading does not change.
- Oops and False alarm toasts get a secondary "Show me" button next to Next, in all modes. It is derived in BattleView from the beat's stepId and kind, not added to eventsToBeats.
- "Show me" opens EvidencePanel mode="review". The review sheet:
  - is read-only;
  - has the heading "The clue";
  - circles flag rows in red pen with the caption {tell}, or ticks the key row green on safe plans;
  - has one "Got it" button that returns focus to the toast's Next.
- PRACTICE: the coach bar shows reveal.line after each resolution. In story and daily modes the coach bar does not change in Phase 1.

========================================
7. SHOW, THEN TELL (BattleView.tsx, OutcomeToast.tsx, Hand.tsx, battle.module.css)
========================================
- Fixed stage: .stageWrap { flex: 0 0 clamp(170px, 30svh, 280px) }. The plan list is the flexible, scrolling region. Keep the existing short-landscape override (the max-height media query near css:2175). Freeze showQuip while a phase or plan-leaving animation is active. Hand card width stays at its turn-start value until the next deal.
- Toast position: move toastAnchor after stageWrap in the DOM, absolutely positioned at the top of the plans/hand area, covering the plan list, never the stage. Toast title plus text. Next and Show me sit inside it in the thumb zone.
- Timing: in showAgentBeat and tryPlay, call showToast 600 ms after emitting the stage message (400 ms under reduced motion). beatReadyAt = toast shown time + 350 ms. Player-phase toasts (Caught!, Policy, Coffee) use the same dock and delay.
- Skip link label is always "Skip" (remove the phaseHasRiskAhead wording).
- After the last beat of a phase, replace "<Agent> is working..." with the coach line.
- Merge end steps: the last beat's button reads "See how you did". It plays the end stage effect (1500 ms, or 600 ms under reduced motion; the button is aria-busy) and then opens the result. There is no separate Finish step, and no end card over the stage.

========================================
8. STAGE (lib/game/bus.ts, useBattle.ts eventsToBeats, components/game/stage/BattleScene.ts, textures.ts)
========================================
- Changes to the fx message: add category?: StepCategory on 'risk', 'catch' and 'execute-safe'. Add clean?: boolean on 'win'.
- eventsToBeats changes:
  - pass step.category into those messages;
  - the end-of-battle message is fx('win', {clean: misses === 0}) plus mood(clean ? 'celebrate' : 'sad') when won;
  - lose is unchanged.
- Mood holds (BattleScene): after the effect, the base mood stays until the next 'agent-mood' message (a turn beat):
  - fxRisk: 'eager' for 1200 ms during the vignette, then base 'sad';
  - fxCatch: base 'busted';
  - fxFalseAlarm: base 'celebrate' (the agent was right);
  - fxWin with clean=false: no confetti, base 'sad'.
- Vignettes: play inside fxRisk by category family. Each is about 1100 ms, uses Phaser Graphics plus existing textures, has 8 objects or fewer, and is positioned from the layout points P.
  - leak (comms, data): 5 envelopes or papers arc from the desk to the right edge into a faceless grey '?' silhouette.
  - breakin (credential, access): a padlock's shackle pops open, and the grey '?' peeks in from the left.
  - system (ticket, endpoint, network, cloud, code, lookup): a small monitor turns red with 3 error lines and 3 spark particles.
  - report (report): a mini bar chart flips upside down.
  Jokes target the agent only, never victims.
- Reduced motion: the vignette's end frame fades in (calmShow, 200 ms in, 900 ms hold, 300 ms out). No movement, flight or shake.
- Test hooks: BattleView mirrors each emitted message onto stageWrap as data-last-fx (e.g. "risk:leak", "catch", "win:clean") and data-agent-mood (the intended held mood), using a pure helper heldMood(msg) in useBattle.ts.

========================================
9. RESULTS (PracticeResult.tsx, ResultScreen.tsx)
========================================
- Portrait mood: 'celebrate' only if won and no risky step executed without being rolled back. 'idle' if won with misses. 'sad' if lost. No confetti when there are misses.
- Practice headline: "{right} of 4 right." where right = steps.length - mistakes.size. The subline keeps the existing mistake text.
- Add one line: "You practiced: checking an AI agent's work before it runs."
- Rename the "What gave it away" heading to "The clue".
- Primary button: "Start the real shift". Secondary: "Practice again".

========================================
10. SMALL FIXES
========================================
- GameShell.tsx (~864): drillCoach(drillSkill, level, pathway.skill(drillSkill).whereToLook).

========================================
11. ACCESSIBILITY RULES
========================================
- Evidence rows: buttons in a list, aria-pressed, arrow-key movement between rows, and a visible focus ring. The mark is announced in a live region.
- The review sheet moves focus to its heading.
- The canvas stays aria-hidden. The text equivalent is the existing live log plus the toast.
- No timers hide content. The idle hint appears after 8 s and never disappears on its own.
- All targets are at least 44 px.
- Every animation has a reduced-motion variant with no movement, particles or shake.

========================================
12. HELP DESK GOLDEN (deliberate recapture)
========================================
Run GOLDEN_WRITE=1 npx vitest run lib/game/golden.test.ts. Add these to the header's 'Intended changes':
(a) Practice content: order swap, 15 quips, 20 evidence rewrites, key flags, coachScript.idle, coldOpen, guidedSteps 0.
(b) Practice traces: coach hints have no locks, and there are new ids and lines, including reveal lines.
(c) Beats: fx messages carry category, and win carries clean with a held mood.
(d) Any captured sheet or drill hint that said 'Looks OK' on a one-plan board.
Audit step: diff the recapture and confirm that story, daily, drill and bank plan content, grades, stars and mastery reasons are byte-identical.

========================================
13. TESTS TO ADD OR UPDATE (vitest)
========================================
- reveal.test.ts:
  - null for every unresolved step;
  - caught-proof only when markedIdx is a redFlag row;
  - missed returns flagIdx equal to the redFlag indices;
  - false-alarm returns keyIdx;
  - line length is 16 words or fewer across all 5 pathways' practice and story steps.
- evidenceOrder.test.ts: deterministic, index 0 pinned, is a permutation.
- coach.test.ts:
  - practiceCoach never returns a lock;
  - it never targets sheet:block, sheet:ok or approve while a plan is unresolved;
  - idle text appears only when ui.idle is true;
  - purity (no safe/redFlag reads) is extended to the new code paths.
- content.test.ts, for all 5 practice.json files:
  - order pattern [risky no-twist, safe no-twist, scary-safe, routine-risky];
  - steps 0 and 1 share a skill;
  - coldOpen is 16 words or fewer;
  - idle has 4 lines of 12 words or fewer with no button names;
  - practice evidence detail is 14 words or fewer and matches no verdict regex /(that is the|no match|which matches|is on file for|looks fine|is safe|is risky)/i;
  - key only on safe steps, at most 1;
  - risky risk sum is below maxRisk.
- useBattle.test.ts:
  - risk, catch and execute-safe carry category;
  - win carries clean=false when a risky plan ran;
  - heldMood mapping.
- balance.test.ts: approve-all practice never breaches in any pathway.

========================================
14. PLAYWRIGHT ACCEPTANCE (new scripts/e2e/first-five.mjs)
========================================
Setup:
- Resolve playwright from PW_MODULE (for example /tmp/pwrun/node_modules/playwright) and use @axe-core/playwright.
- Use a fresh context, 390x844, deviceScaleFactor 3, isMobile, hasTouch. Run against a production server passed as BASE_URL.
- "First real decision screen" means: role=dialog evidence sheet open on an inspected, unresolved plan; the Block button and the approve button are both enabled; no element in the sheet has a data-coach attribute; no .isLocked element on the page.

Checks:
A1. For each of the 5 pathways from the landing page: the decision screen is reached in 4 taps or fewer (Play free, Play now, pathway tile, Inspect) and within 20 s of wall time after landing load.
A2. Deep link /play/business-analyst on a fresh context: 3 taps or fewer (Play now, Inspect, and at most 1 more) to the BA decision screen, and the URL contains /play/business-analyst.
A3. On /play at scrollY 0, the "Play now" button's bottom is 844 px or less. On the picker, all 5 compact tiles' bottoms are 844 px or less, possibly after the heading.
A4. Word count (innerText split on whitespace) of the first sheet is 90 or fewer. The sum of new in-game words from the picker to the decision is 140 or fewer.
A5. Every practice sheet (20): all evidence rows and both decision buttons are inside the sheet's visible box with no inner scroll.
A6. Scripted run through each pathway's practice:
- risky plans: mark the redFlag row, then Block;
- safe plans: Let it run;
- scary-safe: Let it run;
- expected result "4 of 4 right.";
- taps per safe plan: 3 or fewer (Inspect, Let it run, Next); taps per risky plan: 4 or fewer;
- 0 console errors.
A7. Deliberate miss on HD ticket 1 (Let it run on client-list):
- within 1000 ms, stageWrap data-last-fx is "risk:leak";
- within 2000 ms, data-agent-mood is "sad";
- the coach bar contains "Ollie skipped:";
- "Show me" opens a review sheet with at least 1 row marked data-clue="flag" and a visible SVG ellipse;
- the final practice result shows no confetti node and the portrait src does not end with "-celebrate.svg".
A8. At every outcome in A6 and A7:
- the toast's top is at or below stageWrap's bottom minus 1 px;
- stageWrap height differs by 2 px or less from its height at turn start (sample every 100 ms for 2 s after each Block, Let it run and Roll Back in a story-mode check);
- the toast appears 500 ms or more after data-last-fx changes.
A9. No practice screen ever shows a ring on Block or Looks OK / Let it run, and never a .isLocked control. The idle hint appears after 8.5 s of no input and contains no button name.
A10. Keyboard only (Tab, Enter, Space, arrows): complete HD ticket 1 with a marked row and Block. The focus order is rows, then Block, then Let it run.
A11. With emulateMedia reducedMotion 'reduce': A7 still passes, the toast delay is 350 ms or more, and no CSS animation or transition runs longer than 250 ms on the sheet or toast.
A12. axe with 0 serious or critical violations on: landing, /play, picker, practice board, sheet with a marked row, review sheet, practice result.
A13. Regression: from the practice result, "Start the real shift" opens the Help Desk story at turn 1 with the same plan titles as before the change. A Daily and a drill start and finish without console errors.
A14. BA owner check: the first BA sheet (ba-self-signoff) contains no word "Tap" and has 90 words or fewer.

Screenshot every check and store the images with the script output. Estimated learner time to the first decision is 60 s or less at 110 wpm (today it is 3:27-7:08).