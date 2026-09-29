# Game-feel pass: Human Loop (http://localhost:4300 prod build)

Setup: Playwright chromium, fresh guest context, 390x844, DPR 3, isMobile, hasTouch.
Animation capture: CDP Page.startScreencast (~5-8 fps under SwiftShader), contact sheets with PIL.
Scripts: lib.js, step.js, rec.js, sheet.py, practice.js, shift.js, geom.js, geom2.js, measure.js, moods.js.
Screens: shots/*.png, frame dumps: shots/frames/<tag>/, contact sheets: shots/cs-*.png.

## Runs
1. Landing -> /play -> guest -> picker -> Help Desk intro (4 cards) -> practice (4 tickets). Frames on
   Inspect, Approve (safe), Block, blind Approve, risky Approve, end. (practice-hd.log)
2. Same for Business Analyst (practice-ba.log). Screen the owner flagged = shots/ba-p0-sheet-inspected.png.
3. Help Desk story shift, "good" bot (reads content JSON, blocks the risky ones, uses Policy, Escalate, Coffee). Won, 2 stars. (shift-good.log)
4. Help Desk story shift, "bad" bot (approves everything, one Roll Back). Breach. (shift-bad.log)
5. Reduced-motion practice (RM=1). shots/cs-rm-*.png
6. Geometry sampler (rAF) on stage wrapper, canvas and toast during Block and Approve (geom.js, geom2.js).
7. measure.js: time, taps, screens, new visible words per screen, landing -> first un-coached decision.
8. moods.js: 5 mood portraits for Ollie, Quill and Patch (shots/moods.png).

## Measurements
- Help Desk, landing to:
  - first card play: 23.2 s bot time, 9 taps, 9 screens, 356 words (164 inside the game)
  - first tension (phishing evidence): 33.1 s, 14 taps, 15 screens, 563 words
  - first catch ("Busted!"): 35.3 s, 15 taps, 16 screens, 588 words
  - first un-coached decision (ticket 3): 41.9 s, 18 taps, 18 screens, 700 words (508 in game)
- Business Analyst: first card 26.1 s / 10 screens / 378 words; first un-coached decision 45.8 s,
  19 taps (one nav was a goto), 19 screens, 763 words. Ticket 1 evidence sheet alone: 101-128 words.
- Bot time is a floor (no reading). At ~120 wpm (ESL estimate), 508 in-game words is about 4 minutes of reading.
- Stage geometry (Block on the risky MFA plan, turn 2): stage wrapper 269 px -> 154 px in the same frame
  the toast appears; toast 134-143 px tall starting at the stage top, so it covers about 93% of the
  stage. On Roll Back the stage shrinks to roughly 40 px (hand cards grow as the hand empties).
- Approve: stage 234 -> 269 px when the phase starts; canvas redraw lags about 530 ms (blank strip,
  SwiftShader may exaggerate the lag, but the DOM jump itself is real).
- Toast rect y 96-108, h 115-143; agent face sits about y 140-215 -> face 100% covered during every outcome.
- Visible time of each Phaser fx before a DOM layer covers it:
  - risk "Yikes!" + triangles: about 250-300 ms (then Oops toast)
  - catch "Busted!" + busted face: about 90-300 ms, drawn at about 55% size (stage squeezed)
  - safe check mark: 0 ms (under the toast)
  - inspect scan/magnifier: 0 ms (under the evidence sheet)
  - rollback swirl: ~0 ms (stage collapsed)
  - win celebrate face: 0 ms (under the "Shift complete!" card); confetti about 1 s
  - lose: pink vignette visible; the busted face stays under the "Breach!" card
  - reduced motion: the calm fades play under the toast, so effectively nothing but the toast and the meter.
- Practice with one leak: stage confetti + celebrate portrait on the result, next to "1 risky plan got through".
- A coached player who follows every hint never sees the risk effect at all in practice.
- No audio, no vibration anywhere (grep: no AudioContext / Audio / vibrate).
- Coach never appears on the battle stage (Escalate = arrow flies off the top).
- Breach copy "Every phone in the office starts ringing" is text only.

## What already lands (keep)
Plan-card stamps (DONE / CAUGHT! / RISK +4), the risk meter shake with the +n bubble, card fly-to-target
ghost, dealt hand, "Turn 2 · New card!" ribbon, stars popping one by one on the result, hub walk and
typewriter dialogue, and the 5 mood portraits (expressive, readable).
