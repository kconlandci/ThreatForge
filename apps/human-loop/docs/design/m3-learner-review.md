# M3 learner review and fixes (2026-09-25)

Source: the `human-loop-m3-build` workflow. The reviewer was an AI agent playing a first-time learner on a phone (390x844), not a real person. The fix report is the fixer agent's own account and covers the learner's 12 findings plus 4 from the regression reviewer (16 in all, 7 major and 9 minor). The regression reviewer's own findings are not saved here.
The findings' screenshots and simulation files were in the original session's scratchpad and are not saved.

## Reviewer verdict

Nearly ready for learners: fix the majors first. The core loop works for a new learner on a phone. Every screen has one clear orange next step. The evidence feels real and the tells are short and plain. The twists teach well: on day 2 the same "Reset MFA for J. Romero (CFO)" as Monday's scam was legitimate this time, and that was the best learning moment of the week. Ollie is funny in quips and toasts ("types STILL in all caps", "Closing tickets is my cardio"). Your skills is easy to read: pips and a level word, no percentages. Drills show "Where to look" and "Check back in 4 days". Daily practice varies: 11 different tickets over 3 dailies, and no ticket repeated from the day before. There were no console errors, and axe found no violations on the office, Your skills and daily result screens.

What I played (390x844, touch, DPR 3, clock moved in the browser):
- Day 1 (Mon Sep 28): practice, Monday (2 stars, with realistic newbie mistakes), daily 1 (8 right · 1 missed).
- Day 2 (Tue): daily 2 (7 right · 1 partly), then a Change safely drill (4 of 4).
- Day 5 (Fri Oct 2): daily 3 (6 right · 1 partly · 1 missed), plus a check of a Confirm the fix drill.

What most hurts learning and motivation:
1. "Skills moved" hides most changes, including drops.
2. Two risky plans on one turn force a miss on plans I had read and judged right, and that lowers skill levels.
3. The daily's "Focus: <skill>" rarely includes a risky plan of that skill.
4. Toast chips grade a plan before its outcome is final.
5. Returning players see stale words: /play says "Shifts played 1"; the office still says "Supervise Ollie. Tap the office to walk around." and greets me as a stranger; the daily intros are never shown.

Cleanup: my server on port 3610 and my Playwright driver are stopped. I did not delete .next-alt: another reviewer's next-server (PID 13450, port 3620) is still serving from it, so delete it after that run ends. tsconfig.json is unchanged, and I edited no app files. Screenshots are in /tmp/claude-0/-home-user-ThreatForge/ed4523f9-c974-52bd-96e5-d4740a6e53d0/scratchpad/m3/review-learner/ (d1-*, d2-*, d5-*). The focus simulation is in sim/focus.sim.ts in that folder.

## Findings

### 1. (major) "Skills moved" shows only the first 2 changes in fixed skill order, so focus skills, new Solids and level drops disappear

- **Where:** lib/game/mastery.ts:377-388 (skillChanges walks MASTERY_SKILLS in order); components/battle/ShiftResult.tsx:83 (moved.slice(0, 2)); screenshots d2-08-daily2-result.png, d5-07-daily3-result.png
- **Evidence:** Daily 2 moved 5 skills: Check who's asking, Check who approved, Confirm the fix (the daily's focus and my weakest skill), and my first two Solids (Change safely, Approve what checks out). The screen showed only Check who's asking and Check who approved. Daily 3 moved 4: Approve what checks out fell from Solid to Practicing (one "Fixed it later" put a W in its last 3), and Guard the data went up. Neither was shown. The spec says nothing decays silently, but a lost Solid only shows up if I open Your skills. The Confirm the fix drop that did show (●●○○ → ●○○○) looks exactly like a rise, with no "down" word and no reason. Daily 2's main button also said "Practice this: Change safely", the skill that had just reached Solid, which the page never told me.
- **Suggested fix:** Sort the moved list before slicing: drops first, then focus skills, then anything reaching Solid or Sharp, then the rest. Add a text link under the 2 rows: "+3 more changed · Your skills". Give each row a word and an icon for direction ("Up" / "Down"). For drops, add one plain reason, e.g. "Down: a risky plan got through" or "Down: good work was blocked". Add a skillsView test with 4 or more changes that proves a drop and the focus skill are kept.

### 2. (major) Two risky plans on one turn force a miss on plans I had inspected and judged right, and that lowers skill levels

