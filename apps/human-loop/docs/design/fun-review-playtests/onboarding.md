# Onboarding (FTUE) notes: first 5 minutes, Help Desk + Business Analyst

Build under test: http://localhost:4300 (production build, not touched). Fresh Chromium context each run,
390x844, DPR 3, isMobile, hasTouch. No files in apps/human-loop were edited.

## What I did
1. Manual play (persistent driver `driver.js`, logs `log-hd.jsonl`, `log-ba.jsonl`, screenshots `hd-*.png`, `ba-*.png`):
   - Help Desk: landing -> Play free -> /play -> scroll -> Play as guest -> Start shift -> 4 intro slides ->
     practice 4 tickets (made one over-caution mistake on #3 on purpose) -> result -> real shift turns 1-3
     (played Policy card, approved 2 plans blind on turn 3 to see a risky outcome).
   - Business Analyst: same path, BA card is 5th on the picker (4 scrolls). Practice 4 tickets (made one
     over-trust mistake on #4 on purpose) -> result -> real shift turn 1.
2. Timed simulation (`sim.js`, results `sim-<pathway>-<wpm>[-skim].json`, screenshots `sim-*-at60s..300s.png`,
   `sim-*-first-real.png`). Model: reads every newly visible word, 1.2 s per tap, 1.5 s per scroll, plays the
   right answer from the content JSON, Inspect + Block + Approve only. Two profiles:
   - "thorough ESL reader": 130 wpm, reads everything incl. landing/form/picker.
   - "skimmer": 200 wpm in game, 3 s max on landing/form/picker.
   Machine waits (tap -> next control enabled) were measured: < 1 s total. All time is reading + tapping.
3. Peeks: `peek-ba-hub-after-skip-practice.png` (the isometric hub), deep link `/play/business-analyst` for a
   new visitor, typewriter behaviour, `lib/game/coach.ts` for coach lines after mistakes.

## Measured numbers
| | Help Desk skim | Help Desk thorough | BA skim | BA thorough |
|---|---|---|---|---|
| First card tap (Inspect) | 0:58, tap 8 | 2:32, tap 8 | 1:20, tap 9 | 3:21, tap 9 |
| Screens before first card | 7 (landing, form, picker, 4 intro) | 7 | 8 (5 intro) | 8 |
| Scrolls before first card | 1 | 1 | 5 | 5 |
| First real (non-dictated) decision | 3:27, tap 19 | 6:06, tap 19 | 3:58, tap 20 | 7:08, tap 20 |
| New words shown before it | ~650 | ~650 | ~770 | ~770 |
| Where at 5:00 | practice result | practice ticket 3 sheet | practice ticket 4 sheet | practice ticket 2 sheet |
| Real shift starts | 5:10 | after 7:30 | 5:38 | after 8:30 |

- Practice tickets 1-2 are dictated: #1 Block is locked and Looks OK pulses; #2 Block pulses and coach says
  "Tap Block". Ticket 3 ("Your call") is the first real decision.
- Evidence sheet sizes (dialog text): HD 108 / 105 / 126 / 111 words, BA 128 / 134 / 108 / 123 words.
  Red-flag clues are not marked in any way; all boxes look the same.
- HD #3 (stolen laptop wipe, safe): the decisive clue (Runbook LS-02) is below the fold in the sheet (180 px).
- Taps per plan in practice: 5 (Inspect card, tap plan, Looks OK, Approve, Next ticket). Block path is 4.
- Fast tapping during the typewriter only finishes the line: 7 taps to get through BA's 5 intro slides.
- Deep link `/play/business-analyst` for a new visitor redirects to `/play`; after "Play as guest" you land on the
  picker, pathway lost. BA card is at y=2626 of 3036 px.
- The isometric hub is never shown on the first-time path (only a faded backdrop behind intro slides). It
  appears only after "Skip practice" or "Back to the office".
- No sound (as stated). No stars on practice result.

## Mistakes, as shown
- Over-caution (HD #3 blocked): "FALSE ALARM" stamp + toast "Dana asks why it isn't wiped yet". Coach: "That one
  was fine. Blocked good work comes back later." The reason (Runbook LS-02) only appears on the result screen.
- Over-trust (BA #4 approved, 87 patient names emailed): toast "Oops. Risk +4", risk bar +4. Quill keeps its
  happy pose. Coach bar shows "Quill is working ..." indefinitely, no coaching line. Cause:
  `lastResolution()` in lib/game/coach.ts only handles caught / false-alarm / escalated, not a risky plan that ran.
  Result screen: confetti + Quill cheering over "1 risky plan got through".
- Outcome toasts sit on top of the stage and cover the agent's face in every outcome screenshot.

## Where I would close the tab
1. /play: tapping "Play free" shows a name + email form; "Play as guest" is below the fold (y=972 of 844).
2. BA only: 4 scrolls past other pathways to find BA; a class deep link does not help.
3. Practice ticket 1 sheet (108-128 words, the answer given, Block locked), then ticket 2 is the same format
   with the answer highlighted again. That is the "how is this fun?" moment. Most likely quit point: ~1:30-2:30
   (skimmer), before any real choice.

## Mishap
While stopping my own idle drivers I used a broad `pkill`-style pattern that also killed another agent's
driver (`fun/designer/driver.js`, port 4399) at ~16:31. Restarting it was blocked by the permission system,
so I left it. That agent's browser session is gone and needs a restart.