- **Where:** lib/game/shiftGen.ts:147 dailyOrderOk (no rule about risky plans sharing a turn); screenshots d1-38-daily1-t3.png, d5-06-daily3-t5.png
- **Evidence:** It happened in 2 of my 3 dailies. Daily 1, turn 3: "Let F. Kowalski install her own apps" and "Free up the license on T. Okafor's mailbox" came together. I inspected both and saw both were wrong, but had 1 energy and 1 Block left. Daily 3, turn 4: "Close #53307: Dr. Pell's billing ticket" and "Send N. Ferreira her welcome email", same squeeze, and no Roll Back came up the next turn. Each time the one I couldn't block was graded Missed. In daily 3 that single W dropped Confirm the fix from Practicing to Learning, a skill I had judged correctly. As a learner this felt unfair: the game punished me for running out of energy, not for missing the evidence. The build report already names this as its main balance risk (the careful bot finishes a daily with nothing missed only 65.8% of the time).
- **Suggested fix:** In dailyOrderOk, treat plans 2-3, 4-5, 6-7 and 8-9 as one turn each (actionsPerTurn [1, 2]) and reject orders that put 2 risky plans in the same turn. The existing 24 shuffles and 48 merges should almost always find one. Add a shiftGen test over 600 seeds, and rerun balance.test to confirm the careful bot's nothing-missed rate goes up. If a risky pair can't be avoided, deal one Block per risky plan on that turn.

### 3. (major) "Focus: <skill>" often has no risky plan of that skill, so the daily doesn't test the actual weakness

- **Where:** lib/game/shiftGen.ts planDaily weight (~lines 233-239: hitsFocus counts a safe plan the same as a risky one) and checkDaily; content/help-desk/bank (thin risky supply for Confirm the fix)
- **Evidence:** On day 2 the desk said "Focus: Confirm the fix" (my miss was approving a ticket close). The daily had 1 of 8 plans with that skill, and it was safe. On day 5, "Focus: Match the request" got 1 of 8, also safe. I simulated 400 player ids with planDaily from my day-2 save. Confirm the fix was focus #1 on all 400. A daily averaged 1.0 Confirm-the-fix plans and 0.17 risky ones. 83% had no risky Confirm-the-fix plan and 14% had none at all. From my day-5 save, 36% had no risky plan of focus #1. Only 2 risky Confirm-the-fix plans exist in the bank: a-printer-queue-2 (weight ×0.2 because it was in the last daily) and a-queue-cleanup-2 (D3, blocked until 2 dailies are done). Drills repeat because the pool is small. The Confirm the fix drill reused 3 of its 4 skill plans from the daily an hour earlier (none score). The Change safely drill reused c-security-updates from the same day.
- **Suggested fix:** In the ticket weight, give an extra ×3 to tickets with a risky plan of focus[0] when that skill's recent calls include an uppercase W or P. In the daily check, require at least 1 risky plan of focus[0] when the bank has one that wasn't in the last daily. Allow a recent ticket at ×0.5 for this. Add at least 2 D1-D2 tickets with risky Confirm-the-fix plans, and 1 more for Match the request, so dailies and drills have fresh material. Add a shiftGen test that, from a state where focus[0] has recent risky misses, 80% or more of dailies include a risky plan of that skill.

### 4. (major) Toast chips grade the plan's current state, not its final outcome: "Missed" and then "Partly right" for the same plan

- **Where:** components/battle/BattleView.tsx:715-718 (chip grade = gradePlan(step, current runtime)); screenshots d1-20-monday-blindblock.png, d5-05-daily3-t2.png
- **Evidence:** On Monday I blocked "Disable T. Okafor's account right now" without checking. The toast said "False alarm… It goes back in line." with the chip "Check who approved ✗ Missed". Two turns later I approved it and the chip said "Partly right". The same happened in daily 3 with "Close #53301: H. Lam's scanner ticket" (Missed, then Partly right). A blind approve of a safe plan ("Run the VPN fix script") got "Change safely ✓ Right", which tells me approving without checking is right, even though the spec counts it as no evidence. The design promise is that one grading function never disagrees with itself. Here the toast disagrees with the result screen.
- **Suggested fix:** Show a result shape only when the outcome is final. For a safe plan that was blocked and sent back in line, show the skill name with "Back in line" and no shape. For a risky plan that ran and can still be rolled back, show "Can still roll back". For a safe plan approved without inspecting, show the name only, or "Not checked" with no check mark. Add a BattleView or gradePlan test for these three cases.

### 5. (major) Daily and drill intros in shift.json are never shown; generated shifts start cold, with nothing saying what Daily practice is

- **Where:** components/game/GameShell.tsx:606-611 (startSpec calls beginBattle directly) and :925 (IntroSequence only for PRACTICE/ENC); content/help-desk/bank/shift.json "intros"
- **Evidence:** Tapping "Start today's practice" went straight to "Daily practice: supervise Ollie", turn 1 (d1-33-daily1-start.png). Drills did the same. buildShift picks 2 intro lines, such as "A fresh set of tickets. Some look scary and are fine. Some look boring and aren't.", but nothing renders them. The outros are used. For a newbie, this was the one spot to learn what a daily is, why it has a focus, and that some scary plans are fine.
- **Suggested fix:** Before a daily or drill battle, show encounter.intro as a short 2-line screen using the IntroSequence styling, with one "Start" button and Skip. In a drill, add one line naming the skill, e.g. "Drill: Confirm the fix. 4 plans, one at a time." Keep it to one screen.

### 6. (major) Returning learners see stale words: /play says "Shifts played 1" and "Play again"; the office still says "Supervise Ollie. Tap the office to walk around."; Ollie and Dana greet me as a stranger on day 5

- **Where:** components/site/PathwayPicker.tsx:32-35, 91-92 (attempts counts Monday only); components/hub/HubOverlay.tsx:184 (objective has no daily state); content/help-desk/hub.json targets (one static set of lines)
- **Evidence:** On day 2, after Monday and a daily, /play showed "Shifts played 1" and "Play again" (d2-01-play.png). By day 5 I had played 5 shifts. The office's TODAY banner said "Supervise Ollie. Tap the office to walk around." every day, while the real task was "Start today's practice". The note "4 tickets · about 7 min" sounds like the 4-ticket tutorial I had just done ("Practice first. Four tickets, one at a time"). On day 5, Ollie's desk opened with "Oh! A human! Hi! I'm Ollie…", and Dana ("Ask her how this works") gave the day-1 card tutorial. Nobody explains Daily practice, the pips, or "Review due".
- **Suggested fix:** PathwayPicker: keep attempts for funder numbers, but show learners the total (history length) as "Shifts played" or label the current number "Monday shifts". Once dailies unlock, change the button to "Continue". HubOverlay: when the chooser exists, set the objective to "Today's practice: new tickets picked for your skills.", and after the day's first daily to "Done for today. One more shift is optional.". Change the desk note to "4 new tickets · …". hub.json: add a returning set of lines, used once dailyUnlocked. Ollie: short queue banter. Dana: "Each day I pick tickets for the skills you need most. Your skills shows your level: 4 dots is Sharp."

### 7. (minor) The skill sheet's "From your latest miss" can show a partly right safe plan instead of the real miss

- **Where:** lib/game/mastery.ts:269 (if (c.grade !== "R") rec.miss = c.stepId), with calls sorted by last event in callsFromBattle (192-208)
- **Evidence:** After daily 3, the Confirm the fix sheet (d5-12-cf-detail.png) showed "From your latest miss: Close #53301: H. Lam's scanner ticket. Lam wrote 'works great now', and the log shows 12 clean scans." That's a safe plan I blocked and then approved (Partly right). My actual miss in that shift was closing Dr. Pell's ticket with no reply. The sheet teaches the opposite of my weakness.
- **Suggested fix:** Record miss only for grade W. Use a P only if the skill's recent calls have no W. When a P is shown, start the line with its reason ("Fixed it later."), as PlanList does. Add a mastery test where a W and then a P in one shift keeps the W's stepId.

### 8. (minor) Ollie's result lines repeat within the week (2 lines per pool)

- **Where:** content/help-desk/bank/shift.json outros.win / winWithMisses (2 entries each); buildShift picks by seed
- **Evidence:** Daily 2 and the drill an hour later both said "All done! Can I turn the queue off and on again to celebrate?". Daily 1 and daily 3 both said "All done! A few of my plans got through. I'm choosing to feel proud.". By day 5 the humor had gone stale. "A few" also appeared when only 1 plan got through.
- **Suggested fix:** Write 6-8 lines per pool, plus a small drill pool (e.g. about focusing on one skill). Pick with the seed but skip the line used in the last history entry. Add a winWithOneMiss variant, or word it so it fits 1 miss ("One of my plans got through…").

### 9. (minor) Nothing tells a learner how to earn the next pip; "What it means" and "Where to look" say almost the same thing

- **Where:** components/skills/SkillDetail.tsx; lib/game/skills.ts where-to-look lines
- **Evidence:** After Monday, all 6 skills showed "●○○○ Learning", even Check who's asking, where I got 3 of 3 right. Nothing explains why, or that a skill moves at most one level per shift. The Confirm the fix sheet says "Before you close it, check the user's reply and the logs." and then "Read the user's reply and the log. Does the user say it works?" (d1-32-skill-detail.png).
- **Suggested fix:** Add one "Next pip" line to SkillDetail, derived from the level rule. Learning: "Get 3 calls right, including a risky and a safe one." Practicing: "Keep it right on 2 different days." Solid: "Come back in 3+ days and get 2 right." Rewrite the 7 where-to-look lines so each names a concrete evidence label (e.g. "User reply and the log after the fix time") instead of repeating the meaning.

### 10. (minor) "Review due" tags on most rows dilute the signal

- **Where:** components/skills/SkillsScreen.tsx (a tag on every due row); lib/game/mastery.ts isDue with a 1-day Learning interval
- **Evidence:** Day 2: 4 of 7 rows had an orange "Review due" tag (d2-03-skills.png). Day 5: 5 of 7 (d5-02-skills.png). It read like a to-do list rather than a hint. The Next up card already says "Review due".
- **Suggested fix:** Show the tag only on the 2 due skills with the highest need, or only at Practicing and above. Keep the one grey line "Skills need a refresh. A quick practice keeps them sharp." for the rest.

### 11. (minor) Plan-list lines don't name the plan, so repeated skill names are hard to tell apart

- **Where:** components/skills/PlanList.tsx (line 1 = skill name, line 2 = tell)
- **Evidence:** The daily 1 result listed "Match the request" 4 times and "Change safely" twice (d1-42-daily1-plans.png). In a drill result every line reads "Change safely". To remember which plan a line meant, I had to work it out from the tell or expand it.
- **Suggested fix:** Add the plan's intent as a small grey line under the skill name (e.g. "Let F. Kowalski install her own apps"). In drill results, where the skill is the same on every line, use the intent as line 1 instead of the skill name.

### 12. (minor) Monday result says "You checked before you blocked ✓" next to a plan list that says I blocked good work without checking

- **Where:** components/battle/ResultScreen.tsx:55-63 and lib/game/engine.ts:588 (blindBlocks counts only risky plans)
- **Evidence:** I blocked the safe "Disable T. Okafor's account right now" without inspecting it. The star checklist showed "You checked before you blocked" as done, while the plan list on the same screen said "Check who approved: Fixed it later." (d1-26-monday-result.png, d1-27-monday-plans.png).
- **Suggested fix:** Leave the star rule alone so best-star numbers stay comparable. When the player blocked a safe plan without inspecting it, change the label to "Blocked good work once at most" (the existing alternative wording).

## Fix report (the fixer agent)

I checked all 16 review findings against the code and fixed every one (7 major, 9 minor). None turned out to be wrong. Every gate passes: tsc and eslint are clean, vitest has 464 passed and 3 skipped, and `next build` succeeds. The final Playwright run played as a brand-new guest at 390x844 (DPR 3) and 1440x900: practice, Monday, the office, daily, Your skills, the skill sheet, a drill, then a paused daily with Your skills, and /play. I looked at the screenshots. axe found 0 violations on every screen, and the script logged no console errors and no problems.

MAJOR
1. **Skills moved.** New `skillsView.orderMoves` sorts drops first, then the focus skill, then a new Solid or Sharp, then the rest. Each row gets an Up or Down word with an arrow. A drop also gets one reason ("Down: a risky plan got through" / "Down: good work was blocked"). Below the 2 rows there is a "+N more changed · Your skills" link. The "Practice this" skill is now picked from real misses (W) before partly right calls.
2. **Two risky plans on one turn.** `dailyOrderOk` now rejects 2 risky plans in the same turn, using `turnOfPlan` with the [1,2] actions per turn. If no order passes, the fallback picks the least-bad order. `planDaily` ranks each candidate: a fair order first, then a fresh risky plan of the focus, then the safe-share band. In 1,200 test dailies, none has a risky pair. The careful bot's clean rate went from 65.8% to 85.8%, and the balance test now requires at least 80%.
3. **Focus without a risky plan.** Tickets with a risky plan of focus[0] get ×3 weight when that skill has a recent risky W or P. Such a ticket from recent dailies gets ×0.5 instead of ×0.2. A daily now needs a risky focus plan that was not in the last daily, whenever the bank has one. I added 3 bank tickets: b-dispatch-crash (D1) and c-xray-viewer (D2) for Confirm the fix, and c-billing-folder (D1) for Match the request. The bank is now 48 plans, 56.3% safe. They pass bank.test and the design lead's bank-check script. The only thing it flags is that the 3 new tickets are not in the original spec list. The new test gets 300 of 300 dailies with a risky focus plan for each of 4 focus skills.
4. **Toast chips.** New `skillsView.liveGrade` shows "Back in line", "Can still roll back" or "Not checked" with no shape. The shape appears only once the outcome is final. There is a test for each case.
5. **Daily and drill intros.** New `components/hub/ShiftIntro.tsx` is one screen before the battle (new "brief" view in GameShell). It shows what the shift is, the focus, Dana's and Ollie's lines, a Start button and Skip. A drill says "Drill: <skill>. N plans, one at a time."
6. **Stale words for returning players.** /play now shows "Shifts played" as Monday attempts plus dailies and drills; attempts stays Monday-only for funder numbers. The button reads Continue, or Resume practice / Resume drill / Resume shift. The office banner says "Today's practice: new tickets picked for your skills." and, after that day's first daily, "Done for today. One more shift is optional." The chooser note now says "4 new tickets". hub.json has `returningLines` for Ollie and Dana (Dana explains Your skills, the dots and Review due), with a content test.
7. **"Practice this" threw away a paused battle.** `startDrill` and `startDaily` now check for a saved battle and show the Resume / Start over prompt instead. While a battle is saved, Your skills and the skill sheet show "Resume …" in place of "Practice this". I checked this in the browser: the paused hd-daily-1 at turn 2 survived and resumed.

MINOR
- **Latest miss on the skill sheet.** It now records only a W. A P is used only when no W is recent, and it shows its reason first ("Fixed it later."). The reason is saved in a new optional `SkillRecord.missWhy`, which save.ts accepts only from a fixed list of reasons. Save version stays 2.
- **Ollie's lines.** Each result pool now has 6-7 lines, plus a new one-miss pool and a drill pool. Lines rotate with the daily count (drills with count plus skill), so back-to-back shifts don't repeat.
- **Next pip and Where to look.** SkillDetail has a "Next pip" line. The 7 "Where to look" lines now name real evidence labels.
- **Review due tags.** Only the 2 due skills with the highest need get the tag.
- **PlanList.** Each line shows the plan's intent in small grey text. In drills the intent is line 1.
- **Monday checklist.** It reads "Block good work once at most" after a blind block of a safe plan (new `engine.blindSafeBlocks`). The star rule is unchanged.
- **Chooser button at 360px.** The label can wrap now. The toast chip also wraps cleanly.
- **Level drop with no miss.** A shift with no W never lowers a skill, with tests for both cases the reviewer found.
- **Daily result line and face.** Ollie's line counts only risky plans that actually got through, and his face is `won ? celebrate : sad`, the same as the stage.

Saves still load: the one new field is optional and old saves pass. Because the bank changed, a daily or drill that is in progress starts fresh with the existing "The shift was updated" note.

### Checks the fixer reported

- npx tsc --noEmit: clean
- npx eslint .: clean
- npx vitest run: 18 files passed, 464 tests passed, 3 skipped
- npx next build: compiled successfully; tsconfig.json unchanged
- balance: careful bot's clean daily rate went from 65.8% to 85.8%; 0 of 1,200 test dailies have 2 risky plans on one turn; a weak lead focus gets a risky plan of it in 300 of 300 dailies for 4 skills
- Playwright at 390x844 DPR 3 and 1440x900 as a new guest: practice, Monday, office chooser, Dana's returning lines, daily intro, daily, daily result, Your skills, skill sheet, drill intro, drill, drill result, pause then Your skills shows Resume practice and the paused battle is unchanged, /play shows Shifts played 3 and Resume practice; axe clean on every checked screen; script logged no console errors, page errors or HTTP errors
- Chooser button fits inside its card (390: button right edge 366, card right edge 378)
- Toast chips seen live: 'Back in line' after a blind block of a safe plan, 'Can still roll back' for a risky plan that ran
- Monday checklist reads 'Block good work once at most' after a blind block of a safe plan
